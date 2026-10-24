import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
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

PERMISSIONS = ('users', 'strategies', 'courses', 'lessons', 'authors', 'purchases', 'access')
CHUNK_SIZE = 2_400_000
LIMITS = {'video': 70 * 1024 * 1024, 'material': 50 * 1024 * 1024}
VIDEO_EXT = {'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime', 'm4v': 'video/mp4'}
MATERIAL_EXT = {
    'pdf': 'application/pdf', 'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain; charset=utf-8', 'csv': 'text/csv; charset=utf-8', 'zip': 'application/zip',
    'rar': 'application/vnd.rar', '7z': 'application/x-7z-compressed',
    'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp',
    'mp3': 'audio/mpeg', 'xmind': 'application/octet-stream', 'key': 'application/octet-stream',
}


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


def s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def cdn_prefix() -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/"


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


def can_preview(user) -> bool:
    return has_perm(user, 'lessons') or has_perm(user, 'courses')


def to_int(v):
    try:
        n = int(v)
        return n if n > 0 else None
    except (TypeError, ValueError):
        return None


def is_https(url: str) -> bool:
    return bool(re.match(r'^https://[^\s/$.?#][^\s]*$', url, re.I))


# ---------- чтение программы ----------

def load_program(cur, course_id: int, with_content: bool):
    cur.execute(
        f"SELECT * FROM {t('course_modules')} WHERE course_id = %s ORDER BY position, id", (course_id,)
    )
    modules = [dict(m) for m in cur.fetchall()]
    if not modules:
        return []
    ids = tuple(m['id'] for m in modules)
    cur.execute(f"SELECT * FROM {t('lessons')} WHERE module_id IN %s ORDER BY position, id", (ids,))
    lessons = [dict(l) for l in cur.fetchall()]
    materials = {}
    if lessons:
        cur.execute(
            f"SELECT * FROM {t('lesson_materials')} WHERE lesson_id IN %s ORDER BY position, id",
            (tuple(l['id'] for l in lessons),),
        )
        for m in cur.fetchall():
            materials.setdefault(m['lesson_id'], []).append(m)
    by_module = {}
    for l in lessons:
        mats = materials.get(l['id'], [])
        item = {
            'id': l['id'], 'title': l['title'], 'duration': l['duration'],
            'hasVideo': l['video_type'] != 'none' and bool(l['video_url']),
            'materialsCount': len(mats),
        }
        if with_content:
            item.update({
                'description': l['description'], 'videoType': l['video_type'], 'videoUrl': l['video_url'],
                'materials': [
                    {'id': m['id'], 'title': m['title'], 'kind': m['kind'], 'url': m['url'], 'fileSize': m['file_size']}
                    for m in mats
                ],
            })
        by_module.setdefault(l['module_id'], []).append(item)
    return [
        {
            'id': m['id'], 'title': m['title'], 'description': m['description'],
            'unlockMode': m['unlock_mode'], 'lessons': by_module.get(m['id'], []),
        }
        for m in modules
    ]


def apply_locks(modules, done: set, bypass: bool):
    for m in modules:
        prev_done = True
        for l in m['lessons']:
            l['completed'] = l['id'] in done
            l['locked'] = not bypass and m['unlockMode'] == 'sequential' and not prev_done
            prev_done = prev_done and l['completed']
    return modules


def course_by(cur, where: str, params: tuple):
    cur.execute(
        f"""SELECT c.*, a.name AS author_name, a.slug AS author_slug, a.published AS author_published
            FROM {t('courses')} c LEFT JOIN {t('authors')} a ON a.id = c.author_id WHERE {where}""",
        params,
    )
    return cur.fetchone()


def access_state(cur, user, course) -> str:
    """'open' | 'login' | 'paid' | 'hidden'"""
    preview = can_preview(user)
    if not course['published'] and not preview:
        return 'hidden'
    if not user:
        return 'login'
    if preview or course['access'] == 'free':
        return 'open'
    cur.execute(
        f"SELECT 1 FROM {t('course_access')} WHERE user_id = %s AND course_id = %s", (user['id'], course['id'])
    )
    return 'open' if cur.fetchone() else 'paid'


