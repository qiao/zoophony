# Joins the stage frames of close-views play: main above the round, az -30 and az 30.
# Usage: uv run --no-project --with pillow python -I docs/research/2026-10-27-wolf-bind/probes/stage-pair.py <dir> <out.webp>
import sys
from pathlib import Path
from PIL import Image, ImageDraw
src, out = Path(sys.argv[1]), sys.argv[2]
cells = []
for row, prefix in (('main', 'play-base-at-wolf'), ('round', 'play-at-wolf')):
    for az in ('az-30', 'az30'):
        im = Image.open(src / f'{prefix}-{az}.png').convert('RGB')
        ImageDraw.Draw(im).text((8, 8), f'{row}, {az}', fill=(255, 255, 0))
        cells.append(im)
w, h = cells[0].size
sheet = Image.new('RGB', (w * 2, h * 2))
for k, c in enumerate(cells):
    sheet.paste(c, ((k % 2) * w, (k // 2) * h))
sheet.save(out, quality=85)
print(sheet.size)
