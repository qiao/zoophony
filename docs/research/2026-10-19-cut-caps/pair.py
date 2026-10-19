"""pair.py <out.png> <label>=<png> ... [--crop x,y,w,h] [--cols n] [--zoom k]: cells side by side."""
import sys
from PIL import Image, ImageDraw
args = sys.argv[2:]
crop, cols, zoom, items, i = None, None, 2, [], 0
while i < len(args):
    if args[i] in ('--crop', '--cols', '--zoom'):
        v = args[i + 1]
        if args[i] == '--crop':
            crop = [float(x) for x in v.split(',')]
        elif args[i] == '--cols':
            cols = int(v)
        else:
            zoom = float(v)
        i += 2
        continue
    label, path = args[i].split('=', 1)
    items.append((label, path))
    i += 1
cells = []
for label, path in items:
    im = Image.open(path).convert('RGB')
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int((crop[0] + crop[2]) * w), int((crop[1] + crop[3]) * h)))
    im = im.resize((int(im.width * zoom), int(im.height * zoom)), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 7 * len(label) + 10, 16), fill=(0, 0, 0))
    d.text((5, 2), label, fill=(255, 255, 255))
    cells.append(im)
cols = cols or len(cells)
rows = (len(cells) + cols - 1) // cols
w = max(c.width for c in cells)
h = max(c.height for c in cells)
out = Image.new('RGB', (w * cols, h * rows), (0, 0, 0))
for k, c in enumerate(cells):
    out.paste(c, ((k % cols) * w, (k // cols) * h))
out.save(sys.argv[1])
print(sys.argv[1], out.size)
