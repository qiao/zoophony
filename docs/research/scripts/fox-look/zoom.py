"""Zooms one box of the aligned sheet crop and preview view, side by side, and as an overlay.

    python3 zoom.py <sheet> <preview-dir> <view> <out> x0 y0 x1 y1 [scale]

The box is in the coordinates of the preview image (700 x 1050).
"""
import sys

from PIL import Image

OFFSETS = {'front': (40, 97), 'side': (750, 100), 'back': (1725, 106)}
sheet = Image.open(sys.argv[1]).convert('RGB')
pdir, view, out = sys.argv[2], sys.argv[3], sys.argv[4]
x0, y0, x1, y1 = (int(v) for v in sys.argv[5:9])
scale = float(sys.argv[9]) if len(sys.argv) > 9 else 2.0
ox, oy = OFFSETS[view]
a = sheet.crop((x0 + ox, y0 + oy, x1 + ox, y1 + oy))
b = Image.open(f'{pdir}/{view}.png').convert('RGB').crop((x0, y0, x1, y1))
size = (int(a.width * scale), int(a.height * scale))
a, b = a.resize(size, Image.LANCZOS), b.resize(size, Image.LANCZOS)
canvas = Image.new('RGB', (size[0] * 3, size[1]))
canvas.paste(a, (0, 0))
canvas.paste(b, (size[0], 0))
canvas.paste(Image.blend(a, b, 0.5), (2 * size[0], 0))
canvas.save(out)
