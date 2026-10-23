"""notch.py <dump> <corners.json> <src.npz> [ring u]: the depth of the front notch of the right arm
root. For each pose, the largest depth of the notch vertices R below the convex hull of the rig
vertices whose source lies within ring u of the middle of R and outside R. Gives the source and
p50 / p95 / max of the rest, the play, and the lift (cm)."""
import json, sys
import numpy as np
from scipy.spatial import ConvexHull, cKDTree
d, cpath, spath = sys.argv[1:4]; ring = float(sys.argv[4]) if len(sys.argv) > 4 else 0.08
R = [975, 980, 982, 985, 986, 988, 990, 991]
m = json.load(open(d + '.json')); L = m['labels']; nv = len(m['bind']) // 3
X = np.fromfile(d + '.bin', np.float32).reshape(len(L), nv, 3).astype(float)
C = np.array(m['corners']).reshape(-1, 3); cs = json.load(open(cpath)); V0 = np.load('scratch/src-elbows.npz')['v']
V = np.load(spath)['v']; tree = cKDTree(V)
src = {}
for f, t in enumerate(C):
    if f >= len(cs) or not cs[f] or not cs[f].get('s'): continue
    for i, v in enumerate(t):
        if int(v) not in src: src[int(v)] = int(tree.query(cs[f]['s'][i])[1])
mid = V0[R].mean(0)
inR = {s: [k for k in src if src[k] == s][0] for s in R}
# ring by the places of the base source, so that each variant takes the same neighbors
ringv = []
seen = set()
for k, s in src.items():
    if s < len(V0) and s not in R and np.linalg.norm(V0[s] - mid) < ring and s not in seen:
        seen.add(s); ringv.append(k)
def depth(P):
    h = ConvexHull(P[ringv]); return max(max(0.0, -float((h.equations[:, :3] @ P[inR[s]] + h.equations[:, 3]).max())) for s in R)
Vs = np.zeros((nv, 3))
for k, s in src.items(): Vs[k] = V[s]
s0 = depth(Vs) * 146.78
sets = np.array([l.split(' ')[0] for l in L]); ds = np.array([depth(X[t]) for t in range(len(L))]) * 100
q = lambda st: ' '.join(f'{v:5.2f}' for v in (np.percentile(ds[sets == st], 50), np.percentile(ds[sets == st], 95), ds[sets == st].max()))
print(f'notch depth ({len(ringv)} ring vertices, ring {ring} u): source {s0:.2f} | rest {q("rest")} | play {q("play")} | lift {q("lift")} cm')
