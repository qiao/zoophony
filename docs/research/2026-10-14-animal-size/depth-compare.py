"""Compares the deepest points of two sweep logs of `pnpm pose-depth violinist`, in cm and in head
heights, for each species (the rules of `depth-sum.py`).

The head heights H come from `landmark-probe-main.txt` and `landmark-probe.txt`: on main, the
rabbit 0.269 m and the red fox 0.249 m. On the branch, both 0.323 m. A depth passes when it keeps
its value in H (a ratio of the depths in cm of at most the scale of the body). Usage:

    python3 depth-compare.py <main log> <branch log>
"""
import sys

H = {'main': {'rabbit': 0.269, 'fox': 0.249}, 'branch': {'rabbit': 0.323, 'fox': 0.323}}
SCALE = {'rabbit': 1.2, 'fox': 1.3}


def read(path):
    import re
    player = re.compile(r'^  (\S+) violinist (\d+) \((\w+)\)$')
    depth = re.compile(r'^    (\w+): (.+) in (\w+): ([\d.]+) cm at song (-?[\d.]+) s')
    best, first, current = {}, {}, None
    for line in open(path):
        line = line.rstrip('\n')
        m = player.match(line)
        if m:
            demo, index, support = m.group(1), int(m.group(2)), m.group(3)
            if support == 'stand':
                current = 'soloist'
            else:
                first.setdefault(demo, index)
                current = 'rabbit' if index == first[demo] else 'fox'
            continue
        m = depth.match(line)
        if m and current:
            key = (current, m.group(1), f'{m.group(2)} in {m.group(3)}')
            best[key] = max(best.get(key, 0.0), float(m.group(4)))
    return best


main, branch = read(sys.argv[1]), read(sys.argv[2])
print('| Species | Set | Part | Main cm | Main H | Branch cm | Branch H | Pass |')
print('|---|---|---|---:|---:|---:|---:|---|')
for key in sorted(set(main) | set(branch)):
    a, b = main.get(key, 0.0), branch.get(key, 0.0)
    if a == 0 and b == 0:
        continue
    species = key[0]
    if species == 'soloist':
        continue
    ha, hb = a / 100 / H['main'][species], b / 100 / H['branch'][species]
    ok = b <= a * SCALE[species] + 0.05 or b < 1.5
    print(f'| {species} | {key[1]} | {key[2]} | {a:.1f} | {ha:.3f} | {b:.1f} | {hb:.3f} | {"yes" if ok else "no"} |')
