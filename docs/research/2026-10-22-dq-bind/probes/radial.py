"""radial.py <dump A> <dump B> <side> <v,...>: the distance of each bind vertex from the head of the upper arm of the side, and the move from A to B (cm)."""
import json, sys
import numpy as np
a, b, side = sys.argv[1:4]
for d in (a, b):
    pass
A = json.load(open(a + '.json')); B = json.load(open(b + '.json'))
PA = np.array(A['bind']).reshape(-1, 3); PB = np.array(B['bind']).reshape(-1, 3)
J = np.array(A['heads'][f'upper_arm_{side}'])
for v in map(int, sys.argv[4].split(',')):
    ra, rb = np.linalg.norm(PA[v] - J), np.linalg.norm(PB[v] - J)
    print(f'{v}: radius {ra * 100:.2f} -> {rb * 100:.2f} cm, move {np.linalg.norm(PB[v] - PA[v]) * 100:.2f} cm')
