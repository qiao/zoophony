# Commands

This module of `AGENTS.md` lists the commands of the repository and the checks of CI. Use Node 24
or later, and pnpm from the `packageManager` field of `package.json`.

Each row gives the essence of a command. The head comment of its tool file gives the details and
each option: `tools/<name>.ts` for `pnpm <name>`, unless the row names another file. `--help`
prints only a one-line usage text.

## Shared options

- **`--set <changes>`.** One variant of a hold in memory, with its changes separated by `;`, such
  as `piano.lean=16deg`. The root `<instrument>@<species>` changes the own hold of one species,
  such as `violin@rabbit.lean=12deg`. The root of an instrument (`violin`) changes the shared hold,
  and the tool names the other paths that move. The root `<species>` changes an instrument scale,
  a cymbal form, or a tuba pipe, such as `mouse.oboeScale=0.62`. The roots `choir`, `choirMotion`,
  and `folder` change the singer. A list of numbers takes `-1,0,0`, a wind hold turn takes
  `holdTurn(<x>,<z>)`, and an object or `null` takes JSON text. Code: `tools/hold-sets.ts`.
- **`--base <ref>`.** Runs a commit, a branch, or a tag beside the working tree, each in a child
  process with its own tools (`probeBeside()` of `tools/ref-tree.ts`), and prints a compare. A role
  that the commit does not have stops the run. The JSON of the commit goes into a cache by tree
  (`probe-cache/` in the common folder of git): a hit prints `base: cached`, and `PROBE_NO_CACHE=1`
  runs the commit again.
- **`--glb <file>`.** Gives the animal the studio body of another GLB file, in a copy of `src/`
  (`tools/glb-swap.ts`). `ANIMALS`, `assets/`, and `src/` do not change, also after Ctrl-C. Thus a
  file of `rig-mesh --check --keep` needs no copy and no `pnpm studio-body`.
- **`--midi <path>`.** A MIDI file of the user, read from its path. No tool copies it into the
  repository. In `pose-depth`, `hold-fit`, `arm-check`, and `clip-probe`, it is one more `--demo`.
- **Image tools.** The tools of the table "Images" build the site or start a dev server, and use
  headless Chromium with ANGLE on Metal (`pnpm exec playwright install chromium` one time). They
  stop their servers and browsers at the end. Do not edit the working tree while they build.

## Build and site

| Command | Action |
|---|---|
| `pnpm install` | Installs the dependencies. |
| `pnpm dev` | Writes the SF3 presets into `public/sf/`, the changed demos into `public/demos/` (design 8.3), and `perf/perf-60.mid`, then starts the Vite dev server. The gallery is at `/gallery.html`, the animal views at `/views.html` (design 7.1), and a demo at `/#demo=<id>`. |
| `pnpm build` | Writes the same files, then builds the site into `dist/` with the third-party license file (design 7.3). It gzips the preset and demo files of `dist/` in place, and writes their gzip sizes into `dist/sf/index.json` (design 7.2). `pnpm vite preview` serves `dist/`. `ZOOPHONY_BASE=/zoophony/` sets the base path of GitHub Pages. |
| `pnpm size [--base <ref>]` | Prints the gzip size of the first download after `pnpm build`, and fails above 1 MB (design 7.2). `--base` also builds the commit, and prints both totals and the difference. |
| `pnpm load-probe [--phone] [--repeat] [--base <ref>] [--profile] [--runs <n>] [--out <file>]` | Measures the load of the default demo after `pnpm build`: FCP, LCP, the first frame, the time until it is ready to play, the blocking time, and the bytes, as the median of the runs. `--phone` gives Fast 4G and a 4x CPU throttle, `--repeat` a second visit with the HTTP cache, and `--profile` a CPU profile with no minify. It runs through `tools/measure-lock.sh`. About 10 s for each desktop run. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the source paths with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |

## Images

