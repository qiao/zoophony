"""Measures and crops the frames of `close-views play --base` of the round: the sharp edges and
the dark pixels in the box of the cut faces of each side (as dark.py of 2026-10-21-rabbit-armpit),
and the image pairs. Usage: frames.py <frame dir> <id dir> <out dir>"""
import sys, glob, os
import numpy as np
from PIL import Image, ImageDraw
frames, iddir, out = sys.argv[1:4]
CUT = {'R': [415, 421, 572, 419, 420, 357, 356, 226],
       'L': [1822, 1299, 1298, 1297, 1826, 1825, 1044, 1824, 1045, 1046, 1035, 1036]}
def oklab_l(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * lin[..., 0] + 0.5363325363 * lin[..., 1] + 0.0514459929 * lin[..., 2]
    m = 0.2119034982 * lin[..., 0] + 0.6806995451 * lin[..., 1] + 0.1073969566 * lin[..., 2]
    s = 0.0883024619 * lin[..., 0] + 0.2817188376 * lin[..., 1] + 0.6299787005 * lin[..., 2]
    return 0.2104542553 * np.cbrt(l) + 0.7936177850 * np.cbrt(m) - 0.0040720468 * np.cbrt(s)
rows, cells, tot = [], [], {'base': [0, 0, 0], 'round': [0, 0, 0]}
for f in sorted(glob.glob(f'{iddir}/*.bin')):
    t, az = os.path.basename(f)[3:-4].split('-', 1)
    ids = np.fromfile(f, np.int32).reshape(900, 1440)
    for side, faces in CUT.items():
        mask = np.isin(ids, faces)
        if mask.sum() < 30:
            continue
        ys, xs = np.nonzero(mask)
        y0, y1, x0, x1 = ys.min() - 8, ys.max() + 9, xs.min() - 8, xs.max() + 9
        fur = ids[y0:y1, x0:x1] >= 0
        vals = []
        for name, prefix in (('base', 'play-base-at'), ('round', 'play-at')):
            img = np.asarray(Image.open(f'{frames}/time-{t}/{prefix}-rabbit-az{az}.png').convert('RGB'), float)
            L = oklab_l(img[y0:y1, x0:x1]); gy, gx = np.gradient(L)
            e = int((np.hypot(gx, gy)[fur] > 0.03).sum()); d = int((L[fur] < 0.8 * np.median(L[fur])).sum())
            tot[name][0] += e; tot[name][1] += d; tot[name][2] += int(fur.sum())
            vals.append(f'{e} / {d}')
        rows.append(f'| {t} s az {az} {side} ({mask.sum()} px) | {vals[0]} | {vals[1]} |')
        cy, cx = int(ys.mean()), int(xs.mean())
        box = (cx - 110, cy - 80, cx + 110, cy + 60)
        for name, prefix in (('main', 'play-base-at'), ('round', 'play-at')):
            im = Image.open(f'{frames}/time-{t}/{prefix}-rabbit-az{az}.png').convert('RGB').crop(box)
            im = im.resize((440, 280), Image.LANCZOS)
            d = ImageDraw.Draw(im); d.rectangle((0, 0, 230, 14), fill=(0, 0, 0))
            d.text((3, 2), f'{name} brahms-2 {t} s az {az} {side}', fill=(255, 255, 0))
            cells.append(im)
print('| Frame | main edges / dark | round edges / dark |')
print('|---|---:|---:|')
print('\n'.join(rows))
print(f"| all | {tot['base'][0]} / {tot['base'][1]} | {tot['round'][0]} / {tot['round'][1]} |")
o = Image.new('RGB', (440 * 4, 280 * ((len(cells) + 3) // 4)), 'white')
for i, c in enumerate(cells):
    o.paste(c, ((i % 4) * 440, (i // 4) * 280))
o.save(f'{out}/frame-pairs.webp', quality=88)
user = (650, 410, 846, 556); side = (600, 400, 820, 560)
cells = []
for az, box in (('120', user), ('90', side)):
    for name, prefix in (('main', 'play-base-at'), ('round', 'play-at')):
        im = Image.open(f'{frames}/time-678.63/{prefix}-rabbit-az{az}.png').convert('RGB').crop(box)
        im = im.resize((im.width * 3, im.height * 3), Image.LANCZOS)
        d = ImageDraw.Draw(im); d.rectangle((0, 0, 230, 14), fill=(0, 0, 0))
        d.text((3, 2), f'{name} brahms-2 678.63 s az {az}', fill=(255, 255, 0))
        cells.append(im)
w, h = cells[0].size
o = Image.new('RGB', (w * 2, cells[0].height + cells[2].height), 'white')
o.paste(cells[0], (0, 0)); o.paste(cells[1], (w, 0)); o.paste(cells[2], (0, cells[0].height)); o.paste(cells[3], (cells[2].width, cells[0].height))
o.save(f'{out}/user-view-pairs.webp', quality=88)
