# Decisions of the mode batch of close-views

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-16, the retros of the rounds `cat-mesh` and `cat-trunk` asked for one command for the
images of a model round. Each round ran `pnpm close-views` four or five times with `--base main`,
and each run built both trees again. The manager of the session asked for a mode `batch`. The
agent of the branch `views-batch` decided the rows below.

| Decision | Section |
|---|---|
| The mode `batch` makes the image set of a model round in one run: `pnpm close-views batch <dir> [--species <species,...>] [--moments <moment,...>] [--views <view,...>] [--role <role>]... [--lineup] [--camera <camera>]... [--demo <id>] [--time <s>] [--url <url>] [--base <ref>]`. The options `--species`, `--role`, `--lineup`, and `--camera` each add a part. A batch with no part stops before the build | 9.8 |
| The options have the names of the single modes. `--moments` takes a list of moments in place of the one moment of `--moment`. Its default is `play,rest`, the image set of the cat rounds. `--views` keeps the default of the mode `species`: `side` and `front35` | 9.8 |
| `--lineup` is a flag with no value. It shows the species of `--species`, because the cat rounds used the same species for both images. A lineup of other species runs the single mode `lineup`. `modeLine()` of `tools/close-views.ts` now reads such a flag | 9.8 |
| The play frames need `--camera`, because `--demo` and `--time` give no camera. `--demo` or `--time` with no `--camera` stops the tool before the build. So do `--moments`, `--views`, or `--lineup` with no `--species`. A moment or a role that comes two times also stops it, because two such parts write the same files | 9.8 |
| Each part writes into its own folder of `<dir>`: `species-<moment>/`, `<role>/`, `lineup/`, and `play/`. Both moments of the mode `species` write the grids `species-views.png` and `species-base-views.png`, and the single modes keep their file names. Thus each folder holds the files of one single run. The cat rounds renamed these grids by hand | 9.8 |
| The batch reuses the code of the single modes. Each mode renders the working tree and gives a function that renders the commit (`ModeRender` and `CommitRender` of `tools/close-views.ts`). `renderModes()` runs a single mode and a batch with the same code. The reader of each single mode reads the command line of each part (`partMode()`), so `--check` gives the messages of the single modes | 9.8 |
| The build of the commit for a lineup takes `src/gallery/` of the working tree (the overlay of `withRefBuild()`). When git finds no difference of the path between the working tree and the commit, the overlay changes no file, and all parts share one build (`commitBuilds()` and `sameInCommit()`). Else the lineup gets a second build of the commit, and the tool prints a line. A batch with the base `b4549eab~1`, the commit before the gallery query `distance`, built the commit two times | 9.8 |
| The parts run one after the other, and no build runs beside the renders. `pnpm build` of the working tree took 1.2 s (`/usr/bin/time -p pnpm build`), and the renders take most of the time of a batch | 9.8 |
| Times on 2026-10-16 with `--base main`: the image set of the round `cat-trunk` took 115 s in five runs and 90 s in one batch. The five runs were `species cat,fox-red,rabbit` with `--moment play` and with `--moment rest`, `violist`, `lineup cat,fox-red,rabbit`, and `play --camera default --camera violins`. The five runs took 115 s with the tool before the change and 115 s after it. The 1-minute load average was 10 before the first runs and 6 before the batch | 9.8 |
| The batch wrote the same 89 file names as the five runs. Against the runs before the change, at most 0.86% of the pixels of a PNG file differed by more than 16 in a channel (`play/play-violins.png`). The two sets of five runs differed by up to 4.45% (`play/play-base-violins.png`). Thus the batch stays in the noise of the idle motion and of the play | 9.8 |
