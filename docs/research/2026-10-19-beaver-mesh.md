# The beaver mesh of the user as the bassoonist

Date 2026-10-19. Round `mesh-beaver`. Decisions:
[`2026-10-19-mesh-beaver.md`](../decisions/2026-10-19-mesh-beaver.md). The probes and their outputs
are in [`2026-10-19-beaver-mesh/`](2026-10-19-beaver-mesh/). Each command runs from the root of the
tree, and the base is `9a4613b4`, the commit before the round.

## 1. The question

The user gave a textured mesh of a beaver with no skeleton (`assets/models/beaver/beaver.glb`).
The bassoon beavers get it by route 3. The measures that decide are the size of the parametric
beaver, the reach of the bassoon grips, the clearance of the sweep, the play folds, and the look of
the hold of a real bassoonist (`docs/reference/wind-technique.md` 3).

## 2. The measures

**Size.** No reference image shows a beaver, so the mesh takes the head top of the parametric
beaver, by the rule of the user for the mouse (`landmark-probe.txt`, `measures.txt`):

| Measure | Parametric beaver (`9a4613b4`) | Beaver mesh |
|---|---|---|
| Standing head top, skull | 1.029 m | 1.029 m |
| Scale | - | 1.029 m/u |
| H | 0.361 m | 0.310 m |
| Seat | 0.271 m, on a chair | 0.072 m, no chair |
| Reach, shoulder joint to the middle of the palm | 0.516 m | 0.259 m with no factor, 0.375 m (0.81 of the trunk) with 1.5 |
| Triangles, packed mesh after gzip | - | 3,119, 28,319 B |

**Mid-report.** `pnpm mesh-options beaver <dir> --size parametric=1.029 --legs 1 --arms
1,1.2,1.4,1.6,1.71 --instrument bassoon --species beaver` (`options.md`, `options.webp`). The
largest bassoon scale with 3 cm to spare for each paw, in the play and in the rest, with the reed
under the teeth (`scale-scan.sh`, `options/scale-table.txt`):

| Arm factor | Arm/trunk | Square shoulders | Shoulders 20° forward |
|---|---|---|---|
| 1.2 | 0.66 | below 0.6 | below 0.6 |
| 1.4 | 0.76 | below 0.6 | 0.75 |
| 1.6 | 0.86 | 0.75 | 0.90 |
| 1.71 | 0.91 | 0.85 | 0.95 |

The user chose "Arms 1.5, bassoon ~0.8" and "No chair, as the mouse".

**Tail.** The broad tail lies on the floor. With its bones of the first config, it was the lowest
point of the seated bind, 3 cm below the soles, so it set the seat and the feet hung above the
floor (`rig-tail.txt`):

| Root bone, tip bone (below the level) | Tail into the rig seat | Lowest point of the tail | Seat |
|---|---|---|---|
| 17.5°, 30° | 0.5 cm | 3 cm below the soles | 0.103 m |
| 10°, 25° | 0.06 cm | 0.2 cm above the soles | 0.072 m |
| 0°, 35° | 0.3 cm | 0.6 cm above the soles | 0.072 m |

**Reed and bocal.** The mouth of the bind pose is 0.08 H below the tip of the nose, in front of
the long front teeth. The reed moves 0.33 H down and 0.25 H back, under the teeth. The bocal of the
bassoon of `9a4613b4` came to the reed nearly level only on an upright tube. In the play turn of
the hold, its end rose 43.7° to the reed, and with the new bend 2.8° (`bocal-angle.txt`). A more
upright tube also gives a level bocal, but the right paw then missed its grip by 1 cm to 9 cm
(`reach-turns.txt`).

**Hold.** `pnpm hold-fit bassoonist --set` (`hold-fit-poles.txt`, `hold-fit-reachL.txt`,
`hold-fit-poles-left.txt`):

| Variant | Play upper arm, paw L | Play upper arm, paw R | Play depth | Note targets within 5 mm |
|---|---|---|---|---|
| Elbows of `WIND_HOLDS.bassoon` | 99°, 173° | 58°, 75° | 1.3 cm | 100% |
| Elbows (±0.5, -1, -0.5) | 84°, 127° | 58°, 75° | 1.5 cm | 100% |
| Elbows (±1, -1, -1) | 86°, 148° | 76°, 111° | 1.4 cm | 100% |
| Elbows (±1, -0.5, -0.3) | 88°, 157° | 82°, 121° | 1.5 cm | 100% |

With the left shoulder 15° forward, face 427 of the front of the left shoulder folded in each play
sample. From 20° on, it folds in none. The scale of the bassoon then follows from the right paw
(`hold-reach-scales.txt`): 3.1 cm to spare at 0.82, and 2.7 cm at 0.83.

**Folds.** `pnpm fold-probe bassoonist` (`fold-probe-bassoonist.txt`):

