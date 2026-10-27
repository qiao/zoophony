"""The plane cuts of a mesh for knee_shape.py and side_cmp.py."""
import numpy as np
from collections import defaultdict

def unit(v):
    return v / np.linalg.norm(v)


def loops(p, t, origin, normal):
    """Cuts the mesh with a plane and gives the closed outlines as lists of points."""
    dist = (p - origin) @ normal
    node = {}
    pts = []
    adj = defaultdict(list)

    def key(a, b):
        k = (min(a, b), max(a, b))
        if k not in node:
            s = dist[a] / (dist[a] - dist[b])
            node[k] = len(pts)
            pts.append(p[a] + s * (p[b] - p[a]))
        return node[k]
    for tri in t:
        dd = dist[tri]
        if (dd > 0).all() or (dd <= 0).all():
            continue
        ends = []
        for k in range(3):
            a, b = tri[k], tri[(k + 1) % 3]
            if (dist[a] > 0) != (dist[b] > 0):
                ends.append(key(a, b))
        if len(ends) == 2:
            adj[ends[0]].append(ends[1])
            adj[ends[1]].append(ends[0])
    seen = set()
    out = []
    for start in list(adj):
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        while True:
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur)
            loop.append(cur)
        out.append(np.array([pts[i] for i in loop]))
    return out


