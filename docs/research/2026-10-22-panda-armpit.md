# The arm seams of the panda and the rhino

Date 2026-10-22. Round `panda-armpit`, base `c5fae22c`. Decisions:
[`2026-10-22-panda-armpit.md`](../decisions/2026-10-22-panda-armpit.md). The probes and their
outputs are in [`2026-10-22-panda-armpit/`](2026-10-22-panda-armpit/). Each command runs from the
root of the tree. The probes import `../tools/` and `../src/`, so copy a probe to `scratch/`
before you run it. `with-glb.ts` runs a probe on a kept rig (`SPECIES=<species>`).

## 1. The question

The user said: "the panda and rhino's arms also got deformed". From az150, a black flap sticks
out under the panda arm, and from the right side white jagged faces cut into the black arm. From
az-150, the left forearm of the rhino is flat and angular. The goal: a clean seam and round arms
from six views at each moment of the role.

## 2. The cause

**Panda.** The arm root joins the trunk with a notch at its front and its back from y 0.47 to
0.58 u (`sections_plot.py`). The lips of the notches lie at x 0.16 to 0.18 u, inside the plane
|x| = 0.185 u of the free arm, so the cut leaves them on the trunk. Bone heat gives them 0.2 to
0.46 of arm weight. The down faces of `flap.ts` are faces 1131, 1132, 751, 752, and 1414 (left)
and 539, 554 to 556, and 363 (right) of `c5fae22c`, all on the lips (`flap-trombonist-base.txt`).
A raised arm pulls the black back lips out as the flap, and the white front lips into the arm.

**Rhino.** Each thick arm joins the trunk from the paw to the shoulder, so the cut closes the
inner side of the arm with one flat cap of 22 faces (left) and 23 faces (right) over an arm run
of 24 and 25 vertices (`patch-rhino.txt`). When the forearm turns to the tuba, the cap faces the
camera at az-150 as a flat dark sheet (`rhino-forearm-base.webp`). The base already fails the
arm look: the left upper arm section is 0.39 and its crease share 16.7% (`arm-look-base.txt`),
and the forearm ring keeps 0.80 of its bind girth (`arm-shape-tubist.txt`).

## 3. The panda variants

`flap.ts trombonist --step 1` gives the down area of the trunk faces under each arm (normal y
below -0.3), play p50. Folds come from `pnpm rig-mesh panda --check --roles trombonist`
(`check-v*.txt`).

| Variant | Down L / R (cm²) | Folds play / lift / rest | Look |
|---|---|---|---|
| red fox | 4.7 / 5.4 | | |
| `c5fae22c` | 34.7 / 32.5 | 0% / 0% / 0% | flap at az150, white wedges |
| `armBelow` [0.56, 0.62] (vB) | 30.0 / 40.3 | 100% (shapes fail) | black wedge, white flap |
| `armBelow` [0.4, 0.5] | 35.1 / 30.3 | 0% / 0% / 0% | as the base |
| split 0.16, radius 0.11 (vA) | 0.0 / 0.0 | 0% / 16.1% / 100% | white tags of the trunk wall |
| vA with root band, all lips (vL1) | 0.0 / 0.0 | 0% / 2.2% / 0% | white tag under the elbow |
| vL1 with back lips only (vM1) | 18.7 / 22.2 | 0% / 6.5% / 0% | clean, small front dent |
| vM1 with two shapes (chosen) | 18.7 / 22.2 | 0% / 0% / 0% | clean, small front dent |
| chosen with `armBelow` [0.5, 0.58] | 19.7 / 32.3 | 0% / 0% / 0% | not rendered |

Every `armBelow` range that ends above 0.52 u fails the shapes of the right arm: the back crease
slivers 486 and 562 turn over (`check-vH.txt`, `check-vK.txt`). The new key `armFree.root` of
`tools/blender/rig_mesh.py` takes the lips into the free arm only between two heights and two
depths. The front lips carry white belly fur, and in the free arm the caps of the arm took that
white (`panda-elbow-tag-vL1.webp`). The left down area of the chosen rig is below the goal of
20 cm². The right area of 22.2 cm² is the front notch of the source, which faces down in each
pose and still shows as a small gray dent below the arm from the left side.

