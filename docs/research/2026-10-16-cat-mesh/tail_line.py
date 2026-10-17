"""Measures the tail of the fox mesh from the cuts of `sections.py` (`sections-y.txt`), in the units
of the studio and in meters at the scale of the first config (0.9296 m for each unit).

    python3 tail_line.py sections-y.txt

The tail is the loop of each cut that lies behind z -0.04 and inside |x| 0.11, from the tip up
to the cut where it joins the body. The middle line goes through the middle of each loop, then
to the root of the tail: the tail joint of `tools/mesh-rigs/fox.json`, between the top of the
tail on the back (y 0.42, z -0.09, `sections-z.txt`) and its bottom on the thighs (y 0.26, z
-0.055). The script prints the length of the line, the largest width and depth of a loop, and
the heights of the root and the tip.
"""

import math
import re
import sys

METERS = 0.9296
ROOT = (0.34, -0.075)
loops = []
for line in open(sys.argv[1]):
    m = re.match(r'y=([\d.]+): (.*)', line)
    if not m:
        continue
    y = float(m.group(1))
    for part in m.group(2).split(' | '):
        x0, x1, z0, z1 = map(float, re.findall(r'[+-]\d+\.\d+', part))
        if z1 < -0.04 and x0 > -0.11 and x1 < 0.11:
            loops.append((y, (z0 + z1) / 2, x1 - x0, z1 - z0))
points = [(y, z) for y, z, _, _ in sorted(loops)] + [ROOT]
length = sum(math.dist(a, b) for a, b in zip(points, points[1:]))
width = max(w for _, _, w, _ in loops)
depth = max(d for _, _, _, d in loops)
print(f'tail loops from y {min(loops)[0]:.2f} to {max(loops)[0]:.2f}, then the root {ROOT}')
print(f'length of the middle line {length:.3f} u ({length * METERS:.3f} m), largest width '
      f'{width:.3f} u ({width * METERS:.3f} m), largest depth {depth:.3f} u ({depth * METERS:.3f} m)')
print(f'root: top y 0.42 u ({0.42 * METERS:.3f} m), bottom y 0.26 u ({0.26 * METERS:.3f} m), middle '
      f'y {ROOT[0]} u ({ROOT[0] * METERS:.3f} m). Tip y 0.01 u ({0.01 * METERS:.3f} m)')
