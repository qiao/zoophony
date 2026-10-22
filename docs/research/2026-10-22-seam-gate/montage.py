import sys, os
from PIL import Image
src, out, roles = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
W, H = 648 * 3, 495
rows = []
for role in roles:
    for e in ('e20', 'e40'):
        f = os.path.join(src, f'{role}-{e}.png')
        if not os.path.exists(f):
            continue
        im = Image.open(f)
        n = im.height // H
        pick = sorted(set([0, n - 1])) if e == 'e40' else list(range(n))
        for r in pick:
            rows.append(im.crop((0, r * H, W, (r + 1) * H)))
sheet = Image.new('RGB', (W, H * len(rows)))
for i, r in enumerate(rows):
    sheet.paste(r, (0, i * H))
sheet.save(out)
print(out, sheet.size)
