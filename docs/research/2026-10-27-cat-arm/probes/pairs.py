"""Puts crops of base and tree play frames in pairs: the base row above the tree row.

    uv run --no-project --with pillow python -I scratch/pairs.py <dir> <out> <box x0,y0,x1,y1> <scale> <name>...
Each name is a frame name such as at-cat-az-72: <dir>/play-base-<name>.png and <dir>/play-<name>.png.
"""
import sys

from PIL import Image, ImageDraw

d, out, box, scale, names = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], float(sys.argv[4]), sys.argv[5:]
w, h = int((box[2] - box[0]) * scale), int((box[3] - box[1]) * scale)
sheet = Image.new('RGB', (w * len(names), h * 2), 'white')
for c, n in enumerate(names):
    for r, (pre, lab) in enumerate((('play-base-', 'main'), ('play-', 'round'))):
        im = Image.open(f'{d}/{pre}{n}.png').convert('RGB').crop(box).resize((w, h), Image.LANCZOS)
        dr = ImageDraw.Draw(im)
        dr.rectangle([0, 0, 230, 18], fill=(0, 0, 0))
        dr.text((4, 3), f'{lab} {n}', fill=(255, 255, 255))
        sheet.paste(im, (c * w, r * h))
sheet.save(out)
