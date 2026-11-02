UPDATE sessions SET revoked_at = NOW() WHERE token_hash = '517e01962726708d7130c150a8a455073c078070664a8f9d42242c996478e6a9';
UPDATE users SET role = 'user', permissions = '' WHERE id = 1 AND email = 'jetra-test-1df79403@maxxspace.com';
UPDATE strategies SET status = 'archived', removed_at = NOW() WHERE slug IN ('qa-test-strategy', 'qa-upgrade');
UPDATE strategy_subscriptions SET auto_renew = FALSE WHERE user_id = 1;
UPDATE orders SET is_test = TRUE WHERE user_id = 1;