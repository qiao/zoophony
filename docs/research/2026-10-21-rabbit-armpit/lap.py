"""Prints, for vertices near a point, the umbrella offset (vertex minus mean of its neighbors)
along the vertex normal, in the bind and the posed mesh, in mm. Negative is a dent (inward).
Usage: lap.py <json> <x,y,z> <radius m>"""
import json, sys
import numpy as np
m = json.load(open(sys.argv[1])); B = json.load(open('scratch/bones.json'))
c = np.array([float(x) for x in sys.argv[2].split(',')]); rad = float(sys.argv[3])
C = np.array(m['corners']).reshape(-1, 3); J = np.array(m['joints']).reshape(-1, 4); Wt = np.array(m['weights']).reshape(-1, 4)
def weld(P):
    keys = {}
    rep = np.array([keys.setdefault(tuple(np.round(p, 6)), i) for i, p in enumerate(P)])
    return rep
out = {}
for name in ('bind', 'posed'):
    P = np.array(m[name]).reshape(-1, 3)
    rep = weld(np.array(m['bind']).reshape(-1, 3))
    T = rep[C]
    nb = {}
    vn = np.zeros_like(P)
    for t, (a, b, cc) in zip(C, T):
        n = np.cross(P[t[1]] - P[t[0]], P[t[2]] - P[t[0]])
        for v in (a, b, cc): vn[v] += n
        for x, y in ((a, b), (b, cc), (cc, a)):
            nb.setdefault(x, set()).add(y); nb.setdefault(y, set()).add(x)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
    out[name] = {v: float((P[v] - P[list(s)].mean(0)) @ vn[v]) * 1000 for v, s in nb.items()}
bind = np.array(m['bind']).reshape(-1, 3)
near = [v for v in out['bind'] if np.linalg.norm(bind[v] - c) < rad]
near.sort(key=lambda v: out['posed'][v])
for v in near:
    ws = ' '.join(f'{B[j]} {w:.2f}' for j, w in zip(J[v], Wt[v]) if w > 0.01)
    print(f'v{v} bind {bind[v].round(3)} dent bind {out["bind"][v]:7.1f} posed {out["posed"][v]:7.1f} mm  {ws}')
