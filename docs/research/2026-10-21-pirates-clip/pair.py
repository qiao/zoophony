# python pair.py <base.png> <tree.png> <out> <x,y,w,h>: a 2x crop pair, base | round, with labels.
import sys
from PIL import Image, ImageDraw
a, b, out, box = sys.argv[1], sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(',')]
x, y, w, h = box
crops = [Image.open(p).convert('RGB').crop((x, y, x + w, y + h)).resize((2 * w, 2 * h), Image.LANCZOS) for p in (a, b)]
im = Image.new('RGB', (4 * w + 8, 2 * h), 'black')
im.paste(crops[0], (0, 0)); im.paste(crops[1], (2 * w + 8, 0))
d = ImageDraw.Draw(im)
for i, t in enumerate(['main 39aa09c9', 'round pirates-clip']):
    d.rectangle((i * (2 * w + 8) + 6, 6, i * (2 * w + 8) + 170, 28), fill='black')
    d.text((i * (2 * w + 8) + 12, 10), t, fill='yellow')
im.save(out)
