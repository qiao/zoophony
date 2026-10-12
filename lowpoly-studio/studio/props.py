"""The props of a role (role.toml [[props]]): sized from the body, built by the prop library.

numpy only. The library (props/ beside studio/) builds the meshes; this module reads the config of
each prop, takes its sizes from the body, and gives the build what it needs.

A hand prop (attach.bone = "hand") sits on a bone of its own, a child of a hand, and its mesh is
joined into the mesh of the animal, rigid on that bone. The kinds: "stick" (a handle and a
tapered shaft: a baton) and "bow" (the bow of a violin or a cello). Each one gives detail dicts
(as studio/details.py), the grip point, and the tip point, in a pose of the arms.

A scene prop (attach.bone = "scene") is a mesh node of its own in the GLB, with no bone: the
kinds "piano", "bench", "chair", "music_stand", "violin", and "cello". Each one is sized to the
seated body (scene_layout): the seat top is the seat of the body, and the keyboard is at the
height of the forearms. The keys of the piano that the clips press are nodes of their own under
the piano node, and turn down when a finger presses them (scene_pose). Each scene prop gives the
boxes that the scene check of the build tests the body against. The sheet pose hides it (scale
0 of its node).

    PropNode = {name, verts (n, 3) in model space, faces (m, 3), colors (m, 3) sRGB 0..255,
                material (the name of the prop), parent (a node name or None), origin (the
                pivot of the node in model space)}
"""

import math

import numpy as np

from props import bench as bench_kind
from props import chair as chair_kind
from props import piano as piano_kind
from props import stand as stand_kind
from props import strings as strings_kind
from props.shapes import basis
from studio.details import detail, tube

# The kinds of each attachment.
HAND_KINDS = ('stick', 'bow')
SCENE_KINDS = ('piano', 'bench', 'chair', 'music_stand', 'violin', 'cello')


def hand_props(role):
    """Lists the props of a role that sit in a hand."""
    return [pr for pr in role.props if pr.attach.bone == 'hand']


def scene_props(role):
    """Lists the props of a role that stand in the scene."""
    return [pr for pr in role.props if pr.attach.bone == 'scene']


def claw_spacing(body):
    """Returns the mean spacing of the claw tips of a paw across the paw (details.hand_claws):
    the white key width that puts each digit on its own key."""
    claws = body.claws('bind')
    if len(claws) < 2:
        return 0.03
    _, frames = body.arm_pose('bind')
    across = sorted(float(c['tip'] @ frames['hand'][:, 0]) for c in claws)
    return float(np.mean(np.diff(across)))


def scene_layout(body, role):
    """Calculates the places of the seated pose that size the scene props.

    Returns {'drop': the hips offset down that puts the feet of the bind pose on the floor,
    'seat': the seat of the body (templates/biped Body.seat) after the drop, or None for
    straight legs, 'seat_top': the top of a flat seat under the trunk, 'elbow_y': the height of
    the elbows of the seated bind pose, 'keys_top', 'keys_front' (with a piano)}. The height map
    of the seat is the lowest body point over each spot, less facets.offset: the vertices of the
    low-poly skin sit facets.offset outside the field.
    """
    drop = body.seated_drop()
    off = body.cfg.facets.offset
    seat = body.seat()
    if seat is not None:
        seat = dict(seat, heights=(np.asarray(seat['heights']) - off - drop).tolist())
    seat_top = body.trunk_bottom() - off - drop
    joints, _ = body.arm_pose('bind')
    out = {'drop': drop, 'seat_top': seat_top, 'seat': seat,
           'elbow_y': float(joints['elbow'][1]) - drop}
    for pr in scene_props(role):
        if pr.kind == 'piano':
            out['keys_top'] = out['elbow_y'] - pr.piano.keys_below_elbow
            out['keys_front'] = pr.piano.keys_front
    return out


