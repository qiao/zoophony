# Handoff of the round polar-legs

Brief: the task of the manager (2026-10-22): the legs of the polar bear pianist about 1.6x longer,
with the size kept. Start commit `2da5c8ec`. Worktree `.claude/worktrees/polar-legs`, branch
`polar-legs`.

## State

- Last finished step: the rig of 1.6, the hold of lean 28°, the gates, the images, the docs, and
  the report. No hold passes the whole arm gate, so the round stops by the rule of the brief.
- Next step: the choice of the manager (`TODO.md`, "Polar bear arm gate").

## Facts

- `pnpm rig-mesh --check --set legFactor=<f>` keeps the meters for each unit (`keptHeight()`),
  but `--glb` of the probes takes the height of `ANIMALS`, so a probe of a kept file needs the
  kept height in `ANIMALS` first.
- The kept heights of the landmark at 1.929 m for each unit: 1.3233 m (1.4), 1.4062 m (1.6),
  1.4892 m (1.8). `scratch/variants.sh` sets them in `ANIMALS` for each run, then restores 1.1574.
- The seated head top rises with the bench: 1.729 m on `main`, 1.814, 1.857, and 1.900 m. `H`
  stays 0.453 m. A head top within 2% and `H` within 2% cannot both hold.
