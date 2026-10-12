# Handoff: phase 2a (build speed)

Branch `studio-speed`, worktree `.claude/worktrees/studio-speed`, from main 3d56d2d6. Another
agent works on phase 2b (diagnostics) at the same time: it owns `studio/checks.py`,
`studio/contacts.py`, the `measure_*.py` files, and the report page. Do not edit
`docs/handoff.md`.

## Last finished step

- The stage cache (`studio/cache.py`, `studio/stages.py`, `studio/build.py`): field, remesh,
  organic, clips, contacts, and export keep their outputs, keyed by inputs, config reads, and
  code. A hit restores the Blender state with the same calls. Checked on the bear, seed 3: a cold
  build gives the golden GLB bytes; an eye radius change from the cache gives the same bytes as
  the same change with `--no-cache`.
- The remesh gate (`studio/remesh.py`, `[facets.gate]`): quad count after the remesh; inward
  faces, slivers, open edges, and slits after the organic pass.

## Next step

1. CLI: the intake cache, the timing table, the parallel seed pool (`--jobs`, `--all-seeds`,
   `out/seeds/summary.json`), `cache info|clean`, `regress --no-cache`.
2. `studio/shoot.mjs`: stop at the first page error or failed request; one process for the
   three shot commands.
3. Measure the table of times, run `regress bear`, update the README.

## Baseline (before phase 2a, bear, seed 3)

| Case | Time |
|---|---|
| Cold build with shots (`regress bear`) | 65.3 s (intake 2.6, Blender 49.5, shots 11.6, measures 1.6) |
| GLB build (`build --seed 3 --no-shots`), each of: cold, eye radius, fur color, clip change | 52.1 to 52.7 s |
| 8 seeds, one after the other (`--seed N --no-shots`) | 380.2 s |

Per seed (baseline): seed 2 has 1036 quads (target 900, band 765 to 1035) and 1.08% slivers,
so the new remesh gate stops it. All 8 seeds pass the contact and fold gates.

## Open problems

- A clip change runs the contact check again (about 23 s): its key holds the samples of all
  clips.
