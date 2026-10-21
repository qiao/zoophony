# The penguin mesh of the user as the choir singer

Date 2026-10-21. Round `mesh-penguin`. Decisions:
[`2026-10-21-mesh-penguin.md`](../decisions/2026-10-21-mesh-penguin.md). The probes and their
outputs are in [`2026-10-21-mesh-penguin/`](2026-10-21-mesh-penguin/). Each command runs from the
root of the tree, and the base is `c4951160`, the commit before the round.

## 1. The question

The user gave a textured mesh of a penguin with no skeleton (`assets/models/penguin/penguin.glb`),
and asked that the penguin stands and keeps a size similar to the parametric model. The choir
penguin gets the mesh by route 3 in place of the egg body. The measures that decide are the head
top against the base, the reach of the flippers to the folder, the clearance sweep, the arm gate,
and the balance of the standing body.

## 2. The measures

**Mesh.** One part of 1,553 vertices and 3,103 triangles (`facts.txt`). The body is one egg with
no neck, with a closed orange beak, black eyes in the black of the head, flippers that hang out and
down, and short feet under the egg (`source-views.webp`, `head-views.webp`, `sections-*.txt`).
`make_config.py` writes the rig config.

**Size.** No reference image gives a size for the penguin over the egg body, so the crown takes
the standing head top of the egg penguin with the folder (`landmark-probe.ts`):

| Measure | `main` (egg body) | Round |
|---|---|---|
| Standing head top | 1.043 m | 1.044 m (+0.1%) |
| H | 0.342 m | 0.218 m |
| Standing shoulder joints | 0.759 m | 0.626 m |
| Reach, shoulder joint to the middle of the palm | 0.270 m to the wrist | 0.238 m (arm factor 1) |
| Support | riser | riser |

`landmark-probe.txt` gives `main`, and `balance.txt` the standing head top of the round. H is
smaller, because the head of the mesh starts at the narrowest cut under it (y 0.79 u).

**Flippers.** Below y 0.47 u, each vertex of a flipper lies at |x| 0.227 u or more, and each vertex
of the side of the body at 0.225 u or less (`flipper-free.txt`). The split plane at 0.226 u frees
the flipper with no cut. With the bind arm of the other meshes, 20 faces at the roots of the
flippers turned over in the bind, and 13 faces folded in each sample of the play. An upper arm
bound 40° below the level turns no face over, and 4 faces fold (`check-bind.log`,
`check-bind2.log`, `check-final.log`).

**Beak.** The beak is a closed cone of about 30 vertices, 8 cm long, with no mouth line between
its halves (`head-views.webp`). The studio rig has no jaw bone, so the beak does not open. The
neck and the head lift with each note, by the jaw signal of `CHOIR_MOTION`, as for the egg body,
because a beak in the front row of the default view is about 3 px long.

**Folder.** With the folder of the base, 0.85 H below the head center, the folder covered the
throat and went 5.6 cm into it (`pnpm pose-depth singer --gaps`). The flippers keep the length of
the mesh, so a scan moved the folder to the flippers (`folder-scan.txt`, `folder-probe.txt`):

| Drop, forward (H) | Covers m | Palms on the grips | Upper flippers in the body | Folder in the body |
|---|---|---|---|---|
| 0.85, 0.75 (base) | 0.2 | 100% | 1.1 cm | 5.6 cm |
| 1.3, 1.1 | 0.2 | 100% | 1.6 cm | 0.3 cm |
| 1.25, 1.1 | 0.2 | 100% | 1.5 cm | 0.1 cm |
| 1.15, 1.2 | 0.2 | 0% (12 mm off) | | |
| 1.25, 1.1 (chosen) | 0.22 | 100% | 1.1 cm | 0.1 cm |

The middle of the chosen folder is 0.37 of the body height below the crown. The reference images
give 0.51 to 0.56. Flippers 1.25 times as long reach a folder at 0.51 (`options.md`).

**Colors.** `colors_probe.py` and `tone_probe.py` (`colors.txt`, `tone.txt`), Oklab L and chroma:
the black 0.18 and 0.000, the belly 0.98 and 0.027, and the throat 0.85 to 0.93 and 0.09, a pale
yellow. The shift of the throat takes a quarter of its chroma, and 112 faces move
(`colors-shift.webp`). The black of the penguin is darker than the dark limit 0.05 of the other
meshes: 54.9% of the faces were dark, and 4.8% with 0.0055 (`check-dark.log`).

**Arm gate.** `pnpm arm-check singer --base c4951160` (`arm-check.txt`):

| Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | paw swing p95 | paw jumps | stretch p95 | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| L | 3 | 31 | 26 | 0.79 | 79 | 36 | 0.0% | 0.02 | PASS |
| R | 1 | 34 | 27 | 0.83 | 79 | 36 | 0.0% | 0.00 | PASS |

The base has no singer, so each base cell is empty. `ACCEPTED_GRIPS` takes the play median, -79°
for each paw (`arm-check-grips.txt`, grip turn 0°).

The 2x crop pairs (`singer-*-arms.webp`) show the flippers on the lower corners of the folder, with
no twisted band.

**Sweep.** `pnpm pose-depth singer --gaps` (`pose-depth.txt`): the upper flippers go at most
1.1 cm into the sides of the body, at their roots, the paws 0.3 cm into the folder, and the folder
0.1 cm into the belly. Each palm is on its grip at each of the 484 note starts. The head keeps
18.1 cm from the folder. `fold-probe.txt`: at most 4 faces fold in a sample. Faces 124, 783, and
1279, thin faces at the fronts of the roots of the flippers, fold in each sample.

**Balance.** `balance.ts` takes the volume centroid of the posed body and an assumed folder of
0.4 kg against the support area of the soles, 18.1 cm deep and 39.2 cm wide (`balance.txt`):

| Sample | Front of the middle | Share of the depth from the heels | Inside the edge |
|---|---|---|---|
| rest | -2.2 cm | 38% | 7.2 cm |
| note, median | -2.9 cm | 34% | 6.4 cm |
| note, p95 (most back) | -3.6 cm | 30% | 5.8 cm |

**Other bodies.** `body-probe.txt`: each body, player, and pose set of the other species is equal.
`size-body.txt`: +29,207 B to 797,000 B. The removal of the egg body keeps the size, so the
bundle did not hold it. `shots.txt`: the 5 shot tests that fail also fail on the base.

**Images.** `pnpm close-views batch <dir> --species penguin,rhino --role singer --lineup --camera
default --camera orchestra --demo beethoven-9 --time 80.39 --base c4951160` wrote
`singer-base-views.webp`, `lineup-base-views.webp`, `play-base-views.webp`, and
`species-play-base-views.webp` and `species-rest-base-views.webp`, each with the base above.

## 3. The result

The mesh stands at the head top of the egg penguin and keeps its flippers and legs. The flippers
hold a folder 0.22 m wide in front of the chest, higher than in the reference images, and each
palm meets its grip. The arm gate passes, and the center of mass lies over the back half of the
soles, inside the support area.
