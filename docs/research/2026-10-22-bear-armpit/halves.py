"""Splits each lineup crop of a folder into images of 3 views, for reading at a larger size."""
import glob, sys
from PIL import Image
for f in sorted(glob.glob(f'{sys.argv[1]}/conductor-lineup-*-crop2.png')):
    im = Image.open(f); W, H = im.size; n = int(sys.argv[2]) if len(sys.argv) > 2 else 6; w = W // n
    for k in range(0, n, 3):
        im.crop((k * w, 0, min(W, (k + 3) * w), H)).save(f.replace('.png', f'-h{k // 3}.png'))
