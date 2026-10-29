# Measures the mean color of the varnish of a string instrument in a box of an image.
# A pixel is varnish when its HSV saturation is at least 0.45, its value is between 0.15 and 0.9,
# and its hue is between 0 and 40 degrees (red to orange). The fur, the stage, and the black parts
# fall out. Usage: varnish.py <image> <x0,y0,x1,y1> [<mask out png>]
import colorsys
import sys

import numpy as np
from PIL import Image

path, box = sys.argv[1], tuple(int(v) for v in sys.argv[2].split(','))
im = np.asarray(Image.open(path).convert('RGB').crop(box), dtype=np.float64) / 255
flat = im.reshape(-1, 3)
hsv = np.array([colorsys.rgb_to_hsv(*p) for p in flat])
mask = (hsv[:, 1] >= 0.45) & (hsv[:, 2] >= 0.15) & (hsv[:, 2] <= 0.9) & (hsv[:, 0] <= 40 / 360)
sel = flat[mask]
mean = sel.mean(axis=0)
h, s, v = colorsys.rgb_to_hsv(*mean)
print(f'{path.split("/")[-1]} box {box} pixels {mask.sum()} of {len(flat)} '
      f'mean #{int(mean[0]*255):02x}{int(mean[1]*255):02x}{int(mean[2]*255):02x} '
      f'hue {h*360:.1f} sat {s:.3f} val {v:.3f}')
if len(sys.argv) > 3:
    out = (im * 255).astype(np.uint8).copy().reshape(-1, 3)
    out[~mask] = out[~mask] // 4
    Image.fromarray(out.reshape(im.shape)).resize((im.shape[1] * 3, im.shape[0] * 3), Image.NEAREST).save(sys.argv[3])
