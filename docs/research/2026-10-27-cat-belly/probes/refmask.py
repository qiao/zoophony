import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open('docs/reference/cat-views.png').convert('RGB')).astype(int)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
cat = (r - b > 4) | (lum < 165)
Image.fromarray((cat * 255).astype(np.uint8)).crop((0, 150, 1536, 850)).resize((768, 350)).save('scratch/v/ref-mask.png')
# Front view: columns 60..400. For each row, the run of cat pixels around the trunk middle x.
def runs(row, x0, x1, mid):
    xs = np.nonzero(row[x0:x1])[0] + x0
    # the connected run that holds mid
    if not row[mid]:
        return None
    a = mid
    while a > x0 and row[a - 1]: a -= 1
    c = mid
    while c < x1 - 1 and row[c + 1]: c += 1
    return a, c
print('front view: row, left x, right x, width (px)')
for y in range(380, 720, 10):
    rr = runs(cat[y], 60, 400, 202)
    print(y, rr, None if rr is None else rr[1] - rr[0])
print('side view: row, back x, front x (px)')
for y in range(380, 720, 10):
    rr = runs(cat[y], 420, 760, 600)
    print(y, rr)