def done_set(cur, user_id: int, course_id: int) -> set:
    cur.execute(
        f"""SELECT p.lesson_id FROM {t('lesson_progress')} p
            JOIN {t('lessons')} l ON l.id = p.lesson_id
            JOIN {t('course_modules')} m ON m.id = l.module_id
            WHERE p.user_id = %s AND m.course_id = %s""",
        (user_id, course_id),
    )
    return {r['lesson_id'] for r in cur.fetchall()}


def course_head(c) -> dict:
    return {
        'id': c['id'], 'slug': c['slug'], 'title': c['title'], 'short': c['short'], 'coverUrl': c['cover_url'],
        'access': c['access'], 'price': c['price'], 'level': c['level'], 'category': c['category'],
        'published': c['published'],
        'author': {'name': c['author_name'], 'slug': c['author_slug']} if c.get('author_name') and c.get('author_published') else None,
    }


def progress_of(modules) -> dict:
    total = sum(len(m['lessons']) for m in modules)
    done = sum(1 for m in modules for l in m['lessons'] if l.get('completed'))
    next_id = None
    for m in modules:
        for l in m['lessons']:
            if not l.get('completed') and not l.get('locked'):
                next_id = l['id']
                break
        if next_id:
            break
    return {'done': done, 'total': total, 'percent': round(done * 100 / total) if total else 0, 'nextLessonId': next_id}


# ---------- ученик ----------

def a_course_learn(cur, body, user):
    course = course_by(cur, 'c.slug = %s', (str(body.get('slug', ''))[:120],))
    if not course:
        return err(404, 'not_found', 'Курс не найден')
    state = access_state(cur, user, course)
    if state == 'hidden':
        return err(404, 'not_found', 'Курс не найден')
    modules = load_program(cur, course['id'], with_content=False)
    done = done_set(cur, user['id'], course['id']) if user else set()
    apply_locks(modules, done, can_preview(user))
    return resp(200, {
        'ok': True, 'course': course_head(course), 'state': state, 'preview': can_preview(user) and course['access'] == 'paid',
        'modules': modules, 'progress': progress_of(modules),
    })


def find_lesson(cur, lesson_id: int):
    cur.execute(
        f"""SELECT l.id, m.course_id FROM {t('lessons')} l JOIN {t('course_modules')} m ON m.id = l.module_id
            WHERE l.id = %s""",
        (lesson_id,),
    )
    return cur.fetchone()


def a_lesson_get(cur, body, user):
    lid = to_int(body.get('lessonId'))
    row = find_lesson(cur, lid) if lid else None
    if not row:
        return err(404, 'not_found', 'Урок не найден')
    course = course_by(cur, 'c.id = %s', (row['course_id'],))
    state = access_state(cur, user, course)
    if state != 'open':
        return err(403, state, 'Нет доступа к этому курсу')
    modules = apply_locks(load_program(cur, course['id'], with_content=True), done_set(cur, user['id'], course['id']), can_preview(user))
    flat = [(m, l) for m in modules for l in m['lessons']]
    idx = next(i for i, (_, l) in enumerate(flat) if l['id'] == lid)
    module, lesson = flat[idx]
    if lesson['locked']:
        return err(403, 'locked', 'Урок откроется после прохождения предыдущих уроков модуля')
    prev_l = flat[idx - 1][1] if idx > 0 else None
    next_l = flat[idx + 1][1] if idx + 1 < len(flat) else None
    return resp(200, {
        'ok': True,
        'lesson': lesson,
        'module': {'id': module['id'], 'title': module['title'], 'unlockMode': module['unlockMode']},
        'position': {'index': idx + 1, 'total': len(flat)},
        'prev': {'id': prev_l['id'], 'title': prev_l['title'], 'locked': prev_l['locked']} if prev_l else None,
        'next': {'id': next_l['id'], 'title': next_l['title'], 'locked': next_l['locked']} if next_l else None,
    })


