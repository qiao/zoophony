# The panda mesh of the user as the trombonist

Date 2026-10-18. Round `panda-mesh`. Decisions:
[`2026-10-18-mesh-panda.md`](../decisions/2026-10-18-mesh-panda.md). The probes and their outputs
are in [`2026-10-18-panda-mesh/`](2026-10-18-panda-mesh/). Each command runs from the root of the
tree.

## 1. The question

The user gave a textured mesh of a giant panda with no skeleton (`assets/models/panda/panda.glb`).
The trombone pandas get it by route 3: `pnpm rig-mesh panda` rigs it, and `pnpm studio-body panda`
writes `src/models/studio/panda.ts`. Phase 1 wrote the rig config with the factors 1 and measured
the options of the mid-report (`mid-report.webp`). The user chose the head top of the red fox, the
arm factor 1.497, the leg factor 1.5, and the pea eyes. Phase 2 made the body, the role
`trombonist`, and the trombone hold. The measures that decide are the slide reach, the clearance
of the sweep, and the play folds.

## 2. The measures

Phase 1 measured the joints on cuts of the mesh (`sections.py`, `measures.py`, `sections-*.txt`,
`measures.txt`), the parametric panda of `5d1ef638` (`landmark-probe.ts`, `slide-probe.ts`,
`form-main.json`), and the sizes (`sizes.ts`, `sizes.txt`, `check-variants.log`,
`check-leg2.log`). `sizes.ts` reads the config of `5d1ef638`.

| Measure | Parametric panda (`5d1ef638`) | Panda mesh |
|---|---|---|
| Standing head top, skull | 1.300 m | 1.570 m (ear tips 1.591 m) |
| Scale | - | 1.515445 m/u |
| Standing shoulder joints | 0.698 m | 0.999 m |
| H | 0.456 m | 0.472 m |
| Seat | 0.342 m | 0.278 m |
| Reach, shoulder to the middle of the palm | 0.652 m | 0.578 m |
| `slideReach` | 0.17 m | 0.155 m |
| Triangles, packed mesh after gzip | - | 3,146, 29,744 B |

**Eyes.** The eyes lie in dark patches of almost the same color: the darkest eye faces have the
Oklab lightness 0.125 to 0.136, and the patch faces 0.14 to 0.147 (`head_colors.py`,
`head-colors.txt`). The eye box of phase 1 took 38 of the 46 dark faces of the left patch as the
eye, and the color of the old eye put light holes in the patches (`mid-report.webp`). A box around
the eye alone and `darkReach` 0 keep the patches black (`head-rig.webp`, `head_views.py`).
`eye_views.py` rendered the pea eye in a patch: it shows by its gloss rim and its white light.

**Seat.** With the chair front edge at -0.045 u, the back of the short thighs set the seat top,
0.1 u below the round haunch, and the sit pulled the haunch 28.3 cm down into a flat sheet behind
the seat. With the front edge behind the thighs, the seat lies under the haunch
(`check-seat.log`).

| Front edge, sit drop | Seat | Chair depth | Side view gap |
|---|---|---|---|
| -0.045 u, 0.2 u | 0.180 m | 0.296 m | 3.21 cm, a sheet |
| -0.075 u, none | 0.265 m | 0.251 m | 9.97 cm |
| -0.1 u, none | 0.295 m | 0.213 m | 6.95 cm |
| -0.1 u, 0.03 u | 0.278 m | 0.212 m | 5.95 cm |
| -0.12 u, none | 0.318 m | 0.183 m | 4.64 cm |

**Hold.** The big round head puts the mouth 0.40 m in front of the shoulder joints. With the
trombone hold of `main`, the grip of the first position is 0.588 m from the right shoulder joint,
and the arm reaches 0.562 m, so `slideReach` is 0, and the trombone goes 12.5 cm into the body
(`hold-fit-main-hold.txt`). `slide-hold.ts` measured the turns of the slide around the mouthpiece
and of the right shoulder (`slide-hold.txt`). `pnpm hold-fit trombonist --set` measured their
clearance (`hold-fit-turns-1.txt`, `hold-fit-turns-2.txt`).

| Slide right, down | Shoulder turn | `slideReach` | Trombone in body | Arms, deepest |
|---|---|---|---|---|
| 0°, 0° | 45° | 0 | 12.5 cm | 0.4 cm |
| 0°, 0° | 75° | 0.050 m | - | - |
| 20°, 15° | 45° | 0.095 m | 1.8 cm | 1.1 cm |
| 20°, 20° | 45° | 0.125 m | 0.8 cm | 0.8 cm |
| 20°, 25° | 45° | 0.155 m | 0.0 cm | 0.5 cm |
| 20°, 30° | 45° | 0.190 m | 0.0 cm | 0.4 cm |
| 30°, 15° | 45° | 0.140 m | 0.0 cm | 1.8 cm |

`pnpm pose-depth trombonist --gaps` finds each part within the contact depth of 1.5 cm in each
set, and both palms on their grips within 0.01 mm (`pose-depth-trombonist.txt`).

**Folds.** `keys-dump.ts` and `keys-read.ts` give the mean arm turns of the folded samples. Two
raise rules of the right arm, on the slide and at rest, relax faces 466 and 467
(`fold-raise-right.txt`). Faces 717, 1147, and 1148 at the front of the left shoulder fold in each
sample (`fold-probe-trombonist.txt`). A raise rule of the left arm did not relax them in 60
rounds, one set of weights for each face moved the fold to its neighbors, and forward bind arms,
the left elbow direction, and a head turn kept them (`fold-raise-left.txt`,
`fold-rigid-left.txt`, `fold-bind-arms.txt`, `hold-fit-left.txt`).

**Other bodies.** `pnpm body-probe --base 5d1ef638` finds 90 of 95 bodies equal (the 5 panda
bodies differ) and 22 of 23 players equal. 102 of 1,492 pose sets differ: the panda players and
the players of the three demos with trombones, whose layout moves with the wider panda
(`body-probe.txt`). The shot test of 2 cm moves keeps 71.8% of the shots, under its limit of 75%
(`shots-test.log`). It passes on `5d1ef638`.

## 3. The result

The panda mesh plays the trombones at the size, arms, legs, and eyes that the user chose. The
slide turns 20° right and 25° down, the least turn that keeps the trombone out of the body, and
the arm reaches 0.155 m of the travel. The real-player sources and a second source agree: the
left arm holds the weight with the thumb on the bell brace, and the right thumb and two fingers
hold the slide brace with a straight wrist (pBone, "How To Hold A Trombone",
https://pbonemusic.com/blogs/learn/how-to-hold-a-trombone-a-beginners-guide; Western Carolina
University, "Slide Technique", https://paws.wcu.edu/dcherry/files/Slide%20Technique.pdf). The
slide travel is about 60 cm (Thomann, "Trombones: function and playing technique",
https://www.thomann.co.uk/onlineexpert_page_trombones_function_and_playing_technique.html). Two
problems stay open: the folds of the left shoulder and the shot test.
