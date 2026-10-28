# grid.py <out.png> <cols> <scale> <label=path>...: a grid of images with labels.
import sys
from PIL import Image, ImageDraw
out, cols, sc = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
items = [a.split('=', 1) for a in sys.argv[4:]]
ims = [(l, Image.open(p).convert('RGB')) for l, p in items]
w, h = ims[0][1].size
W, H = int(w * sc), int(h * sc)
rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (cols * (W + 4), rows * (H + 18)), 'white')
d = ImageDraw.Draw(s)
for i, (l, im) in enumerate(ims):
    x, y = (i % cols) * (W + 4), (i // cols) * (H + 18)
    s.paste(im.resize((W, H), Image.LANCZOS), (x, y + 16))
    d.text((x + 3, y + 2), l, fill='black')
s.save(out)