def a_lesson_complete(cur, body, user):
    lid = to_int(body.get('lessonId'))
    row = find_lesson(cur, lid) if lid else None
    if not row:
        return err(404, 'not_found', 'Урок не найден')
    course = course_by(cur, 'c.id = %s', (row['course_id'],))
    if access_state(cur, user, course) != 'open':
        return err(403, 'forbidden', 'Нет доступа к этому курсу')
    modules = apply_locks(load_program(cur, course['id'], with_content=False), done_set(cur, user['id'], course['id']), can_preview(user))
    lesson = next(l for m in modules for l in m['lessons'] if l['id'] == lid)
    if lesson['locked']:
        return err(403, 'locked', 'Сначала пройдите предыдущие уроки модуля')
    if body.get('completed', True):
        cur.execute(
            f"INSERT INTO {t('lesson_progress')} (user_id, lesson_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user['id'], lid),
        )
    else:
        cur.execute(f"DELETE FROM {t('lesson_progress')} WHERE user_id = %s AND lesson_id = %s", (user['id'], lid))
    modules = apply_locks(load_program(cur, course['id'], with_content=False), done_set(cur, user['id'], course['id']), can_preview(user))
    return resp(200, {'ok': True, 'modules': modules, 'progress': progress_of(modules)})


def a_my_courses(cur, _body, user):
    cur.execute(
        f"""SELECT DISTINCT c.id FROM {t('courses')} c
            WHERE c.published AND (
              EXISTS (SELECT 1 FROM {t('course_access')} ca WHERE ca.course_id = c.id AND ca.user_id = %s)
              OR (c.access = 'free' AND EXISTS (
                SELECT 1 FROM {t('lesson_progress')} p JOIN {t('lessons')} l ON l.id = p.lesson_id
                JOIN {t('course_modules')} m ON m.id = l.module_id WHERE m.course_id = c.id AND p.user_id = %s)))""",
        (user['id'], user['id']),
    )
    ids = [r['id'] for r in cur.fetchall()]
    out = []
    for cid in ids:
        course = course_by(cur, 'c.id = %s', (cid,))
        modules = apply_locks(load_program(cur, cid, with_content=False), done_set(cur, user['id'], cid), False)
        cur.execute(
            f"""SELECT MAX(p.completed_at) AS last FROM {t('lesson_progress')} p JOIN {t('lessons')} l ON l.id = p.lesson_id
                JOIN {t('course_modules')} m ON m.id = l.module_id WHERE m.course_id = %s AND p.user_id = %s""",
            (cid, user['id']),
        )
        last = cur.fetchone()['last']
        out.append({**course_head(course), 'progress': progress_of(modules), 'lastActivity': last})
    out.sort(key=lambda c: str(c['lastActivity'] or ''), reverse=True)
    return resp(200, {'ok': True, 'courses': out})


# ---------- админка: программа ----------

def a_program_courses(cur, _body, user):
    cur.execute(
        f"""SELECT c.id, c.slug, c.title, c.published, c.access,
                   (SELECT COUNT(*) FROM {t('course_modules')} m WHERE m.course_id = c.id) AS modules,
                   (SELECT COUNT(*) FROM {t('lessons')} l JOIN {t('course_modules')} m ON m.id = l.module_id
                     WHERE m.course_id = c.id) AS lessons
            FROM {t('courses')} c ORDER BY c.id"""
    )
    return resp(200, {'ok': True, 'courses': [dict(r) for r in cur.fetchall()]})


def a_program_get(cur, body, user):
    cid = to_int(body.get('courseId'))
    course = course_by(cur, 'c.id = %s', (cid,)) if cid else None
    if not course:
        return err(404, 'not_found', 'Курс не найден')
    return resp(200, {'ok': True, 'course': course_head(course), 'modules': load_program(cur, cid, with_content=True)})


