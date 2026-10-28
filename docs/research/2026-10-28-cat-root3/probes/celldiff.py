# celldiff.py <dir> <role>: for each moment and view of a sheet run, the share of pixels that
# differ by more than 24 levels between violist-base-<m>-<v>.png and violist-<m>-<v>.png.
import sys, os, glob
import numpy as np
from PIL import Image
d, role = sys.argv[1], sys.argv[2]
rows = []
for b in sorted(glob.glob(f'{d}/{role}-base-*.png')):
    name = os.path.basename(b)[len(role) + 6:]
    t = f'{d}/{role}-{name}'
    if not os.path.exists(t):
        continue
    IA, IB = Image.open(b), Image.open(t)
    if IA.size != IB.size or IA.size[0] * IA.size[1] > 2e7:
        continue
    A = np.asarray(IA.convert('RGB'), float)
    B = np.asarray(IB.convert('RGB'), float)
    diff = np.abs(A - B).max(axis=2) > 24
    rows.append((diff.mean() * 100, name))
for share, name in sorted(rows, reverse=True):
    print(f'{share:6.2f}% {name}')
