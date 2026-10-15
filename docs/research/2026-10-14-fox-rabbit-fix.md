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

## The rest of the red fox

The screenshot of the user shows the cat violas with the viola upright on the lap and the scroll
near the chest (`S/ref-crops/user-cat-rest.png` of the manager, `fox-rest-beside-user.webp`). On
`main`, the violin of the red fox took the axis of the chin hold, (-0.17, 0.95, -0.26), with its
tail end 0.06 H above the thigh, so it leaned to the left and its scroll was at the belly.
`rest-fit-fox.txt` gives the rest, the lift, and the lowering of three heights of the tail end with
the axis (0, 1, -0.15). Each height keeps the folds. 0.3 H puts the scroll at the chest.

| Tail end above the thigh | Axis | Rest | Lowering | Log |
|---|---|---|---|---|
| 0.06 H (`main`) | (-0.17, 0.95, -0.26) | 1.1 cm, left paw in the violin | 3.1 cm, right upper arm in the body | `hold-fit` base of `main` |
| 0.2 H | (0, 1, -0.15) | 0.9 cm, right upper arm in the body | 2.8 cm, bow in the body | `rest-fit-fox.txt` |
| 0.3 H (chosen) | (0, 1, -0.15) | 0.9 cm | 2.6 cm, right upper arm in the body | `rest-fit-fox.txt` |
| 0.35 H | (0, 1, -0.15) | 0.9 cm | 2.6 cm | `rest-fit-fox.txt` |

## The clipping of the violinists

`pnpm hold-fit <role> --grid` fits the holds at a step of 1 s on the demos of `FIT_DEMOS`
(`hold-fit-violinist-grid1.txt`, `hold-fit-violinist-grid2.txt`, and
`hold-fit-fox-violinist-grid1.txt`). `violin-probe.ts` of `docs/research/2026-10-14-arms-rest/`
measures the violins against the neck and the trunk on the Beethoven 9 demo every 2 s
(`violin-probe-variants.txt`, `violin-probe.txt`). The depths of a row are play, lift, and lowering.

| Body | Hold | Play folds | Depths (cm) | Violin into the neck | Log |
|---|---|---:|---|---|---|
| Rabbit | `main` (left elbow (-0.5, -1, -1)) | 3.8% | 2.3, 1.6, 1.8 | 0.2 cm | `hold-fit-violinist-grid1.txt` |
| Rabbit | left elbow (-1, -1, -1) | 0.3% | 2.0, 1.4, 1.9 | | `hold-fit-violinist-grid1.txt` |
| Rabbit | left elbow (-1.5, -1, -1) | 13.1% | 2.0, 1.4, 2.0 | | `hold-fit-violinist-grid2.txt` |
| Rabbit | left elbow (-1, -1, -0.5) (chosen) | 0.3% | 2.0, 1.4, 1.9 | 0.2 cm | `hold-fit-violinist-branch.txt` |
| Red fox | `main` (free hair 0.1 m, right elbow (1.4, -0.7, -1)) | 17.4% | 3.0, 2.8, 2.6 | 1.1 cm | `hold-fit-fox-violinist-grid1.txt` |
| Red fox | free hair 0.12 m, right elbow (1.8, -0.7, -1) | 17.4% | 2.4, 2.0, 2.6 | 1.1 cm | `hold-fit-fox-violinist-grid1.txt` |
| Red fox | the same, slant 8° | 20.1% | 2.4, 2.0, 2.6 | | `hold-fit-fox-violinist-grid1.txt` |
| Red fox | the same as the second row, violin 0.01 H higher (chosen) | 16.1% | 2.7, 2.2, 2.6 | 1.0 cm | `hold-fit-fox-violinist-branch.txt` |

The left fingers over the strings (`fingers`) change no depth of the rabbit. The chosen hold of the
red fox keeps the violin within 1.0 cm of the neck, and the play and the lift go 0.3 cm and 0.8 cm
less deep than on `main`. The depths over 1.5 cm stay open: the left paw of the rabbit in the
violin, and the bow paw and the right upper arm of the red fox in the body.

## The neck band of the red fox

The fur spikes at the bottom of the back of the head of the fox mesh hang over the back of the
neck. From the back and the sides, the gaps between the spikes and the shadow under them show as a
dark jagged band under the head (`neck-back.webp`, upper row). The band shows also with the head
factor 1 and the neck factor 1, so the source makes it, and the head factor 1.2 makes it taller.
The stretch check of `pnpm rig-mesh fox --check` lists no face of the neck
(`rig-mesh-check-fox-main.log`), and no face of the back of the neck turns over in the bind.

`smooth_box()` of `tools/blender/rig_mesh.py` smooths the vertices of the source inside a box
before the weights. `fox-smooth-config.json` gives the box of the back of the neck and the bottom
of the back of the head. With it, the neck line is clean from the back and the sides
(`neck-back.webp`, lower row), the standing body stays within 0.302 mm of the long-armed source,
and the folds of each role stay (`rig-mesh-check-fox-smooth.log`). After the weights, the same
box folded the tan flute fox in each play sample, because its head turns 30°
(`rig-mesh-check-fox-smooth-after-weights.log`).

The smoothing also changes the layout of four demos. The stage side grows by 2.2% (the two Bach
demos BWV 1047 and 1048), 0.2% (Mozart K. 191), and 4.6% (Mozart K. 525). Two tests of the shot
planner in `src/shots/trace.test.ts` fail, and the paused test of the neighbors of a row in
`src/models/layout-scene.test.ts` fails. A box below the head line (y up to 0.725 units) changes
the stages too (`rig-mesh-check-fox-smooth.log`). The seats, the head tops, and the footprints
of the form table do not change at 1 mm. So the configs keep no box, and the band stays open.
