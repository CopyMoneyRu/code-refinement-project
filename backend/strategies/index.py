import base64
import json
import os
import re
import uuid
from decimal import Decimal

import boto3
import psycopg2
import psycopg2.extras

from blocks import clean_blocks
from perms import PER_STRATEGY, PERMS, SUPER_ONLY, can, can_any_strategy

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400',
}

STATUSES = ('draft', 'active', 'paused', 'archived')
PUBLIC_STATUSES = ('active', 'paused')
EXCHANGES = ('binance', 'bybit')
LABEL_COLORS = ('blue', 'navy', 'green', 'amber', 'rose', 'violet', 'gray')
IMAGE_TYPES = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}
MAX_IMAGE = 5 * 1024 * 1024
COPY_DEFAULTS = {
    'marginPercent': 3.0, 'maxLeverage': 10, 'maxRiskPercent': 2.0, 'maxPositions': 5,
    'entryWaitMinutes': 5, 'priceDeviationPercent': 2.0,
}

TRANSLIT = dict(zip(
    'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f',
     'h', 'c', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya'],
))


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'},
            'body': json.dumps(data, ensure_ascii=False, default=jdefault)}


def jdefault(v):
    if isinstance(v, Decimal):
        return float(v)
    return str(v)


def err(status, code, message):
    return resp(status, {'ok': False, 'error': code, 'message': message})


def t(name):
    return f'"{os.environ.get("MAIN_DB_SCHEMA", "public")}".{name}'


def sha(v):
    import hashlib
    return hashlib.sha256(v.encode()).hexdigest()


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


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def to_num(v):
    if v is None or v == '':
        return None
    try:
        x = float(str(v).replace(',', '.'))
    except (TypeError, ValueError):
        return None
    return x if abs(x) < 1e7 else None


def s(v, n):
    return str(v if v is not None else '').strip()[:n]


def slugify(text):
    x = ''.join(TRANSLIT.get(ch, ch) for ch in text.lower())
    x = re.sub(r'[^a-z0-9]+', '-', x).strip('-')
    return x[:80] or 'strategy'


def unique_slug(cur, base, exclude_id=None):
    slug, n = base, 2
    while True:
        cur.execute(f"SELECT id FROM {t('strategies')} WHERE slug = %s AND id <> %s", (slug, exclude_id or 0))
        if not cur.fetchone():
            return slug
        slug = f'{base}-{n}'
        n += 1


def labels_map(cur, ids):
    if not ids:
        return {}
    cur.execute(
        f"""SELECT ll.strategy_id, l.id, l.name, l.color FROM {t('strategy_label_links')} ll
            JOIN {t('strategy_labels')} l ON l.id = ll.label_id
            WHERE ll.strategy_id = ANY(%s) AND l.archived_at IS NULL ORDER BY l.name""",
        (list(ids),),
    )
    out = {}
    for r in cur.fetchall():
        out.setdefault(r['strategy_id'], []).append({'id': r['id'], 'name': r['name'], 'color': r['color']})
    return out


def strategy_out(r, labels, admin=False):
    opts = r['card_options'] or {}
    o = {
        'id': r['id'], 'slug': r['slug'], 'title': r['title'], 'short': r['short'], 'kind': r['kind'],
        'coverUrl': r['cover_url'], 'status': r['status'],
        'category': {'id': r['category_id'], 'name': r['category_name'], 'slug': r['category_slug'], 'icon': r['category_icon']} if r['category_id'] else None,
        'risk': {'level': r['risk_level'], 'style': r['risk_style']},
        'yield': {'mode': r['yield_mode'], 'basis': r['yield_basis'], 'from': r['yield_from'], 'to': r['yield_to'], 'period': r['yield_period']},
        'priceLabel': r['price_label'],
        'exchanges': [x for x in (r['exchanges'] or '').split(',') if x],
        'metrics': r['card_metrics'] or [],
        'cardOptions': {
            'showRisk': opts.get('showRisk', True), 'showYield': opts.get('showYield', True),
            'showPrice': opts.get('showPrice', True), 'showExchanges': opts.get('showExchanges', True),
        },
        'labels': labels.get(r['id'], []),
        'accessNote': r['access_note'],
    }
    if admin:
        o.update({
            'settings': {**COPY_DEFAULTS, **(r['settings'] or {})} if r['kind'] == 'copytrading' else (r['settings'] or {}),
            'sort': r['sort'], 'updatedAt': r['updated_at'], 'createdAt': r['created_at'],
            'contentPublishedAt': r['content_published_at'], 'removedAt': r['removed_at'],
        })
    return o


