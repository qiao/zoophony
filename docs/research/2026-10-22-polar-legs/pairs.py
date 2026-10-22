"""Joins the close views of the base and of the round into one sheet for each moment: the base
row above the round row, one column for each view, with a label on each cell.

Usage: uv run --no-project --with pillow python -I pairs.py <dir> <out prefix> <scale>
"""
import sys

from PIL import Image, ImageDraw

src, out, scale = sys.argv[1], sys.argv[2], float(sys.argv[3])
views = ['front', 'back', 'left', 'right', 'az150', 'az-150']
for moment in ('chord', 'between', 'rest'):
    rows = [('main 2da5c8ec', f'pianist-base-{moment}-'), ('round', f'pianist-{moment}-')]
    cells = [[Image.open(f'{src}/{prefix}{v}.png').convert('RGB') for v in views] for _, prefix in rows]
    w, h = cells[0][0].size
    cw, ch = int(w * scale), int(h * scale)
    sheet = Image.new('RGB', (cw * len(views), ch * 2), 'black')
    draw = ImageDraw.Draw(sheet)
    for r, (label, _) in enumerate(rows):
        for c, img in enumerate(cells[r]):
            sheet.paste(img.resize((cw, ch)), (c * cw, r * ch))
            draw.rectangle((c * cw, r * ch, c * cw + 150, r * ch + 18), fill='black')
            draw.text((c * cw + 4, r * ch + 4), f'{label}: {moment}, {views[c]}', fill='white')
    sheet.save(f'{out}-{moment}.webp', quality=82)
    sheet.save(f'{out}-{moment}.png')
