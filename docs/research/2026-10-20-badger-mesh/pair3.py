import sys
from PIL import Image, ImageDraw
# pair3.py out height label=path:x0,y0,x1,y1 ...
out, H = sys.argv[1], int(sys.argv[2])
tiles = []
for arg in sys.argv[3:]:
    label, rest = arg.split('=', 1)
    path, box = rest.rsplit(':', 1)
    im = Image.open(path).convert('RGB').crop(tuple(map(int, box.split(','))))
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    ImageDraw.Draw(im).text((8, 8), label, fill=(255, 255, 0))
    tiles.append(im)
W = sum(t.width for t in tiles) + 4 * (len(tiles) - 1)
canvas = Image.new('RGB', (W, H), (255, 255, 255))
x = 0
for t in tiles:
    canvas.paste(t, (x, 0)); x += t.width + 4
canvas.save(out, quality=90)
