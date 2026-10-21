"""Measures the seam of the arms of the rabbit in the role close views of trees. A mask render
(the seam faces in magenta, the rest in gray, no light) gives the seam: the faces of the cuts of
both sides and each face that shares a vertex with them, grown by 4 px. In the seam, it counts the
black pixels (Oklab lightness below 0.3) and the sharp edges (a change of the lightness above 0.05
for each pixel). Usage: seammetric.py <mask dir> <dir>..."""
import sys, glob, os
import numpy as np
from PIL import Image
def light(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * lin[..., 0] + 0.5363325363 * lin[..., 1] + 0.0514459929 * lin[..., 2]
    m = 0.2119034982 * lin[..., 0] + 0.6806995451 * lin[..., 1] + 0.1073969566 * lin[..., 2]
    s = 0.0883024619 * lin[..., 0] + 0.2817188376 * lin[..., 1] + 0.6299787005 * lin[..., 2]
    return 0.2104542553 * np.cbrt(l) + 0.7936177850 * np.cbrt(m) - 0.0040720468 * np.cbrt(s)
mdir, dirs = sys.argv[1], sys.argv[2:]
names = sorted(os.path.basename(p) for p in glob.glob(f'{mdir}/violinist-*-*.png') if 'views' not in p)
tot = {d: [0, 0] for d in dirs}
print('| View | seam px | ' + ' | '.join(f'{d} black / edges' for d in dirs) + ' |'); print('|---|---:|' + '---:|' * len(dirs))
for n in names:
    m = np.asarray(Image.open(f'{mdir}/{n}').convert('RGB'), float)
    seam = (m[..., 0] > 150) & (m[..., 2] > 150) & (m[..., 1] < 100)
    for _ in range(4):
        seam = seam | np.roll(seam, 1, 0) | np.roll(seam, -1, 0) | np.roll(seam, 1, 1) | np.roll(seam, -1, 1)
    cells = []
    for d in dirs:
        L = light(np.asarray(Image.open(f'{d}/{n}').convert('RGB'), float))
        gy, gx = np.gradient(L)
        b = int((seam & (L < 0.3)).sum()); e = int((seam & (np.hypot(gx, gy) > 0.05)).sum())
        tot[d][0] += b; tot[d][1] += e; cells.append(f'{b} / {e}')
    print(f'| {n[10:-4]} | {int(seam.sum())} | ' + ' | '.join(cells) + ' |')
print('| all | | ' + ' | '.join(f'{tot[d][0]} / {tot[d][1]}' for d in dirs) + ' |')
