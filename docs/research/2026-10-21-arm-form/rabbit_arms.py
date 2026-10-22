"""Rounds the upper arms of a copy of the rabbit mesh, in Blender (MCP or batch).

The upper arm of the source is flat: the narrow axis of its middle section is 0.45 to 0.48 of the
wide axis, which points to the front. For each side, each vertex near the upper arm moves toward
the axis of the upper arm along the wide axis, by the factor `k` at the middle of the upper arm,
with a fade to no move at the shoulder joint and before the elbow joint. The left arm also moves
its vertices up to `innerL` inside the plane |x| = armSplit and the arm run of its cut, so that its
inner side is round too. The right arm also moves the arm run of its cut (`cut` of
`tools/mesh-rigs/rabbit.json`), except vertex 1003 at the back top of the run (`pins`). The move
lifted 1003 from 0.431 to 0.442 u, above the cut top 0.44, so that the cut kept a face between the
arm and the trunk, and the corrective shapes of the right arm folded the caps of the body of the
right cut (round `arm-form-3`). The script reads `rabbit-4-armpit.glb`.

    exec(open('<this file>').read()); run(<config>, <out.glb>)    # in the live Blender, MCP
    blender -b --python <this file> -- <config.json> <out.glb>    # in a batch run
"""
import json
import math
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

#: The factor of the wide axis at the middle of the upper arm.
K = 0.4

#: The source of the copy, from the root of the tree.
SOURCE = 'assets/models/rabbit/rabbit-4-armpit.glb'

#: The options of the edit: the factor `k` of each side, the reach inside the plane of each side,
#: the arm runs that keep their places (`armL`, `armR`), and more vertices that keep their places
#: (`pins`).
OPTIONS = {'k': K, 'innerL': 0.03, 'innerR': 0.0, 'armL': False, 'armR': False, 'pins': (1003,)}

#: The fade of the move along the upper arm, from the shoulder joint (0) to the elbow joint (1):
#: it grows from T0 to T1 and falls from T2 to T3.
T0, T1, T2, T3 = -0.2, 0.15, 0.8, 1.1

#: The reach of the move from the axis, as a factor of the half width of the middle section.
REACH = 2.5

#: The vertices of the arm runs of the cut of both sides, in the order of the welded source
#: (the log lines `cut L` and `cut R` of `pnpm rig-mesh rabbit --check`).
ARM_RUNS = (952, 955, 912, 907, 903, 889, 890, 904, 909,
            975, 981, 1073, 1019, 1068, 1006, 1007, 1015, 1003)


def smooth(x, a, b):
    """Gives the smoothstep of x from a to b."""
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


#: The vertices of the body runs of the cut of both sides, as `ARM_RUNS`.
BODY_RUNS = (934, 905, 938, 891, 939, 941, 902, 961, 958, 956, 953, 949,
             1020, 1025, 1008, 1012, 1011, 1018, 984, 982)


def round_arms(bm, config, opts=None):
    """Rounds both upper arms of a welded mesh in place. Gives the report lines."""
    opts = {**OPTIONS, **(opts or {})}
    k_factor = opts.get('k', K)
    inner = opts.get('inner', 0.0)
    t0, t1, t2, t3 = opts.get('fade', (T0, T1, T2, T3))
    reach = opts.get('reach', REACH)
    zs = [v.co.z for v in bm.verts]
    floor, top = min(zs), max(zs)
    scale = 1.0 / (top - floor)

    def to_rig(co):
        return np.array([co.x * scale, (co.z - floor) * scale, -co.y * scale])

    def to_world(p):
        return Vector((p[0] / scale, -p[2] / scale, p[1] / scale + floor))

    joints = config['joints']
    split = config['weights']['armSplit']
    bm.verts.ensure_lookup_table()
    arm_l, arm_r = ARM_RUNS[:9], ARM_RUNS[9:]
    pins = ((arm_l if opts.get('armL', opts.get('arm', True)) else ())
            + (arm_r if opts.get('armR', opts.get('arm', True)) else ())
            + (BODY_RUNS if opts.get('body', False) else ())
            + tuple(opts.get('pins', ())))
    pinned = {bm.verts[i] for i in pins}
    lines = []
    for side, sign in (('L', 1.0), ('R', -1.0)):
        s = np.array(joints['upper_arm_L']['head']) * [sign, 1, 1]
        e = np.array(joints['forearm_L']['head']) * [sign, 1, 1]
        length = np.linalg.norm(e - s)
        axis = (e - s) / length
        pts = {v: to_rig(v.co) for v in bm.verts}
        mid = s + 0.5 * (e - s)
        ring = []
        for edge in bm.edges:
            a = (pts[edge.verts[0]] - mid) @ axis
            b = (pts[edge.verts[1]] - mid) @ axis
            if a * b < 0:
                p = pts[edge.verts[0]] + a / (a - b) * (pts[edge.verts[1]] - pts[edge.verts[0]])
                if p[0] * sign > split:
                    ring.append(p)
        r = np.array(ring) - mid
        r -= np.outer(r @ axis, axis)
        q = r - r.mean(axis=0)
        w, vec = np.linalg.eigh(q.T @ q / len(q))
        wide = vec[:, np.argmax(w)]
        radius = reach * np.sqrt(w.max())
        moved, biggest = 0, 0.0
        for v, p in pts.items():
            if p[0] * sign <= split - opts.get(f'inner{side}', inner) or v in pinned:
                continue
            t = (p - s) @ axis / length
            fade = smooth(t, t0, t1) * (1.0 - smooth(t, t2, t3))
            off = p - (s + t * length * axis)
            if fade <= 0 or np.linalg.norm(off) > radius:
                continue
            p2 = p - (1.0 - opts.get(f'k{side}', k_factor)) * fade * (off @ wide) * wide
            v.co = to_world(p2)
            moved += 1
            biggest = max(biggest, float(np.linalg.norm(p2 - p)))
        lines.append(f'side {side}: wide axis {np.round(wide, 3).tolist()}, half width '
                     f'{math.sqrt(w.max()):.4f} u, {moved} vertices move, the largest move '
                     f'{biggest:.4f} u')
    return lines


def run(config_path, out, name='rabbit_arms', opts=None):
    """Imports the source of the config as the object `name`, rounds its arms, and exports the
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
    lines = round_arms(bm, config, opts)
    bm.transform(mw.inverted())
    bm.to_mesh(ob.data)
    bm.free()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True)
    return lines


if __name__ == '__main__' and '--' in sys.argv:
    argv = sys.argv[sys.argv.index('--') + 1:]
    print('\n'.join(run(argv[0], argv[1], opts=json.loads(argv[2]) if len(argv) > 2 else None)))
