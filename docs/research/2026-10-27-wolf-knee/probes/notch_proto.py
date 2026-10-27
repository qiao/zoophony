"""Prototype: carves the fill behind the bent knee of a bind step. Each leg vertex on the inner
side of the knee that lies farther than rt from the thigh axis and farther than rs from the shin
axis moves to the nearer of the two surfaces (a soft blend), then a few rounds of smoothing of the
moved vertices. Writes <out>/15-notch.npz."""
import os, sys, shutil
import numpy as np
d, step, out = sys.argv[1], sys.argv[2], sys.argv[3]
rt, rs, rounds = float(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6])
shutil.copytree(d, out, dirs_exist_ok=True)
data = dict(np.load(os.path.join(d, f'{step}.npz')))
heads = np.load(os.path.join(d, 'heads-2.npz'))
p = data['points'].copy(); tris = data['tris']
def unit(v): return v / np.linalg.norm(v)
def seg(q, a, b):
    v = b - a
    t = np.clip(((q - a) @ v) / (v @ v), 0, 1)
    c = a + t[:, None] * v
    return c, np.linalg.norm(q - c, axis=1), t
nb = [set() for _ in range(len(p))]
for a, b, c in tris:
    nb[a].update((b, c)); nb[b].update((a, c)); nb[c].update((a, b))
moved_all = []
for side in 'LR':
    th = data.get(f'thigh_{side}'); sh = data.get(f'shin_{side}')
    if th is None: continue
    H, K, A = heads[f'thigh_{side}'], heads[f'shin_{side}'], heads[f'foot_{side}']
    Td, Sd = unit(H - K), unit(A - K)
    share = np.clip(th + sh - data['hips'], 0, 1)
    inner = ((p - K) @ Td > 0) & ((p - K) @ Sd > 0) & (share > 0)
    ids = np.nonzero(inner)[0]
    q = p[ids]
    ct, dt, tt = seg(q, K, H)
    cs, ds, ts = seg(q, K, A)
    over_t, over_s = dt - rt, ds - rs
    fill = (over_t > 0) & (over_s > 0) & (tt < 0.9) & (ts < 0.9)
    k = ids[fill]
    q = q[fill]; ct, dt, cs, ds = ct[fill], dt[fill], cs[fill], ds[fill]
    to_t = ct + (q - ct) / dt[:, None] * rt
    to_s = cs + (q - cs) / ds[:, None] * rs
    # soft choice of the nearer surface
    a = 1 / (1 + np.exp(((dt - rt) - (ds - rs)) / 0.01))  # 1 -> thigh
    tgt = a[:, None] * to_t + (1 - a[:, None]) * to_s
    w = share[k][:, None]
    p[k] = q + w * (tgt - q)
    moved_all.extend(k.tolist())
moved = np.array(sorted(set(moved_all)))
rings = [np.array(sorted(nb[i])) for i in moved]
for _ in range(rounds):
    mids = np.array([p[r].mean(axis=0) for r in rings])
    p[moved] += 0.5 * (mids - p[moved])
data['points'] = p
np.savez(os.path.join(out, '15-notch.npz'), **data)
print('moved', len(moved))
