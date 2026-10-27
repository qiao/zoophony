"""Prototype: redo the knee smoothing of a step dir from step 12, with the weight of each vertex
also times a fade along the bind shin: 1 above <start> units down the shin from the knee joint, 0
below <stop>, a half cosine between. Writes a step dir for zone_turns.py.

    stop_proto.py <step dir> <out dir> <start> <stop> [reach rounds]
"""
import glob, os, shutil, sys
import numpy as np

src, out, start, stop = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
reach = float(sys.argv[5]) if len(sys.argv) > 5 else 0.105
rr = int(sys.argv[6]) if len(sys.argv) > 6 else 12
files = sorted(glob.glob(os.path.join(src, '[0-9]*.npz')))
s12 = np.load([f for f in files if os.path.basename(f).startswith('12')][0])
s13 = np.load([f for f in files if os.path.basename(f).startswith('13')][0])
heads = np.load(os.path.join(src, 'heads-2.npz'))
bind, tris = s12['points'], s12['tris']
share = 0.5
def unit(v): return v / np.linalg.norm(v)
cols = {k: s12[k] for k in ('thigh_L', 'shin_L', 'hips', 'foot_L', 'thigh_R', 'shin_R', 'foot_R')}
names = list(cols)
W = np.stack([cols[k] for k in names], 1)
main = W[tris].sum(axis=1).argmax(axis=1)
neighbors = [set() for _ in range(len(bind))]
for a, b, c in tris:
    neighbors[a].update((b, c)); neighbors[b].update((a, c)); neighbors[c].update((a, b))
res = bind.copy()
for side in 'LR':
    th, sh = names.index(f'thigh_{side}'), names.index(f'shin_{side}')
    on_t = np.zeros(len(bind), bool); on_s = np.zeros(len(bind), bool)
    on_t[tris[main == th].ravel()] = True; on_s[tris[main == sh].ravel()] = True
    K = heads[f'shin_{side}']
    S = unit(heads[f'foot_{side}'] - K)
    inner = unit(unit(heads[f'thigh_{side}'] - K) + S)
    seam = on_t & on_s & ((res - K) @ inner >= 0.0)
    free = np.clip(cols[f'thigh_{side}'] + cols[f'shin_{side}'] - cols['hips'], 0, 1)
    pts = res[seam]
    near = np.array([np.linalg.norm(pts - p, axis=1).min() for p in res])
    ids = np.nonzero((near < reach) & (free > 0))[0]
    fall = 0.5 * (1 + np.cos(np.pi * near[ids] / reach))
    h = (res[ids] - K) @ S
    x = np.clip((h - start) / (stop - start), 0, 1)
    fall = fall * 0.5 * (1 + np.cos(np.pi * x))
    w = fall * free[ids] * share
    rings = [np.array(sorted(neighbors[i])) for i in ids]
    o = res.copy()
    for _ in range(rr):
        mids = np.array([o[r].mean(axis=0) for r in rings])
        o[ids] += w[:, None] * (mids - o[ids])
    res = o
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
for f in glob.glob(os.path.join(out, '13-*.npz')):
    d = dict(np.load(f)); d['points'] = res; np.savez(f, **d)
print(f'largest change from step 13 {float(np.linalg.norm(res - s13["points"], axis=1).max()) * 1634.55:.1f} mm')
