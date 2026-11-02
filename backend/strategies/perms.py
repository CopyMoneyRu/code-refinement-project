PERMS = {
    'strategies.create': 'Создание стратегий',
    'strategies.edit': 'Редактирование стратегий',
    'strategies.publish': 'Публикация и статусы',
    'strategies.tariffs': 'Управление тарифами',
    'strategies.access': 'Управление доступами',
    'trades.create': 'Создание сделок',
    'trades.edit': 'Изменение сделок',
    'trades.close': 'Закрытие позиций',
    'risk.override': 'Превышение риска',
    'analytics.view': 'Просмотр аналитики',
    'finance.manage': 'Управление финансами',
    'users.manage': 'Управление пользователями',
    'staff.manage': 'Управление сотрудниками',
    'settings.global': 'Глобальные настройки',
    'emergency.close': 'Аварийное закрытие',
    'trading.live': 'Включение реальной торговли',
}

PER_STRATEGY = {
    'strategies.edit', 'strategies.publish', 'strategies.tariffs', 'strategies.access',
    'trades.create', 'trades.edit', 'trades.close', 'risk.override', 'analytics.view',
}

SUPER_ONLY = {'emergency.close', 'trading.live'}

LEGACY = {'strategies.create', 'strategies.edit', 'strategies.publish'}


def load_grants(cur, t, user_id: int):
    cur.execute(
        f"SELECT permission, strategy_id FROM {t('staff_permissions')} WHERE user_id = %s AND revoked_at IS NULL",
        (user_id,),
    )
    return [(r['permission'], r['strategy_id']) for r in cur.fetchall()]


def can(cur, t, user, perm: str, strategy_id=None) -> bool:
    if not user:
        return False
    if user['role'] == 'superadmin':
        return True
    if user['role'] != 'admin' or perm in SUPER_ONLY:
        return False
    if perm in LEGACY and 'strategies' in (user.get('permissions') or '').split(','):
        return True
    if 'grants' not in user:
        user['grants'] = load_grants(cur, t, user['id'])
    for p, sid in user['grants']:
        if p != perm:
            continue
        if sid is None or (strategy_id is not None and sid == strategy_id):
            return True
    return False


def can_any_strategy(cur, t, user, perm: str) -> bool:
    if not user:
        return False
    if user['role'] == 'superadmin':
        return True
    if user['role'] != 'admin':
        return False
    if perm in LEGACY and 'strategies' in (user.get('permissions') or '').split(','):
        return True
    if 'grants' not in user:
        user['grants'] = load_grants(cur, t, user['id'])
    return any(p == perm for p, _ in user['grants'])