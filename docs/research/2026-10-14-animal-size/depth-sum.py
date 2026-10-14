"""Sums the deepest points of a sweep log of `pnpm pose-depth violinist` for each species.

The sweep plays the first seated rabbit and the first seated red fox of each demo. The rabbits
are the first violins, so the player with the lower index of a demo is the rabbit. The script
prints, for each sample set, part, and obstacle, the deepest point of each species over the
demos, with its demo and its bone. Usage:

    python3 depth-sum.py <log>
"""
import re
import sys

player = re.compile(r'^  (\S+) violinist (\d+) \((\w+)\)$')
depth = re.compile(r'^    (\w+): (.+) in (\w+): ([\d.]+) cm at song (-?[\d.]+) s, wall ([\d.]+) s(?: \((\w+) (-?[\d.]+)\))?; limit')
target = re.compile(r'^    target (\w): ([\d.]+) mm')
best = {}
targets = {}
first = {}
current = None
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    m = player.match(line)
    if m:
        demo, index, support = m.group(1), int(m.group(2)), m.group(3)
        if support == 'stand':
            species = 'soloist'
        else:
            first.setdefault(demo, index)
            species = 'rabbit' if index == first[demo] else 'fox'
        current = (demo, species)
        continue
    m = depth.match(line)
    if m and current:
        demo, species = current
        key = (species, m.group(1), m.group(2), m.group(3))
        value = float(m.group(4))
        if value > best.get(key, (-1,))[0]:
            best[key] = (value, demo, m.group(7) or '-', m.group(5))
        continue
    m = target.match(line)
    if m and current:
        key = (current[1], m.group(1))
        targets[key] = max(targets.get(key, 0.0), float(m.group(2)))
print('| Species | Set | Part in obstacle | Deepest cm | Demo | Bone | Song s |')
print('|---|---|---|---:|---|---|---:|')
for key in sorted(best):
    value, demo, bone, song = best[key]
    if value > 0:
        print(f'| {key[0]} | {key[1]} | {key[2]} in {key[3]} | {value:.1f} | {demo} | {bone} | {song} |')
for key in sorted(targets):
    print(f'target {key[1]} {key[0]}: {targets[key]:.2f} mm')
