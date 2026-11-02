"""Адаптер Robokassa: ссылка на оплату, проверка ResultURL, повторные (рекуррентные) списания."""
import hashlib
import hmac
import json
import os
import urllib.parse
import urllib.request

PAY_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx'
RECURRING_URL = 'https://auth.robokassa.ru/Merchant/Recurring'
ALGS = {'md5': hashlib.md5, 'sha1': hashlib.sha1, 'sha256': hashlib.sha256, 'sha384': hashlib.sha384, 'sha512': hashlib.sha512}


def passwords(is_test: bool):
    if is_test:
        return os.environ.get('ROBOKASSA_TEST_PASSWORD1', ''), os.environ.get('ROBOKASSA_TEST_PASSWORD2', '')
    return os.environ.get('ROBOKASSA_PASSWORD1', ''), os.environ.get('ROBOKASSA_PASSWORD2', '')


def ready(cfg: dict, is_test: bool):
    p1, p2 = passwords(is_test)
    missing = []
    if not cfg.get('login'):
        missing.append('идентификатор магазина')
    if not p1:
        missing.append('ROBOKASSA_TEST_PASSWORD1' if is_test else 'ROBOKASSA_PASSWORD1')
    if not p2:
        missing.append('ROBOKASSA_TEST_PASSWORD2' if is_test else 'ROBOKASSA_PASSWORD2')
    return missing


def sign(alg: str, parts):
    fn = ALGS.get(alg, hashlib.md5)
    return fn(':'.join(str(p) for p in parts).encode('utf-8')).hexdigest()


def out_sum(amount) -> str:
    return f'{float(amount):.2f}'


def receipt_json(cfg: dict, title: str, amount) -> str:
    item = {
        'name': title[:128], 'quantity': 1, 'sum': float(amount),
        'payment_method': 'full_payment', 'payment_object': 'service', 'tax': cfg.get('tax') or 'none',
    }
    return json.dumps({'sno': cfg.get('sno') or 'usn_income', 'items': [item]}, ensure_ascii=False, separators=(',', ':'))


def payment_url(cfg: dict, order: dict, email: str, recurring: bool) -> str:
    p1, _ = passwords(order['is_test'])
    login = cfg['login']
    amount = out_sum(order['amount'])
    inv = str(order['id'])
    params = {
        'MerchantLogin': login, 'OutSum': amount, 'InvId': inv,
        'Description': order['title'][:100], 'Culture': 'ru', 'Encoding': 'utf-8',
    }
    parts = [login, amount, inv]
    if cfg.get('fiscal'):
        rc = receipt_json(cfg, order['title'], order['amount'])
        params['Receipt'] = urllib.parse.quote(rc, safe='')
        parts.append(params['Receipt'])
    parts.append(p1)
    params['SignatureValue'] = sign(cfg.get('hashAlg'), parts)
    if email:
        params['Email'] = email
    if recurring:
        params['Recurring'] = 'true'
    if order['is_test']:
        params['IsTest'] = '1'
    return PAY_URL + '?' + urllib.parse.urlencode(params)


def verify_result(cfg: dict, params: dict, is_test: bool) -> bool:
    _, p2 = passwords(is_test)
    if not p2:
        return False
    got = str(params.get('SignatureValue', '')).lower()
    shp = sorted((k, v) for k, v in params.items() if k.lower().startswith('shp_'))
    parts = [params.get('OutSum', ''), params.get('InvId', ''), p2] + [f'{k}={v}' for k, v in shp]
    expected = sign(cfg.get('hashAlg'), parts).lower()
    return bool(got) and hmac.compare_digest(got, expected)


def charge_recurring(cfg: dict, order: dict, parent_id: int):
    """Повторное списание по сохранённой карте. Подтверждение придёт отдельно на ResultURL."""
    p1, _ = passwords(order['is_test'])
    amount = out_sum(order['amount'])
    inv = str(order['id'])
    data = {
        'MerchantLogin': cfg['login'], 'InvoiceID': inv, 'PreviousInvoiceID': str(parent_id),
        'Description': order['title'][:100], 'OutSum': amount,
        'SignatureValue': sign(cfg.get('hashAlg'), [cfg['login'], amount, inv, p1]),
    }
    if order['is_test']:
        data['IsTest'] = '1'
    req = urllib.request.Request(RECURRING_URL, data=urllib.parse.urlencode(data).encode(), method='POST')
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            body = r.read().decode('utf-8', 'replace').strip()
    except Exception as e:
        return False, f'Robokassa недоступна: {type(e).__name__}'
    return body.upper().startswith('OK'), body[:200]
