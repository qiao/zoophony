"""Cuts the part of each cell of a moment sheet where the round differs from the base, after an
opening that drops the thin outline noise, and writes the base crops above the round crops.

Usage: python paw-crops.py <sheet.png> <moments> <crop> <out.png>
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

path, moments, crop, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
img = Image.open(path).convert('RGB')
im = np.asarray(img).astype(int)
h, w, _ = im.shape
half = h // 2
cw = w // moments
diff = np.abs(im[:half] - im[half:]).sum(axis=2) > 30
diff[:40] = False
blob = ndimage.binary_opening(diff, iterations=2)
sheet = Image.new('RGB', (crop * moments, crop * 2))
draw = ImageDraw.Draw(sheet)
for k in range(moments):
    cell = blob[:, k * cw : (k + 1) * cw]
    ys, xs = np.nonzero(cell)
    if len(xs) > 30:
        cx, cy = int(np.median(xs)), int(np.median(ys))
        note = f'{len(xs)} px'
    else:
        cx, cy = cw // 2, half // 2
        note = 'no change'
    x0 = min(max(0, k * cw + cx - crop // 2), w - crop)
    y0 = min(max(0, cy - crop // 2), half - crop)
    sheet.paste(img.crop((x0, y0, x0 + crop, y0 + crop)), (k * crop, 0))
    sheet.paste(img.crop((x0, half + y0, x0 + crop, half + y0 + crop)), (k * crop, crop))
    draw.text((k * crop + 4, crop - 14), note, fill=(255, 255, 0))
sheet.save(out)
