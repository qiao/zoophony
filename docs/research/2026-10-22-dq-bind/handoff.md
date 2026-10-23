# Handoff of the round `dq-bind` (2026-10-22)

The brief is `brief-dq-bind.md` in the scratchpad of the manager. The worktree is
`.claude/worktrees/dq-bind` on the branch `dq-bind`, from `d3046531`.

## State

- Last finished step: the round stopped by the rule of the brief. The flag `bind.blend` of
  `tools/blender/rig_mesh.py` keeps the radius of the notch vertices, but their depth below
  their neighbors does not fall after five variants on the rabbit
  (`docs/research/2026-10-22-dq-bind.md`). The docs and `TODO.md` give the result.
- No config uses the flag, and no rig file changes.
- The probes run from `scratch/` (copy them): `dump-mat.ts` with `probes/with-glb.ts`
  (`SPECIES=<species>`), `decomp2.py`, `probes/split.py`, and `probes/radial.py`.

## Next steps

1. A bind arm nearer to the hanging source arm (`studio.bindArms`), which makes the bend of the
   bind smaller. Measure the bind part with `split.py` and `decomp2.py`.
2. The standing error of 2.3 mm of v3 at vertex 301 (left arm root), if a later round uses the
   flag.
