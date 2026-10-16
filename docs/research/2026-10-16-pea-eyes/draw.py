import json, sys
from PIL import Image, ImageDraw
animal = sys.argv[1]
d = json.load(open(sys.argv[2]))
S = 300
img = Image.new('RGB', (2 * S * 2 + 20, S * 2), (40, 40, 40))
dr = ImageDraw.Draw(img)
def srgb(c):
    return tuple(int(255 * (12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055)) for x in c)
for k, side in enumerate(['L', 'R']):
    ox = k * (2 * S + 20) + S
    oy = S
    sc = S / 2.3
    for f in sorted(d[side]['faces'], key=lambda f: f['depth']):
        pts = [(ox + p[0] * sc, oy - p[1] * sc) for p in f['pts']]
        dr.polygon(pts, fill=srgb(f['color']), outline=(0, 0, 0))
    for f in d[side]['fan']:
        pts = [(ox + p[0] * sc, oy - p[1] * sc) for p in f]
        dr.polygon(pts, outline=(0, 255, 0))
img.save(sys.argv[3])
