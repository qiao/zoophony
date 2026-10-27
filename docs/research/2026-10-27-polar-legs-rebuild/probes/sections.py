import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from knee_cut import loops
d = np.load('src-arms.npz'); p, t = d['points'], d['tris']
for y in np.arange(0.06, 0.26, 0.01):
    Ls = [L for L in loops(p, t, np.array([0, y, 0]), np.array([0, 1.0, 0])) if len(L) > 5]
    out = []
    for L in Ls:
        c = L.mean(axis=0)
        if c[0] < 0: continue
        r = np.linalg.norm((L - c)[:, [0, 2]], axis=1)
        out.append(f'c ({c[0]:.3f},{c[2]:.3f}) r {r.mean():.3f} w {np.ptp(L[:,0]):.3f} d {np.ptp(L[:,2]):.3f} z [{L[:,2].min():.3f},{L[:,2].max():.3f}] n {len(L)}')
    print(f'y {y:.2f}: ' + ' | '.join(out))
# leg faces: count faces with mid x>0.02 and y < 0.2
m = p[t].mean(axis=1)
print('left faces below 0.195:', ((m[:,0] > 0.0) & (m[:,1] < 0.195) & (m[:,1] > 0.075)).sum())
