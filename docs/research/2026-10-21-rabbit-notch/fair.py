"""Plans the fair move of the notch vertices of one side of the source trunk. Fits a quadratic
surface |x| = f(y, z) to the trunk vertices around the notch (not the run, not ring 1, not the arm)
and moves the run and ring-1 vertices that lie inside the surface out onto it, at most `cap`.
Usage: fair.py <side R|L> <radius> <cap> [out json]"""
import sys, json
import numpy as np
exec(open('scratch/src.py').read())
side, radius, cap = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
rings = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--rings=')), 1))
wide = '--wide' in sys.argv
factor = float(next((a.split('=')[1] for a in sys.argv if a.startswith('--factor=')), 1))
sys.argv = [a for a in sys.argv if not a.startswith('--')]
sign = -1.0 if side == 'R' else 1.0
runs = {'R': ([1020, 1025, 1008, 1012, 1011, 1018, 984, 982], [975, 981, 1073, 1019, 1068, 1006, 1007, 1015, 1003]),
        'L': ([934, 905, 938, 891, 939, 941, 902, 961, 958, 956, 953, 949], [952, 955, 912, 907, 903, 889, 890, 904, 909])}
body, armrun = runs[side]
X = V * [sign, 1, 1]
nb = [set() for _ in V]
for a, b, c in T:
    nb[a] |= {b, c}; nb[b] |= {a, c}; nb[c] |= {a, b}
arm = X[:, 0] > 0.106
ring = set(body)
for _ in range(rings):
    ring |= {n for v in ring for n in nb[v] if not arm[n]}
ring -= set(armrun)
fixed = set(ring)
for v in list(ring):
    fixed |= {n for n in nb[v] if not arm[n]}
center = X[body].mean(0)
dist = np.linalg.norm((X - center)[:, 1:], axis=1)
fitv = [v for v in range(len(V)) if dist[v] < radius and v not in (fixed if wide else ring) and not arm[v] and X[v, 0] > 0.04]
A = lambda P: np.stack([np.ones(len(P)), P[:, 1], P[:, 2], P[:, 1] ** 2, P[:, 1] * P[:, 2], P[:, 2] ** 2], 1)
coef, *_ = np.linalg.lstsq(A(X[fitv]), X[fitv, 0], rcond=None)
res = X[fitv, 0] - A(X[fitv]) @ coef
print(f'{side}: fit on {len(fitv)} vertices, residual rms {np.sqrt((res**2).mean()):.4f} u, ring {len(ring)} vertices')
moves = {}
for v in sorted(ring):
    target = min(float((A(X[[v]]) @ coef)[0]), 0.104)
    out = target - X[v, 0]
    if out > 0:
        out = min(out, cap) * factor
        moves[v] = out
    print(f'  v{v} {"run " if v in body else "ring"} x {X[v,0]:.4f} y {X[v,1]:.4f} z {X[v,2]:.4f} surface {float((A(X[[v]]) @ coef)[0]):.4f} move {max(0,out):.4f} u ({max(0,out)*1.4678*100:.2f} cm)')
print(f'moved {len(moves)}, largest {max(moves.values(), default=0):.4f} u')
if len(sys.argv) > 4:
    json.dump({str(v): [sign * m, 0, 0] for v, m in moves.items()}, open(sys.argv[4], 'w'))
