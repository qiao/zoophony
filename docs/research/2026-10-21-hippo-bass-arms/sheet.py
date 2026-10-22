# Builds a sheet of 2x crop pairs (base | round) for the four directions of close-views play:
# the rows are front, back, left, and right, in the order of the cameras of cams.ts.
# Usage: python sheet.py <dir> <log> <out.webp> <title>
import re, sys
from PIL import Image, ImageDraw
d, log, out, title = sys.argv[1:5]
names = []
for line in open(log):
    m = re.search(r'/(play-pose-[0-9a-f]+)\.png:', line)
    if m and m[1] not in names:
        names.append(m[1])
rows = []
for name, label in zip(names, ['front', 'back', 'left', 'right']):
    pair = []
    for prefix in ('play-base-', 'play-'):
        im = Image.open(f'{d}/{prefix}{name[5:]}.png').convert('RGB')
        w, h = im.size
        im = im.crop((w // 4, h // 4, w * 3 // 4, h * 3 // 4))
        pair.append(im)
    rows.append((label, pair))
w, h = rows[0][1][0].size
sheet = Image.new('RGB', (2 * w + 8, len(rows) * (h + 28)), (20, 20, 24))
draw = ImageDraw.Draw(sheet)
for i, (label, (base, new)) in enumerate(rows):
    y = i * (h + 28)
    draw.text((6, y + 6), f'{title}, {label}: base f5209e90 (left) | round (right)', fill=(240, 240, 240))
    sheet.paste(base, (0, y + 28))
    sheet.paste(new, (w + 8, y + 28))
sheet.save(out, quality=82)
print(out, sheet.size)
