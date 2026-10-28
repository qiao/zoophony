# pairs.py <dir> <out.webp> <box x0,y0,x1,y1> <scale> <az>...: for each azimuth a column of the
# crop of play-base-at-cat-az<az>.png (main, above) and play-at-cat-az<az>.png (round, below).
import sys
from PIL import Image, ImageDraw
d, out, box, s = sys.argv[1], sys.argv[2], tuple(int(x) for x in sys.argv[3].split(',')), float(sys.argv[4])
azs = sys.argv[5:]
W, H = int((box[2] - box[0]) * s), int((box[3] - box[1]) * s)
sheet = Image.new('RGB', (len(azs) * (W + 6), 2 * (H + 22)), 'white')
dr = ImageDraw.Draw(sheet)
for c, az in enumerate(azs):
    for r, (lab, name) in enumerate((('main', 'play-base-at-cat-az'), ('round', 'play-at-cat-az'))):
        im = Image.open(f'{d}/{name}{az}.png').crop(box).resize((W, H), Image.LANCZOS)
        x, y = c * (W + 6), r * (H + 22)
        dr.text((x + 4, y + 4), f'{lab} az {az}', fill='black')
        sheet.paste(im, (x, y + 20))
sheet.save(out, quality=88)
