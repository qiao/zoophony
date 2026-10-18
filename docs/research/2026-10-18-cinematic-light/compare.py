import sys

from PIL import Image, ImageDraw

# The compare image of docs/research/2026-10-18-cinematic-light.md: orchestra-latest.png, then the
# frame of the camera orchestra at the start and at the end of the round, each 720 px wide. The two
# frames come from `pnpm look-lab <dir>` on each commit (play-orchestra.png). Run from the root:
# uv run --no-project --with pillow python -I docs/research/2026-10-18-cinematic-light/compare.py <start.png> <end.png>

WIDTH = 720
paths = [('reference', 'docs/reference/orchestra-latest.png'), ('start b6d09883', sys.argv[1]), ('end d1bb9738', sys.argv[2])]
cells = []
for label, path in paths:
    image = Image.open(path).convert('RGB')
    # The reference has the aspect 1.42, the frames 1.6: crop the reference to 1.6 around its middle.
    if image.width / image.height < 1.6:
        height = int(image.width / 1.6)
        top = (image.height - height) // 2
        image = image.crop((0, top, image.width, top + height))
    image = image.resize((WIDTH, int(WIDTH / 1.6)), Image.LANCZOS)
    ImageDraw.Draw(image).rectangle((0, 0, 8 * len(label) + 12, 20), fill=(0, 0, 0))
    ImageDraw.Draw(image).text((6, 4), label, fill=(255, 255, 255))
    cells.append(image)
sheet = Image.new('RGB', (WIDTH * len(cells), cells[0].height))
for i, cell in enumerate(cells):
    sheet.paste(cell, (i * WIDTH, 0))
sheet.save('docs/research/2026-10-18-cinematic-light/compare.webp', quality=82)
