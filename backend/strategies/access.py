"""Доступы к стратегиям: расчёт периодов, выдача по оплате, продление, апгрейд."""
import calendar
from datetime import datetime, timedelta

from core import money, notify, now, t


def add_period(start: datetime, value: int, unit: str) -> datetime:
    if unit == 'day':
        return start + timedelta(days=value)
    m = start.month - 1 + value
    y = start.year + m // 12
    m = m % 12 + 1
    d = min(start.day, calendar.monthrange(y, m)[1])
    return start.replace(year=y, month=m, day=d)


def period_days(value: int, unit: str) -> int:
    return value if unit == 'day' else value * 30


def period_label(value: int, unit: str) -> str:
    if unit == 'day':
        w = 'день' if value % 10 == 1 and value % 100 != 11 else 'дня' if 2 <= value % 10 <= 4 and not 12 <= value % 100 <= 14 else 'дней'
    else:
        w = 'месяц' if value % 10 == 1 and value % 100 != 11 else 'месяца' if 2 <= value % 10 <= 4 and not 12 <= value % 100 <= 14 else 'месяцев'
    return f'{value} {w}'


def active_rows(cur, user_id, strategy_id):
    cur.execute(
        f"""SELECT a.*, o.amount AS order_amount, o.refunded_amount, tr.name AS tariff_name, tr.period_value, tr.period_unit
            FROM {t('strategy_access')} a
            LEFT JOIN {t('orders')} o ON o.id = a.order_id
            LEFT JOIN {t('strategy_tariffs')} tr ON tr.id = a.tariff_id
            WHERE a.user_id = %s AND a.strategy_id = %s AND a.revoked_at IS NULL AND a.ends_at > NOW()
            ORDER BY a.starts_at""",
        (user_id, strategy_id),
    )
    return cur.fetchall()


def access_state(cur, user_id, strategy_id):
    rows = active_rows(cur, user_id, strategy_id)
    ts = now()
    current = next((r for r in rows if r['starts_at'] <= ts), None)
    ends = max((r['ends_at'] for r in rows), default=None)
    cur.execute(
        f"SELECT 1 FROM {t('strategy_access')} WHERE user_id = %s AND strategy_id = %s AND source = 'trial'",
        (user_id, strategy_id),
    )
    trial_used = cur.fetchone() is not None
    cur.execute(
        f"SELECT MAX(ends_at) AS e FROM {t('strategy_access')} WHERE user_id = %s AND strategy_id = %s AND revoked_at IS NULL",
        (user_id, strategy_id),
    )
    last = cur.fetchone()['e']
    cur.execute(f"SELECT * FROM {t('strategy_subscriptions')} WHERE user_id = %s AND strategy_id = %s", (user_id, strategy_id))
    sub = cur.fetchone()
    return {
        'active': current is not None,
        'source': current['source'] if current else None,
        'tariffId': current['tariff_id'] if current else None,
        'tariffName': current['tariff_name'] if current else None,
        'currentEndsAt': current['ends_at'] if current else None,
        'endsAt': ends,
        'lastEndedAt': last if not ends else None,
        'queued': [{'startsAt': r['starts_at'], 'endsAt': r['ends_at'], 'tariffName': r['tariff_name']} for r in rows if r['starts_at'] > ts],
        'trialUsed': trial_used,
        'everHad': last is not None,
        'autoRenew': bool(sub and sub['auto_renew']),
        'autoRenewAvailable': bool(sub and sub['recurring_order_id']),
    }