| Measure | red fox | `c5fae22c` | round |
|---|---:|---:|---:|
| Down area L / R, play p50 (cm²) | 4.7 / 5.4 | 34.7 / 32.5 | 18.7 / 22.2 |
| Down area L / R, rest (cm²) | | 35.5 / 98.3 | 19.6 / 20.6 |
| Folds play / lift / rest | | 0% / 0% / 0% | 0% / 0% / 0% |
| Crease share L / R (`pnpm arm-look`) | 3.5% / 7.3% | 5.2% / 4.3% | 3.4% / 7.9% |
| Section L / R (`pnpm arm-look`) | 0.74 / 0.93 | 0.87 / 0.60 | 0.57 / 0.58 |
| Depths (`pnpm pose-depth trombonist --every 4`) | | 0.5 cm paws | equal |

The crop pairs `pairs-panda-<moment>-e20.webp` and `-e40.webp` show `c5fae22c` above and the
round below, from back, az150, az-150, front, left, and right, at each moment of
`ROLE_VIEWS.trombonist`.

## 4. The rhino

`arm_patch.py` (the `rabbit_elbows.py` of the rabbit elbow round) removes the joining faces in a
copy of the mesh and closes each arm with a round patch. The grid step 0.03 u keeps the rig at
3,173 of 3,200 triangles. The source has open edges at its tail, so the cut of the open trunk
hole needs the new key `cut.low` (`pinch.py`). With `weights.armIslands`, the left section rises
from 0.39 to 0.44 and the crease share falls from 16.7% to 15.7% (`arm-look-rhino-patch.txt`).
The underside of the left forearm is rounder at az-150, but still angular
(`pairs-rhino-patch-note.webp`). The round ships no rhino rig: the crease share still fails, and
the copy needs a finer patch within the triangle budget.

| Measure | red fox | `c5fae22c` | patch copy (not shipped) |
|---|---:|---:|---:|
| Crease share L / R | 3.5% / 7.3% | 16.7% / 11.0% | 15.7% / 8.7% |
| Section L / R | 0.74 / 0.93 | 0.39 / 0.41 | 0.44 / 0.49 |
| Flat cap faces L / R | | 22 / 23 | 0 (patch 52 / 47) |

## 5. The gates

`pnpm arm-check trombonist tubist --base c5fae22c` (`arm-check.txt`, the base in brackets):

| Role | Arm | folds p95 | twist p95 | flat p5 | paw twist p95 | stretch p95 | Verdict |
|---|---|---|---|---|---|---|---|
| trombonist | L | 0 (0) | 12 (18) | 0.69 (0.80) FAIL | 104 (104) | 0.05 (0.05) | FAIL |
| trombonist | R | 0 (0) | 29 (35) | 0.71 (0.84) FAIL | 92 (92) | 0.08 (0.10) | FAIL |
| tubist | L | 2 (2) | 35 (35) | 0.72 (0.72) | 110 (110) | 0.05 (0.05) | PASS |
| tubist | R | 5 (5) | 27 (27) | 0.65 (0.65) | 134 (134) | 0.07 (0.07) | PASS |

The flat p5 of the panda lift stays above the limit 0.55, but it falls from the base, because
the back lips widen the ring of the upper arm root. `pnpm arm-check --all --base c5fae22c` gives the same two `FAIL` rows and no other
(`arm-check-all.txt`). `pnpm body-probe --base c5fae22c` (`body-probe.txt`) changes the 5 panda
bodies and the panda player. 18 of 1,492 pose sets of other players also change at the start of
brahms-2 and beethoven-9, in the rest and lift samples of the hippo, the beaver, the monkey, the
elephant, and the bear conductor.
