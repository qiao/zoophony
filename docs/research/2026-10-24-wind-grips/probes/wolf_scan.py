# Runs the arm gate of a role on a grid of variants, and prints the rows of each arm.
# Usage: wolf_scan.py <repo> <role> <base set> <grid JSON: list of [path, [values]]>
import itertools
import json
import subprocess
import sys

repo, role, base, grid = sys.argv[1], sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
args = ['pnpm', 'arm-check', role, '--jobs', '8']
names = {}
for i, values in enumerate(itertools.product(*[v for _, v in grid])):
    name = f'v{i}'
    changes = [f'{p}={v}' for (p, _), v in zip(grid, values)]
    names[name] = ' '.join(f'{p.split(".")[-1]}={v}' for (p, _), v in zip(grid, values))
    args += ['--variant', name, '--set', ';'.join([base, *changes])]
out = subprocess.run(args, capture_output=True, text=True, cwd=repo).stdout
for line in out.splitlines():
    cells = [c.strip() for c in line.split('|')]
    if len(cells) > 14 and cells[1] in names and cells[3] in ('L', 'R'):
        fails = [c for c in cells[4:15] if 'FAIL' in c]
        print(names[cells[1]], cells[3], 'twist', cells[5], 'folds', cells[4], 'flat', cells[7],
              'pawtwist', cells[8], 'fails', len(fails))
