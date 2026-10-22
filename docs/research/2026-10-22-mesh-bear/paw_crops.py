"""Crops the right paw that holds the baton from the views of pnpm close-views conductor <dir>
--views front,back,left,right --moments <m,...> --scale 3: a box of 360 px around the end of the
white stick of the baton nearest to the middle of the image, scaled 2x, one row for each moment.

    uv run --no-project --with numpy --with pillow python -I paw_crops.py <dir> <out.png> <moment>...
"""
import sys

import numpy as np
from PIL import Image

folder, out, moments = sys.argv[1], sys.argv[2], sys.argv[3:]
views = ['front', 'back', 'left', 'right']
size = 360
sheet = Image.new('RGB', (len(views) * size * 2, len(moments) * size * 2), 'black')
for r, moment in enumerate(moments):
    for c, view in enumerate(views):
        im = Image.open(f'{folder}/conductor-{moment}-{view}.png').convert('RGB')
        a = np.asarray(im).astype(float) / 255
        white = (a.min(axis=2) > 0.75) & (a.max(axis=2) - a.min(axis=2) < 0.12)
        ys, xs = np.nonzero(white[:, :])
        if len(xs) == 0:
            continue
        middle = np.array([a.shape[1] / 2, a.shape[0] / 2])
        points = np.stack([xs, ys], axis=1)
        # The two ends of the stick: the white pixels farthest apart along its main direction.
        mean = points.mean(axis=0)
        _, _, vt = np.linalg.svd(points - mean, full_matrices=False)
        along = (points - mean) @ vt[0]
        ends = [points[np.argmin(along)], points[np.argmax(along)]]
        grip = min(ends, key=lambda p: np.linalg.norm(p - middle))
        x0, y0 = int(grip[0] - size / 2), int(grip[1] - size / 2)
        crop = im.crop((x0, y0, x0 + size, y0 + size)).resize((size * 2, size * 2))
        sheet.paste(crop, (c * size * 2, r * size * 2))
sheet.save(out)
