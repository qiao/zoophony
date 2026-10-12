# Handoff: lowpoly-studio diagnostics (phase 2b)

Branch `studio-diag`, worktree `.claude/worktrees/studio-diag`, from main 3d56d2d6. Another agent
works on phase 2a (speed: a stage cache, parallel seeds, a remesh gate) in another worktree. This
file is the handoff of phase 2b only. `docs/handoff.md` is the handoff of the whole studio.

## Tasks

1. Located failures: each failing or near check fills `where`, with a crop and a fold debug list.
2. A generic feature measure that replaces `measure_eyes.py` and `measure_ears.py`.
3. A look-report page per build (`out/report/index.html`, `python3 studio report <animal>`) and
   one review image.
4. `python3 studio regress bear` passes (the GLB does not change).

## Last finished step

Task 2 is done (commits baae2290, 05244826, 9befa3e3):

- `studio/measure_features.py` measures each feature of `measure.features` on the sheet and on
  the render. The eye and ear values of the bear are the same as before (96 of 96 values).
- `checks.judge()` gives pass and "near". `where` stays only on a failing or near check.
- The bear declares eyes, ears, nose, muzzle, belly, and claws. 71 of 82 checks pass on the
  regression build. The new failures are real differences of the look (nose place, muzzle
  height, claws that touch).
- The golden stats hold `features.json` in `measures` and the new checks. The GLB is the same.

## Next step

Task 1: the located contacts and folds.

## Open problems

- None yet.
