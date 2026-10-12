"""Measures the ears of the sheet and of the renders in the front, back, and side views.

Run with the system python3 (Pillow only), after studio/shoot.mjs compare (the CLI runs it):

    python3 studio/measure_ears.py <animal> [--out DIR]

The measure uses the silhouette only, in the same way for the sheet and for a render:

- width: the widest row of the ear while it is a run of its own, above the skull,
- height: from the top of the ear down to the notch of the outer edge, where the ear meets the
  head,
- center x: the middle of the widest ear row, from the axis of the view,
- dark: the share of the ear disk (the box of the ear above the notch) that is darker than the
  fur around it, which is the inner ear (front view only).

All values are in animal heights (the height of the view is 1). Writes
<out>/compare/ears.json.
"""

import argparse
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config  # noqa: E402


def render_mask(path, background, diff):
    """Makes a mask of a render: the pixels that differ from the background of the sheet."""
    im = Image.open(path).convert('RGB')
    px = im.load()
    w, h = im.size
    return [[sum(abs(a - b) for a, b in zip(px[x, y], background)) > diff for x in range(w)]
            for y in range(h)], im


def sheet_mask(cfg, view, meta):
    """Reads the mask of the sheet for a view, cut to its column."""
    c0, c1 = meta['column']
    im = Image.open(os.path.join(cfg.paths.masks, f'{view}.png')).convert('L')
    px = im.load()
    sheet = Image.open(cfg.paths.sheet).convert('RGB')
    rgb = sheet.crop((c0, 0, c1, im.size[1]))
    return [[px[x, y] > 127 for x in range(c0, c1)] for y in range(im.size[1])], rgb


def runs(row, x0, x1):
    """Lists the runs of a mask row between x0 and x1."""
    out, start = [], None
    for x in range(x0, x1):
        if row[x] and start is None:
            start = x
        elif not row[x] and start is not None:
            out.append((start, x - 1))
            start = None
    if start is not None:
        out.append((start, x1 - 1))
    return out


def measure_half(mask, x0, x1, outer_is_low, height_px, axis, e):
    """Measures the ear in one half of a view (x0..x1), with the outer side low or high x."""
    top = next(y for y, row in enumerate(mask) if any(row[x0:x1]))
    widest, center = 0, None
    merged = None
    for y in range(top, top + int(e.search * height_px)):
        r = runs(mask[y], x0, x1)
        if not r:
            continue
        ear = r[0] if outer_is_low else r[-1]
        width = ear[1] - ear[0] + 1
        if widest and width > widest + 0.02 * height_px:
            # The run jumps wider: the skull joins it (the side view has one run).
            merged = y
            break
        if len(r) == 1 and y > top + 2:
            # The ear run is merged with the skull when the run reaches the inner side.
            inner_end = r[0][1] if outer_is_low else r[0][0]
            if (outer_is_low and inner_end >= x1 - 2) or (not outer_is_low and inner_end <= x0 + 1):
                merged = y
                break
        if width > widest:
            widest, center = width, 0.5 * (ear[0] + ear[1])
    # The notch: the outer edge goes out, then back in, then out again at the cheek.
    edge = []
    for y in range(top, top + int(e.notch_span * height_px)):
        r = runs(mask[y], x0, x1)
        if r:
            edge.append((y, r[0][0] if outer_is_low else -r[-1][1]))
    best_out = min(d for _, d in edge[: int(e.notch_top * height_px)])
    notch = None
    deepest = None
    for y, d in edge:
        if deepest is None and d == best_out:
            deepest = y
        if deepest is not None and y > deepest:
            if notch is None or d > notch[1]:
                notch = (y, d)
            elif d < notch[1] - 2:
                break
    notch_row = notch[0] if notch else top
    return {
        'top_row': top,
        'width': round(widest / height_px, 4),
        'height': round((notch_row - top) / height_px, 4),
        'center_x': round(abs(center - axis) / height_px, 4) if center is not None else None,
        'merge_row': merged,
        'notch_row': notch_row,
    }


def dark_share(rgb, mask, half, box):
    """Calculates the share of the ear box that is darker than the median fur of the box."""
    x0, y0, x1, y1 = box
    px = rgb.load()
    lum = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if mask[y][x]:
                r, g, b = px[x, y]
                lum.append(0.299 * r + 0.587 * g + 0.114 * b)
    if not lum:
        return None
    s = sorted(lum)
    cut = 0.8 * s[len(s) // 2]
    return round(sum(1 for v in lum if v < cut) / len(lum), 3)


def measure_view(view, meta, mask, rgb, axis, e):
    """Measures both ears of one view (or the one ear of the side view)."""
    h = meta['height_px']
    w = len(mask[0])
    if view == 'side':
        # The animal faces right: the ear stands up at the back of the head, the outer edge is low x.
        return {'ear': measure_half(mask, 0, w, True, h, axis, e)}
    ax = int(round(axis))
    left = measure_half(mask, 0, ax, True, h, axis, e)
    right = measure_half(mask, ax, w, False, h, axis, e)
    out = {'left_in_image': left, 'right_in_image': right}
    if view == 'front':
        for name, m, (x0, x1) in (('left_in_image', left, (0, ax)),
                                  ('right_in_image', right, (ax, w))):
            out[name]['dark'] = dark_share(rgb, mask, name, (x0, m['top_row'], x1,
                                                             m['notch_row']))
    return out


def measure(cfg):
    """Measures the sheet and the renders, prints the ear sizes, and writes the JSON."""
    e = cfg.measure.ears
    with open(cfg.paths.measure) as f:
        meta = json.load(f)['views']
    result = {}
    for view in ('front', 'side', 'back'):
        if view not in meta:
            continue
        m = meta[view]
        axis = m['axis_px'] - m['column'][0]
        smask, srgb = sheet_mask(cfg, view, m)
        rmask, rrgb = render_mask(os.path.join(cfg.paths.compare, f'render_{view}.png'),
                                  cfg.sheet.background, e.background_diff)
        result[view] = {'sheet': measure_view(view, m, smask, srgb, axis, e),
                        'render': measure_view(view, m, rmask, rrgb, axis, e)}
    for view, r in result.items():
        for who in ('sheet', 'render'):
            for side, ear in r[who].items():
                extra = f"  dark {ear['dark']}" if 'dark' in ear else ''
                print(f'{view:6s} {who:6s} {side:15s} width {ear["width"]:.3f}  height '
                      f'{ear["height"]:.3f}  center x {ear["center_x"]}{extra}')
    with open(os.path.join(cfg.paths.compare, 'ears.json'), 'w') as f:
        json.dump(result, f, indent=2)
    return result


def main():
    """Reads the arguments and measures the ears of one animal."""
    ap = argparse.ArgumentParser(prog='studio/measure_ears.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    measure(config.load(args.animal, args.out))


if __name__ == '__main__':
    main()
