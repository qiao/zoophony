"""Counts the hard edges at the back of the seated left knee of the last saved rig step (steps.py).

    uv run --no-project --with numpy python -I docs/research/2026-10-26-fifth-bears/hard_edges.py [--step NN] <step dir>...

The back zone holds the faces of the leg whose middle lies within 0.1 units of the knee joint of
the bind, behind the shin axis and below the thigh axis: (m - K) . T > 0 and (m - K) . S > 0,
with T the unit direction from the knee to the hip joint and S from the knee to the ankle. A hard
edge joins two faces of the zone whose normals turn more than 40 degrees (the crease angle of the
polar bear), so the app shades each face apart. A pleat face faces into the crease: the dot of
its normal with unit(T + S) is below -0.2.
"""
import glob
import os
import sys

import numpy as np

args = sys.argv[1:]
step = None
if '--step' in args:
    i = args.index('--step')
    step = args[i + 1]
    args = args[:i] + args[i + 2:]


def unit(v):
    return v / np.linalg.norm(v)


def zone_stats(p, t, lower, K, T, S, side_sign):
    mids = p[t].mean(axis=1)
    rel = mids - K
    zone = ((lower[t].mean(axis=1) > 0.9) & (np.linalg.norm(rel, axis=1) < 0.1)
            & (rel @ T > 0) & (rel @ S > 0) & (mids[:, 0] * side_sign > 0))
    c = p[t]
    n = np.cross(c[:, 1] - c[:, 0], c[:, 2] - c[:, 0])
    n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    inner = unit(T + S)
    pleat = zone & (n @ inner < -0.2)
    owner = {}
    hard, length = 0, 0.0
    for f in np.nonzero(zone)[0]:
        for k in range(3):
            a, b = int(t[f][k]), int(t[f][(k + 1) % 3])
            key = (min(a, b), max(a, b))
            if key in owner:
                ang = np.degrees(np.arccos(np.clip(n[f] @ n[owner[key]], -1, 1)))
                if ang > 40:
                    hard += 1
                    length += np.linalg.norm(p[a] - p[b])
            else:
                owner[key] = f
    return int(zone.sum()), hard, length, int(pleat.sum())


for d in args:
    files = sorted(glob.glob(os.path.join(d, '[0-9]*.npz')))
    if step:
        files = [f for f in files if os.path.basename(f).startswith(step)]
    f = files[-1]
    data = np.load(f)
    heads = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    lower = data['thigh_L'] + data['shin_L'] + data['foot_L'] + data['hips']
    K = heads['shin_L']
    T = unit(heads['thigh_L'] - K)
    S = unit(heads['foot_L'] - K)
    z, hard, length, pleat = zone_stats(p, t, lower, K, T, S, 1.0)
    print(f'{os.path.basename(d.rstrip("/"))} {os.path.basename(f)[:-4]} left: back faces {z}, '
          f'hard edges {hard} ({length:.3f} u), pleat faces {pleat}')