SELECT = f"""SELECT s.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon
             FROM {{s}} s LEFT JOIN {{c}} c ON c.id = s.category_id"""


def select_sql():
    return SELECT.format(s=t('strategies'), c=t('strategy_categories'))


def fetch_strategies(cur, where, params, admin=False):
    cur.execute(f"{select_sql()} WHERE {where} ORDER BY s.sort, s.id DESC", params)
    rows = cur.fetchall()
    lm = labels_map(cur, [r['id'] for r in rows])
    return [strategy_out(r, lm, admin) for r in rows]


def fetch_one(cur, sid, include_removed=False):
    cond = 's.id = %s' + ('' if include_removed else ' AND s.removed_at IS NULL')
    cur.execute(f"{select_sql()} WHERE {cond}", (sid,))
    return cur.fetchone()


def blocks_of(cur, sid, stage):
    cur.execute(
        f"SELECT type, data FROM {t('strategy_content_blocks')} WHERE strategy_id = %s AND stage = %s ORDER BY position",
        (sid, stage),
    )
    return [{'type': r['type'], 'data': r['data']} for r in cur.fetchall()]


def categories_out(cur):
    cur.execute(f"SELECT id, slug, name, icon FROM {t('strategy_categories')} WHERE archived_at IS NULL ORDER BY sort, name")
    return [dict(r) for r in cur.fetchall()]


def open_trading_items(cur, sid):
    """Открытые позиции, активные ордера и незавершённые закрытия стратегии (таблицы появятся на этапе торговли)."""
    checks = [
        ('exchange_positions', "status IN ('open', 'closing')", 'открытые позиции'),
        ('exchange_orders', "status IN ('new', 'sent', 'partially_filled', 'unknown')", 'активные ордера'),
        ('account_executions', "status IN ('pending', 'sending', 'open', 'closing')", 'незавершённые операции'),
    ]
    found = []
    for table, cond, label in checks:
        cur.execute("SELECT to_regclass(%s) AS r", (f'{os.environ.get("MAIN_DB_SCHEMA", "public")}.{table}',))
        if not cur.fetchone()['r']:
            continue
        cur.execute(f"SELECT COUNT(*) AS n FROM {t(table)} WHERE strategy_id = %s AND {cond}", (sid,))
        n = cur.fetchone()['n']
        if n:
            found.append(f'{label}: {n}')
    return found


def a_catalog(cur, _body, _user):
    items = fetch_strategies(cur, "s.removed_at IS NULL AND s.status IN ('active', 'paused')", ())
    return resp(200, {'ok': True, 'strategies': items, 'categories': categories_out(cur)})


def a_get(cur, body, _user):
    slug = s(body.get('slug'), 120)
    cur.execute(f"{select_sql()} WHERE s.slug = %s AND s.removed_at IS NULL AND s.status IN ('active', 'paused')", (slug,))
    r = cur.fetchone()
    if not r:
        return err(404, 'not_found', 'Стратегия не найдена')
    item = strategy_out(r, labels_map(cur, [r['id']]))
    return resp(200, {'ok': True, 'strategy': item, 'blocks': blocks_of(cur, r['id'], 'published')})


def visible_ids(cur, user):
    if user['role'] == 'superadmin':
        return None
    from perms import load_grants
    if 'strategies' in (user.get('permissions') or '').split(','):
        return None
    grants = user.setdefault('grants', load_grants(cur, t, user['id']))
    if any(sid is None and p.startswith('strategies.') for p, sid in grants):
        return None
    return list({sid for p, sid in grants if sid is not None})


def staff_only(user):
    return user['role'] in ('admin', 'superadmin')


def a_my_grants(cur, _body, user):
    from perms import load_grants
    if user['role'] == 'superadmin':
        return resp(200, {'ok': True, 'superadmin': True, 'grants': []})
    grants = load_grants(cur, t, user['id']) if user['role'] == 'admin' else []
    return resp(200, {'ok': True, 'superadmin': False, 'grants': [{'permission': p, 'strategyId': sid} for p, sid in grants]})


