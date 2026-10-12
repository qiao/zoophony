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
| 6 | Pixel floor of the feature limits | code done (07df1dd8), off for the bear and the polar bear |
| 7 | Compact `new --like` | done (4554e5f7) |
| 8 | Quad calibration of QuadriFlow | open |

## Measures

Item 2: the IoU of the difference masks against the colored masks, per view (front, side, back,
3/4): bear 0.987, 0.991, 0.987, 0.990; polar bear 0.990, 0.993, 0.991, 0.993. A synthetic white
figure on a gray gradient with a ground shadow: difference 0.986, colored 0.012. The rule takes
3.3 s for the four masks of a sheet (the colored rule 2.4 s). Test: `python3 -m unittest
tests.test_intake` (about 13 s).

The bear and the polar bear keep the colored rule: the masks are the reference of the IoU, so a
new mask changes the measure and does not bring the model closer to the sheet.

Item 6: with a floor of 1 px on the last builds, the bear keeps its 11 failures (its eye
differences are 7 px and more). The polar bear passes the far 3/4 eye outline (sheet 4 px,
render 5 px), and with the bear eye limit 0.08 in place of its hand value 0.11, the front eyes
pass too.

Item 7: `new polar-bear-2 --like bear` on the polar bear sheet writes 477 lines (the scaffold
had 1534). The writer parses the result again and compares it with the like config plus the
changes.

## Regressions

Baseline (before any change): `regress bear` and `regress polar-bear` PASS, the GLBs identical.

## Open problems

None yet.
