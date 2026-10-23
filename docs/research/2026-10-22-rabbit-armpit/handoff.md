# Handoff of the round `rabbit-armpit` (2026-10-22)

The brief is `brief-rabbit-armpit.md` in the scratchpad of the manager. The worktree is
`.claude/worktrees/rabbit-armpit` on the branch `rabbit-armpit`, rebased onto `dee3f543`.

## State

- Last finished step: steps 1 and 2 of the brief, the gates, and the docs. The rig reads
  `rabbit-4-roots.glb` (the hull fill h1 of `tools/arm-roots/rabbit.json`). The report is
  `docs/research/2026-10-22-rabbit-armpit.md`.
- Step 3 of the brief (commit `b1e270f0` of the paused round `rabbit-depth`) is not done. The round
  reached its time box.
- The probes of `probes/` run from `scratch/` (copy them). `probes/var.sh <name> '<edits JSON>'`
  writes a copy, rigs it with `--check --keep scratch/rig-<name>`, and dumps its poses.

## Next steps

1. The V crease at the front of the right arm root in the play (vertex 980, from az60 at the frog,
   the tip, and the crossing). A push of the root front (p5 of `variants.txt`) softens it, but on
   top of the fill each push makes the relax of the shapes of the right arm fail. Two ideas: a
   rule of `raise_shape()` that keeps the notch faces of the cut fixed, or a fill of the bind mesh
   in `tools/blender/rig_mesh.py`, so that the arm-down shape gives the source back at rest.
2. Cherry-pick `b1e270f0`, then run `pnpm arm-check violinist --base <start>` and the lineups of
   `lift50` and `lower50`.
