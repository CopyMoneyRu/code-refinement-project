import hashlib
import json
import os
from datetime import date, datetime, timedelta

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400',
}


def resp(status: int, data: dict) -> dict:
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=str)}


def err(status: int, code: str, message: str) -> dict:
    return resp(status, {'ok': False, 'error': code, 'message': message})


def t(name: str) -> str:
    return f'"{os.environ.get("MAIN_DB_SCHEMA", "public")}".{name}'


def session_user(cur, token):
    if not token or len(token) > 200:
        return None
    cur.execute(
        f"""SELECT u.* FROM {t('sessions')} s JOIN {t('users')} u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.archived_at IS NULL""",
        (hashlib.sha256(token.encode()).hexdigest(),),
    )
    return cur.fetchone()


def parse_day(v, fallback: date) -> date:
    try:
        return datetime.strptime(str(v)[:10], '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return fallback


COURSE_STATE = """
    WITH totals AS (
        SELECT m.course_id, COUNT(*) AS total FROM {lessons} l JOIN {modules} m ON m.id = l.module_id
        WHERE l.published AND m.published GROUP BY m.course_id
    ), per AS (
        SELECT p.user_id, m.course_id, COUNT(*) AS done, MIN(p.completed_at) AS started_at, MAX(p.completed_at) AS last_at
        FROM {progress} p JOIN {lessons} l ON l.id = p.lesson_id JOIN {modules} m ON m.id = l.module_id
        JOIN {users} u ON u.id = p.user_id
        WHERE l.published AND m.published AND u.role = 'user' GROUP BY p.user_id, m.course_id
    )
    SELECT per.*, totals.total, (per.done >= totals.total) AS finished
    FROM per JOIN totals ON totals.course_id = per.course_id
"""


def course_states(cur):
    cur.execute(COURSE_STATE.format(
        lessons=t('lessons'), modules=t('course_modules'), progress=t('lesson_progress'), users=t('users')))
    return cur.fetchall()


def count(cur, sql: str, params: tuple = ()) -> int:
    cur.execute(sql, params)
    return int(list(cur.fetchone().values())[0] or 0)


def period_stats(cur, states, start: datetime, end: datetime) -> dict:
    users = t('users')
    return {
        'newUsers': count(cur, f"SELECT COUNT(*) FROM {users} WHERE role = 'user' AND created_at >= %s AND created_at < %s", (start, end)),
        'startedCourses': sum(1 for s in states if start <= s['started_at'] < end),
        'completedCourses': sum(1 for s in states if s['finished'] and start <= s['last_at'] < end),
        'lessonsCompleted': count(cur, f"""SELECT COUNT(*) FROM {t('lesson_progress')} p JOIN {users} u ON u.id = p.user_id
            WHERE u.role = 'user' AND p.completed_at >= %s AND p.completed_at < %s""", (start, end)),
        'activeLearners': count(cur, f"""SELECT COUNT(DISTINCT p.user_id) FROM {t('lesson_progress')} p JOIN {users} u ON u.id = p.user_id
            WHERE u.role = 'user' AND p.completed_at >= %s AND p.completed_at < %s""", (start, end)),
        'payments': count(cur, f"SELECT COUNT(*) FROM {t('purchases')} WHERE status = 'paid' AND paid_at >= %s AND paid_at < %s", (start, end)),
        'revenue': count(cur, f"SELECT COALESCE(SUM(amount), 0) FROM {t('purchases')} WHERE status = 'paid' AND paid_at >= %s AND paid_at < %s", (start, end)),
        'accessGranted': count(cur, f"SELECT COUNT(*) FROM {t('course_access')} WHERE created_at >= %s AND created_at < %s", (start, end)),
    }


def totals(cur, states) -> dict:
    users = t('users')
    return {
        'users': count(cur, f"SELECT COUNT(*) FROM {users} WHERE role = 'user' AND archived_at IS NULL"),
        'verifiedUsers': count(cur, f"SELECT COUNT(*) FROM {users} WHERE role = 'user' AND archived_at IS NULL AND email_verified"),
        'admins': count(cur, f"SELECT COUNT(*) FROM {users} WHERE role IN ('admin', 'superadmin') AND archived_at IS NULL"),
        'courses': count(cur, f"SELECT COUNT(*) FROM {t('courses')} WHERE archived_at IS NULL"),
        'publishedCourses': count(cur, f"SELECT COUNT(*) FROM {t('courses')} WHERE archived_at IS NULL AND published"),
        'paidCourses': count(cur, f"SELECT COUNT(*) FROM {t('courses')} WHERE archived_at IS NULL AND access = 'paid'"),
        'lessons': count(cur, f"""SELECT COUNT(*) FROM {t('lessons')} l JOIN {t('course_modules')} m ON m.id = l.module_id
            JOIN {t('courses')} c ON c.id = m.course_id WHERE c.archived_at IS NULL"""),
        'authors': count(cur, f"SELECT COUNT(*) FROM {t('authors')} WHERE archived_at IS NULL"),
        'learners': len({s['user_id'] for s in states}),
        'startedCourses': len(states),
        'completedCourses': sum(1 for s in states if s['finished']),
        'payments': count(cur, f"SELECT COUNT(*) FROM {t('purchases')} WHERE status = 'paid'"),
        'revenue': count(cur, f"SELECT COALESCE(SUM(amount), 0) FROM {t('purchases')} WHERE status = 'paid'"),
        'accessGrants': count(cur, f"SELECT COUNT(*) FROM {t('course_access')}"),
        'marketingConsents': count(cur, f"SELECT COUNT(*) FROM {users} WHERE role = 'user' AND archived_at IS NULL AND marketing_consent"),
    }


def series(cur, states, start: date, end: date) -> list:
    days = (end - start).days + 1
    unit = 'day' if days <= 62 else ('week' if days <= 370 else 'month')
    buckets, cur_d = [], start
    while cur_d <= end:
        if unit == 'day':
            nxt = cur_d + timedelta(days=1)
        elif unit == 'week':
            nxt = cur_d + timedelta(days=7)
        else:
            nxt = (cur_d.replace(day=1) + timedelta(days=32)).replace(day=1)
        buckets.append((cur_d, min(nxt, end + timedelta(days=1))))
        cur_d = nxt

    def grouped(sql: str):
        cur.execute(sql, (start, end + timedelta(days=1)))
        return [(r['d'].date() if isinstance(r['d'], datetime) else r['d'], int(r['v'] or 0)) for r in cur.fetchall()]

    users = t('users')
    raw = {
        'newUsers': grouped(f"SELECT created_at AS d, 1 AS v FROM {users} WHERE role = 'user' AND created_at >= %s AND created_at < %s"),
        'lessonsCompleted': grouped(f"""SELECT p.completed_at AS d, 1 AS v FROM {t('lesson_progress')} p JOIN {users} u ON u.id = p.user_id
            WHERE u.role = 'user' AND p.completed_at >= %s AND p.completed_at < %s"""),
        'payments': grouped(f"SELECT paid_at AS d, 1 AS v FROM {t('purchases')} WHERE status = 'paid' AND paid_at >= %s AND paid_at < %s"),
        'revenue': grouped(f"SELECT paid_at AS d, amount AS v FROM {t('purchases')} WHERE status = 'paid' AND paid_at >= %s AND paid_at < %s"),
    }
    raw['startedCourses'] = [(s['started_at'].date(), 1) for s in states]
    raw['completedCourses'] = [(s['last_at'].date(), 1) for s in states if s['finished']]
    out = []
    for b0, b1 in buckets:
        row = {'date': b0.isoformat()}
        for k, items in raw.items():
            row[k] = sum(v for d, v in items if b0 <= d < b1)
        out.append(row)
    return out, unit


def top_courses(cur, states, start: datetime, end: datetime) -> list:
    cur.execute(f"SELECT id, title, access, price FROM {t('courses')} WHERE archived_at IS NULL")
    courses = {r['id']: dict(r) for r in cur.fetchall()}
    cur.execute(
        f"""SELECT course_id, COUNT(*) AS n, COALESCE(SUM(amount), 0) AS s FROM {t('purchases')}
            WHERE status = 'paid' AND paid_at >= %s AND paid_at < %s GROUP BY course_id""",
        (start, end),
    )
    pay = {r['course_id']: r for r in cur.fetchall()}
    out = []
    for cid, c in courses.items():
        mine = [s for s in states if s['course_id'] == cid]
        row = {
            'id': cid, 'title': c['title'], 'access': c['access'],
            'learners': len(mine),
            'started': sum(1 for s in mine if start <= s['started_at'] < end),
            'completed': sum(1 for s in mine if s['finished'] and start <= s['last_at'] < end),
            'avgPercent': round(sum(min(100, s['done'] * 100 / s['total']) for s in mine) / len(mine)) if mine else 0,
            'payments': int(pay[cid]['n']) if cid in pay else 0,
            'revenue': int(pay[cid]['s']) if cid in pay else 0,
        }
        out.append(row)
    out.sort(key=lambda r: (r['started'], r['learners']), reverse=True)
    return out


def a_overview(cur, _body):
    states = course_states(cur)
    now = datetime.now().astimezone()
    return resp(200, {
        'ok': True,
        'totals': totals(cur, states),
        'week': period_stats(cur, states, now - timedelta(days=7), now + timedelta(minutes=1)),
        'month': period_stats(cur, states, now - timedelta(days=30), now + timedelta(minutes=1)),
    })


def a_report(cur, body):
    today = date.today()
    end = parse_day(body.get('to'), today)
    start = parse_day(body.get('from'), end - timedelta(days=29))
    if start > end:
        start, end = end, start
    if (end - start).days > 3660:
        start = end - timedelta(days=3660)
    states = course_states(cur)
    s_dt = datetime.combine(start, datetime.min.time()).astimezone()
    e_dt = datetime.combine(end + timedelta(days=1), datetime.min.time()).astimezone()
    length = (end - start).days + 1
    p_start = s_dt - timedelta(days=length)
    points, unit = series(cur, states, start, end)
    return resp(200, {
        'ok': True,
        'from': start.isoformat(), 'to': end.isoformat(), 'unit': unit,
        'current': period_stats(cur, states, s_dt, e_dt),
        'previous': period_stats(cur, states, p_start, s_dt),
        'series': points,
        'courses': top_courses(cur, states, s_dt, e_dt),
        'totals': totals(cur, states),
    })


ACTIONS = {'overview': a_overview, 'report': a_report}


def handler(event: dict, context) -> dict:
    """Аналитика JETRA для администраторов: пользователи, обучения, оплаты и выручка за выбранный период."""
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
    fn = ACTIONS.get(body.get('action'))
    if not fn:
        return err(400, 'unknown_action', 'Неизвестное действие')
    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        user = session_user(cur, headers.get('x-session-token'))
        if not user:
            return err(401, 'unauthorized', 'Требуется вход')
        if user['role'] not in ('admin', 'superadmin'):
            return err(403, 'forbidden', 'Аналитика доступна только администраторам')
        return fn(cur, body)
    finally:
        conn.close()
