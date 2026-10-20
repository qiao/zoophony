# The wolf 0.9 times as high and 1.2 times as wide

Date 2026-10-20. Round `wolf-shape`. Decisions:
[`2026-10-20-wolf-shape.md`](../decisions/2026-10-20-wolf-shape.md). The probes and their outputs
are in [`2026-10-20-wolf-shape/`](2026-10-20-wolf-shape/). Each command runs from the root of the
tree, and the base is `980f2bf5`.

## 1. The question

The user said: "make the wolf 0.9x shorter while keeping its width", then "actually, make the wolf
1.2x the width, for it to have similar body ratio as the fox", then "both change". The wolf mesh of
round `mesh-wolf` gets 0.9 of its height and 1.2 of its width. The manager kept the depth. The
measures that decide are the size, the fit of the joints, the reach of the clarinet grips, the
folds, the depths, the tail gaps, and the arm gate.

## 2. The measures

**Rule.** `proportions` of a rig config scales the source on each axis after the scale to 1 unit
high, before the joints (`load_mesh()` of `tools/blender/rig_mesh.py`). The meters for each unit
stay at 1.8659, so `app.shoulders` and the height of `ANIMALS` take the factor 0.9. With no rule,
`pnpm rig-mesh` writes the same bytes for each of the 12 rigs.

**Size.** `size-probe.ts` measures the bodies of the app (`size-base.txt` at the base,
`size-round.txt`). `trunk_cut.py` measures the trunk cuts of the source at the shoulder joints and
at the hips joint, and the largest trunk depth between them (`trunk-cut.txt`). The ratios divide by
the standing skull top:

| Measure | Wolf `980f2bf5` | Wolf round | Red fox |
|---|---|---|---|
| Standing skull top (vertex within 0.03 u of the middle plane) | 1.765 m | 1.589 m (0.900) | 1.570 m |
| Seated head top | 1.600 m | 1.441 m (0.901) | 1.432 m |
| Width of the cut at the shoulder joints | 0.520 m | 0.625 m (1.200) | 0.418 m |
| Width of the cut at the hips joint | 0.444 m | 0.533 m (1.200) | 0.522 m |
| Largest trunk depth | 0.440 m | 0.440 m (1.000) | 0.593 m |
| Shoulder width to height | 0.295 | 0.393 | 0.266 |
| Hips width to height | 0.252 | 0.336 | 0.332 |
| Depth to height | 0.249 | 0.277 | 0.378 |
| Head height H | 0.281 m | 0.280 m | 0.323 m |
| Seat | 0.360 m | 0.307 m | 0.270 m |

The hips width to height of the wolf is now the ratio of the red fox. The fox has a deeper trunk,
so the depth to height stays lower on the wolf. The seated wolf is 0.99 times as high as the seated
dog cellist (1.455 m), below the range 1.03 to 1.16 of the orchestra images.

**Joints.** `shape_config.py` writes the config from the config of the base: each place takes the
factors. The source of the probes is `dump.py` of `docs/research/2026-10-20-wolf-mesh/`, with its
vertices multiplied by (1.2, 0.9, 1). The cuts across the scaled arm axis (`arm-axis.txt`) put the
narrowest cut, the wrist, at s 0.020 to 0.030. The moved wrist lies at s 0.025, 0.002 u from the
middle of the cut there. The moved elbow lies 0.005 u from the middle of its cut, and 0.003 u at
the base. The palm normal of the
scaled paw is (-0.55, -0.662, -0.51) (`paw.txt`). `leg_turns.py` of
`docs/research/2026-10-16-hip-open/` gives the leg turns again, because the shin of the source
now slants 4.1° (`leg-turns.txt`).

**Arms.** The arm with no factor reaches 0.439 m, and 1.1781 gives the reach of the base, 0.508 m
(`check-first.log`). The config takes 1.178.

**Folds.** The first rig folded face 229 of the right shoulder in each sample, and four faces of
the right forearm and the left shoulder in each rest sample (`fold-faces-first.txt`,
`fold-faces-2093.txt`). Moves of the rest place and of the right elbow did not change the rest
folds (`fit1.txt`, `fit2.txt`). Rigid weights on the five faces remove each fold
(`check-rigid.log`, `check-rigid2.log`, `check-rigid3.log`, `fold-probe-clarinetist.txt`): 0 of 7
rest, 10,349 play, and 217 lift samples fold.

