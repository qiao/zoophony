"""Measures the dark band under the back of the head of the rabbit in a back view of
`pnpm close-views species rabbit --views back --zoom 2.5`: in the middle strip of the image (0.3 to
0.7 of the width) and the rows 0.15 to 0.55 of the height, the mean luminance of each row over its
pixels of the body (luminance above 40, so that the black background does not count), the darkest
row, and the count of body pixels with a luminance below 150. Usage: nape_band.py <label=png>..."""
import sys
import numpy as np
from PIL import Image
for item in sys.argv[1:]:
    label, path = item.split('=', 1)
    a = np.asarray(Image.open(path).convert('RGB'), float)
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    h, w = lum.shape
    box = lum[int(0.15 * h):int(0.55 * h), int(0.3 * w):int(0.7 * w)]
    body = box > 40
    rows = [(r[m].mean() if m.sum() > 10 else np.nan) for r, m in zip(box, body)]
    rows = np.array(rows)
    k = int(np.nanargmin(rows))
    dark = int(((box < 150) & body).sum())
    print(f'{label}: darkest row mean luminance {np.nanmin(rows):.0f} (row {k + int(0.15 * h)} of {h}), '
          f'body pixels below 150: {dark} of {int(body.sum())}')
