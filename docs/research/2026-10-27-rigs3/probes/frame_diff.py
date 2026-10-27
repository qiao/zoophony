"""Draws and counts the pixels of play frames that differ between main and the round (blurred by 2 px).

    frame_diff.py <dir> <out.png> <label>...
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
d, out = sys.argv[1], sys.argv[2]
outs = []
for label in sys.argv[3:]:
    a = np.asarray(Image.open(f'{d}/play-base-{label}.png').convert('RGB')).astype(int)
    b = np.asarray(Image.open(f'{d}/play-{label}.png').convert('RGB')).astype(int)
    diff = np.abs(ndimage.gaussian_filter(a.mean(2), 2) - ndimage.gaussian_filter(b.mean(2), 2))
    print(f'{label}: pixels that differ by more than 4: {int((diff > 4).sum())}, largest {diff.max():.1f}')
    o = (b * 0.5).astype(np.uint8)
    o[diff > 4] = [255, 0, 255]
    outs.append(Image.fromarray(o).resize((480, 300)))
sheet = Image.new('RGB', (960, 300 * ((len(outs) + 1) // 2)))
for i, im in enumerate(outs):
    sheet.paste(im, ((i % 2) * 480, (i // 2) * 300))
sheet.save(out)
