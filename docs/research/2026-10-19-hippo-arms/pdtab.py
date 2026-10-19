# Puts the summary rows of two pose-depth outputs side by side: name, base, round, change.
import sys
def rows(path):
    lines = [l.rstrip('\n') for l in open(path) if l.startswith('| ')]
    out = {}
    for k in range(0, len(lines) - 1):
        if lines[k].startswith('| variant'):
            head = [c.strip() for c in lines[k].strip('|').split('|')]
            vals = [c.strip() for c in lines[k + 1].strip('|').split('|')] if not lines[k+1].startswith('|---') else [c.strip() for c in lines[k + 2].strip('|').split('|')]
            for a, b in zip(head[1:], vals[1:]):
                out[a] = b
    return out
a, b = rows(sys.argv[1]), rows(sys.argv[2])
print('| Pair | Base | Round | Change |')
print('|---|---:|---:|---:|')
for k in a:
    if k in b:
        try:
            d = float(b[k]) - float(a[k])
            mark = ' OVER' if k.endswith('cm') and d > 0.5 and 'instrument' not in k else ''
            print(f'| {k} | {a[k]} | {b[k]} | {d:+.1f}{mark} |')
        except ValueError:
            print(f'| {k} | {a[k]} | {b[k]} | |')
