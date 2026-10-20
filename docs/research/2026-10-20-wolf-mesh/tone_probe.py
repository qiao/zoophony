"""Gives the median Oklab a and b of the plain faces of the wolf mesh in bands of lightness, with
the dark limit 0.02 of the config, for the points of `colors.tone`.

    blender -b --factory-startup --python tone_probe.py -- <root> <wolf.glb>
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
colors, dark, share = rig['face_colors'](tris, uvs, texture, {'samples': 6, 'dark': 0.02, 'eyeShare': 0.34})
lab = rig['oklab'](colors)
chroma = np.hypot(lab[:, 1], lab[:, 2])
plain = ~dark & (chroma <= 0.06)
print(f'plain faces {int(plain.sum())} of {len(tris)}, faces with chroma above 0.06: {int((~dark & (chroma > 0.06)).sum())}')
for lo, hi in ((0.0, 0.35), (0.35, 0.45), (0.45, 0.55), (0.55, 0.65), (0.65, 0.75), (0.75, 0.85), (0.85, 0.95), (0.95, 1.01)):
    m = plain & (lab[:, 0] >= lo) & (lab[:, 0] < hi)
    if m.any():
        a, b = np.median(lab[m, 1]), np.median(lab[m, 2])
        print(f'L {lo:.2f}..{hi:.2f}: {int(m.sum())} faces, median a {a:+.4f} b {b:+.4f}, hue '
              f'{np.degrees(np.arctan2(b, a)) % 360:.0f}, chroma {np.hypot(a, b):.4f}')
hi_c = ~dark & (chroma > 0.06)
mids = verts[tris].mean(axis=1)
for f in np.nonzero(hi_c)[0][:20]:
    print(f'  chroma face {f}: mid {mids[f].round(3)} L {lab[f, 0]:.3f} chroma {chroma[f]:.3f}')
