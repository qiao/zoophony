"""Checks the conditions of leg_flips() for one source edge of a step dir (steps.py).

    flip_check.py <step dir> <a> <b>
"""
import os, sys
import numpy as np
d, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
raw = np.load(os.path.join(d, '00-raw.npz'))
p, t = raw['points'], raw['tris']
bind = np.load(os.path.join(d, '02-bind_skin.npz'))['points'][:len(p)]
heads1 = np.load(os.path.join(d, 'heads-1.npz'))
def unit(v): return v / np.linalg.norm(v)
def ang(q, x, y): return np.degrees(np.arccos(np.clip(unit(x - q) @ unit(y - q), -1, 1)))
fs = [f for f in range(len(t)) if a in t[f] and b in t[f]]
f, g = fs
tf = [int(v) for v in t[f]]
m = next(v for v in tf if v not in (a, b))
n = next(int(v) for v in t[g] if v not in (a, b))
print('faces', f, t[f].tolist(), g, t[g].tolist(), 'm', m, 'n', n)
print('across in the source', round(ang(p[m], p[a], p[b]) + ang(p[n], p[a], p[b]), 1))
for v in (a, b, m, n):
    print(f'  v{v}: distance to the source knee (heads-1 shin_L) {np.linalg.norm(p[v] - heads1["shin_L"]):.3f}, leg share {raw["thigh_L"][v] + raw["shin_L"][v] + raw["foot_L"][v]:.2f}')
def gap(a0, b0, c0, d0):
    u, v, w = b0 - a0, d0 - c0, a0 - c0
    uu, uv, vv, uw, vw = u @ u, u @ v, v @ v, u @ w, v @ w
    det = uu * vv - uv * uv
    s = np.clip((uv * vw - vv * uw) / det, 0, 1) if det > 1e-18 else 0.0
    tt = np.clip((uv * s + vw) / vv, 0, 1)
    s = np.clip((uv * tt - uw) / uu, 0, 1)
    return float(np.linalg.norm(a0 + s * u - (c0 + tt * v)))
print('move of the flip (segment gap)', round(gap(p[a], p[b], p[m], p[n]), 4))
def normal(q, tri):
    c = q[tri]
    x = np.cross(c[1] - c[0], c[2] - c[0])
    return x / np.linalg.norm(x)
i = tf.index(m)
A, B = tf[(i + 1) % 3], tf[(i + 2) % 3]
new = [[m, A, n], [m, n, B]]
for name, q in (('source', p), ('bind', bind)):
    old = normal(q, t[f]) + normal(q, t[g])
    print(name, 'new faces keep the side:', [bool(normal(q, x) @ old > 0) for x in new])
faces_of = {}
for h, tri in enumerate(t):
    for k in range(3):
        faces_of.setdefault(tuple(sorted((int(tri[k]), int(tri[(k + 1) % 3])))), []).append(h)
outer = {}
for key in ((A, m), (m, B), (B, n), (n, A)):
    key = tuple(sorted(key))
    others = [h for h in faces_of.get(key, []) if h not in (f, g)]
    if len(others) == 1:
        outer[key] = t[others[0]]
def turns(q, pair):
    ns = [normal(q, x) for x in pair]
    dots = [ns[0] @ ns[1]]
    for i2, face in enumerate(pair):
        for k in range(3):
            key = tuple(sorted((int(face[k]), int(face[(k + 1) % 3]))))
            if key in outer:
                dots.append(ns[i2] @ normal(q, outer[key]))
    return np.degrees(np.arccos(np.clip(dots, -1, 1)))
before, after = turns(bind, [t[f], t[g]]), turns(bind, new)
print('bind turns before', before.round(1).tolist(), 'max', before.max().round(1), 'ss', round(float((before ** 2).sum())))
print('bind turns after ', after.round(1).tolist(), 'max', after.max().round(1), 'ss', round(float((after ** 2).sum())))
uv = raw['uvs'] if 'uvs' in raw.files else None
print('uvs saved:', uv is not None)
