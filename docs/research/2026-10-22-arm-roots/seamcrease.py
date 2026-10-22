"""seamcrease.py <dump base> <corners.json> <src.npz> [--limit deg] [--sets rest,play]: the concave
edges of the seam band (a corner with arm weight 0.02 to 0.98, both under 0.98) by their fold
over the samples: p50 and the worst, with the source vertices of the edge."""
import json, sys
import numpy as np
from scipy.spatial import cKDTree
base = sys.argv[1]; cs = json.load(open(sys.argv[2])); V = np.load(sys.argv[3])['v']; tree = cKDTree(V)
opt = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
lim = float(opt('--limit', '30')); sets = opt('--sets', 'rest,play').split(',')
m = json.load(open(base + '.json')); C = np.array(m['corners']).reshape(-1, 3); arm = np.array(m['arm'])
labels = m['labels']; nv = len(arm)
X = np.fromfile(base + '.bin', np.float32).reshape(len(labels), nv, 3).astype(float)
keep = [k for k, l in enumerate(labels) if l.split(' ')[0] in sets]
src = {}
for f, t in enumerate(C):
    for i, v in enumerate(t):
        if v not in src: src[int(v)] = int(tree.query(cs[f]['s'][i])[1]) if f < len(cs) else -1
E = {}
for f, t in enumerate(C):
    for i in range(3):
        a, b = int(t[i]), int(t[(i + 1) % 3]); E.setdefault((min(a, b), max(a, b)), []).append(f)
band = [(e, fs) for e, fs in E.items() if len(fs) == 2 and max(arm[e[0]], arm[e[1]]) < 0.98
        and (0.02 < arm[e[0]] < 0.98 or 0.02 < arm[e[1]] < 0.98)]
rows = []
for (a, b), (f, g) in band:
    third = [v for v in C[g] if v not in (a, b)][0]
    P = X[keep]
    n1 = np.cross(P[:, C[f][1]] - P[:, C[f][0]], P[:, C[f][2]] - P[:, C[f][0]])
    n2 = np.cross(P[:, C[g][1]] - P[:, C[g][0]], P[:, C[g][2]] - P[:, C[g][0]])
    cos = (n1 * n2).sum(1) / (np.linalg.norm(n1, axis=1) * np.linalg.norm(n2, axis=1) + 1e-12)
    ang = np.degrees(np.arccos(np.clip(cos, -1, 1)))
    concave = ((P[:, third] - P[:, a]) * n1).sum(1) > 0
    fold = np.where(concave, ang, 0.0)
    if np.percentile(fold, 50) > lim or fold.max() > lim + 30:
        side = 'L' if m['bind'][a * 3] < 0 else 'R'
        rows.append((np.percentile(fold, 50), fold.max(), side, a, b, f, g))
for p50, worst, side, a, b, f, g in sorted(rows, reverse=True):
    print(f'{side} edge {a}-{b} (source {src[a]}-{src[b]}) faces {f}/{g} concave p50 {p50:.0f} worst {worst:.0f} deg, arm {arm[a]:.2f}/{arm[b]:.2f}')
if '--src-edges' in sys.argv:
    inv = {}
    for v, s in src.items(): inv.setdefault(s, []).append(v)
    for spec in opt('--src-edges', '').split(','):
        sa, sb = map(int, spec.split('-'))
        found = [(a, b) for a in inv.get(sa, []) for b in inv.get(sb, []) if (min(a, b), max(a, b)) in E and len(E[(min(a, b), max(a, b))]) == 2]
        if not found: print(f'source edge {spec}: no edge in the rig'); continue
        a, b = found[0]; f, g = E[(min(a, b), max(a, b))]
        third = [v for v in C[g] if v not in (a, b)][0]; P = X[keep]
        n1 = np.cross(P[:, C[f][1]] - P[:, C[f][0]], P[:, C[f][2]] - P[:, C[f][0]]); n2 = np.cross(P[:, C[g][1]] - P[:, C[g][0]], P[:, C[g][2]] - P[:, C[g][0]])
        ang = np.degrees(np.arccos(np.clip((n1 * n2).sum(1) / (np.linalg.norm(n1, axis=1) * np.linalg.norm(n2, axis=1)), -1, 1)))
        fold = np.where(((P[:, third] - P[:, a]) * n1).sum(1) > 0, ang, -ang)
        print(f'source edge {spec}: concave fold p50 {np.percentile(fold,50):.0f} p95 {np.percentile(fold,95):.0f} worst {fold.max():.0f} deg (negative: convex)')
