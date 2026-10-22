# The polar bear mesh of the user as the pianist

Date 2026-10-22. Round `mesh-polar-bear`. Decisions:
[`2026-10-22-mesh-polar-bear.md`](../decisions/2026-10-22-mesh-polar-bear.md). The probes and their
outputs are in [`2026-10-22-mesh-polar-bear/`](2026-10-22-mesh-polar-bear/). Each command runs
from the root of the tree.

## 1. The question

The user gave a Meshy mesh of a polar bear and asked for it in place of the studio polar bear,
with the motion checked from four sides. The mesh has a round belly in front of short thick arms
(`source-views.webp`). The question is the size, the arm factor, and the piano hold that let the
paws play each note of the demos with no clipping and no twisted arm. The order of the goals is
the clearance, the arm gate, the range of the keys, and the look.

## 2. The measures

`baseline/` holds the old body at `141bc67a`. `pnpm hold-reach` has no piano, so the note-target
errors of `pnpm pose-depth pianist` give the range of the keys. The hold of a row is the hold of
the final round except the named values. `scan2.sh` runs a sweep with a temporary
`PIANO_FRONT_H`, and `summ.py` reads its table. The outputs are in `scans/`.

| Measure | Old studio polar bear | New polar bear |
|---|---|---|
| Standing skull top | 1.923 m | 1.923 m |
| Seated head top in the app | 1.762 m | 1.832 m |
| Head height `H` | 0.361 m | 0.453 m |
| Bench | 0.25 m | 0.173 m (the legs) |
| Reach, shoulder joint to palm | 0.625 m | 0.680 m (0.552 m with the factor 1) |
| Front of the keys | 1.68 H + 0.05 m (0.66 m) | 1.5 H + 0.05 m (0.73 m) |
| Lean in the play | 27° | 28° |
| Note targets within 5 mm, worst | 100%, 0.05 mm | 100%, 0.00 mm |
| Forearms in the body, play | 5.9 cm | 8.7 cm |
| Upper arms in the body, play / lowering | 2.8 / 3.0 cm | 9.7 / 11.7 cm |
| Paws in the body, lowering | 1.3 cm (claws) | 2.8 cm |
| Head to the lid, play | 5.7 cm | 5.1 cm |
| Folds, play samples with a fold | 9.6% | 52.2% |

The reach of the arm factors, with the front of the keys and the lean (`scans/`):

| Arm factor | Front `H` | Lean | Targets within 5 mm | Head to lid | Upper arms in body |
|---|---|---|---|---|---|
| 1 | 1.0 | 35° | 100% | 0 cm | 16.4 cm |
| 1.1 | 1.1 | 30° | 100% | 0 cm | 16.6 cm |
| 1.2 | 1.4 | 30° | 99.4% | 0 cm | 16.5 cm |
| 1.25 | 1.5 | 28° | 100% | 5.1 cm | 9.7 cm |
| 1.3 | 1.55 | 28° | 100% | 7.5 cm | 8.1 cm |

The poles of the elbows, with the factor 1.3 and the front 1.4 H (`scans/e-*.txt`): the poles of
the old body (out, down, and back) put the inner elbows 13 to 16 cm into the belly, and a pole
out and level (`(±1, -0.2, 0)`) 9 to 11 cm.

The arm gate against `141bc67a` (`pnpm arm-check pianist --base 141bc67a`, `scans/gate-*.txt`).
The old body has no fold, so a new body may add at most 2 folded faces (the margin):

| Variant | L folds | L twist | R folds | R twist | Verdict |
|---|---|---|---|---|---|
| cut, twist bone 0.4, poles up | 4 | 32 | 2 | 32 | FAIL |
| + a shape of the left shoulder | 5 | 36 | 2 | 32 | FAIL |
| + `clavicleFrom` 0.6 to 0.65 | 4 | 32 | 2 | 32 | FAIL |
| + the left shoulder shape and the rigid pair | 2 | 42 | 2 | 32 | FAIL |
| + twist bone 0.55, poles out and level | 1 | 35 | 2 | 28 | PASS |

`pnpm arm-check --all --base 141bc67a` gives no `FAIL` for the 23 roles (`arm-check-all.txt`).
The images of the final body: `lineup-*.webp` (four views at each moment), `strip-az*.webp`
(bach-bwv1050 from 17 s, each 0.5 s, at the azimuths 0, 180, -90, and 90), `arms-*.webp` (2x crop
pairs), and `head-base-views.webp`.

## 3. The result

The new body takes the standing skull top of the old body, so it sits 7 cm higher, with a larger
head. The short legs give a bench of 0.17 m, and the soles touch the floor. A higher bench
lowers the keys against the shoulders, and the paws then reach less: with the keys 10 cm lower
and the final hold, 95% of the targets are within 5 mm, against 100% (`scans/drop.txt`).

The keys must stand in front of the belly, which reaches about 0.42 m in front of the floor point
at each height from the bench to the chest. With the arms of the mesh, the paws reach the far
keys only with a lean of 35°, and then the muzzle touches the lid. The arm factor 1.25 is the
smallest factor that reaches each note with the muzzle about 5 cm from the lid, as on the old
body. The factor 1.3 gives 2 cm more room at the lid, and 1.2 needs 30° of lean.

A real pianist holds the elbows slightly in front of the body
([ArtistWorks](https://blog.artistworks.com/?p=2173)), and not against its sides, else they push
into the sides of the body and point back ([Living
Pianos](https://www.livingpianos.com/articles/why-you-cant-sit-too-close-to-your-piano/)). The poles
out and level put the elbows out of the side of the belly. The thick upper arms still press up to 10
cm into the side of the round belly near the elbow, and the sweep accepts that depth. The cut of the
arm seam, the twist bone, the clavicle fade, one rigid pair, and three shapes then pass the arm
gate.

The rest pose holds the paws on the upper belly, higher than on the old body: lower lap places
fold 9 faces at rest in place of 1 (`scans/rest-lap.txt`).

`pnpm body-probe --base 48257648` (`body-probe.txt`): only the bodies of the polar bear and its
player change. The poses of other players change where the stage layout moves for the larger
body, and where the heads of the cues turn to the pianist. `pnpm size --base 48257648`
(`size.txt`): 733,791 B, +8,955 B, for the larger mesh with its shapes. The outputs of the final
body are `pose-depth-gaps.txt`, `fold.txt`, `arm-check.txt`, and `check-final.log`.

The folds in 52% of the play samples are faces of the head, the neck, and the right forearm. They
are an open problem of `TODO.md`.
