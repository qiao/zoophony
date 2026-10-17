"""Prints the side view gap of the final bind with the base end 0.0065 u, from the profile."""
import re, sys
rows = []
for line in open(sys.argv[1]):
    m = re.search(r'profile z (-?[\d.]+): min gap (\S+) cm', line)
    if m:
        rows.append((float(m.group(1)), float(m.group(2))))
hit = [z for z, g in rows if g != float('inf')]
first = min(hit)
keep = [(z, g) for z, g in rows if z >= first + 0.0065 - 1e-9 and g != float('inf')]
worst = max(keep, key=lambda r: r[1])
low = min(g for z, g in rows)
sit = [l for l in open(sys.argv[1]) if 'rig_mesh: sit:' in l]
turn = re.search(r'(\d+) faces turn over', sit[0]).group(1) if sit else '?'
print(f'{sys.argv[1].split("/")[-1]}: gap {worst[1]:.2f} cm at z {worst[0]:.3f} (back of the haunch z {first:.3f}), lowest {low:.2f} cm, sit turns {turn} faces')
