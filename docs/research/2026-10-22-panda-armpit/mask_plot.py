"""Draws the faces of the rhino mesh from the front, the left side, and the back: red for a face of
the free left arm, orange for a face with corners in the arm and in the body, and gray for the
body. The input is the file of arm_free.py.

    uv run --no-project --with numpy --with pillow python -I mask_plot.py <arm.npz> <out.png>
"""
import numpy as np, sys
from PIL import Image, ImageDraw
m = np.load(sys.argv[1]); v, t, L = m['v'], m['tris'], m['L']
W = 700; ppu = 650
out = Image.new('RGB', (W * 3, W), 'white')
views = [('front', 0, 1, 2, 1), ('left side', 2, 1, 0, 1), ('back', 0, 1, 2, -1)]
for k, (name, a, b, depth, s) in enumerate(views):
    im = Image.new('RGB', (W, W), 'white'); d = ImageDraw.Draw(im)
    order = np.argsort(v[t].mean(1)[:, depth] * (s if name != 'left side' else 1))
    for f in order:
        p = v[t[f]]
        if name == 'left side' and p[:, 0].mean() < 0: continue
        arm = L[t[f]]
        col = (220, 60, 60) if arm.all() else (240, 180, 60) if arm.any() else (150, 150, 170)
        xs = (p[:, a] * (s if name == 'back' else 1) * (-1 if name == 'left side' else 1)) * ppu + W / 2
        ys = W - 50 - p[:, b] * ppu
        d.polygon(list(zip(xs, ys)), fill=col, outline=(60, 60, 60))
    d.text((5, 5), name, fill='black')
    out.paste(im, (k * W, 0))
out.save(sys.argv[2])
