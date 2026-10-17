# The rabbit on the front of a deeper seat, its right armpit in the rest, and its left elbow

Date 2026-10-17. Branch `rabbit-pose` on `main` at `c1d256e2`. The decisions are in
[`2026-10-17-rabbit-pose.md`](../decisions/2026-10-17-rabbit-pose.md). The probes, the logs, and
the images are in [`2026-10-17-rabbit-pose/`](2026-10-17-rabbit-pose/). The user slept, so the
manager of the session chose the side posture from a mock of the round, and the agent of the
branch measured and fitted it.

## The words of the user

On 2026-10-16 at about 23:10, the user said "3. the rabbit's pose looks weird from behind and
side", in a list, and asked for a review of the poses from many angles in the rest, the play,
and the transitions. The round `fox-form` fixed the dark band at the back of the head and gave
the vertical shins. Its agent found three faults from the side: the round belly hides the
thighs, the trunk seems to stand on the knees, and the body looks like a body that stands
against the chair.

## The mock of the side posture

The mock rendered five variants of the seated rabbit from the side, from the front at 35°, and
from the back, in the play and the rest (`mock.webp`):

- L5 and L10: the trunk leans 5° and 10° forward from the hip joints with a straight back. A
  temporary rule of the rig (`mock-lean-room.patch`) turns the hips, the spine, the spine1, and
  the chest forward on top of the upright turn of `studio.trunk`, the neck takes half of the
  counter turn, and the head stays level.
- F: the body sits 4 cm further forward on a seat 4 cm deeper. The front edge of the seat stays
  under the same place of the thighs.
- L5+F and L10+F.

`side-probe.ts` measures the seated body of the app (`mock-side.txt`). The back gap is the gap
from the back of the trunk to the front face of the chair back, between the seat and the rail
top. The visible lap is the run of the top of the right thigh from the knee back with no trunk
within 2 cm above it, in the side view. The folds come from
`pnpm rig-mesh rabbit --check --roles violinist --step 1` on 14 demos
(`rig-check-mock-lean.log`, and `rig-check-mock-room.log` with the room of F).

| Variant | Hip angle | Lean | Back gap | Visible lap | Rest faces | Lift folds | Largest stage change | Footprint depth |
|---|---|---|---|---|---|---|---|---|
| main | 114.9° | 0.4° | 1.5 cm | 4.8 cm | 6 (R 5) | 25.8% | none | 0.790 m |
| L5 | 109.9° | 5.4° | 1.5 cm | 4.4 cm | 10 (R 8) | 23.5% | +0.1% | 0.826 m |
| L10 | 104.9° | 10.4° | 1.5 cm | 4.0 cm | 15 (R 13) | 22.6% | +17.5% | 0.860 m |
| F | 114.9° | 0.4° | 5.5 cm | 4.8 cm | 6 (R 5) | 25.8% | +0.1% | 0.818 m |
| L5+F | 109.9° | 5.4° | 5.5 cm | 4.4 cm | 10 (R 8) | 23.5% | +20.0% | 0.849 m |
| L10+F | 104.9° | 10.4° | 5.5 cm | 4.0 cm | 15 (R 13) | 22.6% | +24.4% | 0.877 m |

The chair of the app fits the trunk with a gap of 1 cm (`CHAIR_BACK_CLEARANCE`), so the chair
back follows a leaning trunk, and only F opens the back gap. A lean moves the belly
further over the thighs, so the visible lap gets shorter. No variant shows more lap than `main`:
the round belly covers the top of the short thighs. In each variant, the play folds stay at
most 0.7% (0.7% on `main`), the seat height stays within 0.5 cm of `main`, and the soles stay on
the floor.

The manager chose F alone. A seated string player sits on the front half of the chair with a
straight back off the chair back, and F costs no folds. A lean added folds of the right arm in
the rest, and L5+F grew three stages by up to 20%.

