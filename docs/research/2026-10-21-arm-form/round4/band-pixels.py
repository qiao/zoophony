"""Counts the dark skin pixels of the band under the right upper arm in a frame of the right view.

The box is x 0.30 to 0.95 and y 0.50 to 0.66 of the frame. A dark skin pixel has a mean channel
below 60 and red over blue by 10 or more, so that the backdrop (15, 12, 11) does not count.

    uv run --no-project --with pillow --with numpy python -I band-pixels.py <frame.png>...
"""
import sys

import numpy as np
from PIL import Image

for path in sys.argv[1:]:
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    h, w, _ = a.shape
    r = a[int(h * 0.5):int(h * 0.66), int(w * 0.3):int(w * 0.95)]
    dark = (r.mean(axis=2) < 60) & ((r[:, :, 0] - r[:, :, 2]) >= 10)
    print(path, int(dark.sum()))
