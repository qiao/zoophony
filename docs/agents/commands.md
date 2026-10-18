| `pnpm look-lab <dir> [--base <ref>] [--url <url>] [--measure]` | Measures the light of the stage against `orchestra-latest.png` (design 4.5). It renders the default demo at 33.5 s at the cameras `orchestra`, `default`, and `violins` of `pnpm close-views play`, then writes `<dir>/look.md`: the luma percentiles and the saturation of the stage area of each frame, the colors of matched regions, and the contrast of the floor shadows. `--measure` only measures the frames in `<dir>`. A new layout moves the regions (`LOOK_REGIONS` of `tools/look-lab.ts`). About 90 s. |
# Commands

This module of `AGENTS.md` lists the commands of the repository and the checks of CI. Use Node 24
or later, and pnpm from the `packageManager` field of `package.json`.

Each row gives the essence of a command. The head comment of the tool file gives the details. The
tools print only a one-line usage text for `--help`, so read the file.

## Shared options

- **`--set <changes>`.** One variant of a hold in memory, with its changes separated by `;`, such
  as `piano.lean=16deg`. The root `<instrument>@<species>` changes the own hold of one species
  (`SPECIES_HOLDS` of `pose/bowed-rig.ts`, `SPECIES_WIND_HOLDS` of `pose/winds.ts`), such as
  `violin@rabbit.lean=12deg`. The root of an instrument (`violin`) changes the hold that the
  species share, and the tool names the other paths that move with it. An object, a list, or
  `null` takes JSON text with the keys of the old value. An unknown key stops the run. Code:
  `tools/hold-sets.ts`.
- **`--base <ref>`.** Runs a commit, a branch, or a tag beside the working tree, each in a child
  process with its own tools (`probeBeside()` of `tools/ref-tree.ts`), and prints a compare. A
  role that the commit does not have stops the run. Two JSON formats compare only when the newer
  format only adds fields. The JSON of the commit goes into a cache by tree (`probe-cache/` in the
  common folder of git): a hit prints `base: cached`, and `PROBE_NO_CACHE=1` runs the commit
  again. The temporary folder goes away at the end, also after a failure and after Ctrl-C.
- **`--glb <file>`.** Gives the animal the studio body that the export makes from another GLB
  file, in a copy of `src/` (`tools/glb-swap.ts`). `ANIMALS` and `src/` do not change. A species
  with no studio body takes the body when `tools/mesh-rigs/<species>.json` exists.
- **Image tools.** `pnpm screenshots`, `pnpm snapshot`, `pnpm sheet-check`, `pnpm choir-check`,
  `pnpm keyboard`, `pnpm close-views`, and `pnpm look-lab` build the site and use headless
  Chromium with ANGLE on Metal (`pnpm exec playwright install chromium` one time). They stop
  their servers and browsers at the end. Do not edit the working tree while they build.

## Build and site

| Command | Action |
|---|---|
| `pnpm install` | Installs the dependencies. |
| `pnpm dev` | Writes the SF3 preset files into `public/sf/`, the changed demo files into `public/demos/` (design 8.3), and `perf/perf-60.mid`, then starts the Vite dev server. The audio spike is at `/spike.html`, the model gallery at `/gallery.html`, and the animal views at `/views.html` (design 7.1). `/#demo=<id>` shows another demo, such as `perf-60`. |
| `pnpm build` | Writes the same files, then builds the site into `dist/` with the third-party license file (design 7.3). `pnpm vite preview` serves `dist/`. `ZOOPHONY_BASE=/zoophony/` sets the base path of GitHub Pages (design 9.2). |
| `pnpm size [--base <ref>]` | Prints the gzip size of the first download after `pnpm build`, and fails above 1 MB (design 7.2). `--base <ref>` also builds the commit in a temporary folder (about 3 s), and prints both totals and the difference. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the paths of design 9.5 with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |

## Images

