"""Counts the dark faces of colors.txt (colors_probe.py) by region of the monkey mesh, and prints
the dark faces of the head.

    python3 -I dark_regions.py <colors.txt>
"""
import collections
import re
import sys

sec, rows = None, {}
for line in open(sys.argv[1]).read().split('\n'):
    if not line.startswith('  face'):
        sec = line[:30]
        continue
    m = re.search(r'face (\d+): mid \[\s*([^\s\]]+)\s+([^\s\]]+)\s+([^\s\]]+)\s*\].*L (\S+) share (\S+)', line)
    rows.setdefault(sec, []).append((int(m.group(1)),) + tuple(map(float, m.groups()[1:])))
dark = next(r for s, r in rows.items() if s.startswith('dark faces'))
count = collections.Counter()
for f, x, y, z, light, share in dark:
    if y > 0.72:
        k = 'head (y > 0.72)'
    elif abs(x) > 0.2 and y < 0.42:
        k = 'hands (|x| > 0.2, y < 0.42)'
    elif y < 0.06:
        k = 'feet and tail curl (y < 0.06)'
    elif z < -0.06 and y < 0.27:
        k = 'tail (z < -0.06, y < 0.27)'
    else:
        k = 'other'
    count[k] += 1
print('dark faces', len(dark), dict(count))
print('other dark faces (first 20):')
for r in [r for r in dark if not (r[2] > 0.72 or (abs(r[1]) > 0.2 and r[2] < 0.42) or r[2] < 0.06 or (r[3] < -0.06 and r[2] < 0.27))][:20]:
    print('  ', r)
print('dark faces of the head:')
for r in sorted([r for r in dark if r[2] > 0.72], key=lambda r: r[1]):
    print('  ', r)
