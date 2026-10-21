"""Crops three singing penguins of `orchestra-side.png` at 8 times their size, for the opening of
their beaks.

    uv run --no-project --with pillow python -I reference_crops.py <orchestra-side.png> <out.png>
"""
import sys

from PIL import Image

im = Image.open(sys.argv[1]).convert('RGB')
crops = [im.crop((x, 270, x + 80, 330)).resize((640, 480), Image.LANCZOS) for x in (140, 220, 310)]
out = Image.new('RGB', (640 * 3, 480))
for i, c in enumerate(crops):
    out.paste(c, (640 * i, 0))
out.save(sys.argv[2])
