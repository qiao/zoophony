"""Makes the side-by-side image of one species: the scene crops, the Blender preview, the views
page of main and of the branch, and the default view of main and of the branch.

Usage: compose.py <species> <out.jpg> [<scratch-dir>/]
"""
import sys

from PIL import Image, ImageDraw

S = sys.argv[3] if len(sys.argv) > 3 else 'scratch/'
R = 'docs/reference/'
species, out = sys.argv[1], sys.argv[2]

if species == 'cat':
    scenes = [
        ('orchestra-side.png', (860, 620, 1300, 900)),
        ('orchestra-latest.png', (850, 520, 1210, 780)),
        ('lowpoly-animals.png', (735, 275, 1085, 475)),
    ]
    views = (0, 150, 1500, 960)
    default = (1060, 520, 1460, 860)
else:
    scenes = [
        ('orchestra-side.png', (850, 360, 1340, 660)),
        ('orchestra-latest.png', (740, 340, 1210, 560)),
        ('lowpoly-animals.png', (690, 40, 1145, 310)),
    ]
    views = (0, 1100, 1700, 1800)
    default = (700, 200, 1240, 520)

WIDTH = 2000
GAP = 8
BACK = (17, 17, 17)


def row(images, height):
    """Scales images to one height and puts them in one row."""
    cells = [im.resize((int(im.width * height / im.height), height), Image.LANCZOS) for im in images]
    canvas = Image.new('RGB', (sum(c.width for c in cells) + GAP * (len(cells) - 1), height), BACK)
    x = 0
    for c in cells:
        canvas.paste(c, (x, 0))
        x += c.width + GAP
    return canvas


def fit(im):
    """Scales a row to the width of the image."""
    return im.resize((WIDTH, int(im.height * WIDTH / im.width)), Image.LANCZOS)


def label(im, text):
    """Writes a label in the top left corner of a row."""
    draw = ImageDraw.Draw(im)
    draw.rectangle((0, 0, 9 * len(text) + 16, 26), fill=(0, 0, 0))
    draw.text((8, 7), text, fill=(255, 220, 120))
    return im


rows = [
    label(fit(row([Image.open(R + f).convert('RGB').crop(b) for f, b in scenes], 600)),
          'scenes: orchestra-side.png, orchestra-latest.png, lowpoly-animals.png'),
    label(fit(row([Image.open(f'{S}p{species}/{species}.seated.{v}.png').convert('RGB')
                   for v in ('front', 'side', 'back', 'head')], 600)),
          'Blender preview of the sculpt: front, side, back, head'),
    label(fit(row([Image.open(S + 'cap/main-views.png').convert('RGB').crop(views),
                   Image.open(S + 'cap/final-views.png').convert('RGB').crop(views)], 600)),
          'views page (front, side, back): main, then this branch'),
    label(fit(row([Image.open(S + 'cap/main-first-boulanger-matin.png').convert('RGB').crop(default),
                   Image.open(S + 'cap/final-first-boulanger-matin.png').convert('RGB').crop(default)],
                  600)),
          'default view of Boulanger: main, then this branch'),
]
canvas = Image.new('RGB', (WIDTH, sum(r.height for r in rows) + GAP * (len(rows) - 1)), BACK)
y = 0
for r in rows:
    canvas.paste(r, (0, y))
    y += r.height + GAP
canvas.save(out, quality=72, optimize=True)
