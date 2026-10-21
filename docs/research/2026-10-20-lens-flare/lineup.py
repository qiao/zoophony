"""Makes the lineup images of the lens flare round (docs/research/2026-10-20-lens-flare.md).

Usage: uv run --no-project --with pillow python -I lineup.py <frames dir> <out dir>

The frames dir holds one folder for each variant, with the frames of flare-frames.ts. Each
lineup has the columns main, subtle, medium, and strong. A shot lineup has the full frames in
the first row and a crop at full size in the second row. The brass lineup has one row of crops
at full size for each of the 3 frames, 1/24 s apart.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

COLUMNS = ['main', 'subtle', 'medium', 'strong']
LABEL = 22
CELL = (720, 450)
SHOTS = {
    'shot-115': (300, 0, 1020, 450),
    'shot-27': (720, 0, 1440, 450),
    'default-30': (360, 0, 1080, 450),
}
BRASS = (330, 430, 1050, 880)
BRASS_TIMES = ['86.0000 s', '86.0417 s', '86.0833 s']


def label(draw: ImageDraw.ImageDraw, x: int, y: int, text: str) -> None:
    draw.rectangle((x, y, x + CELL[0], y + LABEL), fill='white')
    draw.text((x + 6, y + 5), text, fill='black')


def lineup(rows: list[list[tuple[Image.Image, str]]], out: Path) -> None:
    width = CELL[0] * len(COLUMNS)
    height = (CELL[1] + LABEL) * len(rows)
    sheet = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(sheet)
    for r, row in enumerate(rows):
        for c, (image, text) in enumerate(row):
            x, y = c * CELL[0], r * (CELL[1] + LABEL)
            label(draw, x, y, text)
            sheet.paste(image, (x, y + LABEL))
    sheet.save(out, quality=88)
    print(out, sheet.size)


def main() -> None:
    frames, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for view, crop in SHOTS.items():
        images = [Image.open(frames / name / f'{view}.png').convert('RGB') for name in COLUMNS]
        whole = [(im.resize(CELL, Image.LANCZOS), f'{n}, {view}') for im, n in zip(images, COLUMNS)]
        parts = [(im.crop(crop), f'{n}, {view}, crop at full size') for im, n in zip(images, COLUMNS)]
        lineup([whole, parts], out / f'lineup-{view}.webp')
    rows = []
    for i, time in enumerate(BRASS_TIMES):
        row = []
        for name in COLUMNS:
            image = Image.open(frames / name / f'brass-{i}.png').convert('RGB')
            row.append((image.crop(BRASS), f'{name}, horns, song time {time}'))
        rows.append(row)
    lineup(rows, out / 'lineup-brass-86.webp')


main()
