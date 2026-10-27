import json, sys
from PIL import Image, ImageDraw
data = json.load(open(sys.argv[1]))
out = sys.argv[2]
joints = json.loads(sys.argv[3])
x0, x1, y0, y1 = -0.02, 0.28, 0.33, 0.73
keys = list(data)
zs = list(next(iter(data.values()))['sections'])
W = 480
H = int(W * (y1 - y0) / (x1 - x0))
panels = []
colors = [(30, 30, 200), (220, 30, 30)]
for z in zs:
    img = Image.new('RGB', (W, H + 16), 'white')
    d = ImageDraw.Draw(img)
    d.text((5, 2), f'frontal section z {z} u (blue: cat.glb, red: cat-arms.glb, green: joints)', fill=(0, 0, 0))
    def px(x, y):
        return (x - x0) / (x1 - x0) * W, 16 + (y1 - y) / (y1 - y0) * H
    for gx in (0, 0.05, 0.1, 0.15, 0.2, 0.25):
        d.line([px(gx, y0), px(gx, y1)], fill=(225, 225, 225))
        d.text(px(gx, y0 + 0.01), f'{gx}', fill=(150, 150, 150))
    for gy in (0.4, 0.5, 0.6, 0.7):
        d.line([px(x0, gy), px(x1, gy)], fill=(225, 225, 225))
        d.text(px(x0 + 0.003, gy), f'{gy}', fill=(150, 150, 150))
    for k, key in enumerate(keys):
        for (a, b) in data[key]['sections'][z]:
            d.line([px(*a), px(*b)], fill=colors[k], width=3 if k == 0 else 1)
    pts = [px(j[0], j[1]) for j in joints]
    d.line(pts, fill=(0, 160, 0), width=2)
    for p in pts:
        d.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], outline=(0, 160, 0), width=2)
    panels.append(img)
outimg = Image.new('RGB', (W * len(panels), H + 16), 'white')
for i, p in enumerate(panels):
    outimg.paste(p, (i * W, 0))
outimg.save(out)
