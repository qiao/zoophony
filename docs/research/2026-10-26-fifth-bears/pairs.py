"""Makes a sheet of base and round pairs: pairs.py <out> <tile> <crop x,y,w,h or -> <dir> <label=hash>...

Each column is one camera: the base frame on top (play-base-pose-<hash>.png) and the frame of the
round below (play-pose-<hash>.png), with the label of the column.
"""
import sys

from PIL import Image, ImageDraw

out, tile, crop, folder = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
items = [a.split('=') for a in sys.argv[5:]]
sheet = Image.new('RGB', (len(items) * tile, 2 * tile + 24), 'white')
draw = ImageDraw.Draw(sheet)
for i, (label, h) in enumerate(items):
    for r, name in enumerate((f'play-base-pose-{h}.png', f'play-pose-{h}.png')):
        im = Image.open(f'{folder}/{name}').convert('RGB')
        if crop != '-':
            x, y, w, hh = map(int, crop.split(','))
            im = im.crop((x, y, x + w, y + hh))
        im = im.resize((tile, tile))
        sheet.paste(im, (i * tile, 24 + r * tile))
    draw.text((i * tile + 6, 5), f'{label}: base (top), round (bottom)', fill='black')
sheet.save(out)
