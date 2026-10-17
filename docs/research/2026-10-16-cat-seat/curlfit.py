"""Fits the five points of the curve of T1 to the contact goals (body and posts 0.3 cm, no seat
depth) with a small change of its look, by Nelder-Mead on the model of curlopt.py. It ran as
uv run --no-project --with numpy --with scipy python -I scratch/curlfit.py."""
import json, sys, time
import numpy as np
from scipy.optimize import minimize
sys.argv = ['curlopt.py', 'TLd']
exec(open('scratch/curlopt.py').read().split("if __name__ == '__main__':")[0])
T1 = np.array([[0.06,-0.0725,-0.025],[0.135,-0.1175,0.03],[0.155,-0.1225,0.095],[0.145,-0.1175,0.16],[0.10,-0.0725,0.195]])
def cost(x):
    pts = x.reshape(5, 3)
    m = measure(pts.tolist())
    pen = 10 * max(m['body'] - 0.3, 0) + 10 * max(m['posts'] - 0.3, 0) + 10 * m['seat']
    look = 400 * ((pts - T1) ** 2).sum()
    return pen + 0.05 * m['out'] + look
t = time.time()
best = None
for start in (T1, np.array(json.loads(sys.stdin.read())) if False else T1 + [[0, 0, 0], [0.02, 0, 0.01], [0.015, 0, 0], [0.01, 0, 0], [0.01, 0, 0]]):
    r = minimize(cost, start.ravel(), method='Nelder-Mead', options={'maxfev': 500, 'xatol': 1e-4, 'fatol': 1e-3, 'initial_simplex': None})
    if best is None or r.fun < best.fun:
        best = r
pts = best.x.reshape(5, 3)
print('cost', round(best.fun, 3), 'evals', best.nfev, 'time', round(time.time() - t))
print(json.dumps(np.round(pts, 4).tolist()))
print({k: round(float(v), 2) for k, v in measure(pts.tolist()).items()})
print('T1 change', np.round(pts - T1, 4).tolist())
