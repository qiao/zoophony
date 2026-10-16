# Decisions of the modes species and play of close-views

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-16, the retro of the round `seat-rest` found that each model round wrote its own image
scripts, about 25 minutes for each round. The manager of the session asked for two modes of
`pnpm close-views` that make the images of `views.ts` and `user-camera.ts` of
[`2026-10-16-seat-rest/`](../research/2026-10-16-seat-rest/). The agent of the branch
`close-modes` decided the rows below. [`2026-10-16-close-modes/`](../research/2026-10-16-close-modes/)
holds the search of the camera `violins`.

| Decision | Section |
|---|---|
| The script of `pnpm close-views` reads the command line before the build. pnpm appends the arguments only to the end of a script, so the script runs in `sh -c` with the arguments as `"$@"`. Its first step is the tool with `--check`, which reads the command line and the commit of `--base` and returns. Then `pnpm build` and the tool run. The build also runs with `--url`, as before | 9.8 |
| The server of the build of a commit moved with no change of its steps into `withRefSite()` of `tools/close-views.ts`. The role mode, the lineup, and the two new modes use it. The new modes add no code that starts or stops a process, removes a folder, or writes into git | 9.8 |
| All modes start their servers at `SERVER_PORT` (4300), the port of the tool, and Vite moves up to a free port. No other tool starts at 4300, and the research probes used 4370, 4420, and 4460 | 9.8 |
| The views of the mode `species` (`SPECIES_VIEWS`) turn the camera around the body of the species (the gallery query `body`). The side views `left` and `side` are 3° above the floor, as `views.ts`, so that the knees, the seat, and the soles show. `front`, `front35`, and `back` are 10° above it, so that the lap shows. `above35` looks down 35° from the front, as the default view of the stage looks down at the players that face it. The default views are `side` and `front35`, the views of `views.ts` | 7.1 |
| The cells of the mode `species` have the size of the cells of the role grids (360 × 450). `views.ts` used 480 × 600. The same size keeps one render code for both modes | 7.1 |
| `--moment play` shows the playing pose at the time 0 of the default test notes of the gallery, the moment of `views.ts`. `--moment rest` adds the gallery query `rest`, which each species has | 7.1 |
| With `--base`, the grid of the mode `species` puts the row of the commit directly above the row of the working tree for each species (`rowsInTurns()`). Thus each pair of rows to compare is adjacent. The role mode keeps its grid of the commit above its grid of the working tree | 9.8 |
| The camera `violins` is the drag 45 px to the right and 60 px up from (720, 400), and 12 wheel steps of -100, from "Reset view". Its frame matches the bottom cell of `user-camera.webp` with the score 0.9999 (`score.py`, the best of 122 frames of `violins-search.ts`), and the frames of the tool give 0.9962 to 0.9969 (`scores.txt`). The drag up of 60 px puts the camera at the lowest elevation of the orbit limits (10°). Each drag up of more than 58 px gives the same elevation | 9.8 |
| The mode `play` seeks to 4 s before `--time` (the hide time of the bar of 2.3 plus 1 s), after the moves of the camera. It takes the frame when the seek bar reaches the whole seconds of the time, after the rest of the time, and when the bar has the class `is-hidden`. A seek keeps the free camera of "Reset view" (2.5). Thus a large `--time` needs no long play, and the bar is not in the frame. The tool prints the song time of the bar at each frame | 9.8 |
| The mode `play` takes a new page for each camera, so that each frame has the same steps from the first play. `--camera` can repeat, and with no `--camera` the camera is `default` | 9.8 |
| A play frame takes two thirds of its size in the grid for one or two cameras, and less for more cameras, so that the grid is at most 1920 px wide (`playCell()`). The grid of two cameras with `--base` gave a WebP file of 256 kB. The tool warns when a WebP file stays above 300 kB at the lowest quality | 9.8 |
| Each label of a grid of `pnpm close-views` is white on a dark box of 65% opacity, also in the role grids and the lineup. The labels of the play frames lay over the logo and the title of the app, and were not legible | 9.8 |
| An unknown species, view, moment, demo, camera, or option stops the tool with a message that lists the correct names. The time must be a number of seconds of 0 or more, before the end of the demo (`DEMOS`). The parse of the command line is in pure functions with TSDoc (`speciesArgs()`, `playArgs()`, `modeLine()`, `namedItem()`, `playCamera()`), and no test, because all tests are paused | 9.8 |
