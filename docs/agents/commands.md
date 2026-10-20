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
  species share, and the tool names the other paths that move. A list of numbers takes
  `-1,0,0` or `[-1,0,0]`, and a turn of a wind hold `holdTurn(<x>,<z>)` in degrees. A
  text takes a member of its union, and an object, a list, or `null` takes JSON text. The root `<species>` changes
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
| `pnpm dev` | Writes the SF3 presets into `public/sf/`, the changed demos into `public/demos/` (design 8.3), and `perf/perf-60.mid`, then starts the Vite dev server. The gallery is at `/gallery.html`, the animal views at `/views.html` (design 7.1), and a demo at `/#demo=<id>`. |
| `pnpm build` | Writes the same files, then builds the site into `dist/` with the third-party license file (design 7.3). `pnpm vite preview` serves `dist/`. `ZOOPHONY_BASE=/zoophony/` sets the base path of GitHub Pages (design 9.2). |
| `pnpm size [--base <ref>]` | Prints the gzip size of the first download after `pnpm build`, and fails above 1 MB (design 7.2). `--base <ref>` also builds the commit, and prints both totals and the difference. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the paths of design 9.5 with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |

## Images

| Command | Action |
|---|---|
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load] [--shots]` | Writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900 and 390 × 844, the gallery, the animal views, and the sheets. The flags add close views, play frames, UI states, and camera shots. |
| `pnpm snapshot` | Saves the play frame of the default demo (1440 × 900, 3.5 s after a seek to 30 s) and a close view of each gallery model into `docs/snapshots/<commit date>-<short hash>/`. |
| `pnpm sheet-check <sheet> <dir>` | Compares a sheet page of `views.html` with its sheet in `docs/reference/` (design 7.1). With a matte of `tools/sheet-mattes/`, it also prints the silhouette IoU of each view. |
| `pnpm choir-check <dir>` | Puts the gallery penguin beside a penguin of each of the two newest reference images (design 4.4). |
| `pnpm close-views <mode> <dir> [--url <url>] [--glb <file>] [--set <changes>]... [--base <ref>]` | Writes images and a grid into `<dir>`. The modes: `<role>` (the moments and views of `ROLE_VIEWS`, one grid for each `--probe`), `lineup <species,...>`, `species <species,...>`, `play` (a frame of `--demo` at each `--time`, more than one into `time-<s>/` from one build, for each `--camera`, the shot camera of `--cinematic`, the first shot of `--shot <seat\|species>`, or a camera at the player of `--at <seat\|species>` for each `--azimuth`, with `--zoom` and `--elevation`), and `batch` (the image set of a round, one build of each tree). `--base` adds the grid of the commit, and `--pairs <view\|cell,...> --crop <x>,<y>,<w>,<h>` a cropped pair of each cell. `--url` renders a running site. `--glb` (of `rig-mesh --keep`) and `--set` build a variant of a role, `--set` also of `play`, with each of more than one `--set` in `set-<n>/` from one build. A role: 30 s. A batch: 90 s to 260 s. |
| `pnpm look-lab <dir> [--url <url>]`, `pnpm look-variants <file> --out <dir>` | Measure frames of `close-views play` against `orchestra-latest.png`: one tree, or each variant. 40 s each. |
| `pnpm keyboard` | Checks each control with the keyboard alone at 1440 × 900 and 390 × 844 (design 9.5, step 6), and fails on a failed check. |

## Pose and body probes

These probes run with no build, and the source files do not change. The roles and their species
are in the table "Bodies and roles" of [`model-work.md`](model-work.md).

| Command | Action |
|---|---|
| `pnpm pose-probe <sheet> [--time <s>]... [--set <changes>]...` | Prints the posed elbow, wrist, and palm of each arm of a sheet pose (design 7.1), in head heights from each shoulder joint, and the tip direction of the instrument. Each `--set` prints one variant. About 1 s. |
| `pnpm pose-depth <role> [--demo <id>]... [--soloist <species>] [--set <changes>]... [--bones <list>] [--into <list>] [--times <list>] [--gaps] [--targets] [--goal <cm>] [--base <ref>] [--json <file>] [--long]` | Runs the clearance sweep of a role over its demos (design 9.3), after an estimate of its time. It refuses more than 5 `--set` rows with no `--demo` or `--long`. It prints the deepest point of each moving part in each obstacle (with its phase in the notes and the share of the samples over the limit or `--goal`), a held instrument in the body, and the note-target errors with the share within 5 mm (`--targets` alone). Each `--set` is one row, with the base row from a cache. `--gaps` adds the head and paw gaps, `--soloist` a standing soloist, and `--base` marks `GROWS` in H, with the deepest sample of the tree. One row: 10 s to 5 minutes. |
| `pnpm hold-reach <species> [--instrument violin\|viola\|<wind>\|<percussion>] [--support chair\|stand] [--set <changes>]... [--size <scale>[,<scale>]...] [--glb <file>]` | Measures the reach of the arms against the instrument in the playing pose, with no idle motion (design 4.6). A violin or a viola gives the reached fingerboard (`stopRange`), the bow hair (`bowRange`), and the scale of a violin shop. A wind gives the spare reach of each palm to its grip, and the slide travel of a trombone (`slideReach`). Percussion gives the strikes within 5 mm (6 s). Less than 1 s. |
| `pnpm hold-fit <role> [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--sets <set>,...] [--faces <n>] [--faces-of <list>] [--demo <id>\|all]... [--technique <t>] [--base <ref>]`, or `--scan` in place of `--sets`, `--faces`, and `--base` | Fits a hold of a role in one run (route 3). Each variant gives one row: the folds and the faces that fold most, the deepest point of each sample set, the note-target errors, the mean play turns of each upper arm and paw, the instrument in the body, and the reach of a violin. The rest set adds the lap rest (`tools/lap-rest.ts`), and a wind role the spare reach of each grip. `--grid` adds up to 40 variants. `--sets lift,rest,lower` skips the play (5 s against 70 s), and `--scan` measures rest variants on one sample. `--technique pizzicato` counts only the play samples of that technique. The default demos are `FIT_DEMOS`, or the one demo with the most notes of a role that they do not have. |
| `pnpm fold-probe <role> [--demo <id>]... [--step <s>] [--faces <n>] [--turns <face>] [--bins <face>] [--set <changes>]... [--json <file> [--middles <faces>]] [--glb <file>] [--base <ref> [--faces-of <faces>]]` | Counts the folded faces of the studio skin of a role over each demo with the role (design 4.4): faces whose normal turns more than 90° from its bind normal. Each sample set gives the share of the samples with a fold. `--faces <n>` lists the faces that fold most, with their middles for `weights.rigid`. `--turns <face>` gives the arm turn of its folds, and `--bins <face>` its folds by the turn of each arm bone. `--base` marks the new and the gone faces, and `--faces-of` pairs named faces of the commit with folded faces of the tree. 10 s to 40 s. |
| `pnpm arm-shape <role> [--demo <id>]... [--step <s>] [--set <changes>]... [--body upperTwist=<share>] [--rings] [--glb <file>] [--json <file>]` | Measures the arm skin in the samples of `pnpm fold-probe`: the twist along the upper arm, the flat and girth shares of four rings, and the shoulder spikes. `--body` sets a body rule in memory. 25 s to 55 s. |
| `pnpm arm-check <role>... \| --all [--base <ref>] [--set <changes>]... [--glb <file>] [--views <dir> [--views-all]] [--demo <id>]... [--step <s>] [--jobs <n>] [--long] [--states <ref>,...]`, or `<role> --trace <demo>:[lift]<from>-<to> [--step <s>] [--set <changes>]...`, or `<role> --explain stretch\|flat` | The arm gate (`2026-10-19-arm-gate.md`): the measures of `ARM_LIMITS` for each arm over the fold samples. Each value gives p50, p95, the worst demo and time, and a verdict against `ARM_LIMITS` and the base: `FAIL` (exit code 1), `OPEN`, or `PASS`. A cache by tree keeps each role of the working tree (`tree: cached`). `--views` writes 2x crops of the worst sample, a strike, and a rest. `--states` runs this gate on old commits, one column each. `--trace` prints the paw angles of each arm at steps of 0.01 s, with no sweep (1 s). `--explain` gives each value of a measure from the rest and from the bind, `MOVES` where the rest adds stretch, and the worst edges or rings with their bones (30 s). All roles: 2.5 minutes cold, 2 s from the cache. |
| `pnpm raise-fit <role> --faces <list> --side L\|R [--bone upper\|forearm\|hand] [--sets <set>,...] [--demo <id>]... [--step <s>] [--set <changes>]... [--json <file>] [--glb <file>]` | Fits one rule of `raise` of a mesh rig to the folds of the faces (route 3): the mean turn of each key of the arm over the folded samples of `--sets` (the play by default), and a ready entry. `--json` writes the entry for `rig-mesh --set 'raise+=@<file>'`. A rule of a bent wrist turns 10° further. 15 s. |
| `pnpm body-probe [--out <file>] [--no-poses]`, `pnpm body-probe --compare <base.json> <new.json>`, or `pnpm body-probe --base <ref>` | Probes the rest joints and a mesh hash of each species on each support and of each player, and a hash of the poses of each player of each demo in four sample sets. With no `--out`, it prints a summary and the SHA-256 of the JSON. `--compare` and `--base` print each difference, and fail on it. About 6 s. |
| `pnpm shot-trace <demo> [--from <s>] [--to <s>] [--cameras] [--base <ref>]` | Prints the choice of the shot planner at each cut of a time range (design 5.6, `traceShots()`): the dropped candidates, the scores of the others, and the refused cameras by reason. `<demo>` is a demo or a chamber test file. Less than 1 s. |
| `pnpm light-probe [--look <JSON>] [--grid <spec>] [--goal <r>]` | Light on the players by row, and the lux for a goal. 1 s. |
| `pnpm docs-species <species> [--all]` | Prints each place of the docs checklist (section 8 of `docs/briefs/studio-body.md`) that does not name the species yet, or `not found`. It exits with 1 on a miss. Less than 1 s. |

## Rig tools

Blender 5.2 or later comes from the variable `BLENDER`, or from the path.

| Command | Action |
|---|---|
| `pnpm glb-init <species> <glb> [--force] [--preview <dir>]` | Starts a rigged GLB body (route 1, design 4.4). It copies the file with a README of its checksum to `assets/models/<species>/`, and proposes `tools/glb-bodies/<species>.json`. `--force` writes over a config, and `--preview` writes the images of `pnpm rig-body --preview`. |
| `pnpm rig-body <species> [--preview <dir>]` | Packs the rigged GLB body of a species with Blender into `src/models/rigged/<species>.ts` and the baked skin `<species>-skin.webp`, from `tools/glb-bodies/<species>.json`. `--preview` writes `skin.png` and `bones.png`. |
| `pnpm rig-mesh <animal> [--preview <dir>] [--check [--set <changes>]... [--roles <list>] [--step <s>] [--demo <id>]... [--faces <n>] [--watch <faces>] [--hold <changes>]... [--keep <dir>]]` | Rigs a textured mesh with no skeleton into a studio body GLB file (design 4.4), from `tools/mesh-rigs/<animal>.json`. `--preview` writes images. `--check` rigs into a temporary folder, and prints the reach, the budgets, the seat, the standing error, the folds of each role, and the form against `main`. Each `--set` is one variant of the config: JSON for a new key (`raise.1={...}`), `<path>+=<JSON>` to add to a list, and `@<file>` for a value from a file. `--watch` gives the fold share of named faces, and `--keep` keeps each GLB file. The last column gives the faces that each `raise` shape leaves turned, with `FAIL` for a failed relax. 20 s to 75 s. |
| `pnpm mesh-options <animal> <dir> --size <label>=<head top>... [--legs <f>,...] [--arms <f>,...] [--instrument <id>] [--species <id>]` | Makes the mid-report of phase 1 of a mesh. It rigs each size (the standing skull top in meters) with each leg factor, and each arm factor, as `pnpm rig-mesh --check` does. `<dir>/options.md` gives the measures and the warnings of each variant. About 7 s for each variant. |
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
| `pnpm frame [--demo=<id>] [--free] [--scale=<n>] [--max-cpu=<percent>] [--wait=<s>] [--no-metal] [--gpu-only] [--keep=<dir>] [--headed]` | Measures the frame target of design 9.7 on the development Mac (paused since 2026-10-14): `perf-60.mid` in Google Chrome with a Metal System Trace. About 3 minutes. Code: `tools/measure-frame.ts`. |
| `tools/check-commits.sh [--tip] [--no-cache] <base>` | Checks each commit of `<base>..HEAD` in a temporary worktree, so you can edit and commit during the run. A code commit runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the tests that it reaches, and a docs commit the format check. `--tip` also runs the full `pnpm test` on the last commit. A cache by tree keeps each passed result, and `--no-cache` reads no entry. It refuses a range with a merge commit, and exits with 4 when HEAD moves during the run. |
| `tools/merge-branch.sh [--check-only] [--no-arm-check] <branch> [worktree]` | Rebases `<branch>` onto `main`, checks each commit with `tools/check-commits.sh main`, and runs the full `pnpm test`. A change of `src/pose/`, `src/models/`, or `tools/blender/` runs `pnpm arm-check --all --base main`, and a `FAIL` stops the merge (`--no-arm-check` skips it, with the reason in the report). Code then runs `pnpm build` and `pnpm size` (end-to-end tests only with `MERGE_E2E=1`). Then it fast-forwards `main`, and removes the worktree and the branch. It stops at the first failure. `--check-only` does not merge. Run it from `main` in the main worktree. |
| `tools/decision-rows.sh [--diff <base>] [<term>...]` | Prints each row of `docs/decisions/*.md` that holds a term. With `--diff <base>`, the identifiers and strings that `<base>..HEAD` removes outside `docs/` are terms too. |
| `tools/break-test.sh '<perl expr>' <file> <test files>...` | Applies one temporary break to a tracked `<file>`, runs the test files, restores the file (also after Ctrl-C), and prints each test that fails. It exits with 0 when a test fails. |

## CI

CI (`.github/workflows/ci.yml`) runs `pnpm install`, `pnpm typecheck`, `pnpm lint`,
`pnpm format:check`, `pnpm test`, `pnpm test:perf`, `pnpm build`, and `pnpm size`, and
`pnpm test:e2e` in one job for each browser (design 9.2). While all tests are paused, the tests
of speed and the end-to-end tests have `if: false`. `.github/workflows/pages.yml` deploys the
site to GitHub Pages under `/zoophony/` after CI passes on `main`.
