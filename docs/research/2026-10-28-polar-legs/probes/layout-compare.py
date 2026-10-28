"""Compares the places of the players of two outputs of layout-moves.ts: for each demo, the
number of players that move more than 1 mm, the largest move of a player other than the pianist,
and the move of the pianist.

    python3 -I layout-compare.py <main.json> <tree.json>
"""
import json
import math
import sys

a, b = (json.load(open(p)) for p in sys.argv[1:3])
print('| Demo | Players | Moved over 1 mm | Largest move of another player | Pianist move |')
print('|---|---|---|---|---|')
for demo in a:
    pa = {p['key']: p for p in a[demo]}
    pb = {p['key']: p for p in b[demo]}
    moves = {k: math.hypot(pa[k]['x'] - pb[k]['x'], pa[k]['z'] - pb[k]['z']) for k in pa if k in pb}
    other = {k: m for k, m in moves.items() if not k.startswith('piano/')}
    piano = [m for k, m in moves.items() if k.startswith('piano/')]
    worst = max(other, key=other.get) if other else None
    moved = sum(1 for m in moves.values() if m > 0.001)
    print(f"| {demo} | {len(moves)} | {moved} | "
          f"{other[worst] * 100:.1f} cm ({worst}) | "
          f"{(piano[0] * 100 if piano else 0):.1f} cm |")
