# The T-pose rhino mesh

Date 2026-10-28. The user gave a new rhino mesh and said: "use the rhino model at
/Users/xueqiaoxu/Downloads/Meshy_AI_rhino_tpose_3k_triang_1029050510_texture.glb". The probes and
the images are in [`2026-10-28-rhino-tpose/`](2026-10-28-rhino-tpose/). The probe scripts are those
of [`2026-10-23-rhino-apose/`](2026-10-23-rhino-apose/): `sections.py`, `dump.py`, `arm_axis.py`,
and `head_colors.py`. The rig of `main` still uses the A-pose copy `rhino-apose-arms.glb`.

## 1. The mesh

The mesh has 3,115 triangles and 1,560 vertices after the weld (`assets/models/rhino/README.md`).
The legs part below y 0.19 with their middles at x 0.11 to 0.12, and the trunk middle lies at z
-0.05 to -0.06, as on the A-pose mesh (`sections-y.txt`). The arms stand out level at y 0.62, from
the root at x 0.19 to the paw tip at x 0.437 (`arm-axis.txt`). The width falls evenly from 0.10 to
0.09, so the arm has no narrow wrist. The paw is a round stump with nails at its end. The eyes lie
at x 0.050 to 0.066, y 0.808 to 0.830, and z 0.073 to 0.089 (`head-colors.txt`). The tail hangs
from y 0.27 to 0.13 at z -0.21.

## 2. The first rig

`rhino-wip.json` holds the config of the first rig: the new arm joints at the shares of the old
arm, the eye box, the tail ball, and the shoulder height 0.958 m, so that the head top stays
1.462 m. `rhino_tpose_arms.py` (run it from `tools/blender/`) builds the arm copy with the steps of
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
accepted grip of the tuba. The next round fits the palm, the elbow poles, and the finger curl of
`RHINO_TUBA` together, with the arm gate and `pnpm pose-depth tubist`.
