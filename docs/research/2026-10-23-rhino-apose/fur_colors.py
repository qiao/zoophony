"""Prints the Oklab colors of the faces of the elephant mesh, as face_colors() of rig_mesh.py gives
them, in bands of lightness, and the Oklab of the colors of SPECIES_COLORS.elephant.

    blender -b --factory-startup --python fur_colors.py -- <root> <elephant.json>
"""
import json
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1 :]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
config = json.load(open(argv[1]))
code = open(RIG).read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
verts, tris, uvs, texture = rig['load_mesh'](config)
colors, dark, _ = rig['face_colors'](tris, uvs, texture, config['colors'])
lab = rig['oklab'](colors)
area = np.linalg.norm(np.cross(verts[tris[:, 1]] - verts[tris[:, 0]], verts[tris[:, 2]] - verts[tris[:, 0]]), axis=1) / 2
chroma = np.hypot(lab[:, 1], lab[:, 2])
hue = np.degrees(np.arctan2(lab[:, 2], lab[:, 1])) % 360
for lo in np.arange(0.3, 1.0, 0.05):
    m = (lab[:, 0] >= lo) & (lab[:, 0] < lo + 0.05)
    if m.sum():
        w = area[m] / area[m].sum()
        print(f'L {lo:.2f}..{lo + 0.05:.2f}: {m.sum():4d} faces, area {area[m].sum() / area.sum():.3f}, '
              f'a {np.sum(w * lab[m, 1]):+.4f} b {np.sum(w * lab[m, 2]):+.4f} chroma {np.sum(w * chroma[m]):.4f} '
              f'hue {np.degrees(np.arctan2(np.sum(w * lab[m, 2]), np.sum(w * lab[m, 1]))) % 360:.0f}')
for name, hexa in (('fur', 'a8a198'), ('belly', 'b9b2a8'), ('accent', 'b9a39a')):
    c = np.array([[int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4)]])
    l = rig['oklab'](c)[0]
    print(f'SPECIES_COLORS.elephant.{name} #{hexa}: L {l[0]:.4f} a {l[1]:+.4f} b {l[2]:+.4f} chroma {np.hypot(l[1], l[2]):.4f} hue {np.degrees(np.arctan2(l[2], l[1])) % 360:.0f}')
