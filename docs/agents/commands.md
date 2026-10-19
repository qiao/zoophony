# Commands

This module of `AGENTS.md` lists the commands of the repository and the checks of CI. Use Node 24
or later, and pnpm from the `packageManager` field of `package.json`.

Each row gives the essence of a command. The head comment of its tool file gives the details and
each option: `tools/<name>.ts` for `pnpm <name>`, unless the row names another file. `--help`
prints only a one-line usage text.

## Shared options

- **`--set <changes>`.** One variant of a hold in memory, with its changes separated by `;`, such
  as `piano.lean=16deg`. The root `<instrument>@<species>` changes the own hold of one species
  (`SPECIES_HOLDS` of `pose/bowed-rig.ts`, `SPECIES_WIND_HOLDS` of `pose/winds.ts`), such as
  `violin@rabbit.lean=12deg`. The root of an instrument (`violin`) changes the hold that the
  species share, and the tool names the other paths that move with it. A list of numbers takes
  `-1,0,0` or `[-1,0,0]`, and a turn of a wind hold also takes `holdTurn(<x>,<z>)` in degrees. A
  text takes a member of the union of its field, such as `timpani.hands=sides`, and an object, a
  list, or `null` takes JSON text with the keys of the old value. The root `<species>` changes
  an instrument scale, such as `mouse.oboeScale=0.62`. Code: `tools/hold-sets.ts`.
- **`--base <ref>`.** Runs a commit, a branch, or a tag beside the working tree, each in a child
  process with its own tools (`probeBeside()` of `tools/ref-tree.ts`), and prints a compare. A
  role that the commit does not have stops the run. Two JSON formats compare only when the newer
  format only adds fields. The JSON of the commit goes into a cache by tree (`probe-cache/` in the
  common folder of git): a hit prints `base: cached`, and `PROBE_NO_CACHE=1` runs the commit
  again.
- **`--glb <file>`.** Gives the animal the studio body that the export makes from another GLB
  file, in a copy of `src/` (`tools/glb-swap.ts`). `ANIMALS` and `src/` do not change. A species
  with no studio body takes the body when `tools/mesh-rigs/<species>.json` exists.
- **Image tools.** The tools of the table "Images" build the site or start a dev server, and use
  headless Chromium with ANGLE on Metal (`pnpm exec playwright install chromium` one time). They
  stop their servers and browsers at the end. Do not edit the working tree while they build.

## Build and site

| Command | Action |
|---|---|
| `pnpm install` | Installs the dependencies. |
| `pnpm dev` | Writes the SF3 preset files into `public/sf/`, the changed demo files into `public/demos/` (design 8.3), and `perf/perf-60.mid`, then starts the Vite dev server. The model gallery is at `/gallery.html`, and the animal views at `/views.html` (design 7.1). `/#demo=<id>` shows another demo, such as `perf-60`. |
| `pnpm build` | Writes the same files, then builds the site into `dist/` with the third-party license file (design 7.3). `pnpm vite preview` serves `dist/`. `ZOOPHONY_BASE=/zoophony/` sets the base path of GitHub Pages (design 9.2). |
| `pnpm size [--base <ref>]` | Prints the gzip size of the first download after `pnpm build`, and fails above 1 MB (design 7.2). `--base <ref>` also builds the commit in a temporary folder (about 3 s), and prints both totals and the difference. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the paths of design 9.5 with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |

## Images

