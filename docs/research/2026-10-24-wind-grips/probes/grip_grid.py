# Scans the grip move of one paw with tools/wind-grip.ts and prints the rows sorted by the holds.
# Usage: grip_grid.py <repo> <role> <hold root> <side L|R> <base set> <alongs> <towards> <acrosses>
import itertools
import subprocess
import sys

repo, role, root, side, base = sys.argv[1:6]
key = sys.argv[9] if len(sys.argv) > 9 else 'gripShift'
alongs, towards, acrosses = (sys.argv[i].split(',') for i in (6, 7, 8))
sets = []
for a, t, c in itertools.product(alongs, towards, acrosses):
    sets += ['--set', ';'.join(x for x in [base, f'{root}.{key}{side}=[{a},{t},{c}]'] if x)]
out = subprocess.run(['node', 'tools/wind-grip.ts', role, '--every', '16', *sets],
                     capture_output=True, text=True, cwd=repo).stdout
k = 0 if side == 'L' else 1
rows = []
for line in out.splitlines():
    cells = [c.strip() for c in line.split('|')]
    if len(cells) < 10 or key not in cells[1]:
        continue
    picks = [cells[2 + k], cells[4 + k], cells[6 + k], cells[8 + k]]
    held = sum(int(p.split('%')[0]) for p in picks)
    rows.append((held, cells[1].split(f'{key}{side}=')[-1], ' | '.join(picks)))
for held, name, picks in sorted(rows, reverse=True)[:15]:
    print(held, name, '| play lift rest lower:', picks)
