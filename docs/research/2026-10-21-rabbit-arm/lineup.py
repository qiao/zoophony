"""Makes the lineup of the round: for each view, the source mesh in Blender (source/), the close
view of main, of the round, and of main with no shadow on the rabbit, side by side.
Usage: lineup.py <close dir with --base> <no-shadow dir> <out>"""
import sys
from PIL import Image, ImageDraw
close, flat, out = sys.argv[1:4]
here = sys.argv[0].rsplit('/', 1)[0]
rows = [('front', 'rest-front'), ('back', 'rest-back'), ('right', 'frog-right'), ('left', 'lift50-left'),
        ('left', 'tip-left'), ('back-right', 'frog-back')]
W = 300
def cell(path, box, text):
    im = Image.open(path).convert('RGB')
    if box: im = im.crop(box)
    im = im.resize((W, W), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 7 * len(text) + 6, 14), fill=(0, 0, 0)); d.text((3, 2), text, fill=(255, 255, 0))
    return im
o = Image.new('RGB', (W * 4, W * len(rows)), 'white')
for r, (src, view) in enumerate(rows):
    box = (110, 220, 610, 720)
    cells = [cell(f'{here}/source/{src}.webp', None, f'source {src}'),
             cell(f'{close}/violinist-base-{view}.png', box, f'main {view}'),
             cell(f'{close}/violinist-{view}.png', box, f'round {view}'),
             cell(f'{flat}/violinist-{view}.png', box, f'main, no self-shadow')]
    for k, c in enumerate(cells):
        o.paste(c, (k * W, r * W))
o.save(out, quality=88)