```text
        main                               branch
   |<-1.5 cm->|  back                 |<--- 5.5 cm --->|  back
   |          |                       |                |
   | rail     )  trunk                | rail           )  trunk
   |          )                       |                )
   +==========)===o knee              +================)===o knee
   |  24.5 cm deep seat               |   28.5 cm deep seat
```

## The room behind the back

The setting `backRoom` of `ANIMALS` gives the room that a seated body keeps behind its back,
beyond the gap of 1 cm. The chair grows back by it, and the body keeps its place at the front
edge of the seat (`chairDepthOf()` of `tools/studio-body.ts`). The rabbit has 0.04 m. With it, the
seat is 28.5 cm deep, and the back gap is 5.5 cm (`side-main.txt`, `side-branch.txt`). The seat
height, the hip angle, the visible lap, and the soles do not change.

The footprint of the seated rabbit is 2.8 cm deeper, and the stages of `bach-bwv1047` and
`bach-bwv1048` grow by 0.1% (`rig-check-mock-room.log`). The seats of these two demos move a
little, so the looks and the cues change: `pnpm body-probe --base main` gives changed pose sets
of the red foxes, the cats, the dogs, the hippos, the polar bear, and the conductor in these two
demos only, and their bodies stay (`body-probe.txt`). After the commit of the room, the later commits of the
branch change only rest, lift, and lowering sets of the rabbits (`body-probe-after-room.txt`).
The shot test passes (`shots-room.txt`, `shots.txt`).

## The right armpit in the rest

On `main`, faces 224, 225, 372, 373, 374, and 581 at the front of the right armpit turn over in
each rest sample (`fold-probe-room.txt`). The right elbow hangs at the side, and the arm-down
shape has its full weight there. `arm-dirs.ts` writes the turns of the right arm bones in the axes
of the chest for each sample, and `rest-turn.py` gives the mean turn (`rest-turn.txt`):

- Each rest sample has the same turn of the upper arm, 61.1° from the bind, and the clavicle does
  not turn.
- Each play sample at a step of 1 s is 34.3° or more from that turn. The lift samples with a
  fold lie from 0° to 45° from it.

The rabbit config gets the shape of a raised arm at that turn (`raise` of
`tools/mesh-rigs/rabbit.json`), with the fade from 15° to 30°, so that its weight is 0 in each
play sample. The shape relaxes the faces that the skin turns over in the pose of the rule. With
the relaxing of the vertices of the clavicle and the upper arm only, faces 372 and 373 stayed
turned over: each one has a corner on the trunk under the armpit (spine 0.65, hips 0.21, and
spine1 0.14), and that corner could not move (`rig-check-raise1.log`). The new key `grow` adds
rings of neighbors to the region of the relaxing (`raise_shape()` of
`tools/blender/rig_mesh.py`). The fox and the cat rigs keep their bytes.

| Variant | Faces in the pose of the rule | Rest folds | Lift folds | Play folds |
|---|---|---|---|---|
| no shape (`main`) | - | 100% (6 faces) | 25.8% | 0.7% |
| cosine 0.3 | 2 | 100% (2 faces) | 25.6% | 0.7% |
| cosine 0.3, grow 1 | 1 | 100% (1 face) | 19.1% | 0.7% |
| cosine 0.4, grow 1 | 1 | 0% | 9.7% | 0.7% |
| cosine 0.5, grow 1 | 0 | 0% | 9.7% | 0.7% |
| cosine 0.7, grow 1 | 4 | 100% | 25.8% | 0.7% |
| cosine 0.5, grow 1, fade 20° to 32° | 0 | 0% | 8.5% | 0.7% |

