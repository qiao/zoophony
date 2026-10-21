# Plots the sway of one player on base and on the round.
import sys
from PIL import Image, ImageDraw
def read(p):
    rows = [l.split() for l in open(p) if not l.startswith('#')]
    return [(float(a), float(b)) for a, b in rows]
base, rnd, out, title = read(sys.argv[1]), read(sys.argv[2]), sys.argv[3], sys.argv[4]
W, H, M = 1200, 360, 50
t0, t1 = base[0][0], base[-1][0]
amp = max(abs(v) for _, v in base + rnd) or 1
im = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(im)
X = lambda t: M + (t - t0) / (t1 - t0) * (W - 2 * M)
Y = lambda v: H / 2 - v / amp * (H / 2 - M)
d.line([(M, H / 2), (W - M, H / 2)], fill=(200, 200, 200))
t = int(t0)
while t <= t1:
    d.line([(X(t), M - 10), (X(t), H - M + 10)], fill=(230, 230, 230)); d.text((X(t) - 8, H - M + 14), f'{t} s', fill='black'); t += 1
for data, color in ((base, (200, 60, 60)), (rnd, (40, 90, 200))):
    d.line([(X(a), Y(b)) for a, b in data], fill=color, width=2)
d.text((M, 10), title, fill='black')
d.text((M, 26), f'red: base 4cbcf30c, blue: round. Spine sway in degrees, peak {amp:.2f}', fill='black')
im.save(out)
