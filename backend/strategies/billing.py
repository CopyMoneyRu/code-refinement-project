import json
import os
import secrets
import urllib.parse
from datetime import timedelta

import psycopg2
import psycopg2.extras

import robokassa
from access import access_state, add_period, grant_course_for_order, grant_for_order, period_label, upgrade_credit
from core import audit, err, fmt_rub, get_settings, money, notify, now, resp, s, session_user, t, text, to_int
from perms import can, can_any_strategy

PUBLIC_STATUSES = ('active', 'paused')
PENDING_TTL_HOURS = 24
MAX_PENDING_PER_USER = 10


def tariff_out(r):
    return {
        'id': r['id'], 'name': r['name'], 'description': r['description'], 'kind': r['kind'],
        'price': r['price'], 'periodValue': r['period_value'], 'periodUnit': r['period_unit'],
        'periodLabel': period_label(r['period_value'], r['period_unit']),
        'trialDays': r['trial_days'], 'autoRenew': r['auto_renew'], 'isActive': r['is_active'], 'position': r['position'],
    }


def strategy_row(cur, sid=None, slug=None):
    if slug:
        cur.execute(f"SELECT * FROM {t('strategies')} WHERE slug = %s AND removed_at IS NULL", (slug,))
    else:
        cur.execute(f"SELECT * FROM {t('strategies')} WHERE id = %s AND removed_at IS NULL", (sid,))
    return cur.fetchone()


def tariffs_of(cur, sid, only_active=True):
    cur.execute(
        f"""SELECT * FROM {t('strategy_tariffs')} WHERE strategy_id = %s AND archived_at IS NULL
            {'AND is_active' if only_active else ''} ORDER BY position, id""",
        (sid,),
    )
    return cur.fetchall()


def payments_mode(cur, user):
    st = get_settings(cur)
    mode = st['mode']
    if mode == 'test' and st.get('testStaffOnly') is False:
        return st, 'test'
    if mode == 'test':
        return st, 'test'
    if mode == 'off':
        return st, 'off'
    return st, 'robokassa'


def order_out(r, with_user=False):
    o = {
        'id': r['id'], 'productType': r['product_type'], 'title': r['title'], 'purpose': r['purpose'],
        'amount': r['amount'], 'credit': r['credit'], 'refundedAmount': r['refunded_amount'], 'currency': r['currency'],
        'status': r['status'], 'provider': r['provider'], 'isTest': r['is_test'], 'autoRenew': r['auto_renew'],
        'createdAt': r['created_at'], 'paidAt': r['paid_at'], 'failureReason': r['failure_reason'],
        'strategyId': r['strategy_id'], 'tariffId': r['tariff_id'], 'courseId': r['course_id'],
        'strategySlug': r.get('strategy_slug'),
    }
    if with_user:
        o['user'] = {'id': r['user_id'], 'name': r.get('user_name'), 'email': r.get('user_email')}
    return o


ORDER_SELECT = f"""SELECT o.*, u.name AS user_name, u.email AS user_email, st.slug AS strategy_slug
                   FROM {{o}} o JOIN {{u}} u ON u.id = o.user_id LEFT JOIN {{s}} st ON st.id = o.strategy_id"""


def order_select():
    return ORDER_SELECT.format(o=t('orders'), u=t('users'), s=t('strategies'))


def load_order(cur, oid, lock=False):
    cur.execute(f"SELECT * FROM {t('orders')} WHERE id = %s" + (' FOR UPDATE' if lock else ''), (oid,))
    return cur.fetchone()


def expire_stale(cur, user_id=None):
    cond = 'AND user_id = %s' if user_id else ''
    cur.execute(
        f"""UPDATE {t('orders')} SET status = 'expired', closed_at = NOW()
            WHERE status = 'pending' AND created_at < NOW() - INTERVAL '{PENDING_TTL_HOURS} hours' {cond}""",
        (user_id,) if user_id else (),
    )


# ---------- витрина и оформление ----------

def a_offer(cur, body, user):
    st = strategy_row(cur, slug=s(body.get('slug'), 120))
    if not st or st['status'] not in PUBLIC_STATUSES:
        return err(404, 'not_found', 'Стратегия не найдена')
    tariffs = tariffs_of(cur, st['id'])
    state = access_state(cur, user['id'], st['id'])
    settings, mode = payments_mode(cur, user)
    out = []
    for tr in tariffs:
        item = tariff_out(tr)
        item['trialAvailable'] = tr['trial_days'] > 0 and not state['trialUsed'] and not state['everHad']
        if state['active'] and state['source'] in ('payment', 'upgrade') and tr['kind'] != 'free':
            up, why = upgrade_credit(cur, user['id'], st['id'], tr)
            item['upgrade'] = {'credit': up['credit'], 'toPay': money(tr['price']) - up['credit']} if up else None
        out.append(item)
    test_hint = mode == 'test'
    return resp(200, {
        'ok': True, 'strategyId': st['id'], 'status': st['status'], 'tariffs': out, 'access': state,
        'payments': {'mode': mode, 'test': test_hint, 'recurring': bool(settings['robokassa'].get('recurring')) or mode == 'test'},
    })