The rows come from `rig-check-raise1.log` to `rig-check-raise3.log` (a play step of 1 s). The
branch keeps the cosine 0.5, one ring, and the fade from 15° to 30°: the fade to 32° folds 1.2
points fewer lift samples, but leaves 2.3° to the nearest play sample. Grow 2 gave the same rows
as grow 1. On all demos at a step of 0.25 s, no rest sample folds (each on `main`), 9.7% of the
lift samples fold (25.8%), and the play keeps 0.7% (`fold-probe-base-main.txt`). Faces 372, 373,
and 581 no longer fold, and faces 224, 225, and 374 fold only in 5.3% to 6.2% of the lift
samples.

## The left elbow at the violin

After `fox-form`, the left upper arm of the rabbit went 0.8 cm into the violin in the rest, the
lift, and the lowering, at 1.06 of the length of the upper arm, near the elbow
(`pose-depth-upper-arms.txt`). The violin stands on the left thigh, and the left elbow pointed
down and a little back, (-0.3, -1, 0.3). `pnpm hold-fit violinist --sets lift,rest,lower --base
main` with the poles of the left elbow in the rest (`hold-fit-left-pole.txt`):

| Pole | Upper arms in the violin | Forearms in the violin (rest) | Lift folds |
|---|---|---|---|
| (-0.3, -1, 0.3), `main` | 0.8 cm | 1.7 cm | 25.8% |
| (-0.6, -1, 0.3) | 0.0 cm | 1.0 cm | 25.8% |
| (-1, -1, 0.3) | 0.0 cm | 0.5 cm | 23.4% |

The branch keeps (-0.6, -1, 0.3), the smaller step: the elbow points a little out, and from the
back it shows beside the body (`species-rest.webp`). The red fox keeps its own pole.

## The fit against `main`

`pnpm hold-fit violinist --base main` on `FIT_DEMOS` at a step of 1 s (`hold-fit-base-main.txt`):

| Measure | `main` | Branch |
|---|---|---|
| Play folds | 0.9% | 0.9% |
| Lift folds | 25.8% | 9.7% |
| Faces in one rest sample | 6 (R 5, other 1) | 0 |
| Upper arms in the violin, lift, rest, and lowering | 0.8 cm | 0.0 cm |
| Forearms in the violin, rest | 1.7 cm | 1.0 cm |
| Forearms in the violin, lowering | 2.0 cm | 1.7 cm |
| Upper arms in the body, lift and rest | 0.5 cm | 0.6 cm |
| Lower end of the violin above the lap | 1.1 cm | 0.3 cm |

The other depths do not change. The standing rabbit soloist keeps its depths within 0.1 cm, and
its forearms go 1.1 cm into the body in the rest (1.6 cm) (`solo-rabbit.txt`). The first download
grows by 225 B after gzip (`size.txt`): the shape of the right arm in the rabbit module.

## Images

- `mock.webp`: the mock, one row for each variant (main, L5, L10, F, L5+F, L10+F).
- `species-rest.webp`, `species-play.webp`, `species-lift50.webp`, `species-lower50.webp`: the
  rabbit and the red fox of `main` above the branch, from the front, the front at 35°, both sides,
  and the back.
- `species-rest-zoom.webp`: the rest at the zoom 2.5.
- `violinist.webp`: the close views of the violinist of `main` above the branch.

All come from `pnpm close-views batch <dir> --species rabbit,fox-red --moments
play,rest,lift50,lower50 --views front,front35,side,left,back --zoom 1 --zoom 2.5 --role violinist
--base main`.

## Probes

- `side-probe.ts`: the side measures (`node docs/research/2026-10-17-rabbit-pose/side-probe.ts
  <label>`).
- `mock-variant.sh` and `mock-lean-room.patch`: the mock. The script ran with the patch applied
  and with the probe in `scratch/`.
- `arm-dirs.ts` and `rest-turn.py`: the turns of the right arm (`node
  docs/research/2026-10-17-rabbit-pose/arm-dirs.ts violinist <out.jsonl> 1`, then
  `uv run --no-project --with numpy python -I rest-turn.py <out.jsonl>`).
