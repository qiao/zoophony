"""Makes the matte of a model sheet for `pnpm sheet-check` from a config of the sheet.

    uv run --no-project --with pillow --with numpy --with scipy \
        python -I tools/sheet-mattes/make_matte.py tools/sheet-mattes/<id>.json [<check.png>]

The config names the sheet in `docs/reference/` and the rules of its matte. The matte has the size
of the sheet and three values:

- 255: animal. A pixel is animal when it passes the foreground rule, it is above `max_row`, and
  no prop covers it. The matte fills the holes of the animal up to `max_hole` pixels: the eyes,
  the nose, and the pupils.
- 128: ignored. The props that hide parts of the animal: the pixels of a hue rule, the polygons,
  the lines, and the bands of rows. The check does not count these pixels.
- 0: background, and each row from `max_row` down, where the labels or the seat are.

The keys of the config:

- `sheet`: the file of the sheet in `docs/reference/`.
- `foreground`: `min_value` (a pixel brighter than the background), or `min_saturation` and
  `max_dark_value` (a colored pixel, or a dark one, on a gray background).
- `max_row`: the first row that is never animal.
- `hue_props`: props of one color: a hue range in degrees, a lowest saturation and value, a first
  row, the smallest size of a region in pixels, and an edge in pixels that the prop also takes.
- `polygons`: props as polygons of sheet pixels, read from crops of the sheet.
- `lines`: props as lines of sheet pixels: the start, the end, and the width.
- `ignore_rows`: bands of rows that are ignored, from the first row to the row after the last.
- `max_hole`: the largest hole of the animal that the matte fills, in pixels.
- `stairs`: true to ignore the animal pixels in lines of 1 or 2 px at the edge of a prop, which
  are the edges of a thin prop such as a bow.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]


def hsv(rgb):
    """Calculates the hue in degrees, the saturation, and the value of an RGB image in 0 to 1."""
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h * 60, s, mx


def foreground(config, h, s, v):
    """Gives the pixels that pass the foreground rule of the config."""
    rule = config['foreground']
    if 'min_value' in rule:
        return v > rule['min_value']
    return (s > rule['min_saturation']) | (v < rule['max_dark_value'])


def hue_prop(rule, fg, h, s, v, rows):
    """Gives the pixels of a prop of one color, with its edge."""
    low, high = rule['hue']
    prop = fg & (h >= low) & (h <= high) & (s > rule['min_saturation']) & (v > rule['min_value'])
    prop &= rows >= rule['min_row']
    labels, count = ndimage.label(prop)
    sizes = ndimage.sum(prop, labels, range(1, count + 1))
    prop = np.isin(labels, 1 + np.flatnonzero(sizes >= rule['min_size']))
    return ndimage.binary_dilation(prop, iterations=rule['edge']) & fg


def drawn_props(config, width, height):
    """Gives the pixels of the polygons and the lines of the config."""
    drawn = Image.new('L', (width, height), 0)
    pen = ImageDraw.Draw(drawn)
    for polygon in config.get('polygons', []):
        pen.polygon([tuple(p) for p in polygon], fill=255)
    for start, end, line_width in config.get('lines', []):
        pen.line([tuple(start), tuple(end)], fill=255, width=line_width)
    return np.asarray(drawn) > 0


def make_matte(config):
    """Makes the matte of a sheet: 255 animal, 128 ignored, and 0 background."""
    sheet = Image.open(ROOT / 'docs' / 'reference' / config['sheet']).convert('RGB')
    rgb = np.asarray(sheet).astype(np.float32) / 255
    h, s, v = hsv(rgb)
    height, width = v.shape
    rows = np.arange(height)[:, None]
    above = rows < config['max_row']

    fg = foreground(config, h, s, v) & above
    props = drawn_props(config, width, height)
    for rule in config.get('hue_props', []):
        props |= hue_prop(rule, fg, h, s, v, rows)

    holes, count = ndimage.label(~(fg | props))
    sizes = ndimage.sum(~(fg | props), holes, range(1, count + 1))
    small = np.isin(holes, 1 + np.flatnonzero(sizes <= config['max_hole']))
    ignore = props.copy()
    for first, end in config.get('ignore_rows', []):
        ignore |= (rows >= first) & (rows < end)
    animal = (fg | (small & above)) & ~ignore
    if config.get('stairs', False):
        thin = animal & ~ndimage.binary_opening(animal, iterations=1)
        stairs = thin & ndimage.binary_dilation(ignore, iterations=3)
        animal &= ~stairs
        ignore |= stairs

    matte = np.zeros((height, width), np.uint8)
    matte[ignore & above] = 128
    matte[animal] = 255
    return sheet, matte


def main():
    config_path = Path(sys.argv[1])
    config = json.loads(config_path.read_text())
    sheet, matte = make_matte(config)
    out = config_path.with_suffix('.png')
    Image.fromarray(matte).save(out, optimize=True)
    print(out, 'animal px', int((matte == 255).sum()), 'ignored px', int((matte == 128).sum()))

    if len(sys.argv) > 2:
        check = (np.asarray(sheet).astype(np.float32) * 0.45).astype(np.uint8)
        check[matte == 255] = (check[matte == 255] * 0.5 + np.array([0, 120, 60])).astype(np.uint8)
        check[matte == 128] = (check[matte == 128] * 0.5 + np.array([120, 40, 120])).astype(np.uint8)
        Image.fromarray(check).save(sys.argv[2])


if __name__ == '__main__':
    main()
