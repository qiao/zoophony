"""Measures the seated left leg of a rig step (steps.py) with plane cuts, in units.

    uv run --no-project --with numpy python -I docs/research/2026-10-26-fifth-bears/leg_measure.py <step dir>...

From the side: the top and the bottom of the leg at 25%, 50%, and 75% of the thigh from the hip
joint to the knee joint, the highest point of the knee zone (the knee joint z - 0.03 to its
front) over the top at 50% of the thigh (rise), and the bottom at 75% under the bottom at 50%
(drop, the web at the back of the knee). From the front: the widths of the thigh at 50%, the knee
(the section at the knee joint z, above the knee joint - 0.05), and the shin (the section at the
middle height of the shin). The column of the leg is |x - knee x| < 0.12, and the cuts take only the faces of the hips and
the left leg (a mean weight sum above 0.9), so that the belly over the thigh does not count.
"""
import glob
import os
import sys

import numpy as np


def section(points, tris, axis, value):
    """Gives the points where the edges of the faces cross the plane `axis` = value."""
    out = []
    for k in range(3):
        a, b = points[tris[:, k]], points[tris[:, (k + 1) % 3]]
        da, db = a[:, axis] - value, b[:, axis] - value
        cross = da * db < 0
        t = da[cross] / (da[cross] - db[cross])
        out.append(a[cross] + t[:, None] * (b[cross] - a[cross]))
    return np.concatenate(out) if out else np.zeros((0, 3))


for d in sys.argv[1:]:
    step = sorted(glob.glob(os.path.join(d, '*crease_relax.npz')))[-1]
    data = np.load(step)
    heads = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    lower = data['thigh_L'] + data['shin_L'] + data['foot_L'] + data['hips']
    t = t[lower[t].mean(axis=1) > 0.9]
    hip, knee, ankle = heads['thigh_L'], heads['shin_L'], heads['foot_L']
    col = lambda q: q[np.abs(q[:, 0] - knee[0]) < 0.12]
    rows = {}
    for share in (0.25, 0.5, 0.75):
        z = hip[2] + share * (knee[2] - hip[2])
        q = col(section(p, t, 2, z))
        q = q[(q[:, 1] > ankle[1] + 0.02)]
        rows[share] = (q[:, 1].max(), q[:, 1].min(), np.ptp(q[:, 0]))
    zone = [col(section(p, t, 2, z)) for z in np.arange(knee[2] - 0.03, knee[2] + 0.12, 0.005)]
    top = max(q[:, 1].max() for q in zone if len(q))
    front = max(z for z, q in zip(np.arange(knee[2] - 0.03, knee[2] + 0.12, 0.005), zone)
                if len(q) and q[:, 1].max() > knee[1] - 0.02)
    k = col(section(p, t, 2, knee[2]))
    k = k[k[:, 1] > knee[1] - 0.05]
    s = col(section(p, t, 1, (knee[1] + ankle[1]) / 2))
    s = s[s[:, 2] > knee[2] - 0.15]
    name = os.path.basename(d.rstrip('/'))
    print(f'{name}: thigh top/bottom/thick 25% {rows[0.25][0]:.3f}/{rows[0.25][1]:.3f}/'
          f'{rows[0.25][0] - rows[0.25][1]:.3f}, 50% {rows[0.5][0]:.3f}/{rows[0.5][1]:.3f}/'
          f'{rows[0.5][0] - rows[0.5][1]:.3f}, 75% {rows[0.75][0]:.3f}/{rows[0.75][1]:.3f}/'
          f'{rows[0.75][0] - rows[0.75][1]:.3f} | knee rise {top - rows[0.5][0]:+.3f} '
          f'front {front - knee[2]:.3f} drop {rows[0.5][1] - rows[0.75][1]:+.3f} | width thigh '
          f'{rows[0.5][2]:.3f} knee {np.ptp(k[:, 0]):.3f} shin {np.ptp(s[:, 0]):.3f} '
          f'shin depth {np.ptp(s[:, 2]):.3f}')