def a_admin_list(cur, _body, user):
    if not staff_only(user):
        return err(403, 'forbidden', 'Недостаточно прав')
    ids = visible_ids(cur, user)
    if ids is None:
        items = fetch_strategies(cur, 's.removed_at IS NULL', (), admin=True)
        removed = fetch_strategies(cur, 's.removed_at IS NOT NULL', (), admin=True)
    else:
        items = fetch_strategies(cur, 's.removed_at IS NULL AND s.id = ANY(%s)', (ids,), admin=True)
        removed = []
    return resp(200, {
        'ok': True, 'strategies': items, 'removed': removed, 'categories': categories_out(cur),
        'labels': labels_out(cur), 'canCreate': can(cur, t, user, 'strategies.create'),
    })


def a_admin_get(cur, body, user):
    sid = to_int(body.get('id'))
    if not can(cur, t, user, 'strategies.edit', sid):
        return err(403, 'forbidden', 'Нет права редактировать эту стратегию')
    r = fetch_one(cur, sid)
    if not r:
        return err(404, 'not_found', 'Стратегия не найдена')
    draft = blocks_of(cur, sid, 'draft')
    published = blocks_of(cur, sid, 'published')
    return resp(200, {
        'ok': True,
        'strategy': strategy_out(r, labels_map(cur, [sid]), admin=True),
        'blocks': draft,
        'hasUnpublished': draft != published,
        'categories': categories_out(cur),
        'labels': labels_out(cur),
        'canPublish': can(cur, t, user, 'strategies.publish', sid),
        'history': history(cur, 'strategy', sid),
    })


def a_preview(cur, body, user):
    sid = to_int(body.get('id'))
    if not can(cur, t, user, 'strategies.edit', sid):
        return err(403, 'forbidden', 'Нет права просматривать черновик этой стратегии')
    r = fetch_one(cur, sid)
    if not r:
        return err(404, 'not_found', 'Стратегия не найдена')
    return resp(200, {'ok': True, 'strategy': strategy_out(r, labels_map(cur, [sid])), 'blocks': blocks_of(cur, sid, 'draft')})


def validate_meta(cur, body):
    title = s(body.get('title'), 200)
    if len(title) < 2:
        return None, 'Укажите название стратегии'
    kind = body.get('kind') if body.get('kind') in ('generic', 'copytrading') else 'generic'
    cat = to_int(body.get('categoryId')) or None
    if cat:
        cur.execute(f"SELECT id FROM {t('strategy_categories')} WHERE id = %s AND archived_at IS NULL", (cat,))
        if not cur.fetchone():
            return None, 'Категория не найдена'
    risk = body.get('risk') if isinstance(body.get('risk'), dict) else {}
    level = to_int(risk.get('level'))
    if not 1 <= level <= 5:
        return None, 'Уровень риска — от 1 до 5'
    style = 'bars' if risk.get('style') == 'bars' else 'stars'
    y = body.get('yield') if isinstance(body.get('yield'), dict) else {}
    mode = y.get('mode') if y.get('mode') in ('none', 'fixed', 'range') else 'none'
    basis = 'actual' if y.get('basis') == 'actual' else 'forecast'
    yf, yt = to_num(y.get('from')), to_num(y.get('to'))
    if mode == 'fixed' and yf is None:
        return None, 'Укажите процент доходности'
    if mode == 'range':
        if yf is None or yt is None:
            return None, 'Укажите диапазон доходности: от и до'
        if yf > yt:
            return None, 'Начало диапазона доходности больше конца'
    if mode != 'range':
        yt = None
    if mode == 'none':
        yf = None
    cover = s(body.get('coverUrl'), 500)
    if cover and not cover.startswith('https://'):
        return None, 'Некорректная ссылка на изображение'
    ex = [x for x in EXCHANGES if x in (body.get('exchanges') or [])]
    if kind == 'copytrading' and not ex:
        return None, 'Для копитрейдинга выберите хотя бы одну биржу'
    metrics = []
    for m in (body.get('metrics') or [])[:8]:
        if isinstance(m, dict):
            lb, v = s(m.get('label'), 60), s(m.get('value'), 40)
            if lb and v:
                metrics.append({'label': lb, 'value': v})
    co = body.get('cardOptions') if isinstance(body.get('cardOptions'), dict) else {}
    opts = {k: co.get(k) is not False for k in ('showRisk', 'showYield', 'showPrice', 'showExchanges')}
    settings = {}
    if kind == 'copytrading':
        raw = body.get('settings') if isinstance(body.get('settings'), dict) else {}
        settings, e = clean_copy_settings(raw)
        if e:
            return None, e
    label_ids = [to_int(x) for x in (body.get('labelIds') or [])[:20] if to_int(x) > 0]
    return {
        'title': title, 'short': s(body.get('short'), 400), 'category_id': cat, 'kind': kind, 'cover_url': cover,
        'risk_level': level, 'risk_style': style, 'yield_mode': mode, 'yield_basis': basis,
        'yield_from': yf, 'yield_to': yt, 'yield_period': s(body.get('yield', {}).get('period') if isinstance(body.get('yield'), dict) else '', 40) or 'в год',
        'price_label': s(body.get('priceLabel'), 120), 'exchanges': ','.join(ex),
        'card_metrics': json.dumps(metrics, ensure_ascii=False), 'card_options': json.dumps(opts),
        'access_note': s(body.get('accessNote'), 4000), 'settings': json.dumps(settings),
        'sort': to_int(body.get('sort')), '_labels': label_ids,
    }, None


