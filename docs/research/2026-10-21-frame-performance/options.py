# Writes one image for each option of the report 2026-10-21-frame-performance.md, section 6:
# the frozen frame of the tip (left) beside the frozen frame of the option (right). The top row
# shows the section shot of perf-60.mid at a third of its size, and the lower rows show crops at
# full size: a part of the section shot and a part of the conductor shot with the depth of field.
# Run: uv run --no-project --with pillow python -I
#   docs/research/2026-10-21-frame-performance/options.py <tip dir> <out dir> <name>=<dir>=<label>...
# Each <dir> holds the PNG files of frozen.ts. The label goes above the image of the option.
import sys

from PIL import Image, ImageDraw

base, out = sys.argv[1], sys.argv[2]
# The crops at full size, in device pixels of the 2880 x 1800 frames: the bows and the stands of
# the section shot, and the heads of the back rows of the conductor shot.
CROPS = [('perf-section', (1200, 400, 2160, 1000)), ('conductor', (960, 300, 1920, 900))]
GAP = 8
HEAD = 40

for spec in sys.argv[3:]:
    name, folder, label = spec.split('=', 2)
    rows = []
    a = Image.open(f'{base}/perf-section.png').convert('RGB')
    b = Image.open(f'{folder}/perf-section.png').convert('RGB')
    size = (a.width // 3, a.height // 3)
    rows.append((a.resize(size, Image.LANCZOS), b.resize(size, Image.LANCZOS)))
    for shot, box in CROPS:
        a = Image.open(f'{base}/{shot}.png').convert('RGB').crop(box)
        b = Image.open(f'{folder}/{shot}.png').convert('RGB').crop(box)
        rows.append((a, b))
    width = max(left.width for left, _ in rows) * 2 + GAP
    height = HEAD + sum(left.height + GAP for left, _ in rows)
    sheet = Image.new('RGB', (width, height), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    half = (width - GAP) // 2
    draw.text((8, 12), 'tip (same pixels as main)', fill=(230, 230, 230))
    draw.text((half + GAP + 8, 12), label, fill=(230, 230, 230))
    y = HEAD
    for left, right in rows:
        sheet.paste(left, (0, y))
        sheet.paste(right, (half + GAP, y))
        y += left.height + GAP
    sheet.save(f'{out}/{name}.webp', quality=70)
    print(f'{out}/{name}.webp')
