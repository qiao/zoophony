"""Prototype: scales the leg vertices of a bind step across the bent leg bones by a taper profile,
and writes a step dir copy with the result as 15-taper.npz."""
import os, sys, shutil
import numpy as np
d, step, out, fk, t0, t1 = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
shutil.copytree(d, out, dirs_exist_ok=True)
data = dict(np.load(os.path.join(d, f'{step}.npz')))
heads = np.load(os.path.join(d, 'heads-2.npz'))
p = data['points'].copy()
def unit(v): return v / np.linalg.norm(v)
for side in 'LR':
    th, sh = data.get(f'thigh_{side}'), data.get(f'shin_{side}')
    if th is None: continue
    H, K, A = heads[f'thigh_{side}'], heads[f'shin_{side}'], heads[f'foot_{side}']
    share = np.clip(th + sh - data['hips'], 0, 1)
    ids = np.nonzero(share > 0)[0]
    q = p[ids]
    best = None
    for a, b, seg in ((H, K, 'thigh'), (K, A, 'shin')):
        v = b - a
        t = np.clip(((q - a) @ v) / (v @ v), 0, 1)
        c = a + t[:, None] * v
        dist = np.linalg.norm(q - c, axis=1)
        # a parameter along the leg: 0 at the hip, 1 at the knee, 2 at the ankle
        u = t if seg == 'thigh' else 1 + t
        if best is None: best = (c, dist, u)
        else:
            closer = dist < best[1]
            best = (np.where(closer[:, None], c, best[0]), np.where(closer, dist, best[1]), np.where(closer, u, best[2]))
    c, dist, u = best
    # f = 1 away from the knee, fk at the knee: ramps over [t0, 1] on the thigh and [1, 1 + t1] on the shin
    f = np.ones(len(ids))
    a1 = (u > t0) & (u <= 1)
    f[a1] = 1 + (fk - 1) * ((u[a1] - t0) / (1 - t0)) ** 1.0
    a2 = (u > 1) & (u < 1 + t1)
    f[a2] = fk + (1 - fk) * ((u[a2] - 1) / t1)
    f = 1 + (f - 1) * share[ids]
    p[ids] = c + (q - c) * f[:, None]
data['points'] = p
np.savez(os.path.join(out, '15-taper.npz'), **data)
print('wrote', out)
