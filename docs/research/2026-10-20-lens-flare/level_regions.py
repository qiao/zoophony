import sys, json
import numpy as np
from PIL import Image
regions = json.loads(sys.argv[1])
for f in sys.argv[2:]:
    a = np.asarray(Image.open(f).convert('RGB')).astype(float) / 255
    a[:150, :560] = 0
    l8 = 2 ** (a[..., 0] * 4) - 1
    l16 = 2 ** (a[..., 1] * 4) - 1
    out = [f.split('/')[-1]]
    for name, (x0, y0, x1, y1) in regions.items():
        out.append(f'{name}: L8 {l8[y0:y1, x0:x1].max():.3f} L16 {l16[y0:y1, x0:x1].max():.3f}')
    out.append(f'all: L8 {l8.max():.3f} L16 {l16.max():.3f}')
    print(' | '.join(out))
