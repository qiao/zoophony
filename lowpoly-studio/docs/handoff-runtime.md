# Handoff: the studio runtime round

Branch `studio-runtime`, worktree `.claude/worktrees/studio-runtime`, from main 9b2f5465.
Another agent works on the intake items (round A) in `.claude/worktrees/studio-intake`. This
file is the handoff of the runtime round only.

## Items and ownership

| # | Item | State | Commits |
|---|---|---|---|
| 1 | One stage cache for all worktrees | done | 8e640a66 |
| 5 | Model checks from a standing build | done | 56b5f89a, goldens f28d4944 (bear), 94854299 (polar bear) |
| 9 | Stale outputs | done | 83a2de8d |
| 10 | Seed rule for role clips (`seeds.require`) | done | 8ff2316b |
| 12 | `studio view --stop`, a pid file, `studio log` | done | c833acde |
| 13 | `tools/merge-branch.sh`: wait for a lower load, one more e2e run | done | d6da8442, c5c9fbea (AGENTS.md) |

The README (10fc6e9b) describes each new command, setting, and behavior.

This round owns `studio/build.py`, `studio/stages.py`, `studio/cache.py`, the run orchestration
in `studio/cli.py` (`build`, `regress`, `view`, `log`), and `tools/merge-branch.sh`. Round A owns
`studio/intake.py`, `studio/measure_features.py`, the limits in `studio/checks.py`,
`studio/fit.py`, `studio/views.py`, and the commands `new`, `calibrate`, and `fit`.

Small changes in shared files (a merge with round A can touch them):

- `studio/checks.py`: three lines marked `studio-runtime` (the start index of the look checks,
  `outputs.mark_look`, and the stale line of `summary`).
- `studio/config.py`: `load(animal, out_dir, role)` and the check of `seeds.require`.
- `studio/schema.py`: the table `[seeds]`.
- `studio/report.py`, `studio/regress.py`, `studio/measure_mesh.py` (`--glb`), `studio/shoot.mjs`
  (`--compare-glb`).

## What each item does

1. **Shared cache.** The stage cache is in `<git common dir>/lowpoly-studio/cache/`
   (`STUDIO_SHARED` moves it). The keys hold only content digests. The folder of an entry is
   `<space>/<step>/<base key>`, and the space is `blender-<version>` or `cli`. A writer writes to
   a unique temporary file and renames it. Each entry names its animal for `cache info` and
   `cache clean <animal>`. The 2 GB limit applies to the whole shared cache.
5. **Model build.** Each build with shots builds the animal again with the role pack
   `roles/model/` (a fixed standing bind pose: the conductor arms and straight legs, the
   `arm_down` corrective, no props, the clip `reference` only) in `out/model/`, in a Blender
   process beside the role build. Its seed is the first seed of `facets.seeds` that passes its
   remesh gate. The compare, the features, the shading, and the GLB facet measure use its GLB.
   The role checks stay on the role build.
9. **Stale outputs.** A build writes `out/build.json` (a run id) and deletes the GLB, the stats,
   `checks.json`, `stages/`, `diag/`, and `report/`. The shots delete `compare/`, `frames/`, and
   `look.json`, and write `look.json` at the end. The look checks are current only when
   `look.json` names the run of `build.json` and the GLBs keep their digests. Else they are
   marked `stale` in `checks.json`, the CLI summary, the look report, and `review.png`.
10. **Seed rule.** A pool build runs every seed (a role check) when the digest of the role pack,
    the template, and `--clips` differs from the digest in `out/seed-report.json`. The report
    lists the failed gates of each seed and clip. `seeds.require = "kept"` (default): the kept
    seed must pass. `"all"`: each seed that passes the remesh gate must pass each clip.
12. **Run files, log, view.** Each `build`, `regress`, and `compare` writes a run file into
    `<git common dir>/lowpoly-studio/runs/<animal>/`. `studio log` prints the timeline.
    `studio view` writes `out/view-server.json`, starts Vite in its own session, and stops on
    SIGINT, SIGTERM, SIGHUP, or `studio view <animal> --stop`.
13. **Merge script.** Before each e2e run, it waits until the load average is at most 20 and
    port 4182 is free (900 s at most), and prints the cause. After a failure, the e2e tests run
    once more. A second failure stops it with exit 6. `--check-only` does not merge.

## Measures

Baseline (main 9b2f5465, this worktree, before the changes):

| Case | Wall time |
|---|---|
| `build bear --seed 3 --no-shots`, empty cache | 56 s |
| the same build again (all stages from the cache) | 4 s |
| `regress bear` (the cache has the seed) | 17 s |
| `regress bear --no-cache` | 68 s |
| `regress polar-bear --no-cache` | 47 s |

Item 1, the shared cache in a new worktree (another worktree filled the cache):

| Case | Cold | New worktree, shared cache |
|---|---|---|
| `build bear --seed 3 --no-shots` | 55.1 s | 4.0 s (the same GLB bytes, 5eecaa19adb9) |
| `build bear --all-seeds --no-shots` (8 seeds) | 76.1 s | 8.9 s |

Item 5, the polar bear model checks (look checks), before (pianist build, seed 1) and after
(model build, seed 3):

| Check | Before | After |
|---|---|---|
| `iou.front` | 0.9409 | 0.9465 |
| `iou.side` | 0.912 (FAIL) | 0.9543 |
| `iou.back` | 0.9405 | 0.9452 |
| `iou.three_quarter` | 0.9047 | 0.927 |
| `ear_width.front` (2) | FAIL | pass |
| `eye_outline.front` (2) | pass | FAIL (0.0143 against 0.0179) |
| `belly_y.front`, `belly_width.front` | pass | FAIL (no "light" pixels) |
| checks that pass | 71 of 83 | 70 of 83 |

