"""Prints the face colors of the badger mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them with no dark rule (dark 0): the Oklab lightness, hue, and chroma of the faces of each
region (the front fur, the back fur, the white stripe, the black eye stripes, the cheeks, the ears,
the arms, the paws, the claws, the legs, and the tail), and the linear luminance of each region.

    blender -b --factory-startup --python colors_probe.py -- <root> <badger.glb>
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
colors, dark, share = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': 0.0, 'eyeShare': 0.34})
mids = verts[tris].mean(axis=1)
lab = rig['oklab'](colors)
hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
chroma = np.hypot(lab[:, 1], lab[:, 2])
lin = np.where(colors <= 0.04045, colors / 12.92, ((colors + 0.055) / 1.055) ** 2.4)
lum = lin @ np.array([0.2126, 0.7152, 0.0722])
x, y, z = mids[:, 0], mids[:, 1], mids[:, 2]


def region(name, m):
    if not m.any():
        print(name, 'none')
        return
    print(f'{name}: {int(m.sum())} faces, L p10/50/90 {np.percentile(lab[m, 0], [10, 50, 90]).round(3)}, '
          f'hue {np.median(hue[m]):.0f}, chroma {np.median(chroma[m]):.3f}, luminance p10/50/90 '
          f'{np.percentile(lum[m], [10, 50, 90]).round(4)}')


region('front fur (z > 0.05, 0.25 < y < 0.7, |x| < 0.1)', (z > 0.05) & (y > 0.25) & (y < 0.7) & (np.abs(x) < 0.1))
region('back fur (z < -0.1, 0.25 < y < 0.7, |x| < 0.1)', (z < -0.1) & (y > 0.25) & (y < 0.7) & (np.abs(x) < 0.1))
region('side fur (|x| > 0.15, 0.2 < y < 0.45, |z| < 0.05)', (np.abs(x) > 0.15) & (y > 0.2) & (y < 0.45) & (np.abs(z) < 0.05) & (np.abs(x) < 0.21))
region('white stripe (|x| < 0.02, y > 0.86, z > 0.05)', (np.abs(x) < 0.02) & (y > 0.86) & (z > 0.05))
region('black eye stripes (0.04 < |x| < 0.09, 0.88 < y < 0.96, z > 0.08)', (np.abs(x) > 0.04) & (np.abs(x) < 0.09) & (y > 0.88) & (y < 0.96) & (z > 0.08))
region('cheeks (|x| > 0.08, 0.8 < y < 0.87, z > 0.05)', (np.abs(x) > 0.08) & (y > 0.8) & (y < 0.87) & (z > 0.05))
region('muzzle (z > 0.2, 0.79 < y < 0.84, |x| > 0.02)', (z > 0.2) & (y > 0.79) & (y < 0.84) & (np.abs(x) > 0.02))
region('nose (z > 0.255, y > 0.81)', (z > 0.255) & (y > 0.81))
region('ears (|x| > 0.11, y > 0.9)', (np.abs(x) > 0.11) & (y > 0.9))
region('upper arms (|x| > 0.17, 0.45 < y < 0.6)', (np.abs(x) > 0.17) & (y > 0.45) & (y < 0.6))
region('paws (|x| > 0.22, 0.33 < y < 0.42)', (np.abs(x) > 0.22) & (y > 0.33) & (y < 0.42))
region('claws (|x| > 0.22, y < 0.335)', (np.abs(x) > 0.22) & (y < 0.335) & (y > 0.3))
region('legs and feet (y < 0.11)', y < 0.11)
region('tail (z < -0.17, y < 0.16)', (z < -0.17) & (y < 0.16))
