"""Edits the arms of a copy of a source mesh, for the variants of the round `arm-form`.

    blender -b --factory-startup --python scratch/arm_edit.py -- <config.json> <out.glb> <mode> \
        [<key>=<value>]...

Modes:
- round k=<f>: moves each vertex of the upper arm toward the axis along the wide axis of the
  section of the arm, by the factor k at the middle of the upper arm, with a fade to 1 at the
  shoulder joint and at the elbow joint. Only the vertices beyond |x| = armSplit move.
- refine radius=<u> budget=<n>: splits each face whose middle lies within the radius of the upper
  arm (the segment from the shoulder joint to the elbow joint) into four, then collapses the
  shortest edges of the belly and the back (|x| < 0.1, far from the arms) until the mesh has at
  most `budget` triangles.

The points of the config are in the units of the rig: 1 unit from the soles to the top, soles at
y = 0, y up, +z forward, +x left.
"""
import json
import math
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
config = json.load(open(argv[0]))
out, mode = argv[1], argv[2]
opts = dict(a.split('=', 1) for a in argv[3:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=config['source'])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
mw = ob.matrix_world.copy()
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.transform(mw)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=config['weld'])
zs = [v.co.z for v in bm.verts]
floor, top = min(zs), max(zs)
scale = 1.0 / (top - floor)


def to_rig(co):
    return np.array([co.x * scale, (co.z - floor) * scale, -co.y * scale])


def to_world(p):
    return Vector((p[0] / scale, -p[2] / scale, p[1] / scale + floor))


def smooth(x, a, b):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


joints = config['joints']
split = config['weights']['armSplit']
sides = (('L', 1.0), ('R', -1.0))


def arm_segment(sign):
    s = np.array(joints['upper_arm_L']['head']) * [sign, 1, 1]
    e = np.array(joints['forearm_L']['head']) * [sign, 1, 1]
    return s, e


if mode == 'round':
    k = float(opts.get('k', 0.7))
    reach = float(opts.get('reach', 2.0))
    for side, sign in sides:
        s, e = arm_segment(sign)
        length = np.linalg.norm(e - s)
        axis = (e - s) / length
        pts = {v: to_rig(v.co) for v in bm.verts}
        # The section at the middle of the upper arm gives the wide axis.
        mid = s + 0.5 * (e - s)
        ring = []
        for edge in bm.edges:
            a, b = (pts[edge.verts[0]] - mid) @ axis, (pts[edge.verts[1]] - mid) @ axis
            if a * b < 0:
                p = pts[edge.verts[0]] + a / (a - b) * (pts[edge.verts[1]] - pts[edge.verts[0]])
                if p[0] * sign > split:
                    ring.append(p)
        ring = np.array(ring)
        r = ring - mid
        r -= np.outer(r @ axis, axis)
        q = r - r.mean(axis=0)
        w, vec = np.linalg.eigh(q.T @ q / len(q))
        wide = vec[:, np.argmax(w)]
        radius = reach * np.sqrt(w.max())
        moved = 0
        biggest = 0.0
        for v, p in pts.items():
            if p[0] * sign <= split - float(opts.get('inner', 0.0)):
                continue
            t = (p - s) @ axis / length
            fade = smooth(t, float(opts.get('t0', -0.1)), float(opts.get('t1', 0.25))) * (1.0 - smooth(t, 0.8, 1.1))
            if fade <= 0:
                continue
            off = p - (s + t * length * axis)
            if np.linalg.norm(off) > radius:
                continue
            along = off @ wide
            p2 = p - (1.0 - k) * fade * along * wide
            v.co = to_world(p2)
            moved += 1
            biggest = max(biggest, float(np.linalg.norm(p2 - p)))
        print(f'arm_edit round {side}: wide axis {np.round(wide, 3).tolist()}, '
              f'half width {math.sqrt(w.max()):.4f} u, {moved} vertices moved, the largest move {biggest:.4f} u')
elif mode == 'refine':
    radius = float(opts.get('radius', 0.1))
    budget = int(opts.get('budget', 3200))
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    chosen = set()
    for side, sign in sides:
        s, e = arm_segment(sign)
        ab = e - s
        for f in bm.faces:
            p = to_rig(f.calc_center_median())
            u = min(max(((p - s) @ ab) / (ab @ ab), 0.0), 1.0)
            if np.linalg.norm(p - (s + u * ab)) <= radius:
                chosen.add(f)
    edges = {e for f in chosen for e in f.edges}
    bmesh.ops.subdivide_edges(bm, edges=list(edges), cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    print(f'arm_edit refine: {len(chosen)} faces chosen, {len(bm.faces)} triangles after the split')
    # Collapse short edges of the middle of the belly and the back until the budget holds.
    rounds = 0
    while len(bm.faces) > budget and rounds < 400:
        rounds += 1
        cand = []
        for edge in bm.edges:
            a, b = to_rig(edge.verts[0].co), to_rig(edge.verts[1].co)
            m = (a + b) / 2
            if abs(m[0]) < 0.12 and 0.12 < m[1] < 0.52 and edge.is_manifold:
                cand.append((edge.calc_length(), edge))
        cand.sort(key=lambda x: x[0])
        need = (len(bm.faces) - budget) // 2 + 1
        used = set()
        picked = []
        for _, edge in cand:
            if edge.verts[0] in used or edge.verts[1] in used:
                continue
            if any(v in used for vv in edge.verts for l in vv.link_edges for v in l.verts):
                continue
            picked.append(edge)
            used.update(edge.verts)
            if len(picked) >= need:
                break
        if not picked:
            break
        bmesh.ops.collapse(bm, edges=picked, uvs=True)
    print(f'arm_edit refine: {len(bm.faces)} triangles after {rounds} rounds of collapse')
else:
    raise SystemExit(f'unknown mode {mode}')

bm.transform(mw.inverted())
bm.to_mesh(ob.data)
bm.free()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False)
print('arm_edit wrote', out)
