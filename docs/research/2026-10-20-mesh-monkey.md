# The monkey mesh of the user as the trumpet player

Date 2026-10-20. Round `mesh-monkey`. Decisions:
[`2026-10-20-mesh-monkey.md`](../decisions/2026-10-20-mesh-monkey.md). The probes and their
outputs are in [`2026-10-20-mesh-monkey/`](2026-10-20-mesh-monkey/). Each command runs from the
root of the tree, and the base is `32136c6e`, the commit before the round.

## 1. The question

The user gave a textured mesh of a monkey with no skeleton (`assets/models/monkey/monkey.glb`).
The trumpet monkeys get it by route 3. Phase 1 gives the rig, the size, the form, and the face,
and the questions to the user. The measures that decide are the size rule of the user, the reach
of the trumpet grips, the seat, and the face in the stage light.

## 2. The measures

**Mesh.** One part of 1,568 vertices and 3,129 triangles, with 6 open edges and 3 edges with more
than two faces (`facts.txt`). The monkey stands upright on short legs (crotch at y 0.215 u), with
long thin arms apart from the body from x 0.09 u, long dark hands, a large round head with a small
tuft of hair, round ears at the sides, and a long tail that ends in a curl on the floor
(`sections-*.txt`, `measures.txt`, `arm-axis.txt`, `paw.txt`, `free-arm.txt`, `tail-bend.txt`).
`source-views.webp` shows it. `make_config.py` writes the rig config.

**Size.** No reference image shows a monkey (`orchestra-latest.png`, `orchestra-side.png`,
`mockup.png`, `scene.png`, `animals.webp`, `lowpoly-animals.png`). So the mesh takes the head top
of the parametric monkey, 1.029 m standing (`landmark-probe.ts`, `landmark-probe.txt`). The skull
top under the tuft is at about 0.965 u, and the tuft top at 1.0 u. `pnpm mesh-options monkey <dir>
--size tuft=1.029 --size middle=1.048 --size skull=1.066 --legs 1 --arms 1,1.1,1.2,1.25
--instrument trumpet --species monkey` (`options.md`, `mid-report.webp`):

| Size | Point at 1.029 m | Scale | H | Shoulder joints | Seat | Chair depth |
|---|---|---|---|---|---|---|
| `main` (parametric) | head top | - | 0.361 m | 0.552 m | 0.271 m | - |
| tuft | tuft top | 1.029 m/u | 0.293 m | 0.607 m | 0.127 m | 0.188 m |
| middle | between | 1.048 m/u | 0.298 m | 0.618 m | 0.130 m | 0.191 m |
| skull (chosen) | skull top | 1.066 m/u | 0.303 m | 0.629 m | 0.132 m | 0.193 m |

The parametric monkey is a wide, chubby body. The mesh is slim, so at the same head top it looks
smaller than its neighbors (`lineup-base-views.webp`).

**Arms and trumpet.** The parametric monkey reaches 0.516 m from the shoulder joint to the middle
of the palm, with 8.3 cm (left) and 4.1 cm (right) to spare at the grips (`pnpm hold-reach monkey
--instrument trumpet`). The mesh reaches 0.297 m at the size skull. With the trumpet hold of the
base (`WIND_HOLDS.trumpet`), at the size skull (`options.md`, `options-long.md`):

| Arm factor | Reach | Arm/trunk | Spare L, R in the play |
|---|---|---|---|
| 1 | 0.297 m | 0.79 | -8.5 cm, -13.4 cm |
| 1.25 | 0.362 m | 0.96 | -2.0 cm, -6.9 cm |
| 1.4 | 0.401 m | 1.06 | 1.9 cm, -3.0 cm |
| 1.5 | 0.427 m | 1.13 | 4.5 cm, -0.4 cm |
| 1.6 | 0.453 m | 1.19 | 7.1 cm, 2.2 cm |

The large head puts the mouth far in front of and above the shoulder joints, and the grips are
0.17 m to 0.18 m in front of the mouthpiece. A smaller trumpet brings its grips nearer to the mouth
(`trumpet-scale.sh`, `trumpet-scale.txt`, spare in the play, L and R):

