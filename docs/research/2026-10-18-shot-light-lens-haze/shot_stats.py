import sys

from PIL import Image

# The luma p5/p50/p95/p99.5 of the frames of shots.ts, left of the open drawer
# (docs/research/2026-10-18-shot-light-lens-haze.md, section 2.3). Run from the root:
# uv run --no-project --with pillow python -I docs/research/2026-10-18-shot-light-lens-haze/shot_stats.py <dir>... -- <kind>...

split = sys.argv.index('--')
dirs, kinds = sys.argv[1:split], sys.argv[split + 1:]
for kind in kinds:
    row = []
    for folder in dirs:
        image = Image.open(f'{folder}/{kind}.png').convert('RGB').crop((0, 80, 1080, 820)).resize((540, 370))
        lumas = sorted(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in image.getdata())
        row.append('/'.join(str(round(lumas[int(q * (len(lumas) - 1))])) for q in (0.05, 0.5, 0.95, 0.995)))
    print(kind, ' | '.join(row))
