"""Fits the curve of the seated tail (T1) in numpy: the tail of the final bind is the curl of the
pre-curl bind plus the mean move of the later steps (from a Blender run). Measures the depth into
the body (the final bind of the run), the posts, and the seat, and the reach outside the seat."""
import sys, types, json
import numpy as np
for name in ('bpy', 'bmesh', 'mathutils'):
    m = types.ModuleType(name); m.Vector = object; sys.modules[name] = m
src = open('tools/blender/rig_mesh.py').read()
src = src[:src.rindex('\nmain()')]
g = {'__name__': 'rig'}
exec(compile(src, 'rig_mesh.py', 'exec'), g)
g['BONES'] = g['BONES'] + (g['TAIL_TIP'],)
B = list(g['BONES'])
pre_name = sys.argv[1]
P = f'scratch/variants/{pre_name}'
long_verts = np.load(P + '-src.npy'); pre = np.load(P + '-pre.npy'); final = np.load(P + '-bind.npy')
w = np.load(P + '-weights.npy'); tris = np.load(P + '-tris.npy'); J = np.load(P + '-joints.npy')
cfg = json.load(open(P + '.json'))
heads = {'tail': J[0], 'tail_tip': J[1]}; ends = {'tail_tip': J[2]}; root = J[3]
share = w[:, B.index('tail')] + w[:, B.index('tail_tip')]
full = share > 0.95
M = 163.9161; top = 0.2153; floor = 0.0924
hw = 0.21 / M * 100; leg = 0.035 / M * 100
def curl(points, blend=(0.5, 0.95)):
    out, _ = g['tail_curl'](long_verts, pre, w, heads, ends, root, {'points': points, 'blend': list(blend)})
    return out
base = curl(cfg['studio']['tailCurl']['points'])
delta = (final - base)[full]
print('move of the later steps: mean', np.round(delta.mean(0), 4), 'spread', np.round(delta.std(0), 4))
D = delta.mean(0)
skip = [B.index(n) for n in B if n in ('tail', 'tail_tip') or n.rsplit('_', 1)[0] in ('upper_arm', 'forearm', 'forearm_twist', 'hand', 'fingers')]
body_v = w[:, skip].sum(axis=1) < 0.1
faces = tris[body_v[tris].all(axis=1)]
a, b, c = final[faces[:, 0]], final[faces[:, 1]], final[faces[:, 2]]
n = np.cross(b - a, c - a); n /= np.linalg.norm(n, axis=1)[:, None] + 1e-12
cent = (a + b + c) / 3
def closest(q):
    ab, ac, ap = b - a, c - a, q - a
    d1, d2 = (ab * ap).sum(1), (ac * ap).sum(1)
    bp = q - b; d3, d4 = (ab * bp).sum(1), (ac * bp).sum(1)
    cp = q - c; d5, d6 = (ab * cp).sum(1), (ac * cp).sum(1)
    va = d3 * d6 - d5 * d4; vb = d5 * d2 - d1 * d6; vc = d1 * d4 - d3 * d2
    den = np.where(np.abs(va + vb + vc) > 1e-18, va + vb + vc, 1)
    out = a + ab * (vb / den)[:, None] + ac * (vc / den)[:, None]
    def edge(p0, e, t):
        return p0 + e * np.clip(t, 0, 1)[:, None]
    m = (d1 <= 0) & (d2 <= 0); out[m] = a[m]
    m = (d3 >= 0) & (d4 <= d3); out[m] = b[m]
    m = (d6 >= 0) & (d5 <= d6); out[m] = c[m]
    m = (vc <= 0) & (d1 >= 0) & (d3 <= 0); out[m] = edge(a, ab, d1 / np.where(d1 - d3 != 0, d1 - d3, 1))[m]
    m = (vb <= 0) & (d2 >= 0) & (d6 <= 0); out[m] = edge(a, ac, d2 / np.where(d2 - d6 != 0, d2 - d6, 1))[m]
    m = (va <= 0) & ((d4 - d3) >= 0) & ((d5 - d6) >= 0)
    t = (d4 - d3) / np.where((d4 - d3) + (d5 - d6) != 0, (d4 - d3) + (d5 - d6), 1)
    out[m] = edge(b, c - b, t)[m]
    return out
def measure(points):
    p = (curl(points) + D)[full]
    deep = 0.0
    for q in p:
        near = np.nonzero(np.linalg.norm(cent - q, axis=1) < 0.12)[0]
        if len(near) == 0:
            continue
        cp = closest(q)[near]
        d = np.linalg.norm(cp - q, axis=1); k = int(np.argmin(d))
        if (q - cp[k]) @ n[near[k]] < 0:
            deep = max(deep, d[k])
    over = np.maximum.reduce([np.abs(p[:, 0]) - hw, -0.087 - p[:, 2], p[:, 2] - 0.1])
    post = (np.abs(p[:, 0]) >= hw - leg) & (p[:, 2] <= -0.087 + leg)
    pdepth = np.minimum(np.abs(p[post, 0]) - (hw - leg), (-0.087 + leg) - p[post, 2]).max(initial=0)
    seat = (top - p[over <= 0, 1]).max(initial=0)
    return dict(body=deep * M, posts=pdepth * M, seat=max(seat, 0) * M, out=max(over.max(), 0) * M,
                floor=(p[:, 1].min() - floor) * M)
if __name__ == '__main__':
    pts = json.loads(sys.argv[2]) if len(sys.argv) > 2 else cfg['studio']['tailCurl']['points']
    print({k: round(v, 2) for k, v in measure(pts).items()})
