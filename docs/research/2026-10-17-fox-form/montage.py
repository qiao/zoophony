"""Puts images side by side with labels. Usage: montage.py <out> <scale> <label=path>..."""
import sys
from PIL import Image, ImageDraw
out, scale = sys.argv[1], float(sys.argv[2])
items = [a.split('=', 1) for a in sys.argv[3:]]
ims = [Image.open(p).convert('RGB') for _, p in items]
ims = [im.resize((int(im.width * scale), int(im.height * scale))) for im in ims]
w = sum(im.width for im in ims); h = max(im.height for im in ims)
canvas = Image.new('RGB', (w, h), (0, 0, 0))
x = 0
d = ImageDraw.Draw(canvas)
for (label, _), im in zip(items, ims):
    canvas.paste(im, (x, 0))
    d.rectangle([x, 0, x + 8 * len(label) + 8, 18], fill=(0, 0, 0))
    d.text((x + 4, 3), label, fill=(255, 255, 255))
    x += im.width
canvas.save(out, quality=80) if out.endswith('.webp') else canvas.save(out)
print(out, canvas.size)
