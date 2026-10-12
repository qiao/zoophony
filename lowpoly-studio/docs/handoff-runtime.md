# Handoff: the studio runtime round

Branch `studio-runtime`, worktree `.claude/worktrees/studio-runtime`, from main 9b2f5465.
Another agent works on the intake items (round A) in `.claude/worktrees/studio-intake`. This
file is the handoff of the runtime round only.

## Items and ownership

| # | Item | State |
|---|---|---|
| 1 | One stage cache for all worktrees | done (8e640a66) |
| 5 | Model checks from a standing build | open |
| 9 | Stale outputs | done (83a2de8d) |
| 10 | Seed rule for role clips (`seeds.require`) | open |
| 12 | `studio view --stop`, a pid file, `studio log` | done (c833acde) |
| 13 | `tools/merge-branch.sh`: wait for a lower load, one more e2e run | done (d6da8442) |

This round owns `studio/build.py`, `studio/stages.py`, `studio/cache.py`, the run orchestration
in `studio/cli.py` (`build`, `regress`, `view`, `log`), and `tools/merge-branch.sh`. Round A owns
`studio/intake.py`, `studio/measure_features.py`, the limits in `studio/checks.py`,
`studio/fit.py`, `studio/views.py`, and the commands `new`, `calibrate`, and `fit`.

## Baseline (main 9b2f5465, this worktree)

| Case | Wall time |
|---|---|
| `build bear --seed 3 --no-shots`, empty cache | 56 s |
| the same build again (all stages from the cache) | 4 s |
| `regress bear` (the cache has the seed) | 17 s |
| `regress bear --no-cache` | 68 s |
| `regress polar-bear` (the cache has the seed) | 47 s |
| `regress polar-bear --no-cache` | 47 s |

Both regressions pass with the same GLB bytes (bear 5eecaa19adb9, polar bear ecd970cf44d8).

## Measures

- Item 1: `build bear --seed 3 --no-shots` in a new worktree with the shared cache: 4.0 s
  (cold before: 55 s). Every cached stage came from the cache of this worktree, and the GLB
  has the same bytes (5eecaa19adb9).
- Item 13 (on a throwaway branch with `--check-only`, main did not change): a flaky command
  passed on run 2 after two printed waits; the real e2e tests waited 62 s for the load to drop
  from 53 to 19, then passed (66 tests); a command that always fails stopped with exit 6.
- Item 9: `build bear --seed 3 --no-shots` after a build with shots marks 56 look checks stale
  in checks.json, the summary, the page, and review.png. `studio compare bear` clears an old
  frame and makes them current again.

## Last finished step

Items 1, 9, 12, and 13 are committed. The model role pack `roles/model/` is written (not yet
committed).

## Next step

Item 5: the model build (`roles/model/`, the bind pose of the sheet) in out/model/, the compare
on its GLB, and the golden updates. Then item 10.
