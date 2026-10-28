"""Summarizes the arm ring files of try runs: the area radius at key stations, and the ratio to
the arm copy (`rings/copy.txt`).

    python3 scratch/summ.py <file>...
"""
import re
import sys

KEYS = ['u0.50', 'u0.60', 'u0.70', 'u0.80', 'u0.85', 'e0.50', 'f0.25', 'f0.35', 'f0.50', 'f0.65', 'f0.80', 'f0.95']


def read(path):
    out = {}
    for line in open(path):
        m = re.match(r'\s+([uef]\d\.\d\d)\s+([\d.]+)\s+([\d.]+)', line)
        if m:
            out[m.group(1)] = float(m.group(3))
    return out


import os
copy = read(os.environ.get('COPY', '../rings/copy.txt'))
print('state'.ljust(44) + ' '.join(k.rjust(6) for k in KEYS) + '   min ratio')
for path in ['../rings/copy.txt'] + sys.argv[1:]:
    r = read(path)
    cells = [f"{r[k]:6.2f}" if k in r else '     -' for k in KEYS]
    ratios = [(r[k] / copy[k], k) for k in KEYS if k in r and k in copy and k[0] != 'e']
    worst = min(ratios) if ratios else (0, '')
    print(path.replace('../rings/', '').ljust(44) + ' '.join(cells) + f'   {worst[0]:.2f} {worst[1]}')
