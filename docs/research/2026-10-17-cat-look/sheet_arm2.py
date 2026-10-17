"""Measures the arm widths of the front figure of the cat sheet: the runs of the arm in each row
below the armpit, their middle line, and the width across that line, in sheet head heights."""
import numpy as np
from PIL import Image
from scipy import ndimage

a = np.asarray(Image.open('docs/reference/cat-views.png').convert('RGB')).astype(float)
bg = (a[:, :12].mean(axis=1) + a[:, -12:].mean(axis=1)) / 2
d = np.linalg.norm(a - bg[:, None, :], axis=2)
mask = ndimage.binary_opening(d > 16, structure=np.ones((3, 3)))
HH = 125.0
for name, x0, x1 in [('left arm (image right)', 262, 380), ('right arm (image left)', 25, 146)]:
    rows = []
    for y in range(470, 560):
        xs = np.nonzero(mask[y, x0:x1])[0] + x0
        if len(xs) == 0:
            continue
        runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
        run = max(runs, key=len)
        # The arm run must not touch the trunk side of the window.
        if run[0] == x0 or run[-1] == x1 - 1:
            continue
        rows.append((y, (run[0] + run[-1]) / 2, len(run)))
    rows = np.array(rows)
    k, c = np.polyfit(rows[:, 0], rows[:, 1], 1)
    cos = 1 / np.hypot(1, k)  # the share of a row run across the axis
    print(f'{name}: rows {int(rows[0,0])} to {int(rows[-1,0])}, axis {np.degrees(np.arctan(k)):.1f} deg from vertical')
    for y, mid, run in rows[::5]:
        print(f'  y {int(y)}: middle x {mid:.1f}, row run {int(run)} px, across {run * cos:.1f} px = {run * cos / HH:.3f} HH')