def clean_copy_settings(raw):
    out = {}
    rules = {
        'marginPercent': (0.1, 100, 'Процент капитала под маржу — от 0,1 до 100'),
        'maxLeverage': (1, 50, 'Максимальное плечо — от 1 до 50'),
        'maxRiskPercent': (0.1, 100, 'Максимальный риск до стопа — от 0,1 до 100%'),
        'maxPositions': (1, 100, 'Максимум открытых позиций — от 1 до 100'),
        'entryWaitMinutes': (1, 5, 'Ожидание входа — от 1 до 5 минут'),
        'priceDeviationPercent': (0.1, 2, 'Допустимое отклонение цены — от 0,1 до 2%'),
    }
    for k, (lo, hi, msg) in rules.items():
        v = to_num(raw.get(k, COPY_DEFAULTS[k]))
        if v is None or not lo <= v <= hi:
            return None, msg
        out[k] = int(v) if k in ('maxLeverage', 'maxPositions', 'entryWaitMinutes') else round(v, 2)
    return out, None


def set_labels(cur, sid, ids):
    cur.execute(f"DELETE FROM {t('strategy_label_links')} WHERE strategy_id = %s", (sid,))
    if ids:
        cur.execute(f"SELECT id FROM {t('strategy_labels')} WHERE id = ANY(%s) AND archived_at IS NULL", (ids,))
        for r in cur.fetchall():
            cur.execute(f"INSERT INTO {t('strategy_label_links')} (strategy_id, label_id) VALUES (%s, %s)", (sid, r['id']))


def a_save(cur, body, user):
    sid = to_int(body.get('id')) or None
    if sid:
        if not can(cur, t, user, 'strategies.edit', sid):
            return err(403, 'forbidden', 'Нет права редактировать эту стратегию')
        old = fetch_one(cur, sid)
        if not old:
            return err(404, 'not_found', 'Стратегия не найдена')
    elif not can(cur, t, user, 'strategies.create'):
        return err(403, 'forbidden', 'Нет права создавать стратегии')
    data, e = validate_meta(cur, body)
    if e:
        return err(400, 'invalid', e)
    labels = data.pop('_labels')
    cols = list(data.keys())
    if sid:
        if old['kind'] != data['kind'] and open_trading_items(cur, sid):
            return err(400, 'busy', 'Нельзя менять тип стратегии, пока есть открытые позиции')
        sets = ', '.join(f'{c} = %s' for c in cols)
        cur.execute(
            f"UPDATE {t('strategies')} SET {sets}, updated_by = %s, updated_at = NOW() WHERE id = %s",
            (*data.values(), user['id'], sid),
        )
        changed = [c for c in cols if str(old.get(c)) != str(data[c]) and c not in ('card_metrics', 'card_options', 'settings')]
        audit(cur, user, 'strategy.update', 'strategy', sid, {'fields': changed})
    else:
        slug = unique_slug(cur, slugify(data['title']))
        cur.execute(
            f"""INSERT INTO {t('strategies')} (slug, {', '.join(cols)}, created_by, updated_by)
                VALUES (%s, {', '.join(['%s'] * len(cols))}, %s, %s) RETURNING id""",
            (slug, *data.values(), user['id'], user['id']),
        )
        sid = cur.fetchone()['id']
        audit(cur, user, 'strategy.create', 'strategy', sid, {'title': data['title']})
    set_labels(cur, sid, labels)
    return resp(200, {'ok': True, 'strategy': strategy_out(fetch_one(cur, sid), labels_map(cur, [sid]), admin=True), 'created': not body.get('id')})