| Command | Action |
|---|---|
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load] [--shots]` | Writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900 and 390 × 844, the gallery pages, the animal views, and the sheet pages. The flags add the close views of the models, frames of play, the states of the UI, and each kind of camera shot. |
| `pnpm snapshot` | Saves the play frame of the default demo (1440 × 900, "Reset view", 3.5 s after a seek to 30 s) and a close view of each gallery model into `docs/snapshots/<commit date>-<short hash>/`, with a `README.md` of the commit. |
| `pnpm sheet-check <sheet> <dir>` | Compares a sheet page of `views.html` with its sheet in `docs/reference/` (design 7.1), as images. With a matte of `tools/sheet-mattes/` (`make_matte.py <id>.json` makes it), it also prints the silhouette IoU of each view. |
| `pnpm choir-check <dir>` | Puts the gallery penguin beside one penguin of each of the two newest reference images (design 4.4), as `choir-compare.png` and `.webp`. |
| `pnpm close-views <mode> <dir> [--url <url>] [--base <ref>]` | Writes images from the gallery into `<dir>`, with a grid of all cells. The modes: `<role>` (the moments and the views of a role of `ROLE_VIEWS`, with `--zoom`, `--elevation`, and `--scale` of the cell size), `lineup <species,...>` (side by side), `species <species,...>` (with `--views`, `--moment`, `--zoom`, and `--elevation`), `play` (a frame of `--demo` at `--time` for each `--camera`, the shot camera with `--cinematic`, or with `--shot <seat|species>` the first shot of the subject), and `batch` (the image set of a round, one build of each tree). `--base` puts the grid of the commit above the grid of the working tree, and `--pairs <view|cell,...> --crop <x>,<y>,<w>,<h>` adds a cropped pair of each named cell. `--url` renders a running site. A role: about 30 s. A batch: 90 s to 260 s. |
| `pnpm look-lab <dir> [--url <url>]`, `pnpm look-variants <file> --out <dir>` | Measure frames of `close-views play` against `orchestra-latest.png`: one tree, or each variant. 40 s each. |
| `pnpm keyboard` | Checks each control with the keyboard alone at 1440 × 900 and at 390 × 844 (design 9.5, step 6), as a Markdown table. It fails on a failed check. |

## Pose and body probes

These probes run with no build, and the source files do not change. The roles and their species
are in the table "Bodies and roles" of [`model-work.md`](model-work.md).

| Command | Action |
|---|---|
| `pnpm pose-probe <sheet> [--time <s>]... [--set <changes>]...` | Prints the posed elbow, wrist, and palm of each arm of a sheet pose (design 7.1), in head heights from each shoulder joint, and the direction of the tip of the instrument. Each `--set` prints one variant after the base. About 1 s. |
| `pnpm pose-depth <role> [--demo <id>]... [--soloist <species>] [--set <changes>]... [--bones <list>] [--into <list>] [--times <list>] [--gaps] [--targets] [--goal <cm>] [--base <ref>] [--json <file>] [--long]` | Runs the clearance sweep of a role over each demo with the role (design 9.3). It first prints the demos, the rows, and an estimated time, and refuses more than 5 `--set` rows with no `--demo` or `--long`. It prints the deepest point of each moving part in each obstacle with the share of the samples over the limit or `--goal`, the note-target errors, and the share of the targets within 5 mm, which `--targets` measures alone. A held instrument also gives the instrument in the body, with no limit. Each `--set` is one row of a table, and the base row comes from a cache by tree. `--gaps` adds the gaps of the head and the paws, and `--soloist` sweeps a standing soloist. `--base` marks `GROWS` in H. One row: 10 s to 5 minutes. |
| `pnpm hold-reach <species> [--instrument violin\|viola\|<wind>\|<percussion>] [--support chair\|stand] [--set <changes>]... [--size <scale>[,<scale>]...] [--glb <file>]` | Measures the reach of the arms against the instrument in the playing pose, with no idle motion (design 4.6). A violin or a viola gives the reached fingerboard (`stopRange`) and bow hair (`bowRange`), and the scale of the rule of a violin shop. A wind gives the reach of each palm to its grip, with a table of the spare reach of each variant, and the reached slide travel of a trombone (`slideReach`). Percussion gives the strikes within 5 mm (6 s). `--size` adds violin scales. Less than 1 s. |
| `pnpm hold-fit <role> [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--sets <set>,...] [--faces <n>] [--faces-of <list>] [--demo <id>\|all]... [--base <ref>]`, or `--scan` in place of `--sets`, `--faces`, and `--base` | Fits a hold of a role in one run (route 3). Each variant gives one row: the folds of `pnpm fold-probe`, the play folds of each face of `--faces-of`, the deepest point of each sample set of the sweep, the note-target errors, the mean play turns of each upper arm and paw, the instrument in the body, and, for a violin, the reach of `pnpm hold-reach`. The rest set adds the lap rest, with `OVER` at each missed goal (`tools/lap-rest.ts`). A wind role adds the spare reach of each grip. `--grid` adds up to 40 variants. `--sets lift,rest,lower` skips the play (5 s against 70 s), and `--scan` measures many rest variants of a lap rest or a wind hold on one rest sample. The default demos are `FIT_DEMOS`. |
| `pnpm fold-probe <role> [--demo <id>]... [--step <s>] [--faces <n>] [--turns <face>] [--set <changes>]... [--json <file> [--middles <faces>]] [--glb <file>] [--base <ref>]` | Counts the folded faces of the studio skin of a role over each demo with the role (design 4.4): faces whose posed normal is more than 90° from the bind normal. Each sample set (the rest, the play, and the lift) gives the share of the samples with a fold and the most folded faces by side. `--faces <n>` lists the faces that fold most, for a mesh rig with the source middle for `weights.rigid` (2 s of Blender). `--turns <face>` gives the arm turn of its folds, and `--base` marks the new and the gone faces. 10 s to 40 s, or 2 s for one demo. |
| `pnpm raise-fit <role> --faces <list> --side L\|R [--bone upper\|forearm\|hand] [--sets <set>,...] [--demo <id>]... [--step <s>] [--set <changes>]... [--json <file>] [--glb <file>]` | Fits one rule of `raise` of a mesh rig to the folds of the faces (route 3): the mean turn of each key of the arm over the folded samples of `--sets` (the play by default), the weights of some fades, a ready entry, and the free shapes of the body. `--json` writes the entry for `rig-mesh --set 'raise+=@<file>'`. A rule of a bent wrist turns 10° further. 15 s. |
| `pnpm body-probe [--out <file>] [--no-poses]`, `pnpm body-probe --compare <base.json> <new.json>`, or `pnpm body-probe --base <ref>` | Probes the rest joints and a mesh hash of each species on each support, of each player of the cast, and a hash of the poses of each player of each demo in four sample sets. With no `--out`, it prints a summary and the SHA-256 of the JSON. `--compare` and `--base` print each difference, and fail on it. About 6 s. |
| `pnpm shot-trace <demo> [--from <s>] [--to <s>] [--cameras] [--base <ref>]` | Prints the choice of the shot planner at each cut of a time range (design 5.6, `traceShots()` of `src/shots/prepare.ts`): the candidates that a rule drops, the scores of the others, and the refused cameras of each try by reason. `<demo>` is a demo or a chamber test file. Less than 1 s. |
| `pnpm light-probe [--look <JSON>] [--grid <spec>] [--goal <r>]` | Light on the players by row, and the lux for a goal. 1 s. |
| `pnpm docs-species <species> [--all]` | Prints each place of the docs checklist (section 8 of `docs/briefs/studio-body.md`) that does not name the species yet, or `not found`. `--all` also prints the places that name the species. It exits with 1 on a miss. Less than 1 s. |

## Rig tools

Blender 5.2 or later comes from the variable `BLENDER`, or from the path.

| Command | Action |
|---|---|
| `pnpm glb-init <species> <glb> [--force] [--preview <dir>]` | Starts a rigged GLB body (route 1, design 4.4). It copies the file with a README of its checksum to `assets/models/<species>/`, and proposes `tools/glb-bodies/<species>.json`. `--force` writes over a config. `--preview` also writes the images of `pnpm rig-body --preview`. |
| `pnpm rig-body <species> [--preview <dir>]` | Packs the rigged GLB body of a species with Blender into `src/models/rigged/<species>.ts` and the baked skin `<species>-skin.webp`, from `tools/glb-bodies/<species>.json`. `--preview` writes `skin.png` and `bones.png`. |
| `pnpm rig-mesh <animal> [--preview <dir>] [--check [--set <changes>]... [--roles <list>] [--step <s>] [--demo <id>]... [--faces <n>] [--watch <faces>] [--hold <changes>]... [--keep <dir>]]` | Rigs a textured mesh with no skeleton into a studio body GLB file with Blender (design 4.4), from `tools/mesh-rigs/<animal>.json`. `--preview` writes images. `--check` rigs into a temporary folder, and prints the reach factor, the size budgets, the seat, the standing error (limit 1 mm), the folds of each role, and the form against `main`. Each `--set` is one variant of the config: a new key takes JSON, such as `raise.1={...}`, `<path>+=<JSON>` adds to a list, and `@<file>` reads a value from a file, such as `raise+=@<file>`. A failed rig gives the last error line of Blender. `--roles`, `--step`, and `--demo` limit the probes, `--hold` changes the holds of the fold probes, and `--watch` gives the share of the samples in which each named face folds, paired by the nearest middle after a change of the faces, and `--keep` keeps each GLB file. It warns about a seat that the thighs set, an eye box over a dark patch, and a nose tip off the middle plane. One variant: 20 s to 75 s. |
| `pnpm mesh-options <animal> <dir> --size <label>=<head top>... [--legs <f>,...] [--arms <f>,...] [--instrument <id>] [--species <id>]` | Makes the mid-report of phase 1 of a mesh. It rigs each size (the standing skull top in meters) with each leg factor, and each arm factor at the last size and leg factor, as `pnpm rig-mesh --check` does. `<dir>/options.md` gives the measures of each variant, with the reach of the hold of `--instrument`, and the warnings of the rigs. `<dir>/options.png` shows the sizes, the arms, and the knees. About 7 s for each variant. |
| `pnpm studio-body <animal> [--inspect [--glb <file>]]` | Writes `src/models/studio/<animal>.ts` from the GLB file of the studio, or from `glb` of the entry of the animal in `ANIMALS`, with no Blender, scaled by the landmark of the animal. A seated role drops onto its seat. Run it after each change of the GLB file. `--inspect` prints the joints, the clips, and the arm lengths, and writes no file. |

## Tests and scripts

All tests are paused since 2026-10-16 ([`workflow.md`](workflow.md), "Tests").

| Command | Action |
|---|---|
| `pnpm test` | Runs the Vitest project `unit`: all tests except the speed tests and the paused tests (design 9.3). While all tests are paused (`ALL_TESTS_PAUSED` of `vite.config.ts`), it runs no test and passes. |
| `pnpm test:paused [--base <ref>] [<path>]...` | Runs the paused tests (`PAUSED_TESTS` of `vite.config.ts`, and each unit test while all tests are paused) for information. A path runs only its file. `--base <ref>` runs a copy of the commit beside the working tree, prints only the failures that come on the working tree alone, and then exits with 1. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time (design 9.3). A heavy load can make it fail. |
| `pnpm test:e2e [--project=chromium]` | Runs the Playwright tests of `e2e/*.e2e.ts` on the built site in Chromium, Firefox, and WebKit. The smoke test of design 9.3 plays the default demo for 4 s. Run `pnpm build` first. Set `ZOOPHONY_E2E_PORT` to a free port (4182 by default, as in CI). |
| `pnpm smoke` | Runs the smoke test on the Vite dev server in headless Chromium, with the checks that need the dev hook: the bow arm of a violin and the camera modes. |
| `pnpm frame [--demo=<id>] [--free] [--scale=<n>] [--max-cpu=<percent>] [--wait=<s>] [--no-metal] [--gpu-only] [--keep=<dir>] [--headed]` | Measures the frame target of design 9.7 on the development Mac (paused since 2026-10-14): `perf-60.mid` in Google Chrome, with a Metal System Trace of the GPU. It prints p50, p95, the max, and the share of the frames within 4 ms. About 3 minutes. Code: `tools/measure-frame.ts`. |
| `tools/check-commits.sh [--tip] [--no-cache] <base>` | Checks each commit of `<base>..HEAD` in a temporary worktree (about 2 s), so you can edit and commit during the run. A code commit runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the tests that its changes reach. A docs commit runs `pnpm format:check` and the tests that read a docs path. `--tip` also runs the full `pnpm test` on the last commit. A cache by tree keeps each passed result, and `--no-cache` reads no entry. It refuses a range with a merge commit, and exits with 4 when HEAD moves during the run. |
| `tools/merge-branch.sh [--check-only] <branch> [worktree]` | Rebases `<branch>` onto `main`, checks each commit with `tools/check-commits.sh main`, and runs the full `pnpm test` on the last commit. A branch with code then runs `pnpm build`, `pnpm size`, and the Chromium end-to-end tests (only with `MERGE_E2E=1` while all tests are paused). Then it fast-forwards `main`, and removes the worktree and the branch. At the first failure, it stops. `--check-only` does not merge. Run it from the main worktree on `main`. |
| `tools/decision-rows.sh [--diff <base>] [<term>...]` | Prints each table row of `docs/decisions/*.md` that holds a term, with the file and the line. With `--diff <base>`, the identifiers and the string literals that `<base>..HEAD` removes outside `docs/` are terms too. |
| `tools/break-test.sh '<perl expr>' <file> <test files>...` | Applies one temporary break to a tracked `<file>`, runs the test files, restores the file (also after Ctrl-C), and prints each test that fails. It exits with 0 when a test fails. |

## CI

CI (`.github/workflows/ci.yml`) runs `pnpm install`, `pnpm typecheck`, `pnpm lint`,
`pnpm format:check`, `pnpm test`, `pnpm test:perf`, `pnpm build`, and `pnpm size`, and
`pnpm test:e2e` in one job for each browser (design 9.2). While all tests are paused, the tests
of speed and the end-to-end tests have `if: false`. `.github/workflows/pages.yml` deploys the
site to GitHub Pages under `/zoophony/` after CI passes on `main`.
