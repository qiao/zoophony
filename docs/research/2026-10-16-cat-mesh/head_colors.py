"""Prints the face colors of the head of the cat mesh, as `face_colors()` of
`tools/blender/rig_mesh.py` gives them: the dark faces of the head in patches, the faces of the
eye region by their Oklab color, and the pink faces at the tip of the muzzle.

    blender -b --factory-startup --python head_colors.py -- <cat.json>
"""

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
argv = sys.argv[sys.argv.index('--') + 1 :]
with open(argv[0]) as f:
    config = json.load(f)
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
verts, tris, uvs, texture = rig['load_mesh'](config)
colors, dark = rig['face_colors'](tris, uvs, texture, config['colors'])
mids = verts[tris].mean(axis=1)
lab = rig['oklab'](colors)
head = mids[:, 1] > 0.70


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
# The faces of the front of the head by color: the hue groups of the eye region.
front = head & (mids[:, 2] > 0.12) & (mids[:, 1] < 0.86)
chroma = np.hypot(lab[:, 1], lab[:, 2])
hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1]))
green = front & (chroma > 0.04) & (hue > 90) & (hue < 160)
print('green faces of the front of the head (Oklab chroma above 0.04, hue 90 to 160):',
      int(green.sum()))
for p in sorted(patches(np.nonzero(green)[0]), key=lambda p: mids[p, 0].mean()):
    m = mids[p]
    print(f'  patch of {len(p)}: x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
          f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f} '
          f'mean sRGB {colors[p].mean(axis=0).round(3)}')
pink = front & (chroma > 0.04) & ((hue < 40) | (hue > 330))
print('pink faces of the front of the head (Oklab chroma above 0.04, hue below 40 or above 330):',
      int(pink.sum()))
for p in sorted(patches(np.nonzero(pink)[0]), key=lambda p: mids[p, 0].mean()):
    m = mids[p]
    print(f'  patch of {len(p)}: x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
          f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f} '
          f'mean sRGB {colors[p].mean(axis=0).round(3)}')
# The colors of the body: the share of the faces by the Oklab lightness.
print('lightness of all faces, percentiles 5 25 50 75 95:',
      np.percentile(lab[:, 0], [5, 25, 50, 75, 95]).round(3))
dark_all = np.nonzero(dark)[0]
print('dark faces outside the head:', int((dark & ~head).sum()))
for p in patches(np.nonzero(dark & ~head)[0]):
    m = mids[p]
    print(f'  patch of {len(p)}: x {m[:, 0].min():+.3f}..{m[:, 0].max():+.3f} '
          f'y {m[:, 1].min():.3f}..{m[:, 1].max():.3f} z {m[:, 2].min():.3f}..{m[:, 2].max():.3f}')
