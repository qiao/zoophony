# Decisions of the retro of the beaver and pig mesh rounds

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

After the merges of the beaver and pig meshes, the manager asked their agents what would make the
next round faster. The tool round `retro-winds` built the six items of the brief and two items of
the beaver arm round. A later round on `main` built four items of the hippo arm round. The report
[`2026-10-19-winds-retro.md`](../research/2026-10-19-winds-retro.md) gives the times and the
outputs. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The manager chose the six items of the brief from the answers of the agents (user rule of 2026-10-12). | 9.8 |
| `--set` of the hold tools takes a list of numbers also as a JSON list, and a turn of a wind hold as `holdTurn(<x>,<z>)` in degrees, with an optional first turn (`parseTurn()` of `tools/hold-sets.ts`). | 9.8 |
| With `--set`, `pnpm hold-reach` of a wind instrument ends with a table of the spare reach of each grip in the play and in the rest, in cm (`spareTable()`). | 9.8 |
| `SCALED_INSTRUMENTS` of `models/instruments/types.ts` is the one list of the instruments with a scale of the species, and `--set` takes the keys of `SCALE_PARAMS` (`instrumentScale()`, `buildScaled()`). | 4.6 |
| `pnpm raise-fit --json <file>` writes its entry. In `--set` of `pnpm rig-mesh --check`, `<path>+=<value>` adds a JSON value to a list, and `@<file>` reads a value from a file, so `raise+=@<file>` adds the entry (`appendConfigValue()`). | 9.8 |
| `pnpm pose-depth` prints the demos, the rows, and an estimated time before the first row, from the base row of the cache or the times of the last rows (`planLines()`). | 9.3 |
| `pnpm pose-depth` refuses more than 5 `--set` rows over all demos of a role, unless `--demo` or `--long` names the choice (`ROW_LIMIT`). | 9.3 |
| `pnpm hold-fit` gives the spare reach of each grip of a wind hold, and `--scan` takes a wind hold with no lap rest, where a missed grip counts as a missed goal (`windSpare()`, `scanTable()`). | 9.8 |
| A failed rig of `pnpm rig-mesh` ends its message with the last line of the error output of Blender, also in the check table (`blenderCause()`). `pnpm raise-fit` gives the count of the free shapes of the body (`STUDIO_RAISES`). | 9.8 |
| The manager added two items of the beaver arm round and four items of the hippo arm round after the six items. | 9.8 |
| After a `cut` or a ring, `--watch` of `pnpm rig-mesh --check` pairs each watched face of the base with the folded face of the variant with the nearest middle within 1 cm (`watchPairs()`, `fold-probe --middles`). `--keep <dir>` keeps the GLB file of each rig. | 9.8 |
| `pnpm close-views <role> --base <ref> --pairs <cells> --crop <box>` writes the crop of each named cell of the commit beside the crop of the working tree (`pairImage()`). | 9.8 |
| The probe tree of a commit is an empty git repository (`git init` in `withProbeTree()`), so the git commands of the tools of each commit work there. | 9.3 |
| Each row of `pnpm hold-fit` names the 5 faces that fold in the most samples, with `new` at a face that folds in no sample of the base row (`topFolds()`). | 9.8 |