**Tail.** `pnpm rig-mesh wolf --check --set` with the root of the tail at four angles below the
level (`tail-variants.txt`). The rigs of the 35° and 50° roots folded each play sample:

| Root | Seat gap at rest | Floor | Posts L, R | Play folds |
|---|---|---|---|---|
| Base, 45° | -1.2 cm | 9.3 cm | | 0% |
| 45° | -2.0 cm | 7.9 cm | 3.0 cm, 3.2 cm | 0% |
| 40° (chosen) | -0.6 cm | 9.7 cm | 3.1 cm, 3.2 cm | 0% |
| 35° | 0.4 cm | 11.6 cm | 3.8 cm, 3.6 cm | 100% |
| 50° | -1.8 cm | 6.4 cm | 3.2 cm, 2.7 cm | 100% |

**Chair.** The seat goes from 0.360 m to 0.307 m with the shorter legs, and the feet stay on the
floor (leg L 0.000 m, leg R 0.002 m). The front edge stays at z 0.06 u, behind the shins at
0.074 u (`check-final.log`).

**Hold.** `pnpm hold-fit clarinetist --base 980f2bf5 --set` (`fit3.txt`):

| Variant | Mouthpiece in the head | Spare L, R cm (play) | Paw twist L, R | Folds |
|---|---|---|---|---|
| Base | 1.3 cm | 9.7, 4.5 | -86°, 67° | 0 |
| Round, mouthpiece 0.12 H down | 0.6 cm | 10.8, 5.1 | -97°, 79° | 0 |
| Round, 0.1 H down (chosen) | 1.2 cm | 10.6, 5.1 | -97°, 79° | 0 |

The face crops (`head-base-views.webp`) show the mouthpiece at the mouth under the muzzle. The
note targets stay at 0.00 mm (100% within 5 mm).

**Clearance.** `pnpm pose-depth clarinetist --gaps --base 980f2bf5`
(`pose-depth-clarinetist.txt`): each part stays within 0.9 cm (limit 1.5 cm), and the mouthpiece
is 1.2 cm in the head.

**Arm gate.** `pnpm arm-check clarinetist --base 980f2bf5 --views <dir> --views-all`
(`arm-check-clarinetist.txt`) and `pnpm arm-check --all --base 980f2bf5` (`arm-check-all.txt`)
give no `FAIL`, and each other role keeps the values of the base:

| Arm | Twist p95 | Forearm twist p95 | Flat p5 | Paw twist p95 | Stretch p95 | Grip turn p50 |
|---|---|---|---|---|---|---|
| L | 22 (15) | 29 (27) | 0.76 (0.75) | 97 (86) | 0.21 (0.20) | 11 (0) |
| R | 32 (28) | 28 (22) | 0.88 (0.85) | 79 (67) | 0.10 (0.14) | 12 (0) |

The grip medians are -97° (L) and 79° (R), against the accepted -86° and 67°.
`arms-strike.webp` and `arms-rest.webp` give the 2x crop pairs, the base on the left.

**Other bodies.** `pnpm body-probe --base 980f2bf5` (`body-probe.txt`): 90 of 95 bodies and 22 of
23 players stay equal, and 1,332 of 1,492 pose sets. Each changed set is in a demo with wolves.
`pnpm test:paused src/shots/` passes (`shots-test.log`). The first download grows by 120 B
(`size.txt`).

**Images.** `compare.webp` puts the lineup beside the dog and the fox (left) and the play frame of
`boulanger-matin` at 30 s at the wolves (right), each with the base above the round.
`clarinetist-base-views.webp`, `species-play-base-views.webp`, and `species-rest-base-views.webp`
give the close views.

## 3. The result

The wolf is 0.9 times as high and 1.2 times as wide, with the same depth. Its hips width to height
is the ratio of the red fox. The arms keep their reach with the factor 1.178, the hold keeps its
place in H with the mouthpiece 0.02 H higher, and the tail root goes 40° down. No sample folds, each
part stays within the contact depth, and the arm gate passes.
