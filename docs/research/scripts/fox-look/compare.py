"""Puts the sheet views above the orthographic previews of fox_preview.py, at one scale.

    python3 compare.py <sheet> <preview-dir> <out> [head]
"""
import sys

from PIL import Image, ImageChops

sheet = Image.open(sys.argv[1]).convert('RGB')
pdir, out = sys.argv[2], sys.argv[3]
head = len(sys.argv) > 4
if head:
    # Head crops at 3 x: the sheet front head and side head, 300 x 300 px around each head.
    crops = [(225, 160, 525, 460), (1000, 160, 1300, 460)]
    names = ['headfront', 'headside']
    size = 600
    top = Image.new('RGB', (size * 2, size))
    bottom = Image.new('RGB', (size * 2, size))
    for i, (box, name) in enumerate(zip(crops, names)):
        top.paste(sheet.crop(box).resize((size, size), Image.LANCZOS), (i * size, 0))
        bottom.paste(Image.open(f'{pdir}/{name}.png').convert('RGB').resize((size, size)),
                     (i * size, 0))
else:
    crops = [(40, 97, 740, 1147), (750, 100, 1450, 1150), (1725, 106, 2425, 1156)]
    names = ['front', 'side', 'back']
    top = Image.new('RGB', (2100, 1050))
    bottom = Image.new('RGB', (2100, 1050))
    for i, (box, name) in enumerate(zip(crops, names)):
        top.paste(sheet.crop(box), (i * 700, 0))
        bottom.paste(Image.open(f'{pdir}/{name}.png').convert('RGB'), (i * 700, 0))
canvas = Image.new('RGB', (top.width, top.height * 2))
canvas.paste(top, (0, 0))
canvas.paste(bottom, (0, top.height))
canvas.save(out)
blend = Image.blend(top, bottom, 0.5)
blend.save(out.replace('.png', '-overlay.png'))
