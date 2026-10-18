import sys

from PIL import Image, ImageDraw

# The compare image of docs/research/2026-10-18-shot-light-lens-haze.md: the conductor, section,
# and solo shots of shots.ts, before (left) and after (right). Run from the root:
# uv run --no-project --with pillow python -I docs/research/2026-10-18-shot-light-lens-haze/compare.py <before dir> <after dir>

folders = sys.argv[1:3]
kinds = ['conductor', 'section', 'solo']
rows = []
for kind in kinds:
    row = Image.new('RGB', (1088, 340))
    for i, folder in enumerate(folders):
        image = Image.open(f'{folder}/{kind}.png').convert('RGB').crop((0, 70, 1080, 830))
        image = image.resize((540, 380)).crop((0, 20, 540, 360))
        ImageDraw.Draw(image).rectangle((0, 0, 150, 18), fill=(0, 0, 0))
        ImageDraw.Draw(image).text((4, 4), f'{kind}, {"before" if i == 0 else "after"}', fill=(255, 255, 255))
        row.paste(image, (i * 548, 0))
    rows.append(row)
sheet = Image.new('RGB', (1088, 348 * len(rows)))
for i, row in enumerate(rows):
    sheet.paste(row, (0, i * 348))
sheet.save('docs/research/2026-10-18-shot-light-lens-haze/compare.webp', quality=80)
