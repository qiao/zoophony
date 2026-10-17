"""Prints the mean turns of the right clavicle and upper arm in the rest samples of the rabbit,
in the axes of the chest (app) and of the studio, and the angle of each sample of each set from
the mean upper arm turn, with the folds of the rest faces.

    uv run --no-project --with numpy python -I rest-turn.py <samples.jsonl> [faces]
"""
import json
import sys

import numpy as np

rows = [json.loads(line) for line in open(sys.argv[1])]
faces = [int(f) for f in (sys.argv[2] if len(sys.argv) > 2 else '224,225,372,373,374,581').split(',')]


def mean_turn(qs):
    total = np.zeros(4)
    for q in qs:
        total += q if q @ qs[0] >= 0 else -q
    return total / np.linalg.norm(total)


rest = [r for r in rows if r['set'] == 'rest']
for bone in ('clavicle_R', 'upper_arm_R'):
    m = mean_turn(np.array([r['turns'][bone] for r in rest]))
    print(f'{bone}: app {m.round(5).tolist()}, studio {np.round([-m[0], m[1], -m[2], m[3]], 5).tolist()}, '
          f'angle {np.degrees(2 * np.arccos(min(1, abs(m[3])))):.1f} deg')
mean = mean_turn(np.array([r['turns']['upper_arm_R'] for r in rest]))
for s in ('rest', 'lift', 'play'):
    sel = [r for r in rows if r['set'] == s]
    turns = np.array([r['turns']['upper_arm_R'] for r in sel])
    ang = np.degrees(2 * np.arccos(np.clip(np.abs(turns @ mean), 0, 1)))
    folded = np.array([any(f in r['folded'] for f in faces) for r in sel])
    print(f'{s}: {len(sel)} samples, {folded.sum()} with a fold of {faces}, angle min {ang.min():.1f} max {ang.max():.1f}')
    for low in range(0, 60, 5):
        inside = (ang >= low) & (ang < low + 5)
        if inside.any():
            print(f'  {low:>2} to {low + 5:>2} deg: {inside.sum():>5} samples, {100 * folded[inside].mean():5.1f}% with a fold')
