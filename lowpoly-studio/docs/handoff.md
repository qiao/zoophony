# Handoff: lowpoly-studio, phase 1 (generic studio core)

Branch `studio-core`, worktree `.claude/worktrees/studio-core`, from main c528ca2e.

## Last finished step

Step 2b: the files are in the new layout (`studio/`, `templates/biped/`, `motions/conductor/`,
`viewer/`, `animals/bear/`) with only import and path fixes. `./build.sh --seed 3` (run in
`lowpoly-studio/`) gives a byte-identical GLB, the same stats, and the same IoU as main.
The modules still import each other by bare names (the entry scripts add the three code
folders to `sys.path`), and the bear constants are still in the modules.

## Next step

Step 2c: package imports (`studio.x`, `templates.biped.x`, `motions.conductor.x`), then the
config (`animals/bear/animal.toml` with a schema check), module by module. After each module,
run `$S/verify.sh <name> ./build.sh --seed 3` (S is the scratch folder below) and keep the
GLB byte-identical.

## Baseline (main c528ca2e, seed 3)

- Two builds give the same GLB bytes, and they match the committed `out/bear.glb`
  (sha256 in `animals/bear/golden.json` once it exists).
- Full `./build.sh --seed 3`: 64.4 s wall. GLB only (`--no-shots`): 52.7 s wall.
- IoU front 0.9468, side 0.9596, back 0.9495, 3/4 0.9154.
- Scratch copies of main: `/Users/xueqiaoxu/.claude/jobs/dae62c98/tmp/studio/base1` (full
  build with shots) and `base2` (GLB only).

## Open problems

None yet.
