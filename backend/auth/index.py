"""Авторизация JETRA: регистрация, подтверждение email, вход, сессии, восстановление пароля, роли."""
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import psycopg2
import psycopg2.extras

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400',
}

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
PBKDF2_ITER = 210_000
SESSION_DAYS = 30
CODE_MINUTES = 15
MAX_CODE_ATTEMPTS = 5
MAX_FAILED = 5
LOCK_MINUTES = 15


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


def now() -> datetime:
    return datetime.now(timezone.utc)


def sha(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), PBKDF2_ITER)
    return f'pbkdf2_sha256${PBKDF2_ITER}${salt}${dk.hex()}'


def check_password(password: str, stored: str) -> bool:
    algo, iters, salt, digest = stored.split('$')
    if algo != 'pbkdf2_sha256':
        return False
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iters))
    return hmac.compare_digest(dk.hex(), digest)


def password_problem(password: str) -> str | None:
    if len(password) < 8:
        return 'Пароль должен быть не короче 8 символов'
    if len(password) > 128:
        return 'Пароль слишком длинный'
    if not re.search(r'[A-Za-zА-Яа-я]', password) or not re.search(r'\d', password):
        return 'Пароль должен содержать буквы и цифры'
    return None


def public_user(u: dict) -> dict:
    return {
        'id': u['id'],
        'email': u['email'],
        'name': u['name'],
        'role': u['role'],
        'emailVerified': u['email_verified'],
        'createdAt': u['created_at'].isoformat() if u.get('created_at') else None,
    }


def smtp_ready() -> bool:
    return all(os.environ.get(k) for k in ('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'))


def deliver(to: str, msg) -> bool:
    host, port = os.environ['SMTP_HOST'], int(os.environ['SMTP_PORT'])
    ctx = ssl.create_default_context()
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ctx, timeout=8) as s:
                s.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
                s.sendmail(os.environ['SMTP_USER'], [to], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=8) as s:
                s.starttls(context=ctx)
                s.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
                s.sendmail(os.environ['SMTP_USER'], [to], msg.as_string())
        return True
    except Exception as e:
        print(f'[auth] ошибка отправки письма: {type(e).__name__}: {e}')
        return False


def code_hash(user_id: int, purpose: str, code: str) -> str:
    return sha(f'{user_id}:{purpose}:{code}')


def issue_code(cur, user_id: int, purpose: str) -> str:
    cur.execute(
        f"UPDATE {t('email_tokens')} SET used_at = NOW() WHERE user_id = %s AND purpose = %s AND used_at IS NULL",
        (user_id, purpose),
    )
    code = f'{secrets.randbelow(1_000_000):06d}'
    cur.execute(
        f"INSERT INTO {t('email_tokens')} (user_id, purpose, token_hash, expires_at) VALUES (%s, %s, %s, %s)",
        (user_id, purpose, code_hash(user_id, purpose, code), now() + timedelta(minutes=CODE_MINUTES)),
    )
    return code


def send_code_mail(to: str, subject: str, title: str, text: str, code: str) -> bool:
    if not smtp_ready():
        print(f'[auth] SMTP не настроен, письмо «{subject}» не отправлено')
        return False
    html = f"""<!doctype html><html><body style="margin:0;background:#F5F7FA;font-family:Arial,sans-serif;color:#17263C">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;padding:40px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:4px">JETRA</td></tr>
<tr><td style="padding-top:28px;font-size:22px;font-weight:700">{title}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#5A6B82">{text}</td></tr>
<tr><td style="padding-top:24px"><div style="display:inline-block;background:#E6ECF3;border-radius:10px;padding:16px 28px;font-size:34px;font-weight:700;letter-spacing:10px;color:#17263C;font-family:'Courier New',monospace">{code}</div></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#8A97A8;line-height:1.5">Код действует {CODE_MINUTES} минут. Никому не сообщайте его.<br>Если вы не запрашивали это письмо, просто проигнорируйте его.</td></tr>
</table></td></tr></table></body></html>"""
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = f'JETRA <{os.environ["SMTP_USER"]}>'
    msg['To'] = to
    msg.attach(MIMEText(f'{title}\n\n{text}\n\nКод: {code}\n\nКод действует {CODE_MINUTES} минут.', 'plain', 'utf-8'))
    msg.attach(MIMEText(html, 'html', 'utf-8'))
    return deliver(to, msg)


