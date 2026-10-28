# grid.py <out> <box x0,y0,x1,y1> <scale> <label=png>...: crops of each image in a row with labels.
import sys
from PIL import Image, ImageDraw
out, box, s = sys.argv[1], tuple(int(x) for x in sys.argv[2].split(',')), float(sys.argv[3])
items = [a.split('=', 1) for a in sys.argv[4:]]
ims = [Image.open(p).crop(box) for _, p in items]
w, h = ims[0].size
W, H = int(w * s), int(h * s)
cols = min(3, len(ims))
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + 6), rows * (H + 24)), 'white')
d = ImageDraw.Draw(sheet)
for k, (im, (lab, _)) in enumerate(zip(ims, items)):
    x, y = (k % cols) * (W + 6), (k // cols) * (H + 24)
    d.text((x + 4, y + 4), lab, fill='black')
    sheet.paste(im.resize((W, H), Image.LANCZOS), (x, y + 22))
sheet.save(out)
