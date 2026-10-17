"""Measures the silhouette of the cat sheet: the run through the body middle of each row."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

a = np.asarray(Image.open('docs/reference/cat-views.png').convert('RGB')).astype(float)
h, w, _ = a.shape
bg = (a[:, :12].mean(axis=1) + a[:, -12:].mean(axis=1)) / 2
d = np.linalg.norm(a - bg[:, None, :], axis=2)
mask = d > 16
mask = ndimage.binary_opening(mask, structure=np.ones((5, 5)))
mask = ndimage.binary_fill_holes(mask)
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))
keep = [i + 1 for i in np.argsort(sizes)[::-1][:4]]
figs = sorted(keep, key=lambda k: np.nonzero(lab == k)[1].mean())
for name, k in zip(['front', 'side', 'back', 'q'], figs):
    m = lab == k
    ys, xs = np.nonzero(m)
    print(f'{name}: x {xs.min()}..{xs.max()}, y {ys.min()}..{ys.max()}')
    np.save(f'scratch/sheet-{name}.npy', m)
