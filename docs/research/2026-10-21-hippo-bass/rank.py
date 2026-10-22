import re, sys
lim = float(sys.argv[2]) if len(sys.argv) > 2 else 1.5
rows = []
for l in open(sys.argv[1]):
    m = re.match(r'(\{.*?\}): depth ([\d.]+) cm; L ([\d.]+) R ([\d.]+) stop (\S+) bow (\S+);', l)
    if m:
        rows.append((float(m[2]), max(float(m[3]), float(m[4])), float(m[3]), float(m[4]), m[1], m[5], m[6]))
ok = sorted([r for r in rows if r[0] <= lim], key=lambda r: r[1])
print(len(rows), 'rows,', len(ok), 'within', lim)
for r in ok[:15]:
    print(r)
