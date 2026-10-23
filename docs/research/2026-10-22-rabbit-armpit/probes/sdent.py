"""sdent.py <dump> <corners.json> <src.npz> [ring u] [--src v,...]: for each rig vertex whose source
lies within 0.12 u of the right shoulder joint of the source, the depth below the convex hull of
the vertices whose source lies within ring u of its source: in the source, and p50 / p95 in each
sample set. Prints the vertices with the largest growth in the play (cm, 1.4678 m/u)."""
import json, sys
import numpy as np
from scipy.spatial import ConvexHull, cKDTree
d, cpath, spath = sys.argv[1:4]
ring = float(sys.argv[4]) if len(sys.argv) > 4 and not sys.argv[4].startswith('--') else 0.09
RATE = 146.78
m = json.load(open(d + '.json')); B = np.array(m['bind']).reshape(-1, 3); nv = len(B); L = m['labels']
X = np.fromfile(d + '.bin', np.float32).reshape(len(L), nv, 3).astype(float)
C = np.array(m['corners']).reshape(-1, 3); cs = json.load(open(cpath))
V = np.load(spath)['v']; tree = cKDTree(V)
src = {}
for f, t in enumerate(C):
    if f >= len(cs): break
    if not cs[f] or not cs[f].get('s'): continue
    for i, v in enumerate(t):
        if int(v) not in src: src[int(v)] = int(tree.query(cs[f]['s'][i])[1])
keys = np.array(sorted(src)); S = np.array([V[src[k]] for k in keys])
Jsrc = np.array([-0.075, 0.475, 0.016])
W = np.array(m['weights']).reshape(-1, 4); Jn = np.array(m['joints']).reshape(-1, 4)
names = m['bones'] + ['?'] * 40; names[m['twist']['L']] = 'utwist_L'; names[m['twist']['R']] = 'utwist_R'
sets = np.array([l.split(' ')[0] for l in L])
def dep(P, k, nb):
    h = ConvexHull(P[nb]); return max(0.0, -float((h.equations[:, :3] @ P[k] + h.equations[:, 3]).max()))
only = None
if '--src' in sys.argv: only = set(map(int, sys.argv[sys.argv.index('--src') + 1].split(',')))
rows = []
for i, k in enumerate(keys):
    if only is not None:
        if src[k] not in only: continue
    elif np.linalg.norm(S[i] - Jsrc) > 0.12: continue
    nbi = np.nonzero(np.linalg.norm(S - S[i], axis=1) < ring)[0]
    if len(nbi) < 8: continue
    # one rig vertex for each source place
    _, u = np.unique(np.round(S[nbi], 6), axis=0, return_index=True); nbi = nbi[u]
    if i not in nbi: nbi = np.append(nbi, i)
    nb = keys[nbi]; ii = int(np.nonzero(nb == k)[0][0])
    s0 = dep(S[nbi], ii, np.arange(len(nb))) * RATE
    ds = np.array([dep(X[s][nb], ii, np.arange(len(nb))) for s in range(len(L))]) * 100
    r = [k, src[k], s0]
    for st in ['rest', 'play', 'lift']:
        q = ds[sets == st]; r += [np.percentile(q, 50), np.percentile(q, 95), q.max()]
    rows.append(r)
rows = np.array(rows); np.save(d + '-sdent.npy', rows)
order = np.argsort(-(rows[:, 6] - rows[:, 2]))
print(f'ring {ring} u. rig src | source | rest p50 | play p50 p95 max | lift p50 p95 | weights (cm)')
seen = set()
for i in order[:30]:
    k, s = int(rows[i, 0]), int(rows[i, 1])
    if s in seen: continue
    seen.add(s)
    wt = ', '.join(f'{names[Jn[k, j]]} {W[k, j]:.2f}' for j in range(4) if W[k, j] > 0.01)
    r = rows[i]
    print(f'{k:5d} {s:5d} | {r[2]:5.2f} | {r[3]:5.2f} | {r[6]:5.2f} {r[7]:5.2f} {r[8]:5.2f} | {r[9]:5.2f} {r[10]:5.2f} | {wt} | src {np.round(V[s] - Jsrc, 3)}')
