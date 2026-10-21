"""Makes the lineup of the round stage-exposure: rows base, A, B, C, and the reference; columns
the user view (2022 x 1076, wheel 6), the close view of the strings (camera violins), and the
back rows (top of the camera 0,20,10). The reference row shows crops of orchestra-latest.png.
Usage: lineup.py <frames dir> <out.webp>, or lineup.py --final <dir of look-lab --base> <dir of
close-views play --base> <out.webp> for the rows base and final."""
import sys
from PIL import Image, ImageDraw, ImageFont
final = sys.argv[1] == '--final'
if final:
    lab, wide, out = sys.argv[2:5]
else:
    src, out = sys.argv[1], sys.argv[2]
CW, CH, LAB = 640, 340, 26
def fit(im, box=None):
    if box: im = im.crop(box)
    w, h = im.size; r = CW / CH
    if w / h > r: nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = int(w / r); im = im.crop((0, 0, w, nh)) if box is None else im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize((CW, CH), Image.LANCZOS)
rows = []
names = {'base': 'base (3017ca4c)', 'A': 'A: exposure 0.7, soft roll-off', 'B': 'B: A + pool, darker floor, beam, soft shadow', 'C': 'C: B + deep shadows, vignette 0.6'}
o = lambda p: Image.open(p).convert('RGB')
if final:
    for label, pre in (('base (306128ff)', 'play-base-'), ('final (variant B and the back-row lights)', 'play-')):
        rows.append((label, [fit(o(f'{wide}/{pre}drag0_0_6.png')), fit(o(f'{lab}/{pre}violins.png'), (0, 120, 1440, 700)), fit(o(f'{wide}/{pre}drag0_20_10.png'), (300, 0, 1900, 500))]))
for v in [] if final else ['base', 'A', 'B', 'C']:
    rows.append((names[v], [fit(o(f'{src}/{v}/wide/play-drag0_0_6.png')), fit(o(f'{src}/{v}/play-violins.png'), (0, 120, 1440, 700)), fit(o(f'{src}/{v}/wide/play-drag0_20_10.png'), (300, 0, 1900, 500))]))
ref = Image.open('docs/reference/orchestra-latest.png').convert('RGB')
rows.append(('reference: orchestra-latest.png (crops)', [fit(ref, (0, 200, 1762, 1240)), fit(ref, (100, 540, 760, 900)), fit(ref, (250, 160, 1600, 560))]))
cols = ['default view (user window, 2022 x 1076)', 'close: the strings (white fur)', 'the back rows']
W = Image.new('RGB', (3 * CW, LAB + len(rows) * (CH + LAB)), (20, 20, 20)); d = ImageDraw.Draw(W)
try: font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except Exception: font = ImageFont.load_default()
for i, c in enumerate(cols): d.text((i * CW + 8, 4), c, fill=(230, 230, 230), font=font)
for j, (label, cells) in enumerate(rows):
    y = LAB + j * (CH + LAB)
    d.text((8, y + 3), label, fill=(255, 210, 120), font=font)
    for i, cell in enumerate(cells): W.paste(cell, (i * CW, y + LAB))
W.save(out, quality=60, method=6)
