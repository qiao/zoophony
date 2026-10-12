# Handoff: the intake and the look checks (round A)

Branch `studio-intake`, worktree `.claude/worktrees/studio-intake`, from main 9b2f5465, rebased
onto main 1274c780 (round B, studio-runtime: the shared cache, the model build, stale outputs,
the seed rule, `studio log`, `view --stop`).

Rule of the user (2026-10-12): a pure refactor keeps the GLBs byte-identical. An improvement may
change an existing animal when it is measurably closer to its sheet and no gate gets worse. Then
the golden file changes in a commit of its own.

## Last finished step

All six items are done and committed, and the branch is rebased onto main 1274c780. The branch
is ready for `tools/merge-branch.sh studio-intake`. The README describes each command, config
field, and method.

The rebase (2026-10-12):

- Conflicts, each resolved with both meanings: the docstring of `cli.py` (round B `view --stop`
  and `log`, round A `new --full`), `build_args` with its `role` argument beside the new
  `print_sheet_check`, `checks.py` (round B `outputs` and `mark_look` and the stale lines, then
  the sheet marks and the sheet warning line), `.gitignore` (round B `out/model/` and
  `view-server.json`, round A `out/calibrate/`, no per-animal cache), and the README (round B
  sections and numbers, round A modules, rows, and sections).
- Left out on purpose: the old golden commit of the polar bear and the old output refresh. They
  were made with the pianist compare. The golden file and the outputs are made again on the
  model build (1c2bbd30, e0ed2a00).
- The model build remeshes the standing field with the same QuadriFlow target. Its counts (792
  to 940 at 780) did not fit the default band, so the polar bear keeps its band of 30%
  (b9e20c3b), and `calibrate --quads` measures both fields (4d30222d).

| # | Item | Commits | Existing animals |
|---|---|---|---|
| 2 | Foreground by the background difference (`intake.foreground`) | d829b3e3 | both keep "colored" |
| 3 | `studio calibrate`: light, palette, dark classes, overlap warnings | c921583b, e7afa7d1, cc559405 | both keep the hand light and palette |
| 4 | Sheet check at intake, head turn of a view in the compare | 9338ae88, 73187838, b5277d69, 7a78d9be | polar bear: 3/4 head turn [0, 12] (452504c6) |
| 6 | Pixel floor of the feature limits (`checks.feature_pixels`) | 90b92586 | both 1.0 (cd311839, 74e08f22) |
| 7 | Compact `new --like`, `--full` for the scaffold | 136de958 | - |
| 8 | Quad calibration (`calibrate --quads`, `facets.quadriflow_target`) | 334fe269, 4d30222d | polar bear keeps 30% (the model field, b9e20c3b) |

Golden: the polar bear (1c2bbd30): the role GLB and the model GLB of main, the 3/4 compare of
the model build with the head turned +9 deg (IoU 0.927 -> 0.9332), the 3/4 eye measures, and the
new check head_turn.three_quarter. The bear golden is the one of main. The outputs of both
animals are refreshed (e0ed2a00, the GLBs have the same bytes).

## Measures

- Item 2: IoU of the difference masks against the colored masks: bear 0.987 to 0.991, polar bear
  0.990 to 0.993. A synthetic white figure on a gray gradient with a ground shadow: difference
  0.986, colored 0.012 (`python3 -m unittest tests.test_intake`, 13 s).
- Item 3 (renders of the own GLB, sheet contrast as the target): polar bear hemi 3.29, key 0.75
  (hand 3.2, 0.6), fur [211, 201, 183] (hand [215, 204, 185]). Bear 2.14, 2.68 (hand 1.4, 3.8),
  fur [118, 72, 41] (hand [117, 70, 38]). The hand bear light renders a belly contrast of 4.06
  against 3.60 of the sheet. With the contrast of the hand renders as the target: key 3.89 and
  0.58, hemi 1.0 and 3.42. The saturation floor rule gives the hand values (0.2, 0.06).
- Item 3 builds with the calibrated light and fur family: the front view matches the sheet, but
  other views move away (polar bear `fur_value.back` fails, bear `fur_saturation.back` fails),
  so the existing animals keep their hand values.
- Item 4: sheet check, bear: scale 2.1%, ground 5 px, arm gap 5%, 3/4 head turn -2.8 deg. Polar
  bear: scale 4.4%, ground 4 px, ears front 0.079 and back 0.052, arm gap 5%, 3/4 head turn +6.3
  deg. Compare head turn on the polar bear: +6 deg, IoU 0.9047 -> 0.9073, 3/4 eye x errors 0.015
  and 0.008 -> 0.002 and 0.000, the far eye 1 px wider. On the bear the fit runs to the end of
  the range and the eyes get worse, so it stays off.
- Item 6: with 1 px the polar bear passes its 10 px front eyes at the bear limit 0.08 (the hand
  value was 0.11). The bear verdicts do not change.
- Item 7: 477 lines on the polar bear sheet like the bear (the scaffold had 1534).
- Item 8: polar bear at 780: the pianist field 760 to 850 quads (ratio 1.03), the model field
  792 to 940 (ratio 1.09), 13 of 16 pairs in the default band (736 would put 16 of 16 in, but
  it changes both GLBs). Bear (role field only) 836 to 1036 at 900 (7 of 8), 858 to 978 at 886
  (8 of 8). The bear keeps 900.
- Demo (polar-bear-2 like the bear, deleted again): new 5 s, calibrate 5 s, calibrate --quads
  31 s, fit 1.7 s (IoU 0.946, 0.963, 0.938, 0.915).

## Regressions

After the rebase: `python3 studio regress bear` PASS (the GLB 5eecaa19adb9 and the model GLB
785130e1b18c of main, every value identical) and `python3 studio regress polar-bear` PASS against
the new golden file (the GLB ecd970cf44d8 and the model GLB 41a16640291a of main). A check on a
new animal (the polar bear sheet like the bear) ran new, calibrate --from bear, fit, a pool
build with the model build (seed 2 kept, head turn +4 deg), calibrate on its own model GLB, and
report.

## Files of round B that this round touched (marked)

- `studio/cli.py` `step_intake`: the intake cache keeps `sheet-check.json`, and a cache hit
  prints its warnings (comment "studio-intake").
- `studio/checks.py`: the sheet marks (comment "studio-intake"), after the `mark_look` of round
  B.

## Open problems

- `calibrate` fits the fur color in the front view only. On both animals the other views then
  move away from the sheet.
- On a new animal, `calibrate --from <like>` renders the paint of the like GLB: the bear paint
  gives a belly contrast of 5.2 with no key light against 2.48 of the polar bear sheet. The
  light needs the own GLB after the first build. The tool warns.
- The compare head turn fits the IoU only. On the bear sheet a shift of the head reads as a
  turn of +20 deg. `new` sets the range from the eye spacing of the sheet check, plus or minus
  6 deg.
- The difference rule closes an arm gap of 1 or 2 px a little more than the colored rule.
- The sheet check uses the eye band of the config, or a dark blob search in it. A sheet with
  dark fur around the eyes can still fail it.

## Next step

Fit the calibrate palette on the fur pixels of all four views (about 30 min, studio/calibrate.py
and the runs of shoot.mjs calibrate). Then try the calibrated light and palette on both animals
again with the before-and-after evaluation of this round.
