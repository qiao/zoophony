"""Prints the face colors of the wolf mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them: the dark faces in patches, and the Oklab lightness, hue, and chroma of the faces of
each region (fur, belly, ears, paws, tail, nose).

    blender -b --factory-startup --python colors_probe.py -- <root> <wolf.glb>
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
print('dark faces:', int(dark.sum()))
for f in np.nonzero(dark)[0]:
    print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f} share {share[f]:.2f}')
print('the darkest faces of the head (y > 0.7), not dark by the rule:')
head = np.nonzero((mids[:, 1] > 0.7) & ~dark)[0]
for f in head[np.argsort(lab[head, 0])][:20]:
    print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f} share {share[f]:.2f}')
def region(name, mask):
    m = mask & ~dark
    if not m.any():
        print(name, 'none'); return
    print(f'{name}: {int(m.sum())} faces, L {np.percentile(lab[m,0],[10,50,90]).round(3)}, hue median '
          f'{np.median(hue[m]):.0f}, chroma median {np.median(chroma[m]):.3f}, mean sRGB {colors[m].mean(0).round(3)}')
    hist = np.histogram(lab[m, 0], bins=[0, .3, .4, .5, .55, .6, .65, .7, .75, .8, .85, .9, .95, 1.01])
    print('   L histogram', list(zip(hist[1][:-1].round(2), hist[0])))
region('back fur (z < -0.03, 0.4 < y < 0.75, |x| < 0.1)', (mids[:, 2] < -0.03) & (mids[:, 1] > 0.4) & (mids[:, 1] < 0.75) & (np.abs(mids[:, 0]) < 0.1))
region('chest and belly (z > 0.09, 0.32 < y < 0.7, |x| < 0.06)', (mids[:, 2] > 0.09) & (mids[:, 1] > 0.32) & (mids[:, 1] < 0.7) & (np.abs(mids[:, 0]) < 0.06))
region('head top (y > 0.86, |x| < 0.03)', (mids[:, 1] > 0.86) & (np.abs(mids[:, 0]) < 0.03))
region('ears (y > 0.93, |x| > 0.02)', (np.abs(mids[:, 0]) > 0.02) & (mids[:, 1] > 0.93))
region('muzzle (z > 0.14, y 0.78..0.85)', (mids[:, 2] > 0.14) & (mids[:, 1] > 0.78) & (mids[:, 1] < 0.85))
region('cheeks (|x| > 0.06, 0.78 < y < 0.86, z > 0.0)', (np.abs(mids[:, 0]) > 0.06) & (mids[:, 1] > 0.78) & (mids[:, 1] < 0.86) & (mids[:, 2] > 0.0))
region('upper arms (|x| > 0.1, 0.5 < y < 0.6)', (np.abs(mids[:, 0]) > 0.1) & (mids[:, 1] < 0.6) & (mids[:, 1] > 0.5))
region('forearms (|x| > 0.15, 0.43 < y < 0.5)', (np.abs(mids[:, 0]) > 0.15) & (mids[:, 1] < 0.5) & (mids[:, 1] > 0.43))
region('paws (|x| > 0.17, y < 0.43)', (np.abs(mids[:, 0]) > 0.17) & (mids[:, 1] < 0.43) & (mids[:, 1] > 0.3))
region('thighs (0.2 < y < 0.3, z > -0.04, |x| > 0.03)', (mids[:, 1] > 0.2) & (mids[:, 1] < 0.3) & (mids[:, 2] > -0.04) & (np.abs(mids[:, 0]) > 0.03))
region('lower legs (0.04 < y < 0.18, z > -0.06)', (mids[:, 1] > 0.04) & (mids[:, 1] < 0.18) & (mids[:, 2] > -0.06))
region('feet (y < 0.04)', (mids[:, 1] < 0.04) & (mids[:, 2] > -0.06))
region('tail (z < -0.08, 0.2 < y < 0.38)', (mids[:, 2] < -0.08) & (mids[:, 1] > 0.2) & (mids[:, 1] < 0.38))
region('tail tip (z < -0.08, y < 0.16)', (mids[:, 2] < -0.08) & (mids[:, 1] < 0.16))
