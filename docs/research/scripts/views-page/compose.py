"""Puts a model sheet above its views page, at the size of the sheet.

    python3 compose.py <sheet.png> <page.png> <out.png> [width]

With a width, the image is scaled to that width. It also writes <out>-blend.png, a blend of the
sheet and the page at one half each.
"""
import sys

from PIL import Image

sheet = Image.open(sys.argv[1]).convert('RGB')
page = Image.open(sys.argv[2]).convert('RGB').resize(sheet.size, Image.LANCZOS)
out = sys.argv[3]
both = Image.new('RGB', (sheet.width, sheet.height * 2))
both.paste(sheet, (0, 0))
both.paste(page, (0, sheet.height))
blend = Image.blend(sheet, page, 0.5)
if len(sys.argv) > 4:
    width = int(sys.argv[4])
    both = both.resize((width, round(both.height * width / both.width)), Image.LANCZOS)
    blend = blend.resize((width, round(blend.height * width / blend.width)), Image.LANCZOS)
both.save(out, optimize=True)
blend.save(out.replace('.png', '-blend.png'), optimize=True)
