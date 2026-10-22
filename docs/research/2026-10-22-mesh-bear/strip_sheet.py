"""Makes a sheet of the frames of a strip of `pnpm close-views play <dir> --camera <JSON> --strip
<from>:<step>:<count>` whose camera aims at the conductor: the middle of each frame (the bear),
8 frames in each row, with the index of each frame.

    uv run --no-project --with pillow python -I strip_sheet.py <dir> <out.webp> <title>
"""
import glob
import sys

from PIL import Image, ImageDraw

folder, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
frames = sorted(glob.glob(f'{folder}/strip-*-[0-9][0-9].png'))
w, h = 300, 400
cols = 8
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h + 30), 'black')
d = ImageDraw.Draw(sheet)
d.text((6, 8), title, fill='white')
for k, path in enumerate(frames):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    box = (W // 2 - 270, int(H * 0.08), W // 2 + 270, int(H * 0.08) + 720)
    cell = im.crop(box).resize((w, h))
    sheet.paste(cell, ((k % cols) * w, 30 + (k // cols) * h))
    d.text(((k % cols) * w + 4, 30 + (k // cols) * h + 4), f'{k:02d}', fill='white')
sheet.save(out, quality=82)
