"""The props of a role: rigid pieces on a bone of their own (role.toml).

numpy only. A hand prop (attach.bone = "hand") sits on a bone that is a child of a hand: the kind
"stick" is a handle and a long tapered shaft (a baton). Each one gives detail dicts (as
studio/details.py), the grip point, and the tip point, in a pose of the arms.

A scene prop (attach.bone = "scene") sits on a bone that is a child of the root, which does not
move: the kind "piano" (a low-poly grand piano) and the kind "bench" (a piano bench). Both are
sized to the seated body (scene_layout): the seat top is under the trunk of the seated pose, and
the keyboard is in front of the belly. Each one gives detail dicts and the boxes that the scene
check of the build tests the body against. The sheet pose hides them (scale 0).
"""

import numpy as np

from studio.details import detail, tube


def hand_props(role):
    """Lists the props of a role that sit in a hand."""
    return [pr for pr in role.props if pr.attach.bone == 'hand']


def scene_props(role):
    """Lists the props of a role that stand in the scene."""
    return [pr for pr in role.props if pr.attach.bone == 'scene']


def box(center, half):
    """Makes a box: 8 corners and 12 outward triangles."""
    c = np.asarray(center, float)
    h = np.asarray(half, float)
    signs = np.array([[x, y, z] for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)], float)
    verts = c + signs * h
    faces = [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1],
             [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
    return verts, np.array(faces)


def prism(outline, y0, y1):
    """Makes a prism from an outline in x-z (counterclockwise seen from above) between two
    heights. The caps are fans from the mean point, so the outline must be star-shaped from it."""
    pts = np.asarray(outline, float)
    n = len(pts)
    mid = pts.mean(axis=0)
    verts = [[x, y0, z] for x, z in pts] + [[x, y1, z] for x, z in pts]
    verts += [[mid[0], y0, mid[1]], [mid[0], y1, mid[1]]]
    b, t = 2 * n, 2 * n + 1
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces += [[i, j, n + j], [i, n + j, n + i], [b, j, i], [t, n + i, n + j]]
    return np.array(verts, float), np.array(faces)


def scene_layout(body, role):
    """Calculates the places of the seated pose that size the scene props.

    Returns {'drop': the hips offset down that puts the feet of the bind pose on the floor,
    'seat_top': the height of the seat top under the trunk, 'keys_top', 'keys_front'}.
    """
    drop = body.seated_drop()
    # The vertices of the low-poly skin sit facets.offset outside the field.
    seat_top = body.trunk_bottom() - body.cfg.facets.offset - drop
    out = {'drop': drop, 'seat_top': seat_top}
    for pr in scene_props(role):
        if pr.kind == 'piano':
            out['keys_top'] = seat_top + pr.piano.keys_top
            out['keys_front'] = pr.piano.keys_front
    return out


BLACK_PATTERN = (1, 1, 0, 1, 1, 1, 0)


def piano_keys(body, role):
    """Lists the keys of the piano of a role: (index, x, top y, z of the press point, black).

    The white keys run from C on the left of the animal (x > 0 is the animal's left) to the right.
    The press point of a white key is a third of its depth from the front edge, of a black key
    the middle of the black key.
    """
    pr = next(p for p in scene_props(role) if p.kind == 'piano')
    c = pr.piano
    lay = scene_layout(body, role)
    top, front, w = lay['keys_top'], c.keys_front, c.key_width
    n = c.white_keys
    keys = []
    for i in range(n):
        x = (0.5 * (n - 1) - i) * w
        keys.append((i, x, top, front + c.keys_depth / 3.0, False))
        if BLACK_PATTERN[i % 7] and i < n - 1:
            keys.append((i + 0.5, x - 0.5 * w, top + 0.014, front + 0.72 * c.keys_depth, True))
    return keys


def piano(body, pr, role):
    """Makes a grand piano: the keyboard, the key bed, the cheeks, the case with a bentside, the
    open lid, the music desk, three legs, and the lyre with two pedals.

    Returns (details, boxes): boxes are (name, center, half sizes) for the scene check.
    """
    c = pr.piano
    col = c.colors
    lay = scene_layout(body, role)
    top, front, depth, w = lay['keys_top'], c.keys_front, c.keys_depth, c.key_width
    width = c.white_keys * w
    pieces, boxes = [], []

    def add(name, verts, faces, color):
        pieces.append(detail(f'{pr.name}_{name}', verts, faces, color, pr.name, pr.name))

    def add_box(name, center, half, color, test=True):
        v, f = box(center, half)
        add(name, v, f, color)
        if test:
            boxes.append((name, np.asarray(center, float), np.asarray(half, float)))

    # The white keys (a small gap between them), the black keys, the key bed, the cheeks, the
    # fallboard behind the keys.
    for i, x, ky, kz, black in piano_keys(body, role):
        if black:
            add_box(f'key{i}', [x, ky - 0.007, front + 0.72 * depth], [0.28 * w, 0.011, 0.3 * depth],
                    col.black, test=False)
        else:
            add_box(f'key{i}', [x, top - 0.01, front + 0.5 * depth], [0.46 * w, 0.01, 0.5 * depth],
                    col.white, test=False)
    boxes.append(('keys', np.array([0.0, top - 0.004, front + 0.5 * depth]),
                  np.array([0.5 * width, 0.017, 0.5 * depth])))
    bed_y = top - 0.045
    add_box('keybed', [0.0, bed_y, front + 0.5 * depth], [0.5 * width + 0.03, 0.025, 0.5 * depth + 0.01],
            col.case)
    for side in (1.0, -1.0):
        add_box(f'cheek{int(side)}', [side * (0.5 * width + 0.02), top + 0.005, front + 0.5 * depth],
                [0.02, 0.03, 0.5 * depth + 0.01], col.case)
    back = front + depth
    add_box('fallboard', [0.0, top + 0.03, back + 0.012], [0.5 * width + 0.04, 0.045, 0.012],
            col.case)

    # The case: the straight spine on the player's left (the bass side, x > 0), the bentside on
    # the right (x < 0) that curves in to the tail. The outline runs counterclockwise seen from
    # above.
    half_w = 0.5 * c.case_width
    z0, z1 = back, back + c.case_length
    outline = [(half_w, z0), (-half_w, z0), (-half_w, z0 + 0.3 * c.case_length),
               (-half_w + 0.1 * c.case_width, z0 + 0.55 * c.case_length),
               (-half_w + 0.35 * c.case_width, z0 + 0.75 * c.case_length),
               (half_w - 0.3 * c.case_width, z1), (half_w, z1)]
    y0 = bed_y - 0.02
    y1 = y0 + c.case_height
    v, f = prism(outline, y0, y1)
    add('case', v, f, col.case)
    boxes.append(('case', np.array([0.0, 0.5 * (y0 + y1), 0.5 * (z0 + z1)]),
                  np.array([half_w, 0.5 * (y1 - y0), 0.5 * (z1 - z0)])))
    # The lid: the outline, thin, hinged on the spine and turned up by lid_open, so it opens
    # toward the right of the player (the audience side).
    lv, lf = prism(outline, y1, y1 + 0.008)
    a = np.radians(c.lid_open)
    rel = lv - np.array([half_w, y1, 0.0])
    turn = np.array([[np.cos(a), np.sin(a), 0.0], [-np.sin(a), np.cos(a), 0.0], [0.0, 0.0, 1.0]])
    lv = rel @ turn.T + np.array([half_w, y1, 0.0])
    add('lid', lv, lf, col.case)
    add_box('desk', [0.0, y1 + 0.035, z0 + 0.07], [0.25 * half_w, 0.035, 0.005], col.case,
            test=False)

    # Three legs, the lyre, and two pedals.
    leg_h = 0.5 * y0
    for name, x, z in (('leg_left', half_w - 0.04, z0 + 0.05), ('leg_right', -half_w + 0.04, z0 + 0.05),
                       ('leg_tail', half_w - 0.12, z1 - 0.08)):
        add_box(name, [x, leg_h, z], [0.025, leg_h, 0.025], col.case)
    add_box('lyre', [0.0, leg_h, z0 + 0.08], [0.035, leg_h, 0.012], col.case)
    for name, x in (('pedal_left', 0.022), ('pedal_right', -0.022)):
        add_box(name, [x, 0.012, z0 + 0.04], [0.012, 0.006, 0.04], col.metal)
    return pieces, boxes


def bench(body, pr, role):
    """Makes a piano bench: a padded top at the seat height of the layout, a frame, four legs.

    Returns (details, boxes)."""
    c = pr.bench
    lay = scene_layout(body, role)
    top = lay['seat_top']
    t = c.top_thickness
    hw, hd = 0.5 * c.width, 0.5 * c.depth
    pieces, boxes = [], []

    def add_box(name, center, half, color):
        v, f = box(center, half)
        pieces.append(detail(f'{pr.name}_{name}', v, f, color, pr.name, pr.name))
        boxes.append((name, np.asarray(center, float), np.asarray(half, float)))

    add_box('top', [0.0, top - 0.5 * t, c.center_z], [hw, 0.5 * t, hd], c.colors.top)
    leg = 0.5 * (top - t)
    for i, (x, z) in enumerate(((1, 1), (1, -1), (-1, 1), (-1, -1))):
        add_box(f'leg{i}', [x * (hw - 0.025), leg, c.center_z + z * (hd - 0.025)],
                [0.018, leg, 0.018], c.colors.legs)
    return pieces, boxes


def scene_prop(body, pr, role):
    """Makes one scene prop of any kind. Returns (details, boxes)."""
    if pr.kind == 'piano':
        return piano(body, pr, role)
    if pr.kind == 'bench':
        return bench(body, pr, role)
    raise ValueError(f'prop {pr.name!r}: the scene kind {pr.kind!r} is not built yet')


def scene_boxes(role, body):
    """Lists the test boxes of all scene props: [(prop, piece, center, half sizes)]."""
    out = []
    for pr in scene_props(role):
        for name, center, half in scene_prop(body, pr, role)[1]:
            out.append((pr.name, name, center, half))
    return out


def stick(body, pr, pose):
    """Makes a stick prop in its hand: a handle and a long tapered shaft.

    Returns (details, grip point, tip point).
    """
    joints, frames = body.arm_pose(pose)
    sx = np.diag([1.0 if pr.attach.side == 'L' else -1.0, 1.0, 1.0])
    W = sx @ joints['wrist']
    K = sx @ joints['knuckle']
    fh = sx @ frames['hand']
    # The paw closes on the grip at the palm side of the finger tips.
    grip = 0.5 * (W + K) + fh @ np.array(pr.grip)
    direction = fh @ np.array(pr.direction)
    direction /= np.linalg.norm(direction)
    hd, sh = pr.handle, pr.shaft
    back = grip - direction * hd.back
    tip = grip + direction * pr.length
    gv, gf = tube([back, back + direction * hd.steps[0], grip + direction * hd.steps[1]],
                  list(hd.radii), hd.sides, closed_tip=False)
    shaft = [grip + direction * sh.start, grip + direction * sh.middle, tip]
    bv, bf = tube(shaft, list(sh.radii), sh.sides, closed_tip=False)
    details = [
        detail(f'{pr.name}_grip', gv, gf, hd.color, pr.name, pr.name),
        detail(f'{pr.name}_shaft', bv, bf, sh.color, pr.name, pr.name),
    ]
    return details, grip, tip


def make(body, pr, pose):
    """Makes one hand prop of any kind. Returns (details, grip point, tip point)."""
    if pr.kind == 'stick':
        return stick(body, pr, pose)
    raise ValueError(f'prop {pr.name!r}: the kind {pr.kind!r} is not built yet')


def role_details(role, body, pose='bind'):
    """Lists the details of all props of a role: the hand props, then the scene props."""
    items = []
    for pr in hand_props(role):
        items += make(body, pr, pose)[0]
    for pr in scene_props(role):
        items += scene_prop(body, pr, role)[0]
    return items