def write_blocks(cur, sid, stage, blocks):
    cur.execute(f"DELETE FROM {t('strategy_content_blocks')} WHERE strategy_id = %s AND stage = %s", (sid, stage))
    for i, b in enumerate(blocks):
        cur.execute(
            f"INSERT INTO {t('strategy_content_blocks')} (strategy_id, stage, position, type, data) VALUES (%s, %s, %s, %s, %s)",
            (sid, stage, i, b['type'], json.dumps(b['data'], ensure_ascii=False)),
        )


def a_save_blocks(cur, body, user):
    sid = to_int(body.get('id'))
    if not can(cur, t, user, 'strategies.edit', sid):
        return err(403, 'forbidden', 'Нет права редактировать эту стратегию')
    if not fetch_one(cur, sid):
        return err(404, 'not_found', 'Стратегия не найдена')
    blocks, e = clean_blocks(body.get('blocks'))
    if e:
        return err(400, 'invalid', e)
    write_blocks(cur, sid, 'draft', blocks)
    cur.execute(f"UPDATE {t('strategies')} SET updated_at = NOW(), updated_by = %s WHERE id = %s", (user['id'], sid))
    published = blocks_of(cur, sid, 'published')
    return resp(200, {'ok': True, 'blocks': blocks, 'hasUnpublished': blocks != published})


def a_publish_content(cur, body, user):
    sid = to_int(body.get('id'))
    if not can(cur, t, user, 'strategies.publish', sid):
        return err(403, 'forbidden', 'Нет права публиковать эту стратегию')
    if not fetch_one(cur, sid):
        return err(404, 'not_found', 'Стратегия не найдена')
    draft = blocks_of(cur, sid, 'draft')
    write_blocks(cur, sid, 'published', draft)
    cur.execute(f"UPDATE {t('strategies')} SET content_published_at = NOW(), updated_at = NOW() WHERE id = %s", (sid,))
    audit(cur, user, 'strategy.publish_content', 'strategy', sid, {'blocks': len(draft)})
    return resp(200, {'ok': True, 'hasUnpublished': False})


def a_set_status(cur, body, user):
    sid = to_int(body.get('id'))
    status = body.get('status')
    if status not in STATUSES:
        return err(400, 'bad_status', 'Некорректный статус')
    if not can(cur, t, user, 'strategies.publish', sid):
        return err(403, 'forbidden', 'Нет права менять статус этой стратегии')
    r = fetch_one(cur, sid)
    if not r:
        return err(404, 'not_found', 'Стратегия не найдена')
    if status == 'archived':
        busy = open_trading_items(cur, sid)
        if busy:
            return err(400, 'busy', 'Нельзя архивировать стратегию: ' + ', '.join(busy) + '. Дождитесь закрытия всех позиций.')
    if status == 'active':
        cur.execute(f"SELECT COUNT(*) AS n FROM {t('strategy_content_blocks')} WHERE strategy_id = %s AND stage = 'published'", (sid,))
        if not cur.fetchone()['n']:
            return err(400, 'no_content', 'Перед активацией опубликуйте содержимое страницы стратегии')
    cur.execute(f"UPDATE {t('strategies')} SET status = %s, updated_at = NOW(), updated_by = %s WHERE id = %s", (status, user['id'], sid))
    audit(cur, user, 'strategy.status', 'strategy', sid, {'from': r['status'], 'to': status})
    return resp(200, {'ok': True, 'strategy': strategy_out(fetch_one(cur, sid), labels_map(cur, [sid]), admin=True)})