def seat_extent(body, lay, c):
    """Resolves the width, the depth, the middle z, and the top of a seat (a bench or a chair,
    config c): from the seat of the body (behind the rump to the backs of the shins, the thighs
    and a margin wide, the top on the rump and the thighs), or from the config with a flat top
    at the trunk bottom.

    Returns (width, depth, center z, map or None): the map {'xs', 'zs', 'heights' [x][z]} of the
    top of the pad over the whole seat (mirrored to -x, flat out to the margins).
    """
    seat = lay['seat']
    depth, center_z, width = c.depth, c.center_z, c.width
    top = None
    if seat is not None:
        back = seat['back'] - c.margin
        front = seat['front'] - body.cfg.facets.offset
        depth = depth if depth is not None else front - back
        center_z = center_z if center_z is not None else front - 0.5 * depth
        width = width if width is not None else 2.0 * (seat['half_x'] + c.margin)
        if c.fit:
            H = np.asarray(seat['heights'])
            xs = list(seat['xs'])
            half = 0.5 * width
            if half > xs[-1] + 1e-6:
                xs.append(half)
                H = np.vstack([H, H[-1:]])
            zs = list(seat['zs'])
            z0, z1 = center_z - 0.5 * depth, center_z + 0.5 * depth
            if z0 < zs[0] - 1e-6:
                zs.insert(0, z0)
                H = np.hstack([H[:, :1], H])
            zs[-1] = min(zs[-1], z1)
            full_x = [-x for x in reversed(xs[1:])] + xs
            full_h = np.vstack([H[:0:-1], H])
            top = {'xs': full_x, 'zs': zs, 'heights': full_h.tolist()}
    if depth is None or center_z is None or width is None:
        raise ValueError('a seat with no seated bind pose needs width, depth, and center_z')
    return width, depth, center_z, top


def piano_sizes(body, pr, role):
    """Resolves the sizes of a piano: the config, and the values that come from the body."""
    c = pr.piano
    lay = scene_layout(body, role)
    w = c.key_width if c.key_width is not None else claw_spacing(body)
    key_scale = w / piano_kind.REAL_KEY
    n = c.white_keys
    s = n * w / piano_kind.REAL_KEYBOARD
    depth = c.keys_depth if c.keys_depth is not None else 0.15 * key_scale
    return {
        'name': pr.name, 'keys_top': lay['keys_top'], 'keys_front': c.keys_front,
        'key_width': w, 'keys_depth': depth, 'white_keys': n, 'lowest_octave': c.lowest_octave,
        'key_height': 0.75 * w, 'black_height': 0.5 * w, 'black_depth': 0.62 * depth,
        'key_dip': c.key_dip if c.key_dip is not None else 0.42 * w,
        'case_scale': s,
        'case_width': c.case_width if c.case_width is not None else 1.4 * s,
        'case_length': c.case_length if c.case_length is not None else 1.85 * s,
        'rim_below_keys': 0.08 * s, 'rim_above_keys': 0.25 * s, 'lid_open': c.lid_open,
        'colors': dict(c.colors),
    }


def bench_sizes(body, pr, role):
    """Resolves the sizes of a bench: the pad on the seat of the body (seat_extent)."""
    c = pr.bench
    lay = scene_layout(body, role)
    width, depth, center_z, top = seat_extent(body, lay, c)
    return {'name': pr.name, 'seat_top': lay['seat_top'], 'width': width, 'depth': depth,
            'center_z': center_z, 'map': top, 'top_thickness': c.top_thickness,
            'colors': dict(c.colors)}


def chair_sizes(body, pr, role):
    """Resolves the sizes of a chair: the seat as a bench, the back from the trunk height."""
    c = pr.chair
    lay = scene_layout(body, role)
    width, depth, center_z, top_map = seat_extent(body, lay, c)
    joints, _ = body.arm_pose('bind')
    shoulder_y = float(joints['shoulder'][1]) - lay['drop']
    top = float(np.max(top_map['heights'])) if top_map else lay['seat_top']
    back_h = c.back_height if c.back_height is not None else 0.55 * (shoulder_y - top)
    return {'name': pr.name, 'seat_top': top, 'width': width, 'depth': depth,
            'center_z': center_z, 'map': top_map, 'back_height': back_h,
            'colors': dict(c.colors)}


def seat_top_at(sizes, x, z):
    """Returns the height of the top of a seat (bench_sizes, chair_sizes) at points (x, z)."""
    m = sizes.get('map')
    if not m:
        return np.full(np.shape(x), sizes['seat_top'])
    from props.bench import top_at
    return top_at(m, x, z)