def a_checkout(cur, body, user):
    st = strategy_row(cur, sid=to_int(body.get('strategyId')))
    if not st or st['status'] not in PUBLIC_STATUSES:
        return err(404, 'not_found', 'Стратегия не найдена')
    if st['status'] == 'paused':
        return err(400, 'paused', 'Набор в стратегию приостановлен. Подключение временно недоступно')
    cur.execute(
        f"SELECT * FROM {t('strategy_tariffs')} WHERE id = %s AND strategy_id = %s AND archived_at IS NULL AND is_active",
        (to_int(body.get('tariffId')), st['id']),
    )
    tariff = cur.fetchone()
    if not tariff:
        return err(404, 'no_tariff', 'Тариф не найден или больше не доступен')
    intent = body.get('intent') if body.get('intent') in ('buy', 'trial', 'upgrade') else 'buy'
    want_auto = bool(body.get('autoRenew')) and tariff['kind'] == 'subscription' and tariff['auto_renew']
    if not body.get('acceptTerms'):
        return err(400, 'terms', 'Подтвердите согласие с условиями участия и офертой')
    expire_stale(cur, user['id'])
    cur.execute(f"SELECT id FROM {t('users')} WHERE id = %s FOR UPDATE", (user['id'],))
    state = access_state(cur, user['id'], st['id'])
    ts = now()

    if intent == 'trial' or tariff['kind'] == 'free':
        if intent == 'trial':
            if tariff['trial_days'] <= 0:
                return err(400, 'no_trial', 'У этого тарифа нет пробного периода')
            if state['trialUsed'] or state['everHad']:
                return err(400, 'trial_used', 'Пробный период доступен только один раз и только при первом подключении')
            end = ts + timedelta(days=tariff['trial_days'])
            cur.execute(
                f"""INSERT INTO {t('strategy_access')} (user_id, strategy_id, tariff_id, source, starts_at, ends_at, note)
                    VALUES (%s, %s, %s, 'trial', %s, %s, 'Пробный период') ON CONFLICT DO NOTHING RETURNING id""",
                (user['id'], st['id'], tariff['id'], ts, end),
            )
            if not cur.fetchone():
                return err(400, 'trial_used', 'Пробный период уже был использован')
            audit(cur, user, 'access.trial', 'strategy', st['id'], {'tariffId': tariff['id'], 'days': tariff['trial_days']})
            notify(cur, user['id'], 'access.trial', 'Пробный период начался', f"{st['title']}: {tariff['trial_days']} дн. до {end.strftime('%d.%m.%Y')}", '/cabinet/strategies', 'success')
            return resp(200, {'ok': True, 'result': 'granted', 'endsAt': end})
        if state['active'] and state['source'] == 'free' and state['tariffId'] == tariff['id']:
            return err(400, 'already', 'Бесплатный доступ уже активен. Продлить его можно после окончания текущего периода')
        cur.execute(
            f"""INSERT INTO {t('orders')} (user_id, product_type, strategy_id, tariff_id, purpose, title, amount, status, provider, paid_at, snapshot)
                VALUES (%s, 'strategy', %s, %s, 'free', %s, 0, 'paid', 'free', NOW(), %s) RETURNING *""",
            (user['id'], st['id'], tariff['id'], f"{st['title']} — {tariff['name']}",
             json.dumps({'periodValue': tariff['period_value'], 'periodUnit': tariff['period_unit'], 'tariff': tariff['name']}, ensure_ascii=False)),
        )
        order = cur.fetchone()
        acc = grant_for_order(cur, order)
        audit(cur, user, 'order.free', 'order', order['id'], {'strategyId': st['id']})
        return resp(200, {'ok': True, 'result': 'granted', 'orderId': order['id'], 'endsAt': acc['ends_at'] if acc else None})

    credit = money(0)
    snap = {'periodValue': tariff['period_value'], 'periodUnit': tariff['period_unit'], 'tariff': tariff['name'], 'price': money(tariff['price'])}
    purpose = 'renewal' if state['active'] or state['everHad'] else 'new'
    if intent == 'upgrade':
        up, why = upgrade_credit(cur, user['id'], st['id'], tariff)
        if not up:
            return err(400, 'no_upgrade', why)
        credit = up['credit']
        snap['fromAccessId'] = up['fromAccessId']
        snap['fromTariff'] = up['fromTariff']
        purpose = 'upgrade'
    amount = money(tariff['price']) - credit
    if amount < money(1):
        amount = money(1)

    settings, mode = payments_mode(cur, user)
    if mode == 'off':
        return err(503, 'payments_off', 'Приём оплат временно отключён. Попробуйте позже или напишите в поддержку')
    if mode == 'robokassa':
        missing = robokassa.ready(settings['robokassa'], is_test=bool(settings.get('robokassaTest')))
        if missing:
            return err(503, 'payments_not_ready', 'Онлайн-оплата ещё не настроена. Попробуйте позже')
    cur.execute(f"SELECT COUNT(*) AS n FROM {t('orders')} WHERE user_id = %s AND status = 'pending'", (user['id'],))
    if cur.fetchone()['n'] >= MAX_PENDING_PER_USER:
        return err(429, 'too_many', 'Слишком много неоплаченных заказов. Оплатите или отмените предыдущие в разделе «История покупок»')
    cur.execute(
        f"""UPDATE {t('orders')} SET status = 'cancelled', closed_at = NOW()
            WHERE user_id = %s AND strategy_id = %s AND status = 'pending'""",
        (user['id'], st['id']),
    )
    is_test = mode == 'test' or bool(settings.get('robokassaTest'))
    provider = 'test' if mode == 'test' else 'robokassa'
    title = f"{st['title']} — {tariff['name']}" + (' (переход с доплатой)' if purpose == 'upgrade' else '')
    cur.execute(
        f"""INSERT INTO {t('orders')} (user_id, product_type, strategy_id, tariff_id, purpose, title, amount, credit, status, provider, is_test, auto_renew, snapshot)
            VALUES (%s, 'strategy', %s, %s, %s, %s, %s, %s, 'pending', %s, %s, %s, %s) RETURNING *""",
        (user['id'], st['id'], tariff['id'], purpose, title, amount, credit, provider, is_test, want_auto,
         json.dumps(snap, ensure_ascii=False, default=str)),
    )
    order = cur.fetchone()
    audit(cur, user, 'order.create', 'order', order['id'], {'amount': amount, 'purpose': purpose, 'provider': provider})
    if provider == 'test':
        return resp(200, {'ok': True, 'result': 'pay', 'orderId': order['id'], 'redirect': f"/pay/{order['id']}"})
    url = robokassa.payment_url(settings['robokassa'], order, user['email'], want_auto)
    return resp(200, {'ok': True, 'result': 'pay', 'orderId': order['id'], 'redirect': url})


def a_order(cur, body, user):
    o = load_order(cur, to_int(body.get('id')))
    if not o or (o['user_id'] != user['id'] and not can(cur, t, user, 'finance.manage')):
        return err(404, 'not_found', 'Заказ не найден')
    if o['status'] == 'pending' and o['created_at'] < now() - timedelta(hours=PENDING_TTL_HOURS):
        expire_stale(cur, o['user_id'])
        o = load_order(cur, o['id'])
    cur.execute(f"SELECT slug, title FROM {t('strategies')} WHERE id = %s", (o['strategy_id'],))
    st = cur.fetchone()
    acc = None
    if o['status'] in ('paid', 'partially_refunded'):
        cur.execute(f"SELECT starts_at, ends_at FROM {t('strategy_access')} WHERE order_id = %s", (o['id'],))
        acc = cur.fetchone()
    out = order_out({**o, 'strategy_slug': st['slug'] if st else None})
    out['strategyTitle'] = st['title'] if st else None
    out['access'] = {'startsAt': acc['starts_at'], 'endsAt': acc['ends_at']} if acc else None
    out['snapshot'] = o['snapshot']
    return resp(200, {'ok': True, 'order': out})


