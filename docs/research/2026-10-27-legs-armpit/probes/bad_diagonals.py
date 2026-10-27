"""Lists the bad diagonals of the left leg in the source before the rings (00-raw.npz of
steps.py): each inner edge whose two opposite corner angles sum to more than <least> degrees.
The flip to the other diagonal of the quad gives fatter faces. The place is in the frame of the
source knee (y of the knee in the long source, 0.201): dy up, z forward.

    bad_diagonals.py <step dir> [least] [knee y]
"""
import os
import sys

import numpy as np

d = sys.argv[1]
least = float(sys.argv[2]) if len(sys.argv) > 2 else 180.0
knee_y = float(sys.argv[3]) if len(sys.argv) > 3 else 0.201
raw = np.load(os.path.join(d, '00-raw.npz'))
p, t = raw['points'], raw['tris']
import glob
last = np.load(sorted(glob.glob(os.path.join(d, os.environ.get('STEP', '02') + '*.npz')))[0])['points'][:len(p)]


def bend(q, a, b, m, n):
    """Gives the signed turn of the quad along the diagonal a-b in the points q: above 0 for a
    ridge, below 0 for a valley. The face (m, a, b) has the order of its corners in the mesh."""
    n1 = np.cross(q[a] - q[m], q[b] - q[m])
    n1 /= np.linalg.norm(n1)
    n2 = np.cross(q[b] - q[n], q[a] - q[n])
    n2 /= np.linalg.norm(n2)
    ang = np.degrees(np.arccos(np.clip(n1 @ n2, -1, 1)))
    return ang if (q[n] - q[a]) @ n1 < 0 else -ang
leg = raw['thigh_L'] + raw['shin_L'] + raw['foot_L']


def angle(at, a, b):
    u, v = p[a] - p[at], p[b] - p[at]
    return np.degrees(np.arccos(np.clip(u @ v / np.linalg.norm(u) / np.linalg.norm(v), -1, 1)))


def normal(f):
    c = p[t[f]]
    n = np.cross(c[1] - c[0], c[2] - c[0])
    return n / np.linalg.norm(n)


faces_of = {}
for f, tri in enumerate(t):
    for k in range(3):
        key = tuple(sorted((int(tri[k]), int(tri[(k + 1) % 3]))))
        faces_of.setdefault(key, []).append(f)
rows = []
for (a, b), fs in faces_of.items():
    if len(fs) != 2 or p[a][0] <= 0.03 or leg[a] < 0.5 or leg[b] < 0.5:
        continue
    m = [int(v) for v in t[fs[0]] if v not in (a, b)][0]
    n = [int(v) for v in t[fs[1]] if v not in (a, b)][0]
    tri = [int(v) for v in t[fs[0]]]
    k = tri.index(m)
    a, b = tri[(k + 1) % 3], tri[(k + 2) % 3]
    s = angle(m, a, b) + angle(n, a, b)
    if s < least:
        continue
    turn = np.degrees(np.arccos(np.clip(normal(fs[0]) @ normal(fs[1]), -1, 1)))
    # The gap between the two diagonals: the move of the surface by a flip.
    u, v = p[b] - p[a], p[n] - p[m]
    w = np.cross(u, v)
    gap = abs((p[m] - p[a]) @ w) / max(np.linalg.norm(w), 1e-12)
    mid = (p[a] + p[b]) / 2
    rows.append((s, a, b, m, n, np.linalg.norm(u), np.linalg.norm(v), turn, gap, mid[1] - knee_y, mid[2], mid[0],
                 bend(p, a, b, m, n), bend(last, a, b, m, n), bend(last, m, n, b, a)))
rows.sort(key=lambda r: -r[0])
print(f'left leg edges with opposite angles above {least}: {len(rows)}')
print('  sum  edge        other       long  short   gap     dy      z      x  src   bind  flipped')
for r in rows:
    print(f'{r[0]:5.1f} {r[1]:4d}-{r[2]:<5d} {r[3]:4d}-{r[4]:<5d} {r[5]:.3f} {r[6]:.3f} {r[8]:.4f} {r[9]:6.3f} {r[10]:6.3f} {r[11]:6.3f} {r[12]:6.1f} {r[13]:6.1f} {r[14]:6.1f}')
