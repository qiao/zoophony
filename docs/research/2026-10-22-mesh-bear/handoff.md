# Handoff of the round `mesh-bear`

The brief is in the scratchpad of the manager (`brief-bear.md`). The worktree is
`.claude/worktrees/mesh-bear` on the branch `mesh-bear`, from `7c1747ed`.

## State

- Done and committed: the mesh of the user (`assets/models/bear/bear-mesh.glb`), the rig config
  (`tools/mesh-rigs/bear.json` from `make_config.py`): cut of the arm seam, tone to the brown of
  the reference, smile band, head split at 0.79, tail ball, palm to the front.
- Not committed: `ANIMALS.bear` of `tools/studio-body.ts` (the mesh rig), the rig GLB
  `bear-mesh.rig.glb`, `src/models/studio/bear.ts`, and the baton grip along the index finger
  (`src/models/instruments/baton.ts`, `BATON_BIND` of `src/pose/conductor.ts`).
- The arm gate fails only on the grip turn (the entry of `ACCEPTED_GRIPS` is the old grip).
- Next step: fit `CONDUCTOR_HOLD` and `LEFT_HAND_PLACES` in the new H (0.43 m), with
  `baton-probe.ts`, `pnpm hold-fit conductor`, `pnpm pose-depth conductor`, and lineups.
