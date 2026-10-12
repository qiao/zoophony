# Handoff: lowpoly-studio, phase 1 (generic studio core)

Branch `studio-core`, worktree `.claude/worktrees/studio-core`, from main c528ca2e.

## Last finished step

Step 2a: `bear-studio/` moved to `lowpoly-studio/` with `git mv` (layout unchanged, so
`./build.sh` still works from `lowpoly-studio/`). `.oxlintrc.json` ignores `lowpoly-studio/**`.

## Next step

Step 2b: move the files into the new layout (`studio/`, `templates/biped/`,
`motions/conductor/`, `viewer/`, `animals/bear/`) with only import fixes, and check that the
GLB of seed 3 is byte-identical to the baseline.

## Baseline (main c528ca2e, seed 3)

- Two builds give the same GLB bytes, and they match the committed `out/bear.glb`
  (sha256 in `animals/bear/golden.json` once it exists).
- Full `./build.sh --seed 3`: 64.4 s wall. GLB only (`--no-shots`): 52.7 s wall.
- IoU front 0.9468, side 0.9596, back 0.9495, 3/4 0.9154.
- Scratch copies of main: `/Users/xueqiaoxu/.claude/jobs/dae62c98/tmp/studio/base1` (full
  build with shots) and `base2` (GLB only).

## Open problems

None yet.
