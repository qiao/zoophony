"""Measures the rim of the left side wall of a cat arm copy (a GLB in the axes of the studio):
the wall faces lie on the plane of the seam. Prints the count of wall faces, the angles between
the normals of each wall face and its neighbor across the rim, and the place of the trunk
vertices next to the rim from the plane (out of the trunk is positive), in cm.

    uv run --no-project --with numpy python -I scratch/wall-rim.py <glb>
"""
import json
import struct
import sys

import numpy as np

SCALE = 1.63916


def read(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    bin_start = 20 + n + 8
    def acc(i):
        a = j['accessors'][i]
        v = j['bufferViews'][a['bufferView']]
        off = bin_start + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        comp = {5126: ('f', 4), 5125: ('I', 4), 5123: ('H', 2)}[a['componentType']]
        k = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        arr = np.frombuffer(b[off:off + a['count'] * k * comp[1]], dtype='<' + comp[0]).reshape(-1, k)
        return arr
    p = j['meshes'][0]['primitives'][0]
    return acc(p['attributes']['POSITION']).astype(float), acc(p['indices']).reshape(-1, 3)


pos, tris = read(sys.argv[1])
lo, hi = pos[:, 1].min(), pos[:, 1].max()
u = pos.copy()
u[:, 1] -= lo
u /= hi - lo
# Weld.
keys = {}
remap = np.zeros(len(u), int)
for i, p in enumerate(np.round(u / 1e-5).astype(np.int64)):
    remap[i] = keys.setdefault(tuple(p), i)
tris = remap[tris]
normal = np.array([1.0, 0.1, 0.0]) / np.linalg.norm([1.0, 0.1, 0.0])
dist = (u - [0.08, 0.6, 0.0]) @ normal
on = np.abs(dist) < 2e-4
wall = np.nonzero(on[tris].all(axis=1) & (u[tris][:, :, 0].mean(axis=1) > 0.05) & (u[tris][:, :, 1].mean(axis=1) < 0.61))[0]
fn = np.cross(u[tris[:, 1]] - u[tris[:, 0]], u[tris[:, 2]] - u[tris[:, 0]])
fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
edges = {}
for t, (a, b, c) in enumerate(tris):
    for x, y in ((a, b), (b, c), (c, a)):
        edges.setdefault((min(x, y), max(x, y)), []).append(t)
wset = set(wall.tolist())
rim = []
near = set()
for e, fs in edges.items():
    if len(fs) == 2 and ((fs[0] in wset) != (fs[1] in wset)):
        other = fs[1] if fs[0] in wset else fs[0]
        if (u[list(e)][:, 1] < 0.595).all():
            ang = np.degrees(np.arccos(np.clip(fn[fs[0]] @ fn[fs[1]], -1, 1)))
            rim.append((ang, float(u[list(e)][:, 1].mean())))
            for v in tris[other]:
                if not on[v]:
                    near.add(int(v))
rim.sort(reverse=True)
angles = np.array([a for a, _ in rim])
print(f'{sys.argv[1]}: {len(wall)} wall faces, {len(rim)} lower rim edges, angle p50 {np.median(angles):.1f} max {angles.max():.1f} deg, over 30 deg {(angles > 30).sum()}')
print('  largest:', ' '.join(f'{a:.0f}@y{y:.3f}' for a, y in rim[:8]))
d = np.array([dist[v] for v in near]) * SCALE * 100
print(f'  trunk vertices next to the rim: {len(d)}, distance from the plane cm: min {d.min():.2f} p50 {np.median(d):.2f} max {d.max():.2f}')
print(f'  wall height: y {u[tris[wall]][:, :, 1].min():.3f} to {u[tris[wall]][:, :, 1].max():.3f} units')
