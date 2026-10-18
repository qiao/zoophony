from PIL import Image, ImageDraw

# Writes compare.webp: crops of the reference (left) and of the play frame (right) for the
# findings of docs/research/2026-10-17-cinematic-lighting.md. Row 1: stands and chairs with
# their shadows. Row 2: the podium and the floor in front of it. Row 3: the lit floor boxes of
# floor_measure.py, three of each image.
# Run from the root of the repository:
# uv run --no-project --with pillow python -I docs/research/2026-10-17-cinematic-lighting/compare.py

REFERENCE = 'docs/reference/orchestra-latest.png'
APP = 'docs/snapshots/2026-10-17-eb4002fe/play-1440x900.webp'
OUT = 'docs/research/2026-10-17-cinematic-lighting/compare.webp'
CELL = (480, 300)

ROWS = [
    ((REFERENCE, (1150, 620, 1650, 932), 'reference: cello stands'), (APP, (900, 480, 1300, 730), 'app: viola stands')),
    ((REFERENCE, (750, 990, 1250, 1240), 'reference: podium'), (APP, (430, 520, 830, 720), 'app: podium and rabbits')),
]
LIT = [
    (REFERENCE, [(1330, 930, 1380, 985), (700, 1050, 860, 1150), (1220, 1040, 1340, 1110)], 'reference: lit floor'),
    (APP, [(780, 660, 900, 700), (560, 640, 660, 700), (520, 700, 660, 740)], 'app: lit floor'),
]


def label(image, text):
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 8 + 6 * len(text), 16), fill=(0, 0, 0))
    draw.text((4, 3), text, fill=(255, 255, 255))


images = {path: Image.open(path).convert('RGB') for path in (REFERENCE, APP)}
out = Image.new('RGB', (CELL[0] * 2, CELL[1] * 2 + 100), (0, 0, 0))
for row, cells in enumerate(ROWS):
    for column, (path, box, text) in enumerate(cells):
        crop = images[path].crop(box)
        crop.thumbnail(CELL)
        label(crop, text)
        out.paste(crop, (column * CELL[0], row * CELL[1]))
for column, (path, boxes, text) in enumerate(LIT):
    strip = Image.new('RGB', (CELL[0], 100))
    for i, box in enumerate(boxes):
        strip.paste(images[path].crop(box).resize((160, 100)), (i * 160, 0))
    label(strip, text)
    out.paste(strip, (column * CELL[0], CELL[1] * 2))
out.save(OUT, quality=82)
print(OUT, out.size)
