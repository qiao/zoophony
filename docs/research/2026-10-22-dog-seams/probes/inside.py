"""inside.py <dump.json> <pose>: arm vertices inside the trunk (winding number of the non-arm
faces), with the depth to the nearest trunk face, and whether that face is a cap."""
import json, sys
import numpy as np
m = json.load(open(sys.argv[1]))
P = np.array(m['bind'] if sys.argv[2] == 'bind' else m['poses'][sys.argv[2]]).reshape(-1, 3)
C = np.array(m['corners']).reshape(-1, 3)
arm = np.array(m['arm'])
caps = set(m['caps'])
body = np.array([k for k, t in enumerate(C) if (arm[t] < 0.5).all()])
T = P[C[body]]
def winding(q):
    a, b, c = T[:, 0] - q, T[:, 1] - q, T[:, 2] - q
    la, lb, lc = (np.linalg.norm(x, axis=1) for x in (a, b, c))
    det = np.einsum('ij,ij->i', a, np.cross(b, c))
    den = la * lb * lc + np.einsum('ij,ij->i', a, b) * lc + np.einsum('ij,ij->i', b, c) * la + np.einsum('ij,ij->i', c, a) * lb
    return np.arctan2(det, den).sum() / (2 * np.pi)
def nearest(q):
    best, which = 1e9, -1
    for k, (a, b, c) in enumerate(T):
        # Distance to triangle: sample barycentric grid (coarse but fine for a probe).
        pass
    return best, which
def tri_dist(q, a, b, c):
    ab, ac, ap = b - a, c - a, q - a
    n = np.cross(ab, ac); n /= np.linalg.norm(n) + 1e-12
    p = q - n * ((q - a) @ n)
    v0, v1, v2 = ab, ac, p - a
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    if den == 0: return 1e9
    v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den
    if v >= 0 and w >= 0 and v + w <= 1: return float(np.linalg.norm(q - p))
    def seg(x, y):
        t = np.clip((q - x) @ (y - x) / ((y - x) @ (y - x)), 0, 1); return float(np.linalg.norm(q - (x + t * (y - x))))
    return min(seg(a, b), seg(b, c), seg(c, a))
rows = []
for v in np.nonzero(arm > 0.5)[0]:
    q = P[v]
    if winding(q) > 0.5:
        ds = [tri_dist(q, *t) for t in T]
        k = int(np.argmin(ds))
        rows.append((ds[k], int(v), int(body[k]), int(body[k]) in caps, q.round(3).tolist()))
rows.sort(reverse=True)
print(f'{len(rows)} arm vertices inside the trunk ({len(caps)} cap faces)')
for d, v, f, cap, q in rows[:15]:
    print(f'vertex {v}: depth {d*100:.1f} cm, nearest face {f} cap={cap}, at {q}')
