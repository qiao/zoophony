"""Stage "intake": makes the silhouette masks of the sheet views and measures them.

Run with the system python3 (Pillow only); the CLI runs it:

    python3 studio/intake.py <animal> [--out DIR]

The config gives the sheet, the columns of each view, and the foreground rule (intake.foreground):

    colored     a pixel is on the animal when it is colored or dark (sheet.foreground). A neutral
                white or gray fur on a gray background does not separate.
    difference  a pixel is on the animal when it differs from the measured background color at
                its place (a smooth background model), with a soft edge and a cleanup. A darker
                pixel needs a larger difference, so a soft ground shadow stays out.

Writes:
    <out>/masks/<view>.png   one mask per view, 255 = animal, on the full sheet size
    <out>/masks/<view>.raw   the same mask as raw bytes (one byte per pixel, rows from the top)
    <out>/measure.json       the box, the ground row, the axis column, and the row runs of each
                             view in model units
"""

import argparse
import json
import os
import statistics
import sys

from PIL import Image, ImageChops, ImageFilter, ImageMath

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config  # noqa: E402

# The cell size in pixels of the background model of the difference rule.
BACKGROUND_CELL = 32

# The rough figure of the background model: a pixel whose summed difference from the border
# color is over this, grown by BACKGROUND_PAD pixels, is no background sample.
ROUGH_DIFFERENCE = 40
BACKGROUND_PAD = 12

# The ground shadow of the difference rule: a run of figure pixels in a column that is shorter
# than SHADOW_RUN of the figure height and ends within GROUND_BAND of the figure height above
# the lowest figure row.
SHADOW_RUN = 0.03
GROUND_BAND = 0.05


def is_animal(rgb, fg):
    """Tells if a pixel is on the animal: colored, or dark (nose, eyes, claws)."""
    r, g, b = rgb
    sat = max(r, g, b) - min(r, g, b)
    return sat >= fg.min_saturation or (r + g + b) < fg.max_dark_sum


def border_color(im):
    """Finds the most common color of the border pixels of a sheet (every 7th pixel)."""
    w, h = im.size
    px = im.load()
    border = [px[x, y] for x in range(0, w, 7) for y in (0, h - 1)]
    border += [px[x, y] for y in range(0, h, 7) for x in (0, w - 1)]
    return max(set(border), key=border.count)


