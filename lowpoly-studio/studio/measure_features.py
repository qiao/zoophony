"""Measures the features of the sheet and of the renders: eyes, ears, nose, muzzle, belly, claws,
or any other feature that the config declares (measure.features).

Run with the system python3 (Pillow only), after studio/shoot.mjs compare (the CLI runs it):

    python3 studio/measure_features.py <animal> [--out DIR]

The measure is the same for the sheet and for a render. A feature has:

- color classes (measure.classes): a threshold relative to the background, or a palette color
  with a hue and a saturation tolerance, or a share of the median luminance of the region;
- a region box in each view, in animal heights: x from the axis of the view to the right of the
  image, y the height above the ground. A view in "split" splits its box at the axis into
  "left_in_image" and "right_in_image";
- a method:
    blobs  the connected blobs (4-connected) of the class pixels in the region. The blobs with the
           most pixels of the "rank" class win. Measures of each blob: x, y (the center), width,
           height, area, and rim (the area of the "rim" class over the circumference of the
           blob: the width of an even ring). The region also gets "count".
    area   all class pixels of the region: x, y (the centroid), width, height (the span from the
           5th to the 95th percentile), and area.
    bump   the part of the silhouette that stands up at the top of the region (an ear): width
           (the widest row while it is a run of its own), height (from the top down to the notch
           of the outer edge), center_x (from the axis), and dark (the share of the "dark" class
           above the notch).

All lengths are in animal heights (the height of the view is 1), areas in squared animal
heights. Writes <out>/compare/features.json:

    {feature: {"method", "views": {view: {region: {"box_px", "sheet": result, "render": result}}}}}

with result = {"count", "items": [{measures, "box_px"}]}. "box_px" is [x0, y0, x1, y1) in the
pixels of the view column (the render and the column of the sheet have the same pixels).
"""

import argparse
import colorsys
import json
import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from studio import config  # noqa: E402


def luminance(c):
    """Calculates the luminance (Rec. 601) of an sRGB pixel."""
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def singular(name, feature):
    """Returns the singular name of a feature for the check names."""
    if feature.name:
        return feature.name
    return name[:-1] if name.endswith('s') else name


class ColorClass:
    """A pixel color class of the config, ready to test pixels."""

    def __init__(self, spec, cfg):
        """Reads the conditions of the class; a palette color becomes its hue and saturation."""
        self.spec = spec
        self.background_max = max(cfg.sheet.background)
        self.hue = self.sat = None
        if spec.palette:
            rgb = cfg.paint.palette[spec.palette]
            h, s, _ = colorsys.rgb_to_hsv(*(v / 255.0 for v in rgb))
            self.hue, self.sat = h * 360.0, s
        # The median luminance of the silhouette in the region, set by Region before a test.
        self.median = None

    @property
    def needs_median(self):
        """Tells if the class compares the luminance with the median of the region."""
        return self.spec.median_over is not None or self.spec.median_under is not None

    def test(self, c):
        """Tells if a pixel (r, g, b) is in the class."""
        s = self.spec
        hi, lo = max(c), min(c)
        if s.max_under is not None and not hi < s.max_under:
            return False
        if s.max_over is not None and not hi > s.max_over:
            return False
        if s.over_background is not None and not hi > self.background_max + s.over_background:
            return False
        if s.spread_under is not None and not hi - lo < s.spread_under:
            return False
        if self.hue is not None:
            h, sat, _ = colorsys.rgb_to_hsv(c[0] / 255.0, c[1] / 255.0, c[2] / 255.0)
            if s.hue_tol is not None:
                d = abs(h * 360.0 - self.hue) % 360.0
                if min(d, 360.0 - d) > s.hue_tol:
                    return False
            if s.saturation_tol is not None and abs(sat - self.sat) > s.saturation_tol:
                return False
        if self.needs_median:
            lum = luminance(c)
            if s.median_over is not None and not lum > s.median_over * self.median:
                return False
            if s.median_under is not None and not lum < s.median_under * self.median:
                return False
        return True


