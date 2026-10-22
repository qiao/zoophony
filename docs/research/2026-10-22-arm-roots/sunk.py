"""sunk.py <dump base> [radius m] [sets]: the notch depth of the arm seams. For each seam vertex
(arm weight 0.2 to 0.8) and each sample, its depth below the convex hull of the posed vertices
whose bind places lie within the radius of its bind place. Prints, for each side, the p50 and p95
over the samples of the deepest seam vertex, and the vertex that is deepest most often."""
import json, sys
from collections import Counter
import numpy as np
from scipy.spatial import ConvexHull, cKDTree
base = sys.argv[1]; r = float(sys.argv[2]) if len(sys.argv) > 2 else 0.15
sets = (sys.argv[3] if len(sys.argv) > 3 else 'rest,play').split(',')
m = json.load(open(base + '.json')); arm = np.array(m['arm']); labels = m['labels']; nv = len(arm)
B = np.array(m['bind']).reshape(-1, 3)
X = np.fromfile(base + '.bin', np.float32).reshape(len(labels), nv, 3).astype(float)
seam = np.nonzero((arm > 0.2) & (arm < 0.8))[0]
tree = cKDTree(B)
near = {v: tree.query_ball_point(B[v], r) for v in seam}
keep = [k for k, l in enumerate(labels) if l.split(' ')[0] in sets]
for side, pick in (('L', B[seam, 0] < 0), ('R', B[seam, 0] > 0)):
    vs = seam[pick]; worst = []; who = Counter()
    for k in keep:
        P = X[k]; best = (0.0, -1)
        for v in vs:
            h = ConvexHull(P[near[v]])
            d = -float((h.equations[:, :3] @ P[v] + h.equations[:, 3]).max())
            if d > best[0]: best = (d, v)
        worst.append(best[0] * 100); who[best[1]] += 1
    w = np.array(worst)
    print(f'side {side} (app x {"<" if side == "L" else ">"} 0): {len(vs)} seam vertices, {len(w)} samples, notch depth p50 {np.percentile(w,50):.2f} p95 {np.percentile(w,95):.2f} cm, deepest most often: {who.most_common(3)}')
