# pdiff.py <main weights json> <try weights json>: compares the painted weights at the same places.
import json, sys
import numpy as np
from scipy.spatial import cKDTree
A, B = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
assert A['bones'] == B['bones']
pa, pb = np.array(A['points']), np.array(B['points'])
wa, wb = np.array(A['weights']), np.array(B['weights'])
d, k = cKDTree(pa).query(pb)
same = d < 1e-6
print('points', len(pa), len(pb), 'try points at a main place', int(same.sum()))
dw = np.abs(wa[k] - wb).sum(axis=1) / 2
order = np.argsort(-dw * same)
print('changed over 0.02 (same place):', int(((dw > 0.02) & same).sum()), 'largest', round(float((dw * same).max()), 3))
bones = A['bones']
for i in order[:12]:
    if not same[i]: continue
    top = lambda w: ', '.join(f'{bones[j]} {w[j]:.2f}' for j in np.argsort(-w)[:4] if w[j] > 0.005)
    print(f'{dw[i]:.3f} at {pb[i].round(4).tolist()}: main {top(wa[k[i]])} | try {top(wb[i])}')
