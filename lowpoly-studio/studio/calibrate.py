"""Calibrates the look of an animal from its sheet: the light (hemi and key), the palette, and
the checks of the color classes (python3 studio calibrate <animal>). Pillow only.

The light and the palette:

1. studio/shoot.mjs calibrate renders the front view of a GLB once for each light alone: the
   rim (always on), the hemisphere light, the key light, and the fill light, with the colors of
   the GLB and with a white material (the light alone). Each render is aligned to the sheet as
   in the compare. The renders are linear in the light levels, so any light is a sum of them.
2. The sheet gives the targets: the fur medians (hue, saturation, value) of the front view in
   compare.fur_band, and the facet contrast of the belly crop (measure.shading.belly_box). The
   fur pixels need a saturation of compare.fur_min_saturation; calibrate sets it to 0.4 of the
   5th percentile of the fur saturation, at most 0.2 and at least the background saturation
   plus 0.03 (the bear 0.2, the polar bear 0.06: their hand values).
3. A palette that is k times brighter under a light that is k times darker gives the same
   render. The rule that fixes the level: the median light on a white surface over the fur
   pixels is LEVEL. The hand-tuned light of the bear gives 1.07 and the light of the polar bear
   gives 0.97, so LEVEL is their mean.
4. For each key level, the hemisphere level follows from the rule, and the fur palette from
   the fur medians of the sheet (a scale of each channel of the palette of the GLB). The key
   level whose belly contrast equals the contrast of the sheet wins (bisection).
5. The fur family (belly, muzzle, ear, inner ear, brow) takes the same scale, so it keeps its
   ratios to the fur. A family color that the scale clips (a channel of 250 or more: the tan
   muzzle of the bear on a cream fur) takes the fur color, with a note. (A belly from the "light" class of the sheet takes the brightest facets:
   on the polar bear it made the belly 13 levels too light, and the facet contrast failed.)
   The dark pieces take the colors of the dark pixels of their blobs on the sheet: the nose
   and the claw the median, the eye outline the median, and the iris (eye) the median of the
   darkest quarter.

The color classes: the share of the fur pixels of the sheet that each class of measure.classes
with a fixed threshold takes (a class relative to the median of a region is left out). A class
that takes fur pixels overlaps the fur (for example a "white" eye rim class on a cream fur). It
gets a warning when it decides what a feature finds: the rank or the rim class of a blobs
feature, or the only class of a feature. A class with only a max_under threshold (a dark class)
gets the middle of the gap between the dark pieces of the sheet (the 90th percentile of their
largest channel) and the darkest fur (the 2nd percentile), when there is a gap.

Writes <out>/calibrate/look.json and, with write=True, the values into animal.toml (comments
stay).
"""

import colorsys
import json
import math
import os
import statistics

from PIL import Image, ImageFilter, ImageMath

from studio import measure_features, measure_shading

# The median light on a white surface over the fur pixels of the front view (step 3).
LEVEL = 1.02

# The levels of the single lights of the renders (hemi, key, fill).
BASIS = (2.0, 2.0, 1.0)

# A class that takes more than this share of the fur pixels overlaps the fur.
OVERLAP = 0.02

# The saturation floor of the fur pixels: SATURATION_SHARE of the 5th percentile of the fur
# saturation, at most SATURATION_MAX, at least the background saturation plus SATURATION_PAD.
SATURATION_SHARE = 0.4
SATURATION_MAX = 0.2
SATURATION_PAD = 0.03

# A scaled family color with a channel of this or more clips.
CLIP = 250

# The colors of the palette that scale with the fur, and those that come from dark blobs.
FUR_FAMILY = ('fur', 'belly', 'muzzle', 'ear', 'ear_inner', 'brow')
DARK = {'eye': 'eyes', 'eye_outline': 'eyes', 'nose': 'nose', 'claw': 'claws'}

# A pixel with a largest channel under this is a dark pixel of a dark piece.
DARK_MAX = 100

LIN = [((v / 255) / 12.92 if v / 255 <= 0.04045 else ((v / 255 + 0.055) / 1.055) ** 2.4)
       for v in range(256)]
ENCODE = [int(round(255 * (12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055)))
          for x in (i / 65535 for i in range(65536))]