| Command | Action |
|---|---|
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load] [--shots]` | Writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900, the default demo at 390 × 844, the gallery pages, the animal views, and the sheet pages. `--sheet` adds a close view of each gallery model, `--play` frames after 6 s of play, `--ui` the first screen and the open drawer, `--drawer` the seat list, the settings, the credits, and the drop overlay, `--load` the load states and the page with no WebGL2, and `--shots` a frame of each kind of camera shot of each demo. |
| `pnpm snapshot` | Saves the play frame of the default demo (1440 × 900, "Reset view", 3.5 s after a seek to 30 s) and a close view of each gallery model into `docs/snapshots/<commit date>-<short hash>/`, with a `README.md` of the commit. A second run on the same commit writes the same files again. |
| `pnpm sheet-check <sheet> <dir>` | Compares a sheet page of `views.html` with its sheet in `docs/reference/` (design 7.1). It writes the page, the silhouette of the body, and the sheet above the page. With a matte in `tools/sheet-mattes/<id>.png`, it prints the silhouette IoU of each view, the rows with the most different pixels, and the colors, and writes the difference image and `<id>-rows.txt`. `tools/sheet-mattes/make_matte.py <id>.json` makes each matte. |
| `pnpm choir-check <dir>` | Puts the gallery penguin beside one penguin of each of the two newest reference images (design 4.4), as `choir-compare.png` and `.webp`. |
| `pnpm close-views <mode> <dir> [--url <url>] [--base <ref>]` | Writes images from the gallery into `<dir>`, with a grid of all cells. The modes: `<role>` (the moments and the views of a role of `ROLE_VIEWS`), `lineup <species,...>` (side by side), `species <species,...>` (with `--views`, `--moment play\|rest\|lift<p>\|lower<p>`, `--zoom`, and `--elevation`), `play` (a frame of `--demo` at `--time` for each `--camera`), and `batch` (the image set of a round, one build of each tree). `--base` puts the grid of the commit above the grid of the working tree. `--url` renders a running site. A wrong name stops the tool before the build. A role: about 30 s. A batch: 90 s to 260 s. Details: `tools/close-views.ts`. |
| `pnpm keyboard` | Checks each control with the keyboard alone at 1440 × 900 and at 390 × 844 (design 9.5, step 6). It prints a Markdown table, and fails on a failed check. |

## Pose and body probes

These probes run with no build, and the source files do not change. The roles and their species
are in the table "Bodies and roles" of [`model-work.md`](model-work.md).

| Command | Action |
|---|---|
| `pnpm pose-probe <sheet> [--time <s>]... [--set <changes>]...` | Prints the posed elbow, wrist, and palm of each arm of a sheet pose (design 7.1), in head heights from each shoulder joint (out, up, forward), and the direction of the tip of the instrument. `--time` takes a song time. Each `--set` prints one variant after the base. About 1 s. |
| `pnpm pose-depth <role> [--demo <id>]... [--soloist <species>] [--set <changes>]... [--bones <list>] [--into <list>] [--times <list>] [--gaps] [--base <ref>] [--json <file>]` | Runs the clearance sweep of a role over each demo with the role (design 9.3). It prints the deepest point of each moving part in each obstacle (time, bone, and limit), and the largest note-target error of each hand. Each `--set` is one row of a table. `--bones` measures each bone, `--into` selects the obstacles, `--times` takes song times, and `--gaps` adds the smallest gaps of the head and the paws. `--soloist <species>` sweeps a standing soloist, which no demo has. `--base` compares the depths in the H of each body and marks `GROWS`. One variant: 6 s to 37 s. `--base main` on 14 demos: up to 5 minutes. Details: `tools/pose-depth.ts`. |
| `pnpm hold-reach <species> [--instrument violin\|viola\|<wind>] [--support chair\|stand] [--set <changes>]... [--size <scale>[,<scale>]...] [--glb <file>]` | Measures the reach of the arms against the instrument in the playing pose, with no idle motion (design 4.6). For a violin or a viola, it prints the reached parts of the fingerboard (`stopRange`) and of the bow hair (`bowRange`), and the scale of the rule of a violin shop (the scroll in the middle of the palm of the extended left arm) against the real violins of 0.33 m to 0.59 m. For a wind instrument, it prints the reach of each palm to its grip in the play and in the rest, and for a trombone the reached slide travel (`slideReach`). `--size` adds violin scales with the arm factor of the rig for each. Less than 1 s. Details: `tools/hold-reach.ts`. |
| `pnpm hold-fit <role> [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--sets <set>,...] [--faces <n>] [--demo <id>\|all]... [--base <ref>]`, or `--scan` in place of `--sets`, `--faces`, and `--base` | Fits a hold of a role in one run (route 3). Each variant gives one row: the folds of `pnpm fold-probe`, the deepest point of each sample set of the sweep (play, lift, rest, and lower), and, for a violin, the reach of `pnpm hold-reach`. A run with the rest set adds the lap rest, with the mark `OVER` at each missed goal (`tools/lap-rest.ts`). `--grid` adds a range of variants (at most 40), sorted by the folds and the depth. `--sets lift,rest,lower` skips the play (5 s against 70 s). `--scan` measures up to 1000 rest variants on one rest sample in seconds. The default demos are `FIT_DEMOS`. Details: `tools/hold-fit.ts`. |
| `pnpm fold-probe <role> [--demo <id>]... [--step <s>] [--faces <n>] [--turns <face>] [--json <file>] [--glb <file>] [--base <ref>]` | Counts the folded faces of the studio skin of a role over each demo with the role (design 4.4). A face folds when its posed normal is more than 90° from its bind normal. It prints a row for each sample set (the rest, the play at each 0.25 s, and the first 3 s of the lift): the share of the samples with a fold, and the most folded faces by side. `--faces <n>` lists the faces that fold most, with their corners and weights. `--turns <face>` gives the arm turn of its folds. `--base` marks the faces `new` and `gone`. 10 s to 40 s, or about 2 s for one demo. Details: `tools/fold-probe.ts`. |
| `pnpm body-probe [--out <file>] [--no-poses]`, `pnpm body-probe --compare <base.json> <new.json>`, or `pnpm body-probe --base <ref>` | Probes the rest joints and a mesh hash of each species on each support, each player of the section cast and the conductor, and a hash of the poses of each player of each demo in four sample sets (the rest, the lift, the play, and the lowering). With no `--out`, it prints a summary and the SHA-256 of the JSON. `--compare` and `--base` print each body, player, and pose set that differs, with the changed mesh fields and the first different sample, and fail on a difference. About 6 s. Details: `tools/body-probe.ts`. |
| `pnpm shot-trace <demo> [--from <s>] [--to <s>] [--cameras] [--base <ref>]` | Prints the choice of the shot planner at each cut of a time range (design 5.6, `traceShots()` of `src/shots/prepare.ts`): the candidates that a rule drops, the scores and the tries of the other candidates, the mark `chosen`, and the count of the refused cameras of each try by reason. `--cameras` lists each tested camera. `<demo>` is a demo of `demos/src` or a chamber test file (`piano-solo`, `violin-piano`, `string-quartet`, or `wind-quintet`). Less than 1 s. Details: `tools/shot-trace.ts`. |
| `pnpm docs-species <species> [--all]` | Prints each place of the docs checklist (section 8 of `docs/briefs/studio-body.md`) that does not name the species yet, with the file, the lines, the heading, and the line of the row. A place that the tool cannot find prints `not found`. `--all` also prints the places that name the species. It exits with 1 on a miss. Less than 1 s. The names of each species: `DOC_NAMES` of `tools/docs-species.ts`. |

## Rig tools

Blender 5.2 or later comes from the variable `BLENDER`, or from the path.

| Command | Action |
|---|---|
| `pnpm glb-init <species> <glb> [--force] [--preview <dir>]` | Starts a rigged GLB body (route 1, design 4.4). It copies the file with a README of its checksum to `assets/models/<species>/`, and proposes `tools/glb-bodies/<species>.json`: the Mixamo joints, the palette, the eyes, the nose, the ears, the fingers, and the scale. `--force` writes over a config. `--preview` also writes the images of `pnpm rig-body --preview`. |
| `pnpm rig-body <species> [--preview <dir>]` | Packs the rigged GLB body of a species with Blender into `src/models/rigged/<species>.ts` and the baked skin `<species>-skin.webp`, from `tools/glb-bodies/<species>.json`. `--preview` writes `skin.png` and `bones.png`. |
| `pnpm rig-mesh <animal> [--preview <dir>] [--check [--set <changes>]... [--roles <list>] [--step <s>] [--demo <id>]... [--faces <n>]]` | Rigs a textured mesh with no skeleton into the GLB format of a studio body with Blender (design 4.4), from `tools/mesh-rigs/<animal>.json`: the joints, the factors of the limbs and the trunk, the seat, the weight rules, the rings, the shapes of `raise`, the colors, and the chair. `--preview` writes images of the body. `--check` rigs into a temporary folder, writes no file of the repository, and prints the reach factor, the size budgets, the seat, the standing error (limit 1 mm), the folds of each role, and the form against `main`. The rig log warns when the thighs set the seat top more than 5 cm below the haunch, with a `chair.front` that puts the seat under the haunch, and when an eye box takes more than half of a dark patch. Each `--set` is one variant of the config. `--roles`, `--step`, and `--demo` limit the probes. One variant: 20 s to 75 s. Details: `tools/rig-mesh.ts` and `tools/blender/rig_mesh.py`. |
| `pnpm mesh-options <animal> <dir> --size <label>=<head top>... [--legs <f>,...] [--arms <f>,...] [--instrument <id>] [--species <id>]` | Makes the mid-report of phase 1 of a mesh. It rigs each size (the standing skull top in meters) with each leg factor, and each arm factor at the last size and leg factor, as `pnpm rig-mesh --check` does. `<dir>/options.md` gives the head top, `app.shoulders`, H, the seat, the chair depth, the reach, the arm to trunk ratio, with `--instrument` the reach of the hold on the real body, and the warnings of the rigs. `<dir>/options.png` shows the sizes and the arms at one scale, and the knees. `<dir>/rigs/` keeps each GLB file. About 7 s for each variant. Details: `tools/mesh-options.ts`. |
| `pnpm studio-body <animal> [--inspect [--glb <file>]]` | Writes `src/models/studio/<animal>.ts` from the GLB file of the studio, or from the file of `glb` of the entry of the animal in `ANIMALS` of `tools/studio-body.ts`, with no Blender: the welded mesh, the skin, the pea eyes, the corrective shapes, and the bind pose, scaled by the landmark of the animal. A seated role drops onto its seat. The entry can set `seat`, `seatBack`, `backRoom`, and `seatWidth`, and a `soloist` keeps its standing clip. The studio props go away. Run it after each change of the GLB file. `--inspect` writes no file, and prints the joints, the clips, the arm lengths, the props, and the lowest point of the skin. Details: `tools/studio-body.ts`. |

## Tests and scripts

All tests are paused since 2026-10-16 ([`workflow.md`](workflow.md), "Tests").

| Command | Action |
|---|---|
| `pnpm test` | Runs the Vitest project `unit`: all tests except the speed tests and the paused tests (design 9.3). While all tests are paused (`ALL_TESTS_PAUSED` of `vite.config.ts`), it runs no test and passes. |
| `pnpm test:paused [--base <ref>] [<path>]...` | Runs the paused tests (`PAUSED_TESTS` of `vite.config.ts`, and each unit test while all tests are paused) for information. A path runs only its file. No check runs them, but the typecheck and the lint read them. `--base <ref>` runs a copy of the commit beside the working tree, prints only the failures that come on the working tree alone, and then exits with 1. Details: `tools/test-paused.ts`. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time (design 9.3). Each one compares a work with a reference work in the same run, so a heavy load can make it fail. |
| `pnpm test:e2e [--project=chromium]` | Runs the Playwright tests of `e2e/*.e2e.ts` on the built site in Chromium, Firefox, and WebKit. The smoke test of design 9.3 plays the default demo for 4 s, and checks the song time, the canvas, the errors, and the requests. Run `pnpm build` first. Set `ZOOPHONY_E2E_PORT` to a free port (4182 by default, as in CI). |
| `pnpm smoke` | Runs the smoke test on the Vite dev server in headless Chromium, with the checks that need the dev hook: the bow arm of a violin and the camera modes. |
| `pnpm frame [--demo=<id>] [--free] [--scale=<n>] [--max-cpu=<percent>] [--wait=<s>] [--no-metal] [--gpu-only] [--keep=<dir>] [--headed]` | Measures the frame target of design 9.7 on the development Mac (paused since 2026-10-14). It plays `perf-60.mid` in Google Chrome at 1440 × 900, waits until the CPU use is at most 40%, records the main thread at 60 fps, and records the GPU with no frame cap in a Metal System Trace. It prints p50, p95, the max, and the share of the frames within 4 ms, with a self-check of the GPU frames. It exits with 1 on a failed target row and with 2 on a refused run. About 3 minutes. Details: `tools/measure-frame.ts`. |
| `tools/check-commits.sh [--tip] [--no-cache] <base>` | Checks each commit of `<base>..HEAD` with `git rebase --exec`, from a copy of the script. A code commit runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the tests that its changes reach. A docs commit runs `pnpm format:check` and the tests that read a docs path. `--tip` also runs the full `pnpm test` on the last commit. A cache by tree (`check-cache/` in the common folder of git) keeps each passed result, and the script prints `hit` or the time of each check. `--no-cache` reads no entry. It refuses a working tree with changes and a range with a merge commit. A failure or a stop aborts its rebase. |
| `tools/merge-branch.sh [--check-only] <branch> [worktree]` | Rebases `<branch>` onto `main`, checks each commit with `tools/check-commits.sh main`, checks that the hashes did not change, and runs the full `pnpm test` on the last commit. A branch with code then runs `pnpm build`, `pnpm size`, and the Chromium end-to-end tests (skipped while all tests are paused, `MERGE_E2E=1` runs them). Then it fast-forwards `main`, and removes the worktree and the branch. At the first failure, it stops and keeps them. `--check-only` does not merge. Run it from the main worktree, with `main` checked out. Details: the head of the script. |
| `tools/decision-rows.sh [--diff <base>] [<term>...]` | Prints each table row of `docs/decisions/*.md` that holds a term, with the file and the line. With `--diff <base>`, the identifiers and the string literals that `<base>..HEAD` removes outside `docs/` are terms too. A person reads the list. |
| `tools/break-test.sh '<perl expr>' <file> <test files>...` | Applies one temporary break to a tracked `<file>` with no changes, prints the diff of the break, runs the test files, restores the file (also after a failure and after Ctrl-C), and prints each test that fails, or "No test fails". It exits with 0 when a test fails, 1 when no test fails, 2 for a refused call, and 130 after Ctrl-C. Run it from the root of the worktree. |

## CI

CI (`.github/workflows/ci.yml`) runs `pnpm install`, `pnpm typecheck`, `pnpm lint`,
`pnpm format:check`, `pnpm test`, `pnpm test:perf`, `pnpm build`, and `pnpm size`. It runs
`pnpm test:e2e` in one job for each browser, and only the Chromium job blocks a merge (design
9.2). While all tests are paused, the step of `pnpm test:perf`, the job of `pnpm test:e2e`, and the
end-to-end test of the Pages workflow have `if: false`. `.github/workflows/pages.yml` deploys the
site to GitHub Pages under `/zoophony/` after CI passes on `main`. The other commands are local.
