"""Cross-sections of a posed OBJ near the elbow. Usage: sections.py <obj> <joints json [s,e,w]> <out.png> <title>"""
import json, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

obj, joints, out, title = sys.argv[1:5]
mark = set(int(x) for x in sys.argv[5].split(',')) if len(sys.argv) > 5 else set()
V = []; F = []
for line in open(obj):
    if line.startswith('v '):
        V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('f '):
        F.append([int(x) - 1 for x in line.split()[1:4]])
V = np.array(V); F = np.array(F)
s, e, w = (np.array(p) for p in json.loads(joints))
ua = (e - s) / np.linalg.norm(e - s); fa = (w - e) / np.linalg.norm(w - e)
bis = ua + fa; bis /= np.linalg.norm(bis)
bend_n = np.cross(ua, fa); bend_n /= np.linalg.norm(bend_n)

def section(point, normal, reach):
    d = (V - point) @ normal
    segs = []
    for fi, tri in enumerate(F):
        dd = d[tri]
        pts = []
        for a in range(3):
            b = (a + 1) % 3
            if dd[a] * dd[b] < 0:
                t = dd[a] / (dd[a] - dd[b])
                pts.append(V[tri[a]] + t * (V[tri[b]] - V[tri[a]]))
        if len(pts) == 2 and np.linalg.norm((pts[0] + pts[1]) / 2 - point) < reach:
            segs.append(pts + [fi in mark])
    return segs

L = np.linalg.norm(e - s)
planes = [('upper 0.6', s + 0.6 * (e - s), ua), ('upper 0.7', s + 0.7 * (e - s), ua), ('upper 0.8', s + 0.8 * (e - s), ua),
          ('upper 0.9', s + 0.9 * (e - s), ua), ('elbow bisector', e, bis),
          ('fore 0.1', e + 0.1 * L * fa, fa), ('fore 0.25', e + 0.25 * L * fa, fa)]
fig, axes = plt.subplots(1, len(planes), figsize=(3.2 * len(planes), 3.4))
for ax, (name, p, n) in zip(axes, planes):
    # In-plane axes: x along the bend normal, y along the outer elbow direction.
    x = bend_n - (bend_n @ n) * n; x /= np.linalg.norm(x)
    y = np.cross(n, x)
    for a, b, red in section(p, n, 0.09):
        ax.plot([(a - p) @ x, (b - p) @ x], [(a - p) @ y, (b - p) @ y], 'r-' if red else 'k-', lw=2 if red else 1)
    ax.plot(0, 0, 'r+')
    ax.set_aspect('equal'); ax.set_xlim(-0.07, 0.07); ax.set_ylim(-0.07, 0.07)
    ax.set_title(name, fontsize=9)
fig.suptitle(title + ' (m; x = bend normal, red + = joint axis)', fontsize=9)
fig.tight_layout(); fig.savefig(out, dpi=90)
