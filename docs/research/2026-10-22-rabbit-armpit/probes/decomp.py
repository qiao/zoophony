"""decomp.py <dump> <rig vertices>: the linear blend sink of each vertex toward the right shoulder
joint (|u| - |sum w R u|, u = x - J), in the pose, with the arm bones turned only by their bend
(swing) from the clavicle, only by their twist about the bind upper arm axis, and with no arm turn
(the arm bones follow the clavicle). Also the angle between the mean arm turn and the mean trunk
turn of the vertex and the 2-bone estimate |u| (1 - cos(angle / 2)) at its weights. cm, p50/p95."""
import json, sys
import numpy as np
from scipy.spatial.transform import Rotation as Rot
d = sys.argv[1]; vs = list(map(int, sys.argv[2].split(',')))
m = json.load(open(d + '.json')); L = m['labels']; nb = m['nmat']; nv = len(m['bind']) // 3
Mx = np.fromfile(d + '.mat', np.float32).reshape(len(L), nb, 4, 4).transpose(0, 1, 3, 2).astype(float)
Cw = np.fromfile(d + '.cor', np.float32).reshape(len(L), -1)
B = np.array(m['bind']).reshape(-1, 3); CO = [np.array(c).reshape(-1, 3) for c in m['correctives']]
W = np.array(m['weights']).reshape(-1, 4); Jn = np.array(m['joints']).reshape(-1, 4)
bones = m['bones']; tw = m['twist']['R']; H = m['heads']
CL = bones.index('clavicle_R'); ARM = {bones.index(b) for b in ['upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R']} | {tw}
J = np.array(H['upper_arm_R']); axis = np.array(H['forearm_R']) - J; axis /= np.linalg.norm(axis)
sets = np.array([l.split(' ')[0] for l in L])
def parts(Rrel):
    q = Rot.from_matrix(Rrel).as_quat()  # x y z w
    v = q[:3]; p = (v @ axis) * axis; t = np.array([*p, q[3]]); n = np.linalg.norm(t)
    t = np.array([0, 0, 0, 1.0]) if n < 1e-9 else t / n
    twist = Rot.from_quat(t); swing = Rot.from_quat(q) * twist.inv()
    return swing.as_matrix(), twist.as_matrix(), np.degrees(twist.magnitude()), np.degrees(swing.magnitude())
out = {}
for v in vs:
    res = {k: [] for k in ['full', 'bend', 'twist', 'clav', 'est', 'angle', 'twdeg', 'swdeg']}
    for s in range(len(L)):
        x = B[v] + sum(Cw[s, c] * CO[c][v] for c in range(len(CO)))
        u = x - J; R = {}
        for k in range(4):
            if W[v, k] > 0: R[int(Jn[v, k])] = Mx[s, int(Jn[v, k]), :3, :3]
        Rc = Mx[s, CL, :3, :3]
        alts = {'full': dict(R), 'bend': {}, 'twist': {}, 'clav': {}}
        tws, sws = [], []
        for b, Rb in R.items():
            if b in ARM:
                sw, twm, tdeg, sdeg = parts(Rc.T @ Rb)
                alts['bend'][b] = Rc @ sw; alts['twist'][b] = Rc @ twm; alts['clav'][b] = Rc
                if b in (bones.index('upper_arm_R'), tw): tws.append(tdeg); sws.append(sdeg)
            else:
                for a in ['bend', 'twist', 'clav']: alts[a][b] = Rb
        for a, RR in alts.items():
            p = sum(W[v, k] * (RR[int(Jn[v, k])] @ u) for k in range(4) if W[v, k] > 0)
            res[a].append(np.linalg.norm(u) - np.linalg.norm(p))
        wa = sum(W[v, k] for k in range(4) if int(Jn[v, k]) in ARM)
        ra = Rot.from_matrix(np.array([R[b] for b in R if b in ARM])).mean([W[v, k] for k in range(4) if int(Jn[v, k]) in ARM]) if wa > 0 else None
        rt = Rot.from_matrix(np.array([R[b] for b in R if b not in ARM])).mean([W[v, k] for k in range(4) if W[v, k] > 0 and int(Jn[v, k]) not in ARM])
        ang = (ra * rt.inv()).magnitude() if ra is not None else 0.0
        # two-bone LBS sink for weights wa, 1 - wa at angle ang: |u| (1 - |wa e^{i ang} + (1 - wa)|)
        res['est'].append(np.linalg.norm(u) * (1 - abs(wa * np.exp(1j * ang) + (1 - wa))))
        res['angle'].append(np.degrees(ang)); res['twdeg'].append(np.mean(tws) if tws else 0); res['swdeg'].append(np.mean(sws) if sws else 0)
    out[v] = {k: np.array(a) for k, a in res.items()}
    print(f'vertex {v}: |u| {np.linalg.norm(B[v] - J) * 100:.1f} cm, arm weight {sum(W[v, k] for k in range(4) if int(Jn[v, k]) in ARM):.2f}')
    for st in ['rest', 'play', 'lift']:
        sel = sets == st; r = out[v]
        f = lambda k, mul=100: f'{np.percentile(r[k][sel], 50) * mul:5.2f} {np.percentile(r[k][sel], 95) * mul:5.2f}'
        print(f'  {st:4s} sink full {f("full")} | bend only {f("bend")} | twist only {f("twist")} | clavicle only {f("clav")} | 2-bone est {f("est")} cm | angle {f("angle", 1)} swing {f("swdeg", 1)} twist {f("twdeg", 1)} deg')