def runs(light, base=BASIS):
    """Lists the render runs of shoot.mjs calibrate: the rim alone, the hemisphere, the key,
    and the fill light, with the colors of the GLB, then with a white material, then the
    light of the config (a check of the sum)."""
    out = []
    for flat in (0, 1):
        out += [{'light': '0,0,0', 'flat': flat}, {'light': f'{base[0]},0,0', 'flat': flat},
                {'light': f'0,{base[1]},0', 'flat': flat}, {'light': f'0,0,{base[2]}', 'flat': flat}]
    out.append({'light': f'{light.hemi},{light.key},{light.fill}', 'flat': 0})
    return out


def _lin_band(band):
    """Turns one sRGB band (L) into a linear float band (a 16-bit table: two byte lookups)."""
    table = [int(round(LIN[v] * 65535)) for v in range(256)]
    high = band.point([t >> 8 for t in table])
    low = band.point([t & 255 for t in table])
    return ImageMath.lambda_eval(
        lambda a: (a['convert'](a['h'], 'F') * 256.0 + a['convert'](a['l'], 'F')) / 65535.0,
        h=high, l=low)


def encode(bands):
    """Turns three linear float bands into an sRGB image (clamped)."""
    out = []
    for band in bands:
        i = ImageMath.lambda_eval(
            lambda a: a['convert'](a['min'](a['max'](a['x'], 0.0), 1.0) * 65535.0, 'I'), x=band)
        out.append(i.point(ENCODE, 'L'))
    return Image.merge('RGB', out)


class Basis:
    """The linear renders of the single lights, per unit of light level."""

    def __init__(self, folder, fill):
        """Reads the renders of runs() from folder (run-<i>.png) and makes the unit bases."""
        ims = [Image.open(os.path.join(folder, f'run-{i}.png')).convert('RGBA') for i in range(9)]
        self.alpha = ims[8].getchannel('A')
        self.size = ims[0].size
        lin = [[_lin_band(b) for b in im.convert('RGB').split()] for im in ims]
        self.fill = fill
        self.tex = self._units(lin[0:4])
        self.flat = self._units(lin[4:8])
        self.check = ims[8].convert('RGB')

    @staticmethod
    def _units(four):
        """Makes [rim, hemi per unit, key per unit, fill per unit] from four renders."""
        rim = four[0]
        units = [rim]
        for i, level in zip((1, 2, 3), BASIS):
            units.append([ImageMath.lambda_eval(lambda a: (a['x'] - a['r']) / level,
                                                x=four[i][c], r=rim[c]) for c in range(3)])
        return units

    def bands(self, hemi, key, scale=(1.0, 1.0, 1.0), flat=False):
        """Makes the three linear bands of a light (the fill of the config) and a palette scale."""
        rim, h, k, f = self.flat if flat else self.tex
        out = []
        for c in range(3):
            out.append(ImageMath.lambda_eval(
                lambda a: (a['r'] + a['h'] * hemi + a['k'] * key + a['f'] * self.fill) * scale[c],
                r=rim[c], h=h[c], k=k[c], f=f[c]))
        return out

    def image(self, hemi, key, scale=(1.0, 1.0, 1.0)):
        """Renders a light and a palette scale as an sRGB image."""
        return encode(self.bands(hemi, key, scale))


def fur_rows(meta, band):
    """Lists the rows of the fur band of a view (as viewer/compare.js does)."""
    rows, k = [], band[0]
    while k <= band[1]:
        rows.append(int(round(meta['ground_px'] - k * meta['height_px'])))
        k += 1 / meta['height_px']
    return rows


def fur_pixels(rgb, mask, rows, min_sat):
    """Lists the fur pixels (r, g, b) of the rows of an image under a mask (as furStats of
    viewer/compare.js: a value of 0.18 or more and a saturation of min_sat or more)."""
    px, mp = rgb.load(), mask.load()
    w = rgb.size[0]
    out = []
    for y in rows:
        for x in range(w):
            if not mp[x, y]:
                continue
            c = px[x, y]
            mx, mn = max(c), min(c)
            if mx / 255 < 0.18 or (mx - mn) / max(mx, 1) < min_sat:
                continue
            out.append(c)
    return out


def hsv_medians(pixels):
    """Calculates the median hue (degrees), saturation, and value of pixels (as furStats)."""
    hs, ss, vs = [], [], []
    for r, g, b in pixels:
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        hs.append(h * 360)
        ss.append(s)
        vs.append(v)
    mid = len(hs) // 2
    return [sorted(hs)[mid], sorted(ss)[mid], sorted(vs)[mid]] if hs else [None, None, None]


