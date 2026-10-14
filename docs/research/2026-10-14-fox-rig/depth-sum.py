# Sums the sweep of pnpm pose-depth violinist by player kind: the first block of each demo is the rabbit, the second the fox.
import re, sys
blocks, cur = [], None
for line in open(sys.argv[1]):
    m = re.match(r'  (\S+) violinist (\d+) \((\w+)\)', line)
    if m:
        cur = {'demo': m.group(1), 'idx': int(m.group(2)), 'rows': {}, 'target': None}
        blocks.append(cur); continue
    m = re.match(r'    (\w+): (.+?) in (\w+): ([\d.]+) cm at (.*); limit', line)
    if m and cur:
        cur['rows'][(m.group(1), m.group(2), m.group(3))] = (float(m.group(4)), cur['demo'] + ' ' + m.group(5))
    m = re.match(r'    target R: ([\d.]+) mm', line)
    if m and cur: cur['target'] = float(m.group(1))
seen = {}
for b in blocks:
    kind = 'rabbit' if b['demo'] not in seen else 'fox'
    seen.setdefault(b['demo'], 0)
    for k, v in b['rows'].items():
        key = (kind,) + k
        if key not in seen or (isinstance(seen.get(key), tuple) and v[0] > seen[key][0]):
            seen[key] = v
    tk = (kind, 'target')
    seen[tk] = max(seen.get(tk, 0), b['target'] or 0)
for kind in ('fox', 'rabbit'):
    rows = sorted((k, v) for k, v in seen.items() if isinstance(k, tuple) and k[0] == kind and len(k) == 4 and v[0] > 0)
    print(kind, 'target R max', seen.get((kind, 'target')), 'mm')
    for k, v in rows: print('  ', k[1], k[2], 'in', k[3], v[0], 'cm', v[1])
