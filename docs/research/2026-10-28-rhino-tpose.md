# The T-pose rhino mesh

Date 2026-10-28. The user gave a new rhino mesh and said: "use the rhino model at
/Users/xueqiaoxu/Downloads/Meshy_AI_rhino_tpose_3k_triang_1029050510_texture.glb". The probes and
the images are in [`2026-10-28-rhino-tpose/`](2026-10-28-rhino-tpose/). The probe scripts are those
of [`2026-10-23-rhino-apose/`](2026-10-23-rhino-apose/): `sections.py`, `dump.py`, `arm_axis.py`,
and `head_colors.py`. Decisions: [`2026-10-28-rhino-tpose.md`](../decisions/2026-10-28-rhino-tpose.md).

## 1. The mesh

The mesh has 3,115 triangles and 1,560 vertices after the weld (`assets/models/rhino/README.md`).
The legs part below y 0.19 with their middles at x 0.11 to 0.12, and the trunk middle lies at z
-0.05 to -0.06, as on the A-pose mesh (`sections-y.txt`). The arms stand out level at y 0.62, from
the root at x 0.19 to the paw tip at x 0.437 (`arm-axis.txt`). The width falls evenly from 0.10 to
0.09, so the arm has no narrow wrist. The paw is a round stump with nails at its end. The eyes lie
at x 0.050 to 0.066, y 0.808 to 0.830, and z 0.073 to 0.089 (`head-colors.txt`). The tail hangs
from y 0.27 to 0.13 at z -0.21.

## 2. The first rig

`tools/mesh-rigs/rhino.json` holds the new arm joints at the shares of the old arm, the eye box,
the tail ball, and the shoulder height 0.958 m, so that the head top stays 1.462 m.
`tools/blender/rhino_tpose_arms.py` builds the arm copy with the steps of
`bear_arms.py` and four changes for this mesh:

- The shoulder cut stands at 0.4 of the short upper arm, out of the joined root.
- The clean of the cut loops collapses only an edge along the loop. The clean of `wind_arms.py`
  ran to its limit of 200 collapses on the long thin faces and broke the root into shards.
- The Shrinkwrap of the tube projects at most 0.03 units. A vertex under the arm went 0.13 units
  down onto the trunk and made a long shard from the root to the side.
- The fixes of `rhino_arms.py` take the paws off the wrist helper and the neck off the clavicles,
  and a new fix takes the clavicles off the chest: the automatic weights spread each clavicle from
  y 0.39 up to 0.80.

The rig plays the tuba with the hold of `main` (`first-rig-views.webp`, `main` above the new
rhino), but the arm gate of the tubist fails on the folds (`fold-first.txt`). The faces of the
right paw stump fold under the finger curl of the grip, and faces at the shoulder tops fold with
clavicle turns of 100° to 177°.

## 3. The palm

The palm hint sets the roll of the arm bones. The palm of the old mesh, turned onto the T-pose
arm, points down and back, and the folds at p95 were 16 and 19 faces (limit 8).

| Palm | Folds L, R | Grip turn L, R | File |
|---|---|---|---|
| (0, -1, 0) | 10, 14 | 11°, 18° | `palm-variant-1.txt` |
| (0, -0.5, 0.85), as the bear | 9, 11 | 74°, 79° | `palm-variant-2.txt` |
| (0, -0.7, 0.7) | 8, 11 | 58°, 64° | `palm-variant-3.txt` |

A palm down and forward lowers the folds, but the grip then turns past the limit of 45° from the
accepted grip of the tuba. So the rig keeps the palm (0, -1, 0), and section 4 lowers the folds
with the weights.

## 4. The hold fit

The user said "yes" to the hold fit. With the palm (0, -1, 0), half of the finger weight on the
paws (`weights.fingers` 0.5) lowers the folds at p95 from 10 and 14 faces to 5 and 8. Rigid
weights on the slivers of the shoulders gave nothing more. 6 rounds of `armSmooth` lower the
crease share of `pnpm arm-look tubist` from 15.2% and 14.7% to 12.8% and 14.5% (limit 14.6%), and
the folds to 4 and 6 faces (`arm-check.txt`). 4 rounds left the right arm at 14.9%.

`pnpm hold-fit tubist --grid 'tuba@rhino.lipShift.2=-0.06:0.06:0.02'` (`hold-fit.txt`) gives the
tuba in the belly: 4.6 cm with no shift, 3.1 cm at -0.04, 2.4 cm at -0.06, and more with a plus
shift. The hold takes -0.05: 2.7 cm (3.8 cm on `main`). The grips of both paws did not change the
paws in the tuba, 2.3 cm to 2.4 cm (limit 2.2 cm, 1.9 cm on `main`).

| Gate against `main` | `main` | T-pose rhino |
|---|---|---|
| Folds p95, L and R | 5, 3 | 4, 6 |
| Flat p5, L and R | 0.92, 0.94 | 0.92, 0.87 |
| Grip turn p50, L and R | 0°, 0° | 12°, 17° (limit 45°) |
| Crease share, L and R | | 12.8%, 14.5% |
| Paws in the tuba | 1.9 cm | 2.4 cm |
| Tuba in the belly | 3.8 cm | 2.7 cm |

`pnpm arm-check tubist --base main` marks the right arm `FAIL` where the old rhino had better
values, each inside its own limit. The new body also moves the conductor of `brahms-2` and
`boulanger-matin` and the panda trombonist of `brahms-2` from a few samples on (`body-probe.txt`). The first download is 843,144 B. `final-views.webp` shows `main` above the new
rhino from six directions.
