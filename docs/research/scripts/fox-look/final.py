"""Makes the final side-by-side image: the sheet above the views page, and close views.

    python3 final.py <sheet> <views.png (scale 3)> <play.png (2880 x 1800)> <orchestra-latest>
        <out.png>
"""
import sys

from PIL import Image, ImageDraw, ImageFont

sheet = Image.open(sys.argv[1]).convert('RGB')
views = Image.open(sys.argv[2]).convert('RGB')
play = Image.open(sys.argv[3]).convert('RGB')
latest = Image.open(sys.argv[4]).convert('RGB')
out = sys.argv[5]

try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
except OSError:
    font = ImageFont.load_default()

CELL_H = 620
BAR = 36


def fit(img, height):
    return img.resize((int(img.width * height / img.height), height), Image.LANCZOS)


def row(images, height, gap=8):
    cells = [fit(i, height) for i in images]
    width = sum(c.width for c in cells) + gap * (len(cells) - 1)
    canvas = Image.new('RGB', (width, height), (17, 17, 17))
    x = 0
    for c in cells:
        canvas.paste(c, (x, 0))
        x += c.width + gap
    return canvas


# The sheet: front, side, back, with the floor near the bottom.
sheet_cells = [sheet.crop(box) for box in
               ((60, 100, 760, 1130), (800, 100, 1500, 1130), (1690, 100, 2390, 1130))]
# The views page, scale 3, page y from 340: the red fox with the violin.
view_cells = [views.crop(((c - 82) * 3, (385 - 340) * 3, (c + 82) * 3, (612 - 340) * 3))
              for c in (103, 273, 421)]
# Close views: the head of the sheet, the head of the views page, the foxes of
# orchestra-latest.png, and the second violins of the default view.
close = [
    sheet.crop((205, 120, 585, 470)),
    views.crop((48 * 3, (378 - 340) * 3, 158 * 3, (480 - 340) * 3)),
    latest.crop((430, 480, 880, 800)),
    play.crop((605, 690, 1095, 1037)),
]
rows = [
    ('fox-views.png: front, side, back', row(sheet_cells, CELL_H)),
    ('this branch: the red fox of the views page (/views.html), front, side, back',
     row(view_cells, CELL_H)),
    ('close views: the head of the sheet and of the views page, the foxes of '
     'orchestra-latest.png, and the second violins of the default view', row(close, 420)),
]
width = max(r.width for _, r in rows)
height = sum(r.height + BAR for _, r in rows)
canvas = Image.new('RGB', (width, height), (17, 17, 17))
draw = ImageDraw.Draw(canvas)
y = 0
for title, image in rows:
    draw.text((10, y + 7), title, fill=(230, 225, 215), font=font)
    canvas.paste(image, (0, y + BAR))
    y += image.height + BAR
canvas.save(out, optimize=True)
print(canvas.size)
