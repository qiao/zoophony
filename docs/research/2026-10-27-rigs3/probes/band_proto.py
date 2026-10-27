"""Prototype: after the knee smoothing of a step dir (step 13), smooth the places of the vertices
whose distance from the seam lies in the band [lo, hi] (units), in <rounds> rounds of <share>,
times the free share of the leg, and write a step dir for zone_turns.py.

    band_proto.py <step dir> <out dir> <lo> <hi> <rounds> <share> [bump]
"""
import glob, os, shutil, sys
import numpy as np

src, out = sys.argv[1], sys.argv[2]
lo, hi, rounds, share = float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), float(sys.argv[6])
bump = len(sys.argv) > 7 and sys.argv[7] == 'bump'
files = sorted(glob.glob(os.path.join(src, '[0-9]*.npz')))
s12 = np.load([f for f in files if os.path.basename(f).startswith('12')][0])
s13 = np.load([f for f in files if os.path.basename(f).startswith('13')][0])
heads = np.load(os.path.join(src, 'heads-2.npz'))
bind, tris = s12['points'], s12['tris']
def unit(v): return v / np.linalg.norm(v)
cols = {k: s12[k] for k in ('thigh_L', 'shin_L', 'hips', 'foot_L', 'thigh_R', 'shin_R', 'foot_R')}
names = list(cols)
W = np.stack([cols[k] for k in names], 1)
main = W[tris].sum(axis=1).argmax(axis=1)
neighbors = [set() for _ in range(len(bind))]
for a, b, c in tris:
    neighbors[a].update((b, c)); neighbors[b].update((a, c)); neighbors[c].update((a, b))
res = s13['points'].copy()
total = 0
for side in 'LR':
    th, sh = names.index(f'thigh_{side}'), names.index(f'shin_{side}')
    on_t = np.zeros(len(bind), bool); on_s = np.zeros(len(bind), bool)
    on_t[tris[main == th].ravel()] = True; on_s[tris[main == sh].ravel()] = True
    K = heads[f'shin_{side}']
    inner = unit(unit(heads[f'thigh_{side}'] - K) + unit(heads[f'foot_{side}'] - K))
    seam = on_t & on_s & ((bind - K) @ inner >= 0.0)
    free = np.clip(cols[f'thigh_{side}'] + cols[f'shin_{side}'] - cols['hips'], 0, 1)
    pts = bind[seam]
    near = np.array([np.linalg.norm(pts - p, axis=1).min() for p in bind])
    ids = np.nonzero((near >= lo) & (near < hi) & (free > 0))[0]
    w = free[ids] * share
    if bump:
        w = w * np.sin(np.pi * (near[ids] - lo) / (hi - lo))
    rings = [np.array(sorted(neighbors[i])) for i in ids]
    for _ in range(rounds):
        mids = np.array([res[r].mean(axis=0) for r in rings])
        res[ids] += w[:, None] * (mids - res[ids])
    total += len(ids)
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
for f in glob.glob(os.path.join(out, '13-*.npz')):
    d = dict(np.load(f)); d['points'] = res; np.savez(f, **d)
print(f'{total} band vertices, largest move from step 13 {float(np.linalg.norm(res - s13["points"], axis=1).max()) * 1634.55:.1f} mm')
