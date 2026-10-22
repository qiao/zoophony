# Decisions of the load performance

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The round `perf-load` of 2026-10-21 made the load of the site faster. The user said: "optimize
the web performance of this repo". The pixels of the stage and the sound stay the same. The report
[`2026-10-21-load-performance.md`](../research/2026-10-21-load-performance.md) gives the measures.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| A packed studio mesh holds one stream for each kind of number: the places in two byte planes for each axis, the skin with no last weight, and each corner as one of eight recent vertices, the next new vertex, or a difference (`packStudioMesh()`). | 7.2 |
| The engine starts one decode Worker for each logical processor after the first, at most four. The largest preset file goes first, to the Worker with the fewest bytes (`decodeWorkerCount()`, `splitDecodes()` of `audio/player.ts`). | 6.3 |
| The decode starts when `sf/index.json` arrives, with no wait for the worklet module and the hall impulse response. The banks go to the synth when all three are ready (`#makeEngine()`). | 6.3 |
| `index.html` preloads the file of the default demo with a low priority, only when the hash names no demo. A plugin writes its URL from `DEFAULT_DEMO` (`DEFAULT_DEMO_URL` of `vite.config.ts`). | 7.2 |
