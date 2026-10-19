"""Writes the spare reach of each palm to its bassoon grip for each variant of a log of
pnpm hold-reach beaver --instrument bassoon --set ..., as a table (negative for a miss).

    python3 -I reach_table.py <log>
"""
import re
import sys

print('| Variant | L play cm | L rest cm | R play cm | R rest cm |')
print('|---|---|---|---|---|')
label, spare = None, []


def flush():
    if label is not None and len(spare) == 4:
        short = label.replace('bassoon@beaver.', '').replace('beaver.', '')
        print(f'| {short} | ' + ' | '.join(f'{v * 100:+.1f}' for v in spare) + ' |')


for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if re.match(r'^(base|\S+=\S*):$', line):
        flush()
        label, spare = line[:-1], []
        continue
    m = re.search(r'(misses the grip by|with) ([\d.]+) m', line)
    if m:
        spare.append(-float(m.group(2)) if m.group(1).startswith('misses') else float(m.group(2)))
flush()