def background_model(im, color):
    """Estimates the background color at each pixel of a sheet.

    The pixels that differ from the border color by more than ROUGH_DIFFERENCE, grown by
    BACKGROUND_PAD, are the rough figure. Each cell of BACKGROUND_CELL pixels gets the median
    color of its other pixels. A cell with too few samples takes the mean of its neighbors. The
    grid is smoothed and scaled up with a bilinear filter. Returns an RGB image of the sheet size.
    """
    w, h = im.size
    flat = Image.new('RGB', (w, h), tuple(color))
    diff = ImageChops.difference(im, flat).convert('L', (1, 1, 1, 0))
    rough = diff.point(lambda v: 255 if v > ROUGH_DIFFERENCE else 0)
    rough = rough.filter(ImageFilter.MaxFilter(2 * BACKGROUND_PAD + 1))
    px, rp = im.load(), rough.load()
    gw, gh = -(-w // BACKGROUND_CELL), -(-h // BACKGROUND_CELL)
    grid = {}
    for gy in range(gh):
        for gx in range(gw):
            samples = [px[x, y]
                       for y in range(gy * BACKGROUND_CELL, min(h, (gy + 1) * BACKGROUND_CELL), 2)
                       for x in range(gx * BACKGROUND_CELL, min(w, (gx + 1) * BACKGROUND_CELL), 2)
                       if not rp[x, y]]
            if len(samples) >= BACKGROUND_CELL * BACKGROUND_CELL // 16:
                grid[gx, gy] = tuple(statistics.median(c[k] for c in samples) for k in range(3))
    if not grid:
        return flat
    missing = [(gx, gy) for gy in range(gh) for gx in range(gw) if (gx, gy) not in grid]
    while missing:
        filled = {}
        for gx, gy in missing:
            near = [grid[n] for n in ((gx - 1, gy), (gx + 1, gy), (gx, gy - 1), (gx, gy + 1))
                    if n in grid]
            if near:
                filled[gx, gy] = tuple(sum(c[k] for c in near) / len(near) for k in range(3))
        grid.update(filled)
        missing = [m for m in missing if m not in filled]
    small = Image.new('RGB', (gw, gh))
    sp = small.load()
    for (gx, gy), c in grid.items():
        sp[gx, gy] = tuple(int(round(v)) for v in c)
    small = small.filter(ImageFilter.SMOOTH)
    big = small.resize((gw * BACKGROUND_CELL, gh * BACKGROUND_CELL), Image.Resampling.BILINEAR)
    return big.crop((0, 0, w, h))


def difference_figure(im, background, rule):
    """Makes the figure of the difference rule on the whole sheet: 255 = animal.

    Per pixel, d = pixel - background in each channel. The score is the largest of: the sum of
    the lighter parts over rule.difference, the sum of the darker parts over rule.dark_difference,
    and the spread of d (a color shift) over rule.difference. The soft edge maps the scores from
    1 - rule.soft to 1 + rule.soft onto 0..255, a blur of 1 px smooths it, and the edge of the
    figure is the half value.
    """
    chans = [c.convert('F') for c in im.split()]
    backs = [c.convert('F') for c in background.split()]
    t, t_dark, soft = rule.difference, rule.dark_difference, rule.soft

    def score(a):
        mx, mn = a['max'], a['min']
        dr, dg, db = a['r'] - a['br'], a['g'] - a['bg'], a['b'] - a['bb']
        light = mx(dr, 0.0) + mx(dg, 0.0) + mx(db, 0.0)
        dark = mx(-dr, 0.0) + mx(-dg, 0.0) + mx(-db, 0.0)
        spread = mx(mx(dr, dg), db) - mn(mn(dr, dg), db)
        s = mx(mx(light / t, dark / t_dark), spread / t)
        return mn(mx((s - (1.0 - soft)) / (2.0 * soft), 0.0), 1.0) * 255.0

    alpha = ImageMath.lambda_eval(score, r=chans[0], g=chans[1], b=chans[2], br=backs[0],
                                  bg=backs[1], bb=backs[2])
    alpha = alpha.convert('L').filter(ImageFilter.GaussianBlur(1.0))
    return alpha.point(lambda v: 255 if v >= 128 else 0)


def drop_ground_shadow(mask, x0, x1):
    """Removes a ground shadow from the figure of one view column (the difference rule).

    A cast shadow on the ground is a thin band: in each column, a run of figure pixels shorter
    than SHADOW_RUN of the figure height whose lowest pixel is within GROUND_BAND of the figure
    height above the lowest figure row is shadow. A foot keeps the shadow under its sole,
    because its run is long, so the ground row moves by 1 or 2 px at most.
    """
    w, h = mask.size
    mp = mask.load()
    rows = [y for y in range(h) if any(mp[x, y] for x in range(x0, x1))]
    if not rows:
        return mask
    top, bottom = rows[0], rows[-1]
    shortest = int(SHADOW_RUN * (bottom - top + 1))
    band = int(GROUND_BAND * (bottom - top + 1))
    for x in range(x0, x1):
        y = bottom
        while y >= bottom - band:
            if not mp[x, y]:
                y -= 1
                continue
            low = y
            while y >= 0 and mp[x, y]:
                y -= 1
            if low - y < shortest:
                for yy in range(y + 1, low + 1):
                    mp[x, yy] = 0
    return mask


def figure_of(im, sh, rule):
    """Makes the figure of the difference rule, or returns None for the colored rule (whose
    pixels make_mask tests one by one)."""
    if rule.foreground == 'colored':
        return None
    if rule.foreground != 'difference':
        raise SystemExit(f'intake.foreground: expected "colored" or "difference", got '
                         f'{rule.foreground!r}')
    return difference_figure(im, background_model(im, sh.background), rule)


def make_mask(im, x0, x1, fg, figure=None):
    """Makes the mask of one view column, with holes filled and specks removed.

    figure: the figure of the whole sheet by the difference rule, or None for the colored rule
    (fg: sheet.foreground)."""
    w, h = im.size
    mask = Image.new('L', (w, h), 0)
    if figure is not None:
        mask.paste(figure.crop((x0, 0, x1, h)), (x0, 0))
        drop_ground_shadow(mask, x0, x1)
    else:
        px = im.load()
        mp = mask.load()
        for y in range(h):
            for x in range(x0, x1):
                if is_animal(px[x, y], fg):
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
    """Lists the runs of animal pixels in one row: [(first x, last x), ...]."""
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


def intake(cfg):
    """Writes the masks, the boxes, and the row profiles in model units.

    Model units: the height of the animal (sole to ear top) is 1. x is the left of the animal,
    y is up, z is forward (the axes of three.js and glTF).
    """
    sh = cfg.sheet
    im = Image.open(cfg.paths.sheet).convert('RGB')
    masks = cfg.paths.masks
    os.makedirs(masks, exist_ok=True)
    result = {'sheet': list(im.size), 'views': {}}
    figure = figure_of(im, sh, cfg.intake)
    for name, view in sh.views.items():
        x0, x1 = view.columns
        mask = make_mask(im, x0, x1, sh.foreground, figure)
        mask.save(os.path.join(masks, f'{name}.png'))
        with open(os.path.join(masks, f'{name}.raw'), 'wb') as f:
            f.write(mask.tobytes())
        left, top, right, bottom = box(mask, x0, x1)
        mp = mask.load()
        height = bottom - top + 1
        ground = bottom + 0.5
        rows = {y: runs_of_row(mp, y, x0, x1) for y in range(top, bottom + 1)}

        # The axis: the mean center of the single run in the hip rows.
        a0, a1 = sh.axis_rows
        centers = []
        for y, runs in rows.items():
            h = (ground - y) / height
            if a0 <= h <= a1 and len(runs) == 1:
                centers.append((runs[0][0] + runs[0][1] + 1) / 2)
        if not centers:
            raise SystemExit(f'view {name}: no row between heights {a0} and {a1} has a single '
                             f'run (check sheet.views.{name}.columns and sheet.axis_rows)')
        axis = sum(centers) / len(centers)
        if view.axis == 'shin':
            # The z origin of a side view: the center of the shin at side_axis_height.
            shin = [r for y, r in rows.items()
                    if abs((ground - y) / height - sh.side_axis_height) < sh.side_axis_halfband]
            axis = sum((r[0][0] + r[0][1] + 1) / 2 for r in shin) / len(shin)

        sign = -1 if view.flip else 1
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
    with open(cfg.paths.measure, 'w') as f:
        json.dump(result, f)


def main():
    """Reads the arguments and runs the intake of one animal."""
    ap = argparse.ArgumentParser(prog='studio/intake.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    intake(config.load(args.animal, args.out))


if __name__ == '__main__':
    main()
