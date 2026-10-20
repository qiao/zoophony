"""Counts the dark faces of the badger mesh for each dark limit of `face_colors()` of
`tools/blender/rig_mesh.py`, by region, and lists the dark faces of the head.

    blender -b --factory-startup --python dark_probe.py -- <root> <badger.glb>
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
mids = verts[tris].mean(axis=1)
for limit in (0.05, 0.03, 0.02, 0.015, 0.01):
    colors, dark, share = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': limit, 'eyeShare': 0.34})
    head = dark & (mids[:, 1] > 0.77)
    print(f'dark {limit}: {int(dark.sum())} faces, head (y > 0.77) {int(head.sum())}, '
          f'legs and paws (y < 0.2 or |x| > 0.17) {int((dark & ((mids[:, 1] < 0.2) | (np.abs(mids[:, 0]) > 0.17))).sum())}')
    if limit in (0.02, 0.01):
        L = rig['oklab'](colors)[:, 0]
        for f in np.nonzero(head)[0]:
            print(f'    face {f}: mid {mids[f].round(3)} L {L[f]:.3f} share {share[f]:.2f}')