def stand_sizes(body, pr, role):
    """Resolves the sizes of a music stand: the desk below the eyes of the seated animal."""
    c = pr.stand
    lay = scene_layout(body, role)
    eye_y = body.cfg.details.eyes.center[1] - lay['drop']
    center = c.desk_center if c.desk_center is not None else eye_y - c.below_eyes
    s = center / 1.05
    return {'name': pr.name, 'at': tuple(c.at), 'desk_center': center,
            'desk_width': c.desk_width if c.desk_width is not None else 0.5 * s,
            'desk_height': c.desk_height if c.desk_height is not None else 0.35 * s,
            'tilt': c.tilt, 'colors': dict(c.colors)}


def arm_reach(body):
    """Returns the arm reach of the body: shoulder to elbow plus elbow to wrist (sheet pose)."""
    j, _ = body.arm_pose('reference')
    return float(np.linalg.norm(j['elbow'] - j['shoulder']) + np.linalg.norm(j['wrist'] - j['elbow']))


def string_length(body, pr):
    """Resolves the length of a violin, a cello, or a bow from the body.

    A violin is 1.1 arm reaches long (a person: an arm of 0.55 m, a violin of 0.6 m). A cello
    with its end pin reaches from the floor to the eyes of the seated animal. A bow is 1.25
    violins or 0.62 cellos long, after its config strings.bow_for.
    """
    c = pr.strings
    if c.length is not None:
        return c.length
    violin = 1.1 * arm_reach(body)
    eye_y = body.cfg.details.eyes.center[1] - body.seated_drop()
    cello = 0.85 * eye_y / math.cos(math.radians(c.lean))
    if pr.kind == 'violin':
        return violin
    if pr.kind == 'cello':
        return cello
    return 1.25 * violin if c.bow_for == 'violin' else 0.62 * cello


def string_colors(c):
    """Returns the colors of a string instrument from its config."""
    return dict(c.colors)


def node(name, mesh, material, parent=None, origin=(0.0, 0.0, 0.0)):
    """Bundles one prop node (see the module doc)."""
    v, f, fc = mesh
    return {'name': name, 'verts': v, 'faces': f, 'colors': fc, 'material': material,
            'parent': parent, 'origin': np.asarray(origin, float)}


def string_node(body, pr):
    """Builds a violin or a cello as a scene node: standing on its end pin (a cello) or on the
    floor on its tail end (a violin in the gallery), at strings.at (x, z), leaned back toward the
    player."""
    c = pr.strings
    length = string_length(body, pr)
    pin = 0.17 * length if pr.kind == 'cello' else 0.0
    v, f, fc = strings_kind.violin_mesh(length, string_colors(c), pr.kind == 'cello', pin)
    rot = strings_kind.upright(c.lean, c.side_lean)
    x, z = c.at
    v = (v + np.array([pin, 0.0, 0.0])) @ rot.T + np.array([x, 0.0, z])
    return [node(pr.name, (v, f, fc), pr.name)], [('body', 0.5 * (v.min(0) + v.max(0)),
                                                    0.5 * (v.max(0) - v.min(0)))]


def scene_nodes(body, role, moving=()):
    """Builds the nodes of all scene props of a role.

    moving: the names of the piano keys that get a node of their own (moving_keys).
    Returns (nodes, boxes): boxes are (prop, piece, center, half sizes) for the scene check.
    """
    nodes, boxes = [], []
    for pr in scene_props(role):
        if pr.kind == 'piano':
            made, made_boxes, _ = piano_kind.build(piano_sizes(body, pr, role), moving)
        elif pr.kind == 'bench':
            made, made_boxes = bench_kind.build(bench_sizes(body, pr, role))
        elif pr.kind == 'chair':
            made, made_boxes = chair_kind.build(chair_sizes(body, pr, role))
        elif pr.kind == 'music_stand':
            made, made_boxes = stand_kind.build(stand_sizes(body, pr, role))
        elif pr.kind in ('violin', 'cello'):
            made, made_boxes = string_node(body, pr)
        else:
            raise ValueError(f'prop {pr.name!r}: the scene kind {pr.kind!r} is not built yet')
        for n in made:
            n.setdefault('material', pr.name)
        nodes += made
        boxes += [(pr.name, piece, c, h) for piece, c, h in made_boxes]
    return nodes, boxes


def scene_boxes(role, body):
    """Lists the test boxes of all scene props: [(prop, piece, center, half sizes)]."""
    return scene_nodes(body, role)[1]


