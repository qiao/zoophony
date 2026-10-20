# Like grid.py, with tighter crops at the left eye of the image and a larger factor.
import sys
from PIL import Image, ImageDraw
out, zoom, names = sys.argv[1], sys.argv[2], sys.argv[3:]
rows = [('', 'front', (190, 360)), ('', 'front-60', (370, 360)), ('', 'side', (440, 340)),
        ('-e45', 'front', (170, 510)), ('-e45', 'front-60', (400, 480))]
w, h, k = 200, 170, 2.0
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
