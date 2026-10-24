# The wind holds of the wolf, the mouse, and the tan fox in the play and at rest

Date 2026-10-24. The user asked: "fix how the wolf, tan fox, and mouse are holding the
instrument, in both rest and play modes. validate through screenshots". The decisions are in
[`2026-10-24-wind-holds.md`](../decisions/2026-10-24-wind-holds.md). The images, the probes, and
the tables are in [`2026-10-24-wind-holds/`](2026-10-24-wind-holds/). Each compare runs against
the start commit `90819873`.

## The faults

The close views of the start commit (the rows "before" of `wolf.webp`, `mouse.webp`, and
`fox-tan.webp`) showed these faults:

- The wolf clarinet hung 30° from the vertical. The long muzzle put the grips 0.38 m and 0.40 m
  in front of the shoulder joints, on arms of 0.48 m, so the arms reached far forward. The wolf
  of `orchestra-latest.png` and `orchestra-side.png` holds the clarinet at about 25° to 30° in
  the image, with the elbows near the body.
- From the side, the paws of the wolf and the mouse pointed forward past the tube: each paw
  aimed from its shoulder to the tube, and the tube is far in front of the body.
- At rest, the clarinet and the oboe hung across the front of the body at about 30° to the side,
  with the paws at arm's length. A seated clarinetist puts the bell on the knee or on the seat
  between the legs (source 60 of `docs/reference/wind-technique.md`). An oboist holds the oboe
  vertical on the right leg in a short rest.
- At rest, the flute of the tan fox stood upright at the outer side of the right thigh, its foot
  joint 4.3 cm off the leg, and the head joint stood behind the right arm.

## The changes

| Hold | Value | Before | After |
|---|---|---|---|
| Wolf play | `play` | `holdTurn(5, 0)`, 30° | `holdTurn(-5, 0)`, 20° |
| Wolf play | `lipShift` | (0, -0.12, 0.4) H | (0, -0.18, 0.4) H |
| Wolf, mouse | `aimSide` (new) | 0 | 0.5 |
| Wolf rest | `rest` | `holdTurn(-10, 30)` | `holdTurn(-25, 0)`, upright |
| Wolf rest | `restShift` | (-0.17, -0.3, -0.3) H | (0, -0.55, -0.3) H |
| Mouse rest | `rest` | `holdTurn(9, 27)` | `holdTurn(-15, 0)` |
| Mouse rest | `restShift` | (-0.13, -0.04, -0.04) H | (0.1, -0.35, -0.3) H |
| Mouse rest | `restPoleL`, `restPoleR` | (-1.5, -1, -1), (0.5, -1, -0.5) | (-1, -1, -0.5), (0.5, -1, 0) |
| Fox rest | `rest` | `fluteTurn(-136, 80, [-0.545, 0, 0.839])` | `fluteTurn(-161, 65, [0.7, 0, 0.7])` |
| Fox rest | `restShift` | (0.95, -0.8, 0.45) H | (1.326, -0.926, 0.445) H |
| Fox rest | `restPoleR` | (0.69, -1, -0.01) | (0.5, -1, 0.5) |

At 20°, the wolf grips come to 0.34 m and 0.36 m from the shoulder joints (`points.ts`). The
new share `WindHold.aimSide` turns each paw toward the side across the tube, so that it lies
across the back of the tube and its fingers wrap the front. The paws of the wolf no longer go
into the clarinet in play (0.8 cm to 0.0 cm), and the clarinet no longer goes into the jaw
(1.1 cm to 0.0 cm, `pose-depth-clarinetist.txt`).

The fox flute now leans 24.9° out and forward, with its foot joint near the right knee, 2.6 cm
above the leg, and the head joint outside the right arm (`fox-solve.ts`, `fit-scans.txt`).

## The trades

Each hold went through three checks: the arm gate, the depth sweep, and the close views.

- The steeper mouse oboe folded the right arm in play (12 faces, limit 8), so the mouse keeps
  30° (section `armv-msplit.log` of `gate-scans.txt`).
- A wolf bell between the thighs put the forearms 2.3 cm into the belly, and elbows out twisted
  the right upper arm to 60° to 91° (limit 55°). The upright clarinet passes with the bell about
  0.2 m in front of the knees (`gate-scans.txt`, `depth-scans.txt`).
- Each mouse oboe nearer to the body flattened the left upper arm (flat p5 below 0.55) or folded
  the right arm, so the arms still reach forward at rest.
- The fox paw on the right-hand keys is 0.23 m above the foot joint. Each upright flute on the
  thigh put the paw higher or nearer to the round chest: the right upper arm failed the gate
  (folds 10 to 16, twist up to 74°, flat down to 0.49) or went up to 5 cm into the body. A flute
  through the old paw place, leaned out, passes (section `fox-both-lean3.log` of `fit-scans.txt`).

## The arm gate

`pnpm arm-check clarinetist oboist flutist --jobs 8` passes each value against its limit
(`arm-check-limits.txt`). With `--base 90819873` (`arm-check.txt`), the gate fails 7 values of the
wolf and 1 of the mouse against their margins over the base, all within their limits:

| Role | Arm | Measure | Base | Tree | Limit |
|---|---|---|---:|---:|---:|
| clarinetist | L | twist p95 (rest) | 18 | 35 | 55 |
| clarinetist | L | grip turn p50 (play) | 7 | 28 | 45 |
| clarinetist | R | twist p95 (lift) | 29 | 47 | 55 |
| clarinetist | R | flat p5 (rest) | 0.91 | 0.85 | 0.55 |
| clarinetist | R | stretch p95 (play) | 0.04 | 0.12 | 0.35 |
| clarinetist | R | move twist max | 62 | 82 | 176 |
| oboist | R | flat p5 (rest) | 0.85 | 0.79 | 0.55 |

The grip turn changes on purpose. Its entry of `ACCEPTED_GRIPS` waits for the review of the 2x
crops of `gate-views/`. The margins of the twist (10°) and the move twist (3°) are smaller than
the change of any rest place that the scans tried (`wolf-margin.log` in `gate-scans.txt`).

## The depths

`pnpm pose-depth <role> --base 90819873` (`pose-depth-*.txt`) gives no new pair over its limit.
The upper arms of the tan fox stay at 1.9 cm to 2.1 cm in the rest and the moves, over the limit
of 1.5 cm as on the start commit, and no pair of the fox grows. Some pairs of the wolf and the
mouse grow, all below 1 cm: the wolf forearms 0.0 cm to 0.2 cm and the upper arms 0.1 cm to
0.5 cm in the rest and the moves, and the mouse forearms 0.2 cm to 0.8 cm. In the play, the
wolf drops from 0.8 cm to 0.0 cm (paws in the clarinet) and from 1.1 cm to 0.0 cm (the clarinet
in the jaw).

## The images

`wolf.webp`, `mouse.webp`, and `fox-tan.webp` show the start commit ("before") above the tree
("after") at a note and at rest, from the front, each side, the back, and ±150°, at a camera
height of 20° (`pnpm close-views <role> <dir> --base 90819873 --moments note,rest,lift50,lower50
--views front,left,right,back,150,-150 --zoom 1.25 --elevation 20`). The files `*-e40.webp` show
the rest and the lowering at 40°. `gate-views/` holds the 2x arm crops of the arm gate.

## Open items

- The fox flute leans about 25°. The source gives an upright flute.
- The wolf bell does not touch the knee or the seat.
- The mouse arms reach forward at rest.
- The gate fails of the table above, against the margins of the base.
