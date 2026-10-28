# crop.py <out> <box x0,y0,x1,y1> <scale> <label=png>...: the same crop of each image in a row.
import sys
from PIL import Image, ImageDraw
out, box, sc = sys.argv[1], tuple(int(x) for x in sys.argv[2].split(',')), float(sys.argv[3])
items = [a.split('=', 1) for a in sys.argv[4:]]
W, H = int((box[2] - box[0]) * sc), int((box[3] - box[1]) * sc)
s = Image.new('RGB', (len(items) * (W + 4), H + 18), 'white')
d = ImageDraw.Draw(s)
for i, (l, p) in enumerate(items):
    im = Image.open(p).convert('RGB').crop(box).resize((W, H), Image.LANCZOS)
    s.paste(im, (i * (W + 4), 18))
    d.text((i * (W + 4) + 3, 3), l, fill='black')
s.save(out)
