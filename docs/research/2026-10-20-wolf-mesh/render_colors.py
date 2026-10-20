"""Measures the Oklab lightness, hue, and chroma of the plain fur, the chest, and the muzzle of the
wolf in renders of the base and of the round (gallery light and stage light), and in crops of the
sheet `docs/reference/wolf-turnaround.png`. Each value is the median over the pixels of a box.
It also draws each box on a copy of its image (`<out>/boxes-*.png`).

    uv run --no-project --with pillow --with numpy python -I render_colors.py <root> <renders> <out>

<renders> holds `base/face.png`, `base/body.png`, `new/face.png`, `new/body.png` (gallery,
`docs/research/2026-10-20-badger-mesh/face-shots.ts`), and `stage-base.png`, `stage-new.png` (`pnpm close-views play --at wolf
--zoom 0.8 --azimuth -30 --elevation 25 --base 24e47a7e`).
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


def measure(im, box):
    x0, y0, x1, y1 = box
    lab = oklab(np.asarray(im, float)[y0:y1, x0:x1, :3].reshape(-1, 3) / 255)
    L, a, b = np.median(lab[:, 0]), np.median(lab[:, 1]), np.median(lab[:, 2])
    return L, np.degrees(np.arctan2(b, a)) % 360, np.hypot(a, b)


root, renders, out = sys.argv[1:4]
SETS = {
    'sheet': (f'{root}/docs/reference/wolf-turnaround.png', {
        'fur (head top)': (185, 190, 215, 215),
        'fur (back)': (870, 330, 960, 480),
        'chest': (170, 380, 230, 470),
        'muzzle (cheek)': (145, 285, 180, 300),
    }),
}
for tree in ('base', 'new'):
    SETS[f'gallery {tree} face'] = (f'{renders}/{tree}/face.png', {
        'fur (head top)': (360, 330, 440, 380),
        'muzzle (cheek)': (235, 505, 320, 550),
        'chest': (290, 660, 370, 760),
    })
    SETS[f'gallery {tree} body'] = (f'{renders}/{tree}/body.png', {
        'fur (upper arm)': (320, 330, 345, 390),
        'fur (thigh)': (330, 520, 355, 580),
        'chest': (375, 290, 395, 330),
    })
    SETS[f'stage {tree}'] = (f'{renders}/stage-{tree}.png', {
        'fur (head top)': (1010, 268, 1050, 292),
        'fur (side)': (1065, 430, 1095, 470),
        'chest': (1010, 430, 1045, 470),
        'muzzle (cheek)': (982, 355, 1003, 372),
    })
for name, (path, boxes) in SETS.items():
    im = Image.open(path).convert('RGB')
    draw = ImageDraw.Draw(im)
    for part, box in boxes.items():
        L, hue, chroma = measure(im, box)
        print(f'{name:22s} {part:16s} L {L:.3f}  hue {hue:5.1f}  chroma {chroma:.4f}')
        draw.rectangle(box, outline=(0, 255, 0))
    im.save(f'{out}/boxes-{name.replace(" ", "-")}.png')
