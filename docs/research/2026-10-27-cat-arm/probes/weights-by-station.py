"""Prints the mean weights of the arm vertices of cat-weights.json by station along the left arm.
An arm vertex has more than `min` of its weight on the arm bones from the upper arm out.

    python3 scratch/weights-by-station.py [min] [step]
"""
import json
import math
import sys

lo = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
step = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1
d = json.load(open('assets/models/cat/cat-weights.json'))
B, P, W = d['bones'], d['points'], d['weights']
c = json.load(open('tools/mesh-rigs/cat.json'))['joints']
S, E, Wr = c['upper_arm_L']['head'], c['forearm_L']['head'], c['hand_L']['head']
sub = lambda a, b: [x - y for x, y in zip(a, b)]
dot = lambda a, b: sum(x * y for x, y in zip(a, b))
u, f = sub(E, S), sub(Wr, E)
arm = [i for i, b in enumerate(B) if b.endswith('_L') and (b.startswith(('upper_arm', 'forearm', 'elbow', 'wrist', 'hand', 'fingers')))]
tot = {}
for p, w in zip(P, W):
    if p[0] < 0.02 or sum(w[i] for i in arm) < lo:
        continue
    tu = dot(sub(p, S), u) / dot(u, u)
    tf = dot(sub(p, E), f) / dot(f, f)
    k = ('u', round(tu / step) * step) if tu < 1 else ('f', round(tf / step) * step)
    if k[0] == 'f' and k[1] > 1.1:
        continue
    t = tot.setdefault(k, [0.0] * (len(B) + 1))
    for i, x in enumerate(w):
        t[i] += x
    t[-1] += 1
order = sorted(tot, key=lambda k: (k[0] == 'f', k[1]))
for k in order:
    t = tot[k]
    n = t[-1]
    cells = {B[i].replace('_L', '').replace('upper_arm_', 'u').replace('forearm_', 'f'): round(t[i] / n, 2)
             for i in range(len(B)) if t[i] / n > 0.005}
    print(f'{k[0]}{k[1]:.2f} n={n:3.0f}', cells)
