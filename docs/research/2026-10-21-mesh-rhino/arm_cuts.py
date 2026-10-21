"""Draws the horizontal cuts of the left arm of the rhino mesh at 13 heights, in the units of the
studio: x to the right and +z up in each panel, a grid of 0.02 u, and the middle of each panel at
x 0.2 and z -0.03. The cuts show where the thick arm joins the side of the trunk, with a notch at
its front and its back.

    uv run --no-project --with numpy --with pillow python -I arm_cuts.py <mesh.npz> <out.png>
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

m = np.load(sys.argv[1])
v, tris = m['v'], m['tris']
heights = [0.29, 0.31, 0.33, 0.35, 0.38, 0.41, 0.44, 0.47, 0.50, 0.53, 0.56, 0.59, 0.62]
W, PPU, CX, CZ = 400, 1200, 0.2, -0.03
out = Image.new('RGB', (W * 7, W * 2), 'white')
for n, h in enumerate(heights):
    im = Image.new('RGB', (W, W), 'white')
    d = ImageDraw.Draw(im)
    for k in range(-8, 9):
        X = W / 2 + k * 0.02 * PPU
        d.line([(X, 0), (X, W)], fill=(225, 225, 225))
        d.line([(0, X), (W, X)], fill=(225, 225, 225))
    for t in tris:
        p = v[t]
        dd = p[:, 1] - h
        pts = [p[a] + (p[b] - p[a]) * (dd[a] / (dd[a] - dd[b]))
               for a, b in ((0, 1), (1, 2), (2, 0)) if (dd[a] < 0) != (dd[b] < 0)]
        if len(pts) == 2:
            d.line([(W / 2 + (q[0] - CX) * PPU, W / 2 - (q[2] - CZ) * PPU) for q in pts],
                   fill='black', width=2)
    d.text((4, 4), f'y = {h}', fill='red')
    out.paste(im, ((n % 7) * W, (n // 7) * W))
out.save(sys.argv[2])
