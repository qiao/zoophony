"""Writes a sheet of `pnpm close-views audit` as a webp of a third of the size.

Usage: shrink.py <in.png> <out.webp>
"""

import sys

from PIL import Image

im = Image.open(sys.argv[1]).convert('RGB')
im = im.resize((im.width // 3, im.height // 3), Image.LANCZOS)
im.save(sys.argv[2], quality=80)
print(sys.argv[2], im.size)
