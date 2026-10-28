import sys
import numpy as np
from PIL import Image
for path in sys.argv[1:]:
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    mx = a.max(axis=2); mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    luma = 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
    fur = (sat < 0.4) & (luma > 120)
    n = fur.sum()
    print(f"{path}: fur px {n}, p50 {np.median(luma[fur]):.0f}, p90 {np.percentile(luma[fur],90):.0f}, any channel 255: {100*(a[fur].max(axis=1)>=254).mean():.1f}%")
