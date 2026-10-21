"""Crops the armpit of chosen frames from several trees, side by side, at 3x.
Usage: triple.py <id dir> <out> <frame,frame...> <tree>... ; a frame is <time>:<az>:<side>"""
import sys
import numpy as np
from PIL import Image, ImageDraw
CUT = {'R': [415, 421, 572, 419, 420, 357, 356, 226],
       'L': [1822, 1299, 1298, 1297, 1826, 1825, 1044, 1824, 1045, 1046, 1035, 1036]}
iddir, out, frames, trees = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4:]
S, half = 3, 45
rows = []
for fr in frames:
    time, az, side = fr.split(':')
    ids = np.fromfile(f'{iddir}/id-{time}-{az}.bin', np.int32).reshape(900, 1440)
    ys, xs = np.nonzero(np.isin(ids, CUT[side]))
    cy, cx = int(ys.mean()), int(xs.mean())
    box = (cx - 2 * half, cy - half - 10, cx + 2 * half, cy + half - 10)
    row = Image.new('RGB', (len(trees) * 4 * half * S, 2 * half * S))
    for k, t in enumerate(trees):
        im = Image.open(f'{t}/time-{time}/play-at-rabbit-az{az}.png').convert('RGB').crop(box)
        im = im.resize((4 * half * S, 2 * half * S), Image.LANCZOS)
        ImageDraw.Draw(im).text((4, 4), f'{t.split("/")[-1]} {time} s az {az} {side}', fill=(255, 255, 0))
        row.paste(im, (k * 4 * half * S, 0))
    rows.append(row)
o = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)))
for i, r in enumerate(rows):
    o.paste(r, (0, i * r.height))
o.save(out)
