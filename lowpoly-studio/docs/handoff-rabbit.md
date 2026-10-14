# Handoff: rabbit violinist, round 3 (the ears)

Branch `rabbit-ears`, worktree `.claude/worktrees/rabbit-ears`, from main d020aca0.
Brief: give the ears the look of the sheet (pointed blades, a narrow pink slot, a wide cream
band on the inner edge, soft facets), and change nothing else of the body (2026-10-13).
Rounds 1 and 2 are in the git log of this file (d020aca0 holds the handoff of round 2).

## Last finished step

The ears round is committed, and the golden file holds the last build (1d8773e8).
`python3 studio regress bear` and `python3 studio regress polar-bear` gave identical GLB and
model GLB files after the studio code change. The 21 studio unit tests pass.

| Commit | Step |
|---|---|
| 8dda9558 | The config kind `triples` (a list of lists of 3 numbers). |
| 9f662c4a | The blade loft of the ear details (`details.ears.blade` and its fields). |
| 0cdc5b77 | The blade ears of the rabbit. |
| e497d38f | The build of the round (`--all-seeds`). |
| 1d8773e8 | The golden stats. |

## Next step

The app: give the app rabbit the GLB of this round (`pnpm studio-body rabbit`). Each vertex
outside the ears has the same place, joints, and weights as in round 2, and no joint moves, so
the holds of the app agent stay valid. Then a look review with the user (about 20 min): the ears
in the side view and the shoulders.

## Body and rig

The role build keeps seed 5, and the model build keeps seed 6, as in round 2. The probe
`bodydiff.py` of the session scratchpad compares the role GLB of round 2 with the new one: the
joint names are the same, the largest change of the 32 bind matrices is 0, and the 8685
vertices outside the ears have the same places, joints, and weights (largest change 0). Only
the ear vertices change (1920 to 1168 GLB vertices).

## Numbers (role seed 5, model seed 6)

| IoU front, side, back, 3/4 | checks pass / all, near, stale | gates | body triangles | ear triangles | seeds pass (seed report) |
|---|---|---|---|---|---|
| 0.9244, 0.9016, 0.9159, 0.8528 | 67 / 80, 7 near, 0 stale | pass | 1204 | 200 in each ear | 3 of 3 gated seeds (5, 4, 8) |

Round 2: IoU 0.9178, 0.9158, 0.9182, 0.8515, 68 of 80 checks, 320 triangles in each ear. GLB
879 kB (round 2: 920 kB), model GLB 509 kB (550 kB).

The rows of the brief, from `ears.py` of the session scratchpad (the ear at x < 0 in the front
view, units animal heights):

| # | Rows | Sheet | Round 2 | Round 3 |
|---|---|---|---|---|
| 1 | ear run, y 0.98 / 0.96 / 0.94 / 0.92 | -0.123 to -0.088 / -0.072 / -0.058 / -0.048 | -0.122 to -0.071 / -0.058 / -0.048 / -0.039 | -0.122 to -0.082, -0.126 to -0.066, -0.127 to -0.055, -0.126 to -0.046 |
| 2 | pink run, y 0.90 / 0.88 / 0.84 / 0.82 | -0.113 to -0.068 / -0.110 to -0.065 / -0.100 to -0.062 / -0.091 to -0.061 | -0.111 to -0.055 / -0.111 to -0.049 / -0.101 to -0.045 / -0.084 to -0.042 | -0.116 to -0.071 / -0.111 to -0.069 / -0.098 to -0.066 / -0.090 to -0.065 |
| 2 | inner band, same rows | 0.029 / 0.035 / 0.041 / 0.041 | 0.022 / 0.022 / 0.025 / 0.023 | 0.029 / 0.035 / 0.042 / 0.046 |
| 3 | pink at y 0.98 / 0.78 | -0.114 to -0.107 / -0.066 to -0.056 | none / none | -0.117 to -0.104 / -0.069 to -0.059 |

## Times (python3 studio log rabbit, bear, polar-bear)

| Part | Start | End | Minutes |
|---|---|---|---|
| Brief, rules, crops, baseline build, probe of the rows | 19:03 | 19:07 | 4 |
| Blade code, first build (tip too low, front IoU 0.868) | 19:07 | 19:09 | 2 |
| Ring probe, 7 probe rounds, 3 builds of seed 5 | 19:09 | 19:20 | 11 |
| All seeds, regressions, unit tests, commits, golden | 19:20 | 19:24 | 4 |

| Step | Count | Typical seconds |
|---|---|---|
| Ring probe (`rings.py`, no build) | 8 | 2 |
| Build, a detail change (`--seed 5`) | 6 | 19 to 27 |
| Build `--all-seeds` (the body stages from the cache) | 1 | 37 |
| `regress` bear, polar bear | 2 | 23, 63 |

## Failing checks

| Check | Value | Verdict |
|---|---|---|
| `iou.front`, `iou.back` | 0.9244, 0.9159 | open (the sheet symmetry 0.9615, the shoulders 0.01 narrow, the head 0.010 wide at y 0.74). The back ear tips of the sheet are 0.012 nearer the axis than its front ear tips. |
| `iou.side` | 0.9016 | limit of the sheet: the side ears are at two depths and two leans. The round ears of round 2 filled more of their union. |
| `iou.three_quarter` | 0.8528 | limit of the sheet |
| `eye_outline.three_quarter.*`, `eye_y.three_quarter.1` | see `animals/rabbit/README.md` | limit of the sheet |
| `ear_dark.front.left_in_image` | 0, 0.16 | limit of the sheet (one inner ear in shade) |
| `ear_width.side` | 0.1077, 0.0611 | measure: the bump finds only the top of the sheet ears (round 2: 0.1194) |
| `nose_x.side`, `nose_y.side` | x 0.157, 0.187 | limit of the sheet (the side nose is 0.03 higher than the front nose) |
| `nose_height.front.0` | 0.0363, 0.0305 | new: round 2 passed near the limit (0.0348). The ears move the front frame by less than one pixel, and the nose blob grows by one row. |
| `fur_hue.side` | 33.5, 32.1 | open (the fur palette did not change) |

## Open problems

- The side view: the pointed blade leaves the back edge of the side ears 0.02 short at y 0.86
  to 0.97 (round 2: 0.011 to 0.015). A mirrored model cannot match the two side ears.
- The remesh gate stops 5 of 8 seeds, as in round 2 (seeds 3, 6, 7 on slivers, seeds 1 and 2 at
  the trunk bottom and the crown).
- The toe, the heel, and the shoulders stay as in round 2.

## Changes outside the files of the task

`lowpoly-studio/studio/config.py`, `lowpoly-studio/studio/details.py`,
`lowpoly-studio/studio/schema.py`, and the table `[details.ears]` of `lowpoly-studio/README.md`
(written by `python3 studio schema --readme`, no other line changed). Each new field has a
default that keeps the bear and the polar bear identical.
