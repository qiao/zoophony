"""Makes the matte of the bear of `docs/reference/bear-views.png` for `pnpm sheet-check bear`.

    uv run --no-project --with pillow --with numpy --with scipy \
        python -I tools/sheet-mattes/bear_matte.py docs/reference/bear-views.png \
        tools/sheet-mattes/bear.png [<check.png>]

The matte has the size of the sheet (1536 x 1024 px) and three values:

- 255: bear. A pixel is bear when it is brown (saturation above 0.15) or dark (value below
  0.4), above the top of the podium. The matte fills the small holes of the eyes.
- 128: ignored. The batons, and the top face of the podium, where the paws stand. The batons
  are lines that a person read from the sheet, in sheet pixels.
- 0: background, the podium below its top face, and the labels.

The background is light gray with gray lines, and these have a saturation below 0.03.
"""

import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

#: The batons as center lines, in sheet pixels: (hand end, tip, width). The sheet has a baton
#: in each paw. The app gives the bear one baton, in the right paw, so the matte ignores both.
BATON_LINES = [
    ((110, 248), (184, 98), 16),
    ((457, 256), (418, 135), 16),
    ((903, 262), (941, 132), 16),
    ((1083, 258), (1120, 138), 16),
    ((1428, 256), (1385, 130), 16),
]

#: The first row of the top face of the podium. The paws stand on this face.
PODIUM_TOP = 722

#: The first row of the front face of the podium.
PODIUM_FRONT = 740

#: The largest hole in the bear, in pixels, that the matte fills (the eyes and the nose).
MAX_HOLE = 400


def main():
    sheet = Image.open(sys.argv[1]).convert('RGB')
    rgb = np.asarray(sheet).astype(np.float32) / 255
    high = rgb.max(-1)
    low = rgb.min(-1)
    saturation = (high - low) / np.maximum(high, 1e-6)
    height, width = high.shape
    rows = np.arange(height)[:, None]

    fg = ((saturation > 0.15) | (high < 0.4)) & (rows < PODIUM_FRONT)

    drawn = Image.new('L', (width, height), 0)
    pen = ImageDraw.Draw(drawn)
    for start, end, line_width in BATON_LINES:
        pen.line([start, end], fill=255, width=line_width)
    baton = np.asarray(drawn) > 0

    holes, count = ndimage.label(~(fg | baton))
    sizes = ndimage.sum(~(fg | baton), holes, range(1, count + 1))
    small = np.isin(holes, 1 + np.flatnonzero(sizes <= MAX_HOLE))
    fg |= small & (rows < PODIUM_FRONT)

    ignore = baton | ((rows >= PODIUM_TOP) & (rows < PODIUM_FRONT))
    bear = fg & ~ignore

    matte = np.zeros((height, width), np.uint8)
    matte[ignore] = 128
    matte[bear] = 255
    Image.fromarray(matte).save(sys.argv[2], optimize=True)
    print('bear px', int(bear.sum()), 'ignored px', int(ignore.sum()))

    if len(sys.argv) > 3:
        check = (np.asarray(sheet).astype(np.float32) * 0.45).astype(np.uint8)
        check[matte == 255] = (check[matte == 255] * 0.5 + np.array([0, 120, 60])).astype(np.uint8)
        check[matte == 128] = (check[matte == 128] * 0.5 + np.array([120, 40, 120])).astype(np.uint8)
        Image.fromarray(check).save(sys.argv[3])


if __name__ == '__main__':
    main()
