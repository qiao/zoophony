"""Reads the samples of arm-dirs.ts and prints, for the play of the red fox, the share of the
samples in which faces fold by the angle of the right upper arm from the mean turn of the folded
samples, by its direction and by its whole turn, and the mean turns of the folds of each face.

    uv run --no-project --with numpy python -I raise-turn.py <samples.jsonl> [faces]
"""
import json
import sys

import numpy as np

rows = [json.loads(line) for line in open(sys.argv[1])]
faces = [int(f) for f in (sys.argv[2] if len(sys.argv) > 2 else '389,390').split(',')]
play = [r for r in rows if r['set'] == 'play']
turns = np.array([r['turns']['upper_arm_R'] for r in play])
dirs = np.array([r['dir'] for r in play])
folded = np.array([any(f in r['folded'] for f in faces) for r in play])


def mean_turn(qs):
    total = np.zeros(4)
    for q in qs:
        total += q if q @ qs[0] >= 0 else -q
    return total / np.linalg.norm(total)


def angle(a, b):
    return float(np.degrees(2 * np.arccos(min(1.0, abs(float(a @ b))))))


print(f'{len(play)} play samples, {folded.sum()} with a fold of faces {faces} '
      f'({100 * folded.mean():.1f}%)')
mean = mean_turn(turns[folded])
mean_dir = dirs[folded].mean(axis=0)
mean_dir /= np.linalg.norm(mean_dir)
print('mean turn of the upper arm of the folds, app axes (x, y, z, w):', mean.round(5).tolist())
studio = [-mean[0], mean[1], -mean[2], mean[3]]
print('the same turn in the axes of the studio:', np.round(studio, 5).tolist())
print('mean direction of the upper arm of the folds, app axes:', mean_dir.round(3).tolist())
by_turn = np.degrees(2 * np.arccos(np.clip(np.abs(turns @ mean), 0, 1)))
by_dir = np.degrees(np.arccos(np.clip(dirs @ mean_dir, -1, 1)))
for name, values in (('direction', by_dir), ('whole turn', by_turn)):
    print(f'share of the samples with a fold by the angle of the {name}:')
    for low in range(0, 40, 5):
        inside = (values >= low) & (values < low + 5)
        if inside.any():
            print(f'  {low:>2} to {low + 5:>2} deg: {inside.sum():>5} samples, '
                  f'{100 * folded[inside].mean():5.1f}% with a fold')
for face in faces + [359]:
    mask = np.array([face in r['folded'] for r in play])
    if mask.any():
        m = mean_turn(turns[mask])
        print(f'face {face}: {mask.sum()} samples, mean turn {m.round(4).tolist()}, '
              f'{angle(m, mean):.1f} deg from the mean turn')
if 'w' in play[0] and len(play[0]['w']) > 2:
    weights = np.array([r['w'][2] for r in play])
    print('weight of the shape of the raised arm: share of the samples above 0.5:',
          f'{100 * (weights > 0.5).mean():.1f}%')
