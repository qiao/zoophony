"""Composes the images of the report from the renders of shots.ts and of pnpm close-views play.

    uv run --no-project --with pillow python -I docs/research/2026-10-18-panda-marks/compose.py \
        marks <before dir> <stage png> <out.png>
    uv run --no-project --with pillow python -I docs/research/2026-10-18-panda-marks/compose.py \
        compare <before dir> <after dir> <stage before> <stage after> <out.png>

`marks` numbers each dark mark on the torso of main, with a legend of its faces and its cause.
`compare` puts each view of main above the same view of the round, at the same scale.
"""
import sys

from PIL import Image, ImageDraw, ImageFont

VIEWS = ['front', 'q-left', 'left', 'q-right', 'right']
SCALE = 0.5
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
STAGE_BOX = (800, 300, 1440, 900)

#: The places of the numbers of the marks in each view, in the pixels of a 600 x 750 render.
LABELS = {
    'rest-front': [(6, 190, 470)],
    'rest-q-left': [(4, 425, 455), (6, 160, 385)],
    'rest-left': [(2, 245, 400), (4, 235, 495)],
    'rest-q-right': [(1, 165, 425), (3, 215, 490)],
    'rest-right': [(1, 340, 392), (3, 400, 478)],
    'first-front': [(5, 330, 372), (4, 495, 415), (6, 120, 335)],
    'first-q-left': [(5, 215, 330), (4, 430, 405)],
    'first-left': [(2, 300, 385), (4, 310, 465)],
    'first-q-right': [(1, 150, 425), (6, 330, 485)],
    'first-right': [(1, 330, 420), (3, 385, 485)],
}
STAGE_LABELS = [(2, 412, 269), (2, 162, 394)]

LEGEND = [
    '1  Black wedges under the right arm. Faces 359, 485, 488, 493: 39% to 46% dark texture samples, '
    'black from the share 0.34 (eyeShare). The arm stretches them 1.6 to 1.8 times. Fixed (colors.border).',
    '2  Black notch under the left arm. Faces 1943, 2620, 2621: 36% to 46% dark samples, the same cause. '
    'Fixed (colors.border).',
    '3  Gray streaks under the right arm. Faces 314, 315, 316, 482, 483: white faces between the trunk and '
    'corners with 49% to 70% upper arm weight, which the raised arm pulls 12 to 16 cm. Shading. Open.',
    '4  Gray streaks under the left arm. Faces 1232, 1567, 1978, 1979: the same cause, corners with 44% to '
    '58% upper arm weight, pulled 8 to 11 cm. Shading. Open.',
    '5  Dark band across the belly in the play pose: the cast shadow of the left arm, 18.0% of the belly '
    'box of the front view. True shadow. Stays.',
    '6  Shadows of the arms and the hands on the belly. True shadows. Stay.',
]


def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def panel(path, labels, box=None):
    im = Image.open(path).convert('RGB')
    if box:
        im = im.crop(box)
    draw = ImageDraw.Draw(im)
    for number, x, y in labels:
        draw.ellipse([x - 17, y - 17, x + 17, y + 17], outline=(255, 230, 0), width=4)
        draw.text((x + 20, y - 18), str(number), fill=(255, 230, 0), font=font(30),
                  stroke_width=3, stroke_fill=(0, 0, 0))
    return im.resize((int(im.width * SCALE), int(im.height * SCALE)))


def caption(im, text):
    draw = ImageDraw.Draw(im)
    f = font(15)
    draw.rectangle([0, 0, 8 + int(draw.textlength(text, font=f)), 21], fill=(0, 0, 0))
    draw.text((4, 2), text, fill=(255, 255, 255), font=f)
    return im


def marks(before, stage, out):
    cells = []
    for moment in ('rest', 'first'):
        for view in VIEWS:
            name = f'{moment}-{view}'
            cells.append(caption(panel(f'{before}/{name}.png', LABELS[name]),
                                 f'main, {"rest" if moment == "rest" else "play"}, {view}'))
    stage_cell = caption(panel(stage, STAGE_LABELS, STAGE_BOX), 'main, stage close shot, play')
    w, h = cells[0].size
    legend_h = 22 * len(LEGEND) + 16
    sheet = Image.new('RGB', (w * 5 + stage_cell.width, max(h * 2, stage_cell.height) + legend_h),
                      (24, 24, 24))
    for k, cell in enumerate(cells):
        sheet.paste(cell, ((k % 5) * w, (k // 5) * h))
    sheet.paste(stage_cell, (w * 5, 0))
    draw = ImageDraw.Draw(sheet)
    for k, line in enumerate(LEGEND):
        draw.text((10, max(h * 2, stage_cell.height) + 8 + 22 * k), line, fill=(240, 240, 240),
                  font=font(15))
    sheet.save(out)


def compare(before, after, stage_before, stage_after, out):
    rows = []
    for moment in ('rest', 'first'):
        label = 'rest' if moment == 'rest' else 'play'
        for tree, folder in (('main', before), ('round', after)):
            rows.append([caption(panel(f'{folder}/{moment}-{view}.png', []),
                                 f'{tree}, {label}, {view}') for view in VIEWS])
    stage = [caption(panel(path, [], STAGE_BOX), f'{tree}, stage close shot, play')
             for tree, path in (('main', stage_before), ('round', stage_after))]
    w, h = rows[0][0].size
    sheet = Image.new('RGB', (w * 5 + stage[0].width, h * 4), (24, 24, 24))
    for r, row in enumerate(rows):
        for c, cell in enumerate(row):
            sheet.paste(cell, (c * w, r * h))
    for k, cell in enumerate(stage):
        sheet.paste(cell, (w * 5, k * cell.height))
    sheet.save(out)


if sys.argv[1] == 'marks':
    marks(*sys.argv[2:5])
else:
    compare(*sys.argv[2:7])
