# The violin poses of the rabbit and the cat

Date 2026-10-24. Decisions:
[`2026-10-24-violin-poses.md`](../decisions/2026-10-24-violin-poses.md). The probes, their
outputs, and the images are in [`2026-10-24-violin-poses/`](2026-10-24-violin-poses/). Each
command runs from the root of the tree.

## 1. The question

The user said: "the rabbit and cat does not look correct", and asked for images of all states
from many angles, and fixes until the poses look professional with clean meshes. The red fox is
the model that the user accepts. Each state was rendered from 8 views (the front, the back, each
side, and ±45° and ±150°) at 20° and 40° (`pnpm close-views <role> --views ... --elevation`), with
the 2x crops of `pnpm close-views audit`, and the lift and the lowering at shares of 0.2
(`pnpm close-views batch --species cat,rabbit,fox-red --moments lift20,...`).

## 2. The faults on `main`

| Fault | Image (top rows: `main` 59b68b0a) | Measure (`summary.txt`) |
|---|---|---|
| Rabbit rest: both arms hang straight to the violin and to the frog, as a stiff prop. The red fox bends both elbows to about 110°. | `rabbit-rest.webp` | Elbows L 180°, R 180° |
| Cat lift: the left paw rises to the top of the head with the arm straight and raised, and the viola stands high in front of the face. | `moves-front35.webp`, `moves-left.webp` (cat rows, lift40 to lift60) | Paw 3.33 H above the root, upper arm 107° from the vertical. Upper arms 2.8 cm into the viola, viola 3.1 cm into the belly (`pose-depth.txt`) |
| Cat rest: the viola stands far in front of the knee, and the paw bends hard at the wrist. | `cat-rest.webp` | Paw swing 98° (limit 70) |

The play moments (frog, tip, crossing, and the standing soloist) showed no fault that a hold
can fix: the paws hold the neck from below, the stick passes through the closed right paw, and
the bow stays on the strings (`play-views.webp`). The crops of each moment from 6 views at two
heights showed no new fold, shard, or sliver. The dark crease under the rabbit armpit at az150 is
an open item of `2026-10-22-rabbit-armpit.md`.

## 3. The changes

| Hold | Value | `main` | Branch |
|---|---|---|---|
| `SHOULDER_HOLD` | `restPlace` | 0.4 | 0.1 (upper neck) |
| | `rest.lap.along` | 1.1 | 1 (knee joint) |
| | `restBow.lap.offset` | (0.65, 0.45, -0.3) | (0.4, 0.8, -0.2) |
| | `restBow.via.reach` | (0, 0, -0.2) | (0.05, 0, -0.3) |
| `FOX_HOLD` | `restPlace` | 0.4 (inherited) | 0.4 (own) |
| `CAT_HOLD` | `restPlace` | 0.5 | 0.4 |
| | `rest.lap.offset` | (0, 0, -0.3) | (0, 0, -0.25) |
| | `liftTurn` | axis (-0.6, 1, -0.6), top (0, 0, 1) | axis (-0.8, 1, -0.5), top (0.2, 0, 1) |
| | `liftReach` | (0.1, 0.4, 0) | (0, 0.2, -0.1) |
| | `restBow.via.reach` | (0.3, 0.1, -0.5) | (0.3, 0.1, -0.4) |

## 4. The measures

The arm gate of the three violin roles against `main` passes with no `FAIL` (`arm-check.txt`):

| Role | Arm | Folds | Flat | Paw swing | Stretch | Move twist | Move turn °/s |
|---|---|---|---|---|---|---|---|
| violinist | L | 5 (5) | 0.58 (0.58) | 66 (68) | 0.21 (0.23) | 162 (162) | 1,220 (1,256) |
| violinist | R | 7 (6) | 0.80 (0.79) | 59 (49) | 0.37 (0.37) open | 142 (142) | 902 (1,274) |
| violist | L | 8 (7) | 0.51 (0.51) open | 91 (98) open | 0.23 (0.24) | 153 (153) | 979 (973) |
| violist | R | 5 (4) | 0.14 (0.14) open | 65 (65) | 0.33 (0.33) | 133 (134) | 463 (494) |
| fox-violinist | L | 4 (4) | 0.63 (0.63) | 51 (51) | 0.14 (0.14) | 180 (180) open | 17,985 (17,985) open |

The elbows (`summary.txt`, `path.ts --summary`):

| Species | State | Rest elbow L / R | Move elbow L (min to max) | Paw top in the move |
|---|---|---|---|---|
| rabbit | `main` | 180° / 180° | 115° to 180° | 2.91 H |
| rabbit | branch | 123° / 128° | 108° to 180° | 2.95 H |
| cat | `main` | 102° / 103° | 94° to 180° | 3.33 H |
| cat | branch | 94° / 103° | 95° to 180° | 3.13 H |

`pnpm pose-depth` (`pose-depth.txt`): the cat upper arms go 1.7 cm into the viola in the lift
(2.8 cm), and the viola 2.4 cm into the belly in the moves (2.7 cm and 3.1 cm). The rest viola
touches the knee 1.1 cm deep (0.0 cm, limit 2 cm). The rabbit right arm goes up to 1.0 cm into
the body in a lowering (0.0 cm, limit 1.5 cm). Each other pair keeps its depth within 0.1 cm.
`pnpm body-probe --base main` changes only the pose sets of the rabbits (63) and the cats (41)
(`body-probe.txt`).

## 5. What did not work

`variants.txt` gives the tables.

- **Other middle turns of the rabbit.** A turn with the scroll to the left, or a direct turn
  from a rest with the strings to the body, put the paw twist through 180° or bent the wrist past
  110° (`trace-sum.py` of `pnpm arm-check violinist --trace`). The rabbit keeps its turn.
- **The rabbit violin nearer to the body in the middle of the moves.** The left elbow stays bent
  (at most 140°), but the violin goes 5.0 cm to 6.1 cm into the belly.
- **A rabbit grip lower at the side.** The grips 0.45 H to 0.7 H above the knee fold 2 or 3 faces
  of the right arm at rest (7 now), but the elbow stays straight (167° to 180°).
- **Other cat rests.** With the paw at 0.65 of the fingerboard, the left elbow further out or
  back, or the viola 0.2 H in front of the knee with the paw at 0.4, the left arm folds 9 to 13
  faces at rest (`FAIL`).
- **A lower cat viola in the middle of the moves.** It keeps the paw lower (2.93 H), but the
  right paw twists 137° to 141° (`FAIL` against 134°).
- **A pole of the left elbow in the middle of the move, and a rule of the bow side.** Neither
  changed the twist path of the paws, so the code keeps neither.

## 6. The result

At rest, the rabbit bends both elbows, as the red fox: the left paw holds the upper neck, and the
right paw holds the frog above the outer side of the knee (`rabbit-rest.webp`). In the lift and
the lowering, the cat viola turns its scroll toward the left shoulder, and the left paw stays
below the top of the head (`moves-front35.webp`, `moves-middle.webp`). The play poses do not
change.

Open: the left elbow of both animals straightens for about 0.1 s in the middle of the lift and
of the lowering, as on `main`, because the short arm reaches the instrument in front of the round
belly. The cat left paw swings 91° at rest (limit 70), the rabbit right wrist stretches 0.37 in
the play (limit 0.35), and the arms go up to 2.1 cm (rabbit) and 2.9 cm (cat) into the
instrument in the moves, as on `main`.
