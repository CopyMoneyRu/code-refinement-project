import hashlib
import json
import os
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Cron-Key',
    'Access-Control-Max-Age': '86400',
}


def jdefault(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=jdefault)}


def text(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'text/plain; charset=utf-8'}, 'body': body}


def err(status, code, message):
    return resp(status, {'ok': False, 'error': code, 'message': message})


def t(name):
    return f'"{os.environ.get("MAIN_DB_SCHEMA", "public")}".{name}'


def sha(v):
    return hashlib.sha256(v.encode()).hexdigest()


def now():
    return datetime.now(timezone.utc)


def money(v) -> Decimal:
    return Decimal(str(v or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def s(v, n):
    return str(v if v is not None else '').strip()[:n]


def session_user(cur, token):
    if not token or len(token) > 200:
        return None
    cur.execute(
        f"""SELECT u.id, u.email, u.name, u.role, u.permissions FROM {t('sessions')} s JOIN {t('users')} u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.revoked_at IS NULL AND s.expires_at > NOW() AND u.archived_at IS NULL""",
        (sha(token),),
    )
    r = cur.fetchone()
    return dict(r) if r else None


def audit(cur, user, action, entity, entity_id, details=None):
    cur.execute(
        f"INSERT INTO {t('audit_log')} (actor_id, action, entity, entity_id, details) VALUES (%s, %s, %s, %s, %s)",
        (user['id'] if user else None, action, entity, entity_id, json.dumps(details or {}, ensure_ascii=False, default=jdefault)),
    )


def notify(cur, user_id, kind, title, body='', link='', level='info', dedupe=None):
    cur.execute(
        f"""INSERT INTO {t('notifications')} (user_id, level, kind, title, body, link, dedupe_key)
            VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING""",
        (user_id, level, kind, title[:200], body, link[:300], dedupe),
    )


def get_settings(cur, lock=False):
    cur.execute(f"SELECT value FROM {t('platform_settings')} WHERE key = 'payments'" + (' FOR UPDATE' if lock else ''))
    r = cur.fetchone()
    v = dict(r['value']) if r else {}
    v.setdefault('mode', 'test')
    v.setdefault('testStaffOnly', True)
    rk = dict(v.get('robokassa') or {})
    rk.setdefault('login', '')
    rk.setdefault('hashAlg', 'md5')
    rk.setdefault('fiscal', False)
    rk.setdefault('sno', 'usn_income')
    rk.setdefault('tax', 'none')
    rk.setdefault('recurring', False)
    v['robokassa'] = rk
    return v


def fmt_rub(v):
    d = money(v)
    whole = f'{int(d):,}'.replace(',', ' ')
    cents = int((d - int(d)) * 100)
    return f'{whole},{cents:02d} ₽' if cents else f'{whole} ₽'
