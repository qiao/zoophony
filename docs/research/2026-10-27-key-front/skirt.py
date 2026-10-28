import sys
from PIL import Image
import numpy as np
for path in sys.argv[1:]:
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    luma = 0.2126*a[...,0] + 0.7152*a[...,1] + 0.0722*a[...,2]
    skirt = luma[712:742, 320:1120]
    lip = luma[690:705, 320:1120]
    print(f"{path.split('/')[-2]:28s} skirt p50 {np.median(skirt):6.1f}  lip p50 {np.median(lip):6.1f}")
