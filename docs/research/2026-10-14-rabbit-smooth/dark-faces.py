"""Lists the fur faces of a rig GLB file that stay 10% or more darker than the cream, by part.

    uv run --no-project --with numpy python -I dark-faces.py assets/models/rabbit/rabbit-4.rig.glb

The rule of a dark face is the rule of `colors.py` of the brief: the scale k of the cream that is
nearest to the sRGB face color is below 0.9, and the face keeps the hue of the cream. The parts
use the heights and the planes of `tools/mesh-rigs/rabbit.json` in the units of the GLB file.
"""
import json
import struct
import sys

import numpy as np

data = open(sys.argv[1], 'rb').read()
jlen = struct.unpack('<I', data[12:16])[0]
gj = json.loads(data[20:20 + jlen])
bin0 = data[20 + jlen + 8:]


def acc(i):
    a = gj['accessors'][i]
    bv = gj['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(bin0, dt, a['count'] * n, off).reshape(a['count'], n)


for m in gj['meshes']:
    for p in m['primitives']:
        if gj['materials'][p['material']]['name'] != 'fur':
            continue
        c = acc(p['attributes']['COLOR_0'])
        P = acc(p['attributes']['POSITION'])
        idx = acc(p['indices']).ravel()
        tris = idx.reshape(-1, 3)
        fc = c[tris[:, 0]]
        srgb = np.where(fc <= 0.0031308, 12.92 * fc, 1.055 * fc ** (1 / 2.4) - 0.055)
        cream = np.array([0.96, 0.89, 0.80])
        k = (srgb @ cream) / (cream @ cream)
        resid = np.linalg.norm(srgb - k[:, None] * cream, axis=1)
        gray = np.flatnonzero((k < 0.9) & (resid < 0.08))
        center = P[tris[gray]].mean(axis=1)
        y = center[:, 1]
        print(f'bind height range of the body: {P[:, 1].min():.3f} to {P[:, 1].max():.3f}')
        parts = {}
        for f, (x, yy, z), kk in zip(gray, center, k[gray]):
            if yy > 0.88:
                part = 'ears'
            elif yy > 0.7:
                part = 'head'
            elif abs(x) > 0.106 and yy > 0.3:
                part = 'arms'
            elif yy < 0.2:
                part = 'legs and feet'
            else:
                part = 'trunk'
            parts.setdefault(part, []).append((f, kk, x, yy, z))
        for part, rows in sorted(parts.items()):
            ks = np.array([r[1] for r in rows])
            print(f'{part}: {len(rows)} faces, k {ks.min():.2f} to {ks.max():.2f}')
            for f, kk, x, yy, z in rows:
                print(f'  face {f}: k {kk:.2f}, center ({x:.3f}, {yy:.3f}, {z:.3f})')
