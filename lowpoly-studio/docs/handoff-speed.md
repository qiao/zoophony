# Handoff: phase 2a (build speed)

Branch `studio-speed`, worktree `.claude/worktrees/studio-speed`, rebased onto main 1b400b02
(with the diagnostics work of phase 2b). Do not edit `docs/handoff.md`.

## Last finished step

Phase 2a is done. The README section "Speed" describes each part.

1. Stage cache (`studio/cache.py`, `studio/stages.py`, `studio/build.py`, intake in
   `studio/cli.py`). The key of a step: the input fingerprints, the config values that the step
   read (tracked), and the code that ran (sys.monitoring, with one key per stage function of
   build.py). Cached: intake, field, remesh, organic, clips, contacts, export, diagnostics.
   Always run: paint, details, rig, correctives, assemble. A restore function makes the Blender
   state again with the same calls, so the GLB bytes stay the same. "contacts" and
   "diagnostics" run or come from the cache together (`joined`, `keys_of`), because
   "diagnostics" reads `contacts.JOURNAL`. Options: `--no-cache`, `python3 studio cache
   info|clean [<animal>]`, 2 GB limit per animal.
2. Seed pool (`run_seeds` in `studio/cli.py`): `--jobs N` (default 4), `--all-seeds`,
   `out/seeds/<n>/`, `out/seeds/summary.json`. The kept seed (stages/, diag/, GLB, stats) comes
   into `out/`. When no seed passes, the last seed that ran comes into `out/` before the checks.
3. Remesh gate (`studio/remesh.py`, `[facets.gate]`): the quad count after the remesh, and the
   inward faces, slivers, open edges, and slits after the organic pass. `stages/remesh-gate.json`, the
   `remesh_gate.*` gate checks (one marked call site in `studio/checks.py`), and the summary.
   `--no-gate` reports and builds on.
4. Fail fast: `studio/shoot.mjs` stops at the first page error, failed request, or HTTP error,
   and takes a comma list of commands (one server, one browser).
5. Timing: each build prints a table of each step and Blender stage with its source, and writes
   it to `out/stages/pipeline.json` and `run.json`.

## Times (bear, seed 3)

| Case | Before | After |
|---|---|---|
| Cold GLB build (`--seed 3 --no-shots`) | 52.2 s | 53.4 s (empty cache) |
| Eye radius change, GLB | 52.2 s | 4.6 s |
| Fur color change, GLB | 52.1 s | 4.9 s |
| Clip change (a number in clips.py), GLB | 52.7 s | 32.0 s |
| Full build with shots (`regress bear`, cache has the seed) | 65.3 s | 16.0 s |
| Full 8-seed check (`--all-seeds --no-shots`) | 380.2 s | 97.7 s (empty cache), 13.3 s (after an eye change) |

## Checks done

- `python3 studio regress bear` and `--no-cache`: PASS, the GLB bytes are identical. Also with
  only the export entries deleted (the export runs on the restored scene).
- An eye radius change from the cache gives the same GLB bytes as with `--no-cache`. A cached
  build gives the same 10-contacts and 12-diagnostics data, checks.json, and diag/.
- `python3 studio report bear --no-serve` works on `out/` and `out/regress/`.
- A missing GLB stops `shoot.mjs` in 0.7 s with "HTTP 404".

## Next step

No step of phase 2a is open. Two options for more speed:

1. A clip change runs the contact check again (about 23 s, 2 passes with the fold repair). A
   cache of each clip of the check needs a per-clip result from `studio/contacts.py` (with its
   journal records). Estimate: a clip change from 32 s to about 10 s. Cost: about 1 h, in the
   files of the diagnostics work.
2. The glTF export takes 2 s of the 4.6 s of a detail change, and the Blender start and the
   setup take 1.3 s.

## Open problems

- Seed 2 of the bear fails the remesh gate: 1036 quads (the band is 765 to 1035), 1.08%
  slivers, 4 open edges. `build bear --all-seeds` exits 1. Decide: keep the gate (remove seed 2
  from `facets.seeds`), or change `[facets.gate]`.
- The slit check has no test on a real slit: the field of the bear gives none, also with a head
  blend of 0.010.
- The inward measure of the gate (the surface field, -0.3) differs from `rest_inward_faces` of
  the stats (all parts, -0.5): seed 4 has 0 and 2.
- The code key is per file (per function in build.py). An edit of `studio/remesh.py` runs the
  remesh and the organic pass again (about 18 s).
- The cache trusts its keys: a stage that reads a file, the clock, or a config value outside
  `cfg` gives stale results. `--no-cache` and `regress` find such a fault.
- The look report of a build shows the step times of the build before it: the build writes
  `pipeline.json` after the report (`studio/report.py` of phase 2b).