def upgrade_credit(cur, user_id, strategy_id, target_tariff):
    """Зачёт неиспользованной части текущего оплаченного периода при переходе на более длительный тариф."""
    rows = active_rows(cur, user_id, strategy_id)
    ts = now()
    current = next((r for r in rows if r['starts_at'] <= ts), None)
    if not current or current['source'] not in ('payment', 'upgrade') or not current['order_id']:
        return None, 'Переход с доплатой доступен только с действующего оплаченного тарифа'
    if any(r['starts_at'] > ts for r in rows):
        return None, 'У вас уже оплачен следующий период. Переход станет доступен после его начала'
    cur_days = period_days(current['period_value'] or 1, current['period_unit'] or 'month')
    new_days = period_days(target_tariff['period_value'], target_tariff['period_unit'])
    if new_days <= cur_days:
        return None, 'Переход возможен только на более длительный тариф'
    total = (current['ends_at'] - current['starts_at']).total_seconds()
    left = max(0.0, (current['ends_at'] - ts).total_seconds())
    paid = money(current['order_amount']) - money(current['refunded_amount'])
    from decimal import Decimal
    ratio = Decimal(str(left / total)) if total > 0 else Decimal(0)
    credit = money(paid * ratio)
    credit = min(credit, money(target_tariff['price']))
    return {'credit': credit, 'fromAccessId': current['id'], 'fromTariff': current['tariff_name']}, None


def grant_for_order(cur, order):
    """Выдать доступ по оплаченному заказу. Идемпотентно: один доступ на заказ."""
    cur.execute(f"SELECT id FROM {t('strategy_access')} WHERE order_id = %s", (order['id'],))
    if cur.fetchone():
        return None
    cur.execute(f"SELECT * FROM {t('strategy_tariffs')} WHERE id = %s", (order['tariff_id'],))
    tariff = cur.fetchone()
    snap = order['snapshot'] or {}
    pv = int(snap.get('periodValue') or (tariff and tariff['period_value']) or 1)
    pu = snap.get('periodUnit') or (tariff and tariff['period_unit']) or 'month'
    ts = now()
    source = 'payment'
    if order['purpose'] == 'upgrade':
        source = 'upgrade'
        from_id = snap.get('fromAccessId')
        if from_id:
            cur.execute(
                f"""UPDATE {t('strategy_access')} SET ends_at = GREATEST(starts_at + INTERVAL '1 second', %s), note = TRIM(note || ' Закрыт переходом на другой тариф')
                    WHERE id = %s AND revoked_at IS NULL""",
                (ts, from_id),
            )
        start = ts
    else:
        if order['purpose'] == 'free':
            source = 'free'
        rows = active_rows(cur, order['user_id'], order['strategy_id'])
        start = max([ts] + [r['ends_at'] for r in rows])
    end = add_period(start, pv, pu)
    cur.execute(
        f"""INSERT INTO {t('strategy_access')} (user_id, strategy_id, tariff_id, order_id, source, starts_at, ends_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, starts_at, ends_at""",
        (order['user_id'], order['strategy_id'], order['tariff_id'], order['id'], source, start, end),
    )
    acc = cur.fetchone()
    if order['auto_renew']:
        cur.execute(
            f"""INSERT INTO {t('strategy_subscriptions')} (user_id, strategy_id, tariff_id, auto_renew, recurring_order_id, renew_failures)
                VALUES (%s, %s, %s, TRUE, %s, 0)
                ON CONFLICT (user_id, strategy_id) DO UPDATE SET tariff_id = EXCLUDED.tariff_id, auto_renew = TRUE,
                    recurring_order_id = CASE WHEN %s = 'auto_renewal' THEN {t('strategy_subscriptions')}.recurring_order_id ELSE EXCLUDED.recurring_order_id END,
                    renew_failures = 0, updated_at = NOW()""",
            (order['user_id'], order['strategy_id'], order['tariff_id'], order['id'], order['purpose']),
        )
    notify(
        cur, order['user_id'], 'access.granted', 'Доступ к стратегии открыт',
        f"{order['title']}. Доступ действует до {acc['ends_at'].strftime('%d.%m.%Y')}.",
        f"/cabinet/strategies", 'success', dedupe=f"access-order-{order['id']}",
    )
    return acc


def grant_course_for_order(cur, order):
    cur.execute(
        f"""INSERT INTO {t('course_access')} (user_id, course_id, granted_by) VALUES (%s, %s, NULL)
            ON CONFLICT (user_id, course_id) DO NOTHING""",
        (order['user_id'], order['course_id']),
    )
