"""Counts the dark skin pixels in the shoulder boxes of the side views of the hornist.

    uv run --no-project --with pillow --with numpy python -I shoulder_dark.py <name>=<dir>...

A dark skin pixel has a warm hue (red above blue by 12 or more) and a relative luminance below
0.08: the dark lines and facets of the skin, with no pixel of the black stage.
"""
import sys
import numpy as np
from PIL import Image

MOMENTS = ['note', 'between', 'rest', 'lift50', 'lower50', 'stand']
BOXES = {'left': (120, 260, 480, 560), 'right': (330, 260, 650, 560)}

for item in sys.argv[1:]:
    name, d = item.split('=', 1)
    total = 0
    per = []
    for m in MOMENTS:
        for v, (x0, y0, x1, y1) in BOXES.items():
            a = np.asarray(Image.open(f'{d}/hornist-{m}-{v}.png').convert('RGB'), float)[y0:y1, x0:x1]
            lin = (a / 255) ** 2.2
            lum = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
            warm = (a[..., 0] - a[..., 2]) >= 12
            n = int(((lum < 0.08) & warm).sum())
            per.append(f'{m}-{v} {n}')
            total += n
    print(f'{name}: {total} dark skin pixels in 12 boxes ({", ".join(per)})')
