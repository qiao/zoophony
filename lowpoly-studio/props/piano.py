"""A low-poly grand piano, sized to a seated animal.

numpy only, three.js axes. The player sits at -z and faces +z: the front edge of the keys is at
keys_front, and the case runs to +z. The lowest key is on the left of the player (x > 0), as on a
real piano. The case follows the grand piano of the app (src/models/instruments/piano.ts): the
straight side on the bass side, the bentside on the treble side, the lid hinged on the straight
side and open toward the right of the player (the audience), the inside with the soundboard, the
iron plate, and the strings.

Two scales size the parts. The key scale (the white key width against a real key of 1.24 m / 52)
sizes the keys. The case scale (the keyboard width against a real keyboard of 1.24 m) sizes the
case, the lid, the desk, the legs, and the pedals, so a keyboard with fewer keys gets a smaller
case.

build() returns the nodes (the piano, and one node for each key that moves), the test boxes of
the scene check, and the keys. A moving key turns about its pivot, deep under the fallboard, as
the key of a real piano turns on its balance rail.
"""

import math

import numpy as np

from props.shapes import Builder, box, place, prism, rim, rot_x, rot_z, tube

# The real piano of the app, in meters: the keyboard width, the white key width, the visible
# length of a white key, and the width of a black key against a white key.
REAL_KEYBOARD = 1.24
REAL_KEY = 1.24 / 52

# The pattern of the black keys: a black key follows each white key of this octave index (C to B).
BLACK_AFTER = (True, True, False, True, True, True, False)
WHITE_NAMES = 'CDEFGAB'

# The outline of the case of the app in its axes (x to the right of the player, z from the
# front edge of the keys to the tail at -2.0), and its center for the inside.
CASE_OUTLINE = ((0.7, -0.17), (0.7, -0.55), (0.62, -0.85), (0.45, -1.1), (0.32, -1.35),
                (0.26, -1.6), (0.18, -1.82), (0.02, -1.98), (-0.25, -2.0), (-0.5, -1.93),
                (-0.66, -1.75), (-0.7, -1.5), (-0.7, -0.17))
CASE_CENTER = (-0.1, -1.0)
CASE_FRONT = 0.15
CASE_LENGTH = 1.85


def keyboard(c):
    """Lists the keys of the piano: one dict for each key, white keys from the left of the
    player (x > 0) to the right, each black key after its white key.

    c: the resolved sizes (studio/props.py piano_sizes). Each key has its name (for example
    'C4', 'Cs4'), its index (the white index, or the white index + 0.5 for a black key), black,
    its press point (the top of the key where a finger presses it: a quarter of a white key from
    its front, in front of the black keys), its pivot, the angle of a full press in degrees,
    and its box (size, center).
    """
    w, n = c['key_width'], c['white_keys']
    top, front, depth = c['keys_top'], c['keys_front'], c['keys_depth']
    pivot_z = front + 1.6 * depth
    keys = []
    for i in range(n):
        x = (0.5 * (n - 1) - i) * w
        name = f'{WHITE_NAMES[i % 7]}{c["lowest_octave"] + i // 7}'
        press = np.array([x, top, front + 0.25 * depth])
        pivot = np.array([x, top - c['key_height'], pivot_z])
        keys.append({'name': name, 'index': float(i), 'black': False, 'press': press,
                     'pivot': pivot, 'angle': math.degrees(math.atan2(c['key_dip'],
                                                                      pivot_z - press[2])),
                     'box': ((0.92 * w, c['key_height'], depth),
                             (x, top - 0.5 * c['key_height'], front + 0.5 * depth))})
        if BLACK_AFTER[i % 7] and i < n - 1:
            bx = x - 0.5 * w
            bz0 = front + depth - c['black_depth']
            btop = top + c['black_height']
            press = np.array([bx, btop, bz0 + 0.4 * c['black_depth']])
            pivot = np.array([bx, top - c['key_height'], pivot_z])
            keys.append({'name': f'{WHITE_NAMES[i % 7]}s{c["lowest_octave"] + i // 7}',
                         'index': i + 0.5, 'black': True, 'press': press, 'pivot': pivot,
                         'angle': math.degrees(math.atan2(c['key_dip'], pivot_z - press[2])),
                         'box': ((0.5 * w, c['black_height'] + 0.6 * c['key_height'],
                                  c['black_depth']),
                                 (bx, top + 0.5 * c['black_height'] - 0.3 * c['key_height'],
                                  bz0 + 0.5 * c['black_depth']))})
    return keys


