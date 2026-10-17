"""Writes the variant sets of rest-scan.ts: one variant of the rest hold of the rabbit on each line.

Usage: python3 variants.py <set> > <file>

The sets:
- wide: 2500 random holds, the grip anywhere from the belly to the knee, 0 to 0.9 H out.
- low: 2000 random holds, the right hand bone 22 cm to 32 cm out, 34 cm to 52 cm high,
  and 26 cm to 40 cm forward of the middle, with the grip at 0.8 of the way to the knee.
- knee: 900 random holds, the right hand bone 20 cm to 32 cm out, 28 cm to 42 cm high, and
  22 cm to 36 cm forward of the middle, near the outer side of the right knee.
- round: 240 holds of round values, with the grip at the top of the right knee (along 1).
- side: 1200 random holds, the right hand bone 26 cm to 38 cm out, 24 cm to 42 cm high, and
  0 cm to 22 cm forward of the middle, beside the hip and the seat.
"""
import itertools
import random
import sys

R = "violin@rabbit"
H = 32.26  # The head height of the rabbit, cm.
BASE = (13.0, 47.8, -20.1)  # lapPoint() of the right thigh at 0.8 of the way, cm.


def hold(pole, along, offset):
    p = ",".join(str(v) for v in pole)
    o = ",".join(str(v) for v in offset)
    return f"{R}.restPoleR={p};{R}.restBow.lap.along={along};{R}.restBow.lap.offset={o}"


def at_hand(rng, xs, ys, zs, poles_x, poles_z):
    w = (rng.uniform(*xs), rng.uniform(*ys), rng.uniform(*zs))
    offset = [round((w[k] - BASE[k]) / H, 3) for k in range(3)]
    pole = (round(rng.uniform(*poles_x), 2), -1, round(rng.uniform(*poles_z), 2))
    return hold(pole, 0.8, offset)


def main(name):
    if name == "wide":
        rng = random.Random(7)
        for _ in range(2500):
            along = round(rng.uniform(0.6, 1.1), 2)
            offset = [round(rng.uniform(*r), 2) for r in ((0, 0.9), (-0.6, 0.8), (-0.8, 0.3))]
            pole = (round(rng.uniform(-0.3, 1.2), 2), -1, round(rng.uniform(-1, 1), 2))
            print(hold(pole, along, offset))
    elif name == "low":
        rng = random.Random(11)
        for _ in range(2000):
            print(at_hand(rng, (22, 32), (34, 52), (-40, -26), (-0.5, 1.5), (-1.5, 1.5)))
    elif name == "knee":
        rng = random.Random(9)
        for _ in range(900):
            print(at_hand(rng, (20, 32), (28, 42), (-36, -22), (-0.3, 1.2), (-0.5, 2.5)))
    elif name == "side":
        rng = random.Random(13)
        for _ in range(1200):
            print(at_hand(rng, (26, 38), (24, 42), (-22, 0), (-0.6, 1.2), (-1, 1.5)))
    elif name == "round":
        poles = [(0.3, -1, 1), (0.3, -1, 2), (0.3, -1, 0.5), (0.5, -1, 0.5), (0, -1, 1)]
        for ox, oy, oz, pole in itertools.product(
            [0.45, 0.5, 0.55, 0.6], [0.1, 0.15, 0.2, 0.3], [-0.1, -0.2, -0.3], poles
        ):
            print(hold(pole, 1, (ox, oy, oz)))
    else:
        raise SystemExit(f"Unknown set {name}.")


main(sys.argv[1])
