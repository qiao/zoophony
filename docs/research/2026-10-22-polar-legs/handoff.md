# Handoff of the round polar-legs

Brief: the task of the manager (2026-10-22): the legs of the polar bear pianist about 1.6x longer,
with the size kept. Start commit `2da5c8ec`. Worktree `.claude/worktrees/polar-legs`, branch
`polar-legs`.

## State

- Last finished step: the setup.
- Next step: the base measures on `2da5c8ec`, then the variants 1.4, 1.6, and 1.8.

## Facts

- `pnpm rig-mesh --check --set legFactor=<f>` keeps the meters for each unit (`keptHeight()`),
  but `--glb` of the probes takes the height of `ANIMALS`, so a probe of a kept file needs the
  kept height in `ANIMALS` first.
