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


def can_manage_courses(user) -> bool:
    if not user:
        return False
    if user['role'] == 'superadmin':
        return True
    perms = [p for p in (user.get('permissions') or '').split(',') if p in PERMISSIONS]
    return user['role'] == 'admin' and 'courses' in perms


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
        'author': {'id': r['author_id'], 'slug': r.get('author_slug') or '', 'name': r.get('author_name') or '', 'role': r.get('author_role') or ''}
        if r['author_id'] else None,
        'updatedAt': r['updated_at'],
    }


COURSE_SELECT = """SELECT c.*, a.slug AS author_slug, a.name AS author_name, a.role AS author_role
    FROM {courses} c LEFT JOIN {authors} a ON a.id = c.author_id"""


def select_courses(cur, where: str = '', params: tuple = ()):
    sql = COURSE_SELECT.format(courses=t('courses'), authors=t('authors'))
    cur.execute(f'{sql} {where} ORDER BY c.id', params)
    return [course_out(r) for r in cur.fetchall()]


def authors_out(cur):
    cur.execute(f"SELECT id, slug, name, role FROM {t('authors')} ORDER BY id")
    return [dict(r) for r in cur.fetchall()]


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
        return err(400, 'too_large', 'Обложка должна быть не больше 5 МБ')
    key = f'courses/covers/{uuid.uuid4().hex}.{ext}'
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=ctype)
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
    return resp(200, {'ok': True, 'url': url})


PUBLIC = {'list': a_list, 'get': a_get}
ADMIN = {'admin_list': a_admin_list, 'save': a_save, 'upload_cover': a_upload_cover}


def handler(event: dict, context) -> dict:
    """Каталог курсов JETRA University: публичный просмотр и управление курсами из админки."""
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
            if not can_manage_courses(user):
                return err(403, 'forbidden', 'Недостаточно прав для управления курсами')
            return ADMIN[action](cur, body, user)
        return err(400, 'unknown_action', 'Неизвестное действие')
    finally:
        conn.close()
