"""Counts the hard edges of the seated left leg near the knee in the last step of step dirs
(steps.py), on the inner side (the back of the knee, the crease, and the calf back) and on the
outer side (the knee front and the shin front). A hard edge joins two faces that turn more than
40 degrees (the crease angle of the app). The zone holds the faces of the leg (the thigh, the
shin, the foot, and the hips above 0.9 on the mean) whose middle lies within <reach> units of the
knee joint of the bind. The inner side has (m - K) . (T + S) > 0. The calf count takes the hard
edges of the inner side more than 0.08 units down the shin. TOP=<n> lists the n sharpest edges.
Run it on a mirrored dir (mirror.py) for the right leg.

    zone_turns.py [--reach r] [--step NN] <step dir>...
"""
import glob
import os
import sys

import numpy as np

args = sys.argv[1:]
reach, step = 0.2, None
if '--reach' in args:
    i = args.index('--reach')
    reach = float(args[i + 1])
    args = args[:i] + args[i + 2:]
if '--step' in args:
    i = args.index('--step')
    step = args[i + 1]
    args = args[:i] + args[i + 2:]


def unit(v):
    return v / np.linalg.norm(v)


for d in args:
    files = sorted(glob.glob(os.path.join(d, '[0-9]*.npz')))
    if step:
        files = [f for f in files if os.path.basename(f).startswith(step)]
    data = np.load(files[-1])
    heads = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    K = heads['shin_L']
    inner = unit(unit(heads['thigh_L'] - K) + unit(heads['foot_L'] - K))
    lower = data['thigh_L'] + data['shin_L'] + data['foot_L'] + data['hips']
    mids = p[t].mean(axis=1)
    zone = (lower[t].mean(axis=1) > 0.9) & (np.linalg.norm(mids - K, axis=1) < reach) & (mids[:, 0] > 0)
    c = p[t]
    n = np.cross(c[:, 1] - c[:, 0], c[:, 2] - c[:, 0])
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    owner = {}
    tops = []
    out = {'inner': [], 'outer': []}
    for f in np.nonzero(zone)[0]:
        for k in range(3):
            key = tuple(sorted((int(t[f][k]), int(t[f][(k + 1) % 3]))))
            if key in owner:
                g = owner[key]
                ang = np.degrees(np.arccos(np.clip(n[f] @ n[g], -1, 1)))
                mid = (p[key[0]] + p[key[1]]) / 2
                out['inner' if (mid - K) @ inner > 0 else 'outer'].append(ang)
                tops.append((ang, key, (mid - K) @ unit(heads['foot_L'] - K), (mid - K) @ unit(heads['thigh_L'] - K), (mid - K) @ inner))
            else:
                owner[key] = f
    parts = []
    calf = [a for a, key, s_, t_, i_ in tops if i_ > 0 and s_ > 0.08]
    calf = np.array(calf)
    for side in ('inner', 'outer'):
        a = np.array(out[side])
        parts.append(f'{side}: edges {len(a)}, hard {(a > 40).sum()}, max {a.max():5.1f}, '
                     f'rms {np.sqrt((a ** 2).mean()):4.1f}')
    parts.append(f'calf hard {(calf > 40).sum()} max {calf.max():5.1f} sum>30 {np.clip(calf - 30, 0, None).sum():6.1f}')
    print(f'{os.path.basename(d.rstrip("/")):12s} {os.path.basename(files[-1])[:-4]:15s} ' + ' | '.join(parts))
    if os.environ.get('TOP'):
        for ang, key, s_, t_, i_ in sorted(tops, reverse=True)[:int(os.environ['TOP'])]:
            print(f'    {ang:5.1f} {key} along shin {s_:6.3f} along thigh {t_:6.3f} inner {i_:6.3f}')
