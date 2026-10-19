"""Prints the face colors of the head of the elephant mesh, as `face_colors()` of
`tools/blender/rig_mesh.py` gives them: the dark faces of the head in patches, the eyes and the
nose of `features()`, and the lightness of all faces.

    blender -b --factory-startup --python head_colors.py -- <root> <elephant.json>
"""

import json
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
with open(argv[1]) as f:
    config = json.load(f)
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
verts, tris, uvs, texture = rig['load_mesh'](config)
colors, dark, _share = rig["face_colors"](tris, uvs, texture, config["colors"])
mids = verts[tris].mean(axis=1)
lab = rig['oklab'](colors)
head = mids[:, 1] > 0.69


def patches(faces):
    out = []
    for f in faces:
        corners = set(int(c) for c in tris[f])
        joined = [p for p in out if corners & p[1]]
        fs = [int(f)] + [g for p in joined for g in p[0]]
        corners |= set(c for p in joined for c in p[1])
        out = [p for p in out if p not in joined] + [(fs, corners)]
    return [sorted(p[0]) for p in out]


print('dark faces of the head:', int((dark & head).sum()))
for p in sorted(patches(np.nonzero(dark & head)[0]), key=lambda p: mids[p, 0].mean()):
    m = mids[p]
    print(f'  patch of {len(p)}: x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
          f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f} '
          f'mean sRGB {colors[p].mean(axis=0).round(3)}')
eyes, nose = rig['features'](verts, tris, colors, dark, config['colors'])
for side in 'LR':
    m = mids[eyes[side]]
    if len(m):
        print(f'eye {side}: {len(m)} faces, x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
              f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f}')
m = mids[nose]
if len(m):
    print(f'nose: {len(m)} faces, x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
          f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f} '
          f'mean sRGB {colors[nose].mean(axis=0).round(3)}')
# The faces near the eyes by lightness: the iris and the white of the eye.
near = head & (mids[:, 1] > 0.8) & (mids[:, 1] < 0.95) & (np.abs(mids[:, 0]) > 0.04) & (np.abs(mids[:, 0]) < 0.16) & (mids[:, 2] > 0.05)
print('faces of the eye region (y 0.82..0.92, |x| 0.02..0.13, z > 0.08):', int(near.sum()))
for f in np.nonzero(near)[0][np.argsort(lab[near, 0])][:80]:
    print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f} dark {dark[f]}')
print('lightness of all faces, percentiles 5 25 50 75 95:',
      np.percentile(lab[:, 0], [5, 25, 50, 75, 95]).round(3))
print('dark faces outside the head:', int((dark & ~head).sum()))
for p in patches(np.nonzero(dark & ~head)[0]):
    m = mids[p]
    print(f'  patch of {len(p)}: x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
          f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f}')
print('nose faces by x:')
for f in sorted(nose, key=lambda f: mids[f, 0]):
    print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f}')
print('nose patches (faces that share corners):')
for p in patches(nose):
    m = mids[p]
    print(f'  patch of {len(p)}: x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} mean x {m[:, 0].mean():+.4f}')
