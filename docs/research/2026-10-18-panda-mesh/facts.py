"""Prints the facts of the dog mesh of the user, in the units of the studio (1 unit from the soles
to the top, the soles at y = 0, +z forward, +x the left side of the animal).

    blender -b --factory-startup --python facts.py -- <dog.glb>
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
open_edges = [e for e in bm.edges if len(e.link_faces) == 1]
many = sum(1 for e in bm.edges if len(e.link_faces) > 2)
v = np.array([list(x.co) for x in bm.verts])
v = np.stack([v[:, 0], v[:, 2], -v[:, 1]], axis=1)
tris = np.array([[x.index for x in f.verts] for f in bm.faces])
lo, hi = v[:, 1].min(), v[:, 1].max()
v = (v - [0, lo, 0]) / (hi - lo)
print(f'weld 1e-5: {before} vertices to {len(v)}, {len(tris)} triangles, height {hi - lo:.4f} '
      f'units of the file')
print(f'open edges {len(open_edges)}, edges with more than two faces {many}')
for e in open_edges:
    a, b = (np.array([e.verts[0].index, e.verts[1].index]))
    print('  open edge', v[a].round(4), v[b].round(4))
print('box', v.min(0).round(4), v.max(0).round(4))

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
# Symmetry: the mean x and the mirror distance.
print('mean x', v[:, 0].mean().round(4))
for name, lo_, hi_ in (('top 5%', 0.95, 1.01), ('head 0.75..1', 0.75, 1.01)):
    q = v[(v[:, 1] >= lo_) & (v[:, 1] < hi_)]
    print(name, 'box', q.min(0).round(4), q.max(0).round(4))
# The highest vertices.
order = np.argsort(-v[:, 1])[:12]
for k in order:
    print('  high vertex', v[k].round(4))
# Front-most and back-most
print('front-most', v[np.argmax(v[:, 2])].round(4), 'back-most', v[np.argmin(v[:, 2])].round(4))
