"""Measures the Oklab lightness, hue, and chroma of the white stripe, the black eye stripes, the
cheeks, the nose, the front fur, the back fur, and the arm fur of the badger in crops of the sheet
`docs/reference/badger-turnaround.png`, and in renders of the app: the gallery face of
`face-shots.ts` and the play frame of the stage. Each value is the median over the pixels of a box.
It draws each box on a copy of its image (`<out>/boxes-*.png`).

    uv run --no-project --with pillow --with numpy python -I face_colors.py <root> <face.png> <stage.png> <out>
"""
import sys

import numpy as np
from PIL import Image, ImageDraw


def oklab(srgb):
    c = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    lms = c @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                        [0.2119034982, 0.6806995451, 0.1073969566],
                        [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                                    [1.9779984951, -2.4285922050, 0.4505937099],
                                    [0.0259040371, 0.7827717662, -0.8086757660]]).T


root, face, stage, out = sys.argv[1:5]
SETS = {
    'sheet': (f'{root}/docs/reference/badger-turnaround.png', {
        'white stripe': (180, 230, 195, 270),
        'eye stripe': (160, 270, 172, 300),
        'cheek': (105, 300, 130, 315),
        'nose': (180, 318, 195, 328),
        'front fur': (160, 400, 210, 450),
        'arm fur': (70, 425, 90, 475),
        'back fur': (920, 400, 980, 500),
    }),
    'gallery': (face, {
        'white stripe': (370, 230, 430, 330),
        'eye stripe': (470, 240, 530, 300),
        'cheek': (180, 420, 240, 470),
        'nose': (380, 540, 420, 580),
        'front fur': (250, 680, 330, 760),
    }),
}
if stage != '-':
    SETS['stage'] = (stage, {})
for name, (path, boxes) in SETS.items():
    im = Image.open(path).convert('RGB')
    draw = ImageDraw.Draw(im)
    for part, (x0, y0, x1, y1) in boxes.items():
        lab = oklab(np.asarray(im, float)[y0:y1, x0:x1].reshape(-1, 3) / 255)
        L, a, b = np.median(lab[:, 0]), np.median(lab[:, 1]), np.median(lab[:, 2])
        print(f'{name:8s} {part:13s} L {L:.3f}  hue {np.degrees(np.arctan2(b, a)) % 360:5.1f}  chroma {np.hypot(a, b):.4f}')
        draw.rectangle((x0, y0, x1, y1), outline=(0, 255, 0))
    im.save(f'{out}/boxes-{name}.png')
