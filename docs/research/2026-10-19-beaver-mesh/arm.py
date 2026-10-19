"""Measures the left arm of the beaver mesh: the free arm beyond each plane x = split, its main
direction, and the middle of the cuts across that direction, in the units of the studio.

    uv run --no-project --with numpy python -I arm.py <mesh.npz>

The free arm is the part beyond the plane that holds the lowest claw tip. The cuts across the
main direction give the middle line of the arm from the shoulder to the paw.
"""
import sys

import numpy as np

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
claws = v[(v[:, 0] > 0.25) & (v[:, 1] > 0.3) & (v[:, 1] < 0.45) & (v[:, 2] > 0.15)]
tip = claws[np.argmin(claws[:, 1])]
print('lowest claw tip', tip.round(4))


def part(split):
    """Gives the vertices beyond x = split that connect to the claw tip."""
    inside = v[:, 0] > split
    nb = [[] for _ in range(len(v))]
    for t in tris:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            if inside[a] and inside[b]:
                nb[a].append(b)
                nb[b].append(a)
    start = int(np.argmin(np.linalg.norm(v - tip, axis=1)))
    seen = {start}
    stack = [start]
    while stack:
        for n in nb[stack.pop()]:
            if n not in seen:
                seen.add(n)
                stack.append(n)
    return np.array(sorted(seen))


for split in (0.16, 0.17, 0.18, 0.185, 0.19, 0.2):
    p = v[part(split)]
    print(f'split {split}: {len(p)} vertices, y {p[:, 1].min():.3f}..{p[:, 1].max():.3f}, '
          f'z {p[:, 2].min():+.3f}..{p[:, 2].max():+.3f}, x max {p[:, 0].max():.3f}')

free = v[part(0.19)]
mid = free.mean(0)
_, s, vt = np.linalg.svd(free - mid)
axis = vt[0] if vt[0][1] < 0 else -vt[0]
print(f'free arm (split 0.19): middle {mid.round(4)}, main direction down the arm {axis.round(3)}, '
      f'spread {s.round(3)}')


def cut(point, normal):
    """Gives the points of the cut of the mesh by the plane through a point with a normal, for the
    loop nearest to the point."""
    d = (v - point) @ normal
    points, parent = {}, {}

    def root(k):
        while parent[k] != k:
            k = parent[k]
        return k

    for t in tris:
        keys = []
        for i in range(3):
            a, b = t[i], t[(i + 1) % 3]
            if (d[a] < 0) != (d[b] < 0):
                key = (min(a, b), max(a, b))
                points[key] = v[a] + (v[b] - v[a]) * (d[a] / (d[a] - d[b]))
                parent.setdefault(key, key)
                keys.append(key)
        if len(keys) == 2:
            parent[root(keys[1])] = root(keys[0])
    loops = {}
    for key, p in points.items():
        loops.setdefault(root(key), []).append(p)
    loops = [np.array(g) for g in loops.values() if len(g) >= 4]
    return min(loops, key=lambda g: np.linalg.norm(g.mean(0) - point)) if loops else None


print('cuts across the main direction, along the line through the middle of the free arm')
for t in np.arange(-0.16, 0.12, 0.01):
    point = mid + axis * t
    g = cut(point, axis)
    if g is None:
        continue
    c = (g.min(0) + g.max(0)) / 2
    width = np.ptp(g - c, axis=0)
    print(f'  t {t:+.2f}: middle {c.round(4)}, {len(g)} points, box {width.round(3)}')
