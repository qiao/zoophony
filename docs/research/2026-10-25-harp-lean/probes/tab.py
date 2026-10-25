"""Prints the main columns of the first table of a pose-depth output, with short variant names."""
import re
import sys

COLS = [
    'play paws>body cm',
    'play forearms>body cm',
    'play upper arms>body cm',
    'play forearms>harp cm',
    'lift upper arms>body cm',
    'lower forearms>body cm',
    'lower upper arms>body cm',
    'play head~harp gap cm',
    'lift head~harp gap cm',
    'target L mm',
    'target R mm',
    'targets within 5 mm %',
]
SHORT = ['pawB', 'foreB', 'upB', 'foreH', 'LupB', 'LoforeB', 'LoupB', 'headG', 'LheadG', 'tL', 'tR', 'tgt%']

lines = open(sys.argv[1]).read().splitlines()
try:
    params = open(sys.argv[1] + ".params").read().splitlines()
except OSError:
    params = []
start = next(i for i, l in enumerate(lines) if l.startswith('| variant |'))
head = [c.strip() for c in lines[start].strip('|').split('|')]
idx = [head.index(c) if c in head else None for c in COLS]
print('variant'.ljust(46) + ''.join(s.rjust(8) for s in SHORT))
for l in lines[start + 2 :]:
    if not l.startswith('|'):
        break
    cells = [c.strip() for c in l.strip('|').split('|')]
    name = cells[0]
    def g(key):
        m = re.search(key + r'=([-0-9.a-z]+)', name)
        return m.group(1) if m else '-'
    short = "base" if name == "base" else (params.pop(0) if params else name[:46])
    print(short[:46].ljust(46) + ''.join((cells[i] if i is not None else '-').rjust(8) for i in idx))
