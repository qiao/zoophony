"""Measures the silhouette IoU of a render against the sheet matte, for each view.

    uv run --no-project --with pillow --with numpy \
        python tools/spike/fox-gated/gate.py <render.png> <matte.png> <diff.png> [<result.json>]

The render is an RGBA image at the size of the sheet. Its alpha is the silhouette of the model.
The matte comes from `sheet_matte.py`. The gate does not count the ignored pixels (value 128).
The views are the columns 0 to 829 (front), 830 to 1689 (side), and 1690 to the end (back).

The idea comes from `scripts/world_gate.py` of the skill `blender-image-to-3d` by Majid
Manzarpour (MIT license): the camera covers the world window of the matte, so the gate sees an
error of scale or of place. This version adds the 8 degree camera, the three views on one
sheet, and the ignored pixels.

The diff image shows gray where both have the fox, red where only the sheet has it, blue where
only the model has it, and dark violet for the ignored pixels.
"""

import json
import sys

import numpy as np
from PIL import Image

#: The first column of each view: front, side, back.
SPLITS = [('front', 0, 830), ('side', 830, 1690), ('back', 1690, 99999)]


def gate(render_path, matte_path):
    """Calculates the IoU of each view, and gives the results and the masks."""
    alpha = np.asarray(Image.open(render_path).convert('RGBA'))[..., 3] > 127
    matte = np.asarray(Image.open(matte_path).convert('L'))
    ref = matte == 255
    care = matte != 128
    results = {}
    for name, c0, c1 in SPLITS:
        r = ref[:, c0:c1] & care[:, c0:c1]
        m = alpha[:, c0:c1] & care[:, c0:c1]
        inter = float((r & m).sum())
        union = float((r | m).sum())
        results[name] = {
            'iou': round(inter / max(union, 1.0), 4),
            'sheet_only_pct': round(100.0 * float((r & ~m).sum()) / max(float(r.sum()), 1.0), 2),
            'model_only_pct': round(100.0 * float((m & ~r).sum()) / max(float(r.sum()), 1.0), 2),
        }
    return results, alpha, ref, care


def main():
    results, alpha, ref, care = gate(sys.argv[1], sys.argv[2])
    diff = np.full(alpha.shape + (3,), 40, np.uint8)
    diff[ref & alpha] = (150, 150, 150)
    diff[ref & ~alpha] = (230, 60, 60)
    diff[~ref & alpha] = (60, 110, 240)
    diff[~care] = (70, 30, 70)
    Image.fromarray(diff).save(sys.argv[3])
    for name, r in results.items():
        print('%-5s IoU %.3f  sheet only %5.1f%%  model only %5.1f%%' % (
            name, r['iou'], r['sheet_only_pct'], r['model_only_pct']))
    if len(sys.argv) > 4:
        with open(sys.argv[4], 'w') as f:
            json.dump(results, f, indent=2)


if __name__ == '__main__':
    main()
