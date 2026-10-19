"""Measures the orange fur of four red fox heads in Oklch: the reference image and play frames.

    python3 measure.py <label>=<play frame 1440 x 900>...

The boxes of the reference are on `docs/reference/orchestra-latest.png`, and the boxes of the
app are on the play frame of the snapshot (the default demo, the camera of "Reset view"). The mask
keeps the pixels with an Oklch chroma above 0.05 and a hue from 10 to 90 degrees. The script is
`scratch/measure.py` of the manager, with the frames as arguments. It prints the pixel count and
the median lightness, chroma, and hue of each image, and the hue quartiles.
"""

import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..')
REFERENCE = os.path.join(ROOT, 'docs', 'reference', 'orchestra-latest.png')
REF_BOXES = [(705, 505, 740, 535), (580, 600, 605, 640), (765, 615, 810, 645),
             (590, 685, 635, 715)]
APP_BOXES = [(627, 372, 652, 387), (555, 390, 580, 405), (665, 430, 690, 442),
             (580, 447, 605, 462)]


def oklch(rgb):
    """Converts sRGB pixels from 0 to 255 to Oklch: lightness, chroma, and hue in degrees."""
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(lin @ m1.T)
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    lab = lms @ m2.T
    return lab[..., 0], np.hypot(lab[..., 1], lab[..., 2]), (
        np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360) % 360


def measure(label, path, boxes):
    """Prints the measures of the orange fur in the boxes of one image."""
    image = Image.open(path).convert('RGB')
    ls, cs, hs = [], [], []
    for box in boxes:
        lightness, chroma, hue = oklch(np.asarray(image.crop(box), dtype=float))
        mask = (chroma > 0.05) & (hue > 10) & (hue < 90)
        ls += list(lightness[mask])
        cs += list(chroma[mask])
        hs += list(hue[mask])
    print(f'{label}: pixels {len(ls)}, L p50 {np.median(ls):.3f}, C p50 {np.median(cs):.3f}, '
          f'h p50 {np.median(hs):.1f} deg (p25 {np.percentile(hs, 25):.1f}, '
          f'p75 {np.percentile(hs, 75):.1f})')


measure('reference', REFERENCE, REF_BOXES)
for arg in sys.argv[1:]:
    name, path = arg.split('=', 1)
    measure(name, path, APP_BOXES)
