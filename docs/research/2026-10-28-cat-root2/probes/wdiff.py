# wdiff.py <a.json> <b.json>: pairs the vertices by the nearest bind place and lists the largest weight changes and moves.
import json, sys
import numpy as np
from scipy.spatial import cKDTree
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
pa = np.array([x[:3] for x in a]); pb = np.array([x[:3] for x in b])
d, k = cKDTree(pa).query(pb)
rows = []
for i, (dist, j) in enumerate(zip(d, k)):
    wa, wb = a[j][3], b[i][3]
    names = set(wa) | set(wb)
    dw = sum(abs(wa.get(n, 0) - wb.get(n, 0)) for n in names) / 2
    rows.append((dw, dist * 1000, i, pb[i]))
rows.sort(key=lambda r: -r[0])
print('vertices', len(pb), 'moved over 0.5 mm', int((d > 0.0005).sum()), 'weight change over 0.05', sum(r[0] > 0.05 for r in rows))
for r in rows[:25]:
    print('dw %.3f move %.1f mm v%d at %s' % (r[0], r[1], r[2], ','.join('%.4f' % x for x in r[3])))
