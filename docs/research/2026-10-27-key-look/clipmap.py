# Marks the clipped light fur pixels (any channel >= 254) in magenta, beside the frame.
# Usage: python -I clipmap.py <out.png> <frame>...
import sys
import numpy as np
from PIL import Image
out = sys.argv[1]
rows = []
for path in sys.argv[2:]:
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    mx = a.max(axis=2); mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    luma = 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
    fur = (sat < 0.4) & (luma > 120)
    clip = fur & (a.max(axis=2) >= 254)
    b = a.copy()
    b[clip] = [255, 0, 255]
    pair = np.concatenate([a, b], axis=1).astype(np.uint8)
    rows.append(Image.fromarray(pair).resize((pair.shape[1] // 2, pair.shape[0] // 2)))
w = rows[0].width
sheet = Image.new('RGB', (w, sum(r.height for r in rows)))
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height
sheet.save(out)
