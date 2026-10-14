# Handoff: rabbit violinist, round 1

Branch `rabbit-studio`, worktree `.claude/worktrees/rabbit-studio`, from main 5f11fdb6.
Brief: the rabbit from the sheet of the user (2026-10-13) and a new `violinist` role.

## Last finished step

Every gated seed passes every clip (11eed820), and the golden file holds it (5bc39d4d).
`python3 studio regress bear` and `polar-bear` gave identical GLB files after the studio change
(46c56f08). `python3 studio regress rabbit` passes on the new golden file (identical GLB and
model GLB).

| Commit | Step |
|---|---|
| 6ad7048d | The first build of the rabbit model (role "model"). |
| 46c56f08 | The studio lets a paw hold a violin at the neck (`studio/props.py` `held_violin`). |
| ef1b9728 | The neck of the rabbit (head blend 0.018) and a third relax round. |
| 15ee1bf0 | The violinist role, given to the rabbit. |
| dae2f43f | The legs, the feet, the ears, the skin offset, and the trunk bottom (0.145). |
| f9a617c4 | The nose, the fur hue, and the contrast. |
| b2e6488d | The golden stats. |
| e5f56120, ab3248d9, 9996fc68 | The docs: the studio README, the rabbit README, this handoff. |
| 11eed820 | The shoulder tops to the neck up to 0.56, the rest paws higher: 5 of 5 gated seeds pass. |
| 5bc39d4d | The golden stats again. |

## Next step

Round 2 of the look, with the user: the IoU is under the bar in each view. Start with
`python3 studio fit rabbit --rows`, and read the side and 3/4 views with the user, because the
sheet ears disagree between the views (about 30 to 45 min). Then the app (route 3 of
`AGENTS.md`): `pnpm studio-body rabbit --inspect`, a landmark in `ANIMALS` of
`tools/studio-body.ts`, and the violin hold of the app (about 2 h).

## Numbers (role seed 1, model seed 1)

| IoU front, side, back, 3/4 | checks pass / all, near, stale | gates | body triangles | seeds pass (seed report) |
|---|---|---|---|---|
| 0.9147, 0.8817, 0.9189, 0.8500 | 63 / 80, 5 near, 0 stale | pass | 1148 | 5 of 5 gated seeds (1, 6, 4, 7, 8) |

GLB 828 kB, model GLB 513 kB, 32 bones (30 body bones, the violin, the bow).

## Times (python3 studio log rabbit)

| Part | Start | End | Minutes |
|---|---|---|---|
| Intake, config, fit (no build) | 16:56 | 17:07 | 11 |
| Model: 3 builds to the first commit | 17:07 | 17:13 | 6 |
| Held violin code, regressions, role pack, 13 role builds | 17:13 | 17:39 | 26 |
| Look and seed rounds (fit sweeps, 14 builds) | 17:40 | 18:00 | 20 |
| Golden, regress, docs, commit checks | 18:00 | 18:04 | 4 |
| The fold of seed 8 (3 builds), golden again | 18:04 | 18:08 | 4 |

| Step | Count | Typical seconds |
|---|---|---|
| `fit` (one variant) | about 30 | 2 |
| Build, a new field or bind pose (8 seeds, 2 at a time) | 10 | 70 to 142 |
| Build, a clip or weight change (the gated seeds) | 12 | 24 to 47 |
| Build, a paint or light change | 7 | 17 to 21 |
| Build `--all-seeds` from the cache | 5 | 25 to 48 |
| `regress` (rabbit) | 1 | 18 |

## Failing checks

| Check | Value | Verdict |
|---|---|---|
| `iou.front`, `iou.back` | 0.9147, 0.9188 | open (the sheet symmetry 0.9615; thin arms lose width to the facets) |
| `iou.side` | 0.8817 | limit of the sheet: the side ears are at two depths |
| `iou.three_quarter` | 0.8500 | limit of the sheet: the head turn and the ears of the 3/4 view |
| `eye_outline.three_quarter.*`, `eye_y.three_quarter.*` | see `animals/rabbit/README.md` | limit of the sheet |
| `ear_dark.front.left_in_image` | 0, 0.16 | limit of the sheet (one inner ear in shade) |
| `ear_width.side`, `ear_height.side` | 0.0932, 0.0742 | measure: the bump finds only the top of the render ear |
| `nose_x.side`, `nose_y.side`, `nose_width.side`, `nose_height.side` | y 0.6245, 0.6463 | limit of the sheet (the side nose is 0.03 higher than the front nose) |
| `belly_width.front.belly` | 0.0711, 0.0958 | open |
| `facet_contrast` | 3.70, 3.02 | open |

## Open problems

- The remesh gate stops 3 of 8 seeds: seeds 3 and 2 at the trunk bottom between the seated
  thighs (y 0.146), seed 5 at the right shin against the belly.
- The head loft makes a thin collar at its bottom row (`sdf.loft` gives a distance near 0 where
  the half width is 0). On the bears the trunk hides it. On the rabbit the head bottom is at the
  neck, and `studio fit` shows a 1-voxel line at y 0.548 in the side view.
- The arms reach 0.2 animal heights, and the chest stands 0.11 in front of the shoulder joints.
  So the violin is 0.17 long (0.85 arm reaches), the paw holds it at 0.68 of its length, and a
  whole bow uses 0.18 of the bow length. A larger violin needs longer arms or a lower chest.
- No check of the bow on the strings yet. The clips place the hair on the contact point, so a
  check can compare the posed hair with `on_string()`.

## Changes outside the files of the task

none
