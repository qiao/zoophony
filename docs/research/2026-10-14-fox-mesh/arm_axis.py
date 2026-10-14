"""Measures the left arm of the fox mesh of the user along its own axis, in units of the studio.

    blender -b --factory-startup --python arm_axis.py -- <fox.glb> <x_min> <y_min> <y_max>

The mesh is welded and scaled as in `sections.py`. The free arm is the part of the mesh at
x > x_min and y_min < y < y_max. The script fits the axis of the free arm (the first principal
direction of its vertices), then cuts the whole left side of the mesh across that axis in steps
of 0.01 units and prints each loop of the cut: its middle and its widths across the axis.
"""

import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
x_min, y_min, y_max = map(float, argv[1:4])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.transform(ob.matrix_world)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.verts.ensure_lookup_table()
v = np.array([list(x.co) for x in bm.verts])
v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)
tris = np.array([[x.index for x in f.verts] for f in bm.faces])
lo, hi = v[:, 1].min(), v[:, 1].max()
v = (v - [0, lo, 0]) / (hi - lo)

arm = v[(v[:, 0] > x_min) & (v[:, 1] > y_min) & (v[:, 1] < y_max)]
mid = arm.mean(0)
_, _, vt = np.linalg.svd(arm - mid)
axis = vt[0] if vt[0][1] < 0 else -vt[0]
print('free arm vertices', len(arm), 'middle', mid.round(4), 'axis (down the arm)', axis.round(4))
s = (arm - mid) @ axis
print('free arm along the axis', s.min().round(4), s.max().round(4))
side = vt[1]
up = np.cross(axis, side)
for h in np.arange(-0.25, s.max() + 0.005, 0.01):
    d = (v - mid) @ axis - h
    points, parent = {}, {}

    def root(k):
        while parent[k] != k:
            k = parent[k]
        return k

    for t in tris:
        keys = []
        for i in range(3):
            a, b = t[i], t[(i + 1) % 3]
            if (d[a] < 0) != (d[b] < 0):
                key = (min(a, b), max(a, b))
                points[key] = v[a] + (v[b] - v[a]) * (d[a] / (d[a] - d[b]))
                parent.setdefault(key, key)
                keys.append(key)
        if len(keys) == 2:
            parent[root(keys[1])] = root(keys[0])
    loops = {}
    for key, p in points.items():
        loops.setdefault(root(key), []).append(p)
    text = []
    for g in loops.values():
        g = np.array(g)
        c = g.mean(0)
        if len(g) < 3 or c[0] < 0.0:
            continue
        w1 = np.ptp((g - c) @ side)
        w2 = np.ptp((g - c) @ up)
        text.append(f'middle {c.round(3)} widths {w1:.3f} {w2:.3f} n {len(g)}')
    print(f's={h:+.3f}: ' + ' | '.join(text))
