"""Separates the free flipper of the left side from the side of the body below the root of the
flipper, and prints the distance of each part to the chain of the arm joints of the config. A
vertex below the height `low` and beyond x 0.18 belongs to the flipper when it is in the part of
the mesh that holds the flipper tip.

    uv run --no-project --with numpy python -I flipper_free.py <mesh.npz> <config.json> <low>
"""
import json
import sys

import numpy as np

m = np.load(sys.argv[1])
v, t = m['v'], m['tris']
cfg = json.load(open(sys.argv[2]))
low = float(sys.argv[3])
j = cfg['joints']
chain = np.array([j[f'{b}_L']['head'] for b in ('upper_arm', 'forearm', 'hand', 'fingers')]
                 + [j['fingers_L']['tail']], float)


def gap(p):
    g = np.full(len(p), np.inf)
    for a, b in zip(chain[:-1], chain[1:]):
        ab = b - a
        s = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
        g = np.minimum(g, np.linalg.norm(p - (a + s[:, None] * ab), axis=1))
    return g


mask = (v[:, 0] > 0.18) & (v[:, 1] < low)
parent = np.arange(len(v))


def root(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]
        a = parent[a]
    return a


for f in t:
    for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
        if mask[a] and mask[b]:
            parent[root(a)] = root(b)
tip = int(np.argmin(np.where(mask, np.linalg.norm(v - chain[-1], axis=1), np.inf)))
flip = np.array([mask[i] and root(i) == root(tip) for i in range(len(v))])
body = mask & ~flip
g = gap(v)
print(f'below y {low}: flipper {flip.sum()} vertices, x {v[flip, 0].min():.3f}..{v[flip, 0].max():.3f}, '
      f'gap to the chain at most {g[flip].max():.4f}')
print(f'body side beyond x 0.18: {body.sum()} vertices, x at most {v[body, 0].max():.3f}, '
      f'gap to the chain at least {g[body].min():.4f}')
top = (v[:, 0] > 0.18) & (v[:, 1] >= low)
print(f'at and above y {low} beyond x 0.18: {top.sum()} vertices, gap to the chain from '
      f'{g[top].min():.4f} to {g[top].max():.4f}')