def renumber(cur, table: str, parent_col: str, parent_id: int):
    cur.execute(f"SELECT id FROM {t(table)} WHERE {parent_col} = %s ORDER BY position, id", (parent_id,))
    ids = [r['id'] for r in cur.fetchall()]
    for i, rid in enumerate(ids, start=1):
        cur.execute(f"UPDATE {t(table)} SET position = %s WHERE id = %s", (i, rid))
    return ids


def a_module_save(cur, body, user):
    title = str(body.get('title', '')).strip()[:200]
    description = str(body.get('description', '')).strip()[:5000]
    mode = body.get('unlockMode')
    if len(title) < 2:
        return err(400, 'invalid_title', 'Укажите название модуля')
    if mode not in ('all', 'sequential'):
        return err(400, 'invalid_mode', 'Выберите, как открываются уроки')
    mid = to_int(body.get('id'))
    if mid:
        cur.execute(
            f"""UPDATE {t('course_modules')} SET title = %s, description = %s, unlock_mode = %s, updated_at = NOW()
                WHERE id = %s RETURNING course_id""",
            (title, description, mode, mid),
        )
        row = cur.fetchone()
        if not row:
            return err(404, 'not_found', 'Модуль не найден')
        cid = row['course_id']
    else:
        cid = to_int(body.get('courseId'))
        if not cid or not course_by(cur, 'c.id = %s', (cid,)):
            return err(404, 'not_found', 'Курс не найден')
        cur.execute(
            f"""INSERT INTO {t('course_modules')} (course_id, title, description, unlock_mode, position)
                VALUES (%s, %s, %s, %s, (SELECT COALESCE(MAX(position), 0) + 1 FROM {t('course_modules')} WHERE course_id = %s))
                RETURNING id""",
            (cid, title, description, mode, cid),
        )
        mid = cur.fetchone()['id']
    return resp(200, {'ok': True, 'moduleId': mid, 'modules': load_program(cur, cid, with_content=True)})


def delete_lessons(cur, where: str, params: tuple):
    cur.execute(f"SELECT id FROM {t('lessons')} WHERE {where}", params)
    ids = tuple(r['id'] for r in cur.fetchall())
    if ids:
        cur.execute(f"DELETE FROM {t('lesson_progress')} WHERE lesson_id IN %s", (ids,))
        cur.execute(f"DELETE FROM {t('lesson_materials')} WHERE lesson_id IN %s", (ids,))
        cur.execute(f"DELETE FROM {t('lessons')} WHERE id IN %s", (ids,))
    return len(ids)


def a_module_delete(cur, body, user):
    mid = to_int(body.get('id'))
    cur.execute(f"SELECT course_id FROM {t('course_modules')} WHERE id = %s", (mid,))
    row = cur.fetchone()
    if not row:
        return err(404, 'not_found', 'Модуль не найден')
    delete_lessons(cur, 'module_id = %s', (mid,))
    cur.execute(f"DELETE FROM {t('course_modules')} WHERE id = %s", (mid,))
    renumber(cur, 'course_modules', 'course_id', row['course_id'])
    return resp(200, {'ok': True, 'modules': load_program(cur, row['course_id'], with_content=True)})


def move(cur, table: str, parent_col: str, rid: int, direction: int):
    cur.execute(f"SELECT {parent_col} AS parent FROM {t(table)} WHERE id = %s", (rid,))
    row = cur.fetchone()
    if not row:
        return None
    ids = renumber(cur, table, parent_col, row['parent'])
    i = ids.index(rid)
    j = i + (1 if direction > 0 else -1)
    if 0 <= j < len(ids):
        cur.execute(f"UPDATE {t(table)} SET position = %s WHERE id = %s", (j + 1, ids[i]))
        cur.execute(f"UPDATE {t(table)} SET position = %s WHERE id = %s", (i + 1, ids[j]))
    return row['parent']


def a_module_move(cur, body, user):
    cid = move(cur, 'course_modules', 'course_id', to_int(body.get('id')) or 0, int(body.get('direction') or 0))
    if cid is None:
        return err(404, 'not_found', 'Модуль не найден')
    return resp(200, {'ok': True, 'modules': load_program(cur, cid, with_content=True)})


