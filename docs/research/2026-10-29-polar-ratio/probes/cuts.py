import numpy as np


def weld(tris_xyz, step=1e-5):
    flat = tris_xyz.reshape(-1, 3)
    keys = np.round(flat / step).astype(np.int64)
    uniq, inv = np.unique(keys, axis=0, return_inverse=True)
    pts = np.zeros((len(uniq), 3))
    pts[inv.ravel()] = flat
    return pts, inv.reshape(-1, 3)


def section(P, T, origin, normal, side, near=None):
    """The loop of the cut of the mesh by a plane around a point: width along side, depth, mean
    diameter. near limits the loop to points within that distance of the origin."""
    n = normal / np.linalg.norm(normal)
    s = side - np.dot(side, n) * n
    s /= np.linalg.norm(s)
    f = np.cross(n, s)
    d = (P - origin) @ n
    segs = []
    keys = []
    for t in T:
        dd = d[t]
        pts, ks = [], []
        for a, b in ((0, 1), (1, 2), (2, 0)):
            if (dd[a] > 0) != (dd[b] > 0):
                u = dd[a] / (dd[a] - dd[b])
                pts.append(P[t[a]] + u * (P[t[b]] - P[t[a]]))
                ks.append((min(t[a], t[b]), max(t[a], t[b])))
        if len(pts) == 2:
            segs.append(pts)
            keys.append(ks)
    if not segs:
        return None
    # Connected components by shared edge keys.
    parent = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for ks in keys:
        parent[find(ks[0])] = find(ks[1])
    groups = {}
    for i, ks in enumerate(keys):
        groups.setdefault(find(ks[0]), []).append(i)
    best = None
    for idx in groups.values():
        q = np.array([[segs[i][0], segs[i][1]] for i in idx])  # m x 2 x 3
        q2 = np.stack([(q - origin) @ s, (q - origin) @ f], axis=-1)  # m x 2 x 2
        # Point in polygon by the crossings of a ray along +s from the origin.
        c = 0
        for (a, b) in q2:
            if (a[1] > 0) != (b[1] > 0):
                x = a[0] + (0 - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
                if x > 0:
                    c += 1
        dist = np.min(np.linalg.norm(q2.reshape(-1, 2), axis=1))
        score = (0 if c % 2 == 1 else 1, dist)
        if best is None or score < best[0]:
            best = (score, q, q2)
    _, q, q2 = best
    flat = q2.reshape(-1, 2)
    per = float(np.sum(np.linalg.norm(q[:, 0] - q[:, 1], axis=1)))
    return {'width': float(np.ptp(flat[:, 0])), 'depth': float(np.ptp(flat[:, 1])),
            'diam': per / np.pi}


