# The wrist twist in the lift and the lowering

Date 2026-10-21. Round `wrist-lift`. Decisions:
[`2026-10-21-wrist-lift.md`](../decisions/2026-10-21-wrist-lift.md). The probes and their outputs
are in [`2026-10-21-wrist-lift/`](2026-10-21-wrist-lift/). Each command runs from the root of the
tree.

## 1. The question

The user saw the wrist of some animals, such as the rabbit, twist too much when they lift or lower
their instruments. The arm gate sampled only the start of the first lift, at steps of 0.1 s, and no
lowering. The measure that decides is the turn rate of the wrist at steps of 0.01 s over each lift
and each lowering, against the rate of the play, and the paw twist on the forearm.

## 2. The measures

`moves.ts` samples, for each role of `FOLD_ROLES` and each demo, the lift at the song start, a
lowering and a lift at 4 pause points, and the lowering at the song end, at steps of 0.01 s. A lift
takes the real count-in, so a lift after a pause is fast. Each sample gives the paw twist on the
forearm bone, the twist of the forearm twist bone, the paw swing, and the turn rate of each joint
from the sample before. `table.py` takes the move with the largest wrist turn (the larger rate of
the twist bone on the forearm and of the paw on the twist bone).

```bash
node docs/research/2026-10-21-wrist-lift/moves.ts --pauses 4 --json <file>   # 150 s
python3 docs/research/2026-10-21-wrist-lift/table.py <base.json> <round.json>
```

The arms with a flip or a twist past 170° (`moves-base.txt`, `moves-round.txt`; all arms in
`audit-table.md`):

| Role | Arm | Tree | Worst move (demo, pause s, kind, wall s) | Largest paw twist | Paw twist at the ends | Largest wrist turn (°/s) |
|---|---|---|---|---:|---|---:|
| conductor | R | `39aa09c9` | mozart-k417 162.56, lift, 0.13 | 180 | 26 to 37 | 18,000 |
| conductor | R | round | boulanger-matin 56.13, lift, 0.24 | 93 | 26 to 37 | 994 |
| violinist | L | both | bach-bwv1048 327.3, lower, 0.98 | 180 | 144 to -123 | 17,957 |
| violinist | R | `39aa09c9` | boulanger-matin 56.13, lower, 1.03 | 93 | 86 to 93 | 17,905 |
| violinist | R | round | brahms-2 150.49, lift, 0.20 | 93 | 93 to 66 | 838 |
| fox-violinist | L | both | mozart-k525 149.18, lower, 0.84 | 180 | 147 to -68 | 17,982 |
| fox-violinist | R | `39aa09c9` | boulanger-matin 112.27, lift, 0.11 | 121 | 98 to 121 | 9,928 |
| fox-violinist | R | round | mozart-k525 99.45, lift, 0.21 | 101 | 98 to 101 | 799 |
| violist | L | both | mozart-k525 99.45, lower, 0.79 | 180 | 152 to -94 | 17,931 |
| violist | R | `39aa09c9` | boulanger-matin 168.4, lower, 0.77 | 122 | 116 to 87 | 10,263 |
| violist | R | round | brahms-2 300.99, lift, 0.19 | 87 | 87 to 65 | 1,112 |
| bassist | R | both | boulanger-matin 168.4, lift, 0.08 | 134 | -69 to -132 | 3,928 |
| bassoonist | L | both | brahms-2 150.49, lift, 0.07 | 178 | -178 to -118 | 297 |

The play of the good wrists turns at up to 2,268°/s (`playrates.ts`: the elephant mallets). The
bassist lift is a lift after a pause in one beat of 0.2 s: its path is smooth, and with the time of
its own motion it turns at 1,877°/s (`arm-check.txt`). The bassoonist rest pose itself has the paw
twist 178°.

The causes, with the traces of `trace.ts`:

| Arm | Cause | Code |
|---|---|---|
| Bow paw (R) of the violins and the viola | The bow on the strings of the moving violin turns about 117° with it, and comes near 180° from the rest bow. The hemisphere check of the normalized mix then changes its sign, and the bow and the paw turn by about 170° in one step. | `poseBowed()` of `pose/bowed.ts`, the two calls of `mixRotation(restBow.rotation, ...)` |
| Baton paw (R) of the conductor | The baton turn of the lift is a twist of about 130° around the forearm. With the hand mix, the paw passes 180° two times, and the twist bone jumps by 180° each time. | `poseConductor()` of `pose/conductor.ts`, `liftTurn` |
| Left paw (L) of the violins and the viola | The rest twist and the play twist lie on the two sides of 180°. The twist bone takes half of the twist (`TWIST_SHARE`), so it jumps from -90° to 90° when the paw passes 180°. | `poseArm()` of `models/studio-rig.ts`, with the rest grip of `stopHandAt()` |

The paths of the quaternions do not slerp the long way, and the elbow poles do not flip
(`mixRotation()` and `mixDirection()` of `pose/blend.ts` check the hemisphere).

The scan of the baton twist (`moves.ts conductor`, right arm):

| Largest twist of the baton turn | Largest paw twist | Largest paw swing | Wrist turn (°/s) | View |
|---:|---:|---:|---:|---|
| full (about 130°, `39aa09c9`) | 180 | 125 | 18,000 | out to the right and down |
| 0° | 105 | 65 | 832 | up across the face |
| 50° | 105 | 65 | 903 | not rendered |
| 60° | 105 | 71 | 994 | out to the right and up |
| 70° | 126 | 96 | 1,657 | out to the right |
| 80° | 168 | 111 | 2,743 | not rendered |

## 3. The result

The bow mix takes its side from the bow at the play place (`liftMix()`), which stays 120° to 137°
(rabbit) from the rest bow. The path is the same up to the old flip, and it keeps its side after it.
The baton turn keeps 60° of twist (`CONDUCTOR_HOLD.liftTwist`). Of the 7 arms with a flip, only the
3 left paws keep it. The bow paws and the baton paw turn at most 1,112°/s. The rest and the play
poses are equal (`pnpm body-probe --base 39aa09c9`: only the sets `lift` and `lower` change). The
conductor clearance tests pass, and the bowed tests fail in the same 41 places on both trees.

`pnpm arm-check --all --base 39aa09c9` gives no `FAIL` (`arm-check.txt`). The left paws of the
violins and the viola are `OPEN` on both trees, with 180° and about 17,950°/s. A continuous split
of a twist past 180° in two bones puts 180° on one bone. A fix moves the rest grip.
`pnpm pose-depth violinist --base 39aa09c9` marks one `GROWS`: the rabbit forearm goes 2.1 cm into
the body, against 1.0 cm, for 2 of 30 samples of the lowering at the song end of `bach-bwv1050`.

The images (`render.py` of the skin of `dump.ts`, `pair.py`): `rabbit-pair.webp`, `fox-pair.webp`,
`cat-pair.webp`, and `bear-pair.webp` give the paw at the worst moment of each fixed arm, the
commit above and the round below. `rabbit-end-lowering.webp` gives the bow arm of the rabbit at
each 0.05 s of the lowering at the song end of `bach-bwv1050`, and `rabbit-lift-strip.webp` the
lift at the song start of `beethoven-1`, from 0.20 s to 1.20 s at steps of 0.05 s.
