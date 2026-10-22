"""src_of.py <corners.json> <src.npz> <faces...>: the source vertices of module faces."""
import json, sys
import numpy as np
from scipy.spatial import cKDTree
c = json.load(open(sys.argv[1])); v = np.load(sys.argv[2])['v']; t = cKDTree(v)
for f in map(int, sys.argv[3:]):
    s = c[f]['s'] if isinstance(c[f], dict) else c[f]
    out = []
    for p in s:
        d, i = t.query(p)
        out.append(f'{i}' + ('' if d < 1e-4 else f'(new {np.round(p,3).tolist()})') + f' {np.round(v[i],3).tolist()}')
    print(f, ' | '.join(out))
