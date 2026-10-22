"""Makes a sheet of the strip pairs of close-views play: each frame of the base above the frame
of the tree, cropped to the middle of the frame, 8 frames in each row.
Usage: strip_pairs.py <dir> <out.webp> <title>"""
import glob, sys
from PIL import Image, ImageDraw
d, out, title = sys.argv[1:4]
trees = sorted(f for f in glob.glob(f'{d}/strip-pose-*-[0-9][0-9].png'))
bases = sorted(f for f in glob.glob(f'{d}/strip-base-pose-*-[0-9][0-9].png'))
cells = []
for b, t in zip(bases, trees):
    pair = []
    for f in (b, t):
        im = Image.open(f); W, H = im.size
        pair.append(im.crop((int(W * 0.3), int(H * 0.1), int(W * 0.7), int(H * 0.75))).resize((300, 270)))
    cells.append(pair)
cols = 8; rows = (len(cells) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 300, rows * 540 + 24), 'black')
dr = ImageDraw.Draw(sheet); dr.text((6, 6), title + ' (each pair: base above, round below)', fill='white')
for i, (b, t) in enumerate(cells):
    x, y = (i % cols) * 300, 24 + (i // cols) * 540
    sheet.paste(b, (x, y)); sheet.paste(t, (x, y + 270)); dr.text((x + 4, y + 4), f'{i:02d}', fill='white')
sheet.save(out, quality=80)
