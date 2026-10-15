"""Compares the outputs of layout-dump.ts: the stage side of each demo, the places of the players,
and the footprint boxes of the fox players, against the dump of main.

    python3 docs/research/2026-10-15-fox-rig2/layout-compare.py <main.json> <other.json>...
"""
import json
import sys

main = json.load(open(sys.argv[1]))
for path in sys.argv[2:]:
    other = json.load(open(path))
    print(f'== {path} against {sys.argv[1]}')
    for demo, stage in main['stages'].items():
        side = other['stages'][demo]['side']
        if side != stage['side']:
            print(f"  stage {demo}: {stage['side']} m -> {side} m "
                  f"({100 * (side / stage['side'] - 1):+.1f}%)")
    moved = sum(1 for demo in main['stages']
                for a, b in zip(main['stages'][demo]['players'], other['stages'][demo]['players'])
                if a != b)
    print(f'  players with another place or facing: {moved}')
    for player, boxes in main['players'].items():
        for key, box in boxes.items():
            change = [round(b - a, 4) for a, b in zip(box, other['players'][player][key])]
            if max(abs(c) for c in change) > 0.0005:
                print(f'  box {player} {key}: min/max change {change}')
