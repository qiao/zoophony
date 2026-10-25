"""Decodes face ids from a face id render. Usage: faceat.py <png> x0,y0,x1,y1 [face ...]
Prints the faces with the most pixels in the box, and the box of each named face."""
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
q = np.rint(im / 17).astype(int)
err = np.abs(q * 17 - im).max(axis=2)
fid = q[..., 0] * 256 + q[..., 1] * 16 + q[..., 2] - 1
fid[err > 4] = -1
x0, y0, x1, y1 = [int(v) for v in sys.argv[2].split(',')]
ids, n = np.unique(fid[y0:y1, x0:x1], return_counts=True)
print('size', im.shape, 'box', x0, y0, x1, y1, 'decoded share', (fid >= 0).mean().round(3))
print(' '.join(f'{i}:{c}' for i, c in sorted(zip(ids, n), key=lambda t: -t[1]) if i >= 0)[:2000])
for f in sys.argv[3:]:
    ys, xs = np.nonzero(fid == int(f))
    print(f, 'none' if not len(xs) else f'x {xs.min()}..{xs.max()} y {ys.min()}..{ys.max()} px {len(xs)}')
