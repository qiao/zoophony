"""Measures the black pixels on the white belly under each arm: the share of the pixels with an
Oklab lightness below 0.3 in boxes below the band edge of main, in the renders of shots.ts
(600 x 750) and in the stage close shot (1440 x 900): black.py <shots dir> [<stage png>]"""
import sys
import numpy as np
from PIL import Image

BOXES = {
    'rest-left': [(110, 365, 450, 560)],
    'rest-q-left': [(110, 400, 460, 600)],
    'rest-right': [(170, 360, 450, 540)],
    'rest-q-right': [(120, 440, 290, 560), (115, 295, 190, 420)],
    'first-left': [(110, 385, 460, 600)],
    'first-q-left': [(110, 425, 460, 600)],
    'first-right': [(170, 380, 450, 540)],
    'first-q-right': [(120, 440, 290, 560), (115, 295, 190, 420)],
    'first-front': [(425, 385, 475, 470)],
}
STAGE = [(930, 600, 1070, 720), (1130, 500, 1260, 600)]


def lightness(rgb):
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                  [0.2119034982, 0.6806995451, 0.1073969566],
                  [0.0883024619, 0.2817188376, 0.6299787005]])
    return np.cbrt(lin @ m.T) @ np.array([0.2104542553, 0.7936177850, -0.0040720468])


def share(path, boxes):
    im = np.asarray(Image.open(path).convert('RGB'), float)
    dark = total = 0
    for x0, y0, x1, y1 in boxes:
        L = lightness(im[y0:y1, x0:x1])
        dark += int((L < 0.3).sum())
        total += L.size
    return dark / total


values = []
for name, boxes in BOXES.items():
    v = share(f'{sys.argv[1]}/{name}.png', boxes)
    values.append(v)
    print(f'{name}: black share {100 * v:.2f}%')
if len(sys.argv) > 2:
    v = share(sys.argv[2], STAGE)
    values.append(v)
    print(f'stage close shot: black share {100 * v:.2f}%')
print(f'mean {100 * np.mean(values):.2f}%')
