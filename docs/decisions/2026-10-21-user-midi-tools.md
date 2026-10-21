# Decisions of the probe and render tools for a MIDI file of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The retros of 2026-10-21 found that the agents lost the most time when the user sent a MIDI file
of their own, because the tools read only the demos. The task "Tools of the beat motion" of step
5 of `TODO.md` asked for `--midi`, `--strip`, `--trace`, and `--set` and `--variant` of
`pnpm clip-probe`. The agent of the branch `user-midi-tools` asked no question, so each choice is
a row. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| A tool reads a file of the user from its path and copies no file into the repository. Its name in the demo list is its base name with one `.mid` (`userDemoFile()` of `tools/probe-demos.ts`). | 9.8 |
| In `pose-depth`, `hold-fit`, and `arm-check`, each `--midi` is one more `--demo`, so a run with `--midi` and no `--demo` reads only the file. | 9.8 |
| The cache keys hold the SHA-256 of each `--midi` file, so a new file at the same path gets a new key. A command line with no `--midi` keeps its key (`keyArgs()` of `tools/ref-tree.ts`). | 9.8 |
| `pnpm arm-check` reads the files with its own reader, because its gate runs in the tree of an old commit too (`userFiles()`, `GATE_SCRIPTS`). `pose-depth` and `hold-fit` run the tools of the commit, so `--base` needs a commit that knows `--midi`. | 9.8 |
| `close-views play --midi` opens the file with the file input of the page, as a user does (`openMidi()`). | 9.8 |
| The frozen song time of `--strip` comes from a build plugin of the tool, in place of a dev hook in `src/`, because the build of the base commit has no such hook. The plugin changes two lines of `frame()` of `src/app/app.ts` (`freezePlugin()`). | 9.8 |
| A strip frame poses at the wall time 1000 s plus its song time, so each lift is over and the idle motion of both trees is the same (`FREEZE_WALL`). | 9.8 |
| Only the strip frames of the commit go into the cache by tree. A frame after a seek depends on the timing of the page, so its cache could hold a frame that a new run does not give (`stripCacheDir()`). | 9.8 |
| A camera in JSON gives a position and a target in the axes of the stage, with the field of view of the stage by default. It takes the aim plugin of `--at` (`jsonCamera()`). | 9.8 |
| `pnpm beat-rates --trace` runs the script of the working tree on the commit of `--base`, so the commit of 1b1013fd also gives a trace. With no `--player`, it shows the player with the largest sway in the range (`tracePlayer()`). | 9.8 |
| The variants of `pnpm clip-probe` run one after the other, each with the `--jobs` of the run, and the commit runs one time. A run with `--variant` and `--json` stops (`checkVariants()`). | 9.8 |
