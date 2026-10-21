"""Prints the face colors of the muzzle of the monkey mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them: the dark faces in patches, and the Oklab lightness, hue, and chroma of the faces of
each region (fur, belly, face, ears, hands, feet, tail, eyes, nose).

    blender -b --factory-startup --python muzzle_probe.py -- <root> <monkey.glb>
"""
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
config = {'source': argv[1], 'weld': 1e-5}
rules = {'samples': 6, 'dark': 0.05, 'eyeShare': 0.34}
verts, tris, uvs, texture = rig['load_mesh'](config)
colors, dark, share = rig['face_colors'](tris, uvs, texture, rules)
mids = verts[tris].mean(axis=1)
lab = rig['oklab'](colors)
hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
chroma = np.hypot(lab[:, 1], lab[:, 2])
x, y, z = mids[:, 0], mids[:, 1], mids[:, 2]
front = np.nonzero((z > 0.105) & (np.abs(x) < 0.06) & (y > 0.74) & (y < 0.84))[0]
print('the faces of the muzzle (z > 0.105, |x| < 0.06, 0.74 < y < 0.84), darkest first:', len(front))
for f in front[np.argsort(lab[front, 0])][:40]:
    print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f} '
          f'hue {hue[f]:.0f} chroma {chroma[f]:.3f} dark {bool(dark[f])} share {share[f]:.2f}')
