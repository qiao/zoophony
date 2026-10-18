"""Measures the trombone of the app against the reference (round `wind-research`, 2026-10-18).

Run from the root of the tree: python3 -I docs/research/2026-10-18-wind-technique/probe.py
The values of the app are copies of `src/pose/winds.ts`, `src/pose/wind-notes.ts`, and
`src/models/instruments/brass.ts` at commit 3ef40f48. The output is `probe.txt`.
"""

import math

# The tube of a B-flat tenor trombone with the slide closed: 9 ft (Wikipedia, "Trombone").
TUBE_M = 9 * 0.3048
SEMITONE = 2 ** (1 / 12)

# The app (3ef40f48).
SLIDE_REACH_M = 0.155  # `slideReach` of the panda mesh (docs/research/2026-10-18-panda-mesh.md)
MODEL_TRAVEL_M = 0.55  # `BRASS.trombone.travel`
SLIDE_SEC = 0.1  # `WIND_MOTION.slideSec`
H_M = 0.472  # head height of the panda mesh
PARTIALS = [0, 12, 19, 24, 28, 31, 34, 36, 38, 40, 42, 43, 45, 46, 48]
FUNDAMENTAL = 34  # B-flat 1
NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def qmul(a, b):
    """Multiplies two quaternions (x, y, z, w)."""
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    )


def axis_angle(axis, deg):
    """Gives the quaternion of a turn around a unit axis."""
    h = math.radians(deg) / 2
    s = math.sin(h)
    return (axis[0] * s, axis[1] * s, axis[2] * s, math.cos(h))


def rotate(q, v):
    """Turns a vector by a quaternion."""
    x, y, z, w = qmul(qmul(q, (v[0], v[1], v[2], 0.0)), (-q[0], -q[1], -q[2], q[3]))
    return (x, y, z)


X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def hold_turn(x, z, first=(0, 0, 0, 1)):
    """Copies `holdTurn()` of `src/pose/winds.ts`."""
    return qmul(qmul(axis_angle(X, x), axis_angle(Z, z)), first)


def angles(v):
    """Gives the angle below the level and the angle to the right of the front (the player
    faces -z, and its right is +x)."""
    down = math.degrees(math.asin(-v[1]))
    right = math.degrees(math.atan2(v[0], -v[2]))
    return down, right


def main():
    out = []
    out.append("1. Slide positions of a tenor trombone (derived)")
    out.append(f"   tube {TUBE_M:.3f} m, slide move d(n) = tube / 2 * (2^(n/12) - 1)")
    out.append("   pos | d from pos 1 (cm) | step (cm) | app panda (cm) | proportional (cm)")
    full = TUBE_M / 2 * (SEMITONE**6 - 1)
    prev = 0.0
    for pos in range(1, 8):
        d = TUBE_M / 2 * (SEMITONE ** (pos - 1) - 1)
        app = SLIDE_REACH_M * (pos - 1) / 6
        prop = SLIDE_REACH_M * d / full
        out.append(
            f"   {pos}   | {d * 100:6.1f}            | {(d - prev) * 100:5.1f}     "
            f"| {app * 100:6.2f}         | {prop * 100:6.2f}"
        )
        prev = d
    out.append(f"   reach / real travel = {SLIDE_REACH_M / full:.3f}")
    out.append(f"   reach / model travel = {SLIDE_REACH_M / MODEL_TRAVEL_M:.3f}")
    out.append(f"   model travel / real travel = {MODEL_TRAVEL_M / full:.3f} (the model is 0.85 scale)")

    out.append("")
    out.append("2. Slide direction (the bind slide points ahead and 15 deg down)")
    bind = (0.0, -math.sin(math.radians(15)), -math.cos(math.radians(15)))
    generic = (0, 0, 0, 1)
    panda = qmul(axis_angle(Y, -20), axis_angle(X, -25))
    rest = hold_turn(-14, -2, hold_turn(-45, 0))
    for name, q in [("WIND_HOLDS.trombone play", generic), ("PANDA_TROMBONE play", panda),
                    ("trombone rest", rest)]:
        d, r = angles(rotate(q, bind))
        out.append(f"   {name}: {d:5.1f} deg below the level, {r:5.1f} deg to the right")
    shift = (-0.14, 0.05, -0.28)
    out.append(
        f"   rest move of the mouthpiece: {shift[0] * H_M * 100:.1f} cm x (left), "
        f"{shift[1] * H_M * 100:.1f} cm y (up), {shift[2] * H_M * 100:.1f} cm z (forward)"
    )

    out.append("")
    out.append("3. Slide speed of a move of the app (smoothstep: peak = 1.5 x mean)")
    for steps in [1, 2, 4, 6]:
        dist = SLIDE_REACH_M * steps / 6
        real = TUBE_M / 2 * (SEMITONE**steps - 1)
        out.append(
            f"   {steps} positions: app {dist * 100:5.1f} cm in {SLIDE_SEC} s, mean "
            f"{dist / SLIDE_SEC:4.2f} m/s, peak {1.5 * dist / SLIDE_SEC:4.2f} m/s | real from pos 1 "
            f"{real * 100:5.1f} cm, mean {real / SLIDE_SEC:4.2f} m/s in {SLIDE_SEC} s"
        )

    out.append("")
    out.append("4. Positions of `slidePosition()` against the 8th partial for the 7th partial notes")
    for key in range(62, 71):
        lower = None
        for p in PARTIALS:
            low = FUNDAMENTAL + p - key
            if 0 <= low <= 6:
                lower = low
                break
        alt = [1 + FUNDAMENTAL + p - key for p in PARTIALS if 0 <= FUNDAMENTAL + p - key <= 6]
        no7 = [1 + FUNDAMENTAL + p - key for p in PARTIALS
               if p != 34 and 0 <= FUNDAMENTAL + p - key <= 6]
        name = NAMES[key % 12] + str(key // 12 - 1)
        out.append(
            f"   {name:4s} app {1 + lower} | all positions {alt} | without the 7th partial "
            f"{min(no7)}"
        )
    print("\n".join(out))


main()