The bear keeps its IoU and all 87 check results (its model build has the bind pose of its
conductor build). The model build of the bear takes 2.5 s from the cache.

The other bind pose that I tested, the pose of the sheet (no turns): polar bear IoU 0.9410,
0.9526, 0.9410, 0.9258 (each lower than now), and only seed 6 of the bear passed its remesh
gate (seeds 3, 1, and 2 fell under the quad band). With seed 6, the bear passed 75 of 87
checks: 3 new failures (`eye_outline.front.1`, `eye_rim.front.1`, `nose_height.side`) and 2 new
passes. The outputs of that test are in the scratch folder of the round, not in the
repository.

Item 9: `build bear --seed 3 --no-shots` after a build with shots marks 56 look checks stale.
`studio compare bear` deletes an old frame and makes the look checks current again.

Item 10, the polar bear pianist (role check, 8 seeds, 4 at a time):

```text
  seed  remesh gate                        reference  ready  play  chord  rest                                performance
  3     pass                               pass       pass   pass  pass   contact 1.92 cm forearm R           contact 1.92 cm forearm R
  1     pass                               pass       pass   pass  pass   pass                                pass
  5     pass                               folds 1    pass   pass  pass   contact 1.66 cm forearm L; folds 4  contact 1.66 cm forearm L; folds 4
  6     FAIL slivers 0.0118, slit_faces 6
  2     pass                               pass       pass   pass  pass   contact 1.01 cm forearm R           contact 1.01 cm forearm R
  4     pass                               pass       pass   pass  pass   contact 1.55 cm forearm R           contact 1.55 cm forearm R
  7     pass                               pass       pass   pass  pass   contact 1.51 cm forearm R; folds 4  contact 1.51 cm forearm R; folds 4
  8     pass                               pass       pass   pass  pass   contact 1.46 cm forearm R; folds 6  contact 1.46 cm forearm R; folds 6
```

`seeds.require = "kept"` passes (kept seed 1). The first role check took 135.6 s (7 seeds
cold). With no change, a pool build takes 10.6 s. After a change of `roles/pianist/clips.py`,
the role check takes 84 s. A role check whose entries are all in the cache takes 15.4 s.

Item 12: a background `studio view bear` (a zsh job, SIGINT ignored) stopped with
`studio view bear --stop` and with `kill -INT`. No Vite process stayed, and the pid file went.

Item 13 (a throwaway branch with `--check-only`, main did not change, the branch is deleted):
a flaky command passed on run 2 after two printed waits; the real e2e tests waited 62 s for the
load to drop from 53 to 19, then passed (66 tests); a command that always fails stopped with
exit 6 after two runs.

## Regressions

Final runs on 2026-10-12 (load average 10 to 16), each PASS:

| Command | Wall time | GLB | Model GLB |
|---|---|---|---|
| `regress bear` | 17 s | identical (5eecaa19adb9) | identical (785130e1b18c) |
| `regress bear --no-cache` | 69 s | identical | identical |
| `regress polar-bear` | 16 s | identical (ecd970cf44d8) | identical (41a16640291a) |
| `regress polar-bear --no-cache` | 48 s | identical | identical |

Every group of both regressions is identical: the counts, the arrays, the clips, the nodes, the
stats, the measures, the IoU, and the checks. The goldens of item 5 hold the model GLB, so the
regressions also prove that the model build keeps its bytes with the cache on and off.

The final output builds: `build bear` 19 s (search, kept seed 3, model build 1.6 s from the
cache), `build polar-bear` 29 s (a role check of 8 seeds from the cache in 15.4 s, kept seed 1,
model build 1.9 s). `studio compare polar-bear` with no model GLB built it from the cache in
1.6 s, and the look checks were current.

## Last finished step

All six items, the README, and the AGENTS.md row are committed. The outputs of both animals
in `out/` come from a final build with this code.

## Next step

No item of this round is open. Two options:

1. Make the role check cheaper (about 1 h): the stage cache keys the clip code by the bytes of
   the file, so a comment in `clips.py` runs the clips and the contact check of each seed
   again (84 s on 8 seeds). A key from the code objects (as for `build.py`) would keep the
   entries.
2. Tune the polar bear look on the model build (round A or a look round): the front eyes are
   2 px narrow, and the "light" class finds no belly patch on the standing body.

## Open problems

- Bear seeds 4 and 8 fail the slit check of the remesh gate (1 and 4 faces), and the README
  said before that they pass. This round did not change the stage code, so an earlier round
  changed it (the fin and pinch repairs of the pilot are a candidate). Seed 3 still passes.
- The polar bear `belly_y.front` and `belly_width.front` fail on the model build: the class
  `light` (1.12 times the median of the region) finds no pixels on the standing body. The
  pianist build passed them with the light pixels of its straightened legs.
- A model build is one more Blender process beside the pool. A new animal pays one more cold
  build (about 20 to 40 s, at the same time as the role build).
- The run files in `<git common dir>/lowpoly-studio/runs/` are never deleted (about 2 kB each).
- The role key uses the bytes of each file of the role pack and the template, so a comment
  change starts a role check.
- `studio report` serves its page in the process (no child), so SIGTERM stops it. It has no pid
  file.
