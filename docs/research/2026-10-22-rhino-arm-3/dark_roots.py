"""Counts the dark pixels at the arm roots of the tubist in the `noshadow` probe (no cast shadow).

The images come from `pnpm close-views tubist <dir> --views left,right,150,-150 --moments
note,between,rest,lift50,lower50 --probe noshadow --elevation <e> --zoom 2 --scale 2`, for main
and for the round (`--glb`). A pixel is black below the Oklab lightness 0.3 and dark below 0.45.
Each view has one box around the arm root (`BOXES`, pixels of the 720 x 900 image). With `--draw
<out.png>`, it draws the boxes on the images of one moment.

    uv run --no-project --with pillow --with numpy python -I dark_roots.py <main dir> <round dir>
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

#: The box of the arm root in each view: x, y, width, height.
BOXES = {
    'left': (200, 230, 400, 420),
    'right': (100, 230, 400, 420),
    'az150': (380, 200, 300, 450),
    'az-150': (40, 200, 300, 450),
}
MOMENTS = ['note', 'between', 'rest', 'lift50', 'lower50']


def lightness(rgb):
    """Gives the Oklab lightness of sRGB pixels from 0 to 255."""
    c = rgb / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    lms = lin @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                          [0.2119034982, 0.6806995451, 0.1073969566],
                          [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([0.2104542553, 0.7936177850, -0.0040720468])


def counts(path, box):
    """Gives the black and the dark pixels of the box of an image."""
    x, y, w, h = box
    rgb = np.asarray(Image.open(path).convert('RGB'), float)[y:y + h, x:x + w]
    light = lightness(rgb)
    return int((light < 0.3).sum()), int((light < 0.45).sum())


def main():
    args = sys.argv[1:]
    if args[0] == '--draw':
        out, folder, moment = args[1], args[2], args[3]
        tiles = []
        for view, box in BOXES.items():
            im = Image.open(f'{folder}/tubist-noshadow-{moment}-{view}.png').convert('RGB')
            ImageDraw.Draw(im).rectangle((box[0], box[1], box[0] + box[2], box[1] + box[3]),
                                         outline=(255, 0, 0), width=3)
            tiles.append(im)
        sheet = Image.new('RGB', (720 * len(tiles), 900))
        for k, im in enumerate(tiles):
            sheet.paste(im, (720 * k, 0))
        sheet.save(out)
        return
    base, tree = args
    print('| Moment | View | Black main | Black round | Dark main | Dark round |')
    print('|---|---|---:|---:|---:|---:|')
    total = np.zeros(4, int)
    for moment in MOMENTS:
        for view, box in BOXES.items():
            b = counts(f'{base}/tubist-noshadow-{moment}-{view}.png', box)
            r = counts(f'{tree}/tubist-noshadow-{moment}-{view}.png', box)
            total += [b[0], r[0], b[1], r[1]]
            print(f'| {moment} | {view} | {b[0]} | {r[0]} | {b[1]} | {r[1]} |')
    print(f'| all | all | {total[0]} | {total[1]} | {total[2]} | {total[3]} |')


main()
