"""Prototype: redo the knee smoothing of the left leg from step 12 of a step dir, then smooth the
move field in the band from <from> to the reach, and write a step dir for zone_turns.py.

    fade_proto.py <step dir> <out dir> <from> <rounds>
"""
import glob, os, shutil, sys
import numpy as np

src, out, frm, rounds = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
files = sorted(glob.glob(os.path.join(src, '[0-9]*.npz')))
s12 = np.load([f for f in files if os.path.basename(f).startswith('12')][0])
s13 = np.load([f for f in files if os.path.basename(f).startswith('13')][0])
heads = np.load(os.path.join(src, 'heads-2.npz'))
bind, tris = s12['points'], s12['tris']
reach, share, rr = 0.105, 0.5, 12
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
    K = heads[f'shin_{side}'] if f'shin_{side}' in heads else None
    if K is None:
        continue
    inner = unit(unit(heads[f'thigh_{side}'] - K) + unit(heads[f'foot_{side}'] - K))
    seam = on_t & on_s & ((res - K) @ inner >= 0.0)
    free = np.clip(cols[f'thigh_{side}'] + cols[f'shin_{side}'] - cols['hips'], 0, 1)
    pts = res[seam]
    near = np.array([np.linalg.norm(pts - p, axis=1).min() for p in res])
    ids = np.nonzero((near < reach) & (free > 0))[0]
    fall = 0.5 * (1 + np.cos(np.pi * near[ids] / reach))
    w = fall * free[ids] * share
    rings = [np.array(sorted(neighbors[i])) for i in ids]
    base = res.copy()
    o = res.copy()
    for _ in range(rr):
        mids = np.array([o[r].mean(axis=0) for r in rings])
        o[ids] += w[:, None] * (mids - o[ids])
    if rounds > 0:
        move = o - base
        band = ids[near[ids] >= frm]
        brings = [np.array(sorted(neighbors[i])) for i in band]
        for _ in range(rounds):
            move[band] = np.array([move[r].mean(axis=0) for r in brings])
        o = base + move
    res = o
print('check of the redo against step 13 (no fade):', float(np.abs(res - s13['points']).max()) if rounds == 0 else '-')
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
for f in glob.glob(os.path.join(out, '13-*.npz')):
    d = dict(np.load(f)); d['points'] = res; np.savez(f, **d)
print('largest change from step 13:', float(np.linalg.norm(res - s13['points'], axis=1).max()), 'u')
