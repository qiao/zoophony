# Handoff of the round deer-dog-seams

Base `ffd03c4b`. Worktree `.claude/worktrees/deer-dog-seams`, branch `deer-dog-seams`.

## Last finished step

- Deer: chosen variant `pr` (copy `deer-arms.glb` of `arm_patch.py`, cut top 0.575 with fins,
  skin and body normals, `armIslands`, one `rigid` sliver). The copy and the config edit are
  done. The copy is committed (`f6840cfc`).
- Dog: 6 variants (cut 0.61, 0.64, 0.66, patch a, patch b, patch a with rigid). Patch a is the
  best look, but its lift folds rise from 16.1% to 17.5% (face 342 at the right shoulder top),
  so the dog stops by the rule of 6 variants. No dog rig ships.
- `tail_weights()` fix committed (`f0385ad3`).

## Next step

- The deer rig is committed (`d36182ff`), with the report, the decisions, design 4.4, and the
  open items in `TODO.md`. Next: `tools/check-commits.sh --tip ffd03c4b` with a clean tree, and
  the report to the manager.
