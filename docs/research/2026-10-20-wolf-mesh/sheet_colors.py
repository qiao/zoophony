"""Measures the Oklab lightness, hue, and chroma of the fur and the chest of the wolf in the sheet
`docs/reference/wolf-turnaround.png`, of the wolf of the two orchestra images, and of the colors of
`SPECIES_COLORS.wolf`, in boxes of the image pixels.

    uv run --no-project --with pillow --with numpy python -I sheet_colors.py <root>
"""
import sys

import numpy as np
from PIL import Image


def oklab(srgb):
    c = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    lms = c @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                        [0.2119034982, 0.6806995451, 0.1073969566],
                        [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                    [1.9779984951, -2.4285922050, 0.4505937099],
                                    [0.0259040371, 0.7827717662, -0.8086757660]]).T


def show(name, srgb):
    lab = oklab(np.asarray(srgb, float).reshape(-1, 3))
    L = np.median(lab[:, 0])
    a, b = np.median(lab[:, 1]), np.median(lab[:, 2])
    print(f'{name}: L {L:.3f}, hue {np.degrees(np.arctan2(b, a)) % 360:.0f}, chroma {np.hypot(a, b):.3f} '
          f'(a {a:+.4f}, b {b:+.4f}), {len(lab)} px')


root = sys.argv[1]
for name, hexa in (('SPECIES_COLORS.wolf fur #bab2aa', 'bab2aa'), ('SPECIES_COLORS.wolf belly #f0ece4', 'f0ece4'),
                   ('SPECIES_COLORS.wolf accent #8a807a', '8a807a')):
    show(name, [[int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4)]])
boxes = {
    'wolf-turnaround.png': {
        'sheet front: upper arm fur (x 100..115, y 430..460)': (100, 430, 115, 460),
        'sheet front: head top fur (x 185..215, y 190..215)': (185, 190, 215, 215),
        'sheet front: chest (x 170..230, y 380..470)': (170, 380, 230, 470),
        'sheet front: belly (x 175..225, y 520..600)': (175, 520, 225, 600),
        'sheet front: thigh side fur (x 130..150, y 640..700)': (130, 640, 150, 700),
        'sheet back: back fur (x 870..960, y 330..480)': (870, 330, 960, 480),
        'sheet front: lower legs (x 118..138, y 740..800)': (118, 740, 138, 800),
        'sheet side: tail tip (x 400..450, y 740..800)': (400, 740, 450, 800),
    },
    'orchestra-latest.png': {
        'orchestra-latest: wolf belly (x 1640..1660, y 600..640)': (1640, 600, 1660, 640),
        'orchestra-latest: wolf side fur (x 1660..1672, y 575..600)': (1660, 575, 1672, 600),
    },
    'orchestra-side.png': {
        'orchestra-side: wolf belly (x 1880..1895, y 640..670)': (1880, 640, 1895, 670),
    },
}
for image, crops in boxes.items():
    im = np.asarray(Image.open(f'{root}/docs/reference/{image}').convert('RGB'), float) / 255
    for name, (x0, y0, x1, y1) in crops.items():
        show(name, im[y0:y1, x0:x1])
