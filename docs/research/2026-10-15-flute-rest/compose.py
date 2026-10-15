import sys
from PIL import Image, ImageDraw, ImageFont
d, photo, out = sys.argv[1], sys.argv[2], sys.argv[3]
views = ['front', 'left', 'right']
rows = []
for prefix, label in [('flutist-base-rest', 'main'), ('flutist-rest', 'flute-rest')]:
    ims = [Image.open(f'{d}/{prefix}-{v}.png').convert('RGB') for v in views]
    w = sum(i.width for i in ims); h = ims[0].height
    row = Image.new('RGB', (w, h), 'black')
    x = 0
    for i, v in zip(ims, views):
        row.paste(i, (x, 0))
        ImageDraw.Draw(row).text((x + 8, 8), f'{label}: rest, {v}', fill='white', font=ImageFont.load_default(size=16))
        x += i.width
    rows.append(row)
grid_h = sum(r.height for r in rows); grid_w = rows[0].width
p = Image.open(photo).convert('RGB')
# The fourth seated player of the front row, with his flute and his hands.
crop = p.crop((288, 150, 378, 345))
scale = grid_h / crop.height
crop = crop.resize((round(crop.width * scale), grid_h), Image.LANCZOS)
outim = Image.new('RGB', (grid_w + crop.width, grid_h), 'black')
y = 0
for r in rows:
    outim.paste(r, (0, y)); y += r.height
outim.paste(crop, (grid_w, 0))
dr = ImageDraw.Draw(outim)
dr.rectangle((grid_w, grid_h - 64, grid_w + crop.width, grid_h), fill='black')
dr.text((grid_w + 8, grid_h - 58), 'Georges Laurent, BSO woodwinds 1925', fill='white', font=ImageFont.load_default(size=14))
dr.text((grid_w + 8, grid_h - 38), 'Carl J. Horner, public domain', fill='white', font=ImageFont.load_default(size=14))
dr.text((grid_w + 8, grid_h - 18), '(Wikimedia Commons)', fill='white', font=ImageFont.load_default(size=14))
outim.save(out, 'WEBP', quality=82)
print(outim.size)