def a_cancel_order(cur, body, user):
    o = load_order(cur, to_int(body.get('id')), lock=True)
    if not o or o['user_id'] != user['id']:
        return err(404, 'not_found', 'Заказ не найден')
    if o['status'] != 'pending':
        return err(400, 'not_pending', 'Отменить можно только неоплаченный заказ')
    cur.execute(f"UPDATE {t('orders')} SET status = 'cancelled', closed_at = NOW() WHERE id = %s", (o['id'],))
    audit(cur, user, 'order.cancel', 'order', o['id'])
    return resp(200, {'ok': True})


# ---------- подтверждение оплаты (единая точка) ----------

def confirm_payment(cur, order_id, provider, external_id, amount, payload, is_test):
    """Идемпотентное подтверждение: повторное уведомление не выдаёт доступ повторно."""
    o = load_order(cur, order_id, lock=True)
    if not o:
        return 'unknown_order', None
    cur.execute(f"SELECT id, order_id, status FROM {t('payments')} WHERE provider = %s AND external_id = %s", (provider, external_id))
    seen = cur.fetchone()
    if seen:
        return 'duplicate', seen['order_id']
    status = 'succeeded'
    note = None
    if o['provider'] != provider:
        status, note = 'rejected', 'Провайдер не совпадает с заказом'
    elif money(amount) != money(o['amount']):
        status, note = 'rejected', f'Сумма {amount} не совпадает с заказом {o["amount"]}'
    elif o['status'] in ('paid', 'refunded', 'partially_refunded'):
        status, note = 'rejected', 'Заказ уже оплачен ранее'
    elif o['is_test'] != bool(is_test):
        status, note = 'rejected', 'Тестовый признак платежа не совпадает с заказом'
    cur.execute(
        f"""INSERT INTO {t('payments')} (order_id, provider, external_id, amount, status, is_test, payload, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (o['id'], provider, external_id, money(amount), status, bool(is_test), json.dumps(payload, ensure_ascii=False, default=str), note),
    )
    if status != 'succeeded':
        if o['status'] in ('paid', 'refunded', 'partially_refunded'):
            return 'already_paid', o['id']
        return 'rejected', o['id']
    cur.execute(
        f"UPDATE {t('orders')} SET status = 'paid', paid_at = NOW(), closed_at = NOW(), failure_reason = NULL WHERE id = %s RETURNING *",
        (o['id'],),
    )
    o = cur.fetchone()
    if o['product_type'] == 'strategy':
        grant_for_order(cur, o)
    elif o['product_type'] == 'course' and o['course_id']:
        grant_course_for_order(cur, o)
    audit(cur, None, 'payment.confirmed', 'order', o['id'], {'provider': provider, 'amount': amount, 'test': bool(is_test)})
    return 'ok', o['id']


def a_test_pay(cur, body, user):
    """Тестовый эквайринг: имитирует уведомление платёжной системы на сервере. Деньги не списываются."""
    settings = get_settings(cur)
    o = load_order(cur, to_int(body.get('id')))
    if not o or o['user_id'] != user['id']:
        return err(404, 'not_found', 'Заказ не найден')
    if o['provider'] != 'test':
        return err(400, 'not_test', 'Этот заказ оплачивается через платёжную систему')
    if settings['mode'] != 'test':
        return err(400, 'test_off', 'Тестовый режим оплаты выключен')
    outcome = body.get('outcome') if body.get('outcome') in ('success', 'fail') else 'success'
    if o['status'] != 'pending':
        if o['status'] == 'paid':
            return resp(200, {'ok': True, 'status': 'paid', 'duplicate': True})
        return err(400, 'not_pending', 'Заказ уже закрыт')
    if outcome == 'fail':
        cur.execute(f"UPDATE {t('orders')} SET status = 'failed', closed_at = NOW(), failure_reason = %s WHERE id = %s",
                    ('Тестовый отказ банка', o['id']))
        cur.execute(
            f"""INSERT INTO {t('payments')} (order_id, provider, external_id, amount, status, is_test, note)
                VALUES (%s, 'test', %s, %s, 'failed', TRUE, 'Тестовый отказ')""",
            (o['id'], f"test-fail-{o['id']}-{secrets.token_hex(4)}", o['amount']),
        )
        return resp(200, {'ok': True, 'status': 'failed'})
    ext = s(body.get('externalId'), 100) or f"test-{o['id']}"
    result, _ = confirm_payment(cur, o['id'], 'test', ext, o['amount'], {'simulated': True, 'by': user['id']}, True)
    return resp(200, {'ok': True, 'status': 'paid', 'result': result, 'duplicate': result == 'duplicate'})


def robokassa_result(cur, event):
    """ResultURL Robokassa: проверка подписи, суммы и идемпотентное подтверждение."""
    raw = event.get('body') or ''
    if event.get('isBase64Encoded'):
        import base64
        raw = base64.b64decode(raw).decode('utf-8', 'replace')
    params = dict(urllib.parse.parse_qsl(raw)) if raw else {}
    params.update(event.get('queryStringParameters') or {})
    inv = to_int(params.get('InvId'))
    if not inv:
        return text(400, 'bad request')
    settings = get_settings(cur)
    o = load_order(cur, inv)
    if not o or o['provider'] != 'robokassa':
        return text(404, 'unknown order')
    if not robokassa.verify_result(settings['robokassa'], params, o['is_test']):
        audit(cur, None, 'payment.bad_signature', 'order', inv, {'ip': (event.get('requestContext') or {}).get('identity', {}).get('sourceIp')})
        return text(403, 'bad sign')
    safe = {k: v for k, v in params.items() if k not in ('SignatureValue',)}
    result, _ = confirm_payment(cur, inv, 'robokassa', f'inv-{inv}', params.get('OutSum'), safe, o['is_test'])
    if result in ('ok', 'duplicate', 'already_paid'):
        return text(200, f'OK{inv}')
    return text(400, 'rejected')


# ---------- кабинет ----------

def a_my_orders(cur, _body, user):
    expire_stale(cur, user['id'])
    cur.execute(f"{order_select()} WHERE o.user_id = %s ORDER BY o.created_at DESC LIMIT 200", (user['id'],))
    return resp(200, {'ok': True, 'orders': [order_out(r) for r in cur.fetchall()]})


def a_my_strategies(cur, _body, user):
    cur.execute(
        f"""SELECT DISTINCT st.id, st.slug, st.title, st.cover_url, st.status, st.kind FROM {t('strategy_access')} a
            JOIN {t('strategies')} st ON st.id = a.strategy_id WHERE a.user_id = %s AND a.revoked_at IS NULL""",
        (user['id'],),
    )
    items = []
    for r in cur.fetchall():
        state = access_state(cur, user['id'], r['id'])
        cur.execute(
            f"""SELECT a.source, a.starts_at, a.ends_at, a.revoked_at, tr.name AS tariff FROM {t('strategy_access')} a
                LEFT JOIN {t('strategy_tariffs')} tr ON tr.id = a.tariff_id
                WHERE a.user_id = %s AND a.strategy_id = %s ORDER BY a.starts_at DESC LIMIT 20""",
            (user['id'], r['id']),
        )
        periods = [{'source': p['source'], 'startsAt': p['starts_at'], 'endsAt': p['ends_at'], 'revoked': p['revoked_at'] is not None, 'tariff': p['tariff']} for p in cur.fetchall()]
        items.append({'id': r['id'], 'slug': r['slug'], 'title': r['title'], 'coverUrl': r['cover_url'], 'status': r['status'],
                      'kind': r['kind'], 'access': state, 'periods': periods})
    items.sort(key=lambda x: (not x['access']['active'], x['title']))
    return resp(200, {'ok': True, 'strategies': items})


def a_set_auto_renew(cur, body, user):
    sid = to_int(body.get('strategyId'))
    on = bool(body.get('enabled'))
    cur.execute(f"SELECT * FROM {t('strategy_subscriptions')} WHERE user_id = %s AND strategy_id = %s FOR UPDATE", (user['id'], sid))
    sub = cur.fetchone()
    if not sub:
        return err(404, 'not_found', 'Подписка не найдена')
    if on and not sub['recurring_order_id']:
        return err(400, 'no_card', 'Автопродление включается при оплате с согласием на сохранение способа оплаты')
    cur.execute(f"UPDATE {t('strategy_subscriptions')} SET auto_renew = %s, updated_at = NOW() WHERE id = %s", (on, sub['id']))
    audit(cur, user, 'subscription.auto_renew', 'strategy', sid, {'enabled': on})
    return resp(200, {'ok': True, 'autoRenew': on})


def a_notifications(cur, body, user):
    if body.get('markRead'):
        cur.execute(f"UPDATE {t('notifications')} SET read_at = NOW() WHERE user_id = %s AND read_at IS NULL", (user['id'],))
    cur.execute(
        f"SELECT id, level, kind, title, body, link, read_at, created_at FROM {t('notifications')} WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
        (user['id'],),
    )
    rows = cur.fetchall()
    return resp(200, {'ok': True, 'items': [dict(r) for r in rows], 'unread': sum(1 for r in rows if not r['read_at'])})


# ---------- тарифы (админ) ----------

def clean_tariff(body):
    name = s(body.get('name'), 120)
    if not name:
        return None, 'Укажите название тарифа'
    kind = body.get('kind')
    if kind not in ('free', 'one_time', 'subscription'):
        return None, 'Выберите тип тарифа'
    try:
        price = money(str(body.get('price') or 0).replace(',', '.'))
    except Exception:
        return None, 'Некорректная цена'
    if kind == 'free':
        price = money(0)
    elif price < 1 or price > 10_000_000:
        return None, 'Цена — от 1 до 10 000 000 ₽'
    pv = to_int(body.get('periodValue'))
    pu = 'day' if body.get('periodUnit') == 'day' else 'month'
    if pu == 'day' and not 1 <= pv <= 730:
        return None, 'Срок — от 1 до 730 дней'
    if pu == 'month' and not 1 <= pv <= 36:
        return None, 'Срок — от 1 до 36 месяцев'
    trial = to_int(body.get('trialDays'))
    if not 0 <= trial <= 90:
        return None, 'Пробный период — от 0 до 90 дней'
    if kind == 'free':
        trial = 0
    return {
        'name': name, 'description': s(body.get('description'), 500), 'kind': kind, 'price': price,
        'period_value': pv, 'period_unit': pu, 'trial_days': trial,
        'auto_renew': bool(body.get('autoRenew')) and kind == 'subscription',
        'is_active': body.get('isActive') is not False, 'position': to_int(body.get('position')),
    }, None


def a_admin_tariffs(cur, body, user):
    sid = to_int(body.get('strategyId'))
    if not (can(cur, t, user, 'strategies.tariffs', sid) or can(cur, t, user, 'strategies.edit', sid)):
        return err(403, 'forbidden', 'Нет права просматривать тарифы этой стратегии')
    return resp(200, {'ok': True, 'tariffs': [tariff_out(r) for r in tariffs_of(cur, sid, only_active=False)],
                      'canEdit': can(cur, t, user, 'strategies.tariffs', sid)})


def a_tariff_save(cur, body, user):
    sid = to_int(body.get('strategyId'))
    if not can(cur, t, user, 'strategies.tariffs', sid):
        return err(403, 'forbidden', 'Нет права управлять тарифами этой стратегии')
    if not strategy_row(cur, sid=sid):
        return err(404, 'not_found', 'Стратегия не найдена')
    data, e = clean_tariff(body)
    if e:
        return err(400, 'invalid', e)
    tid = to_int(body.get('id'))
    if tid:
        cur.execute(f"SELECT * FROM {t('strategy_tariffs')} WHERE id = %s AND strategy_id = %s AND archived_at IS NULL", (tid, sid))
        old = cur.fetchone()
        if not old:
            return err(404, 'not_found', 'Тариф не найден')
        sets = ', '.join(f'{k} = %s' for k in data)
        cur.execute(f"UPDATE {t('strategy_tariffs')} SET {sets}, updated_at = NOW() WHERE id = %s", (*data.values(), tid))
        audit(cur, user, 'tariff.update', 'strategy', sid, {'tariffId': tid, 'name': data['name'], 'price': data['price'], 'oldPrice': old['price']})
    else:
        cols = ', '.join(data)
        cur.execute(
            f"INSERT INTO {t('strategy_tariffs')} (strategy_id, {cols}) VALUES (%s, {', '.join(['%s'] * len(data))}) RETURNING id",
            (sid, *data.values()),
        )
        tid = cur.fetchone()['id']
        audit(cur, user, 'tariff.create', 'strategy', sid, {'tariffId': tid, 'name': data['name'], 'price': data['price']})
    return a_admin_tariffs(cur, {'strategyId': sid}, user)


def a_tariff_archive(cur, body, user):
    sid = to_int(body.get('strategyId'))
    if not can(cur, t, user, 'strategies.tariffs', sid):
        return err(403, 'forbidden', 'Нет права управлять тарифами этой стратегии')
    tid = to_int(body.get('id'))
    cur.execute(
        f"UPDATE {t('strategy_tariffs')} SET archived_at = NOW(), is_active = FALSE WHERE id = %s AND strategy_id = %s AND archived_at IS NULL RETURNING name",
        (tid, sid),
    )
    r = cur.fetchone()
    if not r:
        return err(404, 'not_found', 'Тариф не найден')
    audit(cur, user, 'tariff.archive', 'strategy', sid, {'tariffId': tid, 'name': r['name']})
    return a_admin_tariffs(cur, {'strategyId': sid}, user)


# ---------- доступы (админ) ----------

def a_admin_access(cur, body, user):
    sid = to_int(body.get('strategyId'))
    if not can(cur, t, user, 'strategies.access', sid):
        return err(403, 'forbidden', 'Нет права управлять доступами этой стратегии')
    cur.execute(
        f"""SELECT a.*, u.name, u.email, tr.name AS tariff, g.name AS granted_by_name FROM {t('strategy_access')} a
            JOIN {t('users')} u ON u.id = a.user_id LEFT JOIN {t('strategy_tariffs')} tr ON tr.id = a.tariff_id
            LEFT JOIN {t('users')} g ON g.id = a.granted_by
            WHERE a.strategy_id = %s ORDER BY (a.revoked_at IS NULL AND a.ends_at > NOW()) DESC, a.ends_at DESC LIMIT 500""",
        (sid,),
    )
    rows = [{
        'id': r['id'], 'user': {'id': r['user_id'], 'name': r['name'], 'email': r['email']}, 'source': r['source'],
        'tariff': r['tariff'], 'startsAt': r['starts_at'], 'endsAt': r['ends_at'], 'note': r['note'],
        'revokedAt': r['revoked_at'], 'revokeReason': r['revoke_reason'], 'grantedBy': r['granted_by_name'], 'orderId': r['order_id'],
    } for r in cur.fetchall()]
    return resp(200, {'ok': True, 'items': rows})


def a_access_grant(cur, body, user):
    sid = to_int(body.get('strategyId'))
    if not can(cur, t, user, 'strategies.access', sid):
        return err(403, 'forbidden', 'Нет права выдавать доступ к этой стратегии')
    st = strategy_row(cur, sid=sid)
    if not st:
        return err(404, 'not_found', 'Стратегия не найдена')
    email = s(body.get('email'), 255).lower()
    cur.execute(f"SELECT id, name FROM {t('users')} WHERE LOWER(email) = %s AND archived_at IS NULL", (email,))
    target = cur.fetchone()
    if not target:
        return err(404, 'user_not_found', 'Пользователь с таким email не зарегистрирован')
    days = to_int(body.get('days'))
    if not 1 <= days <= 1095:
        return err(400, 'invalid', 'Срок бесплатного доступа — от 1 до 1095 дней')
    note = s(body.get('note'), 300)
    cur.execute(f"SELECT id FROM {t('users')} WHERE id = %s FOR UPDATE", (target['id'],))
    state = access_state(cur, target['id'], sid)
    start = state['endsAt'] if state['endsAt'] and body.get('afterCurrent') else now()
    end = start + timedelta(days=days)
    cur.execute(
        f"""INSERT INTO {t('strategy_access')} (user_id, strategy_id, source, starts_at, ends_at, granted_by, note)
            VALUES (%s, %s, 'grant', %s, %s, %s, %s) RETURNING id""",
        (target['id'], sid, start, end, user['id'], note or 'Индивидуальный бесплатный доступ'),
    )
    aid = cur.fetchone()['id']
    audit(cur, user, 'access.grant', 'strategy', sid, {'accessId': aid, 'userId': target['id'], 'email': email, 'days': days, 'note': note})
    notify(cur, target['id'], 'access.granted', 'Вам открыт доступ к стратегии', f"{st['title']}: до {end.strftime('%d.%m.%Y')}", '/cabinet/strategies', 'success')
    return resp(200, {'ok': True, 'userName': target['name'], 'endsAt': end})


def a_access_revoke(cur, body, user):
    aid = to_int(body.get('id'))
    cur.execute(f"SELECT * FROM {t('strategy_access')} WHERE id = %s", (aid,))
    a = cur.fetchone()
    if not a:
        return err(404, 'not_found', 'Доступ не найден')
    if not can(cur, t, user, 'strategies.access', a['strategy_id']):
        return err(403, 'forbidden', 'Нет права отзывать доступ к этой стратегии')
    if a['revoked_at']:
        return err(400, 'already', 'Доступ уже отозван')
    reason = s(body.get('reason'), 300)
    if not reason:
        return err(400, 'reason', 'Укажите причину отзыва доступа')
    cur.execute(f"UPDATE {t('strategy_access')} SET revoked_at = NOW(), revoked_by = %s, revoke_reason = %s WHERE id = %s", (user['id'], reason, aid))
    audit(cur, user, 'access.revoke', 'strategy', a['strategy_id'], {'accessId': aid, 'userId': a['user_id'], 'reason': reason})
    notify(cur, a['user_id'], 'access.revoked', 'Доступ к стратегии отозван', reason, '/cabinet/strategies', 'warning')
    return resp(200, {'ok': True})


# ---------- бухгалтерия ----------

def a_finance(cur, body, user):
    if not can(cur, t, user, 'finance.manage'):
        return err(403, 'forbidden', 'Нет права просматривать финансы')
    expire_stale(cur)
    status = body.get('status') if body.get('status') in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded') else None
    product = body.get('product') if body.get('product') in ('strategy', 'course') else None
    include_test = bool(body.get('includeTest'))
    q = s(body.get('q'), 120).lower()
    date_from, date_to = s(body.get('from'), 10), s(body.get('to'), 10)
    cond, params = ['TRUE'], []
    if status:
        cond.append('o.status = %s')
        params.append(status)
    if product:
        cond.append('o.product_type = %s')
        params.append(product)
    if not include_test:
        cond.append('NOT o.is_test')
    if q:
        cond.append("(LOWER(u.email) LIKE %s OR LOWER(u.name) LIKE %s OR LOWER(o.title) LIKE %s OR CAST(o.id AS TEXT) = %s)")
        params += [f'%{q}%', f'%{q}%', f'%{q}%', q]
    if date_from:
        cond.append('o.created_at >= %s::date')
        params.append(date_from)
    if date_to:
        cond.append("o.created_at < %s::date + INTERVAL '1 day'")
        params.append(date_to)
    where = ' AND '.join(cond)
    cur.execute(f"{order_select()} WHERE {where} ORDER BY o.created_at DESC LIMIT 500", tuple(params))
    orders = [order_out(r, with_user=True) for r in cur.fetchall()]
    test_cond = '' if include_test else 'AND NOT o.is_test'
    period_cond, pparams = [], []
    if date_from:
        period_cond.append('o.paid_at >= %s::date')
        pparams.append(date_from)
    if date_to:
        period_cond.append("o.paid_at < %s::date + INTERVAL '1 day'")
        pparams.append(date_to)
    pc = (' AND ' + ' AND '.join(period_cond)) if period_cond else ''
    cur.execute(
        f"""SELECT o.product_type, COUNT(*) AS n, COALESCE(SUM(o.amount), 0) AS gross, COALESCE(SUM(o.refunded_amount), 0) AS refunded
            FROM {t('orders')} o WHERE o.status IN ('paid', 'refunded', 'partially_refunded') AND o.amount > 0 {test_cond} {pc}
            GROUP BY o.product_type""",
        tuple(pparams),
    )
    by = {r['product_type']: r for r in cur.fetchall()}
    summary = {}
    for k in ('strategy', 'course'):
        r = by.get(k)
        gross = money(r['gross']) if r else money(0)
        ref = money(r['refunded']) if r else money(0)
        summary[k] = {'count': r['n'] if r else 0, 'gross': gross, 'refunded': ref, 'net': gross - ref}
    cur.execute(
        f"""SELECT COUNT(*) FILTER (WHERE a.source IN ('payment', 'upgrade')) AS paid, COUNT(*) FILTER (WHERE a.source = 'trial') AS trial,
                   COUNT(*) FILTER (WHERE a.source = 'grant') AS granted, COUNT(*) FILTER (WHERE a.source = 'free') AS free
            FROM {t('strategy_access')} a WHERE a.revoked_at IS NULL AND a.starts_at <= NOW() AND a.ends_at > NOW()""",
    )
    subs = cur.fetchone()
    cur.execute(f"SELECT COUNT(*) AS n FROM {t('strategy_subscriptions')} WHERE auto_renew")
    subs = {**dict(subs), 'autoRenew': cur.fetchone()['n']}
    cur.execute(
        f"""SELECT COUNT(*) AS n FROM {t('strategy_access')} a WHERE a.revoked_at IS NULL AND a.ends_at > NOW()
            AND a.ends_at < NOW() + INTERVAL '7 days' AND a.starts_at <= NOW()
            AND NOT EXISTS (SELECT 1 FROM {t('strategy_access')} b WHERE b.user_id = a.user_id AND b.strategy_id = a.strategy_id
                            AND b.revoked_at IS NULL AND b.starts_at >= a.ends_at)""",
    )
    subs['expiringWeek'] = cur.fetchone()['n']
    cur.execute(
        f"""SELECT r.*, o.title, u.email, c.name AS created_by_name FROM {t('refunds')} r JOIN {t('orders')} o ON o.id = r.order_id
            JOIN {t('users')} u ON u.id = o.user_id LEFT JOIN {t('users')} c ON c.id = r.created_by
            ORDER BY r.created_at DESC LIMIT 100""",
    )
    refunds = [{'id': r['id'], 'orderId': r['order_id'], 'title': r['title'], 'email': r['email'], 'amount': r['amount'],
                'reason': r['reason'], 'accessAction': r['access_action'], 'createdAt': r['created_at'], 'by': r['created_by_name']} for r in cur.fetchall()]
    return resp(200, {'ok': True, 'orders': orders, 'summary': summary, 'subscriptions': subs, 'refunds': refunds})


def a_finance_order(cur, body, user):
    if not can(cur, t, user, 'finance.manage'):
        return err(403, 'forbidden', 'Нет права просматривать финансы')
    oid = to_int(body.get('id'))
    cur.execute(f"{order_select()} WHERE o.id = %s", (oid,))
    o = cur.fetchone()
    if not o:
        return err(404, 'not_found', 'Заказ не найден')
    cur.execute(f"SELECT id, provider, external_id, amount, status, is_test, note, created_at FROM {t('payments')} WHERE order_id = %s ORDER BY id", (oid,))
    pays = [dict(r) for r in cur.fetchall()]
    cur.execute(f"SELECT id, amount, reason, access_action, created_at FROM {t('refunds')} WHERE order_id = %s ORDER BY id", (oid,))
    refs = [dict(r) for r in cur.fetchall()]
    cur.execute(f"SELECT starts_at, ends_at, revoked_at, revoke_reason FROM {t('strategy_access')} WHERE order_id = %s", (oid,))
    acc = cur.fetchone()
    out = order_out(o, with_user=True)
    out['snapshot'] = o['snapshot']
    return resp(200, {'ok': True, 'order': out, 'payments': pays, 'refunds': refs, 'access': dict(acc) if acc else None})


def a_refund(cur, body, user):
    if not can(cur, t, user, 'finance.manage'):
        return err(403, 'forbidden', 'Нет права оформлять возвраты')
    o = load_order(cur, to_int(body.get('orderId')), lock=True)
    if not o:
        return err(404, 'not_found', 'Заказ не найден')
    if o['status'] not in ('paid', 'partially_refunded'):
        return err(400, 'not_paid', 'Возврат возможен только по оплаченному заказу')
    try:
        amount = money(str(body.get('amount') or 0).replace(',', '.'))
    except Exception:
        return err(400, 'invalid', 'Некорректная сумма')
    left = money(o['amount']) - money(o['refunded_amount'])
    if amount <= 0 or amount > left:
        return err(400, 'invalid', f'Сумма возврата — от 0,01 до {fmt_rub(left)}')
    reason = s(body.get('reason'), 500)
    if not reason:
        return err(400, 'reason', 'Укажите причину возврата')
    action = 'revoke' if body.get('revokeAccess') else 'keep'
    if body.get('confirm') != f"refund-{o['id']}":
        return err(400, 'confirm', 'Подтвердите возврат')
    cur.execute(f"SELECT id FROM {t('payments')} WHERE order_id = %s AND status = 'succeeded'", (o['id'],))
    pay = cur.fetchone()
    cur.execute(
        f"""INSERT INTO {t('refunds')} (order_id, payment_id, amount, reason, access_action, created_by)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (o['id'], pay['id'] if pay else None, amount, reason, action, user['id']),
    )
    rid = cur.fetchone()['id']
    total = money(o['refunded_amount']) + amount
    new_status = 'refunded' if total >= money(o['amount']) else 'partially_refunded'
    cur.execute(f"UPDATE {t('orders')} SET refunded_amount = %s, status = %s WHERE id = %s", (total, new_status, o['id']))
    if action == 'revoke':
        cur.execute(
            f"UPDATE {t('strategy_access')} SET revoked_at = NOW(), revoked_by = %s, revoke_reason = %s WHERE order_id = %s AND revoked_at IS NULL",
            (user['id'], f'Возврат: {reason}', o['id']),
        )
        if o['product_type'] == 'course' and o['course_id']:
            cur.execute(f"DELETE FROM {t('course_access')} WHERE user_id = %s AND course_id = %s AND granted_by IS NULL", (o['user_id'], o['course_id']))
    audit(cur, user, 'refund.create', 'order', o['id'], {'refundId': rid, 'amount': amount, 'reason': reason, 'access': action})
    notify(cur, o['user_id'], 'refund', 'Оформлен возврат', f"{o['title']}: {fmt_rub(amount)}", '/cabinet/purchases', 'info')
    return resp(200, {'ok': True, 'status': new_status})