def piano_keys(body, role):
    """Lists the keys of the piano of a role (props/piano.py keyboard): name, index, black,
    press point, pivot, the angle of a full press, and the box."""
    pr = next(p for p in scene_props(role) if p.kind == 'piano')
    return piano_kind.keyboard(piano_sizes(body, pr, role))


def moving_keys(role, pack):
    """Lists the names of the piano keys that the clips of a pack press (pack.pressed_keys),
    the keys that get a node of their own. No piano, or a pack with no presses: none."""
    if not any(pr.kind == 'piano' for pr in scene_props(role)):
        return ()
    return tuple(sorted(getattr(pack, 'pressed_keys', ()) or ()))


class ScenePose:
    """The transforms of the scene nodes in a pose spec: the scale of each scene prop (0 hides
    it), and the turn of each moving key from the press share in spec['keys'].

    Calling it with a spec returns {node name: (quaternion w, x, y, z, location, scale)}, the
    form of the solved bones (templates/biped/solver.py): the bake writes them as the actions
    of the nodes, and the scene check reads the scale.
    """

    def __init__(self, body, role, moving=()):
        """Stores the scene props and the keys that move."""
        self.props = [pr.name for pr in scene_props(role)]
        self.keys = {}
        piano = next((pr for pr in scene_props(role) if pr.kind == 'piano'), None)
        if piano and moving:
            for k in piano_keys(body, role):
                if k['name'] in moving:
                    self.keys[k['name']] = (f'{piano.name}_key_{k["name"]}', k['angle'])

    def __call__(self, spec):
        """Calculates the node transforms of one pose spec."""
        out = {}
        for name in self.props:
            out[name] = (np.array([1.0, 0.0, 0.0, 0.0]), np.zeros(3),
                         float(spec.get(f'{name}_scale', 1.0)))
        presses = spec.get('keys', {})
        for key, (node_name, angle) in self.keys.items():
            # A press turns the front of the key down about its pivot (about -x).
            a = -math.radians(angle) * min(max(float(presses.get(key, 0.0)), 0.0), 1.0)
            out[node_name] = (np.array([math.cos(0.5 * a), math.sin(0.5 * a), 0.0, 0.0]),
                              np.zeros(3), 1.0)
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


def bow(body, pr, pose):
    """Makes a bow in its hand: the stick along the direction from the grip (in the hand frame),
    the hair on the side of strings.hair (in the hand frame).

    Returns (details, grip point, tip point).
    """
    joints, frames = body.arm_pose(pose)
    sx = np.diag([1.0 if pr.attach.side == 'L' else -1.0, 1.0, 1.0])
    W = sx @ joints['wrist']
    K = sx @ joints['knuckle']
    fh = sx @ frames['hand']
    grip = 0.5 * (W + K) + fh @ np.array(pr.grip)
    direction = fh @ np.array(pr.direction)
    direction /= np.linalg.norm(direction)
    hair = fh @ np.array(pr.strings.hair)
    length = string_length(body, pr)
    v, f, fc = strings_kind.bow_mesh(length, string_colors(pr.strings))
    # The bow axes: x along the bow, -y to the hair. The grip is 0.03 of 0.45 from the frog.
    frame = basis(direction, -hair)
    rot = np.stack([frame[:, 1], frame[:, 2], frame[:, 0]], axis=1)
    back = length * 0.03 / strings_kind.BOW_LENGTH
    v = (v - np.array([back, 0.0, 0.0])) @ rot.T + grip
    d = detail(f'{pr.name}_bow', v, f, fc[0], pr.name, pr.name)
    d['colors'] = fc
    return [d], grip, grip + direction * (length - back)


def make(body, pr, pose):
    """Makes one hand prop of any kind. Returns (details, grip point, tip point)."""
    if pr.kind == 'stick':
        return stick(body, pr, pose)
    if pr.kind == 'bow':
        return bow(body, pr, pose)
    raise ValueError(f'prop {pr.name!r}: the kind {pr.kind!r} is not built yet')


def role_details(role, body, pose='bind'):
    """Lists the details of the hand props of a role (joined into the mesh of the animal). The
    scene props are nodes of their own (scene_nodes)."""
    items = []
    for pr in hand_props(role):
        items += make(body, pr, pose)[0]
    return items
