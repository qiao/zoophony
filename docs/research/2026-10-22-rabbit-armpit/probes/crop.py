"""crop.py <out> <box x,y,w,h> <scale> <img>...: crops each image to the box (shares) and puts them in a row."""
import sys
from PIL import Image
out, box, sc = sys.argv[1], [float(v) for v in sys.argv[2].split(',')], float(sys.argv[3])
ims = []
for p in sys.argv[4:]:
    im = Image.open(p).convert('RGB'); w, h = im.size
    c = im.crop((int(box[0]*w), int(box[1]*h), int((box[0]+box[2])*w), int((box[1]+box[3])*h)))
    ims.append(c.resize((int(c.width*sc), int(c.height*sc)), Image.LANCZOS))
W = sum(i.width for i in ims); H = max(i.height for i in ims)
s = Image.new('RGB', (W, H)); x = 0
for i in ims: s.paste(i, (x, 0)); x += i.width
s.save(out)