def channel_medians(pixels):
    """Calculates the median of each channel of pixels."""
    return [statistics.median(c[k] for c in pixels) for k in range(3)]


def belly_contrast(cfg, meta, rgb, offset):
    """Measures the fine spread of the belly crop of an RGB image of the front view
    (studio/measure_shading.py)."""
    im = rgb.convert('L').filter(ImageFilter.GaussianBlur(0.8))
    axis = meta['axis_px'] - offset

    def to_px(x, y):
        return axis + x * meta['height_px'], meta['ground_px'] - y * meta['height_px']

    return measure_shading.contrast(im, to_px, cfg.measure.shading.belly_box)['fine_std']


class Sheet:
    """The targets of the front view of the sheet: the fur pixels, their medians, the belly
    contrast, and the colors of the dark blobs."""

    def __init__(self, cfg, meta):
        """Measures the sheet."""
        self.meta = meta['front']
        c0, c1 = self.meta['column']
        sheet = Image.open(cfg.paths.sheet).convert('RGB')
        self.rgb = sheet.crop((c0, 0, c1, sheet.size[1]))
        mask = Image.open(os.path.join(cfg.paths.masks, 'front.png')).convert('L')
        self.mask = mask.crop((c0, 0, c1, mask.size[1]))
        self.rows = fur_rows(self.meta, cfg.compare.fur_band)
        self.min_sat = self._saturation_floor(cfg)
        self.fur = fur_pixels(self.rgb, self.mask, self.rows, self.min_sat)
        self.hsv = hsv_medians(self.fur)
        self.median = channel_medians(self.fur)
        self.contrast = belly_contrast(cfg, self.meta, self.rgb, 0)
        self.dark_pieces = []
        self.blobs = self._blobs(cfg, sheet, meta, self.dark_pieces)
        px, mp = self.rgb.load(), self.mask.load()
        self.fur_max = sorted(max(px[x, y]) for y in self.rows for x in range(self.rgb.size[0])
                              if mp[x, y])

    def _saturation_floor(self, cfg):
        """Finds the saturation floor of the fur pixels (compare.fur_min_saturation)."""
        px, mp = self.rgb.load(), self.mask.load()
        sats = sorted((max(c) - min(c)) / max(c) for y in self.rows
                      for x in range(self.rgb.size[0]) if mp[x, y]
                      for c in [px[x, y]] if max(c) / 255 >= 0.18)
        bg = cfg.sheet.background
        floor = (max(bg) - min(bg)) / max(max(bg), 1) + SATURATION_PAD
        if not sats:
            return cfg.compare.fur_min_saturation
        return round(min(SATURATION_MAX, max(floor, SATURATION_SHARE * sats[len(sats) // 20])),
                     2)

    @staticmethod
    def _blobs(cfg, sheet, meta, dark_pieces):
        """Measures the colors of each feature on the sheet (the class pixels of its regions,
        in its first view): the median, and for a dark piece the median of its dark pixels
        ("<name>.dark") and of their darkest quarter ("<name>.darkest"). Adds the largest
        channel of each dark pixel of a dark piece to dark_pieces."""
        classes = {n: measure_features.ColorClass(s, cfg) for n, s in cfg.measure.classes.items()}
        out = {}
        for name, feature in cfg.measure.features.items():
            if feature.method == 'bump' or not feature.regions:
                continue
            view = 'front' if 'front' in feature.regions else next(iter(feature.regions))
            pic = measure_features.sheet_picture(cfg, sheet, view, meta[view])
            kinds = [classes[c] for c in feature.classes]
            colors = []
            for _, box, _ in measure_features.regions_of(pic, feature, view, name):
                pic.set_medians(kinds, box)
                x0, y0, x1, y1 = box
                colors += [pic.px[x, y] for y in range(y0, y1) for x in range(x0, x1)
                           if pic.mask[y][x] and any(k.test(pic.px[x, y]) for k in kinds)]
            if colors:
                out[name] = [round(v) for v in channel_medians(colors)]
            dark = sorted((c for c in colors if max(c) < DARK_MAX), key=measure_features.luminance)
            if dark:
                if name in DARK.values():
                    dark_pieces += [max(c) for c in dark]
                out[f'{name}.dark'] = [round(v) for v in channel_medians(dark)]
                quarter = dark[:max(1, len(dark) // 4)]
                out[f'{name}.darkest'] = [round(v) for v in channel_medians(quarter)]
        return out


def flat_luminance(basis, pixels):
    """Lists the linear luminance of each flat unit render at pixels (x, y)."""
    out = []
    for unit in basis.flat:
        loads = [band.load() for band in unit]
        out.append([0.2126 * loads[0][p] + 0.7152 * loads[1][p] + 0.0722 * loads[2][p]
                    for p in pixels])
    return out


def solve_hemi(lum, fill, key):
    """Finds the hemisphere level whose median light on a white surface is LEVEL, for a key
    level (bisection; the median grows with the hemisphere level)."""
    rim, h, k, f = lum

    def median(hemi):
        return statistics.median(rim[i] + h[i] * hemi + k[i] * key + f[i] * fill
                                 for i in range(len(rim)))

    lo, hi = 0.0, 20.0
    if median(lo) >= LEVEL:
        return 0.0
    for _ in range(30):
        mid = 0.5 * (lo + hi)
        if median(mid) < LEVEL:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def fit_scale(cfg, basis, sheet, mask, hemi, key):
    """Finds the scale of each palette channel (linear) that gives the fur medians of the sheet
    under a light. Returns (scale, the render, its fur pixels)."""
    scale = [1.0, 1.0, 1.0]
    target = [LIN[int(round(v))] for v in sheet.median]
    for _ in range(4):
        rgb = basis.image(hemi, key, scale)
        fur = fur_pixels(rgb, mask, sheet.rows, sheet.min_sat)
        got = channel_medians(fur)
        scale = [s * target[c] / max(LIN[int(round(got[c]))], 1e-6) for c, s in enumerate(scale)]
    rgb = basis.image(hemi, key, scale)
    return scale, rgb, fur_pixels(rgb, mask, sheet.rows, sheet.min_sat)


def scaled(rgb, scale):
    """Scales an sRGB color by a linear scale of each channel."""
    out = []
    for c, v in enumerate(rgb):
        x = LIN[v] * scale[c]
        out.append(ENCODE[int(round(min(max(x, 0.0), 1.0) * 65535))])
    return out


def fit_light(cfg, basis, sheet, contrast=None):
    """Finds the key level (bisection on the belly contrast), the hemisphere level, and the
    palette scale. contrast: the target contrast (default: the contrast of the sheet). Returns a
    dict of the fit."""
    meta = sheet.meta
    target = sheet.contrast if contrast is None else contrast
    mask = basis.alpha.point(lambda v: 255 if v > 127 else 0)
    mp = mask.load()
    pixels = [(x, y) for y in sheet.rows[::2] for x in range(0, basis.size[0], 2) if mp[x, y]]
    lum = flat_luminance(basis, pixels)
    offset = meta['column'][0]

    def at(key):
        hemi = solve_hemi(lum, basis.fill, key)
        scale, rgb, fur = fit_scale(cfg, basis, sheet, mask, hemi, key)
        return {'key': key, 'hemi': hemi, 'scale': scale,
                'contrast': belly_contrast(cfg, meta, rgb, offset), 'hsv': hsv_medians(fur)}

    lo, hi = at(0.0), at(8.0)
    trail = [lo, hi]
    if target <= lo['contrast']:
        best = lo
    elif target >= hi['contrast']:
        best = hi
    else:
        for _ in range(9):
            t = (target - lo['contrast']) / (hi['contrast'] - lo['contrast'])
            mid = at(lo['key'] + min(max(t, 0.1), 0.9) * (hi['key'] - lo['key']))
            trail.append(mid)
            if mid['contrast'] < target:
                lo = mid
            else:
                hi = mid
            if abs(mid['contrast'] - target) < 0.02:
                break
        best = min(trail, key=lambda r: abs(r['contrast'] - target))
    best['trail'] = [(round(r['key'], 3), round(r['hemi'], 3), r['contrast']) for r in trail]
    best['range'] = [trail[0]['contrast'], trail[1]['contrast']]
    return best


def palette(cfg, source_palette, sheet, scale, notes):
    """Makes the new palette: the fur family scaled from the palette of the GLB, and the dark
    pieces from the sheet. Adds a note for each family color that the scale clips."""
    out = {name: list(rgb) for name, rgb in cfg.paint.palette.items()}
    fur = scaled(source_palette['fur'], scale)
    for name in FUR_FAMILY:
        if name in source_palette:
            out[name] = scaled(source_palette[name], scale)
            if max(out[name]) >= CLIP and name != 'fur':
                notes.append(f'palette.{name}: the ratio of {name} to the fur of the GLB clips '
                             f'({out[name]}), so it takes the fur color: measure it')
                out[name] = list(fur)
    for name, feature in DARK.items():
        key = f'{feature}.darkest' if name == 'eye' else f'{feature}.dark'
        if key in sheet.blobs and name in out:
            out[name] = list(sheet.blobs[key])
    return out


def class_overlaps(cfg, sheet):
    """Measures the share of the fur pixels of the sheet that each color class with a fixed
    threshold takes."""
    out = {}
    for name, spec in cfg.measure.classes.items():
        k = measure_features.ColorClass(spec, cfg)
        if k.needs_median:
            continue
        n = sum(1 for c in sheet.fur if k.test(c))
        out[name] = round(n / max(len(sheet.fur), 1), 4)
    return out


def dark_thresholds(cfg, sheet):
    """Finds the threshold of each dark class (a class with only max_under): the middle of the
    gap between the dark pieces and the darkest fur. Returns ({class: value}, the gap [dark
    pieces, fur] or None when there is no gap)."""
    if not sheet.dark_pieces or not sheet.fur_max:
        return {}, None
    pieces = sorted(sheet.dark_pieces)[int(0.9 * (len(sheet.dark_pieces) - 1))]
    fur = sheet.fur_max[int(0.02 * (len(sheet.fur_max) - 1))]
    if pieces >= fur:
        return {}, None
    out = {}
    for name, spec in cfg.measure.classes.items():
        given = [k for k, v in spec.items() if v is not None]
        if given == ['max_under']:
            out[name] = int(round((pieces + fur) / 2))
    return out, [pieces, fur]


def deciding_classes(cfg):
    """Lists the classes that decide what a feature finds: {class: [features]}."""
    out = {}
    for name, f in cfg.measure.features.items():
        names = [f.rank, f.rim] if f.method == 'blobs' else []
        if len(f.classes) == 1:
            names.append(f.classes[0])
        for c in names:
            if c and name not in out.get(c, []):
                out.setdefault(c, []).append(name)
    return out


def calibrate(cfg, source_cfg, folder, contrast=None):
    """Fits the light and the palette of cfg from the renders in folder (of the GLB of
    source_cfg) and measures the class overlaps. contrast: a target belly contrast in place of
    the contrast of the sheet. Returns the result dict."""
    with open(cfg.paths.measure) as f:
        meta = json.load(f)['views']
    sheet = Sheet(cfg, meta)
    basis = Basis(folder, cfg.look.light.fill)
    best = fit_light(cfg, basis, sheet, contrast)
    notes = []
    new_palette = palette(cfg, source_cfg.paint.palette, sheet, best['scale'], notes)
    overlaps = class_overlaps(cfg, sheet)
    deciding = deciding_classes(cfg)
    warnings = [f'class {name} takes {share:.1%} of the fur pixels of the sheet: it overlaps '
                f'the fur, and {", ".join(deciding[name])} can measure fur'
                for name, share in overlaps.items() if share > OVERLAP and name in deciding]
    thresholds, gap = dark_thresholds(cfg, sheet)
    if gap is None and sheet.dark_pieces:
        warnings.append('the dark pieces and the darkest fur of the sheet overlap: no dark class '
                        'threshold separates them')
    target = sheet.contrast if contrast is None else contrast
    low, high = best['range']
    if target < low - 0.05:
        warnings.append(f'the belly contrast target {target} is under the contrast of the GLB '
                        f'of {source_cfg.animal.id} with no key light ({low}): its paint (the '
                        f'belly patch, paint.occlusion) gives more contrast than the sheet. '
                        f'Lower them, build, and calibrate again on the own GLB')
    elif target > high + 0.05:
        warnings.append(f'the belly contrast target {target} is over the contrast of the GLB '
                        f'with the largest key light ({high})')
    warnings += notes
    light = cfg.look.light
    return {
        'animal': cfg.animal.id, 'glb_of': source_cfg.animal.id, 'level': LEVEL,
        'sheet': {'fur_hsv': [round(v, 4) for v in sheet.hsv],
                  'fur_rgb': [round(v) for v in sheet.median],
                  'belly_contrast': sheet.contrast, 'colors': sheet.blobs},
        'target_contrast': sheet.contrast if contrast is None else contrast,
        'light': {'hemi': round(best['hemi'], 2), 'key': round(best['key'], 2),
                  'fill': light.fill},
        'light_before': {'hemi': light.hemi, 'key': light.key, 'fill': light.fill},
        'render': {'fur_hsv': [round(v, 4) for v in best['hsv']],
                   'belly_contrast': best['contrast']},
        'palette': new_palette,
        'palette_before': {k: list(v) for k, v in cfg.paint.palette.items()},
        'scale': [round(s, 4) for s in best['scale']],
        'trail': best['trail'],
        'fur_min_saturation': sheet.min_sat,
        'fur_min_saturation_before': cfg.compare.fur_min_saturation,
        'class_overlaps': overlaps,
        'dark_classes': thresholds,
        'class_specs': {k: {a: b for a, b in cfg.measure.classes[k].items() if b is not None}
                        for k in thresholds},
        'dark_classes_before': {k: cfg.measure.classes[k].max_under for k in thresholds},
        'dark_gap': gap,
        'warnings': warnings,
    }


def margin(a, b):
    """Calculates the relative difference of b from a."""
    return abs(b - a) / max(abs(a), 1e-9)


def summary(res):
    """Formats the result as lines for the terminal."""
    s, r = res['sheet'], res['render']
    before, light = res['light_before'], res['light']
    lines = [f'calibrate {res["animal"]} (renders of the GLB of {res["glb_of"]}):',
             f'  sheet: fur HSV {s["fur_hsv"]}, fur RGB {s["fur_rgb"]}, belly contrast '
             f'{s["belly_contrast"]}',
             f'  light: hemi {before["hemi"]} -> {light["hemi"]}, key {before["key"]} -> '
             f'{light["key"]} (fill {light["fill"]}; the median light on white is {res["level"]})',
             f'  render: fur HSV {r["fur_hsv"]}, belly contrast {r["belly_contrast"]}']
    if res['fur_min_saturation'] != res['fur_min_saturation_before']:
        lines.append(f'  compare.fur_min_saturation: {res["fur_min_saturation_before"]} -> '
                     f'{res["fur_min_saturation"]}')
    for name, rgb in res['palette'].items():
        if rgb != res['palette_before'].get(name):
            lines.append(f'  palette.{name}: {res["palette_before"].get(name)} -> {rgb}')
    shares = ', '.join(f'{k} {v:.1%}' for k, v in res['class_overlaps'].items())
    lines.append(f'  fur pixels in each class: {shares}')
    for name, value in res['dark_classes'].items():
        lines.append(f'  measure.classes.{name}.max_under: {res["dark_classes_before"][name]} -> '
                     f'{value} (dark pieces up to {res["dark_gap"][0]}, darkest fur '
                     f'{res["dark_gap"][1]})')
    for w in res['warnings']:
        lines.append(f'  WARN {w}')
    return lines


def write(path, res):
    """Writes the light and the palette of a result into an animal.toml (the comments stay)."""
    from studio.like import ConfigText  # noqa: PLC0415
    with open(path) as f:
        doc = ConfigText(f.read())
    note = f'python3 studio calibrate ({res["glb_of"]} GLB)'
    doc.set('look.light', 'hemi', res['light']['hemi'], note)
    doc.set('look.light', 'key', res['light']['key'], note)
    if res['fur_min_saturation'] != res['fur_min_saturation_before']:
        doc.set('compare', 'fur_min_saturation', res['fur_min_saturation'], note)
    for name, rgb in res['palette'].items():
        if rgb != res['palette_before'].get(name):
            doc.set('paint.palette', name, rgb, note)
    for name, value in res['dark_classes'].items():
        if value != res['dark_classes_before'][name]:
            spec = dict(res['class_specs'][name], max_under=value)
            doc.set('measure.classes', name, spec, note)
    with open(path, 'w') as f:
        f.write(doc.text)


def save(cfg, res):
    """Writes the result into <out>/calibrate/look.json."""
    folder = os.path.join(cfg.paths.out, 'calibrate')
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'look.json'), 'w') as f:
        json.dump(res, f, indent=1)
        f.write('\n')


def check_sum(basis, light):
    """Measures how well the sum of the unit renders gives the render of a light: the largest
    channel difference at the 99th percentile, in sRGB levels (math only)."""
    synth = basis.image(light.hemi, light.key)
    a, b = synth.load(), basis.check.load()
    mp = basis.alpha.load()
    w, h = synth.size
    diffs = sorted(max(abs(a[x, y][c] - b[x, y][c]) for c in range(3))
                   for y in range(0, h, 3) for x in range(0, w, 3) if mp[x, y] > 127)
    return diffs[int(0.99 * (len(diffs) - 1))] if diffs else math.inf
