"""Finds where the views of a sheet disagree, at intake (Pillow only).

A sheet shows one figure from four cameras. When two views disagree (a scale, a ground line, an
ear, a head turn, an arm gap), a check of the build can fail because of the sheet, and no change
of the model can pass it. The intake runs these checks on the masks and on the dark features of
the sheet, and writes <out>/sheet-check.json. The checks describe the sheet: the head checks read
no color class of the config (they find the dark blobs relative to the fur level of the sheet),
so `calibrate` does not move them.

    figure_height            the spread of the figure heights of the views (each view is scaled
                             to its own height, so a view of another scale moves every measure)
    ground_line              the spread of the ground rows, in px
    ear_height               the ear bumps (top to notch) of the front and the back view
    arm_gap                  the share of the chest rows (0.45 to 0.65) of the front and the back
                             view with background between the arms and the trunk
    head_turn.front          the offset of the nose from the middle of the eyes, in px
    head_turn.three_quarter  the head azimuth of the 3/4 view from the eye spacing (the spacing
                             shrinks with the cosine of the azimuth) against the view azimuth
    symmetry                 the IoU of the front mask with its mirror about the axis

Each check has a value, a limit, "ok", the values of each view, the build checks that the
disagreement can fail ("affects" in words, "checks" as name patterns), and a note. A failed check
is a warning: the build runs, and studio/checks.py marks each failing build check that a warning
can cause.
"""

import fnmatch
import math

from studio import measure_features

# The limits of the checks (docs/sheet-spec.md).
FIGURE_HEIGHT = 0.01
GROUND_LINE = 2.0
EAR_HEIGHT = 0.15
ARM_GAP = 0.8
NOSE_OFFSET_PX = 2.0
HEAD_TURN = 4.0
SYMMETRY = 0.97

# The head checks find the eyes and the nose from the sheet alone, with no color class or region
# of the config, so a tuned class (`calibrate`) cannot move them. The fur level is the median of
# the largest channel of the silhouette pixels in HEAD_BAND ([x0, y0, x1, y1] in animal heights).
# A dark blob has a largest channel under DARK_SHARE of the fur level, at least EYE_MIN_AREA
# pixels, and a core (its darkest pixel) under CORE_SHARE of the fur level: a pupil or a nose,
# not the shade of an inner ear or of the mouth line.
HEAD_BAND = (-0.3, 0.75, 0.3, 1.0)
DARK_SHARE = 0.5
CORE_SHARE = 0.15
EYE_MIN_AREA = 10

# The smallest spacing of the 3/4 eyes as a share of the front spacing (a head azimuth of 66
# degrees at most).
EYE_SPACING = 0.4

# The largest height difference of the two eyes of a view, in animal heights.
EYE_HEIGHT = 0.02

# The largest height difference of the eyes of the front view and of the 3/4 view, in animal
# heights (the camera of each view is level).
EYE_LEVEL = 0.03

# The bump of an ear when the config has no ears feature of the method "bump".
EAR_REGION = [-1.0, 0.7, 1.0, 1.1]


# The build checks that each disagreement can fail (fnmatch patterns of check names).
AFFECTS = {
    'figure_height': [],
    'ground_line': [],
    'ear_height': ['ear_*'],
    'arm_gap': ['iou.front', 'iou.back'],
    'head_turn.front': ['eye_*.front.*', 'nose_*.front.*'],
    'head_turn.three_quarter': ['iou.three_quarter', 'eye_*.three_quarter.*',
                                'nose_*.three_quarter.*'],
    'symmetry': ['iou.front'],
}


def _check(name, value, limit, ok, views, affects, note=''):
    """Makes one check of the sheet."""
    out = {'name': name, 'value': value, 'limit': limit, 'ok': bool(ok), 'views': views,
           'affects': affects, 'checks': AFFECTS[name]}
    if note:
        out['note'] = note
    return out


