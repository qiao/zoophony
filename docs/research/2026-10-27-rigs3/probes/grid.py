"""Writes a grid of play frames: grid.py <out.png> <dir> <x0,y0,x1,y1> <scale> <label,...> [<label,...>]
Each label list gives a block of two rows: main (play-base-<label>.png) above the round (play-<label>.png)."""
import sys
from PIL import Image, ImageDraw
out, d, box, scale = sys.argv[1], sys.argv[2], tuple(int(v) for v in sys.argv[3].split(',')), float(sys.argv[4])
blocks = [b.split(',') for b in sys.argv[5:]]
w, h = int((box[2] - box[0]) * scale), int((box[3] - box[1]) * scale)
cols = max(len(b) for b in blocks)
sheet = Image.new('RGB', (cols * (w + 4), len(blocks) * 2 * (h + 4)), 'white')
for bi, labels in enumerate(blocks):
    for ci, label in enumerate(labels):
        for ri, (name, tag) in enumerate(((f'{d}/play-base-{label}.png', 'main'), (f'{d}/play-{label}.png', 'round'))):
            im = Image.open(name).convert('RGB').crop(box).resize((w, h), Image.LANCZOS)
            ImageDraw.Draw(im).text((5, 4), f'{tag} {label}', fill=(255, 255, 255))
            sheet.paste(im, (ci * (w + 4), (bi * 2 + ri) * (h + 4)))
sheet.save(out)
