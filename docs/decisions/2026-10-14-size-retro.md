# Decisions of the retro of the size round

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, after the merge of the larger red fox and rabbit (`ac0f4d56`), the manager of the
session chose the items of the retro that are worth their cost (user rule of 2026-10-12). The
agent of the branch `retro-size` decided the rows below. The report
[`2026-10-14-size-retro.md`](../research/2026-10-14-size-retro.md) gives the times and the break
commands. The user can reverse each decision. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| `pnpm pose-depth <role> --base <ref>` and `pnpm hold-fit <role> --base <ref>` run the tool on a commit and on the working tree at the same time, each in a child process (`probeBeside()` of `tools/ref-tree.ts`). The commit runs the base with no change, and the working tree runs each variant of `--set`. The parent only waits, so Ctrl-C ends both children at once. A sweep runs for many seconds with no `await`, so a parent that sweeps the working tree itself handles INT only after its sweep. | 9.3 |
| The compare of `--base` has one row for each species, sample set, and pair: the deepest point of both trees in cm and in the H of each body. It groups the players of a species, also the seated player and the standing soloist. The details of the working tree give each player. | 9.3 |
| The mark `GROWS` follows a depth whose value in H grows by more than one step of the print of the depths (0.1 cm) in the H of the body of the working tree. A depth in the table has this step, so a smaller growth is not visible in the print. | 9.3 |
| The label of each player of the sweep names its species, such as `violinist 4 (fox-red, chair)`. The tool finds the species by the model of the player in the scene (`speciesOf()`), so the probe of an older commit finds it too. | 9.3 |
| `--json <file>` writes the rows of `pnpm pose-depth` and of `pnpm hold-fit`, and the child of `--base` uses it. `--base` and `--json` do not go together. | 9.3 |
| The gallery query `distance` places the camera at a fixed distance from the target, with no fit. The page writes the box of its models into `data-row` of its canvas: the half width, the half depth, and the height of the tallest model. | 7.1 |
| `pnpm close-views lineup <species,...> <dir>` shows the species standing in the rest pose, low from the front (4°), at 1440 × 720. One camera shows the tallest model of both trees whole, with 5% above it and 0.3 m of floor in front for the labels, and the widest row whole with a margin of 5%. | 7.1 |
| With `--base`, the lineup builds the commit with `src/gallery/` of the working tree (`overlayTree()`). The gallery of an older commit has no query `distance`, so its camera would differ. | 7.1 |
| `overlayTree()` checks each path with `overlayPaths()` before the first removal: it refuses an absolute path, a path that is not a part of the folder of the tree, and a path under `node_modules`. `withRefBuild()` puts the overlay in before the link of `node_modules`, and `overlayTree()` refuses a tree that has `node_modules` already (review of the branch). | 7.1 |
| A failure of one child of `probeBeside()` ends the other child at once, so the report of the failure comes early (review of the branch). | 9.3 |
