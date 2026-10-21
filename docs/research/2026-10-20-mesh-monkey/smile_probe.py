"""Finds the faces of the smile line and the brows on the monkey mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them: the dark faces in patches, and the Oklab lightness, hue, and chroma of the faces of
each region (fur, belly, face, ears, hands, feet, tail, eyes, nose).

    blender -b --factory-startup --python smile_probe.py -- <root> <monkey.glb>
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
# A face of the smile line or of a brow has some texture samples of the brown line in the cream
# fur: the share of its samples below the linear luminance 0.25 (the cream is about 0.55).
line = {'samples': 6, 'dark': 0.25, 'eyeShare': 0.34}
_, _, part = rig['face_colors'](tris, uvs, texture, line)
x, y, z = mids[:, 0], mids[:, 1], mids[:, 2]
for name, mask in (
    ('muzzle below the nose (z > 0.09, 0.74 < y < 0.805, |x| < 0.07)',
     (z > 0.09) & (y > 0.74) & (y < 0.805) & (np.abs(x) < 0.07)),
    ('brows (z > 0.07, 0.87 < y < 0.92, 0.01 < |x| < 0.09)',
     (z > 0.07) & (y > 0.87) & (y < 0.92) & (np.abs(x) > 0.01) & (np.abs(x) < 0.09)),
):
    faces = np.nonzero(mask & (part > 0))[0]
    print(f'{name}: {int(mask.sum())} faces, {len(faces)} with a sample of the line')
    for f in faces[np.argsort(mids[faces, 0])]:
        print(f'  face {f}: mid {mids[f].round(3)} share {part[f]:.2f} L {lab[f, 0]:.3f}')
