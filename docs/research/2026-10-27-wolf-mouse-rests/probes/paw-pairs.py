# Writes one image for each view: the paw box of each moment, the base frame above the round frame.
# The frames come from pnpm close-views <role> <dir> --base main --moments rest,lift40,lower60
# --views front,back,left,right --scale 2 (720 x 900).
# Usage: uv run --no-project --with pillow python -I docs/research/2026-10-27-wolf-mouse-rests/probes/paw-pairs.py <role> <frames dir> <out dir>
import sys
from pathlib import Path
from PIL import Image, ImageDraw
role, src, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
BOXES = {
    'clarinetist': {
        'front': (0.30, 0.45, 0.70, 0.80),
        'back': (0.25, 0.40, 0.75, 0.75),
        'left': (0.08, 0.40, 0.53, 0.78),
        'right': (0.47, 0.40, 0.92, 0.78),
    },
    'oboist': {
        'front': (0.25, 0.25, 0.75, 0.70),
        'back': (0.25, 0.25, 0.75, 0.70),
        'left': (0.10, 0.25, 0.55, 0.70),
        'right': (0.45, 0.25, 0.90, 0.70),
    },
}[role]
MOMENTS = ['rest', 'lift40', 'lower60']
for view, (x0, y0, x1, y1) in BOXES.items():
    cells = []
    for row, prefix in (('main', f'{role}-base'), ('round', role)):
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
    sheet.save(out / f'{role}-paws-{view}.webp', quality=85)
    sheet.save(out / f'{role}-paws-{view}.png')
    print(view, sheet.size)
