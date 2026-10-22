"""Lists the faces of the muzzle of the polar bear mesh near the mouth line of the texture: the middle,
the normal, the face color of `face_colors()` of `tools/blender/rig_mesh.py`, and the darkest
texture sample of each face, in the units and the axes of the studio.

    blender -b --factory-startup --python smile_probe.py -- <root> <polar-bear-mesh.glb>
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
verts, tris, uvs, texture = rig['load_mesh']({'source': argv[1], 'weld': 1e-5})
colors, dark, share = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': 0.0037, 'eyeShare': 0.34})
p = verts[tris]
mids = p.mean(axis=1)
normals = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0])
normals /= np.linalg.norm(normals, axis=1)[:, None]
lab = rig['oklab'](colors)
grid = rig['sample_grid'](6)
pick = np.nonzero((np.abs(mids[:, 0]) < 0.075) & (mids[:, 1] > 0.79) & (mids[:, 1] < 0.85) & (mids[:, 2] > 0.17))[0]
for f in pick[np.argsort(mids[pick, 1])]:
    samples = rig['face_samples'](uvs[f], grid, texture)
    low = rig['oklab'](samples[:, :3])[:, 0].min()
    print(f'face {f}: mid {mids[f].round(3)} normal {normals[f].round(2)} L {lab[f, 0]:.3f} darkest sample L {low:.3f}')
