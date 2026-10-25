"""Seat moves between two outputs of layout.ts, in cm on the stage floor.

python3 -I moves.py <old.txt> <new.txt>
"""

import json
import sys

old = open(sys.argv[1]).read().splitlines()
new = open(sys.argv[2]).read().splitlines()
for a, b in zip(old, new):
    pa = json.loads(a.split(' ', 3)[3])
    pb = json.loads(b.split(' ', 3)[3])
    d = ((pa[0] - pb[0]) ** 2 + (pa[2] - pb[2]) ** 2) ** 0.5
    print(' '.join(a.split(' ')[0:3]), f'{d * 100:.1f}')
