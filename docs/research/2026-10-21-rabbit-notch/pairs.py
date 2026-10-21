"""Puts crops of two folders of close views side by side: main left, round right.
Usage: pairs.py <main dir> <round dir> <out> <x0,y0,x1,y1> <scale> <name>..."""
import sys
from PIL import Image, ImageDraw
a, b, out, box, s = sys.argv[1], sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4].split(',')], float(sys.argv[5])
names = sys.argv[6:]
w, h = int((box[2] - box[0]) * s), int((box[3] - box[1]) * s)
o = Image.new('RGB', (w * 4, h * ((len(names) + 1) // 2)), 'white')
for i, n in enumerate(names):
    for k, d in enumerate((a, b)):
        im = Image.open(f'{d}/{n}').convert('RGB').crop(box).resize((w, h), Image.LANCZOS)
        ImageDraw.Draw(im).text((4, 4), ('main ' if k == 0 else 'round ') + n.replace('.png', ''), fill=(255, 255, 0))
        o.paste(im, ((i % 2) * 2 * w + k * w, (i // 2) * h))
o.save(out, quality=88)
