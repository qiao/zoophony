"""Marks the pixels that differ between the base row and the round row of a moment sheet.

Writes the round row with the changed pixels in red, and prints the changed share and the box of
the change in each cell. Usage: python diff-sheet.py <sheet.png> <moments> <out.png>
"""
import sys
import numpy as np
from PIL import Image

path, moments, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
im = np.asarray(Image.open(path).convert('RGB')).astype(int)
h, w, _ = im.shape
base, rnd = im[: h // 2], im[h // 2 :]
diff = np.abs(base - rnd).sum(axis=2) > 30
# The label at the top left of each cell differs: base and round.
cw = w // moments
for k in range(moments):
    diff[:40, k * cw : k * cw + 200] = False
marked = rnd.copy()
marked[diff] = [255, 0, 0]
Image.fromarray(marked.astype(np.uint8)).save(out)
for k in range(moments):
    cell = diff[:, k * cw : (k + 1) * cw]
    ys, xs = np.nonzero(cell)
    box = f'x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}' if len(xs) else 'none'
    print(f'cell {k}: {100 * cell.mean():.2f}% changed, {box}')
