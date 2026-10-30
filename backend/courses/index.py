import base64
import hashlib
import json
import os
import re
import uuid
from datetime import date, datetime, timedelta, timezone

import boto3
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400',
}

PERMISSIONS = ('users', 'strategies', 'courses', 'lessons', 'authors', 'purchases', 'access')
MAX_COVER_BYTES = 5 * 1024 * 1024
COVER_TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}

TRANSLIT = dict(zip(
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f',
     'h', 'c', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya'],
))


def resp(status: int, data: dict) -> dict:
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def err(status: int, code: str, message: str) -> dict:
    return resp(status, {'ok': False, 'error': code, 'message': message})


def db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    return conn


def t(name: str) -> str:
    schema = os.environ.get('MAIN_DB_SCHEMA', 'public')
    return f'"{schema}".{name}'


def sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def session_user(cur, token):
    if not token or len(token) > 200:
        return None
    cur.execute(
        f"""SELECT u.* FROM {t('sessions')} s JOIN {t('users')} u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.archived_at IS NULL""",
        (sha(token),),
    )
    return cur.fetchone()


def has_perm(user, perm: str) -> bool:
    if not user:
        return False
    if user['role'] == 'superadmin':
        return True
    perms = [p for p in (user.get('permissions') or '').split(',') if p in PERMISSIONS]
    return user['role'] == 'admin' and perm in perms


def slugify(text: str) -> str:
    s = ''.join(TRANSLIT.get(ch, ch) for ch in text.lower())
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:80] or 'kurs'


