"""Makes the signed distance field of the sheet matte, for the silhouette carve of phase 3.

    uv run --no-project --with pillow --with numpy --with scipy \
        python tools/spike/fox-gated/matte_field.py <matte.png> <field.npy> [<fox-field.npy>]

A pixel is allowed when the matte is fox (255) or ignored (128). The field is positive inside
the allowed region and negative outside, in meters (737 px for each meter), as float16. The
silhouette carve of phase 3 uses it.

The optional second field allows only the fox pixels (255). The contour fit of the low-poly
pass (`lowpoly.py`) uses it to move the outline of the model to the outline of the sheet fox.
"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

#: The scale of the sheet, in pixels for each meter.
PPM = 737.0


def signed_field(allowed):
    """Gives the signed distance to the border of a mask, in meters, positive inside."""
    inside = ndimage.distance_transform_edt(allowed)
    outside = ndimage.distance_transform_edt(~allowed)
    return np.where(allowed, inside - 0.5, -(outside - 0.5)) / PPM


def main():
    matte = np.asarray(Image.open(sys.argv[1]).convert('L'))
    field = signed_field(matte > 0)
    np.save(sys.argv[2], field.astype(np.float16))
    print('field', field.shape, float(field.min()), float(field.max()))
    if len(sys.argv) > 3:
        np.save(sys.argv[3], signed_field(matte == 255).astype(np.float16))


if __name__ == '__main__':
    main()
