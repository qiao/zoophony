"""Cuts each sheet of a folder into parts of `n` moments, scaled to fit 2000 px wide.

    uv run --no-project --with pillow python -I scratch/halves.py <dir> <n>
"""
import glob
import sys

from PIL import Image

d, n = sys.argv[1], int(sys.argv[2])
for path in sorted(glob.glob(f'{d}/violist-sheet-*.png')):
    im = Image.open(path).convert('RGB')
    w = 576
    cols = im.size[0] // w
    for k in range(0, cols, n):
        part = im.crop((k * w, 0, min(cols, k + n) * w, im.size[1]))
        scale = min(1.0, 2000 / part.size[0])
        part = part.resize((int(part.size[0] * scale), int(part.size[1] * scale)), Image.LANCZOS)
        part.save(path.replace('.png', f'-part{k // n}.jpg'), quality=88)