def unique_slug(cur, base: str, exclude_id=None) -> str:
    slug, n = base, 2
    while True:
        cur.execute(f"SELECT id FROM {t('courses')} WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row or row['id'] == exclude_id:
            return slug
        slug = f'{base}-{n}'
        n += 1


MSK = timezone(timedelta(hours=3))


def discount_expired(r: dict) -> bool:
    until = r.get('discount_until')
    return bool(until) and until < datetime.now(timezone.utc)


def public_pricing(r: dict):
    """Цены для витрины: после окончания скидки показываем полную цену."""
    price, old, tariffs = r['price'], r.get('old_price') or 0, r.get('tariffs') or []
    if not discount_expired(r):
        return price, old, tariffs
    tariffs = [{**tr, 'price': tr.get('oldPrice') or tr['price'], 'oldPrice': 0} for tr in tariffs]
    if tariffs:
        return min(tr['price'] for tr in tariffs), 0, tariffs
    return (old or price), 0, tariffs


def course_out(r: dict, public: bool = False) -> dict:
    price, old_price, tariffs = public_pricing(r) if public else (r['price'], r.get('old_price') or 0, r.get('tariffs') or [])
    until = r.get('discount_until')
    has_discount = bool(old_price) or any(tr.get('oldPrice') for tr in tariffs)
    return {
        'id': r['id'],
        'slug': r['slug'],
        'title': r['title'],
        'short': r['short'],
        'description': r['description'],
        'categories': r.get('categories') or [],
        'access': r['access'],
        'price': price,
        'oldPrice': old_price,
        'tariffs': tariffs,
        'discountUntil': until.astimezone(MSK).isoformat() if until and (has_discount or not public) else None,
        'clubMonths': r.get('club_months') or 0,
        'coverUrl': r['cover_url'],
        'published': r['published'],
        'modules': r['modules'] or [],
        'flatProgram': bool(r.get('flat_program')),
        'author': {
            'id': r['author_id'], 'slug': r.get('author_slug') or '', 'name': r.get('author_name') or '',
            'role': r.get('author_role') or '', 'photoUrl': r.get('author_photo') or '', 'bio': r.get('author_bio') or '',
        } if r['author_id'] and not r.get('author_archived') and (not public or r.get('author_published')) else None,
        'updatedAt': r['updated_at'],
    }


COURSE_SELECT = """SELECT c.*, a.slug AS author_slug, a.name AS author_name, a.role AS author_role,
    a.photo_url AS author_photo, a.bio AS author_bio, a.published AS author_published, a.archived_at AS author_archived
    FROM {courses} c LEFT JOIN {authors} a ON a.id = c.author_id"""


def attach_programs(cur, rows):
    if not rows:
        return rows
    ids = tuple(r['id'] for r in rows)
    cur.execute(
        f"""SELECT m.id, m.course_id, m.title FROM {t('course_modules')} m
            WHERE m.course_id IN %s AND m.published ORDER BY m.course_id, m.position, m.id""",
        (ids,),
    )
    modules = cur.fetchall()
    lessons = {}
    if modules:
        cur.execute(
            f"""SELECT l.module_id, l.title, l.duration, l.is_free,
                       (l.video_type <> 'none' AND l.video_url <> '') AS has_video,
                       EXISTS (SELECT 1 FROM {t('lesson_materials')} lm WHERE lm.lesson_id = l.id) AS has_files
                FROM {t('lessons')} l WHERE l.module_id IN %s AND l.published ORDER BY l.position, l.id""",
            (tuple(m['id'] for m in modules),),
        )
        for l in cur.fetchall():
            lessons.setdefault(l['module_id'], []).append(
                {'title': l['title'], 'duration': l['duration'], 'hasFiles': l['has_files'], 'hasVideo': l['has_video'], 'isFree': l['is_free']}
            )
    by_course = {}
    for m in modules:
        by_course.setdefault(m['course_id'], []).append({'title': m['title'], 'lessons': lessons.get(m['id'], [])})
    for r in rows:
        r['modules'] = by_course.get(r['id'], [])
    cur.execute(
        f"""SELECT cc.course_id, cat.id, cat.name FROM {t('course_categories')} cc
            JOIN {t('categories')} cat ON cat.id = cc.category_id
            WHERE cc.course_id IN %s AND cat.archived_at IS NULL ORDER BY cat.name""",
        (ids,),
    )
    cats = {}
    for c in cur.fetchall():
        cats.setdefault(c['course_id'], []).append({'id': c['id'], 'name': c['name']})
    for r in rows:
        r['categories'] = cats.get(r['id'], [])
    return rows


def categories_out(cur, public: bool = False):
    cond = 'AND c.published' if public else ''
    cur.execute(
        f"""SELECT cat.id, cat.name,
                   (SELECT COUNT(*) FROM {t('course_categories')} cc JOIN {t('courses')} c ON c.id = cc.course_id
                    WHERE cc.category_id = cat.id AND c.archived_at IS NULL {cond}) AS courses
            FROM {t('categories')} cat WHERE cat.archived_at IS NULL ORDER BY cat.name"""
    )
    return [{'id': r['id'], 'name': r['name'], 'coursesCount': r['courses']} for r in cur.fetchall()]


def select_courses(cur, where: str = '', params: tuple = (), public: bool = False, archived: bool = False):
    sql = COURSE_SELECT.format(courses=t('courses'), authors=t('authors'))
    cond = 'c.archived_at IS NOT NULL' if archived else 'c.archived_at IS NULL'
    where = f'WHERE {cond} AND {where[6:]}' if where.startswith('WHERE ') else f'WHERE {cond}'
    cur.execute(f'{sql} {where} ORDER BY c.id', params)
    rows = attach_programs(cur, [dict(r) for r in cur.fetchall()])
    return [course_out(r, public) for r in rows]


def author_profile(r: dict) -> dict:
    return {
        'id': r['id'], 'slug': r['slug'], 'name': r['name'], 'role': r['role'], 'photoUrl': r['photo_url'],
        'bio': r['bio'], 'about': r.get('about') or '', 'links': r.get('links') or [], 'facts': r.get('facts') or [],
        'published': bool(r.get('published', True)),
    }


def authors_out(cur, with_counts: bool = False, public: bool = False):
    where = 'WHERE a.archived_at IS NULL AND a.published' if public else 'WHERE a.archived_at IS NULL'
    cur.execute(
        f"""SELECT a.id, a.slug, a.name, a.role, a.photo_url, a.bio, a.about, a.links, a.facts, a.published,
                   (SELECT COUNT(*) FROM {t('courses')} c WHERE c.author_id = a.id AND c.archived_at IS NULL) AS courses_total,
                   (SELECT COUNT(*) FROM {t('courses')} c WHERE c.author_id = a.id AND c.published AND c.archived_at IS NULL) AS courses_published
            FROM {t('authors')} a {where} ORDER BY a.id"""
    )
    out = []
    for r in cur.fetchall():
        item = author_profile(r)
        if with_counts:
            item['coursesTotal'] = r['courses_total']
            item['coursesPublished'] = r['courses_published']
        out.append(item)
    return out


def clean_modules(raw):
    if not isinstance(raw, list):
        return None
    out = []
    for m in raw[:50]:
        if not isinstance(m, dict):
            return None
        title = str(m.get('title', '')).strip()[:200]
        if not title:
            return None
        lessons = []
        for l in (m.get('lessons') or [])[:100]:
            if not isinstance(l, dict):
                return None
            lt = str(l.get('title', '')).strip()[:200]
            if not lt:
                return None
            lessons.append({'title': lt, 'duration': str(l.get('duration', '')).strip()[:30], 'hasFiles': bool(l.get('hasFiles'))})
        out.append({'title': title, 'lessons': lessons})
    return out


def validate(cur, body):
    """Возвращает (данные, None) или (None, ответ-ошибку)."""
    title = str(body.get('title', '')).strip()[:200]
    raw_ids = body.get('categoryIds')
    if not isinstance(raw_ids, list):
        raw_ids = []
    try:
        cat_ids = sorted({int(x) for x in raw_ids[:30]})
    except (TypeError, ValueError):
        return None, err(400, 'invalid_category', 'Некорректная категория')
    short = str(body.get('short', '')).strip()[:400]
    description = str(body.get('description', '')).strip()[:20000]
    access = body.get('access')
    if len(title) < 3:
        return None, err(400, 'invalid_title', 'Укажите название обучения (не короче 3 символов)')
    if not cat_ids:
        return None, err(400, 'invalid_category', 'Выберите хотя бы одну категорию')
    cur.execute(f"SELECT id, name FROM {t('categories')} WHERE id IN %s AND archived_at IS NULL ORDER BY name", (tuple(cat_ids),))
    found = cur.fetchall()
    if len(found) != len(cat_ids):
        return None, err(400, 'invalid_category', 'Категория не найдена — обновите страницу')
    category = found[0]['name']
    if access not in ('free', 'paid'):
        return None, err(400, 'invalid_access', 'Выберите тип доступа')
    try:
        price = int(body.get('price') or 0)
    except (TypeError, ValueError):
        return None, err(400, 'invalid_price', 'Цена должна быть целым числом в рублях')
    if access == 'free':
        price = 0
    elif not body.get('tariffs') and (price < 1 or price > 10_000_000):
        return None, err(400, 'invalid_price', 'Укажите цену платного обучения в рублях')
    tariffs = []
    old_price = 0
    if access == 'paid':
        raw_tariffs = body.get('tariffs') if isinstance(body.get('tariffs'), list) else []
        for i, tr in enumerate(raw_tariffs[:6]):
            if not isinstance(tr, dict):
                continue
            name = str(tr.get('name', '')).strip()[:80]
            try:
                tp = int(tr.get('price') or 0)
                top = int(tr.get('oldPrice') or 0)
            except (TypeError, ValueError):
                return None, err(400, 'invalid_tariff', 'Цены тарифов должны быть целыми числами')
            if not name:
                return None, err(400, 'invalid_tariff', f'Укажите название тарифа №{i + 1}')
            if tp < 1 or tp > 10_000_000:
                return None, err(400, 'invalid_tariff', f'Укажите цену тарифа «{name}»')
            if top and top <= tp:
                return None, err(400, 'invalid_tariff', f'Старая цена тарифа «{name}» должна быть больше новой')
            tariffs.append({'name': name, 'price': tp, 'oldPrice': top if top > tp else 0,
                            'description': str(tr.get('description', '')).strip()[:500]})
        if len(tariffs) == 1:
            return None, err(400, 'invalid_tariff', 'Добавьте минимум два тарифа или выберите один тариф')
        if tariffs:
            cheapest = min(tariffs, key=lambda x: x['price'])
            price, old_price = cheapest['price'], cheapest['oldPrice']
        else:
            try:
                old_price = int(body.get('oldPrice') or 0)
            except (TypeError, ValueError):
                return None, err(400, 'invalid_price', 'Старая цена должна быть целым числом в рублях')
            if price < 1 or price > 10_000_000:
                return None, err(400, 'invalid_price', 'Укажите цену платного обучения в рублях')
            if old_price and old_price <= price:
                return None, err(400, 'invalid_price', 'Старая цена должна быть больше новой')
    try:
        club_months = int(body.get('clubMonths') or 0)
    except (TypeError, ValueError):
        club_months = 0
    if club_months < 0 or club_months > 36:
        return None, err(400, 'invalid_club', 'Срок клуба — от 1 до 36 месяцев')
    if access == 'free':
        club_months = 0
    discount_until = None
    raw_until = str(body.get('discountUntil') or '').strip()[:10]
    has_discount = bool(old_price) or any(tr['oldPrice'] for tr in tariffs)
    if raw_until and has_discount:
        try:
            d = date.fromisoformat(raw_until)
        except ValueError:
            return None, err(400, 'invalid_discount_date', 'Некорректная дата окончания скидки')
        discount_until = datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=MSK)
    author_id = body.get('authorId')
    if author_id in (None, '', 0):
        author_id = None
    else:
        try:
            author_id = int(author_id)
        except (TypeError, ValueError):
            return None, err(400, 'invalid_author', 'Некорректный автор')
        cur.execute(f"SELECT id FROM {t('authors')} WHERE id = %s AND archived_at IS NULL", (author_id,))
        if not cur.fetchone():
            return None, err(400, 'invalid_author', 'Автор не найден')
    cover = str(body.get('coverUrl', '')).strip()[:500]
    if cover and not cover.startswith('https://'):
        return None, err(400, 'invalid_cover', 'Некорректная ссылка на обложку')
    return {
        'title': title, 'category': category, 'short': short, 'description': description, 'category_ids': cat_ids,
        'access': access, 'price': price, 'old_price': old_price, 'tariffs': json.dumps(tariffs, ensure_ascii=False),
        'club_months': club_months, 'discount_until': discount_until, 'author_id': author_id, 'cover_url': cover,
        'published': bool(body.get('published', True)),
    }, None