class Picture:
    """One view of the sheet or one render: the pixels, the silhouette, and the frame of the
    view (the axis, the ground, and the height in pixels)."""

    def __init__(self, rgb, silhouette, meta):
        """Stores the image (the column of the view), its silhouette (rows of bools), and the
        view frame from measure.json."""
        self.rgb = rgb
        self.px = rgb.load()
        self.mask = silhouette
        self.w, self.h = rgb.size
        self.axis = meta['axis_px'] - meta['column'][0]
        self.ground = meta['ground_px']
        self.height = meta['height_px']

    def box_px(self, box):
        """Turns a region box in animal heights into pixels [x0, y0, x1, y1) of the column."""
        x0, y0, x1, y1 = box
        return [max(0, min(self.w, int(round(self.axis + x0 * self.height)))),
                max(0, int(self.ground - y1 * self.height)),
                max(0, min(self.w, int(round(self.axis + x1 * self.height)))),
                min(self.h, int(self.ground - y0 * self.height))]

    def x_of(self, x_px):
        """Turns a pixel column into x in animal heights from the axis."""
        return round((x_px - self.axis) / self.height, 4)

    def y_of(self, y_px):
        """Turns a pixel row into a height in animal heights."""
        return round((self.ground - y_px) / self.height, 4)

    def size(self, n_px):
        """Turns a length in pixels into animal heights."""
        return round(n_px / self.height, 4)

    def set_medians(self, classes, box):
        """Sets the median luminance of the silhouette in a box on the classes that need it.

        The median is the middle value of the sorted list (the upper one of an even count)."""
        if not any(c.needs_median for c in classes):
            return
        x0, y0, x1, y1 = box
        lum = sorted(luminance(self.px[x, y]) for y in range(y0, y1) for x in range(x0, x1)
                     if self.mask[y][x])
        median = lum[len(lum) // 2] if lum else 0.0
        for c in classes:
            c.median = median


def blobs_in(pic, box, classes):
    """Lists the 4-connected blobs of the pixels of any class in a box, in scan order."""
    x0, y0, x1, y1 = box
    px = pic.px

    def member(x, y):
        c = px[x, y]
        return any(k.test(c) for k in classes)

    seen = set()
    out = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if (x, y) in seen or not member(x, y):
                continue
            stack, comp = [(x, y)], []
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if x0 <= nx < x1 and y0 <= ny < y1 and (nx, ny) not in seen and member(nx, ny):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            out.append(comp)
    return out


def measure_blobs(pic, box, feature, classes, rank, rim):
    """Finds the blobs of a feature in a box and measures them."""
    pic.set_medians(classes + [k for k in (rank, rim) if k], box)
    found = []
    for comp in blobs_in(pic, box, classes):
        n_rank = sum(1 for p in comp if rank.test(pic.px[p])) if rank else len(comp)
        if n_rank < feature.min_rank or len(comp) < feature.min_area:
            continue
        if feature.max_area and len(comp) > feature.max_area:
            continue
        found.append((n_rank, comp))
    found.sort(key=lambda f: f[0], reverse=True)
    items = []
    for _, comp in found[:feature.count]:
        xs = [p[0] for p in comp]
        ys = [p[1] for p in comp]
        width = max(xs) - min(xs) + 1
        item = {
            'x': pic.x_of(0.5 * (min(xs) + max(xs))),
            'y': pic.y_of(0.5 * (min(ys) + max(ys))),
            'width': pic.size(width),
            'height': pic.size(max(ys) - min(ys) + 1),
            'area': round(len(comp) / pic.height ** 2, 6),
            'box_px': [min(xs), min(ys), max(xs) + 1, max(ys) + 1],
        }
        if rim:
            n_rim = sum(1 for p in comp if rim.test(pic.px[p]))
            item['rim'] = round(n_rim / (math.pi * width) / pic.height, 4)
        items.append(item)
    items.sort(key=lambda item: item['x'])
    return {'count': len(found), 'items': items}


def percentile(values, q):
    """Returns the value at share q of a sorted list (nearest rank)."""
    return values[min(len(values) - 1, int(q * len(values)))]


def measure_area(pic, box, classes):
    """Measures all class pixels of a box: the centroid, the 5 to 95 percentile spans, the area."""
    pic.set_medians(classes, box)
    x0, y0, x1, y1 = box
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = pic.px[x, y]
            if pic.mask[y][x] and any(k.test(c) for k in classes):
                xs.append(x)
                ys.append(y)
    if not xs:
        return {'count': 0, 'items': []}
    sx, sy = sorted(xs), sorted(ys)
    lo_x, hi_x = percentile(sx, 0.05), percentile(sx, 0.95)
    lo_y, hi_y = percentile(sy, 0.05), percentile(sy, 0.95)
    item = {
        'x': pic.x_of(sum(xs) / len(xs)),
        'y': pic.y_of(sum(ys) / len(ys)),
        'width': pic.size(hi_x - lo_x + 1),
        'height': pic.size(hi_y - lo_y + 1),
        'area': round(len(xs) / pic.height ** 2, 6),
        'box_px': [lo_x, lo_y, hi_x + 1, hi_y + 1],
    }
    return {'count': 1, 'items': [item]}


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


def measure_bump(pic, box, outer_is_low, feature, dark):
    """Measures the part of the silhouette that stands up at the top of a box (an ear).

    outer_is_low: the outer edge of the bump is at the low x of the box (the left half of a
    front view, or the back of the head in a side view that faces right).
    """
    mask, height_px = pic.mask, pic.height
    x0, y0, x1, y1 = box
    top = next((y for y in range(y0, y1) if any(mask[y][x0:x1])), None)
    if top is None:
        return {'count': 0, 'items': []}
    widest, center, run = 0, None, (x0, x1 - 1)
    merged = None
    for y in range(top, min(y1, top + int(feature.search * height_px))):
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
            # The bump run is merged with the skull when the run reaches the inner side.
            inner_end = r[0][1] if outer_is_low else r[0][0]
            if (outer_is_low and inner_end >= x1 - 2) or (not outer_is_low and inner_end <= x0 + 1):
                merged = y
                break
        if width > widest:
            widest, center, run = width, 0.5 * (ear[0] + ear[1]), ear
    # The notch: the outer edge goes out, then back in, then out again at the cheek.
    edge = []
    for y in range(top, min(y1, top + int(feature.notch_span * height_px))):
        r = runs(mask[y], x0, x1)
        if r:
            edge.append((y, r[0][0] if outer_is_low else -r[-1][1]))
    best_out = min(d for _, d in edge[: int(feature.notch_top * height_px)])
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
    item = {
        'width': pic.size(widest),
        'height': pic.size(notch_row - top),
        'center_x': round(abs(center - pic.axis) / height_px, 4) if center is not None else None,
        'top': pic.y_of(top),
        'top_row': top,
        'merge_row': merged,
        'notch_row': notch_row,
        'box_px': [run[0], top, run[1] + 1, max(notch_row, top + 1)],
    }
    if dark:
        item['dark'] = dark_share(pic, (x0, top, x1, notch_row), dark)
    return {'count': 1, 'items': [item]}


def dark_share(pic, box, dark):
    """Calculates the share of the silhouette pixels of a box that are in the dark class."""
    pic.set_medians([dark], box)
    x0, y0, x1, y1 = box
    inside = [pic.px[x, y] for y in range(y0, y1) for x in range(x0, x1) if pic.mask[y][x]]
    if not inside:
        return None
    return round(sum(1 for c in inside if dark.test(c)) / len(inside), 3)


def regions_of(pic, feature, view, name):
    """Lists the regions of a feature in a view: (name, box in pixels, outer side is low x)."""
    box = pic.box_px(feature.regions[view])
    if view not in feature.split:
        # One region: the outer edge of a bump is at the low x (the back of the head in a side
        # view that faces right).
        return [(name, box, True)]
    ax = int(round(pic.axis))
    return [('left_in_image', [box[0], box[1], max(box[0], ax), box[3]], True),
            ('right_in_image', [min(box[2], ax), box[1], box[2], box[3]], False)]


def measure_picture(pic, feature, view, name, classes):
    """Measures one feature in one view of the sheet or of a render: {region: result}."""
    out = {}
    kinds = [classes[c] for c in feature.classes]
    for region, box, outer_is_low in regions_of(pic, feature, view, name):
        if feature.method == 'blobs':
            rank = classes[feature.rank] if feature.rank else None
            rim = classes[feature.rim] if feature.rim else None
            result = measure_blobs(pic, box, feature, kinds, rank, rim)
        elif feature.method == 'area':
            result = measure_area(pic, box, kinds)
        elif feature.method == 'bump':
            dark = classes[feature.dark] if feature.dark and view in feature.dark_views else None
            result = measure_bump(pic, box, outer_is_low, feature, dark)
        else:
            raise ValueError(f'unknown feature method {feature.method!r}')
        result['box_px'] = box
        out[region] = result
    return out


def sheet_picture(cfg, sheet, view, meta):
    """Makes the picture of a view of the sheet: its column and the intake mask."""
    c0, c1 = meta['column']
    rgb = sheet.crop((c0, 0, c1, sheet.size[1]))
    im = Image.open(os.path.join(cfg.paths.masks, f'{view}.png')).convert('L')
    px = im.load()
    mask = [[px[x, y] > 127 for x in range(c0, c1)] for y in range(im.size[1])]
    return Picture(rgb, mask, meta)


def render_picture(cfg, view, meta):
    """Makes the picture of a render: the render and the pixels that differ from the
    background."""
    rgb = Image.open(os.path.join(cfg.paths.compare, f'render_{view}.png')).convert('RGB')
    px = rgb.load()
    w, h = rgb.size
    bg = cfg.sheet.background
    diff = cfg.measure.background_diff
    mask = [[sum(abs(a - b) for a, b in zip(px[x, y], bg)) > diff for x in range(w)]
            for y in range(h)]
    return Picture(rgb, mask, meta)


def check_config(cfg):
    """Checks the names of the classes, the methods, and the views of the features."""
    errors = []
    views = set(cfg.sheet.views)
    for name, f in cfg.measure.features.items():
        if f.method not in ('blobs', 'area', 'bump'):
            errors.append(f'measure.features.{name}.method: expected "blobs", "area", or "bump"')
        for key in ('classes',):
            for c in f[key]:
                if c not in cfg.measure.classes:
                    errors.append(f'measure.features.{name}.{key}: no class {c!r}')
        for key in ('rank', 'rim', 'dark'):
            if f[key] and f[key] not in cfg.measure.classes:
                errors.append(f'measure.features.{name}.{key}: no class {f[key]!r}')
        for v in list(f.regions) + list(f.split) + list(f.dark_views):
            if v not in views:
                errors.append(f'measure.features.{name}: no view {v!r} in sheet.views')
        for check, c in f.checks.items():
            if c.op not in ('rel<=', 'abs<='):
                errors.append(f'measure.features.{name}.checks.{check}.op: expected "rel<=" or '
                              f'"abs<="')
    for name, c in cfg.measure.classes.items():
        if c.palette and c.palette not in cfg.paint.palette:
            errors.append(f'measure.classes.{name}.palette: no color {c.palette!r} in '
                          f'paint.palette')
    if errors:
        raise config.ConfigError('the features of the config: ' + '; '.join(errors))


def measure(cfg):
    """Measures every feature of the config on the sheet and on the renders, prints them, and
    writes <out>/compare/features.json. Returns the result."""
    check_config(cfg)
    with open(cfg.paths.measure) as f:
        meta = json.load(f)['views']
    sheet = Image.open(cfg.paths.sheet).convert('RGB')
    classes = {name: ColorClass(spec, cfg) for name, spec in cfg.measure.classes.items()}
    pictures = {}

    def pictures_of(view):
        if view not in pictures:
            pictures[view] = (sheet_picture(cfg, sheet, view, meta[view]),
                              render_picture(cfg, view, meta[view]))
        return pictures[view]

    result = {}
    for name, feature in cfg.measure.features.items():
        views = {}
        for view in feature.regions:
            if view not in meta:
                continue
            s_pic, r_pic = pictures_of(view)
            s = measure_picture(s_pic, feature, view, singular(name, feature), classes)
            r = measure_picture(r_pic, feature, view, singular(name, feature), classes)
            views[view] = {region: {'box_px': s[region].pop('box_px'), 'sheet': s[region],
                                    'render': r[region]} for region in s}
            for region in r:
                r[region].pop('box_px')
        result[name] = {'method': feature.method, 'views': views}
    for name, res in result.items():
        for view, regions in res['views'].items():
            for region, both in regions.items():
                for who in ('sheet', 'render'):
                    for i, item in enumerate(both[who]['items']):
                        values = '  '.join(f'{k} {v}' for k, v in item.items() if k != 'box_px')
                        print(f'{name:8s} {view:13s} {region:15s} {who:6s} {i}  {values}')
    os.makedirs(cfg.paths.compare, exist_ok=True)
    with open(os.path.join(cfg.paths.compare, 'features.json'), 'w') as f:
        json.dump(result, f, indent=1)
        f.write('\n')
    return result


# The measures that are lengths in animal heights: a check of one of them gets the pixel floor.
LENGTHS = ('x', 'y', 'width', 'height', 'center_x', 'top')

# The rounding step of the length measures (Picture.size, x_of, y_of round to 4 decimals).
STEP = 1e-4


def pairs(feature_name, feature, res, floors=None):
    """Lists the compares of a feature: (check name, [render, sheet], op, limit, where, floor).

    A blob pairs with the blob of the same place in the order of x. A missing item gives None,
    and the check fails. A measure that neither item has is not compared. floors: the pixel
    floor of each view in animal heights (checks.feature_pixels); a length measure gets it, and
    the other measures get 0."""
    floors = floors or {}
    out = []
    one = singular(feature_name, feature)
    for view, regions in res['views'].items():
        for region, both in regions.items():
            s_items, r_items = both['sheet']['items'], both['render']['items']
            if res['method'] == 'blobs':
                n = max(len(s_items), len(r_items))
                keys = [(str(i) if len(regions) == 1 else f'{region}.{i}', i) for i in range(n)]
            else:
                keys = [(region, 0)]
            for check, c in feature.checks.items():
                measure = c.measure or check
                floor = floors.get(view, 0.0) if measure in LENGTHS else 0.0
                if measure == 'count':
                    value = [both['render']['count'], both['sheet']['count']]
                    out.append((f'{one}_{check}.{view}.{region}', value, c.op, c.limit,
                                {'feature': feature_name, 'view': view, 'region': region}, 0.0))
                    continue
                for key, i in keys:
                    m = r_items[i].get(measure) if i < len(r_items) else None
                    s = s_items[i].get(measure) if i < len(s_items) else None
                    if m is None and s is None and i < min(len(r_items), len(s_items)):
                        # The measure does not exist in this view (the inner ear from the back).
                        continue
                    out.append((f'{one}_{check}.{view}.{key}', [m, s], c.op, c.limit,
                                {'feature': feature_name, 'view': view, 'region': region,
                                 'item': i}, floor))
    return out


def main():
    """Reads the arguments and measures the features of one animal."""
    ap = argparse.ArgumentParser(prog='studio/measure_features.py')
    ap.add_argument('animal')
    ap.add_argument('--out', default=None)
    args = ap.parse_args()
    measure(config.load(args.animal, args.out))


if __name__ == '__main__':
    main()
