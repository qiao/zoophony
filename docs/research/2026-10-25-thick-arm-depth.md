# The depth of the thick upper arms of the elephant and the rhino

Date 2026-10-25. Round `thick-arm-depth`. Decisions:
[`2026-10-25-thick-arm-depth.md`](../decisions/2026-10-25-thick-arm-depth.md). The probes and
their outputs are in [`2026-10-25-thick-arm-depth/`](2026-10-25-thick-arm-depth/). Each command
runs from the root of the tree. "main" is `7d27a881`.

## 1. The question

The upper arms of the elephant timpanist went 2.9 cm into the belly (goal 1.5 cm), and those of
the rhino tubist 1.8 cm to 2.0 cm into the body. The last round blamed the elbow helper of the
elephant. The round proves each cause first, then fixes it and keeps the strikes, the mallet
directions, and the grasp of each paw.

## 2. The cause

`probes/depth-cause.ts` measures the deepest corners of one upper arm at one sample again, with
the weight of the elbow helper, of the clavicle and the trunk, or all weight moved to the upper
arm segment with the most weight. The body surface stays. It also gives the depth in the bind
pose. `probes/cause.sh` runs it on main (`cause-main.txt`) and on the tree (`cause-tree.txt`).
`probes/helper-turn.sh` sets the turn of the elbow helper in `poseSegments()` for one run
(`where-main.txt`, `where-helper0.txt`, `where-helper1.txt`).

| Body, sample | Rig cm | Helper weight moved cm | Trunk weight moved cm | Rigid cm | Bind cm |
|---|---:|---:|---:|---:|---:|
| elephant R, `beethoven-8-4` 565.34 s | 2.94 | 2.94 | 3.41 | 3.42 | 0.0 |
| elephant R, rest | 2.90 | 2.90 | 3.39 | 3.44 | 0.0 |
| elephant L, 565.34 s | 1.10 | 1.26 | 2.44 | 2.47 | 0.0 |
| rhino R, `brahms-2` 340.38 s | 1.77 | 1.77 | 1.77 | 1.77 | 1.0 |
| rhino R, rest | 1.99 | 1.99 | 1.99 | 1.99 | 1.0 |

- **Elephant.** The deepest corner (vertex 231, 0.71 along the right upper arm) has no helper
  weight: 0.89 on the upper arm segments and 0.11 on the first forearm segment. A helper turn of
  0 or 1 leaves it at 2.9 cm. The helper and the clavicle pull other corners out. The arm goes
  in as one rigid part: the bind holds the upper arm out and forward, and the ready pose turns it
  down along the round belly. Linear skinning does not press the flesh of the inner side.
- **Rhino.** The deepest corner of the play lies at the root of the right arm, with 0.59 of its
  weight on the chest and the spine. It is 0.9 cm in the body already in the bind pose. The
  deepest corner of the rest (0.55 along) follows the arm as a rigid part. No weight change
  moves either.

## 3. The elephant: a flatter inner upper arm

The elbow pole cannot fix it: the right wrist lies only 6 cm out of the shoulder in the ready
pose, so the elbow moves on a small circle (`probes/poles.sh` on main, `poles-main.txt`: 3.7 cm
at x 0.3, 2.9 cm at 0.8, 2.5 cm at 3). The strike spots and the homes set the strikes and the
mallet directions, so they stay.

`probes/vertex-depth.ts` gives the deepest depth of each upper arm vertex over all states, with
its place in the source from the corners file of `pnpm rig-mesh elephant --check --keep <dir>`
(`vertex-depth-main.txt`). The deep corners lie on the inner front of the upper arm, from 0.5 to
1.0 of its length, at the mean direction (0.54, -0.37, 0.76) from the axis. `step_flatten()` of
`tools/blender/elephant_arms.py` selects the tube vertices within 25° of that direction from 0.55
to 0.8 along the upper arm (4 on each arm), and moves them toward the axis with Translate and
Proportional Editing (Smooth, Connected Only, size 0.05 units). `probes/variants.sh` builds and
rigs each move, and gives the depth at the first sample of section 2 (`variants.txt`: the first
fold line is the rig of the tree, the second the variant).

| Move u | Right upper arm cm | Left upper arm cm | Most folded faces in a sample, L / R |
|---:|---:|---:|---|
| 0 (main) | 2.9 | 1.1 | 4 / 3 |
| 0.008 | 1.5 | 0.8 | 4 / 1 |
| **0.009** | **1.3** | **0.7** | **5 / 2** |
| 0.010 | 1.1 | 0.7 | 7 / 1 |

The round takes 0.009 units (1.7 cm). The accepted depth of 3.0 cm goes (`TIMPANIST_SWEEP`).
Two replays give the same bytes (`assets/models/elephant/README.md`).

## 4. The rhino: the right elbow out

`probes/rhino-poles.sh` measures the right shoulder turn (`reach`) and the right elbow poles at
the samples of section 2 (`rhino-poles.txt`). `rhino-depth-variants.txt` gives
`pnpm pose-depth tubist` of four variants, and `rhino-gate-variants1.txt` to `3.txt` the arm gate
of 15 variants. A higher elbow lowers the depth and raises the twist of the right paw.

