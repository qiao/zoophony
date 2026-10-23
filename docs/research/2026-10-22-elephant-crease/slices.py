"""Prints horizontal slices of the left side of a mesh rig source, with the free arm marked."""
import json
import sys

import numpy as np

text = open('tools/blender/rig_mesh.py').read().rsplit('\nmain()', 1)[0]
R = {'__name__': 'rig_mesh'}
exec(compile(text, 'rig_mesh.py', 'exec'), R)
argv = sys.argv[sys.argv.index('--') + 1:]
config = json.load(open(argv[0]))
heights = [float(h) for h in argv[1].split(',')]
if len(argv) > 2:
    config['weights'].update(json.loads(argv[2]))
verts, tris, uvs, _ = R['load_mesh'](config)
heads, ends, rolls, _ = R['joints_of'](config)
import os
SIGN = float(os.environ.get('SIDE', '1'))
free = R['free_arm'](verts, tris, config['weights'], heads, ends, SIGN)
verts = verts * [SIGN, 1.0, 1.0]
print('upper arm head', heads['upper_arm_L'], 'forearm head', heads['forearm_L'])
edges = {tuple(sorted((int(t[i]), int(t[(i + 1) % 3])))) for t in tris for i in range(3)}
edges = np.array(sorted(edges))
for h in heights:
    d = verts[:, 1] - h
    da, db = d[edges[:, 0]], d[edges[:, 1]]
    cross = edges[da * db < 0]
    t = (d[cross[:, 0]] / (d[cross[:, 0]] - d[cross[:, 1]]))[:, None]
    q = verts[cross[:, 0]] + t * (verts[cross[:, 1]] - verts[cross[:, 0]])
    fr = free[cross[:, 0]] & free[cross[:, 1]]
    W, H = 70, 32
    x0, x1, z0, z1 = 0.0, 0.35, -0.25, 0.20
    g = [[' '] * W for _ in range(H)]
    for p, f in zip(q, fr):
        if p[0] < x0:
            continue
        i = int((p[0] - x0) / (x1 - x0) * W)
        j = int((z1 - p[2]) / (z1 - z0) * H)
        if 0 <= i < W and 0 <= j < H:
            g[j][i] = '#' if f else '.'
    print(f'y {h}: x 0 to 0.35 to the right (left side of the animal), z front at top')
    print('\n'.join(''.join(r) for r in g))
