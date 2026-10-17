"""Prints the facts of the fox mesh of the user that the config of the rig needs, in the units of
the studio (1 unit from the soles to the ear tips, the soles at y = 0, +z forward, +x the left
side of the animal).

    blender -b --factory-startup --python facts.py -- <fox.glb>

It prints the weld, the connected parts, the open edges and the edges with more than two faces,
the corner angles of the faces, the normal of the left paw (the smallest principal direction of
its vertices), and the tail: its vertices behind the body, its length along its middle line, its
widths, and the height of its root.
"""

import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=argv[0])
ob = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bm = bmesh.new()
bm.from_mesh(ob.data)
bm.transform(ob.matrix_world)
before = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.verts.ensure_lookup_table()
open_edges = sum(1 for e in bm.edges if len(e.link_faces) == 1)
many = sum(1 for e in bm.edges if len(e.link_faces) > 2)
v = np.array([list(x.co) for x in bm.verts])
v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)
tris = np.array([[x.index for x in f.verts] for f in bm.faces])
lo, hi = v[:, 1].min(), v[:, 1].max()
v = (v - [0, lo, 0]) / (hi - lo)
print(f'weld 1e-5: {before} vertices to {len(v)}, {len(tris)} triangles, height {hi - lo:.4f} '
      f'units of the file')
print(f'open edges {open_edges}, edges with more than two faces {many}')

parent = list(range(len(v)))


def root(k):
    while parent[k] != k:
        parent[k] = parent[parent[k]]
        k = parent[k]
    return k


for a, b, c in tris:
    for p, q in ((a, b), (b, c)):
        ra, rb = root(p), root(q)
        if ra != rb:
            parent[ra] = rb
parts = {}
for k in range(len(v)):
    parts.setdefault(root(k), []).append(k)
sizes = sorted((len(p) for p in parts.values()), reverse=True)
print(f'connected parts {len(sizes)}, vertices of each {sizes[:8]}')
for p in sorted(parts.values(), key=len)[:-1]:
    q = v[p]
    print(f'  small part: {len(p)} vertices, box {q.min(0).round(3)} {q.max(0).round(3)}')

angles = np.full(len(tris), 180.0)
for k in range(3):
    a, b, c = v[tris[:, k]], v[tris[:, (k + 1) % 3]], v[tris[:, (k + 2) % 3]]
    u, w = b - a, c - a
    cos = np.sum(u * w, 1) / np.maximum(np.linalg.norm(u, axis=1) * np.linalg.norm(w, axis=1), 1e-12)
    angles = np.minimum(angles, np.degrees(np.arccos(np.clip(cos, -1, 1))))
print(f'faces with a corner angle below 10 degrees: {int((angles < 10).sum())} of {len(tris)}, '
      f'below 5 degrees: {int((angles < 5).sum())}')

# The left paw: the vertices beyond the wrist along the arm line, within 0.1 units of it.
wrist = np.array([0.212, 0.416, 0.079])
axis = np.array([0.5034, -0.8528, 0.1393])
axis /= np.linalg.norm(axis)
paw = v[((v - wrist) @ axis > 0.0) & (np.linalg.norm(v - wrist, axis=1) < 0.1) & (v[:, 0] > 0.18)]
mid = paw.mean(0)
_, s, vt = np.linalg.svd(paw - mid)
normal = vt[2] if vt[2][0] < 0 else -vt[2]
print(f'left paw: {len(paw)} vertices beyond the wrist, middle {mid.round(4)}, spread {s.round(3)}, '
      f'normal of the palm (smallest direction, inward) {normal.round(3)}, tip at '
      f'{paw[np.argmax((paw - wrist) @ axis)].round(4)}')

# The tail: the vertices behind the back of the body (z below -0.09) and below the root height.
tail = v[(v[:, 2] < -0.028) & (np.abs(v[:, 0]) < 0.05) & (v[:, 1] < 0.36)]
print(f'tail: {len(tail)} vertices with z < -0.09, |x| < 0.11, y < 0.47; box {tail.min(0).round(4)} '
      f'{tail.max(0).round(4)}')
for h in (0.45, 0.40, 0.35, 0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0.02):
    band = tail[np.abs(tail[:, 1] - h) < 0.01]
    if len(band):
        print(f'  y {h:.2f}: x {band[:, 0].min():+.3f}..{band[:, 0].max():+.3f} z '
              f'{band[:, 2].min():+.3f}..{band[:, 2].max():+.3f}')
