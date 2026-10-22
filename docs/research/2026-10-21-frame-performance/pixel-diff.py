# Prints the pixel differences of frozen frames (the report 2026-10-21-frame-performance.md, a copy
# of the probe of 2026-10-13-frame-time/ with the shot perf-section and the count of changed pixels).
# Run: uv run --no-project --with pillow --with numpy python -I
#   docs/research/2026-10-21-frame-performance/pixel-diff.py <base dir> <dir>...
# The folders hold the PNG files of frozen.ts. For each shot, the line gives the mean absolute
# difference of the channels (0 to 255), the largest difference of a channel, the count of pixels
# with a difference in a channel, and the part of the pixels with a difference above 16.
import os
import sys

import numpy as np
from PIL import Image

SHOTS = ['play', 'conductor', 'perf-wide', 'perf-section']
base = sys.argv[1]
for d in sys.argv[2:]:
    parts = []
    for shot in SHOTS:
        path_a = f'{base}/{shot}.png'
        path_b = f'{d}/{shot}.png'
        if not (os.path.exists(path_a) and os.path.exists(path_b)):
            continue
        a = np.asarray(Image.open(path_a).convert('RGB'), dtype=np.int16)
        b = np.asarray(Image.open(path_b).convert('RGB'), dtype=np.int16)
        diff = np.abs(a - b)
        largest = int(diff.max())
        per_pixel = diff.max(axis=2)
        changed = int((per_pixel > 0).sum())
        above = float((per_pixel > 16).mean() * 100)
        parts.append(
            f'{shot} mean {diff.mean():.3f} max {largest} changed {changed} >16: {above:.2f}%'
        )
    print(f"{d.rstrip('/').split('/')[-1]}: " + ' | '.join(parts))
