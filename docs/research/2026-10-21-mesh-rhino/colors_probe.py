"""Prints the face colors of the rhino mesh, as `face_colors()` of `tools/blender/rig_mesh.py`
gives them: the dark faces in patches, and the Oklab lightness, hue, and chroma of the faces of
each region (fur, belly, head, horn, ears, arms, paws, feet, tail).

    blender -b --factory-startup --python colors_probe.py -- <root> <rhino.glb>
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
print('the dark faces of the head (y > 0.72), in order of x:')
heads = np.nonzero((mids[:, 1] > 0.72) & dark)[0]
for f in heads[np.argsort(mids[heads, 0])]:
    print(f'  face {f}: mid {mids[f].round(3)} sRGB {colors[f].round(3)} L {lab[f, 0]:.3f} share {share[f]:.2f}')


def region(name, mask):
    m = mask & ~dark
    if not m.any():
        print(name, 'none')
        return
    print(f'{name}: {int(m.sum())} faces, L {np.percentile(lab[m, 0], [10, 50, 90]).round(3)}, hue median '
          f'{np.median(hue[m]):.0f}, chroma median {np.median(chroma[m]):.3f}, mean sRGB {colors[m].mean(0).round(3)}')
    hist = np.histogram(lab[m, 0], bins=[0, .3, .4, .5, .55, .6, .65, .7, .75, .8, .85, .9, .95, 1.01])
    print('   L histogram', list(zip(hist[1][:-1].round(2), hist[0])))


x, y, z = mids[:, 0], mids[:, 1], mids[:, 2]
region('back fur (z < -0.15, 0.3 < y < 0.7, |x| < 0.08)', (z < -0.15) & (y > 0.3) & (y < 0.7) & (np.abs(x) < 0.08))
region('belly (z > 0.1, 0.25 < y < 0.6, |x| < 0.08)', (z > 0.1) & (y > 0.25) & (y < 0.6) & (np.abs(x) < 0.08))
region('head top (y > 0.9, |x| < 0.05, z < 0.15)', (y > 0.9) & (np.abs(x) < 0.05) & (z < 0.15))
region('muzzle (z > 0.2, 0.69 < y < 0.79)', (z > 0.2) & (y > 0.69) & (y < 0.79))
region('front horn (z > 0.22, y > 0.79)', (z > 0.22) & (y > 0.79))
region('ears (y > 0.93, |x| > 0.06)', (y > 0.93) & (np.abs(x) > 0.06))
region('arms (|x| > 0.2, 0.36 < y < 0.58)', (np.abs(x) > 0.2) & (y < 0.58) & (y > 0.36))
region('paws (|x| > 0.17, 0.25 < y < 0.31, z > -0.06)', (np.abs(x) > 0.17) & (y < 0.31) & (y > 0.25) & (z > -0.06))
region('legs (0.04 < y < 0.16, |x| > 0.04)', (y > 0.04) & (y < 0.16) & (np.abs(x) > 0.04))
region('toes (y < 0.04, z > -0.03)', (y < 0.04) & (z > -0.03))
region('tail (z < -0.24, 0.1 < y < 0.27, |x| < 0.03)', (z < -0.24) & (y > 0.1) & (y < 0.27) & (np.abs(x) < 0.03))
