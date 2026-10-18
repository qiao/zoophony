import json, sys, runpy
import numpy as np
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]]
g = runpy.run_path('py/tailapp.py', run_name='x')
P, free, closest, n = g['P'], g['free'], g['closest'], g['n']
rows = []
for q in np.unique(P[free], axis=0):
    cp = closest(q); dist = np.linalg.norm(cp - q, axis=1); k = int(np.argmin(dist))
    if (q - cp[k]) @ n[k] < 0 and dist[k] < 0.1:
        rows.append((float(dist[k]), q.round(3).tolist(), cp[k].round(3).tolist()))
rows.sort(reverse=True)
print(len(rows), 'inside corners'); [print(r) for r in rows[:6]]
