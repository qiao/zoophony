"""Rounds the elbows of a copy of the rabbit mesh, in Blender (MCP or batch).

The section of the arm of the source near the elbow is flat: the narrow axis is about 0.6 of the
wide axis from the lower upper arm to the top of the forearm (0.8 to 0.95 on the red fox). For
each side, the script cuts the arm with planes at stations along the bones, from the middle of the
upper arm to the forearm, and finds the middle and the axes of each section. Each vertex near a
station moves in the plane of its section: the wide part shrinks and the narrow part grows by the
same factor, so that the section keeps its area and its ratio becomes `ratio`. The share of the
move grows from `fade[0]` to `fade[1]` and falls from `fade[2]` to `fade[3]`, in upper arm
lengths from the shoulder joint (1 is the elbow joint, and the forearm continues past 1). The
script reads `rabbit-4-arms.glb`.

    exec(open('<this file>').read()); run(<config>, <out.glb>)    # in the live Blender, MCP
    blender -b --python <this file> -- <config.json> <out.glb> [<options JSON>]    # in a batch run
"""
import json
import math
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

#: The source of the copy, from the root of the tree.
SOURCE = 'assets/models/rabbit/rabbit-4-arms.glb'

#: The options: the target ratio of each side, the fade along the arm, the step of the stations,
#: and the reach of the move from the axis as a factor of the half wide axis.
OPTIONS = {'ratioL': 0.85, 'ratioR': 0.85, 'fade': (0.55, 0.75, 1.15, 1.4), 'step': 0.05,
           'reach': 1.6, 'kL': 0.0, 'kR': 1.0, 'pins': (1003, 975)}


#: The largest spread of the distances of a loop from its middle, in units, of an arm loop.
ARM_WIDTH = 0.06


def smooth(x, a, b):
    """Gives the smoothstep of x from a to b."""
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def arm_frame(joints, sign):
    """Gives the shoulder, elbow, and wrist joints of a side, and the upper arm length."""
    s = np.array(joints['upper_arm_L']['head']) * [sign, 1, 1]
    e = np.array(joints['forearm_L']['head']) * [sign, 1, 1]
    w = np.array(joints['hand_L']['head']) * [sign, 1, 1]
    return s, e, w, float(np.linalg.norm(e - s))


def place(p, s, e, w, length):
    """Gives the place u of a point along the arm, in upper arm lengths from the shoulder joint,
    the point of the axis at u, and the unit axis there."""
    ua = (e - s) / length
    fa = (w - e) / np.linalg.norm(w - e)
    if (p - e) @ (ua + fa) > 0:
        u = 1.0 + (p - e) @ fa / length
        return u, e + (u - 1.0) * length * fa, fa
    u = (p - s) @ ua / length
    return u, s + u * length * ua, ua


