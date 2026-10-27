"""Measures the thickness of the left leg along its bones with rays from the bone line: the depth
(in the bend plane, square to the bone: up and down on the seated thigh, forward and back on the
shin) and the width (along the bend axis), at shares of the thigh and the shin and at the knee
(on the bisector of the knee). Near the knee, a ray down from the thigh runs inside the shin, so
the stations stay 0.3 of the bone or more from the knee joint. The source is the standing mesh with the legs 1.6 times longer
(01-source-long of steps.py). Units of the rig (1 unit = 1.63 m in the app).

    leg_rays.py <steps dir>[:<step>|:source] ...

The knee front is the distance from the knee joint to the skin along the outer bisector, over the
mean distance of the thigh top and the shin front at 0.06 units from the joint (1 = round, below 1
= a flat bevel). The back is the distance along the inner bisector. Each ray takes the nearest
skin within 0.2 units.
"""
import glob, os, sys
import numpy as np


def unit(v):
    return v / np.linalg.norm(v)


def hit(p, t, origin, direction):
    A, B, C = p[t[:, 0]], p[t[:, 1]], p[t[:, 2]]
    e1, e2 = B - A, C - A
    h = np.cross(direction, e2)
    a = (e1 * h).sum(1)
    ok = np.abs(a) > 1e-12
    f = np.where(ok, 1 / np.where(ok, a, 1), 0)
    s = origin - A
    u = f * (s * h).sum(1)
    q = np.cross(s, e1)
    v = f * (q @ direction)
    d = f * (e2 * q).sum(1)
    good = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (d > 1e-6) & (d < 0.2)
    return d[good].min() if good.any() else np.nan


def measure(label, p, t, H, K, A, bend):
    T, S = unit(H - K), unit(A - K)
    rows = []
    for name, a, b, share in (('thigh 0.5', H, K, 0.5), ('thigh 0.7', H, K, 0.7), ('knee', K, K, 0),
                              ('shin 0.5', K, A, 0.5), ('shin 0.8', K, A, 0.8)):
        if name == 'knee':
            deep = unit(-(T + S)) if np.linalg.norm(T + S) > 1e-6 else unit(np.cross(T, bend))
            c = K
        else:
            axis = unit(b - a)
            deep = unit(np.cross(bend, axis))
            c = a + share * (b - a)
        across = unit(bend)
        dp = hit(p, t, c, deep) + hit(p, t, c, -deep)
        wd = hit(p, t, c, across) + hit(p, t, c, -across)
        rows.append(f'{name} {wd:.3f} x {dp:.3f}')
    line = f'{label}: ' + ' | '.join(rows)
    if np.linalg.norm(T + S) > 0.2:
        outer, inner = unit(-(T + S)), unit(T + S)
        up = unit(np.cross(bend, T))
        if up @ outer < 0:
            up = -up
        fwd = unit(np.cross(S, bend))
        if fwd @ outer < 0:
            fwd = -fwd
        front = hit(p, t, K, outer)
        top, shin = hit(p, t, K + 0.06 * T, up), hit(p, t, K + 0.06 * S, fwd)
        back = hit(p, t, K, inner)
        line += f'\n    knee front {front:.3f} (ratio {front / ((top + shin) / 2):.2f}), back {back:.3f}, knee depth on the bisector {front + back:.3f}'
    print(line)


for arg in sys.argv[1:]:
    d, _, step = arg.partition(':')
    if step == 'source':
        data = np.load(os.path.join(d, '01-source-long.npz'))
        p, t = data['points'], data['tris']
        keep = p[t].mean(axis=1)[:, 0] > 0.0
        measure(f'{d} source x1.6', p, t[keep], np.array([0.11, 0.409, -0.01]),
                np.array([0.118, 0.201, -0.018]), np.array([0.115, 0.065, -0.05]), np.array([1.0, 0, 0]))
        continue
    files = sorted(glob.glob(os.path.join(d, '[0-9][0-9]-*.npz')))
    f = [x for x in files if os.path.basename(x).startswith(step)][-1] if step else files[-1]
    data = np.load(f)
    h = np.load(os.path.join(d, 'heads-2.npz'))
    p, t = data['points'], data['tris']
    keep = p[t].mean(axis=1)[:, 0] > 0.0
    H, K, A = h['thigh_L'], h['shin_L'], h['foot_L']
    measure(f'{d} {os.path.basename(f)[:-4]}', p, t[keep], H, K, A, unit(np.cross(unit(H - K), unit(A - K))))
