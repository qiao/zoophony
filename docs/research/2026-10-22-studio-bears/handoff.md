# Handoff of the round studio-bears

Brief: `brief-studio-bears.md` of the manager scratchpad. Worktree
`.claude/worktrees/studio-bears`, branch `studio-bears`, start `d7f4e76e`. Limit from the user
(2026-10-22): "do not exceed 3000 meshes", at most 3,000 faces for each bear GLB. Scratch logs:
`<scratchpad>/sb/`.

## Last finished step

- Both bears are done and committed: studio bodies with even facets, crease 70, color blend
  0.12, the baton hold of the studio bear, the level thighs of the pianist, the lean of 28°, the
  docs, the report, and the open items in `TODO.md`.

## Next step

- Read the audit sheets of `close-views audit --roles conductor,pianist --base d7f4e76e`, run
  `pnpm size --base d7f4e76e` and `pnpm frame`, then `tools/check-commits.sh --tip d7f4e76e`.
