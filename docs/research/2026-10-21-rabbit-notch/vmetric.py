"""Counts the sharp edges and the dark pixels at each armpit of the frames of the variants of
run-variant.sh (brahms-2 678.63 s), in the boxes of the cut faces of the main body.
Usage: vmetric.py <variant>..."""
import sys
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
print('| Frame | ' + ' | '.join(f'{v} edges / dark' for v in sys.argv[1:]) + ' |')
print('|---|' + '---:|' * (len(sys.argv) - 1))
for az, side in (('120', 'R'), ('90', 'R'), ('-120', 'L')):
    ids = np.fromfile(f'scratch/ids/id-678.63-{az}.bin', np.int32).reshape(900, 1440)
    ys, xs = np.nonzero(np.isin(ids, CUT[side]))
    y0, y1, x0, x1 = ys.min() - 8, ys.max() + 9, xs.min() - 8, xs.max() + 9
    fur = ids[y0:y1, x0:x1] >= 0
    cells = []
    for v in sys.argv[1:]:
        img = np.asarray(Image.open(f'scratch/var/{v}/play/play-at-rabbit-az{az}.png').convert('RGB'), float)
        L = oklab_l(img[y0:y1, x0:x1]); gy, gx = np.gradient(L)
        edges = int((np.hypot(gx, gy)[fur] > 0.03).sum()); dark = int((L[fur] < 0.8 * np.median(L[fur])).sum())
        cells.append(f'{edges} / {dark}')
    print(f'| 678.63 s az {az} {side} | ' + ' | '.join(cells) + ' |')