def station(pts, tris, s, e, w, length, u, sign, split):
    """Cuts the mesh at the place u of the arm and takes the closed loop of the cut that holds the
    point of the axis, so that the trunk beside the arm stays out. Gives the middle, the unit wide
    axis, the unit narrow axis, the root of each principal value, and the vertices of the faces of
    the loop, or None when no closed loop holds the axis."""
    ua = (e - s) / length
    fa = (w - e) / np.linalg.norm(w - e)
    point, axis = (s + u * length * ua, ua) if u <= 1.0 else (e + (u - 1.0) * length * fa, fa)
    d = (pts - point) @ axis
    links = {}
    places = {}
    owner = {}
    for tri in tris:
        keys = []
        for k in range(3):
            a, b = tri[k], tri[(k + 1) % 3]
            if d[a] * d[b] < 0:
                key = (min(a, b), max(a, b))
                t = d[a] / (d[a] - d[b])
                places[key] = pts[a] + t * (pts[b] - pts[a])
                keys.append(key)
        if len(keys) == 2:
            for x, y in (keys, keys[::-1]):
                links.setdefault(x, []).append(y)
            owner.setdefault(keys[0], set()).update(tri)
            owner.setdefault(keys[1], set()).update(tri)
    seen = set()
    best = None
    for start in links:
        if start in seen:
            continue
        part, stack = [], [start]
        seen.add(start)
        while stack:
            k = stack.pop()
            part.append(k)
            for n in links[k]:
                if n not in seen:
                    seen.add(n)
                    stack.append(n)
        closed = all(len(links[k]) == 2 for k in part)
        p = np.array([places[k] for k in part]) - point
        p -= np.outer(p @ axis, axis)
        # The loop holds the axis when the axis point lies inside its polygon in the plane: the
        # angles around the point add up to a full turn.
        order = [part[0]]
        prev = None
        while len(order) < len(part):
            nxt = [n for n in links[order[-1]] if n != prev and n not in order[-1:]]
            nxt = [n for n in nxt if n not in order]
            if not nxt:
                break
            prev = order[-1]
            order.append(nxt[0])
        q = np.array([places[k] for k in order]) - point
        q -= np.outer(q @ axis, axis)
        turn = 0.0
        for i in range(len(q)):
            a, b = q[i], q[(i + 1) % len(q)]
            turn += math.atan2(np.cross(a, b) @ axis, a @ b)
        if closed and abs(turn) > math.pi and (best is None or len(part) > len(best[0])):
            best = (part, p)
    if best is None:
        return None
    part, r = best
    # A loop wider than an arm is the trunk with the arm joined to it.
    if np.ptp(np.linalg.norm(r - r.mean(axis=0), axis=1)) > ARM_WIDTH:
        return None
    middle = r.mean(axis=0)
    q = r - middle
    # The points lie in the plane, so the smallest principal value is along the axis.
    vals, vecs = np.linalg.eigh(q.T @ q / len(q))
    wide = vecs[:, 2]
    narrow = np.cross(axis, wide)
    verts = set()
    for k in part:
        verts.update(owner.get(k, ()))
    return (point + middle, wide, narrow, math.sqrt(max(vals[2], 0.0)),
            math.sqrt(max(vals[1], 0.0)), verts)


def round_elbows(bm, config, opts=None):
    """Rounds both elbows of a welded mesh in place. Gives the report lines."""
    opts = {**OPTIONS, **(opts or {})}
    f0, f1, f2, f3 = opts['fade']
    zs = [v.co.z for v in bm.verts]
    floor, top = min(zs), max(zs)
    scale = 1.0 / (top - floor)

    def to_rig(co):
        return np.array([co.x * scale, (co.z - floor) * scale, -co.y * scale])

    def to_world(p):
        return Vector((p[0] / scale, -p[2] / scale, p[1] / scale + floor))

    split = config['weights']['armSplit']
    bm.verts.ensure_lookup_table()
    pts = np.array([to_rig(v.co) for v in bm.verts])
    tris = [[v.index for v in f.verts] for f in bm.faces]
    pins = set(opts.get('pins', ()))
    lines = []
    moves = {}
    for side, sign in (('L', 1.0), ('R', -1.0)):
        target = opts[f'ratio{side}']
        s, e, w, length = arm_frame(config['joints'], sign)
        us = np.arange(f0, f3 + 1e-9, opts['step'])
        stations = {}
        for u in us:
            found = station(pts, tris, s, e, w, length, u, sign, split)
            if found:
                stations[round(float(u), 3)] = found
        keys = sorted(stations)
        arm = set().union(*(stations[k][5] for k in keys)) if keys else set()
        before = ' '.join(f'{u:.2f}:{stations[u][4] / stations[u][3]:.2f}' for u in keys)
        moved, biggest = 0, 0.0
        for i in sorted(arm):
            p = pts[i]
            if i in pins or p[0] * sign <= 0:
                continue
            u, _, axis = place(p, s, e, w, length)
            fade = smooth(u, f0, f1) * (1.0 - smooth(u, f2, f3))
            if fade <= 0:
                continue
            near = min(keys, key=lambda k: abs(k - u))
            middle, wide, narrow, a, b, _ = stations[near]
            off = p - middle
            along = off @ axis
            ow = off @ wide
            on = off @ narrow
            ratio = b / a
            if ratio >= target:
                continue
            gain = math.sqrt(ratio / target) ** fade
            p2 = middle + along * axis + ow * gain * wide + on / gain * narrow
            # Keep the part of the offset that is not in the plane of the section.
            p2 += off - (along * axis + ow * wide + on * narrow)
            moves[i] = p2
            moved += 1
            biggest = max(biggest, float(np.linalg.norm(p2 - p)))
        lines.append(f'side {side}: {moved} vertices move, the largest move {biggest:.4f} u; '
                     f'ratios before {before}')
    for i, p2 in moves.items():
        bm.verts[i].co = to_world(p2)
    pts2 = np.array([to_rig(v.co) for v in bm.verts])
    for side, sign in (('L', 1.0), ('R', -1.0)):
        s, e, w, length = arm_frame(config['joints'], sign)
        after = []
        for u in np.arange(f0, f3 + 1e-9, opts['step']):
            found = station(pts2, tris, s, e, w, length, u, sign, split)
            if found:
                after.append(f'{u:.2f}:{found[4] / found[3]:.2f}')
        lines.append(f'side {side}: ratios after {" ".join(after)}')
    return lines


