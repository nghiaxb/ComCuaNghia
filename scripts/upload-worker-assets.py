"""Prepare/upload Cloudflare static assets with MIME metadata preserved.

Usage: --manifest DIST; --upload DIST ACCOUNT SESSION_JSON COMPLETION_JSON.
The session is obtained through the authenticated Cloudflare connector.
"""
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import re
import sys
import urllib.request

def assets(directory):
    root = Path(directory)
    html = (root / 'index.html').read_text()
    paths = ['/index.html'] + re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html)
    result = {}
    for path in paths:
        file = root / path.lstrip('/')
        content = file.read_bytes()
        mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'}.get(file.suffix)
        mime = mime or mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        # Include MIME in the asset identity: old uploads may have wrong metadata.
        digest = hashlib.md5(content + b'\0' + mime.encode()).hexdigest()
        result[path] = {'hash': digest, 'size': len(content), 'mime': mime, 'file': file}
    return result

if __name__ == '__main__':
    mode, directory = sys.argv[1:3]
    manifest = assets(directory)
    if mode == '--manifest':
        print(json.dumps({path: {'hash': info['hash'], 'size': info['size']} for path, info in manifest.items()}))
    elif mode == '--upload':
        account, session_path, completion_path = sys.argv[3:6]
        os.chmod(session_path, 0o600)
        session = json.loads(Path(session_path).read_text())
        token = session['jwt'] if not session['buckets'] else None
        by_hash = {info['hash']: info for info in manifest.values()}
        for bucket in session['buckets']:
            boundary = 'com-worker-assets-boundary'
            chunks = []
            for digest in bucket:
                info = by_hash[digest]
                header = f'--{boundary}\r\nContent-Disposition: form-data; name="{digest}"; filename="{info["file"].name}"\r\nContent-Type: {info["mime"]}\r\n\r\n'
                chunks.extend([header.encode(), base64.b64encode(info['file'].read_bytes()), b'\r\n'])
            chunks.append(f'--{boundary}--\r\n'.encode())
            request = urllib.request.Request(
                f'https://api.cloudflare.com/client/v4/accounts/{account}/workers/assets/upload?base64=true',
                data=b''.join(chunks), method='POST',
                headers={'Authorization': 'Bearer ' + session['jwt'], 'Content-Type': 'multipart/form-data; boundary=' + boundary},
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                result = json.load(response)
            if not result['success']:
                raise RuntimeError('Asset upload failed')
            token = result.get('result', {}).get('jwt') or token
            print('Asset bucket uploaded:', len(bucket))
        if not token:
            raise RuntimeError('Missing asset completion token')
        descriptor = os.open(completion_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, 'w') as file:
            json.dump({'jwt': token}, file)
    else:
        raise ValueError('Use --manifest or --upload')
