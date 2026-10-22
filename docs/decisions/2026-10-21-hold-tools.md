# Decisions of the hold tools of the hippo retro

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The retro of the rounds `hippo-bass` and `hippo-bass-2` (2026-10-21) named the probes that saved
the most time. The manager asked to save them as tools: `pnpm hold-scan`, and `--per-bone`,
`--every`, and `--where` of `pnpm pose-depth`. The agent of the branch `hold-tools` decided these
rows. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| `pnpm hold-scan` scores a variant by the depth past the limit of each pair, summed in cm, plus 10 for each share of the fingerboard and of the hair that it loses against the base. Lower is better (`scoreOf()`). | 9.8 |
| A variant prepares only the players of its role again (`PlanReuse` of `preparePoses()`), on 12 play samples and the rest: 0.14 s on the bassist (0.28 s with each player). A scale or a percussion place builds new scenes, about 0.45 s (`MODEL_ROOTS`). | 9.8 |
| `--move` turns a bowed instrument around the end of its bone in the model axes, on top of `playTurn`, and moves it in meters (`moveChanges()`). A wind hold takes `--grid` only. | 9.8 |
| `--per-bone` splits only a part of arm bones, and each bone keeps the limit and the accepted depths of its group (`perBoneRole()`). `--every` thins only the play. `--base` refuses both, because an older commit does not know them. | 9.8 |
| `--where` takes the first player of the role in the demo at a play sample, and gives each place in the bind axes of the instrument, and along the strings for a bowed instrument (`whereLines()`). | 9.8 |
| The model traps ask for `pnpm arm-check --variant` next to the first depth scan, because in `hippo-bass` the gate failed only after the choice of a hold. | 9.8 |
| Open: `pnpm hold-scan` gives no reach of a wind or a percussion hold, and no lift and lowering samples. | 9.8 |
