# The grip of the elephant timpanist and its arms from the back

Date 2026-10-19. Round `elephant-grip`. Decisions:
[`2026-10-19-elephant-grip.md`](../decisions/2026-10-19-elephant-grip.md). The probes and their
outputs are in [`2026-10-19-elephant-grip/`](2026-10-19-elephant-grip/). Each command runs from the
root of the tree, and the base is `a116a9e8`.

## 1. The question

The user sent two screenshots of the elephant timpanist: from the front, "the elephant is holding
the drum stick in the reverse direction", and from the back, "the elephant's arms are squeezed /
twisted". Since phase 3 of round `elephant-pose`, each mallet head left the back of the fist and
pointed out to the side. The goal is the grip of a real timpanist with a small turn of the paw on
its forearm, and round arms from the back, with the whole arm gate.

## 2. The real grip

[`docs/reference/percussion-technique.md`](../reference/percussion-technique.md) gives the facts
with their sources. The scan takes this real range:

| Value | Real range | Section of the reference |
|---|---|---|
| Head of the mallet | out of the front of the fist, the shaft along the thumb | 1 |
| Each mallet in from forward | 10° to 45° (a V of 20° to 90°) | 2 |
| Mallet at a strike | 10° to 25° down | 3 |
| Mallet between strikes | not below the level | 3 |

## 3. The scans

The bind mallet stood at 90° to the forearm, so the direction of no twist of the paw pointed
level and across the body. With the head in front, each real direction cost a paw turn of 45° to
120° (`scan0.txt`). A real grip holds the shaft along the thumb, so the bind mallet now
slants toward the forearm (`TIMPANI.malletTilt`). The wrist lifts the head between strikes with no
twist (`MalletAcross.lift`). The homes stand out from the shoulders, and the strikes move in, so
that the mallets point forward at a strike (`PercussionHold.home`, `offsetL`, `offsetR`).

`grip.ts` gives the paw turn and the mallet angles in beethoven-9 for each variant of `--set`
(`scan0.txt`, and `scan2.txt` to `scan7.txt`). `filter.cjs` marks a variant in the real range
with `IN`. A row
gives the rest angle `across.rest` -1.2 and the home `[0.1, y, -0.2]` with the strikes moved in,
except the first row.

| Tilt (rad) | Lift (rad) | Home y (H) | Paw turn at rest, L / R | Mallet between strikes: up, in, L / R | In range |
|---|---|---|---|---|---|
| 0 (rest -0.5, old home) | 0 | -0.37 | 46° / 45° | 24° and 78° / 19° and 74° | no, too far in |
| 1.1 | 0.7 | -0.37 | 42° / 45° | 6° and 27° / -1° and 25° | no, R below the level |
| 1.2 | 0.7 | -0.37 | 42° / 45° | 7° and 22° / 1° and 19° | yes |
| 1.3 | 0.65 | -0.37 | 40° / 44° | 7° and 16° / 1° and 14° | yes, chosen |
| 1.4 | 0.65 | -0.37 | 40° / 44° | 8° and 11° / 2° and 8° | no, 5 strikes miss |

`pnpm hold-fit timpanist --set` over the 4 demos with the timpani gives the play turn of the paw
(`hold-fit-cands.txt`, `hold-fit-c67.txt`): 39° / 44° for tilt 1.3, and 41° / 46° for tilt 1.2.
The right paw needs the larger lift, because its forearm points 4° to 8° lower. At a strike, the
mallets point 20° to 23° down, and 1° / 8° in.

## 4. The arms

The view of the user is close to song 96 s of beethoven-9 at azimuth 0 and 160
(`compare.webp`). From the back, the new grip turns the paw forward and the forearm keeps its
round section (`crops.webp`). The right shoulder ring stayed flat (0.67 of the bind, p5), and the
side view showed a sharp wedge at the front of the right armpit (`ring-crops.webp`, the commit
`a5d7abde` on the left). A ring at the right shoulder (`refine.rings`) gives 0.78 and removes
the wedge
(`rig-ring.txt`). The ring also closes the loop of three edges that the arm cut left at the right
armpit, so the sweep closes 4 loops of the body.

## 5. The measures

| Measure | base `a116a9e8` | round |
|---|---|---|
| Paw turn in the play, L / R | 36° / 34° | 39° / 44° |
| Arm twist p50, L / R | 28° / 28° | 25° / 28° |
| Flat p50, L / R | 0.87 / 0.70 | 0.89 / 0.79 |
| Play / lift folds, rest faces | 0.1% / 0.8%, 0 | 0.0% / 0.0%, 0 |
| Strikes within 5 mm | 100% | 100% (worst 4.8 mm) |
| Deepest part, other than the ball of a mallet | 1.3 cm, right paw in the body | 0.0 cm |
| `pnpm arm-check`, L / R | PASS / PASS | FAIL / FAIL |

The rows come from `hold-fit-base.txt` and `hold-fit-final.txt`, `arm-shape-base.txt` and
`arm-shape-final.txt`, `pose-depth-base.txt` and `pose-depth-tree.txt`, and `arm-check.txt`.

The gate fails on two values:

- **Grip turn**, 28° / 32°. The accepted grip of the timpanist (`ACCEPTED_GRIPS` of
  `tools/arm-check.ts`) is the paw twist of the old grip. The new grip twists the paws -2° / -6°
  in the sign of the gate. An entry changes only after the manager accepts the paw crops.
- **Stretch of the left arm**, 0.22 against 0.09. The stretch counts from the rest sample, and in
  the rest the wrist lifts the head, so the edges at the outer side of the left wrist are short
  (0.66 to 0.87 of the bind). Against the bind, the forearm and the paw stretch less than the base
  in each sample set and arm: 0.178 against 0.199 in the lift of the left arm (`bindratio.ts`,
  `bindratio.txt`, the base in a worktree of `a116a9e8`). A lift of 0.3 passes the stretch
  (0.12), but then the mallets point 9° / 16°
  down between strikes, below the real range (`arm-check-lift03.txt`).

`pnpm body-probe --base` changes only the elephant. The first download grows by 153 B
(`size.txt`).

![The screenshots of the user, the base, and the round](2026-10-19-elephant-grip/compare.webp)

![The paws from the front and the arms from the back and at azimuth 35 and -35, at 2x](2026-10-19-elephant-grip/crops.webp)

## 6. The result

The elephant holds each mallet as a real timpanist: the head out of the front of the fist, the
mallets forward and in, a little above the level between strikes, and forward at a strike. The paw
turns 39° / 44° on the forearm, the arms twist less, the right shoulder is rounder, and no paw or
arm goes into the body or a kettle. The gate needs a new accepted grip from the manager,
and the stretch from the lifted rest stays open.
