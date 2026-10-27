"""Draws sections of the seated left knee of saved rig steps (steps.py): the mesh cut by planes
across the bend axis of the knee, in the bend plane (u along the thigh toward the hip, v along the
shin toward the ankle, in units from the knee joint).

    LIM=<u0,u1,v0,v1> uv run --no-project --with numpy --with matplotlib python -I \
        docs/research/2026-10-26-fifth-bears/section.py <out.png> <offsets> <dir:step>...

<offsets> is a comma list of plane offsets along the bend axis, in units (+ toward the outer side).
"""
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

out = sys.argv[1]
offsets = [float(x) for x in sys.argv[2].split(',')]
items = sys.argv[3:]


def unit(v):
    return v / np.linalg.norm(v)


def section(p, t, origin, normal):
    d = (p - origin) @ normal
    segs = []
    for tri in t:
        dd = d[tri]
        if (dd > 0).all() or (dd < 0).all():
            continue
        pts = []
        for k in range(3):
            a, b = tri[k], tri[(k + 1) % 3]
            da, db = d[a], d[b]
            if (da > 0) != (db > 0):
                s = da / (da - db)
                pts.append(p[a] + s * (p[b] - p[a]))
        if len(pts) == 2:
            segs.append(pts)
    return np.array(segs)


fig, axes = plt.subplots(len(offsets), len(items), figsize=(3.6 * len(items), 3.6 * len(offsets)),
                         squeeze=False)
for c, item in enumerate(items):
    d, step = item.rsplit(':', 1)
    import glob
    path = sorted(glob.glob(os.path.join(d, f'{step}*.npz')))[0]
    data = np.load(path)
    heads = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    K = heads['shin_L']
    Td = unit(heads['thigh_L'] - K)
    Sd = unit(heads['foot_L'] - K)
    axis = unit(np.cross(Td, Sd))
    if axis[0] < 0:
        axis = -axis
    # Keep the faces of the left leg side.
    left = p[t].mean(axis=1)[:, 0] > 0.0
    for r, off in enumerate(offsets):
        ax = axes[r, c]
        segs = section(p, t[left], K + off * axis, axis)
        if len(segs):
            u = (segs - K) @ Td
            v = (segs - K) @ Sd
            for k in range(len(segs)):
                ax.plot(u[k], v[k], 'k.-', lw=0.8, ms=2)
        lim = [float(x) for x in os.environ.get("LIM", "-0.15,0.25,-0.15,0.25").split(",")]
        ax.set_xlim(lim[0], lim[1])
        ax.set_ylim(lim[3], lim[2])
        ax.set_aspect('equal')
        ax.axhline(0, color='0.8', lw=0.5)
        ax.axvline(0, color='0.8', lw=0.5)
        ax.set_title(f'{os.path.basename(d.rstrip("/"))} {step} axis {off:+.2f}', fontsize=8)
plt.tight_layout()
plt.savefig(out, dpi=90)
print('wrote', out)
