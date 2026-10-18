"""Lists the faces 93 and 2115 of the module and the web edges from the trunk to a forearm."""
import sys
import numpy as np
BONES = ('root', 'hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'ear_L', 'ear_R',
         'clavicle_L', 'upper_arm_L', 'forearm_L', 'forearm_twist_L', 'hand_L', 'fingers_L',
         'clavicle_R', 'upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R',
         'thigh_L', 'shin_L', 'foot_L', 'toes_L', 'thigh_R', 'shin_R', 'foot_R', 'toes_R', 'tail')
d = np.load(sys.argv[1], allow_pickle=True)
tris, w, v = d['tris'], d['weights'], d['verts']
nf = len(tris)
module = d['module'][:nf]
dump_of = {int(m): f for f, m in enumerate(module)}
def wtext(i):
    top = np.argsort(-w[i])[:4]
    return ', '.join(f'{BONES[k]} {w[i, k]:.2f}' for k in top if w[i, k] > 0)
for m in [int(x) for x in sys.argv[2].split(',')]:
    f = dump_of[m]
    print(f'module face {m} = dump face {f}')
    for i in tris[f]:
        print(f'  vertex {i}: source {np.round(v[i], 3)}: {wtext(i)}')
fore = [BONES.index(b) for b in ('forearm_L', 'forearm_R', 'forearm_twist_L', 'forearm_twist_R')]
trunk = [BONES.index(b) for b in ('hips', 'spine', 'spine1', 'chest')]
edges = {}
for f, t in enumerate(tris):
    for k in range(3):
        edges.setdefault(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))), []).append(f)
print('web edges: one corner with a trunk share above 0.5, the other with a forearm share above 0.5')
for (a, b), fs in sorted(edges.items()):
    ta, tb = w[a, trunk].sum(), w[b, trunk].sum()
    fa, fb = w[a, fore].sum(), w[b, fore].sum()
    if (ta > 0.5 and fb > 0.5) or (tb > 0.5 and fa > 0.5):
        print(f'  edge {a}-{b}, length {np.linalg.norm(v[a] - v[b]):.3f} u, faces of the module {[int(module[f]) for f in fs]}')
