"""Makes the signed distance field of the sheet matte, for the silhouette carve of phase 3.

    uv run --no-project --with pillow --with numpy --with scipy \
        python tools/spike/fox-gated/matte_field.py <matte.png> <field.npy>

A pixel is allowed when the matte is fox (255) or ignored (128). The field is positive inside
the allowed region and negative outside, in meters (737 px for each meter), as float16.
"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

#: The scale of the sheet, in pixels for each meter.
PPM = 737.0


def main():
    matte = np.asarray(Image.open(sys.argv[1]).convert('L'))
    allowed = matte > 0
    inside = ndimage.distance_transform_edt(allowed)
    outside = ndimage.distance_transform_edt(~allowed)
    field = np.where(allowed, inside - 0.5, -(outside - 0.5)) / PPM
    np.save(sys.argv[2], field.astype(np.float16))
    print('field', field.shape, float(field.min()), float(field.max()))


if __name__ == '__main__':
    main()
