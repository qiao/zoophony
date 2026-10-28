# pair.py <base png> <tree png> <out> <box x0,y0,x1,y1> [scale]: a crop of each, side by side (base left).
import sys
from PIL import Image
a, b, out, box = sys.argv[1], sys.argv[2], sys.argv[3], tuple(int(x) for x in sys.argv[4].split(','))
s = float(sys.argv[5]) if len(sys.argv) > 5 else 2
ims = [Image.open(p).crop(box) for p in (a, b)]
w, h = ims[0].size
W, H = int(w * s), int(h * s)
sheet = Image.new('RGB', (2 * W + 8, H), 'white')
for k, im in enumerate(ims):
    sheet.paste(im.resize((W, H), Image.LANCZOS), (k * (W + 8), 0))
sheet.save(out)
