"""Measures the eyes of the sheet and of the renders in the front and the 3/4 views.

Run with the system python3 (Pillow only), after tools/shoot.mjs compare:

    python3 tools/eyes.py [--json out/compare/eyes.json]

The measure is the same for the sheet and for a render, in bear heights (the height of the
view is 1). Each eye is a blob of connected eye pixels (near black: the outline and the iris;
near white: the rim and the highlight) in the band of the eyes (height 0.86 to 0.93). The two
blobs with the most white pixels are the eyes.

- outline: the width of the blob (the eye with its dark outline);
- height: the height of the blob;
- rim: the white area over the circumference of the eye (the width of an even white ring of the
  same area). The iris of the sheet looks to one side, so the ring is not even, and a single
  row does not give its width.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(os.path.dirname(HERE), 'animals', 'bear')


def white(c):
    """Tells if a pixel is near white. The gray background (about 202) is darker than this."""
    hi, lo = max(c), min(c)
    return hi > 212 and hi - lo < 45


def dark(c):
    """Tells if a pixel is near black: the outline or the iris of an eye."""
    return max(c) < 100


def blobs(px, box):
    """Lists the 4-connected blobs of eye pixels (near black or near white) in a box."""
    x0, y0, x1, y1 = box
    seen = set()
    out = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            if (x, y) in seen or not (dark(c) or white(c)):
                continue
            stack, comp = [(x, y)], []
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if x0 <= nx < x1 and y0 <= ny < y1 and (nx, ny) not in seen:
                        n = px[nx, ny]
                        if dark(n) or white(n):
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            out.append(comp)
    return out


def measure_view(img, meta):
    """Finds the two eyes of a view and measures them."""
    px = img.load()
    h = meta['height_px']
    g = meta['ground_px']
    top = int(g - 0.93 * h)
    bottom = int(g - 0.86 * h)
    found = []
    for comp in blobs(px, (0, top, img.size[0], bottom)):
        n_white = sum(1 for p in comp if white(px[p]))
        if n_white < 3 or len(comp) > 600:
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
    eyes.sort(key=lambda e: e['x_px'])
    return eyes


def main():
    """Measures the eyes of the sheet and of the renders, prints them, and writes the JSON."""
    with open(os.path.join(ROOT, 'out', 'measure.json')) as f:
        meta = json.load(f)['views']
    sheet = Image.open(os.path.join(ROOT, 'reference', 'bear-views.png')).convert('RGB')
    result = {}
    for view in ('front', 'three_quarter'):
        m = meta[view]
        c0, c1 = m['column']
        s = sheet.crop((c0, 0, c1, sheet.size[1]))
        r = Image.open(os.path.join(ROOT, 'out', 'compare', f'render_{view}.png')).convert('RGB')
        result[view] = {'sheet': measure_view(s, m), 'render': measure_view(r, m)}
        for who in ('sheet', 'render'):
            for e in result[view][who]:
                e.pop('x_px')
    for view, res in result.items():
        for who in ('sheet', 'render'):
            for i, e in enumerate(res[who]):
                print(f'{view:13s} {who:6s} eye {i}  outline {e["outline"]:.4f}  height '
                      f'{e["height"]:.4f}  rim {e["rim"]:.4f}  at height {e["y"]:.3f}')
    path = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else \
        os.path.join(ROOT, 'out', 'compare', 'eyes.json')
    with open(path, 'w') as f:
        json.dump(result, f, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
