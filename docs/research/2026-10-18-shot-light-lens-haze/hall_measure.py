import sys

from PIL import Image

# The luma of the hall above the stage, right of the beam (62% to 95% of the width, 2% to 14% of
# the height), in the reference and in frames of the camera orchestra
# (docs/research/2026-10-18-shot-light-lens-haze.md, section 2.2). Run from the root:
# uv run --no-project --with pillow python -I docs/research/2026-10-18-shot-light-lens-haze/hall_measure.py <label>=<frame.png>...

frames = [('reference', 'docs/reference/orchestra-latest.png')] + [tuple(arg.split('=', 1)) for arg in sys.argv[1:]]
for label, path in frames:
    image = Image.open(path).convert('RGB')
    w, h = image.size
    box = image.crop((int(w * 0.62), int(h * 0.02), int(w * 0.95), int(h * 0.14)))
    lumas = sorted(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in box.getdata())
    print('%-28s p10 %3.0f  p50 %3.0f  p90 %3.0f' % (label, lumas[len(lumas) // 10], lumas[len(lumas) // 2], lumas[9 * len(lumas) // 10]))
