"""Measures the proportions of the brief on the sheet matte and on a model silhouette.

    uv run --no-project --with pillow --with numpy \
        python tools/spike/fox-gated/proportions.py <matte.png> <silhouette.png>

Each measure is an extreme row or column of the fox inside a box of the sheet, in meters above
the floor or from the origin column of the view (737 px for each meter). The error is the
difference of the model and the sheet as a percent of the fox height on the sheet (from the
floor to the tip of the higher ear of the front view).
"""

import sys

import numpy as np
from PIL import Image

#: The scale of the sheet, in pixels for each meter.
PPM = 737.0

#: The views: name, origin column, floor row.
VIEWS = {'front': (385.0, 1117.0), 'side': (1100.0, 1118.0), 'back': (2080.0, 1120.0)}

#: The measures: (name, view, box (c0, r0, c1, r1), what). `what` is `top` (the highest row),
#: `bottom` (the lowest row), `left` (the smallest column), `right` (the largest column), or
#: `width` (the width of the widest row).
MEASURES = [
    ('ear tip height (front)', 'front', (100, 100, 700, 400), 'top'),
    ('head width at the cheeks (front)', 'front', (180, 380, 620, 420), 'width'),
    ('right side of the head (front)', 'front', (180, 200, 400, 420), 'left'),
    ('hip and thigh width (front)', 'front', (200, 760, 620, 800), 'width'),
    ('foot bottom (front)', 'front', (250, 950, 520, 1130), 'bottom'),
    ('tail end (front)', 'front', (60, 650, 250, 950), 'left'),
    ('ear tip height (side)', 'side', (900, 100, 1400, 400), 'top'),
    ('back of the head (side)', 'side', (900, 250, 1200, 420), 'left'),
    ('nose tip (side)', 'side', (1200, 380, 1360, 440), 'right'),
    ('knee front (side)', 'side', (1200, 700, 1500, 860), 'right'),
    ('foot bottom (side)', 'side', (1150, 950, 1500, 1130), 'bottom'),
    ('head width at the cheeks (back)', 'back', (1900, 380, 2300, 420), 'width'),
]


def measure(mask, view, box, what):
    """Gives one measure of a mask in meters."""
    col0, floor = VIEWS[view]
    c0, r0, c1, r1 = box
    sub = mask[r0:r1, c0:c1]
    rows = np.flatnonzero(sub.any(1))
    cols = np.flatnonzero(sub.any(0))
    if not len(rows):
        return float('nan')
    if what == 'top':
        return (floor - (r0 + rows[0])) / PPM
    if what == 'bottom':
        return (floor - (r0 + rows[-1])) / PPM
    if what == 'left':
        return (c0 + cols[0] - col0) / PPM
    if what == 'right':
        return (c0 + cols[-1] - col0) / PPM
    widths = [np.ptp(np.flatnonzero(r)) + 1 for r in sub if r.any()]
    return max(widths) / PPM


def main():
    sheet = np.asarray(Image.open(sys.argv[1]).convert('L')) == 255
    model = np.asarray(Image.open(sys.argv[2]).convert('RGBA'))[..., 3] > 127
    height = measure(sheet, 'front', (100, 100, 700, 1130), 'top')
    print('| Measure | Sheet (m) | Model (m) | Error (% of H) |')
    print('|---|---|---|---|')
    errors = []
    for name, view, box, what in MEASURES:
        s = measure(sheet, view, box, what)
        m = measure(model, view, box, what)
        e = 100.0 * (m - s) / height
        errors.append(abs(e))
        print('| %s | %.3f | %.3f | %+.1f |' % (name, s, m, e))
    print()
    print('H = %.3f m. Mean error %.1f%%, largest %.1f%%.' % (height, np.mean(errors), max(errors)))


if __name__ == '__main__':
    main()
