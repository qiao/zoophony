"""Measures the lit fur of a sheet or of its views page.

    python3 measure.py <sheet-id> <image> [<image> ...]

Each image is resized to the size of the sheet. In a box around the body of each view, a pixel
is fur when it differs from the background and passes the test of the species. The script
prints, for each view and for all views: the 90th percentile of the value (lit), the median
value, and the mean color (hex, hue, saturation) of the pixels between the 75th and the 95th
percentile of the value (the lit fur). After the bar, it prints the 25th percentile of the value
and the mean color of the pixels between the 10th and the 40th percentile (the shaded fur).
It needs numpy and Pillow: `uv run --with numpy --with pillow python3 measure.py ...`.
"""
import colorsys
import sys

import numpy as np
from PIL import Image

SIZES = {'fox': (2494, 1354), 'rabbit': (1280, 720), 'dog': (1280, 720), 'polar-bear': (1280, 720)}
BG = {'fox': (15, 15, 15), 'rabbit': (20, 19, 19), 'dog': (213, 214, 216), 'polar-bear': (199, 198, 200)}
BOXES = {
    'fox': [(250, 180, 560, 800), (1050, 160, 1350, 800), (1900, 170, 2250, 700)],
    'rabbit': [(130, 120, 330, 540), (510, 120, 700, 540), (930, 110, 1150, 430)],
    'dog': [(90, 100, 370, 610), (520, 100, 700, 600), (920, 100, 1200, 600)],
    'polar-bear': [(95, 70, 285, 390), (420, 85, 600, 385), (950, 80, 1150, 330)],
}


def hsv(rgb):
    return np.array(colorsys.rgb_to_hsv(*(rgb / 255.0)))


def fur_mask(sid, px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    mx = px.max(axis=-1)
    mn = px.min(axis=-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    bg = np.abs(px - np.array(BG[sid])).sum(axis=-1) > 30
    # The hue in degrees, for the warm colors (red is the largest channel).
    hue = np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360
    if sid == 'fox':
        return bg & (hue > 12) & (hue < 34) & (sat > 0.4) & (mx > 60)
    if sid == 'rabbit':
        return bg & (sat < 0.22) & (mx > 110)
    if sid == 'dog':
        return bg & (hue > 26) & (hue < 50) & (sat > 0.25) & (mx > 150)
    return bg & (sat < 0.2) & (mx > 120)


def measure(sid, path):
    img = Image.open(path).convert('RGB').resize(SIZES[sid], Image.LANCZOS)
    a = np.asarray(img).astype(float)
    rows = []
    every = []
    for box in BOXES[sid]:
        x0, y0, x1, y1 = box
        px = a[y0:y1, x0:x1].reshape(-1, 3)
        m = fur_mask(sid, px)
        fur = px[m]
        every.append(fur)
        rows.append(stats(fur))
    rows.append(stats(np.concatenate(every)))
    return rows


def stats(fur):
    if len(fur) < 20:
        return None
    value = fur @ np.array([0.2126, 0.7152, 0.0722])
    p75, p90, p95 = np.percentile(value, [75, 90, 95])
    lit = fur[(value >= p75) & (value <= p95)].mean(axis=0)
    p10, p25, p40 = np.percentile(value, [10, 25, 40])
    shade = fur[(value >= p10) & (value <= p40)].mean(axis=0)
    sh, ss, _ = hsv(shade)
    h, s, _ = hsv(lit)
    return {
        'n': len(fur),
        'p90': p90,
        'median': float(np.median(value)),
        'lit': '#%02x%02x%02x' % tuple(int(c) for c in lit),
        'hue': h * 360,
        'sat': s,
        'p25': p25,
        'shade': '#%02x%02x%02x' % tuple(int(c) for c in shade),
        'shue': sh * 360,
        'ssat': ss,
    }


sid = sys.argv[1]
for path in sys.argv[2:]:
    print(path.split('/')[-1])
    for name, row in zip(['front', 'side', 'back', 'all'], measure(sid, path)):
        if row is None:
            print(f'  {name:6s} no fur')
            continue
        print(f"  {name:6s} n {row['n']:6d}  lit p90 {row['p90']:5.1f}  median {row['median']:5.1f}"
              f"  lit color {row['lit']}  hue {row['hue']:5.1f}  sat {row['sat']:.2f}"
              f"  | shade p25 {row['p25']:5.1f} {row['shade']} hue {row['shue']:5.1f} sat {row['ssat']:.2f}")
