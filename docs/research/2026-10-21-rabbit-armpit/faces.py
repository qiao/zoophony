"""Prints facts of faces of an id probe: bind middle, weights, the turn of the normal, pixels."""
import json, sys
import numpy as np
pre = sys.argv[1]
faces = [int(x) for x in sys.argv[2].split(',')]
m = json.load(open(pre + '.json'))
B = json.load(open('scratch/bones.json'))
bind = np.array(m['bind']).reshape(-1, 3); posed = np.array(m['posed']).reshape(-1, 3)
C = np.array(m['corners']).reshape(-1, 3); J = np.array(m['joints']).reshape(-1, 4); Wt = np.array(m['weights']).reshape(-1, 4)
caps = set(m['caps'])
def normal(P, f):
    a, b, c = P[C[f]]; n = np.cross(b - a, c - a); return n / (np.linalg.norm(n) + 1e-12), np.linalg.norm(np.cross(b - a, c - a)) / 2
for f in faces:
    nb, ab = normal(bind, f); npz, ap = normal(posed, f)
    turn = np.degrees(np.arccos(np.clip(nb @ npz, -1, 1)))
    ws = []
    for v in C[f]:
        ws.append(f'v{v}:' + ' '.join(f'{B[j]} {w:.2f}' for j, w in zip(J[v], Wt[v]) if w > 0.01))
    print(f'face {f} cap={f in caps} px={m["pixels"].get(str(f), 0)} front={m["front"][f]} mid={bind[C[f]].mean(0).round(3)} '
          f'nbind={nb.round(2)} nposed={npz.round(2)} turn={turn:.0f} area {ab*1e4:.1f}->{ap*1e4:.1f} cm2')
    for w in ws: print('    ', w)
