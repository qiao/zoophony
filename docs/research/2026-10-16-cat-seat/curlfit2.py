"""The fit of curlfit.py with the side view gap of gap2.py in the cost, on the model of
curlopt.py. The model of the gap did not hold (it gave 0.12 cm for a curve that gave 3.65 cm in
Blender), so the start points came from Blender runs (rig.sh TLp1 to TLr4)."""
import json, sys, time
import numpy as np
from scipy.optimize import minimize
sys.argv = ['curlopt.py', 'TLd']
exec(open('scratch/curlopt.py').read().split("if __name__ == '__main__':")[0])
base_pts = cfg['studio']['tailCurl']['points']
curl0 = curl(base_pts)
fixed = [B.index(nm) for nm in B if nm.rsplit('_', 1)[0] in ('shin', 'foot', 'toes', 'upper_arm', 'forearm', 'forearm_twist', 'hand', 'fingers')]
free = w[:, fixed].sum(1)
xs = np.arange(-0.17, 0.17 + 0.0025, 0.005); zs = np.arange(-0.087, 0.05 + 0.0025, 0.005)
def side_gap(points):
    bind = final + (curl(points) - curl0)
    low = bind[:, 1] <= top + 0.4
    faces = tris[((free[tris] <= 0.5) & low[tris]).all(axis=1)]
    # Only the faces near the back of the seat matter.
    faces = faces[(bind[faces][:, :, 2].min(1) < 0.06) & (np.abs(bind[faces][:, :, 0]).min(1) < 0.17)]
    gaps = g['column_bottoms'](bind, faces, xs, zs) - top
    side = np.where(np.isfinite(gaps), gaps, np.inf).min(axis=0)
    hit = np.nonzero(np.isfinite(side))[0]
    keep = (zs >= zs[hit[0]] + 0.0065) & np.isfinite(side)
    return float(side[keep].max()) * M
T1 = np.array([[0.06,-0.0725,-0.025],[0.135,-0.1175,0.03],[0.155,-0.1225,0.095],[0.145,-0.1175,0.16],[0.10,-0.0725,0.195]])
def cost(x):
    pts = x.reshape(5, 3)
    m = measure(pts.tolist())
    gap = side_gap(pts.tolist())
    pen = 10 * max(m['body'] - 0.3, 0) + 10 * max(m['posts'] - 0.3, 0) + 10 * m['seat'] + 3 * max(gap - 1.8, 0)
    return pen + 0.05 * m['out'] + 400 * ((pts - T1) ** 2).sum()
start = np.array([[0.0539, -0.0768, -0.023], [0.145, -0.1204, 0.03], [0.1774, -0.1222, 0.0983], [0.1498, -0.1176, 0.1542], [0.0987, -0.0717, 0.1896]])
print('start gap', round(side_gap(start.tolist()), 2), 'TLd gap', round(side_gap(base_pts), 2))
t = time.time()
r = minimize(cost, start.ravel(), method='Nelder-Mead', options={'maxfev': 400, 'xatol': 1e-4, 'fatol': 1e-3})
pts = r.x.reshape(5, 3)
print('cost', round(r.fun, 3), 'evals', r.nfev, 'time', round(time.time() - t))
print(json.dumps(np.round(pts, 4).tolist()))
print({k: round(float(v), 2) for k, v in measure(pts.tolist()).items()}, 'gap', round(side_gap(pts.tolist()), 2))
