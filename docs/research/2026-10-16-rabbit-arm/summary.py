"""Sums up the rows of rest-scan.ts against the goals of the right arm of the round rabbit-arm.

Usage: python3 summary.py <scan log>

A row meets the elbow goals when the elbow is below the shoulder joint, at most 5 cm behind the
back and 8 cm out from the side of the trunk, the upper arm is at most 35 degrees from the
vertical, and no corner of the right upper arm, forearm, or paw is more than 1.5 cm in the body.
"""
import collections
import sys


def rows(path):
    for line in open(path):
        if not line.startswith("| violin"):
            continue
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        folds = [int(v) for v in c[2].split("/")]

        def vec(key):
            return [float(t) for t in c[14].split(key + " ")[1].split(" ")[0].split(",")]

        yield dict(
            variant=c[0].replace("violin@rabbit.", "").replace("restBow.lap.", ""),
            right=folds[0],
            rise=float(c[3]),
            back=float(c[4]),
            out=float(c[5]),
            upper=float(c[6]),
            depth=max(float(c[7]), float(c[8]), float(c[9])),
            fore=vec("F"),
            hand=vec("W"),
            frog_y=vec("frogY")[0],
            leg_gap=vec("legGap")[0],
        )


def text(r):
    return (
        f"{r['variant']}: right folds {r['right']}, upper arm {r['upper']:.0f} deg, "
        f"out {r['out']:.1f} cm, arm in body {r['depth']:.1f} cm, hand {r['hand']}, "
        f"forearm {r['fore']}, frog end {r['frog_y']:.1f} cm high, {r['leg_gap']:.1f} cm from the leg"
    )


def main(path):
    all_rows = list(rows(path))
    goals = [
        r
        for r in all_rows
        if r["rise"] < 0 and r["back"] <= 5 and r["out"] <= 8 and r["upper"] <= 35 and r["depth"] <= 1.5
    ]
    print(f"Rows: {len(all_rows)}. Rows that meet the elbow goals: {len(goals)}.")
    print("Right folds of these rows:", dict(sorted(collections.Counter(r["right"] for r in goals).items())))
    groups = [
        ("forearm down (F.y < 0)", [r for r in goals if r["fore"][1] < 0]),
        ("forearm up (F.y > 0.3)", [r for r in goals if r["fore"][1] > 0.3]),
    ]
    for name, group in groups:
        if not group:
            print(f"{name}: no row.")
            continue
        best = min(group, key=lambda r: (r["right"], r["leg_gap"]))
        print(f"{name}: {len(group)} rows, fewest right folds {best['right']}.")
        print("  " + text(best))
    for limit in (2, 4, 6, 8):
        group = [r for r in goals if r["right"] <= limit]
        if group:
            best = min(group, key=lambda r: r["leg_gap"])
            print(f"At most {limit} right folds: smallest gap of the frog end to the leg {best['leg_gap']:.1f} cm.")
            print("  " + text(best))


main(sys.argv[1])
