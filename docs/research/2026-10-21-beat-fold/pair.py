# Builds a sheet of frame pairs (base | round): 4 pairs in each row, with the song time of each pair.
import sys, glob, os
from PIL import Image, ImageDraw
base, rnd, view, out, start, step = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5]), float(sys.argv[6])
crop = tuple(int(v) for v in sys.argv[7].split(',')) if len(sys.argv) > 7 else None
def load(d):
    ims = []
    for f in sorted(glob.glob(os.path.join(d, f'{view}-*.png'))):
        im = Image.open(f).convert('RGB')
        if crop: im = im.crop(crop)
        ims.append(im)
    return ims
a, b = load(base), load(rnd)
w = 240; h = round(a[0].height * w / a[0].width)
cols = 4; rows = (len(a) + cols - 1) // cols
cell = 2 * w + 12
sheet = Image.new('RGB', (cols * cell, rows * (h + 18)), 'white')
d = ImageDraw.Draw(sheet)
for i, (x1, x2) in enumerate(zip(a, b)):
    x, y = (i % cols) * cell, (i // cols) * (h + 18)
    sheet.paste(x1.resize((w, h), Image.LANCZOS), (x, y + 18))
    sheet.paste(x2.resize((w, h), Image.LANCZOS), (x + w + 2, y + 18))
    d.text((x + 4, y + 3), f'{start + i * step:.2f} s   base 4cbcf30c | round', fill='black')
sheet.save(out, quality=72)
