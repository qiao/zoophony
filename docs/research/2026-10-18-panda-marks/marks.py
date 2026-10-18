"""Measures the dark marks on the torso of the studio panda.

    uv run --no-project --with numpy python -I docs/research/2026-10-18-panda-marks/marks.py \
        scratch/marks/base.npz scratch/marks/posed.json <face,...>

The first file comes from `dump.sh`, the second from `posed.ts`. The script prints:

1. Each face of the whole body whose share of dark texture samples is from `eyeShare` (0.34) to
   0.5: these faces take black, but most of their texture is light.
2. The teeth of the black band on the trunk: a face of one class (dark or light) with two or more
   edge neighbors of the other class.
3. A table of the named faces of the module: the side, the middle in source units, the Oklab
   lightness of the face color, the share of dark samples, the main bone, the area of the face in
   the rest sample and in the median play sample against the bind, the turn of its normal from
   the bind, and the largest upper arm weight of a corner.

The texture samples are the samples of `face_colors()` of `tools/blender/rig_mesh.py`: 28 points
of a triangle grid, and a sample is dark below the linear luminance 0.05.
"""
import json
import sys

import numpy as np

BONES = ('root', 'hips', 'spine', 'spine1', 'chest', 'neck', 'head', 'ear_L', 'ear_R',
         'clavicle_L', 'upper_arm_L', 'forearm_L', 'forearm_twist_L', 'hand_L', 'fingers_L',
         'clavicle_R', 'upper_arm_R', 'forearm_R', 'forearm_twist_R', 'hand_R', 'fingers_R',
         'thigh_L', 'shin_L', 'foot_L', 'toes_L', 'thigh_R', 'shin_R', 'foot_R', 'toes_R', 'tail')


def linear(s):
    s = np.asarray(s, float)
    return np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4)


def lightness(srgb):
    lms = linear(srgb) @ np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                                   [0.2119034982, 0.6806995451, 0.1073969566],
                                   [0.0883024619, 0.2817188376, 0.6299787005]]).T
    return np.cbrt(lms) @ np.array([0.2104542553, 0.7936177850, -0.0040720468])


d = np.load(sys.argv[1], allow_pickle=True)
p = json.load(open(sys.argv[2]))
named = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else []
tris, uvs, tex, w = d['tris'], d['uvs'], d['texture'], d['weights']
nf = len(tris)
module = d['module'][:nf]
dump_of = np.full(nf, -1)
dump_of[module] = np.arange(nf)
L = lightness(d['colors_all_pre'][:nf])
main = w[tris].sum(axis=1).argmax(axis=1)
src = d['verts'][tris].mean(axis=1)

n = 6
grid = np.array([(i / n, j / n, (n - i - j) / n) for i in range(n + 1) for j in range(n + 1 - i)])
height, width, _ = tex.shape
share = np.zeros(nf)
for f in range(nf):
    at = grid @ uvs[f]
    x = np.clip(((at[:, 0] % 1.0) * width).astype(int), 0, width - 1)
    y = np.clip(((at[:, 1] % 1.0) * height).astype(int), 0, height - 1)
    share[f] = ((linear(tex[y, x]) @ [0.2126, 0.7152, 0.0722]) < 0.05).mean()

print('1. Faces with 34% to 50% dark samples (module index, middle in source units, lightness)')
for f in np.nonzero((share >= 0.34) & (share < 0.5))[0]:
    print(f'  {module[f]:4d} ({src[f, 0]:.3f}, {src[f, 1]:.3f}, {src[f, 2]:.3f}) {BONES[main[f]]}, '
          f'{100 * share[f]:.0f}% dark samples, L {L[f]:.2f}')

dark = L < 0.5
trunk = (src[:, 1] > 0.17) & (src[:, 1] < 0.69) & ~np.isin(main, [BONES.index('head'),
                                                                   BONES.index('neck')])
edges = {}
for f, t in enumerate(tris):
    for k in range(3):
        edges.setdefault(tuple(sorted((int(t[k]), int(t[(k + 1) % 3])))), []).append(f)
neighbors = [[] for _ in range(nf)]
for faces in edges.values():
    for a in faces:
        neighbors[a] += [b for b in faces if b != a]
print('2. Teeth of the black band on the trunk')
for f in np.nonzero(trunk)[0]:
    other = sum(1 for g in neighbors[f] if dark[g] != dark[f])
    if other >= 2:
        print(f'  {module[f]:4d} {"dark" if dark[f] else "light"}, {other} of {len(neighbors[f])} '
              f'neighbors of the other class, {100 * share[f]:.0f}% dark samples')

if named:
    corners = np.array(p['corners']).reshape(-1, 3)
    bind = np.array(p['bind']).reshape(-1, 3)
    rest = np.array(p['rest'][0]).reshape(-1, 3)
    play = np.array(p['play']).reshape(len(p['play']), -1, 3)

    def area_normal(points):
        a, b, c = points[corners[:, 0]], points[corners[:, 1]], points[corners[:, 2]]
        cross = np.cross(b - a, c - a)
        length = np.linalg.norm(cross, axis=1)
        return length / 2, cross / np.maximum(length[:, None], 1e-12)

    def turn(n0, n1):
        return np.degrees(np.arccos(np.clip((n0 * n1).sum(axis=1), -1, 1)))

    a0, n0 = area_normal(bind)
    ar, nr = area_normal(rest)
    plays = [area_normal(q) for q in play]
    area_play = np.median([a for a, _ in plays], axis=0) / a0
    turn_play = np.median([turn(n0, nq) for _, nq in plays], axis=0)
    turn_rest = turn(n0, nr)
    arms = [BONES.index('upper_arm_L'), BONES.index('upper_arm_R')]
    print('3. The named faces')
    print('| Face | Side | Middle (source u) | Oklab L | Dark samples | Main bone | Area rest | '
          'Area play | Turn rest | Turn play | Upper arm of a corner |')
    print('|---:|---|---|---:|---:|---|---:|---:|---:|---:|---:|')
    for m in named:
        f = dump_of[m]
        side = 'L' if src[f, 0] > 0 else 'R'
        print(f'| {m} | {side} | {src[f, 0]:.3f}, {src[f, 1]:.3f}, {src[f, 2]:.3f} | {L[f]:.2f} | '
              f'{100 * share[f]:.0f}% | {BONES[main[f]]} | {ar[m] / a0[m]:.2f} | '
              f'{area_play[m]:.2f} | {turn_rest[m]:.0f}° | {turn_play[m]:.0f}° | '
              f'{w[tris[f]][:, arms].max():.2f} |')