| Variant | Play | Rest | Most faces |
|---|---|---|---|
| No shape | 100% | 100% | 14 (L 7, R 6, other 1) |
| Two shapes of the right arm (final) | 100% | 100% | 8 (L 6, R 1, other 1) |

The right arm folds in no play sample with its two shapes. Three faces of the left arm still fold
in each play sample: the thin faces 380 of the chest and 706 of the left shoulder, and face 1246 of
the inner elbow. A shape of the left arm relaxed them, but the relax left faces 427, 428, and 709
turned over, also with the left shoulder 30° or 40° forward (`rig-raise.txt`). Rigid weights on
faces 380 and 706 moved the folds to the faces around them.

**Other roles.** `pnpm body-probe --base 9a4613b4`: 90 of 95 bodies and 22 of 23 players are
equal, and the five other bodies and the one other player are the beaver (`body-probe.txt`). The
smaller footprint with no chair moves the layout, so 1,314 of 1,492 pose sets are equal.
`pnpm fold-probe <role> --base 9a4613b4` gives the same folds for the oboist, the flutist, the
trombonist, the timpanist, and the cellist, and `pnpm pose-depth <role> --base 9a4613b4` the same
depths for the oboist, the flutist, and the trombonist (`other-roles/`). `pnpm test:paused
src/shots/` passes (`shots-test.log`).

**Clearance.** `pnpm pose-depth bassoonist --gaps` (`pose-depth-bassoonist.txt`): each part
stays within the contact depth of 1.5 cm, except the left paw in the bassoon in the lift and the
lowering. It closes on the wing joint and goes just over 1.5 cm into the tube in one sample of
about 30 in some demos, so the sweep accepts 1.6 cm there. Each note target is within 5 mm.

**Images.** `pnpm close-views batch <dir> --species beaver --role bassoonist --lineup --camera
default --base 9a4613b4`: `bassoonist-base-views.webp` (at 3/4 of the size of the batch),
`lineup-base-views.webp`, `species-play-base-views.webp`, `species-rest-base-views.webp`, and
`play-views.webp`. `source-views.webp` shows the mesh of the user (`source_views.py`).

## 3. The result

The beaver plays a bassoon of 0.82 with the arms of the factor 1.5 that the user chose, and with
no chair. The bassoon lies diagonal in front of the body, the left paw above the right paw, and
the bocal brings the reed under the front teeth nearly level. Each part stays within the contact
depth, each note target is within 5 mm, and each paw keeps 3.1 cm or more to spare. The play folds
of the left arm stay open.

## 4. The arm cut

Round `beaver-arm`, base `98cab0e7`. Under the left armpit, the thin faces 380 of the chest and
706 of the shoulder folded in each play sample. Face 1246 of the inner elbow folded too
(`fold-probe-arm-base.txt`). The variants (`arm-cut.txt`, `arm-rig.sh`, `raise-fit-arm.txt`):

| Variant | Play | Lift | Rest |
|---|---:|---:|---:|
| `98cab0e7` | 100% | 100% | 100%, 8 faces |
| No cut, a ring at the left shoulder or the left elbow | 100% | 100% | 100% |
| No cut, flips of more edges (`angle` 140, `move` 0.004) | 100% | 100% | 100% |
| No cut, a ring at the left shoulder and a shape of the left arm | 100% | 100% | 100% |
| Cut, top 0.55, 0.62, or 0.64 | 100% | 100% | 100% |
| Cut, top 0.58 | the rig stops | | |
| Cut, top 0.6 | 100%, face 1738 | 97.2% | 100% |
| Cut 0.6 and a ring at the left shoulder | 100% | 100% | 100% |
| Cut 0.6, the left shoulder 25° forward | 0% | 13.3% | 100% |
| Cut 0.6, the left shoulder 30° forward | 100% | 100% | 100% |
| Cut 0.6 and a shape of the left arm (final) | 0% | 13.3% | 100%, 3 faces |

The cut and the shape remove each play fold, and the hold keeps its shoulder turn of 20°. The
right arm has no fold after the cut, so its two shapes go. Three faces of the left arm fold in
the rest, as before (`fold-probe-arm.txt`).

Each depth of `pnpm pose-depth bassoonist --gaps --base 98cab0e7` stays within 0.1 cm of the base,
and each note target within 5 mm (`pose-depth-arm.txt`). `pnpm body-probe --base 98cab0e7`
differs only for the beaver (`body-probe-arm.txt`). The first download shrinks by 541 B
(`pnpm size --base 98cab0e7`).

**Images.** `pnpm close-views bassoonist <dir> --base 98cab0e7`: `arm-cut-views.webp`, the base
above, at 3/4 of the size. With `--zoom 2 --scale 2`: `arm-cut-left.webp` and
`arm-cut-right.webp`, the base on the left. The long spike of the fold under the left arm of the
base is gone. In the lift and the rest, a dark slot with a thin dark wedge shows at the cap of the
cut under the left arm. The right arm shows a small step at the top of the cut.
