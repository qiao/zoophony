"""Measures the facet contrast of the fur of the studio bodies in crops of the reference images
and of the app renders at each crease angle.

    uv run --no-project --with pillow --with numpy --with scipy \
        python -I measure.py <render dir> <out dir> [<label>...]

The facet contrast is the median of the absolute band-pass of the luminance over its local mean, in percent, in
the eroded fur mask of a crop. Each crop first scales so that the animal is 300 px high. The
band-pass is the blur of 1 px less the blur of 6 px, so it holds the steps between neighbor
facets and drops the grain and the shading of the whole body. The mask is a set of boxes inside the fur
of the torso, the back, and the legs, with a color rule of the fur eroded by 2 px, so that the
silhouette, the eyes, the nose, and the props do not count.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

REF = Path(__file__).resolve().parents[2] / 'reference'
TARGET = 300
ERODE = 2


def hsv(rgb):
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return sat, mx


def fur_mask(rgb, animal):
    """The fur rule of each animal on sRGB values from 0 to 1. The boxes lie inside the fur, so the
    rule only drops the props, the eyes, and a gray background in a box."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    sat, val = hsv(rgb)
    if animal in ('rabbit', 'polar'):
        return (val > 0.2) & (sat < 0.45) & (r >= b + 0.02)
    return (val > 0.08) & (r > g) & (g >= b) & (sat > 0.2)


PAD = 30


def contrast(path, boxes, height, animal, save=None):
    img = np.asarray(Image.open(path).convert('RGB')).astype(np.float64) / 255
    scale = TARGET / height
    values = []
    weights = []
    overlay = []
    for box in boxes:
        x0, y0 = max(0, box[0] - PAD), max(0, box[1] - PAD)
        x1, y1 = min(img.shape[1], box[2] + PAD), min(img.shape[0], box[3] + PAD)
        crop = img[y0:y1, x0:x1]
        size = (max(1, round(crop.shape[1] * scale)), max(1, round(crop.shape[0] * scale)))
        crop = np.asarray(Image.fromarray((crop * 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(np.float64) / 255
        lum = crop @ [0.2126, 0.7152, 0.0722]
        inside = np.zeros(lum.shape, bool)
        inside[round((box[1] - y0) * scale):round((box[3] - y0) * scale), round((box[0] - x0) * scale):round((box[2] - x0) * scale)] = True
        mask = ndimage.binary_erosion(fur_mask(crop, animal), iterations=ERODE) & inside
        small = ndimage.gaussian_filter(lum, 1.0)
        large = ndimage.gaussian_filter(lum, 6.0)
        band = (small - large) / np.maximum(large, 0.02)
        if mask.sum() > 0:
            values.append(float(np.median(np.abs(band[mask]))))
            weights.append(int(mask.sum()))
        vis = crop.copy()
        vis[mask] = vis[mask] * 0.5 + np.array([0, 0.5, 0])
        overlay.append(vis)
    if save:
        h = max(o.shape[0] for o in overlay)
        joined = np.concatenate([np.pad(o, ((0, h - o.shape[0]), (0, 0), (0, 0))) for o in overlay], axis=1)
        Image.fromarray((joined * 255).astype(np.uint8)).save(save)
    total = sum(weights)
    return 100 * sum(v * w for v, w in zip(values, weights)) / max(total, 1), total


# The crops: (file, boxes, animal height in px, fur rule). The sheet pages share the scale of
# their sheets, so they take the height of the sheet animal.
ORCH = 'orchestra-latest.png'
# The boxes lie inside the fur of the torso, the back, and the legs, read from grids over each
# image (grid-*.png of this folder).
REFS = {
    'rabbit': {
        'sheet': ('rabbit-views.png', [(145, 355, 275, 435), (530, 350, 640, 430), (1025, 355, 1110, 400), (1030, 200, 1100, 270)], 434),
        'scene': (ORCH, [(155, 740, 200, 800), (240, 690, 280, 760), (345, 660, 380, 730), (480, 815, 515, 880)], 170),
    },
    'bear': {
        'sheet': ('bear-views.png', [(180, 330, 380, 580), (650, 380, 800, 580), (1150, 330, 1360, 520)], 580),
        'scene': (ORCH, [(960, 810, 1080, 980)], 270),
    },
    'polar': {
        'sheet': ('polar-bear-views.png', [(125, 155, 230, 220), (440, 150, 530, 300), (975, 140, 1135, 310)], 306),
        'scene': (ORCH, [(140, 900, 240, 1030)], 225),
    },
}
APP = {
    'rabbit': {
        'sheet': ('sheet-rabbit', [(160, 420, 260, 495), (525, 420, 615, 500), (1020, 405, 1110, 470), (1025, 280, 1100, 340)], 434),
        'scene': ('play', [(615, 1130, 660, 1165), (535, 1215, 590, 1280), (738, 1295, 785, 1360), (845, 1125, 900, 1185)], 210),
    },
    'bear': {
        'sheet': ('sheet-bear', [(180, 350, 380, 590), (650, 450, 820, 600), (1150, 350, 1360, 550)], 580),
        'scene': ('play', [(1380, 1110, 1510, 1280)], 270),
    },
    'polar': {
        'sheet': ('sheet-polar-bear', [(130, 190, 260, 245), (120, 285, 270, 360), (450, 170, 560, 350), (975, 160, 1120, 340)], 306),
        'scene': ('play', [(740, 730, 850, 870)], 240),
    },
}


def main():
    renders = Path(sys.argv[1])
    out = Path(sys.argv[2])
    labels = sys.argv[3:] or ['flat', '20', '35', '50', '65', '180']
    out.mkdir(parents=True, exist_ok=True)
    for animal in ('rabbit', 'bear', 'polar'):
        print(f'## {animal}')
        ref = {}
        for kind in ('sheet', 'scene'):
            file, boxes, height = REFS[animal][kind]
            ref[kind] = contrast(REF / file, boxes, height, animal, out / f'mask-ref-{animal}-{kind}.png')
            print(f'reference {kind}: {ref[kind][0]:.2f} % ({ref[kind][1]} px)')
        print('| Angle | Sheet page | Play frame | Sheet reference | Scene reference | Sum of differences |')
        for label in labels:
            row = {}
            for kind in ('sheet', 'scene'):
                name, boxes, height = APP[animal][kind]
                save = out / f'mask-app-{animal}-{kind}.png' if label == labels[0] else None
                row[kind] = contrast(renders / f'{label}-{name}.png', boxes, height, animal, save)
            diff = abs(row['sheet'][0] - ref['sheet'][0]) + abs(row['scene'][0] - ref['scene'][0])
            print(f"| {label} | {row['sheet'][0]:.2f} ({row['sheet'][1]} px) | {row['scene'][0]:.2f} ({row['scene'][1]} px) | {ref['sheet'][0]:.2f} | {ref['scene'][0]:.2f} | {diff:.2f} |")


main()
