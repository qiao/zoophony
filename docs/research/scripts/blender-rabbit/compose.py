"""Puts the crops of the sheet above the previews of `preview.py`.

    python3 compose.py <rabbit-views.png> <render-dir> <out.png> [title]
"""

import sys

from PIL import Image, ImageDraw, ImageFont

sheet_path, render_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
title = sys.argv[4] if len(sys.argv) > 4 else ''
sheet = Image.open(sheet_path).convert('RGB')
# The crops of the sheet: front, profile, back. Each crop has the floor near its bottom.
crops = [(90, 105, 370, 565), (470, 105, 750, 565), (900, 105, 1180, 565)]
cell_w, cell_h = 420, 690
views = ['front', 'side', 'back']
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
except OSError:
    font = ImageFont.load_default()
canvas = Image.new('RGB', (cell_w * 4, cell_h * 2 + 40 + 40), (24, 22, 21))
d = ImageDraw.Draw(canvas)
caption = (
    'rabbit-views.png (top) and the Blender rabbit on the option A skeleton (bottom). '
    'The arms of the preview turn forward from the bind pose. '
)
d.text((12, 8), caption + title, fill=(230, 225, 215), font=font)
for i, box in enumerate(crops):
    crop = sheet.crop(box)
    crop = crop.resize((cell_w, int(crop.height * cell_w / crop.width)), Image.LANCZOS)
    canvas.paste(crop, (i * cell_w, 40))
for i, view in enumerate(views):
    image = Image.open(f'{render_dir}/rabbit.{view}.png').convert('RGB')
    image = image.resize((cell_w, int(image.height * cell_w / image.width)), Image.LANCZOS)
    canvas.paste(image, (i * cell_w, 40 + cell_h + 40))
head = Image.open(f'{render_dir}/rabbit.head.png').convert('RGB').resize((cell_w, cell_w))
canvas.paste(head, (3 * cell_w, 40 + cell_h + 40))
face = sheet.crop((520, 110, 700, 290)).resize((cell_w, cell_w), Image.LANCZOS)
canvas.paste(face, (3 * cell_w, 40))
labels = ['front', 'side (left)', 'back', 'head']
for i, label in enumerate(labels):
    d.text((i * cell_w + 12, 40 + cell_h + 8), label, fill=(200, 195, 185), font=font)
canvas.save(out)