def a_list(cur, _body, _user):
    return resp(200, {
        'ok': True,
        'courses': select_courses(cur, 'WHERE c.published', public=True),
        'authors': authors_out(cur, public=True),
        'categories': categories_out(cur, public=True),
    })


def a_get(cur, body, _user):
    slug = str(body.get('slug', ''))[:120]
    rows = select_courses(cur, 'WHERE c.published AND c.slug = %s', (slug,), public=True)
    if not rows:
        return err(404, 'not_found', 'Обучение не найдено')
    return resp(200, {'ok': True, 'course': rows[0]})


def a_author(cur, body, _user):
    slug = str(body.get('slug', ''))[:60]
    cur.execute(f"SELECT * FROM {t('authors')} WHERE slug = %s AND published AND archived_at IS NULL", (slug,))
    row = cur.fetchone()
    if not row:
        return err(404, 'not_found', 'Автор не найден')
    courses = select_courses(cur, 'WHERE c.published AND c.author_id = %s', (row['id'],), public=True)
    if not courses:
        return err(404, 'not_found', 'Автор не найден')
    return resp(200, {'ok': True, 'author': author_profile(row), 'courses': courses})


def a_admin_list(cur, _body, user):
    return resp(200, {'ok': True, 'courses': select_courses(cur), 'authors': authors_out(cur), 'categories': categories_out(cur)})


