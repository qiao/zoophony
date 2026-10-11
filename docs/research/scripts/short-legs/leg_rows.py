"""Counts the pixels of the leg rows in the difference image of `pnpm sheet-check`.

    uv run --no-project --with pillow python -I leg_rows.py <id>-diff.png <first leg row> \
        <column> <column> <column> <column>

The columns are the borders of the views (`viewColumns()` of tools/sheet-check.ts). The leg rows
are the rows from the first leg row of the sheet down. The script prints, for each view, the
pixels that only the sheet has, the pixels that only the page has, and the IoU of the leg rows.
"""
import sys
from PIL import Image

path, first = sys.argv[1], int(sys.argv[2])
cols = [int(c) for c in sys.argv[3:7]]
im = Image.open(path).convert('RGB')
w, h = im.size
px = im.load()
for name, x0, x1 in zip(['front', 'side', 'back'], cols[:3], cols[1:]):
    both = sheet = page = 0
    for y in range(first, h):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if (r, g, b) == (150, 150, 150):
                both += 1
            elif (r, g, b) == (230, 60, 60):
                sheet += 1
            elif (r, g, b) == (60, 110, 240):
                page += 1
    union = both + sheet + page
    iou = both / union if union else 1.0
    print(f'{name:5}  sheet only {sheet:6}  page only {page:6}  different {sheet + page:6}  leg IoU {iou:.3f}')
