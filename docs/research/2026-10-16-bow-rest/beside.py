"""Puts the rest of the branch beside the two images of the user, as one WebP image below 300 kB.

Usage, from the root of the worktree:

    uv run --no-project --with pillow python -I docs/research/2026-10-16-bow-rest/beside.py \
        <user-bow-target.png> <user-bow-clip.png> <close-views dir> <out.webp>
"""

import sys

from PIL import Image, ImageDraw

target, clip, views, out = sys.argv[1:5]
HEIGHT = 560


def scaled(path: str, height: int = HEIGHT) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return image.resize((round(image.width * height / image.height), height))


def label(image: Image.Image, text: str) -> Image.Image:
    draw = ImageDraw.Draw(image)
    box = draw.textbbox((8, 8), text)
    draw.rectangle((box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4), fill=(20, 20, 20))
    draw.text((8, 8), text, fill=(255, 255, 255))
    return image


cells = [
    label(scaled(target), "user: target"),
    label(scaled(f"{views}/species-fox-red-rest-front.png"), "branch: red fox, rest, front"),
    label(scaled(f"{views}/species-rabbit-rest-front.png"), "branch: rabbit, rest, front"),
    label(scaled(f"{views}/species-fox-red-rest-front35.png"), "branch: red fox, rest, front35"),
]
top = Image.new("RGB", (sum(c.width for c in cells), HEIGHT), (0, 0, 0))
x = 0
for cell in cells:
    top.paste(cell, (x, 0))
    x += cell.width
bottom = [label(scaled(clip, 420), "user: main at rest")]
try:
    bottom.append(label(scaled(f"{views}/play-violins.png", 420), "branch: play frame, violins"))
except FileNotFoundError:
    pass
row = Image.new("RGB", (sum(c.width for c in bottom), 420), (0, 0, 0))
x = 0
for cell in bottom:
    row.paste(cell, (x, 0))
    x += cell.width
sheet = Image.new("RGB", (max(top.width, row.width), HEIGHT + 420), (0, 0, 0))
sheet.paste(top, (0, 0))
sheet.paste(row, (0, HEIGHT))
quality = 80
while True:
    sheet.save(out, "WEBP", quality=quality)
    import os

    if os.path.getsize(out) < 300_000 or quality <= 30:
        break
    quality -= 10
print(out, sheet.size, os.path.getsize(out), "bytes, quality", quality)