def a_admin_categories(cur, _body, user):
    return resp(200, {'ok': True, 'categories': categories_out(cur)})


def a_save_category(cur, body, user):
    name = re.sub(r'\s+', ' ', str(body.get('name', ''))).strip()[:80]
    if len(name) < 2:
        return err(400, 'invalid_name', 'Название категории — не короче 2 символов')
    cur.execute(f"SELECT id, archived_at FROM {t('categories')} WHERE LOWER(name) = LOWER(%s)", (name,))
    row = cur.fetchone()
    cid = parse_id(body)
    if row and row['id'] != cid:
        if row['archived_at']:
            return err(400, 'duplicate', f'Категория «{name}» лежит в архиве — восстановите её в разделе «Архив»')
        return err(400, 'duplicate', f'Категория «{name}» уже есть')
    if cid:
        cur.execute(f"UPDATE {t('categories')} SET name = %s WHERE id = %s RETURNING id", (name, cid))
        if not cur.fetchone():
            return err(404, 'not_found', 'Категория не найдена')
        cur.execute(
            f"""UPDATE {t('courses')} c SET category = %s WHERE c.category <> %s AND EXISTS
                (SELECT 1 FROM {t('course_categories')} cc WHERE cc.course_id = c.id AND cc.category_id = %s)""",
            (name, name, cid),
        )
    else:
        cur.execute(f"INSERT INTO {t('categories')} (name) VALUES (%s) RETURNING id", (name,))
        cid = cur.fetchone()['id']
    item = next(c for c in categories_out(cur) if c['id'] == cid)
    return resp(200, {'ok': True, 'category': item})


