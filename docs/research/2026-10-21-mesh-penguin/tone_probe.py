"""Prints the Oklab colors of the plain faces of the penguin mesh (chroma at most 0.12, above the
feet, and light), as `face_colors()` of `tools/blender/rig_mesh.py` gives them, in bands of
lightness: the count, the median a and b, the median chroma and hue, and the move [dL, da, db]
that gives the median face of the band the hue and the chroma of the species color of its band
(`SPECIES_COLORS.penguin`: the fur below the lightness 0.5, the belly above it) with its own
lightness, as the tone rule of the panda and the hippo.

    blender -b --factory-startup --python tone_probe.py -- <root> <penguin.glb> <dark>
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
colors, dark, _ = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': float(argv[2]), 'eyeShare': 0.34})
mids = verts[tris].mean(axis=1)
lab = rig['oklab'](colors)
chroma = np.hypot(lab[:, 1], lab[:, 2])


def species(hex_color):
    rgb = np.array([int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    return rig['oklab'](lin[None, :])[0]


fur, belly = species('#1f1d1c'), species('#ece8e0')
for name, c in (('fur #1f1d1c', fur), ('belly #ece8e0', belly)):
    print(f'{name}: L {c[0]:.3f} a {c[1]:+.4f} b {c[2]:+.4f} chroma {np.hypot(c[1], c[2]):.4f} hue {np.degrees(np.arctan2(c[2], c[1])) % 360:.0f}')
plain = (chroma <= 0.12) & (mids[:, 1] > 0.1) & ~dark
print(f'plain faces: {int(plain.sum())} of {len(tris)}')
print('| L band | faces | median a | median b | median chroma | hue | move dL, da, db |')
print('|---|---|---|---|---|---|---|')
for lo in np.arange(0.1, 1.0, 0.05):
    m = plain & (lab[:, 0] >= lo) & (lab[:, 0] < lo + 0.05)
    if m.sum() == 0:
        continue
    a, b = np.median(lab[m, 1]), np.median(lab[m, 2])
    target = fur if lo < 0.5 else belly
    print(f'| {lo:.2f} to {lo + 0.05:.2f} | {int(m.sum())} | {a:+.4f} | {b:+.4f} | {np.hypot(a, b):.4f} | '
          f'{np.degrees(np.arctan2(b, a)) % 360:.0f} | 0, {target[1] - a:+.4f}, {target[2] - b:+.4f} |')
