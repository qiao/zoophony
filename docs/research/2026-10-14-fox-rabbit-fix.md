# The fixes of the red fox and the rabbit (2026-10-14)

This report gives the measures and the probes of the branch `fox-rabbit-fix`. The decisions are in
[`2026-10-14-fox-rabbit-fix.md`](../decisions/2026-10-14-fox-rabbit-fix.md). The probes, the logs,
and the images are in [`2026-10-14-fox-rabbit-fix/`](2026-10-14-fox-rabbit-fix/).

## The requests

On 2026-10-14, the manager listed the faults of the red fox and the rabbit on `main`, and the user
said: "fix them after this round". During the round, the user also said: "the rabbit's arm is
deformed", with a screenshot of a seated rabbit violinist from the back.

## The right arm of the rabbit at rest

`rest-fit.ts` sweeps the rest, the lift, and the lowering of the rabbit on the demos of
`FIT_DEMOS` with hold changes in memory, and counts the folds of the rest, the lift, and the play
on all 14 demos (`STEP=4` or `STEP=8` s for the play). A fold is a face whose posed normal is more
than 90° from its bind normal (`pnpm fold-probe`).

On `main`, the right paw held the bow at the hip (`restBow.lap` along 0.8, offset (0.25, 0.06,
-0.1) H), and the long right arm stood out to the side. Nine faces of the side of the trunk below
the right armpit, with 0.64 to 0.76 of the weight of the right upper arm, turned over in each rest
sample (`fold-violinist-base-5b3e9ee1.txt`, the same faces before the shorter arms). The weight of
the arm corrective shape does not change the count (`rest-pose-rabbit-main.txt`: 15 folded faces
with the weight 0 and 1).

| Grip (along, then the offset in H) | Right elbow | Rest folds | Lift folds | Deepest lowering | Log |
|---|---|---:|---:|---|---|
| 0.8, (0.25, 0.06, -0.1) (`main`) | (1, -0.9, -0.5) | 100% | 29.0% | 2.7 cm, right upper arm in the body | `rest-fit-rabbit-1.txt` |
| 0.8, (0.25, 0.06, -0.1) | (0.5, -1, 0) | 100% | 29.0% | 4.9 cm, right forearm in the body | `rest-fit-rabbit-1.txt` |
| 1.0, (0.25, 0.35, -0.1) | (1, -0.5, -1) | 100% | 29.0% | 3.8 cm, right upper arm | `rest-fit-rabbit-2.txt` |
| 1.0, (0.45, 0.5, -0.4) | (1, -0.9, -0.5) | 100% | 29.0% | 2.4 cm, right upper arm | `rest-fit-rabbit-3.txt` |
| 0.8, (0.5, 0.5, -0.6) (chosen) | (1, -0.9, -0.5) | 0.0% | 16.1% | 1.8 cm, left paw in the violin | `rest-fit-rabbit-4.txt` |
| 0.8, (0.7, 0.5, -0.6) | (1, -0.9, -0.5) | 0.0% | 12.9% | 1.8 cm, left paw in the violin | `rest-fit-rabbit-4.txt` |

Each grip that keeps the paw within 0.45 H of the thigh folds the faces in each rest sample. The
chosen grip is the nearest grip with no fold at rest: the paw holds the bow out and forward over the
right knee, and the arm hangs nearly straight (`rest-pose-rabbit-branch.txt`: no folded face at
rest).

## The hips on the seat

`sit()` of `tools/blender/rig_mesh.py` measures the underside of the seated bind by vertical lines
over the seat, 0.005 units apart, behind the hip joints: the lowest crossing of each line with the
faces of the body (no shin, foot, tail, or arm), less the seat top. The side view takes the
smallest gap over x at each z, with no part of the last `end` units of the haunch at its back. The
line `sit` of each rig log gives the largest gap of the side view before and after the drop
(`rig-mesh-check-fox-sit.log` and `rig-mesh-check-rabbit-sit.log`). `seat-probe.ts` of
`docs/research/2026-10-14-neck-violin/` gives the lowest corner of the body in the app in each
band of 2 cm along z (`seat-probe.txt`, branch). The last band of each body is the round back of
the haunch.

| Body | Side view, main | Side view, branch | App bands behind the hips, main | App bands, branch |
|---|---:|---:|---|---|
| Red fox | 10.5 cm | 1.6 cm | 4.1 to 11.5 cm | 0.6 to 1.7 cm |
| Rabbit | 3.7 cm | 0.8 cm | 2.4 to 4.9 cm | 1.0 to 1.6 cm |

`sit-variants.txt` lists the tries in their order, with the changes of the script between them.
With a band of 0.1 units, a face of the right side of the haunch of the fox turned over. On the
rabbit, with no limit of the drop, faces between the haunch and the tail ball turned over. The
corrective shapes give the source back: the standing body stays within 0.302 mm (red fox) and
0.324 mm (rabbit) of the long-armed source, and the fold, seat, head, and footprint tables of the
check do not change. `hips-on-seat.webp` shows the seated bind of each rig from the right, `main`
above the branch.
