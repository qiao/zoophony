"""Prints the dark faces of the head of the polar bear mesh (as `face_colors()` of
tools/blender/rig_mesh.py finds them), in groups, and the Oklab lightness, hue, and chroma of the
light fur, in the units of the studio.

    blender -b --factory-startup --python dark_faces.py -- <root> <mesh.glb>
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
rules = {'samples': 6, 'dark': 0.05, 'eyeShare': 0.34}
colors, dark = rig['face_colors'](tris, uvs, texture, rules)[:2]
mid = verts[tris].mean(axis=1)
for name, mask in (('head', mid[:, 1] > 0.75), ('paws', (np.abs(mid[:, 0]) > 0.25) & (mid[:, 1] < 0.4)),
                   ('feet', mid[:, 1] < 0.06)):
    d = mask & dark
    print(name, 'dark faces', int(d.sum()))
    if name == 'head':
        for k in np.nonzero(d)[0]:
            print('  ', mid[k].round(3))
lab = np.array([rig['oklab'](c) for c in colors[~dark]])
print('light faces', len(lab), 'L median', np.median(lab[:, 0]).round(3), 'a', np.median(lab[:, 1]).round(4),
      'b', np.median(lab[:, 2]).round(4))
srgb = np.median(colors[~dark], axis=0)
print('median light color (linear?)', srgb.round(3))
