# Handoff: rabbit violinist, round 4 (the arms)

Branch `rabbit-app`, worktree `.claude/worktrees/rabbit-app`, from tip 796e9278 (the app round on
main b76745c0). Brief: make the reach from the shoulder joint to the middle of the palm 1.40
times longer, keep the paw, the shoulder, the clavicle, and the thickness of the arm, and fit the
violin of the clips to the new arm (the user, 2026-10-13: "Arms x1.4, violin 28 cm"). Rounds 1
to 3 are in the git log of this file (b76745c0 holds the handoff of round 3).

## Last finished step

The arms round is committed, and the golden file holds the last build (0fcc2cc9). The round
changed no studio code, so the regressions of the bear and the polar bear did not run.

| Commit | Step |
|---|---|
| bf94580f | The arm joints of the sheet pose: 1.444 times the upper arm and the forearm. |
| a8c74178 | The violin (0.234) and the bow (0.29) of the violinist. |
| 70962a0b | The notes of the clips about the short arms. |
| 780ae6ce | The build of the round (`--all-seeds`, then a role check with the same GLB). |
| 0fcc2cc9 | The golden stats. |
| 0afc9ed4 | The README of the rabbit. |

## Next step

The app: give the app rabbit the GLB of this round (`pnpm studio-body rabbit`), measure the arm
of the app (0.377 m to the middle of the palm, 1.4 × 0.269 m), and size the violin by the rule.
The joints `forearm`, `forearm_twist`, `hand`, and `fingers` of each arm move. The other 22
joints stay. The remesh moves each face of the body (role seed 8, round 3: seed 5), so the
skin of the app body changes everywhere.

## Arm (studio units, from the inverse bind matrices of the GLB)

| Measure | Round 3 | Round 4 | Factor |
|---|---|---|---|
| Upper arm (`upper_arm_L` to `forearm_L`) | 0.1106 | 0.1596 | 1.443 |
| Forearm (`forearm_L` to `hand_L`) | 0.0919 | 0.1327 | 1.444 |
| Paw (`hand_L` to `fingers_L`) | 0.0444 | 0.0444 | 1.000 |
| Reach to the middle of the palm | 0.2247 | 0.3146 | 1.400 |

The sheet pose (`field.arm.joints`): the elbow [0.1711, 0.3623, 0.0394], the wrist
[0.2577, 0.2684, 0.0755], and the knuckle [0.2697, 0.2284, 0.0905]. The clavicle and the
shoulder do not change. The bind pose of the violinist stays: shoulder flex 40, abduct 30, elbow
flex 70 (each gate passes with it).

## Numbers (role seed 8, model seed 3)

| IoU front, side, back, 3/4 | checks pass / all, near, stale | gates | body triangles | seeds pass (seed report) |
|---|---|---|---|---|
| 0.8905, 0.9061, 0.8833, 0.8412 | 66 / 80, 10 near, 0 stale | pass | 1112 | 1 of 2 gated seeds (8) |

Round 3: IoU 0.9244, 0.9016, 0.9159, 0.8528, 67 of 80 checks. GLB 861 kB (round 3: 879 kB),
model GLB 524 kB (509 kB).

## Times (python3 studio log rabbit)

| Part | Start | End | Minutes |
|---|---|---|---|
| Brief, rules, skill, round 3 files, joint probe of round 3, fit | 20:31 | 20:34 | 3 |
| Build `--all-seeds` (105 s), report, frames, sliver and fold probes | 20:34 | 20:42 | 8 |
| Clip notes, role check (26 s), commits, golden, `regress rabbit` (16 s) | 20:42 | 20:44 | 2 |
| Joint and thickness probes, README, handoff | 20:44 | 20:47 | 3 |

## Failing checks

| Check | Value | Verdict |
|---|---|---|
| `iou.front`, `iou.back`, `iou.three_quarter` | 0.8905, 0.8833, 0.8412 | the decision of the user: the arms are longer than the arms of the sheet |
| `iou.side` | 0.9061 | limit of the sheet (the two side ears) |
| `eye_outline.three_quarter.*`, `eye_y.three_quarter.1` | as in round 3 | limit of the sheet |
| `eye_outline.front.1` | 0.0218, 0.0247 | new: model seed 3 gives eyes 1 px narrower than model seed 6 (0.0232) |
| `ear_dark.front.left_in_image`, `ear_width.side` | as in round 3 | limit of the sheet, measure |
| `nose_height.front.0` | 0.0363, 0.0305 | open, as in round 3 |
| `nose_y.side`, `nose_width.side`, `nose_height.side` | y 0.625, 0.646 | limit of the sheet: the measure region starts at 0.62 and cuts the nose of the model (0.612) |

## Open problems

- Face 805 of seed 8 (left upper arm near the armpit, smallest angle 15.9 degrees) turns 97 to
  98 degrees in each seated clip and in `stand_play`. The fold limit is 120 degrees, and the
  frames show no fold.
- The remesh gate stops 6 of 8 seeds: slivers at the crown (x 0, y 0.77) and at the trunk bottom
  (y 0.145), and slit faces at the right knee, shin, and foot and at the trunk bottom. Seed 6
  fails the seat gap (3.01 cm). No failure is at the shoulder or at the elbow.
- The rest clip keeps the wrist places of the short arms, so the elbows bend more and turn out.
  The app has its own rest.

## Changes outside the files of the task

None. A needed change for the owner of `lowpoly-studio/README.md`: the section "The violinist
role" still gives the arms of round 3 (0.2 animal heights, a violin of 0.17 at 0.85 arm reaches).