def archive_row(cur, table: str, rid, missing: str):
    if not rid:
        return err(400, 'bad_id', 'Некорректный запрос')
    cur.execute(
        f"UPDATE {t(table)} SET archived_at = NOW() WHERE id = %s AND archived_at IS NULL RETURNING id",
        (rid,),
    )
    if not cur.fetchone():
        return err(404, 'not_found', missing)
    return None


def a_delete_category(cur, body, user):
    problem = archive_row(cur, 'categories', parse_id(body), 'Категория не найдена')
    if problem:
        return problem
    cur.execute(f"SELECT name FROM {t('categories')} WHERE id = %s", (parse_id(body),))
    return resp(200, {'ok': True, 'name': cur.fetchone()['name'], 'archived': True})


def a_save(cur, body, user):
    data, problem = validate(cur, body)
    if problem:
        return problem
    cid = body.get('id')
    fields = ('title', 'category', 'short', 'description', 'access', 'price', 'old_price', 'tariffs', 'club_months', 'discount_until',
              'author_id', 'cover_url', 'published')
    values = [data[f] for f in fields]
    if cid:
        try:
            cid = int(cid)
        except (TypeError, ValueError):
            return err(400, 'bad_course', 'Некорректное обучение')
        cur.execute(f"SELECT id FROM {t('courses')} WHERE id = %s", (cid,))
        if not cur.fetchone():
            return err(404, 'not_found', 'Обучение не найдено')
        sets = ', '.join(f'{f} = %s' for f in fields)
        cur.execute(
            f"UPDATE {t('courses')} SET {sets}, updated_at = NOW() WHERE id = %s",
            (*values, cid),
        )
    else:
        slug = unique_slug(cur, slugify(data['title']))
        cols = ', '.join(fields)
        marks = ', '.join(['%s'] * len(fields))
        cur.execute(
            f"INSERT INTO {t('courses')} (slug, {cols}) VALUES (%s, {marks}) RETURNING id",
            (slug, *values),
        )
        cid = cur.fetchone()['id']
    cur.execute(f"DELETE FROM {t('course_categories')} WHERE course_id = %s", (cid,))
    for cat_id in data['category_ids']:
        cur.execute(f"INSERT INTO {t('course_categories')} (course_id, category_id) VALUES (%s, %s)", (cid, cat_id))
    course = select_courses(cur, 'WHERE c.id = %s', (cid,))[0]
    return resp(200, {'ok': True, 'course': course})


def a_upload_cover(cur, body, user):
    return upload_image(body, 'courses/covers', 'Обложка')


def a_upload_author_photo(cur, body, user):
    return upload_image(body, 'authors/photos', 'Фото')


