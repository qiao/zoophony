# uv run --no-project --with pillow python -I scratch/grid.py <dir> <out> <cols> <file>... (label from file name)
import sys
from PIL import Image, ImageDraw
d, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f'{d}/{f}') for f in files]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
o = Image.new('RGB', (w * cols, h * rows))
dr = ImageDraw.Draw(o)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * w, (i // cols) * h
    o.paste(im, (x, y))
    dr.rectangle([x, y, x + w - 1, y + 22], fill=(0, 0, 0))
    dr.text((x + 6, y + 5), f.removesuffix('.png'), fill=(255, 255, 255))
o.save(out)
