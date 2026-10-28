import re, sys
from collections import defaultdict
worst = defaultdict(lambda: [0.0, 0, 0.0, 0.0])
n = 0
for line in sys.stdin:
    if line.startswith(('play', 'lift', 'lower', 'rest')): n += 1
    m = re.match(r'\s+(\w+): hull ([\d.]+) cm @-?\d+ dents (\d+) turn ([\d.]+) deg @-?\d+ ellipse (none|[\d.]+)', line)
    if m:
        k = m.group(1); w = worst[k]
        w[0] = max(w[0], float(m.group(2))); w[1] = max(w[1], int(m.group(3))); w[2] = max(w[2], float(m.group(4)))
        if m.group(5) != 'none': w[3] = max(w[3], float(m.group(5)))
    m = re.match(r'\s+patch facets: \d+ edges, angle p50 ([\d.]+) p90 ([\d.]+) max ([\d.]+)', line)
    if m:
        w = worst['facets']; w[0] = max(w[0], float(m.group(2))); w[2] = max(w[2], float(m.group(3)))
print(f'{n} samples')
for k in ('left', 'right', 'front', 'softL', 'softR', 'facets'):
    w = worst[k]
    print(f'  {k}: hull {w[0]:.2f} cm, dents {w[1]}, turn {w[2]:.1f} deg, ellipse {w[3]:.2f} cm' if k != 'facets' else f'  facets: p90 {w[0]:.1f}, max {w[2]:.1f} deg')
