import json, sys
b = json.load(open(sys.argv[1])); a = json.load(open(sys.argv[2]))
def worst(rows):
    return max(rows, key=lambda o: (max(o['rate']['twist'], o['rate']['hand']), o['max']['paw']))
keys = []
for o in b:
    k = (o['role'], o['side'])
    if k not in keys: keys.append(k)
only = len(sys.argv) > 3
print('| Role | Arm | Tree | Worst move (demo, pause s, kind, wall s) | Largest paw twist | Paw twist at the ends | Largest wrist turn (°/s) | Largest forearm turn (°/s) |')
print('|---|---|---|---|---:|---|---:|---:|')
for k in keys:
    rb = [o for o in b if (o['role'], o['side']) == k]; ra = [o for o in a if (o['role'], o['side']) == k]
    wb, wa = worst(rb), worst(ra)
    bad = max(wb['rate']['twist'], wb['rate']['hand']) > 3000 or wb['max']['paw'] > 170 or max(wa['rate']['twist'], wa['rate']['hand']) > 3000
    if only and not bad: continue
    for name, w in (('39aa09c9', wb), ('round', wa)):
        r = max(w['rate']['twist'], w['rate']['hand'])
        at = w['rateAtSec'][3] if w['rate']['hand'] >= w['rate']['twist'] else w['rateAtSec'][2]
        print(f"| {k[0]} | {k[1]} | {name} | {w['demo'].replace('.mid','')} {w['at']}, {w['kind']}, {at:.2f} | {w['max']['paw']:.0f} | {w['ends']['paw'][0]:.0f} to {w['ends']['paw'][1]:.0f} | {r:,.0f} | {w['rate']['fore']:,.0f} |")
