"""Makes the matte of the fox of `docs/reference/fox-views.png` for the silhouette gates.

    uv run --no-project --with pillow --with numpy --with scipy \
        python tools/spike/fox-gated/sheet_matte.py <sheet.png> <matte.png> [<check.png>]

The matte has the size of the sheet (2494 x 1354 px) and three values:

- 255: fox. A pixel is fox when it is brighter than the background and it is not ignored.
- 128: ignored. The chair, the violin, and the bow. They hide parts of the fox, so a gate
  does not count these pixels as fox or as background.
- 0: background, and the labels below row 1180.

The chair is the gold hue (25.5 to 45 degrees, saturation above 0.5, value above 0.3) below
row 515, plus an edge of 3 px. Above that row, the same hue is lit orange fur. The violin and the bow are polygons
that a person read from gridded crops of the sheet, in sheet pixels.
"""

import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

#: The polygons of the violin bodies, the scrolls, and the frogs, in sheet pixels.
VIOLIN_POLYGONS = [
    # Front view: the body with the chin rest, and the pegbox with the scroll.
    [(413, 505), (420, 468), (445, 448), (470, 430), (500, 413), (545, 418), (600, 433),
     (648, 460), (648, 537), (600, 547), (560, 550), (510, 530), (460, 534), (423, 517)],
    [(698, 468), (745, 468), (777, 483), (798, 515), (788, 548), (756, 558), (718, 548),
     (698, 532)],
    [(372, 628), (398, 628), (398, 665), (372, 665)],
    # Side view.
    [(1198, 452), (1290, 444), (1325, 440), (1400, 457), (1442, 476), (1464, 498),
     (1464, 522), (1452, 540), (1360, 550), (1300, 522), (1230, 542), (1200, 507)],
    [(1503, 493), (1560, 502), (1582, 502), (1603, 518), (1611, 546), (1592, 568),
     (1558, 568), (1538, 547), (1503, 522)],
    [(1252, 618), (1278, 618), (1278, 648), (1252, 648)],
    # Back view.
    [(1853, 463), (1880, 452), (1915, 449), (1950, 457), (1975, 452), (1988, 468),
     (1988, 522), (1962, 543), (1920, 548), (1878, 543), (1855, 512)],
    [(1730, 493), (1760, 485), (1792, 482), (1808, 494), (1808, 532), (1792, 548),
     (1760, 553), (1732, 537)],
]

#: The bows as center lines, in sheet pixels: (start, end, width).
BOW_LINES = [
    ((643, 284), (388, 650), 14),
    ((1447, 320), (1262, 636), 14),
    ((1840, 307), (1960, 462), 12),
]

#: The first row of the labels under the views.
LABEL_ROW = 1180

#: The first row where the gold hue is the chair and not lit fur.
CHAIR_ROW = 515

#: The width of the soft edge of the chair, in pixels, that the matte adds to the chair.
CHAIR_EDGE = 3

#: The largest hole in the fox, in pixels, that the matte fills (the pupils and the nose).
MAX_HOLE = 700


def hsv(rgb):
    """Calculates the hue in degrees, the saturation, and the value of an RGB image in 0 to 1."""
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx


def main():
    sheet = Image.open(sys.argv[1]).convert('RGB')
    rgb = np.asarray(sheet).astype(np.float32) / 255
    h, s, v = hsv(rgb)
    height, width = v.shape
    rows = np.arange(height)[:, None]

    fg = (v > 0.17) & (rows < LABEL_ROW)

    chair = fg & (h >= 25.5) & (h <= 45) & (s > 0.5) & (v > 0.3) & (rows >= CHAIR_ROW)
    labels, count = ndimage.label(chair)
    sizes = ndimage.sum(chair, labels, range(1, count + 1))
    chair = np.isin(labels, 1 + np.flatnonzero(sizes >= 400))
    chair = ndimage.binary_dilation(chair, iterations=CHAIR_EDGE) & fg

    drawn = Image.new('L', (width, height), 0)
    pen = ImageDraw.Draw(drawn)
    for polygon in VIOLIN_POLYGONS:
        pen.polygon(polygon, fill=255)
    for start, end, line_width in BOW_LINES:
        pen.line([start, end], fill=255, width=line_width)
    violin = np.asarray(drawn) > 0

    ignore = chair | violin
    solid = fg | ignore
    holes, count = ndimage.label(~solid)
    sizes = ndimage.sum(~solid, holes, range(1, count + 1))
    small = np.isin(holes, 1 + np.flatnonzero(sizes <= MAX_HOLE))
    fox = (fg | small) & ~ignore

    matte = np.zeros((height, width), np.uint8)
    matte[ignore & (rows < LABEL_ROW)] = 128
    matte[fox] = 255
    Image.fromarray(matte).save(sys.argv[2], optimize=True)
    print('fox px', int(fox.sum()), 'ignored px', int((matte == 128).sum()))

    if len(sys.argv) > 3:
        check = (np.asarray(sheet).astype(np.float32) * 0.45).astype(np.uint8)
        check[matte == 255] = (check[matte == 255] * 0.5 + np.array([0, 120, 60])).astype(np.uint8)
        check[matte == 128] = (check[matte == 128] * 0.5 + np.array([120, 40, 120])).astype(np.uint8)
        Image.fromarray(check).save(sys.argv[3])


if __name__ == '__main__':
    main()
