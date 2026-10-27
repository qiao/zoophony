# Writes one image for each view: the paw box of each moment, the base frame above the round frame.
# The frames come from pnpm close-views clarinetist <dir> --base main --scale 3 (1080 x 1350).
# Usage: uv run --no-project --with pillow python -I docs/research/2026-10-27-wolf-bind/probes/paw-pairs.py <frames dir> <out dir>
import sys
from pathlib import Path
from PIL import Image, ImageDraw
src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
BOXES = {
    'front': (0.34, 0.36, 0.66, 0.78),
    'back': (0.30, 0.36, 0.70, 0.78),
    'left': (0.08, 0.33, 0.48, 0.78),
    'right': (0.52, 0.33, 0.92, 0.78),
    'az-35': (0.22, 0.36, 0.58, 0.80),
    'az35': (0.42, 0.36, 0.78, 0.80),
}
MOMENTS = ['note', 'between', 'lift40', 'rest', 'lower60']
for view, (x0, y0, x1, y1) in BOXES.items():
    cells = []
    for row, prefix in (('main', 'clarinetist-base'), ('round', 'clarinetist')):
        for m in MOMENTS:
            im = Image.open(src / f'{prefix}-{m}-{view}.png').convert('RGB')
            w, h = im.size
            c = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
            ImageDraw.Draw(c).text((6, 6), f'{row}: {m}, {view}', fill=(255, 255, 0))
            cells.append(c)
    cw, ch = cells[0].size
    sheet = Image.new('RGB', (cw * len(MOMENTS), ch * 2))
    for k, c in enumerate(cells):
        sheet.paste(c, ((k % len(MOMENTS)) * cw, (k // len(MOMENTS)) * ch))
    sheet.save(out / f'paws-{view}.webp', quality=82)
    print(view, sheet.size)
