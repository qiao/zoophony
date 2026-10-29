# Decisions of the gzip of the preset and demo files

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The round `perf-gzip-audio` of 2026-10-29 makes the preset files and the demo files smaller on the
wire. The manager measured the network traffic of the production build: GitHub Pages sends the
`.sf3` and `.mid` files with no gzip. The report
[`2026-10-29-network-load.md`](../research/2026-10-29-network-load.md) gives the measures and the
open candidates. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The build gzips each preset file of `dist/sf/` and each demo file of `dist/demos/` in place, with the same name, at zlib level 9. A Vite plugin with `apply: 'build'` runs it (`GZIP_AUDIO` of `vite.config.ts`, `gzipSiteAudio()` of `tools/gzip-site.ts`). `public/`, the dev server, and the Node tools keep the plain files. | 6.2, 7.2 |
| The client removes the gzip layer only when the first two bytes are `1f 8b`, with the native `DecompressionStream`. Else it uses the bytes as they are: the dev server, `perf-60.mid`, and a host with its own gzip (`plainBytes()` of `audio/plain-bytes.ts`). | 6.3 |
| `dist/sf/index.json` holds the gzip size of each preset. The load ring counts the bytes that arrive against these sizes, and `splitDecodes()` splits the files by these sizes. The progress code stays the same (`gzipSiteAudio()`). | 6.3 |
| A browser with no `DecompressionStream` (Safari before 16.4, Firefox before 113) cannot load the presets and the demos of the build. The app adds no fallback and no dependency. | 6.3 |
| `pnpm size` counts a file that is gzip data with its own size, because the host sends it with no second gzip. Each other file counts with the size of its gzip (`measure()` of `tools/size.ts`). | 7.2 |