def course_of_module(cur, mid: int):
    cur.execute(f"SELECT course_id FROM {t('course_modules')} WHERE id = %s", (mid,))
    row = cur.fetchone()
    return row['course_id'] if row else None


def clean_materials(raw):
    if not isinstance(raw, list):
        return None, 'Некорректный список материалов'
    out = []
    prefix = cdn_prefix()
    for m in raw[:30]:
        if not isinstance(m, dict):
            return None, 'Некорректный список материалов'
        title = str(m.get('title', '')).strip()[:200]
        kind = m.get('kind')
        url = str(m.get('url', '')).strip()[:1000]
        if not url:
            continue
        if kind == 'file' and not url.startswith(prefix):
            return None, 'Файл материала нужно загрузить заново'
        if kind == 'link' and not is_https(url):
            return None, f'Ссылка «{title or url}» должна начинаться с https://'
        if kind not in ('file', 'link'):
            return None, 'Некорректный тип материала'
        try:
            size = max(0, int(m.get('fileSize') or 0))
        except (TypeError, ValueError):
            size = 0
        out.append({'title': title or url.rsplit('/', 1)[-1][:200], 'kind': kind, 'url': url, 'size': size})
    return out, None


def a_lesson_save(cur, body, user):
    title = str(body.get('title', '')).strip()[:200]
    description = str(body.get('description', '')).strip()[:50000]
    duration = str(body.get('duration', '')).strip()[:30]
    vtype = body.get('videoType', 'none')
    vurl = str(body.get('videoUrl', '')).strip()[:1000]
    if len(title) < 2:
        return err(400, 'invalid_title', 'Укажите название урока')
    if vtype not in ('none', 'link', 'file'):
        return err(400, 'invalid_video', 'Некорректный тип видео')
    if vtype == 'none':
        vurl = ''
    elif vtype == 'link' and not is_https(vurl):
        return err(400, 'invalid_video', 'Ссылка на видео должна начинаться с https://')
    elif vtype == 'file' and not vurl.startswith(cdn_prefix()):
        return err(400, 'invalid_video', 'Видеофайл нужно загрузить заново')
    materials, problem = clean_materials(body.get('materials', []))
    if problem:
        return err(400, 'invalid_materials', problem)

    lid = to_int(body.get('id'))
    if lid:
        cur.execute(
            f"""UPDATE {t('lessons')} SET title = %s, description = %s, duration = %s, video_type = %s, video_url = %s,
                updated_at = NOW() WHERE id = %s RETURNING module_id""",
            (title, description, duration, vtype, vurl, lid),
        )
        row = cur.fetchone()
        if not row:
            return err(404, 'not_found', 'Урок не найден')
        mid = row['module_id']
        cur.execute(f"DELETE FROM {t('lesson_materials')} WHERE lesson_id = %s", (lid,))
    else:
        mid = to_int(body.get('moduleId'))
        if not mid or not course_of_module(cur, mid):
            return err(404, 'not_found', 'Модуль не найден')
        cur.execute(
            f"""INSERT INTO {t('lessons')} (module_id, title, description, duration, video_type, video_url, position)
                VALUES (%s, %s, %s, %s, %s, %s, (SELECT COALESCE(MAX(position), 0) + 1 FROM {t('lessons')} WHERE module_id = %s))
                RETURNING id""",
            (mid, title, description, duration, vtype, vurl, mid),
        )
        lid = cur.fetchone()['id']
    for i, m in enumerate(materials, start=1):
        cur.execute(
            f"""INSERT INTO {t('lesson_materials')} (lesson_id, title, kind, url, file_size, position)
                VALUES (%s, %s, %s, %s, %s, %s)""",
            (lid, m['title'], m['kind'], m['url'], m['size'], i),
        )
    cid = course_of_module(cur, mid)
    return resp(200, {'ok': True, 'lessonId': lid, 'modules': load_program(cur, cid, with_content=True)})


