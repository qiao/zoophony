"""Prototype: redo the knee smoothing of a step dir from step 12, with the part of each step along
the surface times a slide share: 'none' (0), 'fall' (the weight fall of the vertex, 1 at the
seam and 0 at the reach), 'fall2' (its square), or a number. Writes a step dir.

    slide_proto.py <step dir> <out dir> <slide> [reach rounds]
"""
import glob, os, shutil, sys
import numpy as np

src, out, slide = sys.argv[1], sys.argv[2], sys.argv[3]
reach = float(sys.argv[4]) if len(sys.argv) > 4 else 0.105
rr = int(sys.argv[5]) if len(sys.argv) > 5 else 12
files = sorted(glob.glob(os.path.join(src, '[0-9]*.npz')))
s12 = np.load([f for f in files if os.path.basename(f).startswith('12')][0])
s13 = np.load([f for f in files if os.path.basename(f).startswith('13')][0])
heads = np.load(os.path.join(src, 'heads-2.npz'))
bind, tris = s12['points'], s12['tris']
share = 0.5
def unit(v): return v / np.linalg.norm(v)
def normals(q):
    c = q[tris]; fn = np.cross(c[:, 1] - c[:, 0], c[:, 2] - c[:, 0])
    vn = np.zeros_like(q)
    for k in range(3): np.add.at(vn, tris[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
cols = {k: s12[k] for k in ('thigh_L', 'shin_L', 'hips', 'foot_L', 'thigh_R', 'shin_R', 'foot_R')}
names = list(cols)
W = np.stack([cols[k] for k in names], 1)
main = W[tris].sum(axis=1).argmax(axis=1)
neighbors = [set() for _ in range(len(bind))]
for a, b, c in tris:
    neighbors[a].update((b, c)); neighbors[b].update((a, c)); neighbors[c].update((a, b))
res = bind.copy()
for side in 'LR':
    th, sh = names.index(f'thigh_{side}'), names.index(f'shin_{side}')
    on_t = np.zeros(len(bind), bool); on_s = np.zeros(len(bind), bool)
    on_t[tris[main == th].ravel()] = True; on_s[tris[main == sh].ravel()] = True
    K = heads[f'shin_{side}']
    inner = unit(unit(heads[f'thigh_{side}'] - K) + unit(heads[f'foot_{side}'] - K))
    seam = on_t & on_s & ((res - K) @ inner >= 0.0)
    free = np.clip(cols[f'thigh_{side}'] + cols[f'shin_{side}'] - cols['hips'], 0, 1)
    pts = res[seam]
    near = np.array([np.linalg.norm(pts - p, axis=1).min() for p in res])
    ids = np.nonzero((near < reach) & (free > 0))[0]
    fall = 0.5 * (1 + np.cos(np.pi * near[ids] / reach))
    w = fall * free[ids] * share
    keep = {'none': np.zeros_like(fall), 'fall': fall, 'fall2': fall ** 2}.get(slide)
    if keep is None:
        keep = np.full_like(fall, float(slide))
    rings = [np.array(sorted(neighbors[i])) for i in ids]
    o = res.copy()
    for _ in range(rr):
        n = normals(o)[ids]
        mids = np.array([o[r].mean(axis=0) for r in rings])
        step = mids - o[ids]
        normal_part = (step * n).sum(1)[:, None] * n
        o[ids] += w[:, None] * (normal_part + keep[:, None] * (step - normal_part))
    res = o
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
for f in glob.glob(os.path.join(out, '13-*.npz')):
    d = dict(np.load(f)); d['points'] = res; np.savez(f, **d)
print(f'largest move of the smoothing {float(np.linalg.norm(res - bind, axis=1).max()) * 1634.55:.1f} mm (step 13: {float(np.linalg.norm(s13["points"] - bind, axis=1).max()) * 1634.55:.1f} mm)')
