import sys, subprocess, os
from PIL import Image, ImageDraw
name, az, half = sys.argv[1], sys.argv[2], sys.argv[3]
rows = []
for tree in ['base', 'round']:
    out = f'docs/research/2026-10-21-wrist-lift/{name}-{tree}.png'
    subprocess.run([sys.executable, '-I', 'docs/research/2026-10-21-wrist-lift/render.py', f'docs/research/2026-10-21-wrist-lift/dumps/{name}-{tree}.json', os.environ.get('SIDE', 'R'), az, half, out], check=True, env={**os.environ, 'FRONT': '0'}, stdout=subprocess.DEVNULL)
    im = Image.open(out).convert('RGB'); ImageDraw.Draw(im).text((6, 22), '39aa09c9' if tree == 'base' else 'round', fill=(120, 255, 120)); rows.append(im)
S = Image.new('RGB', (rows[0].width, rows[0].height * 2))
S.paste(rows[0], (0, 0)); S.paste(rows[1], (0, rows[0].height))
S.save(f'docs/research/2026-10-21-wrist-lift/{name}-pair.png'); print(name, S.size)
