"""Counts the crease pixels of each column in fixed boxes of the close views, with the same box
and the same thresholds for each column:

- dark: the pixels whose Rec. 709 luma is below the threshold of the box;
- line: the pixels whose luma differs by more than 18 from the median of the 9 x 9 pixels around
  them, so that a thin dark or bright line counts and a smooth shade does not.

    uv run --no-project --with pillow --with numpy --with scipy python -I dark.py <views dir> <column>...
"""
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import median_filter

BOXES = [
    ('fox-red', 'left', (140, 425, 210, 462), 120),
    ('fox-red', 'user', (220, 360, 280, 455), 90),
    ('rabbit', 'left', (170, 430, 240, 490), 170),
    ('rabbit', 'user', (210, 400, 290, 470), 170),
    ('rabbit', 'front35', (215, 425, 285, 465), 170),
]
views, columns = sys.argv[1], sys.argv[2:]
print('| View | Box (x0, y0, x1, y1) | Dark: luma below | ' + ' | '.join(f'{c} dark / line' for c in columns) + ' |')
print('|---|---|---|' + '---|' * len(columns))
for species, view, box, limit in BOXES:
    cells = []
    for column in columns:
        img = np.asarray(Image.open(f'{views}/{column}-{species}-{view}.png').convert('RGB'), float)
        luma = 0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2]
        x0, y0, x1, y1 = box
        sub = luma[y0:y1, x0:x1]
        med = median_filter(luma, size=9)[y0:y1, x0:x1]
        cells.append(f'{int((sub < limit).sum())} / {int((np.abs(sub - med) > 18).sum())}')
    print(f'| {species} {view} | {box} | {limit} | ' + ' | '.join(cells) + ' |')
