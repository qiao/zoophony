# Look work

This module of `AGENTS.md` gives the tools of a round of the light, the colors, or the grade, and
their traps. The head comment of each tool file gives its options.

## The loop of a round

1. Probe the direct light with no render: `pnpm light-probe` (about 1 s). `--grid` and `--goal`
   solve the lux of the back-row lights for each cell.
2. Render the variants: `pnpm look-variants <file> --out <dir>` (about 40 s for each variant). Each
   variant holds look paths and values, and the key `solo`. The tool prints one row of the
   measures for each variant.
3. Change the code to the chosen variant, and compare it with `pnpm look-lab <dir> --base main`.
4. Put the variants file, the outputs, and the commands into the research folder of the round.

## The look override

- The dev server reads the query `look`: JSON of look paths, such as
  `BACK_ROW_LIGHT.position.1`, and their values (`src/app/look-override.ts`). The module stays in
  the repo, so a round applies and reverts no patch. Add a new constant of the look to
  `LOOK_ROOTS` of `src/scene/look-values.ts`.
- A value that a module reads at its load needs a read at use time, as `gradeLutData()` reads the
  tone curve. Until then, `LOAD_TIME_PATHS` refuses its path.
- The query `solo` takes seats or species, such as `panda` or `13,14`. It clicks the solo buttons
  after the load, so the light, the sound, and the poses follow the solo.
- The regions of the camera `default` of `pnpm look-lab` come from the layout of the default demo
  (`tools/look-regions.ts`). Check `regions-default.png` after a change of the layout or the camera.

## Traps

| Trap | Rule |
|---|---|
| The white-fur mask (a saturation below 0.4) moves with the color of the light. In the back-light round, `main` had 1,700 panda pixels and step 2 had 4,600, so their p50 values did not compare. | Compare variants on one pixel set, as `pnpm look-variants` and the row "pixel sets of base" of `pnpm look-lab` do, and read the pixel counts. |
| On the high and the medium tier, `SPOT_POOL_GLSL` multiplies each spotlight with a shadow map by the hot spot, the side lights too. On the players, the hot spot holds only the podium (`LIGHT_POOL.playerSpot`), so a probe without it shows the floor and the conductor too dark. | Keep the hot spot of `pnpm light-probe` on. Use `--tier low` for the low tier, and `--no-hot` only to compare with the probes of 2026-10-18. |
| Another species can use the face colors of a mesh rig through `palettes`, as the tan fox uses the red fox rig. | A color rule of a rig changes only `COLOR_0`, and each palette maps from the colors before the rule (`COLOR_1`). Check that `pnpm body-probe` shows only the target species. |
| A darker color reaches the sRGB gamut early: a larger chroma factor then has no effect. | Read the gamut count of the `shift:` line of the `pnpm rig-mesh` log for each variant. |
| The system Python has no Pillow and no numpy for a pixel measure. | Run a measure script with `uv run --with pillow --with numpy python -I <script>`, as `docs/research/2026-10-19-fox-red/measure.py`. |
