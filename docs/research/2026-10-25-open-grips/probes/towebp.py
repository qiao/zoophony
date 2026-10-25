"""Writes each PNG as a WebP of at most the given width. Usage: towebp.py <width> <in.png> <out.webp>..."""

import sys

from PIL import Image

width = int(sys.argv[1])
args = sys.argv[2:]
for src, dst in zip(args[0::2], args[1::2]):
    im = Image.open(src).convert('RGB')
    if im.size[0] > width:
        im = im.resize((width, int(im.size[1] * width / im.size[0])), Image.LANCZOS)
    im.save(dst, quality=80)
    print(dst, im.size)
