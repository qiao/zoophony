"""Writes the table of the spare reach of each palm for each rig and bassoon scale from the logs of
scale-scan.sh, and the largest scale with 3 cm to spare in the play and in the rest.

    python3 -I scale_table.py <log>...
"""
import re
import sys

GOAL = 0.03
for path in sys.argv[1:]:
    text = open(path).read()
    blocks = re.split(r'\n(?=\S.*bassoonScale=)', text)
    rows = []
    for block in blocks:
        m = re.search(r'bassoonScale=([\d.]+):', block)
        if not m:
            continue
        spare = []
        for line in re.findall(r'(misses the grip by|with) ([\d.]+) m', block):
            spare.append(-float(line[1]) if line[0].startswith('misses') else float(line[1]))
        # The order of the log: L play, L rest, R play, R rest.
        rows.append((float(m.group(1)), spare))
    print(path.rsplit('/', 1)[-1])
    print('| Scale | L play | L rest | R play | R rest |')
    print('|---|---|---|---|---|')
    best = None
    for s, sp in rows:
        print(f'| {s:.2f} | ' + ' | '.join(f'{v * 100:+.1f} cm' for v in sp) + ' |')
        if best is None and min(sp) >= GOAL:
            best = s
    print(f'largest scale with {GOAL * 100:.0f} cm to spare: {best}')
