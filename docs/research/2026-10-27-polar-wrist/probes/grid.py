import sys
from PIL import Image, ImageDraw
# Usage: grid.py <out> <cols> <cell width> <file>...  Each file is scaled to the cell width.
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB')
    h = round(im.height * cw / im.width)
    ims.append((f.split('/')[-1], im.resize((cw, h), Image.LANCZOS)))
ch = max(i.height for _, i in ims)
rows = (len(ims) + cols - 1) // cols
g = Image.new('RGB', (cols * cw, rows * ch), (0, 0, 0))
d = ImageDraw.Draw(g)
for k, (name, im) in enumerate(ims):
    x, y = (k % cols) * cw, (k // cols) * ch
    g.paste(im, (x, y))
    d.rectangle((x, y, x + 8 * len(name) // 1.3, y + 14), fill=(0, 0, 0))
    d.text((x + 2, y + 1), name, fill=(255, 255, 255))
g.save(out)
