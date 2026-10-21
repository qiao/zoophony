# Decisions of the tool speedups of the deer retro

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The retro of the deer mesh round (2026-10-21) asked for two speedups: `--glb` for
`pnpm pose-depth` and `pnpm hold-fit`, and several variants in one call of `pnpm arm-check`. The
agent of the branch `tool-speedups` decided these rows. The user can reverse each decision. Then
update its section, and remove its row.

| Decision | Section |
|---|---|
| `pnpm pose-depth --glb` and `pnpm hold-fit --glb` run in the copy of `withGlbBody()`, as the other probes do. They refuse `--base`. The real files of `assets/` and `src/` do not change (`sweepGlb()`, `fitGlb()`). | 9.8 |
| The copy of `--glb` is an empty git repository, so that the times of `pnpm pose-depth` work there. The child of `pnpm pose-depth` gets `PROBE_NO_CACHE=1`, because the cache by tree does not know the GLB file (`runTool()`). | 9.8 |
| `pnpm arm-check --variant` runs one child for each variant, at most `--jobs` at the same time. The scene takes about 14 s of the 14.2 s of a child, and a hold such as `harpPlace` changes the scene, so one load for all variants saves no time (`checkVariants()`). | 9.8 |
| A variant runs with its `--set` options alone, so it shares the cache by tree with a plain `--set` call. A `--set` before the first `--variant` stops the run (`variantGroups()`). | 9.8 |