def a_remove(cur, body, user):
    sid = to_int(body.get('id'))
    if not can(cur, t, user, 'strategies.create') or not can(cur, t, user, 'strategies.edit', sid):
        return err(403, 'forbidden', 'Нет права удалять стратегии')
    r = fetch_one(cur, sid)
    if not r:
        return err(404, 'not_found', 'Стратегия не найдена')
    busy = open_trading_items(cur, sid)
    if busy:
        return err(400, 'busy', 'Нельзя удалить стратегию: ' + ', '.join(busy))
    if r['status'] in PUBLIC_STATUSES:
        return err(400, 'active', 'Сначала переведите стратегию в черновик или архив')
    cur.execute(f"UPDATE {t('strategies')} SET removed_at = NOW(), updated_by = %s WHERE id = %s", (user['id'], sid))
    audit(cur, user, 'strategy.remove', 'strategy', sid, {'title': r['title']})
    return resp(200, {'ok': True, 'title': r['title']})


def a_restore(cur, body, user):
    sid = to_int(body.get('id'))
    if not can(cur, t, user, 'strategies.create'):
        return err(403, 'forbidden', 'Нет права восстанавливать стратегии')
    r = fetch_one(cur, sid, include_removed=True)
    if not r or not r['removed_at']:
        return err(404, 'not_found', 'Стратегия не найдена в удалённых')
    cur.execute(f"UPDATE {t('strategies')} SET removed_at = NULL, status = 'draft', updated_by = %s WHERE id = %s", (user['id'], sid))
    audit(cur, user, 'strategy.restore', 'strategy', sid, {'title': r['title']})
    return resp(200, {'ok': True, 'title': r['title']})


def labels_out(cur):
    cur.execute(
        f"""SELECT l.id, l.name, l.color, COUNT(ll.strategy_id) AS used FROM {t('strategy_labels')} l
            LEFT JOIN {t('strategy_label_links')} ll ON ll.label_id = l.id
            WHERE l.archived_at IS NULL GROUP BY l.id ORDER BY l.name""",
    )
    return [dict(r) for r in cur.fetchall()]


def a_label_save(cur, body, user):
    if not can_any_strategy(cur, t, user, 'strategies.edit'):
        return err(403, 'forbidden', 'Нет права управлять метками')
    name = s(body.get('name'), 40)
    if not name:
        return err(400, 'invalid', 'Укажите название метки')
    color = body.get('color') if body.get('color') in LABEL_COLORS else 'blue'
    lid = to_int(body.get('id'))
    cur.execute(f"SELECT id FROM {t('strategy_labels')} WHERE LOWER(name) = LOWER(%s) AND archived_at IS NULL AND id <> %s", (name, lid))
    if cur.fetchone():
        return err(400, 'duplicate', 'Метка с таким названием уже есть')
    if lid:
        cur.execute(f"UPDATE {t('strategy_labels')} SET name = %s, color = %s WHERE id = %s AND archived_at IS NULL RETURNING id", (name, color, lid))
        if not cur.fetchone():
            return err(404, 'not_found', 'Метка не найдена')
    else:
        cur.execute(f"INSERT INTO {t('strategy_labels')} (name, color) VALUES (%s, %s) RETURNING id", (name, color))
        lid = cur.fetchone()['id']
    audit(cur, user, 'label.save', 'strategy_label', lid, {'name': name, 'color': color})
    return resp(200, {'ok': True, 'labels': labels_out(cur)})


def a_label_archive(cur, body, user):
    if not can_any_strategy(cur, t, user, 'strategies.edit'):
        return err(403, 'forbidden', 'Нет права управлять метками')
    lid = to_int(body.get('id'))
    cur.execute(f"UPDATE {t('strategy_labels')} SET archived_at = NOW() WHERE id = %s AND archived_at IS NULL RETURNING name", (lid,))
    r = cur.fetchone()
    if not r:
        return err(404, 'not_found', 'Метка не найдена')
    audit(cur, user, 'label.archive', 'strategy_label', lid, {'name': r['name']})
    return resp(200, {'ok': True, 'labels': labels_out(cur)})


