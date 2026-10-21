"""Prints the face colors of the penguin mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them with the dark limit of the argument: the faces near each eye in order of lightness,
and the Oklab lightness, hue, and chroma of the faces of each region (back, belly, throat, head,
beak, flippers, feet).

    blender -b --factory-startup --python colors_probe.py -- <root> <penguin.glb> <dark>
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
rules = {'samples': 6, 'dark': float(argv[2]), 'eyeShare': 0.34}
verts, tris, uvs, texture = rig['load_mesh'](config)
colors, dark, share = rig['face_colors'](tris, uvs, texture, rules)
mids = verts[tris].mean(axis=1)
lab = rig['oklab'](colors)
hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
chroma = np.hypot(lab[:, 1], lab[:, 2])
print('dark faces:', int(dark.sum()), 'of', len(tris))
for side, sign in (('L', 1), ('R', -1)):
    eye = np.array([0.07 * sign, 0.905, 0.11])
    near = np.nonzero(np.linalg.norm(mids - eye, axis=1) < 0.04)[0]
    print(f'faces within 0.04 u of the eye {side} {eye}, in order of lightness:')
    for f in near[np.argsort(lab[near, 0])]:
        print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f} dark {bool(dark[f])} share {share[f]:.2f}')


def region(name, mask):
    m = mask & ~dark
    if not m.any():
        print(name, 'none')
        return
    print(f'{name}: {int(m.sum())} faces, L {np.percentile(lab[m, 0], [10, 50, 90]).round(3)}, hue median '
          f'{np.median(hue[m]):.0f}, chroma median {np.median(chroma[m]):.3f}, mean sRGB {colors[m].mean(0).round(3)}')


x, y, z = mids[:, 0], mids[:, 1], mids[:, 2]
region('back (z < -0.15, 0.3 < y < 0.7, |x| < 0.08)', (z < -0.15) & (y > 0.3) & (y < 0.7) & (np.abs(x) < 0.08))
region('belly (z > 0.15, 0.25 < y < 0.6, |x| < 0.08)', (z > 0.15) & (y > 0.25) & (y < 0.6) & (np.abs(x) < 0.08))
region('throat (z > 0.1, 0.7 < y < 0.8, |x| < 0.08)', (z > 0.1) & (y > 0.7) & (y < 0.8) & (np.abs(x) < 0.08))
region('head top (y > 0.95)', y > 0.95)
region('beak (z > 0.16, 0.85 < y < 0.93)', (z > 0.16) & (y > 0.85) & (y < 0.93))
region('flippers (|x| > 0.25, 0.3 < y < 0.5)', (np.abs(x) > 0.25) & (y > 0.3) & (y < 0.5))
region('feet (y < 0.04)', y < 0.04)
