# Handoff: the intake and the look checks (round A)

Branch `studio-intake`, worktree `.claude/worktrees/studio-intake`, from main 9b2f5465. Another
agent works on round B (runtime: build.py, stages.py, the cache, the run orchestration of
build, regress, and view) in another worktree.

Rule of the user (2026-10-12): a pure refactor keeps the GLBs byte-identical. An improvement may
change an existing animal when it is measurably closer to its sheet and no gate gets worse. Then
the golden file changes in a commit of its own.

## Items

| # | Item | State |
|---|---|---|
| 2 | Foreground by the background difference | done (2db71c8b) |
| 3 | `studio calibrate`: light, palette, color classes | open |
| 4 | Sheet consistency at intake, head turn of a view in the compare | open |
| 6 | Pixel floor of the feature limits | open |
| 7 | Compact `new --like` | open |
| 8 | Quad calibration of QuadriFlow | open |

## Measures

Item 2: the IoU of the difference masks against the colored masks, per view (front, side, back,
3/4): bear 0.987, 0.991, 0.987, 0.990; polar bear 0.990, 0.993, 0.991, 0.993. A synthetic white
figure on a gray gradient with a ground shadow: difference 0.986, colored 0.012. The rule takes
3.3 s for the four masks of a sheet (the colored rule 2.4 s). Test: `python3 -m unittest
tests.test_intake` (about 13 s).

The bear and the polar bear keep the colored rule: the masks are the reference of the IoU, so a
new mask changes the measure and does not bring the model closer to the sheet.

## Regressions

Baseline (before any change): `regress bear` and `regress polar-bear` PASS, the GLBs identical.

## Open problems

None yet.