def send_verify(cur, user: dict) -> bool:
    code = issue_code(cur, user['id'], 'verify')
    return send_code_mail(
        user['email'],
        f'{code} — код подтверждения JETRA',
        'Подтвердите ваш email',
        f'Здравствуйте, {user["name"]}! Введите этот код на сайте JETRA, чтобы завершить регистрацию.',
        code,
    )


def check_code(cur, user: dict, purpose: str, code: str):
    """Возвращает (row, None) при успехе или (None, ответ-ошибку)."""
    bad = err(400, 'invalid_code', 'Неверный код. Проверьте письмо и попробуйте ещё раз.')
    cur.execute(
        f"""SELECT * FROM {t('email_tokens')} WHERE user_id = %s AND purpose = %s AND used_at IS NULL
            ORDER BY id DESC LIMIT 1""",
        (user['id'], purpose),
    )
    row = cur.fetchone()
    if not row or row['expires_at'] <= now():
        return None, err(400, 'code_expired', 'Срок действия кода истёк. Запросите новый код.')
    if row['attempts'] >= MAX_CODE_ATTEMPTS:
        return None, err(429, 'too_many_attempts', 'Слишком много неверных попыток. Запросите новый код.')
    if not re.fullmatch(r'\d{6}', code) or not hmac.compare_digest(row['token_hash'], code_hash(user['id'], purpose, code)):
        cur.execute(f"UPDATE {t('email_tokens')} SET attempts = attempts + 1 WHERE id = %s", (row['id'],))
        left = MAX_CODE_ATTEMPTS - row['attempts'] - 1
        if left <= 0:
            cur.execute(f"UPDATE {t('email_tokens')} SET used_at = NOW() WHERE id = %s", (row['id'],))
            return None, err(429, 'too_many_attempts', 'Слишком много неверных попыток. Запросите новый код.')
        return None, bad
    cur.execute(f"UPDATE {t('email_tokens')} SET used_at = NOW() WHERE id = %s", (row['id'],))
    return row, None


def find_user(cur, email: str):
    cur.execute(f"SELECT * FROM {t('users')} WHERE email = %s", (email,))
    return cur.fetchone()


def session_user(cur, token: str | None):
    if not token or len(token) > 200:
        return None
    cur.execute(
        f"""SELECT u.* FROM {t('sessions')} s JOIN {t('users')} u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.revoked_at IS NULL AND s.expires_at > NOW()""",
        (sha(token),),
    )
    return cur.fetchone()


def is_admin_email(email: str) -> bool:
    admins = [e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]
    return email in admins


def handler(event: dict, context) -> dict:
    """Единая точка авторизации JETRA. Действие передаётся в поле action тела POST-запроса."""
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

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    token = headers.get('x-session-token')
    action = body.get('action')

    conn = db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        fn = ACTIONS.get(action)
        if not fn:
            return err(400, 'unknown_action', 'Неизвестное действие')
        return fn(cur, body, token)
    finally:
        conn.close()


def a_register(cur, body, _token):
    name = str(body.get('name', '')).strip()[:120]
    email = str(body.get('email', '')).strip().lower()[:255]
    password = str(body.get('password', ''))
    if len(name) < 2:
        return err(400, 'invalid_name', 'Укажите имя')
    if not EMAIL_RE.match(email):
        return err(400, 'invalid_email', 'Введите корректный email')
    problem = password_problem(password)
    if problem:
        return err(400, 'weak_password', problem)

    existing = find_user(cur, email)
    if existing:
        if not existing['email_verified']:
            sent = send_verify(cur, existing)
            return resp(200, {'ok': True, 'emailSent': sent})
        return err(409, 'email_taken', 'Аккаунт с таким email уже существует. Войдите или восстановите пароль.')

    role = 'admin' if is_admin_email(email) else 'user'
    cur.execute(
        f"INSERT INTO {t('users')} (email, name, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING *",
        (email, name, hash_password(password), role),
    )
    user = cur.fetchone()
    sent = send_verify(cur, user)
    return resp(200, {'ok': True, 'emailSent': sent})


def a_resend(cur, body, _token):
    email = str(body.get('email', '')).strip().lower()
    user = find_user(cur, email) if EMAIL_RE.match(email) else None
    sent = False
    if user and not user['email_verified']:
        sent = send_verify(cur, user)
    return resp(200, {'ok': True, 'emailSent': sent if user else True})


