"""Measures the near eye patch of a reference panda: the dark pixels in a box of a BMP crop, and
the width of their box. Make the crops first with sips (macOS), from the root of the tree:

    sips -c 85 100 --cropOffset 505 420 docs/reference/orchestra-side.png --out /tmp/p2.png
    sips -s format bmp /tmp/p2.png --out /tmp/p2.bmp
    sips -c 90 360 --cropOffset 365 290 docs/reference/orchestra-latest.png --out /tmp/l.png
    sips -s format bmp /tmp/l.png --out /tmp/l.bmp
    uv run --no-project --with numpy python -I ref_patch.py /tmp/p2.bmp 28 54 40 64
    uv run --no-project --with numpy python -I ref_patch.py /tmp/l.bmp 28 56 198 228

A pixel is dark below the luma 0.3. The head width at the eye row is read from the printed map.
"""
import struct
import sys

import numpy as np


def bmp(path):
    """Reads an uncompressed BMP file as RGB from 0 to 1."""
    b = open(path, 'rb').read()
    off = struct.unpack_from('<I', b, 10)[0]
    w, h = struct.unpack_from('<ii', b, 18)
    bpp = struct.unpack_from('<H', b, 28)[0]
    stride = (w * bpp // 8 + 3) & ~3
    rows = [np.frombuffer(b, np.uint8, w * bpp // 8, off + y * stride).reshape(w, bpp // 8)
            for y in range(abs(h))]
    img = np.array(rows[::-1] if h > 0 else rows)[:, :, :3][:, :, ::-1]
    return img.astype(float) / 255


img = bmp(sys.argv[1])
luma = img @ [0.2126, 0.7152, 0.0722]
y0, y1, x0, x1 = map(int, sys.argv[2:6])
for y in range(img.shape[0]):
    print(f'{y:3d} ' + ''.join('#' if v < 0.3 else ('o' if v < 0.5 else ('.' if v < 0.75 else ' '))
                               for v in luma[y]))
sub = luma[y0:y1, x0:x1] < 0.3
ys, xs = np.nonzero(sub)
print(f'patch: {sub.sum()} dark px, box {xs.max() - xs.min() + 1} x {ys.max() - ys.min() + 1} px')
