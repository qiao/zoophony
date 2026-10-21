import sys
import numpy as np
from PIL import Image
for f in sys.argv[1:]:
    a = np.asarray(Image.open(f).convert('RGB')).astype(float) / 255
    a[:150, :560] = 0
    v = 2 ** (a * 4) - 1
    m = v.max(axis=2)
    print(f'{f.split("/")[-1]:16s} max {m.max():.4f}  mean {m.mean():.5f}  pixels>0.02 {(m > 0.02).sum()}')
