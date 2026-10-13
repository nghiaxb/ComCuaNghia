"""Fail deployment checks when browser assets have download/invalid MIME headers."""
import concurrent.futures
import re
import sys
import urllib.request

base = sys.argv[1].rstrip('/')

def check(path, expected):
    request = urllib.request.Request(base + path, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        actual = response.headers.get('Content-Type', '').split(';')[0].strip()
        assert actual in expected, f'{path}: expected {expected}, got {actual}'
        assert 'attachment' not in response.headers.get('Content-Disposition', '').lower(), f'{path}: attachment'
        body = response.read().decode()
        print(f'{path}: {response.status} {actual}')
        return body

html = check('/order', ['text/html'])
checks = [('/', ['text/html']), ('/menus', ['text/html']), ('/index.html', ['text/html'])]
for path in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html):
    checks.append((path, ['text/css'] if path.endswith('.css') else ['text/javascript', 'application/javascript']))
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    for future in [pool.submit(check, path, types) for path, types in checks]:
        future.result()
