"""Counts the dark pixels at each armpit of the rabbit in the play frames of some trees.
A box holds the visible pixels of the faces of the cut of a side (the caps of the body and the
web), grown by 8 px. A dark pixel is a pixel of the rabbit (face id) with an Oklab lightness
below 0.8 of the median of the rabbit pixels of the box. With --edges, it counts the sharp
edges: the pixels of the rabbit where the lightness changes by more than 0.03 for each pixel.
Usage: dark.py [--edges] <id dir> <tree dir>..."""
import json, sys, glob, os
import numpy as np
from PIL import Image
CUT = {'R': [415, 421, 572, 419, 420, 357, 356, 226],
       'L': [1822, 1299, 1298, 1297, 1826, 1825, 1044, 1824, 1045, 1046, 1035, 1036]}
def oklab_l(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * lin[..., 0] + 0.5363325363 * lin[..., 1] + 0.0514459929 * lin[..., 2]
    m = 0.2119034982 * lin[..., 0] + 0.6806995451 * lin[..., 1] + 0.1073969566 * lin[..., 2]
    s = 0.0883024619 * lin[..., 0] + 0.2817188376 * lin[..., 1] + 0.6299787005 * lin[..., 2]
    return 0.2104542553 * np.cbrt(l) + 0.7936177850 * np.cbrt(m) - 0.0040720468 * np.cbrt(s)
EDGES = '--edges' in sys.argv
args = [a for a in sys.argv[1:] if a != '--edges']
iddir, trees = args[0], args[1:]
rows = []
tot = {t: [0, 0] for t in trees}
for f in sorted(glob.glob(f'{iddir}/*.bin')):
    name = os.path.basename(f)[3:-4]
    time, az = name.split("-", 1)
    ids = np.fromfile(f, np.int32).reshape(900, 1440)
    for side, faces in CUT.items():
        mask = np.isin(ids, faces)
        if mask.sum() < 30:
            continue
        ys, xs = np.nonzero(mask)
        y0, y1, x0, x1 = max(0, ys.min() - 8), ys.max() + 9, max(0, xs.min() - 8), xs.max() + 9
        fur = ids[y0:y1, x0:x1] >= 0
        cells = [f'{time} s az {az} {side} ({mask.sum()} px)']
        for t in trees:
            img = np.asarray(Image.open(f'{t}/time-{time}/play-at-rabbit-az{az}.png').convert('RGB'), float)
            Lb = oklab_l(img[y0:y1, x0:x1])
            if EDGES:
                gy, gx = np.gradient(Lb)
                L = np.hypot(gx, gy)[fur]
                dark = int((L > 0.03).sum())
            else:
                L = Lb[fur]
                dark = int((L < 0.8 * np.median(L)).sum())
            tot[t][0] += dark; tot[t][1] += len(L)
            cells.append(f'{dark} ({100 * dark / len(L):.1f}%)')
        rows.append('| ' + ' | '.join(cells) + ' |')
print('| Frame | ' + ' | '.join(trees) + ' |')
print('|---|' + '---:|' * len(trees))
print('\n'.join(rows))
print('| all | ' + ' | '.join(f'{d} ({100 * d / n:.1f}%)' for d, n in tot.values()) + ' |')