def a_lesson_delete(cur, body, user):
    lid = to_int(body.get('id'))
    cur.execute(f"SELECT module_id FROM {t('lessons')} WHERE id = %s", (lid,))
    row = cur.fetchone()
    if not row:
        return err(404, 'not_found', 'Урок не найден')
    delete_lessons(cur, 'id = %s', (lid,))
    renumber(cur, 'lessons', 'module_id', row['module_id'])
    return resp(200, {'ok': True, 'modules': load_program(cur, course_of_module(cur, row['module_id']), with_content=True)})


def a_lesson_move(cur, body, user):
    mid = move(cur, 'lessons', 'module_id', to_int(body.get('id')) or 0, int(body.get('direction') or 0))
    if mid is None:
        return err(404, 'not_found', 'Урок не найден')
    return resp(200, {'ok': True, 'modules': load_program(cur, course_of_module(cur, mid), with_content=True)})


# ---------- загрузка файлов частями ----------

def safe_filename(name: str) -> str:
    name = name.strip().replace('\\', '/').rsplit('/', 1)[-1]
    name = re.sub(r'[^\w.\- ()]+', '_', name, flags=re.UNICODE).strip(' ._') or 'file'
    return name[-120:]


def a_upload_start(cur, body, user):
    kind = body.get('kind')
    if kind not in LIMITS:
        return err(400, 'bad_kind', 'Некорректный тип файла')
    filename = safe_filename(str(body.get('filename', '')))
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    allowed = VIDEO_EXT if kind == 'video' else MATERIAL_EXT
    if ext not in allowed:
        if kind == 'video':
            return err(400, 'bad_type', 'Видео должно быть в формате MP4, WEBM или MOV')
        return err(400, 'bad_type', 'Этот формат не поддерживается. Подойдут PDF, Word, Excel, PowerPoint, ZIP, изображения, MP3')
    try:
        size = int(body.get('size') or 0)
    except (TypeError, ValueError):
        size = 0
    if size <= 0:
        return err(400, 'bad_size', 'Файл пустой')
    if size > LIMITS[kind]:
        mb = LIMITS[kind] // (1024 * 1024)
        hint = ' Для больших видео используйте ссылку на YouTube, VK Видео, Rutube или Kinescope.' if kind == 'video' else ''
        return err(400, 'too_large', f'Файл больше {mb} МБ.{hint}')
    upload_id = uuid.uuid4().hex
    token = secrets.token_urlsafe(24)
    cur.execute(
        f"""INSERT INTO {t('file_uploads')} (id, user_id, kind, filename, content_type, total_size, chunk_size, token_hash)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (upload_id, user['id'], kind, filename, allowed[ext], size, CHUNK_SIZE, sha(token)),
    )
    chunks = (size + CHUNK_SIZE - 1) // CHUNK_SIZE
    return resp(200, {'ok': True, 'uploadId': upload_id, 'token': token, 'chunkSize': CHUNK_SIZE, 'chunks': chunks})


def upload_by_token(cur, body):
    uid = str(body.get('uploadId', ''))[:48]
    token = str(body.get('token', ''))[:100]
    cur.execute(f"SELECT * FROM {t('file_uploads')} WHERE id = %s", (uid,))
    up = cur.fetchone()
    if not up or not token or not hmac.compare_digest(up['token_hash'], sha(token)):
        return None
    if up['created_at'].timestamp() < time.time() - 6 * 3600:
        return None
    return up


def part_key(upload_id: str, index: int) -> str:
    return f'uploads/tmp/{upload_id}/{index:05d}'


def a_upload_chunk(cur, body, _user):
    up = upload_by_token(cur, body)
    if not up:
        return err(403, 'bad_upload', 'Загрузка устарела. Начните заново')
    if up['finished_at']:
        return err(400, 'finished', 'Файл уже загружен')
    chunks = (up['total_size'] + up['chunk_size'] - 1) // up['chunk_size']
    try:
        index = int(body.get('index'))
    except (TypeError, ValueError):
        index = -1
    if not 0 <= index < chunks:
        return err(400, 'bad_index', 'Некорректная часть файла')
    try:
        data = base64.b64decode(str(body.get('data', '')), validate=True)
    except (ValueError, TypeError):
        return err(400, 'bad_data', 'Часть файла повреждена')
    expected = up['chunk_size'] if index < chunks - 1 else up['total_size'] - up['chunk_size'] * (chunks - 1)
    if len(data) != expected:
        return err(400, 'bad_data', 'Часть файла повреждена')
    s3().put_object(Bucket='files', Key=part_key(up['id'], index), Body=data)
    return resp(200, {'ok': True})


def a_upload_finish(cur, body, _user):
    up = upload_by_token(cur, body)
    if not up:
        return err(403, 'bad_upload', 'Загрузка устарела. Начните заново')
    if up['final_url']:
        return resp(200, {'ok': True, 'url': up['final_url'], 'size': up['total_size'], 'filename': up['filename']})
    client = s3()
    chunks = (up['total_size'] + up['chunk_size'] - 1) // up['chunk_size']
    path = f"/tmp/{up['id']}.bin"
    size = 0
    try:
        with open(path, 'wb') as f:
            for i in range(chunks):
                try:
                    obj = client.get_object(Bucket='files', Key=part_key(up['id'], i))
                except client.exceptions.NoSuchKey:
                    return err(400, 'missing_part', f'Часть {i + 1} не загрузилась. Повторите загрузку')
                for piece in obj['Body'].iter_chunks(1024 * 1024):
                    f.write(piece)
                    size += len(piece)
        if size != up['total_size']:
            return err(400, 'bad_size', 'Файл загрузился не полностью. Повторите загрузку')
        ext = up['filename'].rsplit('.', 1)[-1].lower()
        if up['kind'] == 'video':
            key = f"lessons/videos/{uuid.uuid4().hex}.{ext}"
            extra = {}
        else:
            key = f"lessons/materials/{uuid.uuid4().hex}/{up['filename']}"
            from urllib.parse import quote
            extra = {'ContentDisposition': f"attachment; filename*=UTF-8''{quote(up['filename'])}"}
        with open(path, 'rb') as f:
            client.put_object(Bucket='files', Key=key, Body=f, ContentLength=size, ContentType=up['content_type'], **extra)
    finally:
        if os.path.exists(path):
            os.remove(path)
    from urllib.parse import quote as q
    url = cdn_prefix() + q(key)
    cur.execute(
        f"UPDATE {t('file_uploads')} SET final_url = %s, finished_at = NOW() WHERE id = %s", (url, up['id'])
    )
    return resp(200, {'ok': True, 'url': url, 'size': size, 'filename': up['filename']})


def a_upload_cleanup(cur, body, _user):
    up = upload_by_token(cur, body)
    if not up:
        return err(403, 'bad_upload', 'Загрузка устарела')
    if up['cleaned_at']:
        return resp(200, {'ok': True, 'left': 0})
    client = s3()
    chunks = (up['total_size'] + up['chunk_size'] - 1) // up['chunk_size']
    start = time.time()
    try:
        first = int(body.get('from') or 0)
    except (TypeError, ValueError):
        first = 0
    i = max(0, first)
    while i < chunks and time.time() - start < 3.2:
        client.delete_object(Bucket='files', Key=part_key(up['id'], i))
        i += 1
    if i >= chunks:
        cur.execute(f"UPDATE {t('file_uploads')} SET cleaned_at = NOW() WHERE id = %s", (up['id'],))
    return resp(200, {'ok': True, 'left': max(0, chunks - i), 'next': i})


# ---------- доступы ----------

def a_access_list(cur, _body, user):
    cur.execute(
        f"""SELECT ca.id, ca.created_at, u.id AS user_id, u.name AS user_name, u.email AS user_email,
                   c.id AS course_id, c.title AS course_title, g.name AS granted_by
            FROM {t('course_access')} ca
            JOIN {t('users')} u ON u.id = ca.user_id
            JOIN {t('courses')} c ON c.id = ca.course_id
            LEFT JOIN {t('users')} g ON g.id = ca.granted_by
            ORDER BY ca.created_at DESC LIMIT 1000"""
    )
    rows = [
        {
            'id': r['id'], 'createdAt': r['created_at'], 'grantedBy': r['granted_by'],
            'user': {'id': r['user_id'], 'name': r['user_name'], 'email': r['user_email']},
            'course': {'id': r['course_id'], 'title': r['course_title']},
        }
        for r in cur.fetchall()
    ]
    cur.execute(f"SELECT id, title, published FROM {t('courses')} WHERE access = 'paid' ORDER BY title")
    return resp(200, {'ok': True, 'grants': rows, 'courses': [dict(r) for r in cur.fetchall()]})


def a_access_grant(cur, body, user):
    email = str(body.get('email', '')).strip().lower()[:255]
    cid = to_int(body.get('courseId'))
    cur.execute(f"SELECT id, name FROM {t('users')} WHERE email = %s", (email,))
    target = cur.fetchone()
    if not target:
        return err(404, 'user_not_found', 'Пользователь с таким email не зарегистрирован')
    course = course_by(cur, 'c.id = %s', (cid,)) if cid else None
    if not course:
        return err(404, 'not_found', 'Курс не найден')
    if course['access'] == 'free':
        return err(400, 'free_course', 'Этот курс бесплатный — он и так открыт всем пользователям')
    cur.execute(
        f"""INSERT INTO {t('course_access')} (user_id, course_id, granted_by) VALUES (%s, %s, %s)
            ON CONFLICT (user_id, course_id) DO NOTHING RETURNING id""",
        (target['id'], cid, user['id']),
    )
    created = cur.fetchone() is not None
    return resp(200, {'ok': True, 'created': created, 'userName': target['name'], 'courseTitle': course['title']})


def a_access_revoke(cur, body, user):
    aid = to_int(body.get('id'))
    cur.execute(f"DELETE FROM {t('course_access')} WHERE id = %s RETURNING id", (aid,))
    if not cur.fetchone():
        return err(404, 'not_found', 'Доступ не найден')
    return resp(200, {'ok': True})


OPTIONAL_USER = {'course_learn': a_course_learn}
USER = {'lesson_get': a_lesson_get, 'lesson_complete': a_lesson_complete, 'my_courses': a_my_courses}
TOKEN = {'upload_chunk': a_upload_chunk, 'upload_finish': a_upload_finish, 'upload_cleanup': a_upload_cleanup}
ADMIN = {
    'program_courses': ('lessons', a_program_courses),
    'program_get': ('lessons', a_program_get),
    'module_save': ('lessons', a_module_save),
    'module_delete': ('lessons', a_module_delete),
    'module_move': ('lessons', a_module_move),
    'lesson_save': ('lessons', a_lesson_save),
    'lesson_delete': ('lessons', a_lesson_delete),
    'lesson_move': ('lessons', a_lesson_move),
    'upload_start': ('lessons', a_upload_start),
    'access_list': ('access', a_access_list),
    'access_grant': ('access', a_access_grant),
    'access_revoke': ('access', a_access_revoke),
}


def handler(event: dict, context) -> dict:
    """Обучение JETRA University: программа курса, прохождение уроков, прогресс, доступы и загрузка файлов."""
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
        if action in TOKEN:
            return TOKEN[action](cur, body, None)
        user = session_user(cur, headers.get('x-session-token'))
        if action in OPTIONAL_USER:
            return OPTIONAL_USER[action](cur, body, user)
        if action in USER:
            if not user:
                return err(401, 'unauthorized', 'Требуется вход')
            return USER[action](cur, body, user)
        if action in ADMIN:
            if not user:
                return err(401, 'unauthorized', 'Требуется вход')
            perm, fn = ADMIN[action]
            if not has_perm(user, perm):
                return err(403, 'forbidden', 'Недостаточно прав для этого раздела')
            return fn(cur, body, user)
        return err(400, 'unknown_action', 'Неизвестное действие')
    finally:
        conn.close()
