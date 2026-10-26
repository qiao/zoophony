# The violin and viola lift, and the bow rest

Date: 2026-10-26. The manager worked alone on `main`. The probes `lift-turn.ts` and `lift-dev.ts`
ran on `main` cffa6676, before the field `liftTurn` went.

## The fault

The user said on 2026-10-25: "the violins / violas are rotated by nearly 360 degress when
transitioning from rest mode to playing mode and vice versa". The roles are the rabbit and red
fox violinists and the cat violist.

`lift-turn.ts` measures the turn of the instrument at 40 steps of the lift:

| Role | Short turn, rest to play | Turn of the path of `main` |
|---|---:|---:|
| Rabbit violin | 117° | 282° |
| Red fox violin | 119° | 280° |
| Cat viola | 140° | 252° |

`lift-dev.ts` splits the difference between the two paths. It is a roll around the long axis of
the instrument: 33° at the weight 0.1, 181° at 0.4, and 338° at 0.9 (the rabbit). So the middle
turn (`liftTurn`) rolled the instrument a full turn (`main-lift-strip.webp`).

## The cause

The left paw held the neck at rest with the playing grip. With the instrument upright and the
top plate to the audience, the paw twisted -77° to -85° on its forearm, and in the play +137° to
+150°. The two values are 227° apart through 0° and 133° apart through 180°, and a real forearm
turns about 180° in all. The middle turn spun the instrument the long way, so that the twist went
through 0°.

## Paths that failed

Each variant ran the arm gate (`pnpm arm-check`) and a paw trace (`--trace`):

- **A direct turn with the playing grip at rest:** the twist passes 180°, and the twist bone jumps
  (move turn 17,967°/s, limit 3,000).
- **A roll of the paw around the neck,** in the middle or at rest: the twist still passes 180°, or
  the wrist bends up to 156°.
- **Shorter middle turns** between the short path and the path of `main`: each one passes 180°.
- **Other rest angles of the upright instrument** around its long axis: each one passes 180° or
  bends the wrist past 70°.
- **A rest across the lap,** strings up: the gate passed, but the user rejected the look on
  2026-10-26 ("they should be like before where the violin/viola are vertically placed on their
  lap, with the strings facing the audience").

## A fault of the retarget

Each trace jumped by about 125° where the wrist bent past about 90°. `poseArm()` of
`models/studio-rig.ts` turns each paw in the plane of its palm by the angle of the forearm in
that plane, clamped to ±70°. Where the forearm passes behind the palm, the angle jumps from π to
-π, and the clamped turn from +70° to -70°. The turn now fades out from 150° to 180°.

## The fix

The instrument rests upright as on `main`, and it takes the short turn. At rest, the left paw
holds the neck with a straight wrist and a twist of 1.5 rad (`restTwistL`). In the move, the turn
of the paw in the axes of the forearm goes from that twist to the playing grip: the twist on a
line and the bend apart (`mixTwist()`), so neither passes its end values. The value 1.5 came from
a scan of -1.5 to 2.2: from 0.75 up, the gate passes on all three roles.

The bow paws rest near the lap (user, 2026-10-26). The rabbit and the cat hold the frog beside
the right thigh with the arm hanging, and the red fox on the front of the right thigh. On the top
of the thigh, the short right arm of the rabbit folded 13 to 22 faces, and the right arm of the
cat went 5.9 cm into the deep belly (`pnpm pose-depth violist`). The left rest elbows of the
rabbit and the red fox point out, (-1, -0.6, 0): with the new grip and the old elbows, the left
upper arm went 3.4 cm into the body at rest.

## The gate against `main`

`gate.txt`. Each value is inside its limit. Values of `main` are in parentheses.

| Role, arm | Paw swing p95 | Move twist max | Move turn max |
|---|---:|---:|---:|
| Rabbit L | 27 (58) | 162 (162) | 240 (531) |
| Rabbit R | 36 (41) | 137 (137) | 357 (1,099) |
| Red fox L | 28 (66) | 147 (147) | 236 (824) |
| Red fox R | 56 (59) | 149 (145) | 272 (1,216) |
| Cat L | 43 (69) | 143 (142) | 172 (840) |
| Cat R | 51 (55) | 144 (144) | 252 (733) |

The red fox fails three values only on the margin: left twist 52 (27, limit 55), right flat 0.78
(0.86, limit 0.55), and right move twist 149 (145). The clip probe passes on all 15 files.

## Images

`rabbit-pairs.webp`, `fox-pairs.webp`, and `cat-pairs.webp` show `main` above the new pose at
rest, in the middle of the lift, and in the middle of the lowering, from the front, the left, and
±35°.

## Open

- In the middle of the re-grip, the left paw goes up to 2.5 cm into the viola and 2.0 cm into the
  violin (0.4 cm and 0.9 cm on `main`).
- In the middle of each move, the bow stands upright in front of the body with its tip near the
  eyes for a moment.
