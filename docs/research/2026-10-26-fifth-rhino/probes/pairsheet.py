# Builds a sheet of base | round pairs: rows = moments, columns = views; each cell has the base
# on the left and the round on the right, with a label. Optional crop box (shares) and scale.
# Usage: pairsheet.py <dir> <out> <moments> <views> [x,y,w,h] [scale]
import sys
from PIL import Image, ImageDraw
d, out, moments, views = sys.argv[1:5]
box = [float(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 and sys.argv[5] else None
scale = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
moments, views = moments.split(','), views.split(',')
def load(name):
    im = Image.open(f'{d}/{name}.png').convert('RGB')
    if box:
        w, h = im.size
        im = im.crop((int(box[0]*w), int(box[1]*h), int((box[0]+box[2])*w), int((box[1]+box[3])*h)))
    if scale != 1.0:
        im = im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
    return im
first = load(f'tubist-{moments[0]}-{views[0]}')
cw, ch = first.size
gap = 6
sheet = Image.new('RGB', (len(views) * (2*cw + gap) , len(moments) * (ch + gap)), (40, 40, 40))
dr = ImageDraw.Draw(sheet)
for r, m in enumerate(moments):
    for c, v in enumerate(views):
        x, y = c * (2*cw + gap), r * (ch + gap)
        sheet.paste(load(f'tubist-base-{m}-{v}'), (x, y))
        sheet.paste(load(f'tubist-{m}-{v}'), (x + cw, y))
        for t, xx in ((f'base {m} {v}', x), (f'round {m} {v}', x + cw)):
            dr.rectangle((xx, y, xx + 8*len(t)+8, y + 16), fill=(0, 0, 0))
            dr.text((xx + 4, y + 2), t, fill=(255, 255, 255))
sheet.save(out)
print(out, sheet.size)