| Reach, right poles | Play cm | Rest cm | Twist p95 | Paw twist p95 | Move twist max |
|---|---:|---:|---:|---:|---:|
| 30°, (1, -0.5, -0.5) (main) | 1.76 | 1.99 | 22 | 133 | 133 |
| 45°, (1, -0.5, 0) | 1.78 | 1.80 | 30 | 130 | 130 |
| 45°, (1, -0.25, -0.25) | 1.44 | 1.53 | 32 | 145 | 145 |
| **45°, (1, -0.2, -0.25)** | **1.38** | **1.47** | **32** | **148** | **148** |
| 45°, (1, 0, -0.5) | 1.21 | 1.40 | 33 | 160 | 160 |

The bold row has both depths below 1.5 cm with the smallest paw twist.

## 5. The gates

`probes/gates.sh` writes each output. `pnpm arm-check timpanist tubist --base main` (`gate.txt`,
main in brackets):

| Role | Arm | Folds | Twist | Forearm twist | Flat | Paw twist | Grip turn | Move twist | Move turn | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| timpanist | L | 4 (4) | 27 (26) | 7 (8) | 0.82 (0.82) | 18 (18) | 4 (4) | 18 (18) | 82 (82) | PASS |
| timpanist | R | 2 (3) | 29 (29) | 5 (5) | 0.78 (0.78) | 9 (9) | 0 (0) | 10 (10) | 147 (147) | PASS |
| tubist | L | 3 (3) | 42 (42) | 59 (59) | 0.63 (0.63) | 148 (148) | 96 (96) | 148 (148) | 18 (18) | OPEN |
| tubist | R | 4 (4) | 32 (22) | 62 (53) | 0.65 (0.68) | 148 (133) | 6 (19) | 148 (133) | 29 (171) | FAIL |

The OPEN grip turn equals main. The FAIL is the margin of 3° of the right move twist max, inside
the limit 176°. The p50 of the moves is 146°, the paw twist of the hold, as on the left paw.

`pnpm pose-depth <role> --base main` (`pose-depth-timpanist.txt`, `pose-depth-tubist.txt`, cm,
main in brackets):

| Pair | Play | Lift | Rest | Lowering |
|---|---|---|---|---|
| elephant upper arms in the body | 1.3 (2.9) | 1.3 (2.9) | 1.3 (2.9) | 1.3 (2.9) |
| elephant forearms in the body | 0.4 (0.6) | 0.4 (0.6) | 0.4 (0.6) | 0.4 (0.6) |
| elephant mallets in the kettles | 2.0 (2.0) | 0.5 (0.5) | | |
| rhino upper arms in the body | 1.4 (1.8) | 1.5 (2.0) | 1.5 (2.0) | 1.5 (2.0) |
| rhino paws in the tuba | 1.2 (1.1) | 1.2 (1.4) | 1.0 (0.7) | 1.2 (1.4) |
| rhino claws in the tuba | 0.8 (0.7) | 0.5 (1.3) | 0.5 (1.0) | 0.5 (1.4) |

The tuba stays 3.8 cm in the body, as on main.

`pnpm wind-grip tubist` (`wind-grip-tubist.txt`, `wind-grip-tubist-main.txt`): the left paw
grasps as on main. The right paw grasps in 99% of the play samples (main 97%) and in each sample
of the lift, the rest, and the lowering (main 97%, 100%, 93%). The elephant pose does not change,
so its mallet grasp stays (grip turn 4° and 0°).

The twist steps (`node docs/research/2026-10-24-violin-arms/twist-steps.ts <role> 0.25`,
`twist-<role>.txt` and `-main.txt`): the elephant steps equal main. The largest rhino step grows
from 66.5° to 74.1° on the right forearm (target 25°).

`pnpm body-probe --base main` (`body-probe.txt`): only the 5 elephant bodies and the timpanist
player change, and only the 8 pose sets of the two rhino tubists. `pnpm size --base main`
(`size.txt`): 787,649 B, 142 B less than main (limit 1,000,000 B).

`pnpm frame-compare main HEAD --runs 1` (`frame.txt`, ms, one run of each item):

| Item | Main thread p50 / p95 | GPU p50 / p95 | Frame rate with no cap |
|---|---|---|---|
| main | 4.07 / 5.23 | 7.82 / 8.00 | 132.0 fps |
| branch | 3.77 / 4.99 | 7.97 / 8.14 | 129.3 fps |

The round adds no triangle, bone, or draw. Both items fail the frame target of design 9.7, as
on main. The frozen shots change at most 0.01% of the pixels by more than 16.

## 6. The images

`timpanist-views.webp` and `tubist-views.webp` give main above the tree, at each moment, from the
front, each side, the back, and ±35° at the zoom 2. The `-e40` grids give the back, az150, and
az-150 at the elevation 40. `crop-timpanist-front.webp`, `crop-timpanist-sides.webp`,
`crop-tubist-front.webp`, and `crop-tubist-right.webp` are 2x crop pairs (`probes/pair.py`).
The inner front of the right elephant arm is a little straighter from the front. No new fold,
crease, slot, or clip shows, and the back shows no gap between an arm and the trunk. The right
rhino elbow stands further out from the front and from behind, and the paw stays on the valves.

## 7. The open faults

- The rhino gate fails the margin of the right move twist max (148°, main 133°, limit 176°).
- The largest rhino twist step is 74.1° (main 66.5°, target 25°).
- 0.9 cm of the rhino play depth is in the bind pose: the root faces of the arm lie under the cap
  of the body surface.
