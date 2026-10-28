"""Prints the table of phase 1 from the outputs of probe-variant.sh.

    python3 -I table.py <out dir> <name>:<label>:<leg factor>:<thigh deg>...

Each name has `bench-<name>.json` (bench-probe.ts of 2026-10-27-polar-bench), `targets-<name>.txt`
(`pnpm pose-depth pianist --targets`), and `depth-<name>.txt` (`pnpm pose-depth pianist`) in the
out dir. A pair that the depth table of the sweep leaves out is 0.0 cm. The play values are the medians over the play of bach-bwv1047, and the rest values are
the rest before the first note. Lengths in cm, angles in degrees.
"""
import json
import os
import re
import sys

out = sys.argv[1]
print('| Body | Leg factor | Thigh in the bind | Bench top | Bench depth | Hip / knee joint | '
      'Thigh down / knee, play | Head top play / rest | Shoulder, play | Elbow - key L / R, play | '
      'Forearm, play | Lap, play | Notes within 5 mm | Play forearms / upper arms in the body | '
      'Rest paws in the body |')
print('|' + '---|' * 15)
for arg in sys.argv[2:]:
    name, label, factor, thigh = arg.split(':')
    d = json.load(open(os.path.join(out, f'bench-{name}.json')))
    r, p = d['rest'], d['playMedian']
    targets = open(os.path.join(out, f'targets-{name}.txt')).read()
    within = re.findall(r'targets: ([0-9.]+)% of ([0-9]+) within 5 mm, worst ([0-9.]+) mm', targets)
    total = sum(int(n) for _, n, _ in within)
    hit = sum(float(s) / 100 * int(n) for s, n, _ in within)
    worst = max(float(w) for _, _, w in within)
    depth = open(os.path.join(out, f'depth-{name}.txt')).read()
    head = re.search(r'^\| variant \| play forearms.*$', depth, re.M).group(0).split('|')[1:-1]
    cells = re.search(r'^\| base \|.*$', depth, re.M).group(0).split('|')[1:-1]
    col = {h.strip(): c.strip() for h, c in zip(head, cells)}
    cm = lambda m: f'{m * 100:.1f}'
    print(f"| {label} | {factor} | {thigh}° down | {cm(r['benchTop'])} | {cm(r['benchDepth'])} | "
          f"{cm(r['hip'])} / {cm(r['kneeL'])} | {p['thighAngle']:.1f} / {p['kneeAngle']:.0f} | "
          f"{cm(p['headTop'])} / {cm(r['headTop'])} | {cm(p['shoulder'])} | "
          f"{cm(p['elbowL'])} / {cm(p['elbowR'])} | {p['slope']:+.1f} | {cm(p['lap'])} | "
          f"{hit:.0f} of {total}, worst {worst:.1f} mm | "
          f"{col.get('play forearms>body cm', '0.0')} / {col.get('play upper arms>body cm', '0.0')} | "
          f"{col.get('rest paws>body cm', '0.0')} |")
