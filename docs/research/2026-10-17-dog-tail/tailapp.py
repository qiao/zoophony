"""Measures the seated tail of the dog in the app (bind pose of the player, meters): tail corners
(main bone tail1 or tail2) into the seat, outside the seat from above, into the back posts and
the rail, the lowest point above the floor, and into the body (the faces whose corners have no
tail, arm, or leg main bone; the sign of the nearest face)."""
import json, sys
import numpy as np
d = json.load(open(sys.argv[1]))
P = np.array(d['positions']).reshape(-1, 3)
bones = np.array(d['bones'])
tail = np.isin(bones, ['tail1', 'tail2'])
bw = np.array(d['blendWeights'])
share = np.where(tail, 1 - bw, 0) + np.where(np.isin(np.array(d['blendBones']), ['tail1', 'tail2']), bw, 0)
free = share > 0.95
s = d['seat']
hw, z0, z1, top = s['width'] / 2, s['center'] - s['depth'] / 2, s['center'] + s['depth'] / 2, s['top']
p = P[tail]
over = np.maximum.reduce([np.abs(p[:, 0]) - hw, z0 - p[:, 2], p[:, 2] - z1])
on = over <= 0
into_seat = max((top - p[on, 1]).max(initial=-1), 0)
outside = max(over.max(), 0)
post = 0.0
for box in d['back']:
    lo, hi = np.array(box['min']), np.array(box['max'])
    inside = np.all((p > lo) & (p < hi), axis=1)
    if inside.any():
        dep = np.minimum(p[inside] - lo, hi - p[inside]).min(axis=1).max()
        post = max(post, float(dep))
lowest = p[:, 1].min()
# Body faces: each corner has a trunk, head, or neck main bone.
keep = ['hips', 'spine', 'chest', 'neck', 'head', 'jaw']
tri = P.reshape(-1, 3, 3)
tb = bones.reshape(-1, 3)
faces = tri[np.all(np.isin(tb, keep), axis=1)]
a, b, c = faces[:, 0], faces[:, 1], faces[:, 2]
n = np.cross(b - a, c - a); n /= np.linalg.norm(n, axis=1)[:, None] + 1e-12
def closest(q):
    ab, ac, ap = b - a, c - a, q - a
    d1, d2 = (ab * ap).sum(1), (ac * ap).sum(1)
    bp = q - b; d3, d4 = (ab * bp).sum(1), (ac * bp).sum(1)
    cp = q - c; d5, d6 = (ab * cp).sum(1), (ac * cp).sum(1)
    va = d3 * d6 - d5 * d4; vb = d5 * d2 - d1 * d6; vc = d1 * d4 - d3 * d2
    den = va + vb + vc
    sd = np.where(np.abs(den) > 1e-18, den, 1)
    v = np.where(np.abs(den) > 1e-18, vb / sd, 0); w = np.where(np.abs(den) > 1e-18, vc / sd, 0)
    out = a + ab * v[:, None] + ac * w[:, None]
    def edge(p0, e, t): return p0 + e * np.clip(t, 0, 1)[:, None]
    m = (d1 <= 0) & (d2 <= 0); out[m] = a[m]
    m = (d3 >= 0) & (d4 <= d3); out[m] = b[m]
    m = (d6 >= 0) & (d5 <= d6); out[m] = c[m]
    m = (vc <= 0) & (d1 >= 0) & (d3 <= 0); out[m] = edge(a, ab, d1 / np.where(d1 - d3 != 0, d1 - d3, 1))[m]
    m = (vb <= 0) & (d2 >= 0) & (d6 <= 0); out[m] = edge(a, ac, d2 / np.where(d2 - d6 != 0, d2 - d6, 1))[m]
    m = (va <= 0) & ((d4 - d3) >= 0) & ((d5 - d6) >= 0)
    t = (d4 - d3) / np.where((d4 - d3) + (d5 - d6) != 0, (d4 - d3) + (d5 - d6), 1)
    out[m] = edge(b, c - b, t)[m]
    return out
deep = 0.0
for q in np.unique(P[free], axis=0):
    cp = closest(q)
    dist = np.linalg.norm(cp - q, axis=1)
    k = int(np.argmin(dist))
    if (q - cp[k]) @ n[k] < 0 and dist[k] < 0.1:
        deep = max(deep, float(dist[k]))
print(f'{sys.argv[2]}: into the seat {into_seat*100:.1f} cm, outside the seat from above {outside*100:.1f} cm, '
      f'into the back posts and the rail {post*100:.1f} cm, lowest point {lowest*100:.1f} cm above the floor, '
      f'into the body {deep*100:.1f} cm (seat top {top*100:.1f} cm, {tail.sum()} tail corners, {free.sum()} with a tail share above 0.95, the body depth of these)')
# The outline of the tail (main bone tail1 or tail2) in bands of 5 cm of height: the width (x) seen
# from the back and the depth (z) seen from the side, in cm.
ys = p[:, 1]
rows = []
for lo in np.arange(np.floor(ys.min() * 20) / 20, ys.max(), 0.05):
    band = p[(ys >= lo) & (ys < lo + 0.05)]
    if len(band) == 0:
        continue
    rows.append(f'{lo*100:.0f}-{(lo+0.05)*100:.0f}: w {(band[:,0].max()-band[:,0].min())*100:.1f} x {band[:,0].min()*100:.0f}..{band[:,0].max()*100:.0f}, d {(band[:,2].max()-band[:,2].min())*100:.1f}')
print('  outline (height cm: width cm from the back, x range, depth cm from the side): ' + '; '.join(rows))
