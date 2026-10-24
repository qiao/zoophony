# Searches rest variants of a wind role: the arm gate on a grid, then the depths of the rest sets
# (pnpm hold-fit --sets lift,rest,lower) and the contact (tools/wind-grip.ts) of the rows that pass.
# Usage: rest_search.py <repo> <role> <base set> <grid JSON> [<max twist>]
import itertools
import json
import re
import subprocess
import sys

repo, role, base, grid = sys.argv[1], sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
variants = {}
for i, values in enumerate(itertools.product(*[v for _, v in grid])):
    variants[f'v{i}'] = ';'.join([base, *[f'{p}={v}' for (p, _), v in zip(grid, values)]])

def run(args):
    return subprocess.run(args, capture_output=True, text=True, cwd=repo).stdout

gate = {}
names = list(variants)
for k in range(0, len(names), 24):
    args = ['pnpm', 'arm-check', role, '--jobs', '8']
    for n in names[k:k + 24]:
        args += ['--variant', n, '--set', variants[n]]
    for line in run(args).splitlines():
        cells = [c.strip() for c in line.split('|')]
        if len(cells) > 14 and cells[1] in variants and cells[3] in ('L', 'R'):
            heads = ['folds', 'twist', 'ftwist', 'flat', 'pawtwist', 'swing', 'jumps', 'stretch', 'grip', 'movetwist', 'moveturn']
            fails = [f'{heads[h - 4]} {c}' for h, c in zip(range(4, 15), cells[4:15]) if 'FAIL' in c and h != 12]
            gate.setdefault(cells[1], []).append((cells[3], cells[5], len(fails), fails))
passed = [n for n, rows in gate.items() if all(r[2] == 0 for r in rows)]
for n, rows in sorted(gate.items(), key=lambda kv: sum(r[2] for r in kv[1])):
    print('gate', n, variants[n].replace(base + ';', ''), [(r[0], r[3]) for r in rows], flush=True)
print(f'{len(passed)} of {len(variants)} pass the gate (the grip turn aside)', flush=True)
for n in passed:
    fit = run(['pnpm', 'hold-fit', role, '--sets', 'lift,rest,lower', '--set', variants[n]])
    row = [l for l in fit.splitlines() if l.startswith('| ') and 'Variant' not in l and not l.startswith('| base') and '---' not in l]
    depth = row[0].split("|")[5:8] if row else ['?']
    grip = run(['node', 'tools/wind-grip.ts', role, '--every', '16', '--set', variants[n], '--set', ''])
    scan = [l for l in grip.splitlines() if l.startswith('| ') and 'Variant' not in l and '---' not in l and not l.startswith('| tree')]
    print(n, variants[n].replace(base + ';', ''), '| twist', [r[1] for r in gate[n]], '| depth',
          [d.strip() for d in depth], '| grip', scan[0].split('|')[2:] if scan else '?', flush=True)