def radial_elbows(bm, config, opts=None):
    """Rounds both elbows of a welded mesh in place by radial moves. Each vertex of the free arm
    (outside the plane |x| = armSplit) in the band of the fade moves out from the bone axis when it
    lies nearer to the axis than the target radius: by the share `k` of the gap, times the fade.
    The target radius runs from the median radius of the upper arm at `upper` to the median radius
    of the forearm at `fore` (places in upper arm lengths). The vertices of `pins` keep their
    places. Gives the report lines."""
    opts = {**OPTIONS, **(opts or {})}
    f0, f1, f2, f3 = opts['fade']
    zs = [v.co.z for v in bm.verts]
    floor, top = min(zs), max(zs)
    scale = 1.0 / (top - floor)

    def to_rig(co):
        return np.array([co.x * scale, (co.z - floor) * scale, -co.y * scale])

    def to_world(p):
        return Vector((p[0] / scale, -p[2] / scale, p[1] / scale + floor))

    split = config['weights']['armSplit']
    bm.verts.ensure_lookup_table()
    pts = np.array([to_rig(v.co) for v in bm.verts])
    pins = set(opts.get('pins', ()))
    limit = opts.get('arm', 0.075)
    lines = []
    for side, sign in (('L', 1.0), ('R', -1.0)):
        s, e, w, length = arm_frame(config['joints'], sign)
        rows = []
        for i, p in enumerate(pts):
            if p[0] * sign <= split:
                continue
            u, c, axis = place(p, s, e, w, length)
            off = p - c
            off -= (off @ axis) * axis
            d = float(np.linalg.norm(off))
            if d < limit:
                rows.append((i, u, off, d))

        def median_radius(lo, hi):
            ds = [d for _, u, _, d in rows if lo <= u <= hi]
            return float(np.median(ds)) if ds else float('nan')

        ua, ub = opts.get('upper', (0.35, 0.55)), opts.get('fore', (1.12, 1.26))
        ra, rb = median_radius(*ua), median_radius(*ub)
        mid_a, mid_b = sum(ua) / 2, sum(ub) / 2
        moved, biggest = 0, 0.0
        for i, u, off, d in rows:
            fade = smooth(u, f0, f1) * (1.0 - smooth(u, f2, f3))
            if fade <= 0 or i in pins or d <= 1e-6:
                continue
            share = min(max((u - mid_a) / (mid_b - mid_a), 0.0), 1.0)
            target = ra + share * (rb - ra)
            if d >= target:
                continue
            grow = fade * opts[f'k{side}'] * (target - d)
            p2 = pts[i] + grow * off / d
            bm.verts[i].co = to_world(p2)
            moved += 1
            biggest = max(biggest, grow)
        lines.append(f'side {side}: radius {ra:.4f} u at the upper arm, {rb:.4f} u at the forearm, '
                     f'{moved} vertices move, the largest move {biggest:.4f} u')
    return lines


def run(config_path, out, name='rabbit_elbows', opts=None):
    """Imports the source of the config as the object `name`, rounds its elbows, and exports the
    copy. Gives the report lines."""
    config = json.load(open(config_path))
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    ob.name = name
    mw = ob.matrix_world.copy()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.transform(mw)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=config['weld'])
    mode = (opts or {}).get('mode', 'radial')
    lines = (radial_elbows if mode == 'radial' else round_elbows)(bm, config, opts)
    bm.transform(mw.inverted())
    bm.to_mesh(ob.data)
    bm.free()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    if out:
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True)
    return lines


if __name__ == '__main__' and '--' in sys.argv:
    argv = sys.argv[sys.argv.index('--') + 1:]
    print('\n'.join(run(argv[0], argv[1], opts=json.loads(argv[2]) if len(argv) > 2 else None)))
