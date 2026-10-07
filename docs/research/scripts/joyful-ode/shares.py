"""Print the time with the choir, the time with the soloists, and the time of loud bars (mean
velocity 90 or more) of excerpts, from the bar table of structure.py.

Usage: python3 -I shares.py structure.txt
"""
import re, sys

rows = []
for line in open(sys.argv[1]):
    m = re.match(r'\s*(\d+)\s+(\d+)\s+([\d.]+)s n=\s*(\d+) v=\s*([\d.]+) (.*)', line)
    if m:
        rows.append((int(m[1]), float(m[3]), int(m[4]), float(m[5]), ' ' + m[6] + ' '))

EXCERPTS = {
    'A (216 to 330)': [(217, 331)],
    'B (543 to 590, 851 to 940)': [(544, 591), (854, 943)],
    'D (241 to 296, 543 to 594, 851 to 940)': [(242, 296), (544, 595), (854, 943)],
}

for name, ranges in EXCERPTS.items():
    total = choir = solo = loud = 0.0
    for first, last in ranges:
        for i, (bar, start, _, velocity, chans) in enumerate(rows):
            if not first <= bar <= last:
                continue
            length = rows[i + 1][1] - start if i + 1 < len(rows) else 1.8
            total += length
            choir += length if ' Choir ' in chans else 0
            solo += length if ' Solo ' in chans else 0
            loud += length if velocity >= 90 else 0
    print(f'{name}: {total:.1f} s, choir {choir:.1f} s ({100 * choir / total:.0f}%), '
          f'soloists {solo:.1f} s ({100 * solo / total:.0f}%), '
          f'loud bars {loud:.1f} s ({100 * loud / total:.0f}%)')
