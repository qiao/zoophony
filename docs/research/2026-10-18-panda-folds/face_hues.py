"""Counts the faces of a rig by Oklab lightness band, with the median a, b, chroma, and the faces
that are blue (b below -0.005): python -I docs/research/2026-10-18-panda-folds/face_hues.py <rig.glb>"""
import sys, importlib.util
import numpy as np
spec = importlib.util.spec_from_file_location('fc', 'docs/research/2026-10-18-panda-mesh/fur_colors.py')
src = open('docs/research/2026-10-18-panda-mesh/fur_colors.py').read().split('glb, render = sys.argv')[0]
ns = {}
exec(src, ns)
lab, area = ns['mesh_faces'](sys.argv[1])
for lo, hi in ((0, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.01)):
    m = (lab[:, 0] >= lo) & (lab[:, 0] < hi)
    c = np.hypot(lab[m, 1], lab[m, 2])
    print(f'L {lo}-{hi}: {m.sum()} faces, median a {np.median(lab[m,1]):+.4f} b {np.median(lab[m,2]):+.4f} chroma {np.median(c):.4f}, blue {int((lab[m,2] < -0.005).sum())}')
m = lab[:, 0] >= 0.8
b = lab[m, 2]; a = lab[m, 1]
print('white b percentiles 1,5,50,95,99:', np.round(np.percentile(b, [1, 5, 50, 95, 99]), 4), 'min', round(float(b.min()), 4), 'a range', round(float(a.min()), 4), round(float(a.max()), 4))
for lo, hi in ((0.8, 0.9), (0.9, 0.94), (0.94, 0.96), (0.96, 1.01)):
    m = (lab[:, 0] >= lo) & (lab[:, 0] < hi)
    if m.any():
        print(f'  L {lo}-{hi}: {m.sum()} faces, b median {np.median(lab[m,2]):+.4f} min {lab[m,2].min():+.4f}')