def a_payment_settings(cur, _body, user):
    if not can(cur, t, user, 'settings.global'):
        return err(403, 'forbidden', 'Нет права менять глобальные настройки')
    st = get_settings(cur)
    rk = st['robokassa']
    base = os.environ.get('SITE_URL', '').rstrip('/')
    return resp(200, {
        'ok': True, 'settings': st,
        'robokassa': {
            'missingLive': robokassa.ready(rk, False), 'missingTest': robokassa.ready(rk, True),
            'resultUrl': 'BILLING_URL?action=robokassa_result', 'successUrl': f'{base}/pay/result?status=success' if base else '/pay/result?status=success',
            'failUrl': f'{base}/pay/result?status=fail' if base else '/pay/result?status=fail',
        },
        'canEnableLive': user['role'] == 'superadmin',
    })


def a_save_payment_settings(cur, body, user):
    if not can(cur, t, user, 'settings.global'):
        return err(403, 'forbidden', 'Нет права менять глобальные настройки')
    st = get_settings(cur, lock=True)
    mode = body.get('mode') if body.get('mode') in ('test', 'robokassa', 'off') else st['mode']
    rkin = body.get('robokassa') if isinstance(body.get('robokassa'), dict) else {}
    rk = dict(st['robokassa'])
    rk['login'] = s(rkin.get('login', rk['login']), 60)
    rk['hashAlg'] = rkin.get('hashAlg') if rkin.get('hashAlg') in robokassa.ALGS else rk['hashAlg']
    rk['fiscal'] = bool(rkin.get('fiscal', rk['fiscal']))
    rk['sno'] = rkin.get('sno') if rkin.get('sno') in ('osn', 'usn_income', 'usn_income_outcome', 'esn', 'patent') else rk['sno']
    rk['tax'] = rkin.get('tax') if rkin.get('tax') in ('none', 'vat0', 'vat5', 'vat7', 'vat10', 'vat20', 'vat22') else rk['tax']
    rk['recurring'] = bool(rkin.get('recurring', rk['recurring']))
    robo_test = bool(body.get('robokassaTest', st.get('robokassaTest', True)))
    if mode == 'robokassa':
        if user['role'] != 'superadmin':
            return err(403, 'forbidden', 'Включить приём реальных платежей может только супер администратор')
        if body.get('confirm') != 'ВКЛЮЧИТЬ ОПЛАТУ':
            return err(400, 'confirm', 'Для включения Robokassa введите подтверждение «ВКЛЮЧИТЬ ОПЛАТУ»')
        missing = robokassa.ready(rk, robo_test)
        if missing:
            return err(400, 'not_ready', 'Не хватает настроек Robokassa: ' + ', '.join(missing))
    new = {**st, 'mode': mode, 'robokassa': rk, 'robokassaTest': robo_test}
    cur.execute(
        f"UPDATE {t('platform_settings')} SET value = %s, updated_by = %s, updated_at = NOW() WHERE key = 'payments'",
        (json.dumps(new, ensure_ascii=False), user['id']),
    )
    audit(cur, user, 'settings.payments', 'settings', None, {'from': st['mode'], 'to': mode, 'robokassaTest': robo_test, 'login': rk['login']})
    return a_payment_settings(cur, {}, user)