| Trumpet scale | Arms 1 | Arms 1.25 | Arms 1.4 | Arms 1.5 |
|---|---|---|---|---|
| 1 | -8.5, -13.4 cm | -2.0, -6.9 cm | 1.9, -3.0 cm | 4.5, -0.4 cm |
| 0.8 | -6.2, -10.4 cm | 0.3, -3.9 cm | 4.2, 0.0 cm | 6.8, 2.6 cm |
| 0.65 | -4.7, -8.1 cm | 1.8, -1.6 cm | 5.7, 2.3 cm | 8.3, 4.9 cm |
| 0.5 | -3.3, -6.0 cm | 3.2, 0.5 cm | 7.1, 4.4 cm | 9.7, 7.0 cm |

Even at the scale 0.5, the arms of the mesh miss the right grip by 6 cm. The hold fit of phase 2
can turn the shoulder bones forward (`reach`, `reachL`), as for the wolf and the beaver.

**Seat and chair.** The short legs give a seat of 0.132 m and a chair depth of 0.193 m. With the
front edge 0.06 u of the dog, the shins lay over the seat (`check-first.log`), so the front is
0.03 u (`check-front.log`). The underside of the haunch behind the hip joints stays up to 6.7 cm
above the seat (`check-config.log`). The thighs are short, so the seated monkey looks almost as if
it stands in front of the low chair (`trumpeter-views.webp`, `species-rest-base-views.webp`).

**Tail.** `pnpm rig-mesh monkey --check --set studio.tailBind.tail=<direction>`, the root 15° to
the right of the back (`tail-scan1.log`, `tail-scan2.log`):

| Root below the level | Lowest point of the tail above the soles, seated |
|---|---|
| 35° | 5.1 cm |
| 45° | 0.8 cm |
| 47° (chosen) | 0.07 cm |
| 49° | 0 cm, the tail lifts the seat by 0.7 cm |

**Colors.** `colors_probe.py` (`colors.txt`), as Oklab L, hue, and chroma:

| Part | Mesh texture | `SPECIES_COLORS.monkey` |
|---|---|---|
| Fur | 0.504, 53°, 0.094 | 0.513, 54°, 0.078 |
| Belly | 0.876, 69°, 0.081 | 0.802, 71°, 0.064 |
| Face disc | 0.848, 64°, 0.084 | - |
| Ears | 0.818, 50°, 0.100 | - |

The fur matches the parametric monkey, so the config has no tone rule. With the dark limit 0.05 of
the other meshes, 817 faces are dark: the dark brown hands (371) and feet (415) and the eyes (31)
(`dark-regions.txt`). The limit 0.02 keeps the hands and the feet a dark brown, and 0 faces are
dark outside the eye and nose boxes.

**Face.** The pea eyes sit on the large eyes (8 dark faces on each side), and the small brown nose
takes the gloss (26 faces). Each face takes the mean of its texture samples, so the thin smile
line and the thin brows of the texture go away (`smile-probe.txt`, `muzzle.txt`). With no rule,
the face has no mouth (`face-crops-plain.webp`). A smile band of 5 faces in a mid brown gives a
smile with the corners up, from the front, at 60°, and from the side, also beside the
mouthpiece (`face-crops-smile.webp`). A wider band took a face that hangs down at the middle
(`face-crops-smile-wide.webp`). The crops are 4 times the head of the base views of
`pnpm close-views trumpeter <dir> --target head --scale 3` (`face_crops.py`).

**Images.** The views of the app come from a scratch worktree with the body and a role
`trumpeter` wired in, so that the app of the user does not change before the answers:
`pnpm close-views batch <dir> --species monkey,panda,pig,wolf --role trumpeter --lineup --camera
default --base main` (`lineup-base-views.webp`, `species-rest-base-views.webp`,
`species-play-base-views.webp`, `trumpeter-views.webp`, `play-base-views.webp`).

