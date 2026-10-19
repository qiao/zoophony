"""Prints the face colors of the pig mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them: the dark faces in patches, and the Oklab lightness, hue, and chroma of the faces of
each region (fur, belly, ears, paws, tail, nose).

    blender -b --factory-startup --python colors_probe.py -- <root> <pig.glb>
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
region('back skin (z < -0.05, 0.2 < y < 0.65, |x| < 0.15)', (mids[:, 2] < -0.05) & (mids[:, 1] > 0.2) & (mids[:, 1] < 0.65) & (np.abs(mids[:, 0]) < 0.15))
region('belly (z > 0.15, 0.2 < y < 0.6, |x| < 0.1)', (mids[:, 2] > 0.15) & (mids[:, 1] > 0.2) & (mids[:, 1] < 0.6) & (np.abs(mids[:, 0]) < 0.1))
region('head top (y > 0.88, |x| < 0.08)', (mids[:, 1] > 0.88) & (np.abs(mids[:, 0]) < 0.08))
region('ears (|x| > 0.12, y > 0.86)', (np.abs(mids[:, 0]) > 0.12) & (mids[:, 1] > 0.86))
region('arm hooves (|x| > 0.25, y < 0.38)', (np.abs(mids[:, 0]) > 0.25) & (mids[:, 1] < 0.38) & (mids[:, 1] > 0.3))
region('arms (|x| > 0.2, 0.38 < y < 0.5)', (np.abs(mids[:, 0]) > 0.2) & (mids[:, 1] < 0.5) & (mids[:, 1] > 0.38))
region('feet (y < 0.03)', (mids[:, 1] < 0.03))
region('legs (0.03 < y < 0.14)', (mids[:, 1] > 0.03) & (mids[:, 1] < 0.14))
region('tail (z < -0.2, 0.25 < y < 0.34)', (mids[:, 2] < -0.2) & (mids[:, 1] > 0.25) & (mids[:, 1] < 0.34) & (np.abs(mids[:, 0]) < 0.05))
region('snout disc (z > 0.235, y 0.75..0.84)', (mids[:, 2] > 0.235) & (mids[:, 1] > 0.75) & (mids[:, 1] < 0.84))
region('cheeks (|x| > 0.1, 0.68 < y < 0.8, z > 0.1)', (np.abs(mids[:, 0]) > 0.1) & (mids[:, 1] > 0.68) & (mids[:, 1] < 0.8) & (mids[:, 2] > 0.1))
