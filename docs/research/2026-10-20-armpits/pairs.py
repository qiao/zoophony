"""pairs.py <out> <x,y,w,h> <scale> <base1> <new1> [<base2> <new2>...]: main above, change below."""
import sys
from PIL import Image, ImageDraw
out, box, scale = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], float(sys.argv[3])
files = sys.argv[4:]
pairs = list(zip(files[0::2], files[1::2]))
x, y, w, h = box
W, H = int(w * scale), int(h * scale)
sheet = Image.new('RGB', (W * len(pairs), H * 2), (0, 0, 0))
for i, (b, n) in enumerate(pairs):
    for j, p in enumerate((b, n)):
        im = Image.open(p).convert('RGB').crop((x, y, x + w, y + h)).resize((W, H), Image.LANCZOS)
        ImageDraw.Draw(im).text((4, 4), ('main ' if j == 0 else 'change ') + p.split('/')[-1], fill=(255, 255, 0))
        sheet.paste(im, (i * W, j * H))
sheet.save(out)
print(out, sheet.size)
