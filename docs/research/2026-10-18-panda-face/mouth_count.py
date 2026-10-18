"""Counts the marker pixels of the smile in the shots of the marker modules: green for the line on
the lower lip, blue for the other dark faces of the mouth (the corners).
uv run --no-project --with pillow --with numpy python -I count.py <png>..."""
import sys
import numpy as np
from PIL import Image

for path in sys.argv[1:]:
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 1.6 * r) & (g > 1.6 * b) & (g > 25)
    blue = (b > 1.6 * r) & (b > 1.3 * g) & (b > 20)
    print(f'{path}: line {int(green.sum())} px, corner {int(blue.sum())} px')
