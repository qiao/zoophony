"""Counts the dark faces of the deer mesh by region for each dark limit, as `face_colors()` of
tools/blender/rig_mesh.py finds them, and prints the Oklab lightness, hue, and chroma of the faces
of each region.

    blender -b --factory-startup --python dark_probe.py -- <root> <deer.glb>
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


def region(m):
    x, y, z = m
    if y > 0.85:
        return 'antlers (y > 0.85)'
    if y > 0.672 and abs(x) > 0.1:
        return 'ears'
    if y > 0.672:
        return 'head'
    if abs(x) > 0.13 and y < 0.42:
        return 'hands'
    if y < 0.06:
        return 'hooves (y < 0.06)'
    if z < -0.095 and 0.28 < y < 0.43:
        return 'tail'
    return 'body and legs'


names = [region(m) for m in mids]
for dark_limit in (0.05, 0.02, 0.0093):
    colors, dark, share = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': dark_limit, 'eyeShare': 0.34})
    counts = {}
    for f in np.nonzero(dark)[0]:
        counts[names[f]] = counts.get(names[f], 0) + 1
    print(f'dark {dark_limit}: {int(dark.sum())} dark faces', dict(sorted(counts.items())))
colors, dark, share = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': 0.0093, 'eyeShare': 0.34})
lab = rig['oklab'](colors)
hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
chroma = np.hypot(lab[:, 1], lab[:, 2])
print('Oklab L, hue, chroma of the light faces by region (median), dark limit 0.0093:')
for name in sorted(set(names)):
    k = np.array([n == name and not d for n, d in zip(names, dark)])
    if k.any():
        print(f'  {name}: {k.sum()} faces, L {np.median(lab[k, 0]):.3f}, hue {np.median(hue[k]):.0f}, chroma {np.median(chroma[k]):.3f}')
belly = np.array([n == 'body and legs' for n in names]) & ~dark
light = belly & (lab[:, 0] > 0.75)
print(f'  body and legs, L above 0.75 (the cream belly): {light.sum()} faces, L {np.median(lab[light, 0]):.3f}, hue {np.median(hue[light]):.0f}, chroma {np.median(chroma[light]):.3f}')
fur = belly & (lab[:, 0] <= 0.75)
print(f'  body and legs, L up to 0.75 (the brown fur): {fur.sum()} faces, L {np.median(lab[fur, 0]):.3f}, hue {np.median(hue[fur]):.0f}, chroma {np.median(chroma[fur]):.3f}')
