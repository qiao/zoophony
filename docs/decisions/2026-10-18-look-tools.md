# Decisions of the look tools

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, five light rounds repeated the same steps by hand: a patch of a look override, a
script of variants, probes of the light, and image measures in Python. The manager chose four
items for the round `retro-look-tools` (the user wants saved tools for repeated tasks), and its
agent decided the rows below. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| The look override is one permanent module, the first import of `src/main.ts`, so it acts before the other modules read the values at their load (`src/app/look-override.ts`). A round applies and reverts no patch. | 9.3 |
| The build gets an empty stub of the override (plugin `zoophony:dev-look-override` of `vite.config.ts`). The dead code alone moved the look modules to the front of the chunk and grew the first download by 409 B after gzip. | 7.2 |
| `LOOK_ROOTS` holds 38 roots: the roots of the last patch, and each other exported light, pool, color, grade, finish, haze, lens, and beam constant. A list changes in place, so a module that keeps the list sees the new items (`applyLook()`). | 4.5 |
| The tone curve and the lamp colors of a shot are read at use time (`gradeLutData()`, `writeLamp()`). Five paths that GLSL text or a module constant reads at load are refused by name (`LOAD_TIME_PATHS`). The plank sizes are numbers, so no path names them. | 4.5 |
| The solo clicks the solo button of each seat after the layout and the seat list of the first piece show (`soloFromQuery()`). Thus the sound and the poses follow it, as for the user. The patch of the back-light round soloed only the light. | 2.4 |
| `pnpm look-variants` checks each variant in Node first, starts Vite on 127.0.0.1 at a free port, refuses a `--port` in use, and stops the server by its PID (`tools/look-variants.ts`). | 9.3 |
| The measures of `metrics.py` and `back_measures.py` are in TypeScript (`lookSummary()`, `defaultSummary()` of `tools/look-lab.ts`). On one frame set, the row of the camera `orchestra` is equal to the row of `metrics.py`. | 4.5 |
| The regions of the camera `default` come from the layout of the default demo and the camera of "Reset view" (`tools/look-regions.ts`). The back floor starts half a row in front of the back row, because Boulanger has no floor 0.6 m behind its last player. | 4.5 |
| The white fur takes a saturation below 0.4 and a luma above 60. `pnpm look-variants` measures each variant on the pixels of the first variant, and prints the count of the own mask. | 4.5 |
| `pnpm light-probe` takes its math from the scene (`poolFactor()`, `hotSpotFactor()`, `spotIlluminance()`). The hot spot is on by default for each spotlight with a shadow map of the tier. `--no-hot` gives the probes of the back-light round. | 4.5 |
| The traps of the look measures go into the new module `docs/agents/look-work.md`, because `model-traps.md` holds the traps of route 3. | 9.6 |
