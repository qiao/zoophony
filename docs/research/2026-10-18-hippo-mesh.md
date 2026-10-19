# The hippo mesh of the user as the bassist

Date 2026-10-18. Round `hippo-mesh`. Decisions:
[`2026-10-18-mesh-hippo.md`](../decisions/2026-10-18-mesh-hippo.md). The probes and their outputs
are in [`2026-10-18-hippo-mesh/`](2026-10-18-hippo-mesh/). Each command runs from the root of the
tree, and the base is `d30f8b4c`, the commit before the round.

## 1. The question

The user gave a textured mesh of a hippo with no skeleton (`assets/models/hippo/hippo.glb`), and
asked for the recommended settings with no questions. The contrabass hippos get it by route 3.
The measures that decide are the reach of the contrabass, the clearance of the sweep around the
round belly, the colors against the reference, and the folds.

## 2. The measures

The joints come from cuts of the mesh (`sections.py`, `measures.py`, `arm_axis.py`, `paw.py`).

| Measure | Parametric hippo (`d30f8b4c`) | Hippo mesh |
|---|---|---|
| Standing head top | 1.462 m | 1.570 m (skull) |
| Head top on the stool | 1.880 m | 1.796 m |
| H | 0.513 m | 0.505 m |
| Arm, shoulder joint to the middle of the palm | 0.734 m | 0.369 m with no factor, 0.539 m with 1.5 |
| Seat of the stool, soles | 0.700 m, foot ring | 0.370 m, soles at 0.231 m |
| Triangles, packed mesh after gzip | - | 3,150, 28,148 B |

**Reach.** `bass-scan.ts` gives the reached part of the fingerboard and of the hair for a hold, on
the stool of 0.37 m (`bass-scan-rows.txt`). `bass-solve.py` gives the move and the turn of the end
pin that put the contact point and the nut at targets.

| Hold | Fingerboard | Hair | Right shoulder to the contact point |
|---|---|---|---|
| Hold of the parametric hippo, scale 1 | 0.91 | 0.475 to 0.515 m | 0.806 m |
| Scale 0.8, 0.8 H right and 0.4 H up, 15° to the left | 0.68 to 1.00 | 0.030 to 0.415 m | 0.435 m |
| Scale 0.8, solved targets | 0.00 to 1.00 | 0.030 to 0.415 m | 0.423 m |
| Final, nut 4 cm further left | 0.00 to 1.00 | 0.030 to 0.415 m | 0.448 m |

**Clearance.** The deepest part in the body in the play, with the file of each run:

| Hold | Demos | Deepest part | File |
|---|---|---|---|
| Hold of the parametric hippo, scale 1, stool 0.7 m | all | 32.5 cm, the bow | `pose-depth-main-hold.txt` |
| Scale 0.8, 0.8 H right, 10° to the left, stool 0.7 m | 3 | 22.9 cm, a forearm | `hold-fit-first.txt` |
| Solved targets, string planes 25° | `beethoven-8` | 10.0 cm, an upper arm | `pose-depth-solved.txt` |
| Planes 12°, right elbow out and forward | `beethoven-8` | 5.5 cm, a forearm | `pose-depth-poles.txt` |
| Final, nut 4 cm further left | all | 9.1 cm, the right paw | `pose-depth-bassist.txt` |

With the nut 4 cm further right, the head went 3.0 cm into the neck in `boulanger-matin`
(`head-depth-before.txt`). The final hold keeps it within 0.4 cm on each demo (`head-depth.txt`).
A stroke of `boulanger-matin` at 95.22 s misses its target by 16.5 cm: it lasts 0.24 s, and a
pizzicato follows it, so the change starts before its middle, as for the dog in that demo.

**Colors.** The faces of the mesh are warmer than the reference (`fur-colors.txt`,
`render-colors.txt`):

| Measure | Fur hue, chroma | Belly hue, chroma |
|---|---|---|
| Mesh faces | 12°, 0.031 | 50°, 0.047 |
| `SPECIES_COLORS.hippo` | 356°, 0.024 | 8°, 0.025 |
| Reference hippos, `orchestra-latest.png` | 356° to 7°, 0.027 to 0.040 | - |
| Gallery front, parametric hippo | 31°, 0.044 | 35°, 0.043 |
| Gallery front, mesh before the tone | 38°, 0.054 | 60°, 0.048 |
| Gallery front, mesh after the tone | 32°, 0.045 | 38°, 0.044 |

**Eyes and nose.** The eyes are 3 and 4 dark faces far back on the head. The first rig made the two
nostrils gloss, and the export took them as eyes: the middle of each old eye moved toward the
nostril, and the pea eyes had to move 0.13 H out of the head. With no gloss nose, they move 0.034 H
and 0.029 H (`head-colors.txt`).

**Folds.** Each sample folds faces, up to 28 (`fold-probe-bassist.txt`): the left paw, which turns
up to 161° from the forearm on the neck, the chest under the chin with the turn of the right
clavicle, and the front of the right shoulder. `keys-dump.ts` and `keys-read.ts` give the mean turns
of the folded samples for corrective shapes. Rings at the elbows put the rig above the budget of
3,200 triangles (`rig-rings.log`).

**Other bodies.** `pnpm body-probe --base d30f8b4c` (`body-probe.txt`): 80 of 95 bodies, 22 of 23
players, and 1,363 of 1,492 pose sets stay equal. The other bodies are the 5 hippo bodies and the
10 parametric bodies on the lower stool, which no player of the app uses. The stages of the demos
with the hippo grow by up to 2.2% (`pnpm rig-mesh hippo --check`). The paused shot tests pass
(`shots-test.log`). The first download grows by 29,447 B (`size.txt`).

## 3. The result

The hippo mesh plays a contrabass of 0.8 scale on a stool of 0.37 m. The contrabass leans 38° to
the left of the head, so that the bow plays in front of the upper belly, the left paw reaches the
whole fingerboard, and the bow paw the whole hair. The head keeps off the neck. The arms keep
within the limit of the sweep only in part, because the thick arms cross the front of a round
body, and the folds stay open for a round of their own.