def upload_image(body, folder: str, what: str):
    ctype = str(body.get('contentType', ''))
    ext = COVER_TYPES.get(ctype)
    if not ext:
        return err(400, 'bad_type', 'Поддерживаются изображения JPG, PNG и WEBP')
    try:
        data = base64.b64decode(str(body.get('data', '')), validate=True)
    except (ValueError, TypeError):
        return err(400, 'bad_file', 'Не удалось прочитать файл')
    if not data:
        return err(400, 'bad_file', 'Файл пустой')
    if len(data) > MAX_COVER_BYTES:
        return err(400, 'too_large', f'{what} должно быть не больше 5 МБ' if what == 'Фото' else f'{what} должна быть не больше 5 МБ')
    key = f'{folder}/{uuid.uuid4().hex}.{ext}'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=ctype)
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return resp(200, {'ok': True, 'url': url})


def a_admin_authors(cur, _body, user):
    return resp(200, {'ok': True, 'authors': authors_out(cur, with_counts=True)})


def unique_author_slug(cur, base: str, exclude_id=None) -> str:
    slug, n = base, 2
    while True:
        cur.execute(f"SELECT id FROM {t('authors')} WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row or row['id'] == exclude_id:
            return slug
        slug = f'{base}-{n}'
        n += 1


def clean_links(raw):
    if not isinstance(raw, list):
        return None, 'Некорректный список ссылок'
    out = []
    for item in raw[:20]:
        if not isinstance(item, dict):
            return None, 'Некорректный список ссылок'
        title = str(item.get('title', '')).strip()[:80]
        url = str(item.get('url', '')).strip()[:500]
        if not title and not url:
            continue
        if not re.match(r'^https?://[^\s/$.?#].[^\s]*$', url, re.I):
            return None, f'Проверьте адрес ссылки «{title or url}» — он должен начинаться с https://'
        out.append({'title': title or re.sub(r'^https?://(www\.)?', '', url).split('/')[0], 'url': url})
    return out, None


def clean_facts(raw):
    if not isinstance(raw, list):
        return None, 'Некорректный список фактов'
    out = []
    for item in raw[:12]:
        if not isinstance(item, dict):
            return None, 'Некорректный список фактов'
        value = str(item.get('value', '')).strip()[:40]
        label = str(item.get('label', '')).strip()[:120]
        if not value and not label:
            continue
        if not value or not label:
            return None, 'У каждого факта заполните и значение, и подпись'
        out.append({'value': value, 'label': label})
    return out, None


def a_save_author(cur, body, user):
    name = str(body.get('name', '')).strip()[:120]
    role = str(body.get('role', '')).strip()[:160]
    bio = str(body.get('bio', '')).strip()[:500]
    photo = str(body.get('photoUrl', '')).strip()[:500]
    if len(name) < 2:
        return err(400, 'invalid_name', 'Укажите имя автора')
    if photo and not photo.startswith('https://'):
        return err(400, 'invalid_photo', 'Некорректная ссылка на фото')
    about = str(body.get('about', '')).strip()[:30000]
    published = bool(body.get('published', True))
    links, problem = clean_links(body.get('links', []))
    if problem:
        return err(400, 'invalid_links', problem)
    facts, problem = clean_facts(body.get('facts', []))
    if problem:
        return err(400, 'invalid_facts', problem)
    aid = body.get('id')
    if aid:
        try:
            aid = int(aid)
        except (TypeError, ValueError):
            return err(400, 'bad_author', 'Некорректный автор')
        cur.execute(f"SELECT id FROM {t('authors')} WHERE id = %s", (aid,))
        if not cur.fetchone():
            return err(404, 'not_found', 'Автор не найден')
        cur.execute(
            f"""UPDATE {t('authors')} SET name = %s, role = %s, bio = %s, photo_url = %s, about = %s,
                links = %s::jsonb, facts = %s::jsonb, published = %s, updated_at = NOW() WHERE id = %s""",
            (name, role, bio, photo, about, json.dumps(links, ensure_ascii=False), json.dumps(facts, ensure_ascii=False), published, aid),
        )
    else:
        slug = unique_author_slug(cur, slugify(name)[:50] or 'avtor')
        cur.execute(
            f"""INSERT INTO {t('authors')} (slug, name, role, bio, photo_url, about, links, facts, published)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s) RETURNING id""",
            (slug, name, role, bio, photo, about, json.dumps(links, ensure_ascii=False), json.dumps(facts, ensure_ascii=False), published),
        )
        aid = cur.fetchone()['id']
    author = next(a for a in authors_out(cur, with_counts=True) if a['id'] == aid)
    return resp(200, {'ok': True, 'author': author})


PUBLIC = {'list': a_list, 'get': a_get, 'author': a_author}
def parse_id(body):
    try:
        v = int(body.get('id'))
        return v if v > 0 else None
    except (TypeError, ValueError):
        return None


def a_set_course_published(cur, body, user):
    cid = parse_id(body)
    if not cid:
        return err(400, 'bad_course', 'Некорректное обучение')
    cur.execute(
        f"UPDATE {t('courses')} SET published = %s, updated_at = NOW() WHERE id = %s RETURNING id",
        (bool(body.get('published')), cid),
    )
    if not cur.fetchone():
        return err(404, 'not_found', 'Обучение не найдено')
    return resp(200, {'ok': True, 'course': select_courses(cur, 'WHERE c.id = %s', (cid,))[0]})


def a_delete_course(cur, body, user):
    problem = archive_row(cur, 'courses', parse_id(body), 'Обучение не найдено')
    if problem:
        return problem
    cur.execute(f"SELECT title FROM {t('courses')} WHERE id = %s", (parse_id(body),))
    return resp(200, {'ok': True, 'title': cur.fetchone()['title'], 'archived': True})


def purge_course(cur, cid: int):
    lessons_sub = f"SELECT l.id FROM {t('lessons')} l JOIN {t('course_modules')} m ON m.id = l.module_id WHERE m.course_id = %s"
    cur.execute(f"DELETE FROM {t('lesson_progress')} WHERE lesson_id IN ({lessons_sub})", (cid,))
    cur.execute(f"DELETE FROM {t('lesson_notifications')} WHERE lesson_id IN ({lessons_sub})", (cid,))
    cur.execute(f"DELETE FROM {t('lesson_materials')} WHERE lesson_id IN ({lessons_sub})", (cid,))
    cur.execute(f"DELETE FROM {t('lesson_videos')} WHERE lesson_id IN ({lessons_sub})", (cid,))
    cur.execute(f"DELETE FROM {t('lessons')} WHERE module_id IN (SELECT id FROM {t('course_modules')} WHERE course_id = %s)", (cid,))
    cur.execute(f"DELETE FROM {t('course_modules')} WHERE course_id = %s", (cid,))
    cur.execute(f"DELETE FROM {t('course_access')} WHERE course_id = %s", (cid,))
    cur.execute(f"DELETE FROM {t('course_categories')} WHERE course_id = %s", (cid,))
    cur.execute(f"DELETE FROM {t('courses')} WHERE id = %s", (cid,))


def purge_author(cur, aid: int):
    cur.execute(f"UPDATE {t('courses')} SET author_id = NULL, updated_at = NOW() WHERE author_id = %s", (aid,))
    cur.execute(f"DELETE FROM {t('authors')} WHERE id = %s", (aid,))


def purge_category(cur, cid: int):
    cur.execute(f"DELETE FROM {t('course_categories')} WHERE category_id = %s", (cid,))
    cur.execute(f"DELETE FROM {t('categories')} WHERE id = %s", (cid,))


ARCHIVE_KINDS = {
    'course': ('courses', 'courses', 'title', purge_course),
    'author': ('authors', 'authors', 'name', purge_author),
    'category': ('categories', 'courses', 'name', purge_category),
}


def a_archive_list(cur, _body, user):
    items = []
    for kind, (table, perm, label, _) in ARCHIVE_KINDS.items():
        if not has_perm(user, perm):
            continue
        cur.execute(f"SELECT id, {label} AS title, archived_at FROM {t(table)} WHERE archived_at IS NOT NULL ORDER BY archived_at DESC")
        items += [{'kind': kind, 'id': r['id'], 'title': r['title'], 'archivedAt': r['archived_at']} for r in cur.fetchall()]
    items.sort(key=lambda x: str(x['archivedAt']), reverse=True)
    return resp(200, {'ok': True, 'items': items})


def archive_target(cur, body, user):
    kind = body.get('kind')
    if kind not in ARCHIVE_KINDS:
        return None, None, err(400, 'bad_kind', 'Некорректный тип записи')
    table, perm, label, purge = ARCHIVE_KINDS[kind]
    if not has_perm(user, perm):
        return None, None, err(403, 'forbidden', 'Недостаточно прав для этого раздела')
    rid = parse_id(body)
    cur.execute(f"SELECT id, {label} AS title FROM {t(table)} WHERE id = %s AND archived_at IS NOT NULL", (rid,))
    row = cur.fetchone()
    if not row:
        return None, None, err(404, 'not_found', 'Запись в архиве не найдена')
    return row, (table, purge), None


def a_archive_restore(cur, body, user):
    row, meta, problem = archive_target(cur, body, user)
    if problem:
        return problem
    cur.execute(f"UPDATE {t(meta[0])} SET archived_at = NULL WHERE id = %s", (row['id'],))
    return resp(200, {'ok': True, 'title': row['title']})


def a_archive_purge(cur, body, user):
    row, meta, problem = archive_target(cur, body, user)
    if problem:
        return problem
    meta[1](cur, row['id'])
    return resp(200, {'ok': True, 'title': row['title']})


def a_set_author_published(cur, body, user):
    aid = parse_id(body)
    if not aid:
        return err(400, 'bad_author', 'Некорректный автор')
    cur.execute(
        f"UPDATE {t('authors')} SET published = %s, updated_at = NOW() WHERE id = %s RETURNING id",
        (bool(body.get('published')), aid),
    )
    if not cur.fetchone():
        return err(404, 'not_found', 'Автор не найден')
    author = next(a for a in authors_out(cur, with_counts=True) if a['id'] == aid)
    return resp(200, {'ok': True, 'author': author})


def a_delete_author(cur, body, user):
    problem = archive_row(cur, 'authors', parse_id(body), 'Автор не найден')
    if problem:
        return problem
    cur.execute(f"SELECT name FROM {t('authors')} WHERE id = %s", (parse_id(body),))
    return resp(200, {'ok': True, 'name': cur.fetchone()['name'], 'coursesDetached': 0, 'archived': True})


ADMIN = {
    'set_course_published': ('courses', a_set_course_published),
    'delete_course': ('courses', a_delete_course),
    'set_author_published': ('authors', a_set_author_published),
    'delete_author': ('authors', a_delete_author),
    'admin_list': ('courses', a_admin_list),
    'save': ('courses', a_save),
    'upload_cover': ('courses', a_upload_cover),
    'admin_authors': ('authors', a_admin_authors),
    'save_author': ('authors', a_save_author),
    'upload_author_photo': ('authors', a_upload_author_photo),
    'admin_categories': ('courses', a_admin_categories),
    'save_category': ('courses', a_save_category),
    'delete_category': ('courses', a_delete_category),
    'archive_list': (None, a_archive_list),
    'archive_restore': (None, a_archive_restore),
    'archive_purge': (None, a_archive_purge),
}


def handler(event: dict, context) -> dict:
    """Каталог JETRA University: публичный просмотр, управление курсами и авторами из админки."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    if event.get('httpMethod') != 'POST':
        return err(405, 'method_not_allowed', 'Метод не поддерживается')
    try:
        body = json.loads(event.get('body') or '{}')
    except json.JSONDecodeError:
        return err(400, 'bad_json', 'Некорректный запрос')
    if not isinstance(body, dict):
        return err(400, 'bad_json', 'Некорректный запрос')

    action = body.get('action')
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    conn = db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if action in PUBLIC:
            return PUBLIC[action](cur, body, None)
        if action in ADMIN:
            user = session_user(cur, headers.get('x-session-token'))
            if not user:
                return err(401, 'unauthorized', 'Требуется вход')
            perm, fn = ADMIN[action]
            if not perm and user['role'] not in ('admin', 'superadmin'):
                return err(403, 'forbidden', 'Недостаточно прав для этого раздела')
            if perm and not has_perm(user, perm):
                return err(403, 'forbidden', 'Недостаточно прав для этого раздела')
            return fn(cur, body, user)
        return err(400, 'unknown_action', 'Неизвестное действие')
    finally:
        conn.close()
