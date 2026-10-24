import base64
import hashlib
import json
import os
import re
import uuid

import boto3
import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400',
}

LEVELS = ('Начальный', 'Средний', 'Продвинутый')
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
            WHERE s.token_hash = %s AND s.revoked_at IS NULL AND s.expires_at > NOW()""",
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


def course_out(r: dict) -> dict:
    return {
        'id': r['id'],
        'slug': r['slug'],
        'title': r['title'],
        'short': r['short'],
        'description': r['description'],
        'category': r['category'],
        'level': r['level'],
        'access': r['access'],
        'price': r['price'],
        'coverUrl': r['cover_url'],
        'published': r['published'],
        'modules': r['modules'] or [],
        'author': {
            'id': r['author_id'], 'slug': r.get('author_slug') or '', 'name': r.get('author_name') or '',
            'role': r.get('author_role') or '', 'photoUrl': r.get('author_photo') or '', 'bio': r.get('author_bio') or '',
        } if r['author_id'] else None,
        'updatedAt': r['updated_at'],
    }


COURSE_SELECT = """SELECT c.*, a.slug AS author_slug, a.name AS author_name, a.role AS author_role,
    a.photo_url AS author_photo, a.bio AS author_bio
    FROM {courses} c LEFT JOIN {authors} a ON a.id = c.author_id"""


def select_courses(cur, where: str = '', params: tuple = ()):
    sql = COURSE_SELECT.format(courses=t('courses'), authors=t('authors'))
    cur.execute(f'{sql} {where} ORDER BY c.id', params)
    return [course_out(r) for r in cur.fetchall()]


def author_profile(r: dict) -> dict:
    return {
        'id': r['id'], 'slug': r['slug'], 'name': r['name'], 'role': r['role'], 'photoUrl': r['photo_url'],
        'bio': r['bio'], 'about': r.get('about') or '', 'links': r.get('links') or [], 'facts': r.get('facts') or [],
    }


def authors_out(cur, with_counts: bool = False):
    cur.execute(
        f"""SELECT a.id, a.slug, a.name, a.role, a.photo_url, a.bio, a.about, a.links, a.facts,
                   (SELECT COUNT(*) FROM {t('courses')} c WHERE c.author_id = a.id) AS courses_total,
                   (SELECT COUNT(*) FROM {t('courses')} c WHERE c.author_id = a.id AND c.published) AS courses_published
            FROM {t('authors')} a ORDER BY a.id"""
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
    category = str(body.get('category', '')).strip()[:80]
    short = str(body.get('short', '')).strip()[:400]
    description = str(body.get('description', '')).strip()[:20000]
    level = str(body.get('level', '')).strip()
    access = body.get('access')
    if len(title) < 3:
        return None, err(400, 'invalid_title', 'Укажите название курса (не короче 3 символов)')
    if len(category) < 2:
        return None, err(400, 'invalid_category', 'Укажите категорию')
    if level not in LEVELS:
        return None, err(400, 'invalid_level', 'Выберите уровень сложности')
    if access not in ('free', 'paid'):
        return None, err(400, 'invalid_access', 'Выберите тип доступа')
    try:
        price = int(body.get('price') or 0)
    except (TypeError, ValueError):
        return None, err(400, 'invalid_price', 'Цена должна быть целым числом в рублях')
    if access == 'free':
        price = 0
    elif price < 1 or price > 10_000_000:
        return None, err(400, 'invalid_price', 'Укажите цену платного курса в рублях')
    author_id = body.get('authorId')
    if author_id in (None, '', 0):
        author_id = None
    else:
        try:
            author_id = int(author_id)
        except (TypeError, ValueError):
            return None, err(400, 'invalid_author', 'Некорректный автор')
        cur.execute(f"SELECT id FROM {t('authors')} WHERE id = %s", (author_id,))
        if not cur.fetchone():
            return None, err(400, 'invalid_author', 'Автор не найден')
    cover = str(body.get('coverUrl', '')).strip()[:500]
    if cover and not cover.startswith('https://'):
        return None, err(400, 'invalid_cover', 'Некорректная ссылка на обложку')
    modules = clean_modules(body.get('modules', []))
    if modules is None:
        return None, err(400, 'invalid_modules', 'У каждого модуля и урока должно быть название')
    return {
        'title': title, 'category': category, 'short': short, 'description': description, 'level': level,
        'access': access, 'price': price, 'author_id': author_id, 'cover_url': cover, 'modules': modules,
        'published': bool(body.get('published', True)),
    }, None


def a_list(cur, _body, _user):
    return resp(200, {'ok': True, 'courses': select_courses(cur, 'WHERE c.published'), 'authors': authors_out(cur)})


def a_get(cur, body, _user):
    slug = str(body.get('slug', ''))[:120]
    rows = select_courses(cur, 'WHERE c.published AND c.slug = %s', (slug,))
    if not rows:
        return err(404, 'not_found', 'Курс не найден')
    return resp(200, {'ok': True, 'course': rows[0]})


def a_author(cur, body, _user):
    slug = str(body.get('slug', ''))[:60]
    cur.execute(f"SELECT * FROM {t('authors')} WHERE slug = %s", (slug,))
    row = cur.fetchone()
    if not row:
        return err(404, 'not_found', 'Автор не найден')
    courses = select_courses(cur, 'WHERE c.published AND c.author_id = %s', (row['id'],))
    if not courses:
        return err(404, 'not_found', 'Автор не найден')
    return resp(200, {'ok': True, 'author': author_profile(row), 'courses': courses})


def a_admin_list(cur, _body, user):
    return resp(200, {'ok': True, 'courses': select_courses(cur), 'authors': authors_out(cur)})


def a_save(cur, body, user):
    data, problem = validate(cur, body)
    if problem:
        return problem
    cid = body.get('id')
    fields = ('title', 'category', 'short', 'description', 'level', 'access', 'price', 'author_id', 'cover_url', 'published')
    values = [data[f] for f in fields] + [json.dumps(data['modules'], ensure_ascii=False)]
    if cid:
        try:
            cid = int(cid)
        except (TypeError, ValueError):
            return err(400, 'bad_course', 'Некорректный курс')
        cur.execute(f"SELECT id FROM {t('courses')} WHERE id = %s", (cid,))
        if not cur.fetchone():
            return err(404, 'not_found', 'Курс не найден')
        sets = ', '.join(f'{f} = %s' for f in fields)
        cur.execute(
            f"UPDATE {t('courses')} SET {sets}, modules = %s::jsonb, updated_at = NOW() WHERE id = %s",
            (*values, cid),
        )
    else:
        slug = unique_slug(cur, slugify(data['title']))
        cols = ', '.join(fields)
        marks = ', '.join(['%s'] * len(fields))
        cur.execute(
            f"INSERT INTO {t('courses')} (slug, {cols}, modules) VALUES (%s, {marks}, %s::jsonb) RETURNING id",
            (slug, *values),
        )
        cid = cur.fetchone()['id']
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
                links = %s::jsonb, facts = %s::jsonb, updated_at = NOW() WHERE id = %s""",
            (name, role, bio, photo, about, json.dumps(links, ensure_ascii=False), json.dumps(facts, ensure_ascii=False), aid),
        )
    else:
        slug = unique_author_slug(cur, slugify(name)[:50] or 'avtor')
        cur.execute(
            f"""INSERT INTO {t('authors')} (slug, name, role, bio, photo_url, about, links, facts)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb) RETURNING id""",
            (slug, name, role, bio, photo, about, json.dumps(links, ensure_ascii=False), json.dumps(facts, ensure_ascii=False)),
        )
        aid = cur.fetchone()['id']
    author = next(a for a in authors_out(cur, with_counts=True) if a['id'] == aid)
    return resp(200, {'ok': True, 'author': author})


PUBLIC = {'list': a_list, 'get': a_get, 'author': a_author}
ADMIN = {
    'admin_list': ('courses', a_admin_list),
    'save': ('courses', a_save),
    'upload_cover': ('courses', a_upload_cover),
    'admin_authors': ('authors', a_admin_authors),
    'save_author': ('authors', a_save_author),
    'upload_author_photo': ('authors', a_upload_author_photo),
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
            if not has_perm(user, perm):
                return err(403, 'forbidden', 'Недостаточно прав для этого раздела')
            return fn(cur, body, user)
        return err(400, 'unknown_action', 'Неизвестное действие')
    finally:
        conn.close()
