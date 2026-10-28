"""Compares two painted weight files: for each vertex of the new file at a place of the old file,
the largest weight change. Usage: python3 wdiff.py <old.json> <new.json>"""
import json, sys
import numpy as np
a, b = (json.load(open(p)) for p in sys.argv[1:3])
pa, pb = np.asarray(a['points']), np.asarray(b['points'])
wa, wb = np.asarray(a['weights']), np.asarray(b['weights'])
assert a['bones'] == b['bones']
from scipy.spatial import cKDTree
d, k = cKDTree(pa).query(pb)
same = d < 1e-6
diff = np.abs(wb[same] - wa[k[same]]).max(axis=1)
print('new %d, old %d, at the same place %d, moved or new %d' % (len(pb), len(pa), same.sum(), (~same).sum()))
print('largest weight change of a kept vertex: %.4f, vertices over 0.01: %d, over 0.05: %d' % (diff.max(), (diff > 0.01).sum(), (diff > 0.05).sum()))
far = pb[same][diff > 0.01]
if len(far):
    print('changed vertices: x %.3f..%.3f y %.3f..%.3f z %.3f..%.3f' % (far[:,0].min(), far[:,0].max(), far[:,1].min(), far[:,1].max(), far[:,2].min(), far[:,2].max()))
ax = np.abs(far[:, 0])
print('|x| of changed vertices: min %.3f, p10 %.3f, median %.3f' % (ax.min(), np.percentile(ax, 10), np.median(ax)))
