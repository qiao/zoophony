"""decomp2.py <dump> <corners.json> <src.npz> <rig vertices> [ring u]: the depth of each vertex below
the convex hull of its neighbors (rig vertices whose source lies within ring u of its source), in
the source, in the bind mesh, and in the poses: with the full arm turns, with the arm bones turned
only by their bend (swing) from the clavicle, only by their twist about the bind upper arm axis,
and with no arm turn from the clavicle. cm, p50 / p95 by set."""
import json, sys
import numpy as np
from scipy.spatial import ConvexHull, cKDTree
from scipy.spatial.transform import Rotation as Rot
d, cpath, spath = sys.argv[1:4]; vs = list(map(int, sys.argv[4].split(',')))
ring = float(sys.argv[5]) if len(sys.argv) > 5 else 0.05
RATE = 146.78
m = json.load(open(d + '.json')); L = m['labels']; nb = m['nmat']; B = np.array(m['bind']).reshape(-1, 3); nv = len(B)
Mx = np.fromfile(d + '.mat', np.float32).reshape(len(L), nb, 4, 4).transpose(0, 1, 3, 2).astype(float)
Cw = np.fromfile(d + '.cor', np.float32).reshape(len(L), -1)
X = np.fromfile(d + '.bin', np.float32).reshape(len(L), nv, 3)
CO = np.array([np.array(c).reshape(-1, 3) for c in m['correctives']])
W = np.array(m['weights']).reshape(-1, 4); Jn = np.array(m['joints']).reshape(-1, 4)
bones = m['bones']; tw = m['twist']['R']; H = m['heads']
CL = bones.index('clavicle_R'); UA = bones.index('upper_arm_R')
LOW = [bones.index(b) for b in ['forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R']]
J = np.array(H['upper_arm_R']); axis = np.array(H['forearm_R']) - J; axis /= np.linalg.norm(axis)
C = np.array(m['corners']).reshape(-1, 3); cs = json.load(open(cpath)); V = np.load(spath)['v']; tree = cKDTree(V)
src = {}
for f, t in enumerate(C):
    if f >= len(cs) or not cs[f] or not cs[f].get('s'): continue
    for i, v in enumerate(t):
        if int(v) not in src: src[int(v)] = int(tree.query(cs[f]['s'][i])[1])
keys = np.array(sorted(src)); S = np.array([V[src[k]] for k in keys])
sets = np.array([l.split(' ')[0] for l in L])
def dep(P, i):
    h = ConvexHull(P); return max(0.0, -float((h.equations[:, :3] @ P[i] + h.equations[:, 3]).max()))
def split(Rrel):
    q = Rot.from_matrix(Rrel).as_quat(); p = (q[:3] @ axis) * axis; t = np.array([*p, q[3]]); n = np.linalg.norm(t)
    t = np.array([0, 0, 0, 1.0]) if n < 1e-9 else t / n
    twist = Rot.from_quat(t); swing = Rot.from_quat(q) * twist.inv()
    return swing.as_matrix(), twist.as_matrix()
def alt_mats(Ms, kind):
    M = Ms.copy(); Rc = Ms[CL, :3, :3]
    for b in (UA, tw):
        sw, twm = split(Rc.T @ Ms[b, :3, :3])
        R = {'bend': Rc @ sw, 'twist': Rc @ twm, 'clav': Rc}[kind]
        Sp = Ms[b, :3, :3] @ J + Ms[b, :3, 3]
        M[b, :3, :3] = R; M[b, :3, 3] = Sp - R @ J
    D = M[UA] @ np.linalg.inv(Ms[UA])
    for b in LOW: M[b] = D @ Ms[b]
    return M
def lbs(M, idx, cw):
    x = B[idx] + np.tensordot(cw[:len(CO)], CO[:, idx], 1)
    xh = np.c_[x, np.ones(len(idx))]
    out = np.zeros((len(idx), 3))
    for k in range(4):
        Mk = M[Jn[idx, k]]  # n,4,4
        out += W[idx, k, None] * np.einsum('nij,nj->ni', Mk, xh)[:, :3]
    return out
for v in vs:
    i = int(np.nonzero(keys == v)[0][0])
    nbi = np.nonzero(np.linalg.norm(S - S[i], axis=1) < ring)[0]
    _, u = np.unique(np.round(S[nbi], 6), axis=0, return_index=True); nbi = nbi[u]
    if i not in nbi: nbi = np.append(nbi, i)
    idx = keys[nbi]; ii = int(np.nonzero(idx == v)[0][0])
    res = {k: [] for k in ['full', 'bend', 'twist', 'clav']}; err = 0
    for s in range(len(L)):
        P = lbs(Mx[s], idx, Cw[s]); err = max(err, float(np.abs(P - X[s][idx]).max()))
        res['full'].append(dep(P, ii))
        for k in ['bend', 'twist', 'clav']: res[k].append(dep(lbs(alt_mats(Mx[s], k), idx, Cw[s]), ii))
    print(f'vertex {v} (source {src[v]}): {len(idx)} neighbors, source {dep(S[nbi], ii) * RATE:.2f} cm, bind {dep(B[idx], ii) * 100:.2f} cm (LBS check {err * 1000:.2f} mm)')
    for st in ['rest', 'play', 'lift']:
        sel = sets == st
        print(f'  {st:4s} ' + ' | '.join(f'{k} {np.percentile(np.array(a)[sel], 50) * 100:5.2f} {np.percentile(np.array(a)[sel], 95) * 100:5.2f}' for k, a in res.items()))
