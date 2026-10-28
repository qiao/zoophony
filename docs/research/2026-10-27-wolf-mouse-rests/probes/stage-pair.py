# Joins the stage frames of close-views play --at <animal>: main above the round, az -30 and az 30.
# Usage: uv run --no-project --with pillow python -I docs/research/2026-10-27-wolf-mouse-rests/probes/stage-pair.py <dir> <animal> <out.webp>
import sys
from pathlib import Path
from PIL import Image, ImageDraw
src, animal, out = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
cells = []
for row, prefix in (('main', f'play-base-at-{animal}'), ('round', f'play-at-{animal}')):
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
