"""Makes the silhouette masks of the four reference views and measures them.

Run with the system python3 (Pillow only):

    python3 tools/measure.py

Writes:
    out/masks/<view>.png   one mask per view, 255 = bear, on the full sheet size
    out/masks/<view>.raw   the same mask as raw bytes (one byte per pixel, rows from the top)
    out/measure.json       the box, the ground row, the axis column, and the row runs of
                           each view in model units
"""

import json
import os
import sys

from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.path.dirname(HERE), 'animals', 'bear')
SHEET = os.path.join(ROOT, 'reference', 'bear-views.png')
OUT = os.path.join(ROOT, 'out')

# The columns of the sheet that hold each view (x from, x to).
VIEWS = {
    'front': (0, 470),
    'side': (470, 735),
    'back': (735, 1150),
    'three_quarter': (1150, 1536),
}


def is_bear(rgb):
    """Tells if a pixel is on the bear: brown, or dark (nose, eyes, claws)."""
    r, g, b = rgb
    sat = max(r, g, b) - min(r, g, b)
    return sat >= 14 or (r + g + b) < 390


def make_mask(im, x0, x1):
    """Makes the mask of one view column, with holes filled and specks removed."""
    w, h = im.size
    px = im.load()
    mask = Image.new('L', (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(x0, x1):
            if is_bear(px[x, y]):
                mp[x, y] = 255
    # Close small gaps, then remove specks.
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return keep_largest(mask, x0, x1)


def keep_largest(mask, x0, x1):
    """Keeps the largest 4-connected region of the mask, and fills its holes."""
    w, h = mask.size
    mp = mask.load()
    seen = bytearray(w * h)
    best = []
    for sy in range(h):
        for sx in range(x0, x1):
            i = sy * w + sx
            if mp[sx, sy] == 0 or seen[i]:
                continue
            stack = [(sx, sy)]
            seen[i] = 1
            region = []
            while stack:
                x, y = stack.pop()
                region.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if x0 <= nx < x1 and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and mp[nx, ny]:
                            seen[j] = 1
                            stack.append((nx, ny))
            if len(region) > len(best):
                best = region
    out = Image.new('L', (w, h), 0)
    op = out.load()
    for x, y in best:
        op[x, y] = 255
    return fill_holes(out, x0, x1)


def fill_holes(mask, x0, x1):
    """Fills each background region that does not touch the edge of the column."""
    w, h = mask.size
    mp = mask.load()
    outside = bytearray(w * h)
    stack = []
    for x in range(x0, x1):
        stack += [(x, 0), (x, h - 1)]
    for y in range(h):
        stack += [(x0, y), (x1 - 1, y)]
    while stack:
        x, y = stack.pop()
        if not (x0 <= x < x1 and 0 <= y < h):
            continue
        i = y * w + x
        if outside[i] or mp[x, y]:
            continue
        outside[i] = 1
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    for y in range(h):
        for x in range(x0, x1):
            if not mp[x, y] and not outside[y * w + x]:
                mp[x, y] = 255
    return mask


def box(mask, x0, x1):
    """Finds the box of the mask in the column: (left, top, right, bottom), inclusive."""
    bb = mask.crop((x0, 0, x1, mask.size[1])).getbbox()
    return (bb[0] + x0, bb[1], bb[2] - 1 + x0, bb[3] - 1)


def runs_of_row(mp, y, x0, x1):
    """Lists the runs of bear pixels in one row: [(first x, last x), ...]."""
    runs = []
    start = None
    for x in range(x0, x1):
        on = mp[x, y] > 0
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x - 1))
            start = None
    if start is not None:
        runs.append((start, x1 - 1))
    return runs


def central_run(runs, axis):
    """Finds the run that holds the axis column, or None."""
    for left, right in runs:
        if left <= axis <= right:
            return (left, right)
    return None


def main():
    """Writes the masks, the boxes, and the row profiles in model units.

    Model units: the height of the bear (sole to ear top) is 1. x is the left of the bear,
    y is up, z is forward (the axes of three.js and glTF).
    """
    im = Image.open(SHEET).convert('RGB')
    os.makedirs(os.path.join(OUT, 'masks'), exist_ok=True)
    result = {'sheet': list(im.size), 'views': {}}
    for name, (x0, x1) in VIEWS.items():
        mask = make_mask(im, x0, x1)
        mask.save(os.path.join(OUT, 'masks', f'{name}.png'))
        with open(os.path.join(OUT, 'masks', f'{name}.raw'), 'wb') as f:
            f.write(mask.tobytes())
        left, top, right, bottom = box(mask, x0, x1)
        mp = mask.load()
        height = bottom - top + 1
        ground = bottom + 0.5
        rows = {y: runs_of_row(mp, y, x0, x1) for y in range(top, bottom + 1)}

        # The axis: the mean center of the single run in the hip rows (y 0.2 to 0.3).
        centers = []
        for y, runs in rows.items():
            h = (ground - y) / height
            if 0.2 <= h <= 0.3 and len(runs) == 1:
                centers.append((runs[0][0] + runs[0][1] + 1) / 2)
        axis = sum(centers) / len(centers)
        if name == 'side':
            # The z origin of the side view: the center of the shin at y 0.1.
            shin = [r for y, r in rows.items() if abs((ground - y) / height - 0.1) < 0.004]
            axis = sum((r[0][0] + r[0][1] + 1) / 2 for r in shin) / len(shin)

        sign = -1 if name == 'back' else 1
        profile = []
        for y, runs in rows.items():
            h = (ground - y) / height
            model_runs = []
            for a, b in runs:
                u0 = sign * (a - axis) / height
                u1 = sign * (b + 1 - axis) / height
                model_runs.append([round(min(u0, u1), 5), round(max(u0, u1), 5)])
            model_runs.sort()
            central = central_run(runs, int(round(axis)))
            item = {'y': round(h, 5), 'runs': model_runs}
            if central:
                c0 = sign * (central[0] - axis) / height
                c1 = sign * (central[1] + 1 - axis) / height
                item['central'] = [round(min(c0, c1), 5), round(max(c0, c1), 5)]
            profile.append(item)

        result['views'][name] = {
            'column': [x0, x1],
            'box': [left, top, right, bottom],
            'height_px': height,
            'ground_px': ground,
            'axis_px': round(axis, 2),
            'area_px': mask.histogram()[255],
            'profile': profile,
        }
        print(name, {k: v for k, v in result['views'][name].items() if k != 'profile'})
    with open(os.path.join(OUT, 'measure.json'), 'w') as f:
        json.dump(result, f)


if __name__ == '__main__':
    main()
