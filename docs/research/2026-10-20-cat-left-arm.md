# The left arm of the cat violist

Date 2026-10-20. Round `cat-arm`. Decisions:
[`2026-10-20-cat-left-arm.md`](../decisions/2026-10-20-cat-left-arm.md). The probes and their
outputs are in [`2026-10-20-cat-left-arm/`](2026-10-20-cat-left-arm/). Each command runs from the
root of the tree.

## 1. The question

The user sent a view of the cat violist from above and behind its left side: "also, the cat's arm
is twisted. its left hand's pose is incorrect". The goal: the left arm has no twist, and the left
paw holds the neck as a real violist does (`docs/reference/string-technique.md`, section 1.9). The
whole arm gate decides, with 2x crop pairs from three views.

## 2. The measures

On `main`, the arm gate passes on the left arm, except the open flat share
(`arm-check-main.txt`). The twist is at the wrist. `pnpm arm-check violist --explain flat` gives the
wrist ring of `forearm_L` as the flattest ring of the play, at 0.57 of its bind
(`explain-flat-main.txt`). The left paw turns 157° on its forearm from the bind
(`hold-fit-main.txt`), and the crops show the skin of the wrist under the neck as a pinched band
of thin faces (`pairs-first.webp`, left column, top). The upper arm (twist 10°) and the elbow
are clean.

The paw comes from `stopHandAt()` of `pose/bowed.ts`: it stands below the neck on the side of the
high strings, with its palm to the low strings, and tilts over the neck by `BowedHold.tiltL`
(`paw-probe.ts`, `paw-probe-tilt30.txt`). The cat takes the 30° of the chin hold. A larger tilt
turns the paw less on its forearm:

| Variant | Paw twist on the forearm, play | Paw swing, play | Play depth cm | Wrist look |
|---|---|---|---|---|
| `main` (30°) | 157° | 27° | 2.5 forearm | pinched band |
| `tiltL` 40°, `highTilt` 15° | 150° | 31° | not measured | crease |
| `tiltL` 45° | 147° | 35° | 1.5 forearm | round |
| `tiltL` 60° | 135° | 46° | 1.5 paw | paw flat on the fingerboard |
| `poleL` (-1, -1, 0) | 142° | 34° | 2.6 forearm | pinched band |
| `poleL` (-1, -1, -1.5) | 177° | 25° | 3.1 upper arm | not rendered |

The first five rows come from `pnpm hold-fit violist --demo boulanger-matin --sets play --set
<variant>` (`scan-pole-tilt.txt`), the 40° row from `scan-tilt-high.txt`. The looks come from
`pnpm close-views play <dir> --at cat --azimuth -135 --zoom 2.5 --elevation 30 --time 30 --set
<variant>`. A larger share of the forearm twist bone made the forearm twist worse (`TWIST_SHARE`
0.65: 79°, 0.8: 104°, `twist-share.txt`).

The tilt bends the studio wrist further from the line of the forearm
(`node docs/research/2026-10-20-cat-left-arm/wrist-probe.ts --set <tilt>`, `wrist-probe.txt`):

| `tiltL` | 30° | 35° | 40° | 45° | 50° |
|---|---|---|---|---|---|
| Wrist bend p50 | 14.7° | 19.8° | 24.8° | 29.6° | 34.4° |

With 45°, face 2122 of the left wrist folds in each play sample, because the shape of the bent
left wrist fits the old turn. A new fit of that shape (`raise-fit-wrist.txt`) folded two other
faces, and a rigid face 2122 moved the fold to face 2084. The two faces share a corner, so
`weights.rigid` takes them as one group (`rig-check-rigid2.log`):

| Rig, hold 45° | Play folds | Lift folds | Left wrist faces that fold |
|---|---|---|---|
| `main` rig | 100% | 100% | 2122 in each play sample |
| rigid 2122 | 93.6% | 99.8% | 2084 |
| rigid group 2122 and 2084 | 14.8% | 48.2% | none |

## 3. The result

The cat rig moves the two wrist faces rigidly, and `CAT_HOLD.tiltL` is 45°. The arm gate
against `main` passes (`arm-check-branch.txt`, the values of each set in `gate-sets.txt`):

| Arm L | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | paw swing p95 | stretch p95 | grip turn p50 |
|---|---|---|---|---|---|---|---|---|
| `main` | 5 | 33 | 58 | 0.55 | 169 | 31 | 0.23 | 3 |
| branch | 5 | 31 | 58 | 0.57 | 167 | 41 | 0.16 | 9 |

The right arm keeps each value. In the play set, the wrist ring keeps 0.65 (0.57), and the left
paw turns 147° (156°). Three values are worse: the paw swing (41°, limit 70°), the grip turn (9°,
limit 45°), and the forearm twist of the play (p50 49° against 32°). The gate reads the lift for
the forearm twist, where both trees give 58°.

`pnpm hold-fit violist --set 'viola@cat.tiltL=45deg'` (`hold-fit-tilt45.txt`) gives the left
forearm 1.5 cm into the viola in the play (2.5 cm), 0.9 cm at rest (1.6 cm), and the same
`stopRange` and `bowRange`. `pnpm body-probe --base 3a6932df` changes only the bodies of the cat
and the pose sets of the cat violists (164 of 1,492 sets, `body-probe.txt`).

The crop pairs (main above, branch below): `pairs-first.webp` (the first position, from behind the
left side, from the left, and from the front), `pairs-fifth.webp` (the fifth position at 223.5 s
of `mozart-k191`), `pairs-close-frog.webp` and `pairs-close-rest.webp` (the close views), and the
crops of the gate in `crops/`. In the first position, the band at the wrist goes, and the paw
curls around the neck with the fingers over the fingerboard. In the fifth position, the paw tilts
65° with `highTilt`, and a band under the neck stays, as on `main`.

The wrist of the cat bends about 30° from its forearm, where Fischer asks for a straight line in
the low positions. The cat cannot keep both: with a straight wrist, the skin of the wrist pinches.
A smaller viola, by the rule of a violin shop (scale 0.927, `hold-reach-main.txt`), would let the
arm bend more, but the user chose the size of the instruments (design 4.6).
