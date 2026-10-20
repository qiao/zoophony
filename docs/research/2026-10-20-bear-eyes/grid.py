# Makes a grid: one column for each variant, rows: front, front-60, side (elevation 10), and
# front, front-60 (elevation 45), of the rest moment, each cropped at the eyes.
# Usage: grid.py <out> <zoom> <name>...
import sys
from PIL import Image, ImageDraw
out, zoom, names = sys.argv[1], sys.argv[2], sys.argv[3:]
rows = [('', 'front', (170, 330)), ('', 'front-60', (300, 330)), ('', 'side', (350, 310)),
        ('-e45', 'front', (170, 480)), ('-e45', 'front-60', (330, 460))]
w, h, k = 380, 230, 1.5
W, H = int(w * k), int(h * k)
pad = 4
g = Image.new('RGB', (len(names) * (W + pad), len(rows) * (H + pad) + 24), 'white')
d = ImageDraw.Draw(g)
for c, name in enumerate(names):
    d.text((c * (W + pad) + 4, 6), name, fill='black')
    for r, (suffix, view, (x, y)) in enumerate(rows):
        im = Image.open(f'scratch/cv/{name}-z{zoom}{suffix}/conductor-head-rest-{view}.png').convert('RGB')
        g.paste(im.crop((x, y, x + w, y + h)).resize((W, H), Image.LANCZOS), (c * (W + pad), 24 + r * (H + pad)))
g.save(out)
