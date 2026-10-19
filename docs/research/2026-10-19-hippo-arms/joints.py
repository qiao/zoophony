# Prints the move of each rest joint of the hippo bassist between two outputs of
# pnpm body-probe --out <file>: one with the module of 16f16e44 and one with the new module, each
# with the hold of the round. Usage: python3 docs/research/2026-10-19-hippo-arms/joints.py <base.json> <new.json>
import json
import math
import sys

key = 'contrabass/hippo/contrabass'
a = json.load(open(sys.argv[1]))['players'][key]['skeleton']
b = json.load(open(sys.argv[2]))['players'][key]['skeleton']
moves = {j: math.dist(a[j], b[j]) * 1000 for j in a}
print(f'{len(moves)} joints, the largest move {max(moves.values()):.4f} mm, the smallest {min(moves.values()):.4f} mm')
for j, d in moves.items():
    print(f'{j}: {d:.4f} mm, y {a[j][1]} -> {b[j][1]}')
