"""Puts images in one row at one height: python3 montage.py <out> <height> <img>..."""
import sys

from PIL import Image

out, height = sys.argv[1], int(sys.argv[2])
cells = []
for path in sys.argv[3:]:
    img = Image.open(path).convert('RGB')
    cells.append(img.resize((int(img.width * height / img.height), height), Image.LANCZOS))
canvas = Image.new('RGB', (sum(c.width for c in cells) + 6 * (len(cells) - 1), height), (17, 17, 17))
x = 0
for c in cells:
    canvas.paste(c, (x, 0))
    x += c.width + 6
canvas.save(out)
