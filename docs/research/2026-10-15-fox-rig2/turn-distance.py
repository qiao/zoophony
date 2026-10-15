"""Prints the smallest angle of the turn of the right upper arm of each sample set of arm-dirs.ts
from a turn, so that the fade of the shape of the raised arm stays clear of another role.

    uv run --no-project --with numpy python -I turn-distance.py <samples.jsonl> x y z w
"""
import json
import sys

import numpy as np

rows = [json.loads(line) for line in open(sys.argv[1])]
turn = np.array([float(v) for v in sys.argv[2:6]])
turn /= np.linalg.norm(turn)
for name in ('rest', 'play', 'lift'):
    sample = [r for r in rows if r['set'] == name]
    q = np.array([r['turns']['upper_arm_R'] for r in sample])
    angles = np.degrees(2 * np.arccos(np.clip(np.abs(q @ turn), 0, 1)))
    print(f'{name}: {len(sample)} samples, smallest angle {angles.min():.1f} deg, '
          f'5th percentile {np.percentile(angles, 5):.1f} deg')
