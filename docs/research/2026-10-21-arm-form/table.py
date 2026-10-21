"""Builds the measure table of one animal from the look, fold, and gate outputs.

    python3 scratch/table.py <label>=<look.txt>,<fold.txt>,<gate.txt> ...
"""
import re
import sys

cols = []
for item in sys.argv[1:]:
    label, files = item.split('=', 1)
    look, fold, gate = files.split(',')
    v = {}
    for line in open(look):
        m = re.match(r'^\| (bind|rest|play|lift) \| ([LR]) \| ([0-9.]+)% / ([0-9.]+)% \| ([0-9.]+)% / ([0-9.]+)% \| ([0-9.]+)% \| ([0-9.]+)% / ([0-9.]+)% \| ([0-9.]+)% \|', line)
        if m:
            s, side = m.group(1), m.group(2)
            v[f'crease {s} {side}'] = m.group(3)
            v[f'area2 {s} {side}'] = m.group(5)
            v[f'thin {s} {side}'] = m.group(8)
        m = re.match(r'^\| (bind|play) \| ([LR]) \| \d+ \|.*\| ([0-9.]+) / ([0-9.]+) / ([0-9.]+) \|$', line)
        if m:
            v[f'aspect {m.group(1)} {m.group(2)}'] = m.group(4)
    for line in open(fold):
        m = re.match(r'^\| (rest|play|lift) \| \d+ \| \d+ \| ([0-9.]+)% \|', line)
        if m:
            v[f'fold {m.group(1)}'] = m.group(2)
    try:
        for line in open(gate):
            m = re.match(r'^\| \S+ \| ([LR]) \| ([0-9].*) \| (PASS|FAIL|OPEN) \|$', line)
            if m:
                cells = [c.strip() for c in m.group(2).split('|')]
                v[f'gate {m.group(1)}'] = m.group(3)
                v[f'twist {m.group(1)}'] = cells[1].split(' ')[0]
                v[f'flat {m.group(1)}'] = cells[3].split(' ')[0]
                v[f'gfold {m.group(1)}'] = cells[0].split(' ')[0]
                v[f'stretch {m.group(1)}'] = cells[7].split(' ')[0]
    except FileNotFoundError:
        pass
    cols.append((label, v))
rows = [
    ('Crease change > 40° against the source, play p50, L / R (%)', 'crease play'),
    ('Same, bind, L / R (%)', 'crease bind'),
    ('Faces with an area > 2x the source, play p50, L / R (%)', 'area2 play'),
    ('Faces thinner than half of the source, play p50, L / R (%)', 'thin play'),
    ('Narrow / wide axis of the mid upper arm, play p50, L / R', 'aspect play'),
    ('Arm gate twist p95, L / R (°)', 'twist'),
    ('Arm gate flat p5, L / R', 'flat'),
    ('Arm gate folds p95 (limit 8), L / R', 'gfold'),
    ('Arm gate stretch p95 (limit 0.35), L / R', 'stretch'),
    ('Arm gate verdict, L / R', 'gate'),
]
print('| Measure | ' + ' | '.join(c for c, _ in cols) + ' |')
print('|---|' + '---:|' * len(cols))
for name, key in rows:
    print(f'| {name} | ' + ' | '.join(f"{v.get(key + ' L', '-')} / {v.get(key + ' R', '-')}" for _, v in cols) + ' |')
print('| Fold probe: play / lift / rest (% of the samples with a fold) | ' + ' | '.join(
    f"{v.get('fold play', '-')} / {v.get('fold lift', '-')} / {v.get('fold rest', '-')}" for _, v in cols) + ' |')
