import sys
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]
cells = [('crash','front'),('crash','left'),('rest','front'),('rest','left')]
rows = [('base 8010553b','cymbalist-base-'),('round','cymbalist-')]
ims = [[Image.open(f'{d}/{p}{m}-{v}.png').convert('RGB') for m,v in cells] for _,p in rows]
w,h = ims[0][0].size
s = 1
W,H = int(w*s), int(h*s)
canvas = Image.new('RGB',(W*4, (H+24)*2),'white')
dr = ImageDraw.Draw(canvas)
for r,(label,_) in enumerate(rows):
    for c,(m,v) in enumerate(cells):
        y = r*(H+24)
        dr.text((c*W+6, y+6), f'{label}: {m}, {v}', fill='black')
        canvas.paste(ims[r][c].resize((W,H)), (c*W, y+24))
canvas.save(out, quality=82)
print(canvas.size)
