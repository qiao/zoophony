"""vdepth.py <dump base|npz> <corners.json|-> <src.npz> <src vertices> [radius m] [ring u]: the depth of each named source vertex below the convex hull of the posed vertices of its neighborhood (the rig vertices whose source lies within ring u of it, else within radius m), over the play and rest samples."""
import json, sys
import numpy as np
from scipy.spatial import ConvexHull, cKDTree
base = sys.argv[1]; V = np.load(sys.argv[3])['v']; tree = cKDTree(V)
names = list(map(int, sys.argv[4].split(','))); r = float(sys.argv[5]) if len(sys.argv) > 5 else 0.15
SETS = (sys.argv[7] if len(sys.argv) > 7 else 'rest,play').split(',')
ring = float(sys.argv[6]) if len(sys.argv) > 6 else 0.09
if base.endswith('.npz'):
    P0 = np.load(base)['v']; X = P0[None]; src = {i: i for i in range(len(P0))}; labels = ['rest source']
else:
    cs = json.load(open(sys.argv[2]))
    m = json.load(open(base + '.json')); C = np.array(m['corners']).reshape(-1, 3); labels = m['labels']; nv = len(m['arm'])
    X = np.fromfile(base + '.bin', np.float32).reshape(len(labels), nv, 3).astype(float)
    src = {}
    for f, t in enumerate(C):
        for i, v in enumerate(t):
            if int(v) not in src and f < len(cs): src[int(v)] = int(tree.query(cs[f]['s'][i])[1])
rv = {}
for v, s in src.items(): rv.setdefault(s, v)
keys = list(src.keys()); spos = V[[src[v] for v in keys]]
for s in names:
    if s not in rv: print(f'source {s}: not in the rig'); continue
    near = [keys[i] for i in np.nonzero(np.linalg.norm(spos - V[s], axis=1) < ring)[0]]
    ds = []
    for k, lab in enumerate(labels):
        if lab.split(' ')[0] not in SETS: continue
        P = X[k]; h = ConvexHull(P[near]); p = P[rv[s]]
        ds.append(max(0.0, -float((h.equations[:, :3] @ p + h.equations[:, 3]).max())))
    ds = np.array(ds) * (100 if not base.endswith('.npz') else 165)
    print(f'source {s}: depth p50 {np.percentile(ds,50):.2f} p95 {np.percentile(ds,95):.2f} worst {ds.max():.2f} cm, {len(near)} neighbors')
