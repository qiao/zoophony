"""Counts the sharp edges in the arm box of each role view cell: the pixels where the lightness
(cube root of the luminance) changes by more than LIMIT to the next pixel to the right or below.

    python3 scratch/edges.py <role> <box x0,y0,x1,y1> <name>=<dir>...
"""
import sys
from PIL import Image

LIMIT = 0.05
role = sys.argv[1]
x0, y0, x1, y1 = (int(v) for v in sys.argv[2].split(','))
moments = {'hornist': ['note', 'between', 'rest', 'lift50', 'lower50', 'stand'],
           'violinist': ['frog', 'tip', 'crossing', 'rest', 'lift50', 'lower50', 'stand'],
           'fox-violinist': ['frog', 'tip', 'crossing', 'rest', 'lift50', 'lower50', 'stand']}[role]
views = ['front', 'left', 'right', 'back']


def lightness(img):
    w, h = img.size
    px = img.load()
    lin = [((c / 255) ** 2.2) for c in range(256)]
    out = [[0.0] * w for _ in range(h)]
    for y in range(h):
        row = out[y]
        for x in range(w):
            r, g, b = px[x, y][:3]
            row[x] = (0.2126 * lin[r] + 0.7152 * lin[g] + 0.0722 * lin[b]) ** (1 / 3)
    return out


for item in sys.argv[3:]:
    name, d = item.split('=', 1)
    total = 0
    per = {}
    for m in moments:
        for v in views:
            img = Image.open(f'{d}/{role}-{m}-{v}.png').convert('RGB').crop((x0, y0, x1, y1))
            L = lightness(img)
            n = 0
            for y in range(len(L) - 1):
                a, b = L[y], L[y + 1]
                for x in range(len(a) - 1):
                    if abs(a[x + 1] - a[x]) > LIMIT or abs(b[x] - a[x]) > LIMIT:
                        n += 1
            per[f'{m}-{v}'] = n
            total += n
    front = sum(per[f'{m}-front'] for m in moments)
    print(f'{name}: {total} sharp edge px in all {len(per)} cells, {front} in the front cells')
