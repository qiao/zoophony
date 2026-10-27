"""Lists the vertices of the front of the left knee in the stretched source with their thigh, shin,
and hips weights, and their place from the knee joint in the bind (distance r in the bend plane).

    uv run --no-project --with numpy python -I front_weights.py <steps dir>
"""
import numpy as np, sys
d = sys.argv[1]
z = np.load(f'{d}/01-source-long.npz')
p = z['points']; th = z['thigh_L']; sh = z['shin_L']; hp = z['hips']
b = np.load(f'{d}/13-knee_relax.npz')['points']
heads = np.load(f'{d}/heads-2.npz'); K = heads['shin_L']
# front of the left knee in the long source: x within 0.04 of 0.115, z > 0.02, y within 0.1 of 0.211
m = (np.abs(p[:, 0] - 0.117) < 0.035) & (p[:, 2] > 0.02) & (np.abs(p[:, 1] - 0.211) < 0.1)
idx = np.nonzero(m)[0]
idx = idx[np.argsort(p[idx, 1])]
for i in idx:
    q = b[i] - K
    print(f'v{i}: src y-knee {p[i,1]-0.211:+.3f} z {p[i,2]:.3f} x {p[i,0]:.3f} | thigh {th[i]:.2f} shin {sh[i]:.2f} hips {hp[i]:.2f} | bind fwd {q[2]:+.3f} up {q[1]:+.3f} r {np.hypot(q[1], q[2]):.3f}')