| Command | Action |
|---|---|
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load] [--shots]` | Writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900 and 390 × 844, the gallery, the animal views, and the sheets. The flags add close views, play frames, UI states, and camera shots. |
| `pnpm snapshot` | Saves the play frame of the default demo and a close view of each gallery model into a folder of the commit. |
| `pnpm sheet-check <sheet> <dir>` | Compares a sheet page of `views.html` with its sheet in `docs/reference/` (design 7.1). With a matte of `tools/sheet-mattes/`, it also prints the silhouette IoU of each view. |
| `pnpm choir-check <dir>` | Puts the gallery penguin beside a penguin of each of the two newest reference images. |
| `pnpm close-views <role> <dir> [--moments <list>] [--views <list>] [--probe <p>] [--lineup] [--sheet] [--base <ref>] [--glb <file>] [--set <changes>]...` | Writes the moments and the views of `ROLE_VIEWS` of a role, and a grid. `--moments` takes a share of a move, such as `lift30`. `--lineup` gives a row of the base, the tree, and each `--with` role for each view (front, back, left, right). `--base --sheet` writes the moments as columns with the base row above the tree row, cut to `--box` (2x with `--scale 2`). `--target head` gives 3x face crops. Each `--set` goes into `set-<n>/`. Each close view has a fill light from the camera. 25 s to 45 s. |
| `pnpm close-views <mode> <dir> ...` | The other modes: `lineup <species,...>`, `species <species,...>`, `batch` (the image set of a round, 90 s to 260 s), and `play`. `play` renders `--demo` or `--midi` at each `--time` or `--strip <from>:<step>:<count>`, for each `--camera` (a name, a drag, or JSON), `--camera-file <json>` (labels mapped to cameras), `--cinematic`, `--shot <seat>`, or `--at <seat\|species[:instrument]>` with `--azimuth`, `--zoom`, and `--elevation`. `--pause` renders the rest pose. `--base` adds the commit as a grid, pairs, or strip pairs. |
| `pnpm close-views audit <dir> [--roles <role,...>] [--base <ref>]` | The audit sheet of the seams: each moment of each role from the back, az150, az-150, the front, and each side, at the camera heights 20° and 40°, as 2x crops of the arms and the upper trunk, with the commit above the tree. It writes `<dir>/<role>-e20.png` and `<role>-e40.png`. All roles with no base: about 27 minutes. |
| `pnpm look-lab <dir> [--url <url>]`, `pnpm look-variants <file> --out <dir>` | Measure frames of `close-views play` against `orchestra-latest.png`: one tree, or each variant. 40 s each. |
| `pnpm keyboard` | Checks each control with the keyboard alone at 1440 × 900 and 390 × 844, and fails on a failed check. |

## Sound

| Command | Action |
|---|---|
| `pnpm loudness [--demo <id>]... [--fit] [--target <LUFS>]... [--json] [--check]` | Renders each demo in Node, then sends it through `output-chain.ts` in headless Chromium (design 6.8). It prints the loudness measures and the gain reduction of the limiter. `--fit` gives the value of `DEMO_LOUDNESS` for `TARGET_LOUDNESS`. `--check` fails above 0.5 LU from the target or above -1 dBTP. About 25 s for each demo. |

## Pose and body probes

These probes run with no build, and the source files do not change. They read the demos and the
percussion test score of `tools/probe-demos.ts`. The roles are in the table "Bodies and roles" of
[`rigging.md`](rigging.md).

| Command | Action |
|---|---|
| `pnpm pose-probe <sheet> [--time <s>]... [--set <changes>]...` | Prints the posed elbow, wrist, and palm of each arm of a sheet pose (design 7.1), in head heights from each shoulder joint, and the tip direction of the instrument. About 1 s. |
| `pnpm pose-depth <role> [--demo <id>]... [--soloist <species>] [--set <changes>]... [--per-bone] [--every <n>] [--gaps] [--targets] [--goal <cm>] [--base <ref>] [--glb <file>]`, or `<role> --where <bone> <demo>:<time>` | The clearance sweep of a role (design 9.3): the deepest point and the share over the limit of each moving part in each obstacle, a held instrument in the body, and the note-target errors (`--targets`). A `--set` is one row. `--per-bone` splits the arm groups, `--every <n>` takes each n-th play sample, `--gaps` adds the gaps, and `--base` marks `GROWS`. `--where` gives the corners of a bone in the axes of the instrument. 10 s to 5 minutes. |
| `pnpm hold-scan <role> [--set <changes>] [--grid <path>=<a>:<b>:<step>]... [--move <axis>=<a>:<b>:<step>]...` | Scores hold variants on 12 play samples and the rest of one demo: the grids, and moves of a bowed instrument around its end. A row gives the depth of each arm bone and the instrument, the reached fingerboard and hair, and a score of the cm past the limits. 0.15 s for each variant. |
| `pnpm pair-scan <role> --pairs <set>:<part>:<obstacle>,... [--every <n>] [--at <demo>@<time>]... [--variant <name>=<changes>]...` | Scores the base and named variants on chosen pairs, such as `lower:upper arms:body`: the deepest point, the share over the limit, and its sample. About 10 s for each demo and row with `--every 4`. |
| `pnpm trunk-form <role> [--sets <set>,...] [--from <f>] [--to <f>] [--base <ref>]` | Measures the trunk of the first player in the bind and the worst pose of each set: the gap to the convex hull, the dents over 2 mm, the largest turn between cuts, and the angles between light faces. 1 s. |
| `pnpm hold-reach <species> [--instrument <id>] [--support chair\|stand] [--set <changes>]... [--size <scale>]... [--glb <file>]` | Measures the reach of the arms to the instrument in the playing pose (design 4.6). A violin or a viola gives the reached fingerboard, the bow hair, and the scale of a violin shop. A wind gives the spare reach of each palm to its grip, and the slide travel of a trombone. Percussion gives the strikes within 5 mm. Less than 1 s. |
| `pnpm hold-fit <role> [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--sets <set>,...] [--faces <n>] [--demo <id>\|all]... [--technique <t>] [--base <ref>] [--glb <file>]`, or `--scan` | Fits a hold of a role. Each variant is one row: the folds, the deepest point of each sample set, the note-target errors, the mean play turns of the arms, the instrument in the body, the lap rest, and the spare reach of a grip. `--grid` adds up to 40 variants, and `--scan` measures rest variants on one sample. The default demos are `FIT_DEMOS`. |
| `pnpm wind-grip <role>... [--every <n>] [--set <changes>]... [--lines]` | Measures each paw on its tube on the studio skin over the play, the lift, the rest, and the lowering: the gaps of the skin and the tips, the axis distance, the palm angle, and the side. A paw grasps when its tips touch, its palm faces the tube, and it is on the side of the technique. Roles: the winds but the horn, the percussion, `fox-violinist`, and `violist`. About 3 s each. |
| `pnpm fold-probe <role> [--step <s>] [--faces <n>] [--turns <face>] [--bins <face>] [--set <changes>]... [--json <file>] [--glb <file>] [--base <ref>]` | Counts the folded faces of the studio skin of a role: faces whose normal turns more than 90° from the bind, as the share of the samples of each set. `--faces <n>` lists the faces that fold most, with their middles for `weights.rigid`. `--turns` and `--bins` give the arm turns of the folds of a face. `--base` marks the new and the gone faces. 10 s to 40 s. |
| `pnpm arm-look <role>... \| --all [--set <changes>]... [--glb <file>]` | Measures the arm skin against the source mesh over the play: the share of the upper arm edges whose fold angle changes by more than 40° (a crumpled skin), and the axis ratio of the mid upper arm (a flat plank). The limits come from the red fox. A value over a limit is `FAIL`. About 50 s for each role. |
| `pnpm arm-shape <role> [--set <changes>]... [--rings] [--glb <file>]` | Measures the twist along the upper arm, the flat and girth shares of four rings, and the shoulder spikes in the samples of `pnpm fold-probe`. 25 s to 55 s. |
| `pnpm arm-check <role>... \| --all [--base <ref>] [--set <changes>]... [--variant <name>]... [--glb <file>] [--views <dir>] [--states <ref>,...]`, `<role> --trace <demo>:<from>-<to>`, or `<role> --explain stretch\|flat` | The arm gate (design 4.4): the `ARM_LIMITS` of each arm over the fold samples, and the paw twist and the wrist turn rate of the lifts and the lowerings. Each value gives p50, p95, the worst demo and time, and `FAIL` (exit code 1), `OPEN`, or `PASS`. A role with no `ACCEPTED_GRIPS` entry gets a ready entry. Each `--variant` runs in one child. `--views` writes 2x crops. `--states` gives a column for each old commit. All roles: 5 to 7 minutes cold, 2 s from the cache. |
| `pnpm carry-check <role,...> [--set <changes>] [--base <ref>]` | Measures the carry of the violin or the viola in the left paw over each lift and lowering at steps of 0.01 s: the fast steps in which the instrument and the paw turn in opposite senses, the largest angle between their axes, and the largest turn of the instrument in the paw. Three roles: 45 s. |
| `pnpm raise-fit <role> --faces <list> --side L\|R [--bone upper\|forearm\|hand] [--sets <set>,...] [--json <file>] [--glb <file>]` | Fits one rule of `raise` of a mesh rig to the folds of the faces: the mean turn of each key of the arm over the folded samples, and a ready entry. `--json` writes it for `rig-mesh --set 'raise+=@<file>'`. 15 s. |
| `pnpm body-probe [--out <file>]`, `--compare <base.json> <new.json>`, or `--base <ref>` | Probes the rest joints and a mesh hash of each species and player, and a hash of the poses of each player of each demo. `--compare` and `--base` print each difference, and fail on it. About 6 s. |
| `pnpm beat-rates [--demo <id>]... [--limit <bpm>] [--base <ref>]`, or `--trace <from>-<to> [--player <n>]` | Prints the rate of each beat or note motion over a song (design 5.1, 5.4), and fails above 2 s over `--limit` or a conducted beat of 168. `--trace` prints the spine sway of one player at steps of 0.01 s. 3 s for each demo. |
| `pnpm clip-probe [--demo <id>]... [--jobs <n>] [--set <changes>]... [--variant <name>]... [--base <ref>]` | Finds the clips of all players over the whole song: overlapped seats, a paw in the other paw, a mallet across the other hand, a part in its own instrument, an instrument under the floor, and a part in a near player. A measure clips above 1% of the samples. One file of 1 minute: 6 s. All demos with `--base`: about 8 minutes. |
| `pnpm shot-trace <demo> [--from <s>] [--to <s>] [--cameras] [--base <ref>]` | Prints the choice of the shot planner at each cut (design 5.6): the dropped candidates, the scores, and the refused cameras. Less than 1 s. |
| `pnpm light-probe [--look <JSON>] [--grid <spec>] [--goal <r>]` | Light on the players by row, and the lux for a goal. 1 s. |

## Rig tools

Blender 5.2 or later comes from the variable `BLENDER`, or from the path.

| Command | Action |
|---|---|
| `pnpm rig-mesh <animal> [--preview <dir>] [--check [--set <changes>]... [--roles <list>] [--faces <n>] [--watch <faces>] [--hold <changes>]... [--keep <dir>]]` | Rigs a textured mesh into a studio body GLB file from `tools/mesh-rigs/<animal>.json` (design 4.4). `--check` rigs into a temporary folder, and prints the reach, the budgets, the seat, the standing error, the folds and the tail gaps of each role, the arm joins (`tools/arm-gap.ts`), and the dark faces with a fix. Each `--set` is one variant: JSON for a new key, `<path>+=<JSON>` to add to a list, and `@<file>` for a file. `--keep` keeps each GLB file. Run `pnpm studio-body <animal>` after each write. 20 s to 75 s. |
| `blender -b --factory-startup --python tools/blender/arm_root.py -- tools/arm-roots/<species>.json [--out <file.glb>] [--edits <JSON list>]` | Writes a copy of a source mesh with local edits at the arm root: `flip`, `fair`, `smooth`, `hull`, `push`, and `split`. `--edits` replaces the list for a variant. Rig the copy with `pnpm rig-mesh <animal> --check --set source=<path> --keep <dir>`. A run gives the same bytes. 5 s. |
| `pnpm mesh-options <animal> <dir> --size <label>=<head top>... [--legs <f>,...] [--arms <f>,...] [--instrument <id>]` | Makes the mid-report of a mesh. It rigs each size, leg factor, and arm factor, as `rig-mesh --check` does, and writes the measures and the warnings into `<dir>/options.md`. About 7 s for each variant. |
| `pnpm studio-body <animal> [--inspect [--glb <file>]]` | Writes `src/models/studio/<animal>.ts` from `glb` of `ANIMALS`, with no Blender, scaled by the landmark of the animal. A seated role drops onto its seat. `--inspect` prints the joints, the clips, and the arm lengths, and writes no file. |

## Tests and scripts

All tests are paused ([`workflow.md`](workflow.md), "Tests").

| Command | Action |
|---|---|
| `pnpm test` | Runs the Vitest project `unit` (design 9.3). While all tests are paused (`ALL_TESTS_PAUSED` of `vite.config.ts`), it runs no test and passes. |
| `pnpm test:paused [--base <ref>] [<path>]...` | Runs the paused tests. A path runs only its file. `--base <ref>` runs a copy of the commit beside the working tree, and prints only the failures of the working tree. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time. A heavy load can make it fail. |
| `pnpm test:e2e [--project=chromium]` | Runs the Playwright tests of `e2e/*.e2e.ts` on the built site. Run `pnpm build` first. Set `ZOOPHONY_E2E_PORT` to a free port (4182 by default, as in CI). |
| `pnpm smoke` | Runs the smoke test on the Vite dev server in headless Chromium, with the checks that need the dev hook: the bow arm of a violin and the camera modes. |
| `pnpm frame [--demo=<id>] [--free] [--max-cpu=<percent>] [--gpu-only] [--keep=<dir>]` | Measures the frame target of design 9.7 on the development Mac: `perf-60.mid` in Google Chrome with a Metal System Trace. About 3 minutes. Code: `tools/measure-frame.ts`. |
| `pnpm frozen [--base <ref>] [--shots <list>] [--out <dir>] [--tree <dir>]` | Renders the four frozen shots (song time and wall time held) into `<out>/tree/`. With `--base`, it renders the commit too and prints the difference of each shot. It exits with 1 when a pixel changed. Run it after a cut that must keep the look. About 2 minutes. |
| `pnpm cpu-profile [--demo <id>] [--seek <s>] [--sec <n>] [--top <n>] [--in <file>] [--callers <function>[:<line>]]` | Profiles the main thread during play and prints the self time and the total time of the top functions for each frame. `--callers` sums the time of a function by its callers. About 20 s. |
| `pnpm frame-compare <ref\|patch>... [--runs <n>] [--gate <load>] [-- <flags of pnpm frame>]` | Measures `pnpm frame` on each commit, or on `HEAD` with each `.patch` file, in temporary trees, in turns through `tools/measure-lock.sh`. It prints the median of the main thread, the GPU row, and the frame rate with no cap, and the frozen shots against the first item. About 5 minutes for each run of an item. |
| `tools/check-commits.sh [--tip] [--no-cache] <base>` | Checks each commit of `<base>..HEAD` in a temporary worktree: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the tests that a code commit reaches. `--tip` also runs the full `pnpm test` on the last commit. A cache by tree keeps each passed result. It refuses a merge commit, and exits with 4 when HEAD moves. |
| `tools/measure-lock.sh run --owner <name> [--gate <load>] [--max <s>] -- <cmd>`, `tools/measure-lock.sh status` | The fair lock of the timed measures ([`workflow.md`](workflow.md), "Performance rounds"): a queue of tickets, an optional CPU gate, and a stop after `--max` seconds (900 by default). It frees only its own lock. |
| `tools/merge-branch.sh [--check-only] [--no-arm-check] <branch> [worktree]` | Rebases `<branch>` onto `main`, checks each commit, and runs the full `pnpm test`. A change of `src/pose/`, `src/models/`, or `tools/blender/` runs `pnpm arm-check --all --base main`, and a `FAIL` stops the merge. Then it runs `pnpm build` and `pnpm size`, fast-forwards `main`, and removes the worktree and the branch. `--check-only` does not merge. Run it from `main`. |
| `tools/break-test.sh '<perl expr>' <file> <test files>...` | Applies one temporary break to a tracked file, runs the test files, restores the file, and prints each test that fails. |

## CI

CI (`.github/workflows/ci.yml`) runs `pnpm install`, `pnpm typecheck`, `pnpm lint`,
`pnpm format:check`, `pnpm test`, `pnpm test:perf`, `pnpm build`, and `pnpm size`, and
`pnpm test:e2e` in one job for each browser (design 9.2). While all tests are paused, the speed
tests and the end-to-end tests have `if: false`. `.github/workflows/pages.yml` deploys the site to
GitHub Pages under `/zoophony/` after CI passes on `main`.
