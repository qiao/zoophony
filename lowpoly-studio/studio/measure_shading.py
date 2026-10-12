"""Measures the facets of the front view: their size, their count across the belly and along the
arm, and the main directions of their edges. It measures the sheet and the render in the same way.

Run with the system python3 (Pillow only), after studio/shoot.mjs compare (the CLI runs it):

    python3 studio/measure_shading.py <animal> [--out DIR] [render_front.png ...]

A facet edge is a jump of the luminance. Along a line, the tool finds the jumps above a threshold
(after a light blur) and measures the chords between them. For a mesh of equal triangles with the
edge length L, the mean chord of random lines is pi * area / perimeter = 0.453 L, so the tool
also estimates L as the mean chord / 0.453. The lines and the boxes come from config
measure.shading. Writes <out>/compare/topology.json.
"""

import argparse
import json
import math
import os
import statistics
import sys

from PIL import Image, ImageChops, ImageFilter, ImageStat

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config  # noqa: E402

CHORD_TO_EDGE = 0.4534


def load(view_meta, path, x_offset):
    """Loads a blurred luminance image and a function from model units to its pixels."""
    im = Image.open(path).convert('L').filter(ImageFilter.GaussianBlur(0.8))
    ground = view_meta['ground_px']
    height = view_meta['height_px']
    axis = view_meta['axis_px'] - x_offset

    def to_px(x, y):
        return axis + x * height, ground - y * height

    return im, to_px, height


def profile(im, p0, p1):
    """Samples the luminance along a line, one sample per pixel."""
    px = im.load()
    n = int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]))
    out = []
    for i in range(n):
        t = i / max(n - 1, 1)
        out.append(px[int(round(p0[0] + (p1[0] - p0[0]) * t)), int(round(p0[1] + (p1[1] - p0[1]) * t))])
    return out


def jumps(values, jump):
    """Finds the facet edges along a profile: local maxima of the step above jump."""
    d = [0.0] + [abs(values[i + 1] - values[i - 1]) / 2.0 for i in range(1, len(values) - 1)] + [0.0]
    found = []
    for i in range(2, len(d) - 2):
        if d[i] >= jump and d[i] == max(d[i - 2:i + 3]):
            if not found or i - found[-1] > 2:
                found.append(i)
    return found


def chords(im, lines, jump):
    """Measures the chords between edges along lines. Returns (chords, edge counts)."""
    out, counts = [], []
    for p0, p1 in lines:
        j = jumps(profile(im, p0, p1), jump)
        counts.append(len(j))
        out += [b - a for a, b in zip(j[:-1], j[1:])]
    return out, counts


def orientations(im, box, jump):
    """Makes a histogram of the edge directions in a box (degrees, 0 is horizontal)."""
    gx = im.filter(ImageFilter.Kernel((3, 3), [-1, 0, 1, -2, 0, 2, -1, 0, 1], 1, 128)).load()
    gy = im.filter(ImageFilter.Kernel((3, 3), [-1, -2, -1, 0, 0, 0, 1, 2, 1], 1, 128)).load()
    bins = [0.0] * 6
    x0, y0, x1, y1 = (int(v) for v in box)
    for y in range(min(y0, y1), max(y0, y1)):
        for x in range(min(x0, x1), max(x0, x1)):
            dx = gx[x, y] - 128
            dy = gy[x, y] - 128
            mag = math.hypot(dx, dy)
            if mag < 2 * jump:
                continue
            edge = (math.degrees(math.atan2(-dy, dx)) + 90.0) % 180.0
            bins[int(edge // 30) % 6] += mag
    total = sum(bins) or 1.0
    return [round(b / total, 3) for b in bins]


def contrast(im, to_px, crop_box):
    """Measures the brightness spread of a belly crop [x0, y0, x1, y1] (model units).

    Returns the standard deviation of the luminance, the standard deviation of its fine part
    (the luminance minus a blur of 8 px, which keeps the steps between neighbor facets and drops
    the gentle gradients), and the mean luminance.
    """
    (x0, y0), (x1, y1) = to_px(crop_box[0], crop_box[3]), to_px(crop_box[2], crop_box[1])
    box = (int(x0), int(y0), int(x1), int(y1))
    crop = im.crop(box)
    blur = crop.filter(ImageFilter.GaussianBlur(8))
    fine = ImageChops.subtract(crop, blur, 1.0, 128)
    s_all = ImageStat.Stat(crop)
    s_fine = ImageStat.Stat(fine)
    return {
        'luma_std': round(s_all.stddev[0], 2),
        'fine_std': round(s_fine.stddev[0], 2),
        'luma_mean': round(s_all.mean[0], 1),
    }


def measure_image(im, to_px, height, c):
    """Measures one image of the front view. c: the config section measure.shading."""
    def seg(a, b):
        return to_px(*a), to_px(*b)

    below, above, split = c.belly_half_width

    def belly_half(y):
        return below if y < split else above

    lo, hi = c.belly_column_span
    (ax0, ay0), (ax1, ay1) = c.arm_line
    belly_h = [seg((-belly_half(y), y), (belly_half(y), y)) for y in c.belly_rows]
    belly_v = [seg((x, lo), (x, hi)) for x in c.belly_columns]
    arm = [seg((ax0 + d, ay0), (ax1 + d, ay1)) for d in c.arm_offsets]
    c_h, n_h = chords(im, belly_h, c.jump)
    c_v, _ = chords(im, belly_v, c.jump)
    c_a, n_a = chords(im, arm, c.jump)
    allc = c_h + c_v + c_a
    q = statistics.quantiles(allc, n=4)
    mean = statistics.mean(allc)

    def box(x0, y0, x1, y1):
        a, b = to_px(x0, y0), to_px(x1, y1)
        return (a[0], a[1], b[0], b[1])

    return {
        'belly_contrast': contrast(im, to_px, c.belly_box),
        'mean_chord_px': round(mean, 1),
        'chord_quartiles_px': [round(v, 1) for v in q],
        'edge_length_estimate_px': round(mean / CHORD_TO_EDGE, 1),
        'facets_across_belly': round(statistics.mean(n_h) + 1, 1),
        'facets_along_arm': round(statistics.mean(n_a) + 1, 1),
        'edge_directions_0_30_60_90_120_150': {
            name: orientations(im, box(*b), c.jump) for name, b in c.direction_boxes.items()},
    }


def measure(cfg, renders=None):
    """Measures the sheet and the renders of the front view, prints both, and writes the JSON."""
    c = cfg.measure.shading
    with open(cfg.paths.measure) as f:
        meta = json.load(f)['views']['front']
    out = {'reference': measure_image(*load(meta, cfg.paths.sheet, 0), c)}
    renders = renders or [os.path.join(cfg.paths.compare, 'render_front.png')]
    for path in renders:
        if os.path.exists(path):
            out[os.path.basename(path)] = measure_image(*load(meta, path, meta['column'][0]), c)
    for name, m in out.items():
        print(name)
        for k, v in m.items():
            print(f'  {k}: {v}')
    with open(os.path.join(cfg.paths.compare, 'topology.json'), 'w') as f:
        json.dump(out, f, indent=2)
    return out


def main():
    """Reads the arguments and measures the shading of one animal."""
    ap = argparse.ArgumentParser(prog='studio/measure_shading.py')
    ap.add_argument('animal')
    ap.add_argument('renders', nargs='*')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    measure(config.load(args.animal, args.out), args.renders)


if __name__ == '__main__':
    main()