def a_verify(cur, body, _token):
    email = str(body.get('email', '')).strip().lower()
    code = str(body.get('code', '')).strip()
    user = find_user(cur, email) if EMAIL_RE.match(email) else None
    if not user:
        return err(400, 'invalid_code', 'Неверный код. Проверьте письмо и попробуйте ещё раз.')
    if user['email_verified']:
        return err(400, 'already_verified', 'Email уже подтверждён. Войдите с паролем.')
    _, denied = check_code(cur, user, 'verify', code)
    if denied:
        return denied
    cur.execute(
        f"UPDATE {t('users')} SET email_verified = TRUE, updated_at = NOW() WHERE id = %s RETURNING *",
        (user['id'],),
    )
    user = cur.fetchone()
    if is_admin_email(email) and user['role'] != 'admin':
        cur.execute(f"UPDATE {t('users')} SET role = 'admin' WHERE id = %s", (user['id'],))
        user['role'] = 'admin'
    raw = create_session(cur, user['id'], body)
    return resp(200, {'ok': True, 'token': raw, 'maxAge': SESSION_DAYS * 86400, 'user': public_user(user)})


def create_session(cur, user_id: int, body: dict) -> str:
    raw = secrets.token_urlsafe(48)
    cur.execute(
        f"""INSERT INTO {t('sessions')} (user_id, token_hash, expires_at, ip, user_agent)
            VALUES (%s, %s, %s, %s, %s)""",
        (user_id, sha(raw), now() + timedelta(days=SESSION_DAYS),
         str(body.get('ip', ''))[:64] or None, str(body.get('userAgent', ''))[:300] or None),
    )
    return raw


def a_login(cur, body, _token):
    email = str(body.get('email', '')).strip().lower()
    password = str(body.get('password', ''))
    generic = err(401, 'invalid_credentials', 'Неверный email или пароль')
    if not EMAIL_RE.match(email) or not password:
        return generic
    user = find_user(cur, email)
    if not user:
        hash_password(password)
        return generic
    if user['locked_until'] and user['locked_until'] > now():
        return err(429, 'locked', 'Слишком много попыток входа. Попробуйте через 15 минут.')
    if not check_password(password, user['password_hash']):
        failed = user['failed_logins'] + 1
        locked = now() + timedelta(minutes=LOCK_MINUTES) if failed >= MAX_FAILED else None
        cur.execute(
            f"UPDATE {t('users')} SET failed_logins = %s, locked_until = %s WHERE id = %s",
            (0 if locked else failed, locked, user['id']),
        )
        return generic
    cur.execute(f"UPDATE {t('users')} SET failed_logins = 0, locked_until = NULL WHERE id = %s", (user['id'],))
    if not user['email_verified']:
        return err(403, 'email_not_verified', 'Подтвердите email — введите код из письма.')
    if is_admin_email(email) and user['role'] != 'admin':
        cur.execute(f"UPDATE {t('users')} SET role = 'admin' WHERE id = %s", (user['id'],))
        user['role'] = 'admin'
    raw = create_session(cur, user['id'], body)
    return resp(200, {'ok': True, 'token': raw, 'maxAge': SESSION_DAYS * 86400, 'user': public_user(user)})


def a_me(cur, _body, token):
    user = session_user(cur, token)
    if not user:
        return resp(200, {'ok': True, 'user': None})
    return resp(200, {'ok': True, 'user': public_user(user)})


def a_logout(cur, _body, token):
    if token:
        cur.execute(f"UPDATE {t('sessions')} SET revoked_at = NOW() WHERE token_hash = %s", (sha(token),))
    return resp(200, {'ok': True})


def a_forgot(cur, body, _token):
    email = str(body.get('email', '')).strip().lower()
    user = find_user(cur, email) if EMAIL_RE.match(email) else None
    if user:
        code = issue_code(cur, user['id'], 'reset')
        send_code_mail(
            user['email'],
            f'{code} — код для смены пароля JETRA',
            'Смена пароля',
            'Мы получили запрос на смену пароля для вашего аккаунта JETRA. Введите этот код на сайте.',
            code,
        )
    return resp(200, {'ok': True})


def a_reset(cur, body, _token):
    email = str(body.get('email', '')).strip().lower()
    password = str(body.get('password', ''))
    problem = password_problem(password)
    if problem:
        return err(400, 'weak_password', problem)
    user = find_user(cur, email) if EMAIL_RE.match(email) else None
    if not user:
        return err(400, 'invalid_code', 'Неверный код. Проверьте письмо и попробуйте ещё раз.')
    _, denied = check_code(cur, user, 'reset', str(body.get('code', '')).strip())
    if denied:
        return denied
    cur.execute(
        f"""UPDATE {t('users')} SET password_hash = %s, email_verified = TRUE, failed_logins = 0,
            locked_until = NULL, updated_at = NOW() WHERE id = %s""",
        (hash_password(password), user['id']),
    )
    cur.execute(f"UPDATE {t('sessions')} SET revoked_at = NOW() WHERE user_id = %s AND revoked_at IS NULL", (user['id'],))
    return resp(200, {'ok': True})


