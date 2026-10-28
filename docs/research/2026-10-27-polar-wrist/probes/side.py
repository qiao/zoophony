import sys
from PIL import Image, ImageDraw
# Usage: side.py <out> <x> <y> <w> <h> <factor> <label:file>...  Crops each file to the box, scales it, and puts them side by side.
out = sys.argv[1]
x, y, w, h, f = (int(v) for v in sys.argv[2:7])
items = [a.split(':', 1) for a in sys.argv[7:]]
g = Image.new('RGB', (w * f * len(items), h * f + 16), (0, 0, 0))
d = ImageDraw.Draw(g)
for k, (label, path) in enumerate(items):
    im = Image.open(path).convert('RGB').crop((x, y, x + w, y + h)).resize((w * f, h * f), Image.LANCZOS)
    g.paste(im, (k * w * f, 16))
    d.text((k * w * f + 4, 2), label, fill=(255, 255, 255))
g.save(out)