# ---------- продления (запускается по расписанию) ----------

def run_renewals(cur):
    """Напоминания об окончании и автопродление по сохранённой карте. Вызывается внешним планировщиком."""
    settings = get_settings(cur)
    stats = {'reminders': 0, 'charges': 0, 'expired': 0, 'skipped': 0}
    cur.execute(
        f"""SELECT a.user_id, a.strategy_id, MAX(a.ends_at) AS ends_at, st.title FROM {t('strategy_access')} a
            JOIN {t('strategies')} st ON st.id = a.strategy_id WHERE a.revoked_at IS NULL
            GROUP BY a.user_id, a.strategy_id, st.title
            HAVING MAX(a.ends_at) BETWEEN NOW() - INTERVAL '1 day' AND NOW() + INTERVAL '3 days'""",
    )
    for r in cur.fetchall():
        ends = r['ends_at']
        if ends > now():
            notify(cur, r['user_id'], 'access.expiring', 'Доступ к стратегии скоро закончится',
                   f"{r['title']}: до {ends.strftime('%d.%m.%Y %H:%M')} UTC. Продлите доступ, чтобы не пропустить новые сделки.",
                   '/cabinet/strategies', 'warning', dedupe=f"expiring-{r['strategy_id']}-{ends.date()}")
            stats['reminders'] += 1
        else:
            notify(cur, r['user_id'], 'access.expired', 'Доступ к стратегии закончился',
                   f"{r['title']}: новые сделки больше не копируются. Открытые позиции сопровождаются до закрытия.",
                   '/cabinet/strategies', 'warning', dedupe=f"expired-{r['strategy_id']}-{ends.date()}")
            stats['expired'] += 1
    cur.execute(
        f"""SELECT sub.*, tr.price, tr.auto_renew AS tariff_auto, tr.name AS tariff_name, tr.period_value, tr.period_unit, tr.kind, tr.is_active, tr.archived_at,
                   st.title, st.status AS st_status, po.provider AS parent_provider, po.is_test AS parent_test
            FROM {t('strategy_subscriptions')} sub JOIN {t('strategy_tariffs')} tr ON tr.id = sub.tariff_id
            JOIN {t('strategies')} st ON st.id = sub.strategy_id LEFT JOIN {t('orders')} po ON po.id = sub.recurring_order_id
            WHERE sub.auto_renew AND sub.recurring_order_id IS NOT NULL AND sub.renew_failures < 3
              AND (sub.last_renew_attempt_at IS NULL OR sub.last_renew_attempt_at < NOW() - INTERVAL '20 hours')""",
    )
    for sub in cur.fetchall():
        state = access_state(cur, sub['user_id'], sub['strategy_id'])
        if not state['endsAt'] or state['endsAt'] > now() + timedelta(days=1) or state['queued']:
            continue
        if sub['archived_at'] or not sub['is_active'] or not sub['tariff_auto'] or sub['st_status'] not in PUBLIC_STATUSES or sub['kind'] != 'subscription':
            cur.execute(f"UPDATE {t('strategy_subscriptions')} SET auto_renew = FALSE WHERE id = %s", (sub['id'],))
            notify(cur, sub['user_id'], 'renew.unavailable', 'Автопродление отключено', f"{sub['title']}: тариф больше не доступен для продления.", '/cabinet/strategies', 'warning')
            stats['skipped'] += 1
            continue
        cur.execute(f"UPDATE {t('strategy_subscriptions')} SET last_renew_attempt_at = NOW() WHERE id = %s", (sub['id'],))
        cur.execute(
            f"""SELECT id FROM {t('orders')} WHERE user_id = %s AND strategy_id = %s AND purpose = 'auto_renewal'
                AND status = 'pending' AND created_at > NOW() - INTERVAL '1 day'""",
            (sub['user_id'], sub['strategy_id']),
        )
        if cur.fetchone():
            continue
        provider = sub['parent_provider']
        cur.execute(
            f"""INSERT INTO {t('orders')} (user_id, product_type, strategy_id, tariff_id, purpose, title, amount, status, provider, is_test, auto_renew, parent_order_id, snapshot)
                VALUES (%s, 'strategy', %s, %s, 'auto_renewal', %s, %s, 'pending', %s, %s, TRUE, %s, %s) RETURNING *""",
            (sub['user_id'], sub['strategy_id'], sub['tariff_id'], f"{sub['title']} — {sub['tariff_name']} (автопродление)",
             money(sub['price']), provider, sub['parent_test'], sub['recurring_order_id'],
             json.dumps({'periodValue': sub['period_value'], 'periodUnit': sub['period_unit'], 'tariff': sub['tariff_name']}, ensure_ascii=False)),
        )
        order = cur.fetchone()
        if provider == 'test':
            confirm_payment(cur, order['id'], 'test', f"test-auto-{order['id']}", order['amount'], {'auto': True}, True)
            ok = True
        else:
            ok, msg = robokassa.charge_recurring(settings['robokassa'], order, sub['recurring_order_id'])
            if not ok:
                cur.execute(f"UPDATE {t('orders')} SET status = 'failed', closed_at = NOW(), failure_reason = %s WHERE id = %s", (msg, order['id']))
        if not ok:
            cur.execute(f"UPDATE {t('strategy_subscriptions')} SET renew_failures = renew_failures + 1 WHERE id = %s", (sub['id'],))
            notify(cur, sub['user_id'], 'renew.failed', 'Не удалось продлить подписку', f"{sub['title']}: оплатите продление вручную.", f"/strategies", 'warning')
        stats['charges'] += 1
    return stats


