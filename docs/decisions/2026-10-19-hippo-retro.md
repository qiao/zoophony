# Decisions of the retro of the hippo chest round

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "the hippo's chest is clipping when playing". The round
`hippo-chest` (`2026-10-19-hippo-chest.md`) fixed it and named three slow steps. The hippo arm
round on `main` named three more, which the manager added during the tool round `retro-hippo`.
The tool round built the six items. The report
[`2026-10-19-hippo-retro.md`](../research/2026-10-19-hippo-retro.md) gives the times and the
measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| After the merge of the hippo chest round, the manager asked its agent what would make the next round faster (user rule of 2026-10-12), and chose the three items of the brief. | 9.8 |
| The sweep of each role with a held instrument (the bowed strings and the winds) measures the closed shells of the instrument and of the slide in the body only (`INSTRUMENT_PART`). | 9.3 |
| `pnpm hold-fit` takes the instrument part of the sweep role, so the bassist gets the column (`splitHeld()`). | 9.3 |
| Open: the pair gives the deepest corner of the whole instrument. For the hippo it is the back of the upper bout (14.7 cm), and the top plate goes only 1.5 cm deep (`top-plate.ts` of the chest round). | 9.3 |
| The role mode of `pnpm close-views` takes `--zoom` and `--elevation` for each view, as the species mode does, and `--scale` up to 3 for the cell size. The WebP grid keeps the cells of the factor 1, within 300 kB (`roleCamera()`, `roleCell()`). | 9.8 |
| `--set` of `pnpm rig-mesh --check` adds a last key that the config does not have, or the next item of a list, with a JSON value. The tool names the new keys, because the rig script ignores an unknown key (`newKeys()`). | 9.8 |
| `pnpm rig-mesh --check --watch <faces>` gives the share of the play, lift, and rest samples in which each named face folds, and marks a variant with another mesh topology (`watchLines()`). | 9.8 |
| The manager added three items of the hippo arm round, after the first three: the samples over a goal, the folds of named faces in `pnpm hold-fit`, and the base row of `pnpm pose-depth --set` in a cache. | 9.8 |
| `pnpm pose-depth` gives each pair the count and the share of the samples over the limit of the pair, or over `--goal <cm>`. A pair with no limit has no count with no `--goal` (`PairGoal`, `overText()`). | 9.3 |
| `pnpm hold-fit --faces-of <list>` adds a column of the share of the play samples in which each named face folds. It shares `faceShares()` with `pnpm rig-mesh --watch` (`tools/face-shares.ts`). | 9.8 |
| The base row of `pnpm pose-depth` with `--set` goes into `probe-cache/` by the trees of the working tree, the arguments, Node, and the lockfile. A run with no `--set` does not change (`treeCacheFile()`, `baseRowCache()`). | 9.8 |
