"""Makes the images of the report from the frames of scratch/ (render-set.sh, variant.sh).
Usage: images.py <out dir>"""
import sys
import numpy as np
from PIL import Image, ImageDraw
out = sys.argv[1]
def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 7 * len(text) + 8, 14), fill=(0, 0, 0))
    d.text((4, 2), text, fill=(255, 255, 0))
    return im
def grid(cells, cols, path):
    w, h = cells[0].size
    rows = (len(cells) + cols - 1) // cols
    o = Image.new('RGB', (w * cols, h * rows), 'white')
    for i, c in enumerate(cells):
        o.paste(c, ((i % cols) * w, (i // cols) * h))
    o.save(path, quality=88)
def crop(path, box, scale):
    im = Image.open(path).convert('RGB').crop(box)
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
# The camera of the user: brahms-2 at 678.63 s, the right side and the back at 120 degrees.
user = (650, 410, 846, 556)
side = (600, 400, 820, 560)
cells = []
for az, box in (('120', user), ('90', side)):
    for name, d in (('main', 'scratch/set-main'), ('round', 'scratch/set-final2')):
        cells.append(label(crop(f'{d}/time-678.63/play-at-rabbit-az{az}.png', box, 3),
                           f'{name} brahms-2 678.63 s az {az}'))
grid(cells, 2, f'{out}/user-view-pairs.webp')
cells = []
for az, box in (('120', user), ('90', side)):
    for name, path in (('main', 'scratch/set-main/time-678.63'),
                       ('caps of the body, both sides', 'scratch/set-v1/time-678.63'),
                       ('caps and rim, both sides', 'scratch/set-final/time-678.63'),
                       ('round: caps and rim, right', 'scratch/set-final2/time-678.63'),
                       ('fill, run only', 'scratch/var/fill-r0-n/play'),
                       ('fill, run and 1 ring', 'scratch/var/fill-r1-n/play')):
        cells.append(label(crop(f'{path}/play-at-rabbit-az{az}.png', box, 2), f'{name} az {az}'))
grid(cells, 3, f'{out}/variants.webp')
CUT = {'R': [415, 421, 572, 419, 420, 357, 356, 226],
       'L': [1822, 1299, 1298, 1297, 1826, 1825, 1044, 1824, 1045, 1046, 1035, 1036]}
cells = []
for fr in ('678.63:120:R', '678.63:90:R', '608.88:120:R', '376.23:90:R', '252.50:90:R',
           '252.50:60:R', '678.63:-120:L', '376.23:-120:L'):
    t, az, s = fr.split(':')
    ids = np.fromfile(f'scratch/ids/id-{t}-{az}.bin', np.int32).reshape(900, 1440)
    ys, xs = np.nonzero(np.isin(ids, CUT[s]))
    cy, cx = int(ys.mean()), int(xs.mean())
    box = (cx - 110, cy - 80, cx + 110, cy + 60)
    for name, d in (('main', 'scratch/set-main'), ('round', 'scratch/set-final2')):
        cells.append(label(crop(f'{d}/time-{t}/play-at-rabbit-az{az}.png', box, 2),
                           f'{name} brahms-2 {t} s az {az} {s}'))
grid(cells, 4, f'{out}/frame-pairs.webp')