def a_run_renewals(cur, _body, user):
    if not can(cur, t, user, 'finance.manage'):
        return err(403, 'forbidden', 'Нет права запускать продления')
    stats = run_renewals(cur)
    audit(cur, user, 'renewals.run', 'settings', None, stats)
    return resp(200, {'ok': True, 'stats': stats})


PUBLIC = {}
USER = {
    'offer': a_offer, 'checkout': a_checkout, 'order': a_order, 'cancel_order': a_cancel_order, 'test_pay': a_test_pay,
    'my_orders': a_my_orders, 'my_strategies': a_my_strategies, 'set_auto_renew': a_set_auto_renew, 'notifications': a_notifications,
}
STAFF = {
    'admin_tariffs': a_admin_tariffs, 'tariff_save': a_tariff_save, 'tariff_archive': a_tariff_archive,
    'admin_access': a_admin_access, 'access_grant': a_access_grant, 'access_revoke': a_access_revoke,
    'finance': a_finance, 'finance_order': a_finance_order, 'refund': a_refund,
    'payment_settings': a_payment_settings, 'save_payment_settings': a_save_payment_settings, 'run_renewals': a_run_renewals,
}


def handle(event: dict) -> dict:
    """Оплаты: тарифы, заказы, тестовые платежи, Robokassa, подписки, продления, возвраты и доступы к стратегиям."""
    method = event.get('httpMethod')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                                               'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-Cron-Key', 'Access-Control-Max-Age': '86400'}, 'body': ''}
    qs = event.get('queryStringParameters') or {}
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if qs.get('action') == 'robokassa_result':
            r = robokassa_result(cur, event)
            conn.commit()
            return r
        headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
        if qs.get('action') == 'cron_renewals':
            key = os.environ.get('BILLING_CRON_KEY', '')
            if not key or not secrets.compare_digest(headers.get('x-cron-key', ''), key):
                return err(403, 'forbidden', 'Неверный ключ')
            stats = run_renewals(cur)
            conn.commit()
            return resp(200, {'ok': True, 'stats': stats})
        if method != 'POST':
            return err(405, 'method_not_allowed', 'Метод не поддерживается')
        try:
            body = json.loads(event.get('body') or '{}')
        except json.JSONDecodeError:
            return err(400, 'bad_json', 'Некорректный запрос')
        if not isinstance(body, dict):
            return err(400, 'bad_json', 'Некорректный запрос')
        action = body.get('action')
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
