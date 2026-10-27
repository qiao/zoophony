"""Prototype: after the knee smoothing (step 13), fair the calf back along the vertex normals:
each vertex of a side whose place along the bind shin lies in [lo, hi] units below the knee
joint, on the inner side, and whose free share is above 0, moves <share> of the normal part of
the way to the middle of its neighbors, in <rounds> rounds, times a half sine bump over [lo, hi].

    fair_proto.py <step dir> <out dir> <lo> <hi> <rounds> <share>
"""
import glob, os, shutil, sys
import numpy as np
src, out = sys.argv[1], sys.argv[2]
lo, hi, rounds, share = float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]), float(sys.argv[6])
files = sorted(glob.glob(os.path.join(src, '[0-9]*.npz')))
s12 = np.load([f for f in files if os.path.basename(f).startswith('12')][0])
s13 = np.load([f for f in files if os.path.basename(f).startswith('13')][0])
heads = np.load(os.path.join(src, 'heads-2.npz'))
tris = s13['tris']
def unit(v): return v / np.linalg.norm(v)
def normals(q):
    c = q[tris]; fn = np.cross(c[:, 1] - c[:, 0], c[:, 2] - c[:, 0])
    vn = np.zeros_like(q)
    for k in range(3): np.add.at(vn, tris[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
neighbors = [set() for _ in range(len(s13['points']))]
for a, b, c in tris:
    neighbors[a].update((b, c)); neighbors[b].update((a, c)); neighbors[c].update((a, b))
res = s13['points'].copy()
base = s12['points']
total = 0
for side in 'LR':
    K = heads[f'shin_{side}']
    S = unit(heads[f'foot_{side}'] - K)
    inner = unit(unit(heads[f'thigh_{side}'] - K) + S)
    free = np.clip(s12[f'thigh_{side}'] + s12[f'shin_{side}'] - s12['hips'], 0, 1)
    h = (base - K) @ S
    ids = np.nonzero((h > lo) & (h < hi) & ((base - K) @ inner > 0) & (free > 0) & (np.sign(base[:, 0]) == (1 if side == 'L' else -1)))[0]
    bump = np.sin(np.pi * (h[ids] - lo) / (hi - lo))
    w = share * bump * free[ids]
    rings = [np.array(sorted(neighbors[i])) for i in ids]
    for _ in range(rounds):
        n = normals(res)[ids]
        mids = np.array([res[r].mean(axis=0) for r in rings])
        step = ((mids - res[ids]) * n).sum(1)[:, None] * n
        res[ids] += w[:, None] * step
    total += len(ids)
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
for f in glob.glob(os.path.join(out, '13-*.npz')):
    d = dict(np.load(f)); d['points'] = res; np.savez(f, **d)
print(f'{total} vertices, largest move {float(np.linalg.norm(res - s13["points"], axis=1).max()) * 1634.55:.1f} mm')