def figure_checks(meta):
    """Checks the figure heights and the ground rows of the views."""
    heights = {v: m['height_px'] for v, m in meta.items()}
    grounds = {v: m['ground_px'] for v, m in meta.items()}
    mid = sorted(heights.values())[len(heights) // 2]
    spread = (max(heights.values()) - min(heights.values())) / mid
    ground = max(grounds.values()) - min(grounds.values())
    return [
        _check('figure_height', round(spread, 4), FIGURE_HEIGHT, spread <= FIGURE_HEIGHT,
               heights, 'every IoU and feature check: each view is scaled to its own height, '
                        'so a view of another scale moves each measure of that view'),
        _check('ground_line', round(ground, 1), GROUND_LINE, ground <= GROUND_LINE, grounds,
               'the feet and the heights of each view'),
    ]


def ear_feature(cfg):
    """Returns the ears feature of the config (a "bump"), or a default bump feature."""
    for feature in cfg.measure.features.values():
        if feature.method == 'bump':
            return feature
    from studio.config import Section  # noqa: PLC0415
    from studio.schema import FEATURE  # noqa: PLC0415
    plain = {k: f.default for k, f in FEATURE.fields.items() if hasattr(f, 'default')}
    plain.update(method='bump', regions={'front': EAR_REGION, 'back': EAR_REGION},
                 split=('front', 'back'), dark=None, dark_views=())
    return Section(plain)


def ear_checks(cfg, pictures):
    """Checks the ear bumps of the front and the back view: the height from the top to the
    notch of each ear, as a share of the figure height."""
    feature = ear_feature(cfg)
    heights = {}
    for view in ('front', 'back'):
        if view not in pictures or view not in feature.regions:
            continue
        pic = pictures[view]
        regions = measure_features.regions_of(pic, feature, view, 'ear')
        for region, box, outer_is_low in regions:
            res = measure_features.measure_bump(pic, box, outer_is_low, feature, None)
            if res['items']:
                heights[f'{view}.{region}'] = res['items'][0]['height']
    front = [h for k, h in heights.items() if k.startswith('front.') and h]
    back = [h for k, h in heights.items() if k.startswith('back.') and h]
    if not front or not back:
        return [_check('ear_height', None, EAR_HEIGHT, True, heights, '', 'not measured')]
    f, b = sum(front) / len(front), sum(back) / len(back)
    diff = abs(f - b) / max(f, b)
    return [_check('ear_height', round(diff, 3), EAR_HEIGHT, diff <= EAR_HEIGHT, heights,
                   'ear_height.*, ear_width.*: the front and the back view show the ears in '
                   'other places')]


def arm_checks(pictures):
    """Checks the arm gap of the front and the back view: the share of the rows from 0.45 to
    0.65 of the height with three or more runs (arm, trunk, arm)."""
    shares = {}
    for view in ('front', 'back'):
        if view not in pictures:
            continue
        pic = pictures[view]
        rows = [int(round(pic.ground - h / 100 * pic.height)) for h in range(45, 66)]
        n = sum(1 for y in rows
                if len(measure_features.runs(pic.mask[y], 0, pic.w)) >= 3)
        shares[view] = round(n / len(rows), 3)
    if 'front' not in shares:
        return []
    low = min(shares.values())
    spread = max(shares.values()) - low
    ok = low >= ARM_GAP and spread <= 0.3
    return [_check('arm_gap', low, ARM_GAP, ok, shares,
                   'iou.front, iou.back: where the arms touch the trunk, the trunk width is a '
                   'guess (field.trunk.width_points)',
                   'the front and the back view disagree' if spread > 0.3 else '')]


class DarkTest:
    """The dark pixel test of the head checks: the largest channel under a limit."""

    # The test reads no median of a region (measure_features.blobs_in).
    needs_median = False

    def __init__(self, limit):
        """Stores the limit of the largest channel."""
        self.limit = limit

    def test(self, c):
        """Tells if a pixel (r, g, b) is dark."""
        return max(c) < self.limit


def dark_blobs(pic):
    """Finds the dark blobs of the head band of a view of the sheet: [{x, y, area}], with x and y
    the middle of the box of the blob in animal heights, and area in pixels. Reads no config."""
    box = pic.box_px(HEAD_BAND)
    x0, y0, x1, y1 = box
    levels = sorted(max(pic.px[x, y]) for y in range(y0, y1) for x in range(x0, x1)
                    if pic.mask[y][x])
    if not levels:
        return []
    fur = levels[len(levels) // 2]
    out = []
    for comp in measure_features.blobs_in(pic, box, [DarkTest(DARK_SHARE * fur)]):
        if len(comp) < EYE_MIN_AREA:
            continue
        if min(max(pic.px[p]) for p in comp) >= CORE_SHARE * fur:
            continue
        if 2 * sum(1 for x, y in comp if pic.mask[y][x]) < len(comp):
            continue
        xs = [p[0] for p in comp]
        ys = [p[1] for p in comp]
        out.append({'x': pic.x_of(0.5 * (min(xs) + max(xs))),
                    'y': pic.y_of(0.5 * (min(ys) + max(ys))), 'area': len(comp)})
    return out


def eye_pair(items, front=None):
    """Finds the two eyes among the dark blobs of a view, left to right, or None: of the pairs
    whose heights differ by EYE_HEIGHT at most, the pair whose smaller blob is largest (then the
    larger total area). With no front pair (the front view), the eyes are on both sides of the
    axis. With the front pair, the eyes are at least EYE_SPACING of its spacing apart, and at
    most EYE_LEVEL above or below it."""
    def fits(a, b):
        if abs(a['y'] - b['y']) > EYE_HEIGHT:
            return False
        if front is None:
            return a['x'] * b['x'] < 0
        level = (front[0]['y'] + front[1]['y']) / 2
        return (abs(a['x'] - b['x']) >= EYE_SPACING * abs(front[1]['x'] - front[0]['x'])
                and abs(a['y'] - level) <= EYE_LEVEL and abs(b['y'] - level) <= EYE_LEVEL)

    pairs = [((min(a['area'], b['area']), a['area'] + b['area']), a, b)
             for i, a in enumerate(items) for b in items[i + 1:] if fits(a, b)]
    if not pairs:
        return None
    _, a, b = max(pairs, key=lambda p: p[0])
    return sorted([a, b], key=lambda item: item['x'])


def nose_blob(items, eyes):
    """Finds the nose among the dark blobs of the front view: the largest blob below the eyes, or
    None."""
    level = min(eyes[0]['y'], eyes[1]['y']) - EYE_HEIGHT
    below = [item for item in items if item['y'] < level]
    return max(below, key=lambda item: item['area']) if below else None


def head_checks(cfg, pictures):
    """Checks the head turn of the front view (the nose offset from the middle of the eyes) and
    of the 3/4 view (the head azimuth from the eye spacing). The eyes and the nose are dark
    blobs of the sheet (dark_blobs), so the config classes do not move them."""
    out = []
    if 'front' not in pictures:
        return out
    front_blobs = dark_blobs(pictures['front'])
    eyes_front = eye_pair(front_blobs)
    nose_front = nose_blob(front_blobs, eyes_front) if eyes_front else None
    if eyes_front and nose_front:
        middle = (eyes_front[0]['x'] + eyes_front[1]['x']) / 2
        offset = (nose_front['x'] - middle) * pictures['front'].height
        out.append(_check('head_turn.front', round(offset, 1), NOSE_OFFSET_PX,
                          abs(offset) <= NOSE_OFFSET_PX,
                          {'eyes_middle_x': round(middle, 4), 'nose_x': nose_front['x']},
                          'eye_x.front, nose_x.front: the front view turns the head'))
    view = cfg.sheet.views.get('three_quarter')
    if not eyes_front or not view or 'three_quarter' not in pictures:
        return out
    eyes_34 = eye_pair(dark_blobs(pictures['three_quarter']), eyes_front)
    front = abs(eyes_front[1]['x'] - eyes_front[0]['x'])
    side = abs(eyes_34[1]['x'] - eyes_34[0]['x']) if eyes_34 else 0.0
    if 0.0 < side < front:
        head = math.degrees(math.acos(side / front))
        turn = view.azimuth - head
        px = side * pictures['three_quarter'].height
        error = math.degrees(1.0 / max(px * math.tan(math.radians(max(head, 5.0))), 1e-6))
        out.append(_check('head_turn.three_quarter', round(turn, 1), HEAD_TURN,
                          abs(turn) <= HEAD_TURN,
                          {'eye_spacing_front': round(front, 4),
                           'eye_spacing_three_quarter': round(side, 4),
                           'head_azimuth': round(head, 1), 'view_azimuth': view.azimuth},
                          'iou.three_quarter, eye_*.three_quarter: the 3/4 view turns the head '
                          '(positive: toward the camera); compare.head_turn can fit it',
                          f'about +-{error:.0f} deg for 1 px of eye spacing'))
    return out


def symmetry_checks(pictures):
    """Checks the mirror IoU of the front mask about its axis."""
    if 'front' not in pictures:
        return []
    pic = pictures['front']
    axis = pic.axis
    inter = union = 0
    for row in pic.mask:
        for x in range(pic.w):
            m = int(round(2 * axis - x - 1))
            a = row[x]
            b = row[m] if 0 <= m < pic.w else False
            inter += a and b
            union += a or b
    value = inter / max(union, 1)
    return [_check('symmetry', round(value, 4), SYMMETRY, value >= SYMMETRY,
                   {'front': round(value, 4)},
                   'the model is mirrored: an asymmetric front view lowers iou.front')]


def check(cfg, sheet, meta):
    """Runs the checks of a sheet on its masks (cfg.paths.masks) and its measures (meta: the
    views of measure.json). Returns {"ok", "warnings", "checks"}."""
    pictures = {v: measure_features.sheet_picture(cfg, sheet, v, m) for v, m in meta.items()}
    checks = figure_checks(meta)
    checks += ear_checks(cfg, pictures)
    checks += arm_checks(pictures)
    checks += head_checks(cfg, pictures)
    checks += symmetry_checks(pictures)
    warnings = [c['name'] for c in checks if not c['ok']]
    return {'ok': not warnings, 'warnings': warnings, 'checks': checks}


def causes(result, check_name):
    """Lists the warnings of a sheet check that can fail a build check of this name."""
    return [c['name'] for c in result.get('checks', []) if not c['ok']
            and any(fnmatch.fnmatchcase(check_name, p) for p in c.get('checks', []))]


def summary(result):
    """Formats the checks of a sheet as lines for the terminal."""
    lines = [f'sheet check: {len(result["checks"]) - len(result["warnings"])} of '
             f'{len(result["checks"])} agree' + (f', warnings: {", ".join(result["warnings"])}'
                                                 if result['warnings'] else '')]
    for c in result['checks']:
        if c['ok']:
            continue
        views = ', '.join(f'{k} {v}' for k, v in c['views'].items())
        lines.append(f'  WARN {c["name"]}: {c["value"]} (limit {c["limit"]}; {views})'
                     + (f' {c["note"]}' if c.get('note') else ''))
        lines.append(f'       can fail: {c["affects"]}')
    return lines
