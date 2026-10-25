"""Joins the palm probe of main and of the branch into one table for the report."""

import sys


def rows(path):
    out = {}
    for line in open(path):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 12 and cells[1] in ('L', 'R') and cells[0] != 'Role':
            out[(cells[0], cells[1])] = cells
    return out


main, branch = rows(sys.argv[1]), rows(sys.argv[2])
print('| Role | Paw | Hint to true palm | True palm to tube | True palm to the front | Thumb tip along the tube, cm | Thumb tip behind the axis, cm | Chirality thumb along the tube |')
print('|---|---|---:|---:|---:|---:|---:|---:|')
for key, b in branch.items():
    m = main[key]
    pair = lambda i: f'{m[i]} / {b[i]}'
    print(f'| {b[0]} | {b[1]} | {pair(3)} | {pair(4)} | {pair(8)} | {pair(6)} | {pair(9)} | {pair(11)} |')
