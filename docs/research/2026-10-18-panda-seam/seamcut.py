"""Counts the edges of the trunk side from a seam corner (upper arm share >= arm, little forearm)
to a trunk corner (upper arm share <= low), long and below the armpit, and the new faces of a cut."""
import sys
import numpy as np
BONES = ('root', 'hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'ear_L', 'ear_R',
         'clavicle_L', 'upper_arm_L', 'forearm_L', 'forearm_twist_L', 'hand_L', 'fingers_L',
         'clavicle_R', 'upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R',
         'thigh_L', 'shin_L', 'foot_L', 'toes_L', 'thigh_R', 'shin_R', 'foot_R', 'toes_R', 'tail')
d = np.load(sys.argv[1], allow_pickle=True)
arm, low, length, top = (float(x) for x in sys.argv[2:6])
tris, w, v = d['tris'], d['weights'], d['verts']
module = d['module'][:len(tris)]
edges = {}
for f, t in enumerate(tris):
    for k in range(3):
        edges.setdefault(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))), []).append(f)
cut = []
for side in 'LR':
    ua = w[:, BONES.index(f'upper_arm_{side}')]
    fore = w[:, [BONES.index(f'forearm_{side}'), BONES.index(f'forearm_twist_{side}')]].sum(axis=1)
    sign = 1 if side == 'L' else -1
    for (a, b), fs in edges.items():
        for s, t in ((a, b), (b, a)):
            if (ua[s] >= arm and fore[s] < 0.1 and ua[t] <= low and fore[t] < 0.1 and v[s, 1] <= top
                    and v[t, 1] < v[s, 1] and np.linalg.norm(v[s] - v[t]) >= length and v[s, 0] * sign > 0):
                cut.append((side, s, t, fs))
faces = set(f for c in cut for f in c[3])
print(f'{len(cut)} edges, {len(faces)} faces cut, about {len(cut) * 2} new faces')
for side, s, t, fs in cut:
    print(f'  {side} {s}->{t}: {np.linalg.norm(v[s] - v[t]):.3f} u, ua {w[s, BONES.index("upper_arm_" + side)]:.2f} -> {w[t, BONES.index("upper_arm_" + side)]:.2f}, faces {[int(module[f]) for f in fs]}')