def a_update_profile(cur, body, token):
    user = session_user(cur, token)
    if not user:
        return err(401, 'unauthorized', 'Требуется вход')
    name = str(body.get('name', '')).strip()[:120]
    if len(name) < 2:
        return err(400, 'invalid_name', 'Укажите имя')
    cur.execute(f"UPDATE {t('users')} SET name = %s, updated_at = NOW() WHERE id = %s RETURNING *", (name, user['id']))
    return resp(200, {'ok': True, 'user': public_user(cur.fetchone())})


def a_change_password(cur, body, token):
    user = session_user(cur, token)
    if not user:
        return err(401, 'unauthorized', 'Требуется вход')
    if not check_password(str(body.get('current', '')), user['password_hash']):
        return err(400, 'wrong_password', 'Текущий пароль указан неверно')
    new = str(body.get('password', ''))
    problem = password_problem(new)
    if problem:
        return err(400, 'weak_password', problem)
    cur.execute(f"UPDATE {t('users')} SET password_hash = %s, updated_at = NOW() WHERE id = %s", (hash_password(new), user['id']))
    cur.execute(
        f"UPDATE {t('sessions')} SET revoked_at = NOW() WHERE user_id = %s AND revoked_at IS NULL AND token_hash <> %s",
        (user['id'], sha(token)),
    )
    return resp(200, {'ok': True})


def require_admin(cur, token):
    user = session_user(cur, token)
    if not user:
        return None, err(401, 'unauthorized', 'Требуется вход')
    if user['role'] != 'admin':
        return None, err(403, 'forbidden', 'Недостаточно прав')
    return user, None


def a_admin_users(cur, _body, token):
    _, denied = require_admin(cur, token)
    if denied:
        return denied
    cur.execute(f"SELECT * FROM {t('users')} ORDER BY created_at DESC LIMIT 500")
    return resp(200, {'ok': True, 'users': [public_user(u) for u in cur.fetchall()]})


def a_admin_set_role(cur, body, token):
    admin, denied = require_admin(cur, token)
    if denied:
        return denied
    role = body.get('role')
    try:
        uid = int(body.get('userId'))
    except (TypeError, ValueError):
        return err(400, 'bad_user', 'Некорректный пользователь')
    if role not in ('user', 'admin'):
        return err(400, 'bad_role', 'Некорректная роль')
    if uid == admin['id'] and role != 'admin':
        return err(400, 'self_demote', 'Нельзя снять роль администратора с самого себя')
    cur.execute(f"UPDATE {t('users')} SET role = %s, updated_at = NOW() WHERE id = %s RETURNING *", (role, uid))
    row = cur.fetchone()
    if not row:
        return err(404, 'not_found', 'Пользователь не найден')
    return resp(200, {'ok': True, 'user': public_user(row)})


def a_admin_delete_user(cur, body, token):
    admin, denied = require_admin(cur, token)
    if denied:
        return denied
    try:
        uid = int(body.get('userId'))
    except (TypeError, ValueError):
        return err(400, 'bad_user', 'Некорректный пользователь')
    if uid == admin['id']:
        return err(400, 'self_delete', 'Нельзя удалить собственный аккаунт')
    cur.execute(f"SELECT id FROM {t('users')} WHERE id = %s", (uid,))
    if not cur.fetchone():
        return err(404, 'not_found', 'Пользователь не найден')
    cur.execute(f"DELETE FROM {t('sessions')} WHERE user_id = %s", (uid,))
    cur.execute(f"DELETE FROM {t('email_tokens')} WHERE user_id = %s", (uid,))
    cur.execute(f"DELETE FROM {t('users')} WHERE id = %s", (uid,))
    return resp(200, {'ok': True})


ACTIONS = {
    'admin_delete_user': a_admin_delete_user,
    'register': a_register,
    'resend': a_resend,
    'verify': a_verify,
    'login': a_login,
    'me': a_me,
    'logout': a_logout,
    'forgot': a_forgot,
    'reset': a_reset,
    'update_profile': a_update_profile,
    'change_password': a_change_password,
    'admin_users': a_admin_users,
    'admin_set_role': a_admin_set_role,
}