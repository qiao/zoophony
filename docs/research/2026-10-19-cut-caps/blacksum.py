"""blacksum.py <role> <dir>...: black (Oklab L < 0.3) and dark (L < 0.45) pixels of each view,
summed over the moments, inside the pixels where the base and some tree differ."""
import sys, glob, os
import numpy as np
from PIL import Image

def oklab_l(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    l = 0.4122214708 * lin[..., 0] + 0.5363325363 * lin[..., 1] + 0.0514459929 * lin[..., 2]
    m = 0.2119034982 * lin[..., 0] + 0.6806995451 * lin[..., 1] + 0.1073969566 * lin[..., 2]
    s = 0.0883024619 * lin[..., 0] + 0.2817188376 * lin[..., 1] + 0.6299787005 * lin[..., 2]
    return 0.2104542553 * np.cbrt(l) + 0.7936177850 * np.cbrt(m) - 0.0040720468 * np.cbrt(s)

role, dirs = sys.argv[1], sys.argv[2:]
views = {}
for base in sorted(glob.glob(os.path.join(dirs[0], f'{role}-base-*-*.png'))):
    cell = os.path.basename(base)[len(role) + 6:-4]
    view = cell.split('-')[-1]
    a = np.asarray(Image.open(base).convert('RGB')).astype(float)
    trees = [np.asarray(Image.open(os.path.join(d, f'{role}-{cell}.png')).convert('RGB')).astype(float) for d in dirs]
    mask = np.zeros(a.shape[:2], bool)
    for t in trees:
        mask |= np.abs(a - t).max(axis=2) > 8
    row = views.setdefault(view, np.zeros((1 + len(dirs), 2), int))
    for k, img in enumerate([a] + trees):
        l = oklab_l(img)[mask]
        row[k] += [(l < 0.3).sum(), (l < 0.45).sum()]
print(f'{"view":8s} ' + '  '.join(f'{n:>14s}' for n in ['base'] + [os.path.basename(d) for d in dirs]) + '   (black / dark)')
for view, row in views.items():
    print(f'{view:8s} ' + '  '.join(f'{b:6d} / {d:5d}' for b, d in row))
tot = sum(views.values())
print(f'{"all":8s} ' + '  '.join(f'{b:6d} / {d:5d}' for b, d in tot))