def a_upload_image(cur, body, user):
    if not can_any_strategy(cur, t, user, 'strategies.edit') and not can(cur, t, user, 'strategies.create'):
        return err(403, 'forbidden', 'Нет права загружать файлы')
    ext = IMAGE_TYPES.get(str(body.get('contentType', '')))
    if not ext:
        return err(400, 'bad_type', 'Поддерживаются изображения JPG, PNG и WEBP')
    try:
        data = base64.b64decode(str(body.get('data', '')), validate=True)
    except (ValueError, TypeError):
        return err(400, 'bad_file', 'Не удалось прочитать файл')
    if not data:
        return err(400, 'bad_file', 'Файл пустой')
    if len(data) > MAX_IMAGE:
        return err(400, 'too_large', 'Изображение должно быть не больше 5 МБ')
    sig = {'jpg': (b'\xff\xd8',), 'png': (b'\x89PNG',), 'webp': (b'RIFF',)}[ext]
    if not data.startswith(sig):
        return err(400, 'bad_file', 'Файл не похож на изображение выбранного формата')
    key = f'strategies/images/{uuid.uuid4().hex}.{ext}'
    client = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                          aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    client.put_object(Bucket='files', Key=key, Body=data, ContentType=f'image/{"jpeg" if ext == "jpg" else ext}')
    return resp(200, {'ok': True, 'url': f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"})


def history(cur, entity, eid):
    cur.execute(
        f"""SELECT a.action, a.details, a.created_at, u.name AS actor FROM {t('audit_log')} a
            LEFT JOIN {t('users')} u ON u.id = a.actor_id WHERE a.entity = %s AND a.entity_id = %s
            ORDER BY a.created_at DESC LIMIT 50""",
        (entity, eid),
    )
    return [{'action': r['action'], 'details': r['details'], 'at': r['created_at'], 'actor': r['actor']} for r in cur.fetchall()]


def can_manage_staff(cur, user):
    return can(cur, t, user, 'staff.manage')


def a_staff_list(cur, _body, user):
    if not can_manage_staff(cur, user):
        return err(403, 'forbidden', 'Нет права управлять сотрудниками')
    cur.execute(
        f"""SELECT id, name, email, role FROM {t('users')} WHERE archived_at IS NULL AND role IN ('admin', 'superadmin')
            ORDER BY role DESC, name""",
    )
    staff = [dict(r) for r in cur.fetchall()]
    cur.execute(
        f"""SELECT p.id, p.user_id, p.permission, p.strategy_id, p.created_at, g.name AS granted_by
            FROM {t('staff_permissions')} p LEFT JOIN {t('users')} g ON g.id = p.granted_by
            WHERE p.revoked_at IS NULL ORDER BY p.created_at""",
    )
    grants = [{'id': r['id'], 'userId': r['user_id'], 'permission': r['permission'], 'strategyId': r['strategy_id'],
               'createdAt': r['created_at'], 'grantedBy': r['granted_by']} for r in cur.fetchall()]
    cur.execute(f"SELECT id, title FROM {t('strategies')} WHERE removed_at IS NULL ORDER BY title")
    strategies = [dict(r) for r in cur.fetchall()]
    cur.execute(
        f"""SELECT a.action, a.details, a.created_at, u.name AS actor FROM {t('audit_log')} a
            LEFT JOIN {t('users')} u ON u.id = a.actor_id WHERE a.entity = 'staff_permission'
            ORDER BY a.created_at DESC LIMIT 40""",
    )
    log = [{'action': r['action'], 'details': r['details'], 'at': r['created_at'], 'actor': r['actor']} for r in cur.fetchall()]
    perms = [{'id': k, 'label': v, 'perStrategy': k in PER_STRATEGY, 'superOnly': k in SUPER_ONLY} for k, v in PERMS.items()]
    return resp(200, {'ok': True, 'staff': staff, 'grants': grants, 'strategies': strategies, 'permissions': perms, 'log': log})


def a_staff_grant(cur, body, user):
    if not can_manage_staff(cur, user):
        return err(403, 'forbidden', 'Нет права управлять сотрудниками')
    uid = to_int(body.get('userId'))
    perm = body.get('permission')
    if perm not in PERMS:
        return err(400, 'bad_perm', 'Неизвестное разрешение')
    if perm in SUPER_ONLY:
        return err(400, 'super_only', 'Это действие доступно только супер администратору и не выдаётся сотрудникам')
    if perm == 'staff.manage' and user['role'] != 'superadmin':
        return err(403, 'forbidden', 'Право управлять сотрудниками выдаёт только супер администратор')
    sid = to_int(body.get('strategyId')) or None
    if sid and perm not in PER_STRATEGY:
        return err(400, 'bad_scope', 'Это разрешение выдаётся только на всю платформу')
    cur.execute(f"SELECT id, name, role FROM {t('users')} WHERE id = %s AND archived_at IS NULL", (uid,))
    target = cur.fetchone()
    if not target or target['role'] != 'admin':
        return err(400, 'not_staff', 'Сначала назначьте пользователю роль администратора в разделе «Пользователи»')
    if sid:
        cur.execute(f"SELECT title FROM {t('strategies')} WHERE id = %s AND removed_at IS NULL", (sid,))
        st = cur.fetchone()
        if not st:
            return err(404, 'not_found', 'Стратегия не найдена')
    cur.execute(
        f"""SELECT id FROM {t('staff_permissions')} WHERE user_id = %s AND permission = %s AND COALESCE(strategy_id, 0) = %s
            AND revoked_at IS NULL""",
        (uid, perm, sid or 0),
    )
    if cur.fetchone():
        return err(400, 'exists', 'Такое разрешение уже выдано')
    cur.execute(
        f"INSERT INTO {t('staff_permissions')} (user_id, permission, strategy_id, granted_by) VALUES (%s, %s, %s, %s) RETURNING id",
        (uid, perm, sid, user['id']),
    )
    gid = cur.fetchone()['id']
    audit(cur, user, 'permission.grant', 'staff_permission', gid,
          {'user': target['name'], 'userId': uid, 'permission': perm, 'strategyId': sid})
    return a_staff_list(cur, {}, user)


def a_staff_revoke(cur, body, user):
    if not can_manage_staff(cur, user):
        return err(403, 'forbidden', 'Нет права управлять сотрудниками')
    gid = to_int(body.get('id'))
    cur.execute(
        f"""UPDATE {t('staff_permissions')} p SET revoked_at = NOW(), revoked_by = %s FROM {t('users')} u
            WHERE p.id = %s AND p.revoked_at IS NULL AND u.id = p.user_id RETURNING p.user_id, p.permission, p.strategy_id, u.name""",
        (user['id'], gid),
    )
    r = cur.fetchone()
    if not r:
        return err(404, 'not_found', 'Разрешение не найдено')
    if r['permission'] == 'staff.manage' and user['role'] != 'superadmin':
        cur.execute(f"UPDATE {t('staff_permissions')} SET revoked_at = NULL, revoked_by = NULL WHERE id = %s", (gid,))
        return err(403, 'forbidden', 'Право управлять сотрудниками отзывает только супер администратор')
    audit(cur, user, 'permission.revoke', 'staff_permission', gid,
          {'user': r['name'], 'userId': r['user_id'], 'permission': r['permission'], 'strategyId': r['strategy_id']})
    return a_staff_list(cur, {}, user)


PUBLIC = {'catalog': a_catalog}
USER = {'get': a_get, 'my_grants': a_my_grants}
STAFF = {
    'admin_list': a_admin_list, 'admin_get': a_admin_get, 'preview': a_preview, 'save': a_save,
    'save_blocks': a_save_blocks, 'publish_content': a_publish_content, 'set_status': a_set_status,
    'remove': a_remove, 'restore': a_restore, 'label_save': a_label_save, 'label_archive': a_label_archive,
    'upload_image': a_upload_image, 'staff_list': a_staff_list, 'staff_grant': a_staff_grant, 'staff_revoke': a_staff_revoke,
}


def handler(event: dict, context) -> dict:
    """JETRA Strategies: каталог стратегий, страницы, редактор содержимого, статусы, метки и разрешения сотрудников."""
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
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if action in PUBLIC:
            r = PUBLIC[action](cur, body, None)
            conn.commit()
            return r
        if action not in USER and action not in STAFF:
            return err(400, 'unknown_action', 'Неизвестное действие')
        user = session_user(cur, headers.get('x-session-token'))
        if not user:
            return err(401, 'unauthorized', 'Требуется вход')
        if action in STAFF and user['role'] not in ('admin', 'superadmin'):
            return err(403, 'forbidden', 'Недостаточно прав')
        r = (USER.get(action) or STAFF[action])(cur, body, user)
        if r['statusCode'] < 400:
            conn.commit()
        else:
            conn.rollback()
        return r
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()