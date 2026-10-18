"""Draws the image of the options of `pnpm mesh-options` (tools/mesh-options.ts) from its plan.

    uv run --no-project --with pillow --with numpy python -I tools/mesh_options.py <plot.json>

The plan gives the path of the image, the pixels for each meter of the rows with one scale, the
faces of the body of the working tree, and the rows. Each cell of a row is a tile of a preview
sheet of tools/blender/rig_mesh.py (500 px for each view), or the body of the working tree, which
this script draws with flat faces in the front view. A cell with pixels for each meter takes the
scale of the plan, and its floor row lies on the floor line of its row. A cell with no scale keeps
the height of KNEE_HEIGHT.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

#: The size of one view of a preview sheet, in pixels.
VIEW = 500
#: The color of the page around the cells.
PAGE = (27, 27, 27)
#: The color of the titles of the rows.
TITLE = (235, 200, 120)
#: The color of the labels.
LABEL = (225, 225, 225)
#: The color of the background of a cell with no preview, as the world of the previews.
CELL = (61, 61, 61)
#: The height of a cell with no scale, in pixels.
KNEE_HEIGHT = 300
#: The space between two cells and around the page, in pixels.
GAP = 8
#: The space at each side of the body in a cropped cell, in pixels.
PAD = 12
#: The height of one line of a label, in pixels.
LINE = 20

FONT = ImageFont.load_default(size=16)
TITLE_FONT = ImageFont.load_default(size=18)


def srgb(linear):
    """Gives the sRGB bytes of linear colors."""
    c = np.clip(linear, 0.0, 1.0)
    s = np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)
    return np.round(s * 255).astype(np.uint8)


def draw_body(body, scale):
    """Draws the faces of the body of the working tree in the front view at `scale` pixels for
    each meter, with the floor on the bottom row. The model faces -z, so the screen x is -x, and
    the faces far from the viewer come first."""
    p = np.asarray(body['positions'], float).reshape(-1, 3, 3)
    c = np.asarray(body['colors'], float).reshape(-1, 3, 3).mean(axis=1)
    n = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    front = n[:, 2] < 0
    p, c, n = p[front], c[front], n[front]
    light = np.array([0.35, 0.55, -1.0])
    light /= np.linalg.norm(light)
    shade = 0.4 + 0.6 * np.clip(n @ light, 0, None)
    colors = srgb(c * shade[:, None])
    order = np.argsort(-p[:, :, 2].mean(axis=1))
    x0, x1 = (-p[:, :, 0]).min(), (-p[:, :, 0]).max()
    top = p[:, :, 1].max()
    k = 2  # Draw at two times the size, then scale down for smooth edges.
    w = int((x1 - x0) * scale * k) + 2 * PAD * k
    h = int(top * scale * k) + 2 * PAD * k
    im = Image.new('RGB', (w, h), CELL)
    d = ImageDraw.Draw(im)
    for f in order:
        pts = [(PAD * k + (-v[0] - x0) * scale * k, h - PAD * k - v[1] * scale * k) for v in p[f]]
        d.polygon(pts, fill=tuple(int(x) for x in colors[f]))
    im = im.resize((w // k, h // k), Image.LANCZOS)
    return im, im.height - PAD


def tile(cell):
    """Gives the tile of a preview cell."""
    sheet = Image.open(cell['image']).convert('RGB')
    x = cell['tile'] * VIEW
    return sheet.crop((x, 0, x + VIEW, VIEW))


def crop_columns(im):
    """Crops the columns of a tile that show only the background, and keeps PAD pixels at each
    side of the body."""
    a = np.asarray(im).astype(int)
    back = a[0, 0]
    used = np.where((np.abs(a - back).sum(axis=2) > 12).any(axis=0))[0]
    if len(used) == 0:
        return im
    return im.crop((max(0, used[0] - PAD), 0, min(im.width, used[-1] + 1 + PAD), im.height))


def scaled_cell(cell, scale):
    """Gives the image of a cell at one scale, and its floor row."""
    f = scale / cell['pxPerMeter']
    im = tile(cell)
    im = im.resize((round(VIEW * f), round(VIEW * f)), Image.LANCZOS)
    return crop_columns(im), cell['floorRow'] * f


def free_cell(cell):
    """Gives the image of a cell with no scale, at the height of KNEE_HEIGHT."""
    im = tile(cell)
    return im.resize((round(im.width * KNEE_HEIGHT / im.height), KNEE_HEIGHT), Image.LANCZOS)


def row_image(row, plan):
    """Draws one row: its title, its cells on one floor line, and the label of each cell."""
    parts = []
    for cell in row['cells']:
        if cell['image'] is None:
            im, floor = draw_body(plan['body'], plan['scale'])
        elif cell['pxPerMeter'] is not None:
            im, floor = scaled_cell(cell, plan['scale'])
        else:
            im = free_cell(cell)
            floor = im.height
        parts.append((im, floor, cell['labels']))
    above = max(int(round(floor)) for _, floor, _ in parts)
    below = max(im.height - int(round(floor)) for im, floor, _ in parts)
    lines = max(len(labels) for _, _, labels in parts)
    title_h = 30
    title_w = int(ImageDraw.Draw(Image.new('RGB', (1, 1))).textlength(row['title'], font=TITLE_FONT))
    width = max(GAP + sum(im.width + GAP for im, _, _ in parts), title_w + 2 * GAP)
    height = title_h + above + below + lines * LINE + GAP
    page = Image.new('RGB', (width, height), PAGE)
    d = ImageDraw.Draw(page)
    d.text((GAP, 6), row['title'], fill=TITLE, font=TITLE_FONT)
    x = GAP
    for im, floor, labels in parts:
        y = title_h + above - int(round(floor))
        page.paste(im, (x, y))
        for k, text in enumerate(labels):
            d.text((x + 2, title_h + above + below + 4 + k * LINE), text, fill=LABEL, font=FONT)
        x += im.width + GAP
    return page


def main():
    plan = json.load(open(sys.argv[1]))
    rows = [row_image(row, plan) for row in plan['rows'] if row['cells']]
    width = max(r.width for r in rows)
    page = Image.new('RGB', (width, sum(r.height for r in rows) + GAP), PAGE)
    y = 0
    for r in rows:
        page.paste(r, (0, y))
        y += r.height
    page.save(plan['out'])
    print(f"Wrote {plan['out']} ({page.width} x {page.height} px)")


main()
