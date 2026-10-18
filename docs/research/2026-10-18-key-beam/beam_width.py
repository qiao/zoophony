# The width of the beam at rows of a default frame, as a part of the stage width
# (docs/research/2026-10-18-key-beam.md). Usage: python3 beam_width.py <frame.png>...
import sys
from PIL import Image
def widths(path, rows, x0, x1, stage):
    im = Image.open(path).convert('L')
    out = []
    for y in rows:
        row = [im.getpixel((x, y)) for x in range(x0, x1)]
        base = sorted(row)[len(row) // 10]
        peak = sorted(row)[-len(row) // 50]
        thr = base + 0.5 * (peak - base)
        xs = [i for i, v in enumerate(row) if v >= thr]
        out.append(f'y{y}: {((xs[-1] - xs[0]) / stage if xs else 0):.2f} (peak {peak})')
    return '  '.join(out)
for path in sys.argv[1:]:
    if 'orchestra-latest' in path:
        print('ref ', widths(path, [10, 80, 150, 220], 250, 1510, 1762))
    else:
        print(path.split('/')[-2], widths(path, [10, 50, 90, 130], 300, 1140, 1040))
