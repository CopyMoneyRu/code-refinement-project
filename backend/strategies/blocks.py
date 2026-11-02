import re

TYPES = ('heading', 'text', 'image', 'video', 'pdf', 'list', 'table', 'stats', 'chart', 'faq', 'documents', 'callout')
MAX_BLOCKS = 120


def s(v, n):
    return str(v if v is not None else '').strip()[:n]


def url(v):
    u = s(v, 1000)
    return u if re.match(r'^https://[^\s<>"\']+$', u) else ''


def num(v):
    try:
        x = float(str(v).replace(',', '.'))
    except (TypeError, ValueError):
        return None
    return x if abs(x) < 1e12 else None


def arr(v, n):
    return v[:n] if isinstance(v, list) else []


def obj(v):
    return v if isinstance(v, dict) else {}


def clean_block(raw):
    b = obj(raw)
    tp = b.get('type')
    d = obj(b.get('data'))
    if tp not in TYPES:
        return None, 'Неизвестный тип блока'
    if tp == 'heading':
        out = {'text': s(d.get('text'), 200), 'level': 3 if d.get('level') == 3 else 2}
        if not out['text']:
            return None, 'Заполните текст заголовка'
    elif tp == 'text':
        out = {'text': s(d.get('text'), 20000)}
        if not out['text']:
            return None, 'Текстовый блок пустой'
    elif tp == 'callout':
        tone = d.get('tone') if d.get('tone') in ('info', 'warning', 'success') else 'info'
        out = {'title': s(d.get('title'), 200), 'text': s(d.get('text'), 4000), 'tone': tone}
        if not out['text'] and not out['title']:
            return None, 'Заполните выделенный блок'
    elif tp == 'image':
        out = {'url': url(d.get('url')), 'caption': s(d.get('caption'), 300), 'wide': bool(d.get('wide'))}
        if not out['url']:
            return None, 'Загрузите изображение'
    elif tp == 'video':
        kind = 'file' if d.get('kind') == 'file' else 'link'
        out = {'kind': kind, 'url': url(d.get('url')), 'title': s(d.get('title'), 200)}
        if not out['url']:
            return None, 'Укажите ссылку на видео или загрузите файл'
    elif tp == 'pdf':
        out = {'url': url(d.get('url')), 'title': s(d.get('title'), 200), 'embed': d.get('embed') is not False}
        if not out['url']:
            return None, 'Загрузите PDF-файл'
    elif tp == 'list':
        items = [s(x, 500) for x in arr(d.get('items'), 60)]
        out = {'items': [x for x in items if x], 'ordered': bool(d.get('ordered')), 'title': s(d.get('title'), 200)}
        if not out['items']:
            return None, 'Список пустой'
    elif tp == 'table':
        headers = [s(x, 120) for x in arr(d.get('headers'), 10)]
        cols = len(headers)
        rows = []
        for r in arr(d.get('rows'), 100):
            cells = [s(x, 300) for x in arr(r, cols)]
            cells += [''] * (cols - len(cells))
            if any(cells):
                rows.append(cells)
        out = {'title': s(d.get('title'), 200), 'headers': headers, 'rows': rows}
        if not cols or not rows:
            return None, 'Таблица должна содержать столбцы и хотя бы одну строку'
    elif tp == 'stats':
        items = []
        for it in arr(d.get('items'), 12):
            it = obj(it)
            v, lb = s(it.get('value'), 40), s(it.get('label'), 120)
            if v or lb:
                items.append({'value': v, 'label': lb, 'hint': s(it.get('hint'), 200)})
        out = {'title': s(d.get('title'), 200), 'items': items}
        if not items:
            return None, 'Добавьте хотя бы один показатель'
    elif tp == 'chart':
        kind = d.get('kind') if d.get('kind') in ('line', 'bar', 'area') else 'line'
        pts = []
        for p in arr(d.get('points'), 400):
            p = obj(p)
            v = num(p.get('value'))
            if v is not None:
                pts.append({'label': s(p.get('label'), 40), 'value': v})
        out = {'title': s(d.get('title'), 200), 'kind': kind, 'suffix': s(d.get('suffix'), 10), 'points': pts, 'note': s(d.get('note'), 300)}
        if len(pts) < 2:
            return None, 'Для графика нужно минимум две точки'
    elif tp == 'faq':
        items = []
        for it in arr(d.get('items'), 50):
            it = obj(it)
            q, a = s(it.get('q'), 300), s(it.get('a'), 4000)
            if q and a:
                items.append({'q': q, 'a': a})
        out = {'title': s(d.get('title'), 200), 'items': items}
        if not items:
            return None, 'Добавьте хотя бы один вопрос с ответом'
    else:
        items = []
        for it in arr(d.get('items'), 30):
            it = obj(it)
            u, ti = url(it.get('url')), s(it.get('title'), 200)
            if u and ti:
                items.append({'title': ti, 'url': u, 'note': s(it.get('note'), 200)})
        out = {'title': s(d.get('title'), 200) or 'Документы', 'items': items}
        if not items:
            return None, 'Добавьте хотя бы один документ'
    return {'type': tp, 'data': out}, None


def clean_blocks(raw):
    if not isinstance(raw, list):
        return None, 'Некорректное содержимое'
    if len(raw) > MAX_BLOCKS:
        return None, f'Не больше {MAX_BLOCKS} блоков на странице'
    out = []
    for i, b in enumerate(raw):
        cb, e = clean_block(b)
        if e:
            return None, f'Блок {i + 1}: {e}'
        out.append(cb)
    return out, None