## 3. The result

The rig of the mesh passes the check: 3,129 triangles, a packed mesh of 24,887 B after gzip
(budget 32,000 B), and the standing body within 0.235 mm of the source (`check-config.log`).
The size follows the rule of the user. The face is happy with the smile rule. The arms of the
mesh do not reach the trumpet, and the seated pose on the low chair reads almost as standing, so
the user chooses the arms, the trumpet size, and the chair before phase 2.

## 4. Phase 2: the body in the app

The user chose arms 1.5, the trumpet at the scale 0.8, the size of phase 1, no chair, and the smile
line. The logs and the images are in [`phase2/`](2026-10-20-mesh-monkey/phase2/).

**Elbows.** `pnpm hold-fit trumpeter --set` and `pnpm arm-check trumpeter --set`, with the grips of
the base (`hold-fit-poles.txt`, `arm-poles.txt`):

| Elbows L / R | Play paw turns L / R | Gate |
|---|---|---|
| base (-0.5, -1, -1) / (1, -1, -1) | 117°, 134° | PASS |
| (-0.5, -1, -0.5) / (0.5, -1, -0.5) | 116°, 118° | PASS |
| (-0.3, -1, 0) / (0.3, -1, 0), chosen | 103°, 106° | PASS |
| (-1, -1, -0.3) / (1, -1, -0.3) | 137°, 139° | PASS |
| (-1, -0.5, -1) / (1, -0.5, -1) | 148°, 146° | PASS |
| (-1, -0.3, -0.5) / (1, -0.3, -0.5) | - | FAIL, flat p5 R 0.50 |
| (-1, 0, 0) / (1, 0, 0) | - | FAIL, flat p5 R 0.46, paw twist 175° |
| (-1, -0.5, 0) / (1, -0.5, 0) | - | FAIL, flat p5 R 0.49 |

**Grips.** A paw on a wind grip lies along the line from its shoulder, and `PAW_TURN` turns it back
toward the forearm. With the right palm on top of the valves, the long paws rose past the trumpet
to the eyes. A paw aim toward the mouthpiece and a larger finger curl showed no visible change
(`paw-aim.diff`, `paw-aim-views.webp`, `curl-views.webp`). Lower grips at the sides of the
casings (`grips.sh`, `grips.txt`, `grips-views.webp`, v1 chosen):

| Grips (scale 1) | Spare L, R in the play | Gate |
|---|---|---|
| base: L (0.17, -0.04, -0.03), R (0.18, 0.03, 0.01) | 6.7, 2.6 cm | PASS |
| v1: L (0.17, -0.07, -0.03), R (0.18, -0.05, 0.03) | 8.0, 6.7 cm | PASS |
| v2: L (0.17, -0.08, -0.035), R (0.18, -0.07, 0.035) | 8.4, 7.6 cm | PASS |

The mouthpiece is 0.212 m above the shoulder joints (`mouth-probe.txt`).

**Gates.** `pose-depth.txt`: the deepest part is 0.3 cm of the paws in the trumpet, and each note
target is within 5 mm. `arm-check.txt` and `arm-check-all.txt`: no `FAIL`, and each other role
keeps the values of the base. `hold-reach.txt`: 8.0 cm and 6.7 cm to spare in the play, 17.9 cm and
17.8 cm in the rest. `face-crops.webp`: the smile shows at rest and beside the mouthpiece.

**Folds.** `fold-probe.txt`: faces 329 and 1090, thin faces across the wrists (corners 4.6° and
8.5°), fold in each sample. Rigid weights and a wrist ring move the fold to the next thin faces
(`check-wrist.log`, `fold-probe-rigid.txt`), so the rig keeps them.

**Size and other bodies.** `size.txt`: +25,991 B, 740,713 B in all. `body-probe.txt`: the bodies of
the other species are equal, and the poses of the players of two demos change, because the stage
side moves by -0.7% (bach-bwv1047) and +1.4% (beethoven-9). `shots.txt`: the 5 shot tests that
fail also fail on `32136c6e`.