def case_outline(c):
    """Maps the case outline of the app onto this piano: mirrored in x and z (the player of the
    studio faces +z), scaled to the case width and length, behind the keys."""
    sx = c['case_width'] / 1.4
    sz = c['case_length'] / CASE_LENGTH
    back = c['keys_front'] + c['keys_depth']

    def at(x, z):
        return (-x * sx, back + (-z - CASE_FRONT) * sz)

    # The outline of the app runs counterclockwise from above in its axes; the mirror in both x
    # and z is a half turn about y, so it stays counterclockwise.
    return np.array([at(x, z) for x, z in CASE_OUTLINE]), np.array(at(*CASE_CENTER)), at


def build(c, moving=()):
    """Builds the piano.

    c: the resolved sizes and colors (studio/props.py piano_sizes). moving: the names of the keys
    that get a node of their own (the keys that the clips press).
    Returns (nodes, boxes, keys): nodes are dicts {name, verts, faces, colors, parent, origin},
    boxes are (piece, center, half sizes) for the scene check.
    """
    col = c['colors']
    s = c['case_scale']
    top, front, depth = c['keys_top'], c['keys_front'], c['keys_depth']
    kb = c['white_keys'] * c['key_width']
    back = front + depth
    yb = top - c['rim_below_keys']
    yt = top + c['rim_above_keys']
    body = Builder()
    boxes = []

    def part(name, shape, color, rot=None, at=None):
        body.add(shape, color, rot, at)
        v = place(shape[0], rot, at)
        lo, hi = v.min(axis=0), v.max(axis=0)
        boxes.append((name, 0.5 * (lo + hi), 0.5 * (hi - lo)))

    # The case: solid below the soundboard, the rim wall above it, and the inside.
    outline, center, at = case_outline(c)
    board_y = yt - 0.14 * s
    body.add(prism(outline, yb, board_y), col['case'])
    body.add(rim(outline, 0.92, board_y, yt, center), col['case'])
    lo, hi = outline.min(axis=0), outline.max(axis=0)
    boxes.append(('case', np.array([0.5 * (lo[0] + hi[0]), 0.5 * (yb + yt), 0.5 * (lo[1] + hi[1])]),
                  np.array([0.5 * (hi[0] - lo[0]), 0.5 * (yt - yb), 0.5 * (hi[1] - lo[1])])))
    inner = center + (outline - center) * 0.92
    body.add(prism(inner, board_y, board_y + 0.006 * s), col['inside'])
    xs = inner[:, 0]
    z_in = inner[:, 1].min()
    plate_y = yt - 0.08 * s
    plate_len = 0.22 * s
    body.add(box((xs.max() - xs.min(), 0.012 * s, plate_len),
                 (0.5 * (xs.max() + xs.min()), plate_y - 0.006 * s, z_in + 0.5 * plate_len)),
             col['metal'])
    string_y = yt - 0.06 * s
    gap = 0.06 * s
    for k in range(16):
        x = xs.min() + gap + k * (xs.max() - xs.min() - 2 * gap) / 15
        end = _outline_behind(inner, x, z_in + gap) - gap
        if end > z_in + 2 * gap:
            body.add(box((0.016 * s, 0.003 * s, end - z_in - gap),
                         (x, string_y, 0.5 * (z_in + gap + end))), col['strings'])

    # The lid: the outline as a thin plate, hinged on the straight side (x > 0) and turned up so
    # that it opens toward the right of the player. The prop stick holds it on the treble side.
    hinge = np.array([outline[:, 0].max(), yt, 0.0])
    lid_v, lid_f = prism(outline, 0.0, 0.02 * s)
    lid_v = (lid_v + np.array([0.0, yt, 0.0]) - hinge) @ rot_z(-c['lid_open']).T + hinge
    body.add((lid_v, lid_f), col['case'])
    stick_x, stick_z = at(0.33, -0.95)
    lid_y = yt + (hinge[0] - stick_x) * math.tan(math.radians(c['lid_open']))
    body.add(tube([[stick_x, yt, stick_z], [stick_x, lid_y, stick_z]], [0.012 * s] * 2, 4),
             col['case'])

    # The key bed, the cheeks, the fallboard behind the keys, and the music desk with a sheet.
    case_front = outline[:, 1].min()
    part('keybed', box((c['case_width'], 0.06 * s, case_front - front + 0.012),
                       (0.0, top - c['key_height'] - 0.03 * s, 0.5 * (front - 0.012 + case_front))),
         col['case'])
    for side in (1.0, -1.0):
        part(f'cheek{int(side)}', box((0.08 * s, 0.1 * s, case_front - front + 0.012),
                                      (side * (0.5 * kb + 0.04 * s), top,
                                       0.5 * (front - 0.012 + case_front))), col['case'])
    part('fallboard', box((kb, 0.07 * s, case_front - back),
                          (0.0, top + 0.025 * s, 0.5 * (back + case_front))),
         col['case'])
    desk_at = np.array([0.0, yt + 0.12 * s, case_front + 0.2 * s])
    part('desk', box((0.7 * s, 0.26 * s, 0.015 * s)), col['case'], rot_x(15.0), desk_at)
    sheet = rot_x(15.0) @ np.array([0.0, 0.01 * s, -0.0085 * s]) + desk_at
    body.add(box((0.42 * s, 0.2 * s, 0.002 * s)), col['sheet'], rot=rot_x(15.0), at=sheet)

    # Three legs, the lyre, the pedal box, and three pedals toward the player.
    for name, (x, z) in (('leg_left', (-0.5 * kb / s, -0.3)), ('leg_right', (0.5 * kb / s, -0.3)),
                         ('leg_tail', (-0.15, -1.8))):
        lx, lz = at(x, z)
        part(name, tube([[lx, 0.0, lz], [lx, yb, lz]], [0.035 * s, 0.045 * s], 8), col['case'])
    lyre_x, lyre_z = at(0.0, -0.45)
    part('lyre', box((0.16 * s, yb - 0.05 * s, 0.04 * s), (lyre_x, 0.5 * (yb + 0.05 * s), lyre_z)),
         col['case'])
    pedal_z = lyre_z - 0.03 * s
    part('pedal_box', box((0.2 * s, 0.03 * s, 0.12 * s), (lyre_x, 0.035 * s, pedal_z)), col['case'])
    for x in (-0.05 * s, 0.0, 0.05 * s):
        body.add(box((0.025 * s, 0.01 * s, 0.07 * s), (x, 0.035 * s, pedal_z - 0.08 * s)),
                 col['metal'])

    # The keys: the keys that move are nodes of their own, the others are part of the piano.
    keys = keyboard(c)
    nodes = []
    for k in keys:
        size, cen = k['box']
        shape = box(size, cen)
        color = col['black'] if k['black'] else col['white']
        if k['name'] in moving:
            b = Builder().add(shape, color)
            v, f, fc = b.mesh()
            nodes.append({'name': f'{c["name"]}_key_{k["name"]}', 'verts': v, 'faces': f,
                          'colors': fc, 'parent': c['name'], 'origin': k['pivot']})
        else:
            body.add(shape, color)
    keys_lo = top - c['key_height']
    keys_hi = top + c['black_height']
    boxes.append(('keys', np.array([0.0, 0.5 * (keys_lo + keys_hi), front + 0.5 * depth]),
                  np.array([0.5 * kb, 0.5 * (keys_hi - keys_lo), 0.5 * depth])))
    v, f, fc = body.mesh()
    nodes.insert(0, {'name': c['name'], 'verts': v, 'faces': f, 'colors': fc, 'parent': None,
                     'origin': np.zeros(3)})
    return nodes, boxes, keys


def _outline_behind(outline, x, z):
    """Finds the nearest crossing of the outline with the line x = const behind z (toward +z),
    or z when no edge crosses it there."""
    best = math.inf
    n = len(outline)
    for i in range(n):
        x0, z0 = outline[i]
        x1, z1 = outline[(i + 1) % n]
        if x0 == x1 or x < min(x0, x1) or x > max(x0, x1):
            continue
        at = z0 + (z1 - z0) * (x - x0) / (x1 - x0)
        if at > z:
            best = min(best, at)
    return best if math.isfinite(best) else z
