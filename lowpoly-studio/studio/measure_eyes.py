"""Measures the eyes of the sheet and of the renders in the front and the 3/4 views.

Run with the system python3 (Pillow only), after studio/shoot.mjs compare (the CLI runs it):

    python3 studio/measure_eyes.py <animal> [--out DIR]

The measure is the same for the sheet and for a render, in animal heights (the height of the
view is 1). Each eye is a blob of connected eye pixels (near black: the outline and the iris;
near white: the rim and the highlight) in the band of the eyes (config measure.eyes). The two
blobs with the most white pixels are the eyes. Writes <out>/compare/eyes.json.

- outline: the width of the blob (the eye with its dark outline);
- height: the height of the blob;
- rim: the white area over the circumference of the eye (the width of an even white ring of the
  same area). The iris of the sheet looks to one side, so the ring is not even, and a single
  row does not give its width.
"""

import argparse
import json
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config  # noqa: E402


def white(c, e):
    """Tells if a pixel is near white (brighter than the background)."""
    hi, lo = max(c), min(c)
    return hi > e.white_min and hi - lo < e.white_spread


def dark(c, e):
    """Tells if a pixel is near black: the outline or the iris of an eye."""
    return max(c) < e.dark_max


def blobs(px, box, e):
    """Lists the 4-connected blobs of eye pixels (near black or near white) in a box."""
    x0, y0, x1, y1 = box
    seen = set()
    out = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            if (x, y) in seen or not (dark(c, e) or white(c, e)):
                continue
            stack, comp = [(x, y)], []
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if x0 <= nx < x1 and y0 <= ny < y1 and (nx, ny) not in seen:
                        n = px[nx, ny]
                        if dark(n, e) or white(n, e):
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            out.append(comp)
    return out


def measure_view(img, meta, e):
    """Finds the two eyes of a view and measures them."""
    px = img.load()
    h = meta['height_px']
    g = meta['ground_px']
    top = int(g - e.band[1] * h)
    bottom = int(g - e.band[0] * h)
    found = []
    for comp in blobs(px, (0, top, img.size[0], bottom), e):
        n_white = sum(1 for p in comp if white(px[p], e))
        if n_white < 3 or len(comp) > e.max_blob:
            continue
        xs = [p[0] for p in comp]
        ys = [p[1] for p in comp]
        found.append((n_white, comp, xs, ys))
    found.sort(key=lambda f: f[0], reverse=True)
    eyes = []
    for n_white, comp, xs, ys in found[:2]:
        width = max(xs) - min(xs) + 1
        eyes.append({
            'outline': round(width / h, 4),
            'height': round((max(ys) - min(ys) + 1) / h, 4),
            'rim': round(n_white / (math.pi * width) / h, 4),
            'x_px': 0.5 * (min(xs) + max(xs)),
            'y': round((g - 0.5 * (min(ys) + max(ys))) / h, 4),
        })
    eyes.sort(key=lambda item: item['x_px'])
    return eyes


def measure(cfg):
    """Measures the eyes of the sheet and of the renders, prints them, and writes the JSON."""
    e = cfg.measure.eyes
    with open(cfg.paths.measure) as f:
        meta = json.load(f)['views']
    sheet = Image.open(cfg.paths.sheet).convert('RGB')
    result = {}
    for view in ('front', 'three_quarter'):
        if view not in meta:
            continue
        m = meta[view]
        c0, c1 = m['column']
        s = sheet.crop((c0, 0, c1, sheet.size[1]))
        r = Image.open(os.path.join(cfg.paths.compare, f'render_{view}.png')).convert('RGB')
        result[view] = {'sheet': measure_view(s, m, e), 'render': measure_view(r, m, e)}
        for who in ('sheet', 'render'):
            for eye in result[view][who]:
                eye.pop('x_px')
    for view, res in result.items():
        for who in ('sheet', 'render'):
            for i, eye in enumerate(res[who]):
                print(f'{view:13s} {who:6s} eye {i}  outline {eye["outline"]:.4f}  height '
                      f'{eye["height"]:.4f}  rim {eye["rim"]:.4f}  at height {eye["y"]:.3f}')
    with open(os.path.join(cfg.paths.compare, 'eyes.json'), 'w') as f:
        json.dump(result, f, indent=2)
        f.write('\n')
    return result


def main():
    """Reads the arguments and measures the eyes of one animal."""
    ap = argparse.ArgumentParser(prog='studio/measure_eyes.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    measure(config.load(args.animal, args.out))


if __name__ == '__main__':
    main()
