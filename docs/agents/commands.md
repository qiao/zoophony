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
  an instrument scale, such as `mouse.oboeScale=0.62`, the form of its cymbals, such as
  `badger.cymbalForm=suspended`, or the lead pipe of its tuba, such as `rhino.tubaPipe=0.25,0.1`. The root `choir` changes the
  flippers of a singer, `choirMotion` its beak and head lift, such as `choirMotion.jaw=0.87`, and
  `folder` the place of the choir folder, such as `folder.drop=1.25`.
  Code: `tools/hold-sets.ts`.
- **`--base <ref>`.** Runs a commit, a branch, or a tag beside the working tree, each in a child
  process with its own tools (`probeBeside()` of `tools/ref-tree.ts`), and prints a compare. A
  role that the commit does not have stops the run. Two JSON formats compare only when the newer
  format only adds fields. The JSON of the commit goes into a cache by tree (`probe-cache/` in the
  common folder of git): a hit prints `base: cached`, and `PROBE_NO_CACHE=1` runs the commit
  again.
- **`--glb <file>`.** Gives the animal the studio body that the export makes from another GLB
  file, in a copy of `src/` (`tools/glb-swap.ts`). `ANIMALS`, `assets/`, and `src/` do not change,
  also after Ctrl-C. Thus a GLB file of `rig-mesh --check --keep` needs no copy over the real file
  and no `pnpm studio-body`. A species with no studio body takes the body when
  `tools/mesh-rigs/<species>.json` exists.
- **`--midi <path>`.** A MIDI file of the user, read from its path. No tool copies it into the
  repository. In `pose-depth`, `hold-fit`, `arm-check`, and `clip-probe`, it is one more `--demo`, so
  a run with `--midi` and no `--demo` reads only the file. A child of `--base` gets the absolute path.
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
| `pnpm load-probe [--phone] [--repeat] [--base <ref>] [--profile] [--runs <n>] [--out <file>]` | Measures the load of the default demo after `pnpm build`: FCP, LCP, the first frame of the orchestra, the time until it is ready to play, the blocking time, and the bytes, as the median of the runs. It serves `dist/` as GitHub Pages does. `--phone` gives Fast 4G and a 4x CPU throttle, `--repeat` a second visit with the HTTP cache, and `--profile` a CPU profile of a build with no minify. The timed part runs through `tools/measure-lock.sh`. About 10 s for each desktop run and 20 s for each phone run. |
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
| `pnpm close-views <mode> <dir> [--url <url>] [--glb <file>] [--set <changes>]... [--base <ref>]` | Writes images and a grid into `<dir>`. The modes: `<role>` (the moments and views of `ROLE_VIEWS`, `--moments`, and `--views <names or azimuths>`, one grid for each `--probe`, or 3x face crops with `--target head`), `lineup <species,...>`, `species <species,...>`, `play`, and `batch` (the image set of a round). `<role> --lineup` gives a row of the base, the tree, and each `--with` role for each view (front, back, left, right by default), at the first moment and rest, with `--crop <n>` crops of `--box`: 45 s with `--base`. `play` renders `--demo` or `--midi` at each `--time`, or at the song times of `--strip <from>:<step>:<count>`, for each `--camera` (a name, a drag, or JSON), `--cinematic`, `--shot <seat\|species>`, or `--at <seat\|species[:instrument]>` with `--azimuth`, `--zoom`, and `--elevation`, at `--size <w>x<h>`. `--base` adds the commit: a grid, the pairs of `--pairs` and `--crop`, or a sheet of strip pairs. `--glb` and `--set` build a variant, each `--set` into `set-<n>/`. A batch: 90 s to 260 s. A strip of 16 frames with `--base`: 47 s, or 25 s from the cache. |
| `pnpm close-views audit <dir> [--roles <role,...>] [--url <url>] [--base <ref>]` | The audit sheet of the seams: each moment of `ROLE_VIEWS` of each role (all roles with no `--roles`) from the back, az150, az-150, the front, and each side, at the camera heights 20° and 40°, as 2x crops of the arms and the upper trunk, the commit of `--base` above the tree. One build of each tree serves all roles. It writes `<dir>/<role>-e20.png` and `<role>-e40.png`, and the cells in `<dir>/<role>/e<height>/`. All 23 roles with no base: 27 minutes, about twice that with `--base`. |
| `pnpm look-lab <dir> [--url <url>]`, `pnpm look-variants <file> --out <dir>` | Measure frames of `close-views play` against `orchestra-latest.png`: one tree, or each variant. 40 s each. |
| `pnpm keyboard` | Checks each control with the keyboard alone at 1440 × 900 and 390 × 844 (design 9.5, step 6), and fails on a failed check. |

## Sound

| Command | Action |
|---|---|
| `pnpm loudness [--demo <id>]... [--fit] [--target <LUFS>]... [--json] [--check]` | Renders each demo in Node, then sends it through `output-chain.ts` in headless Chromium (design 6.8). It prints the loudness measures of design 6.8 and the gain reduction of the limiter. `--fit` gives the value of `DEMO_LOUDNESS` for `TARGET_LOUDNESS`, and `--target` for another target. `--check` fails above 0.5 LU from the target or above -1 dBTP. About 25 s for each demo. |

## Pose and body probes

These probes run with no build, and the source files do not change. They read the demos and the
percussion test score of `tools/probe-demos.ts`. The roles and their species
are in the table "Bodies and roles" of [`model-work.md`](model-work.md).

| Command | Action |
|---|---|
| `pnpm pose-probe <sheet> [--time <s>]... [--set <changes>]...` | Prints the posed elbow, wrist, and palm of each arm of a sheet pose (design 7.1), in head heights from each shoulder joint, and the tip direction of the instrument. Each `--set` prints one variant. About 1 s. |
| `pnpm pose-depth <role> [--demo <id>]... [--midi <path>]... [--soloist <species>] [--set <changes>]... [--bones <list> \| --per-bone] [--every <n>] [--into <list>] [--times <list>] [--gaps] [--targets] [--goal <cm>] [--base <ref>] [--json <file>] [--long] [--glb <file>]`, or `<role> --where <bone> <demo>:<time>` | The clearance sweep of a role (design 9.3): the deepest point and the share over the limit or `--goal` of each moving part in each obstacle, a held instrument in the body (limit 2 cm), and the note-target errors (`--targets` alone). A `--set` is one row, and more than 5 need `--demo` or `--long`. `--per-bone` splits the arm groups into bones, `--every <n>` takes each n-th play sample, `--gaps` adds the gaps, and `--base` marks `GROWS`. `--where` gives the corners and joints of a bone in the axes of the instrument (1 s). A row: 10 s to 5 minutes, the bassist with `--per-bone --every 6` 32 s. |
| `pnpm hold-scan <role> [--demo <id>]... [--set <changes>] [--grid <path>=<a>:<b>:<step>]... [--move <axis>=<a>:<b>:<step>]... [--hold <path>] [--samples <n>] [--top <n>]` | Scores hold variants on 12 play samples and the rest of one demo: the grids, and moves of a bowed instrument around its end (`yaw`, `tilt`, `side`, `roll` in degrees, `dx`, `dy`, `dz` in meters). A row gives the depth of each arm bone and the instrument, the reached fingerboard and hair, and the score: the cm past the limits, plus 10 for each lost share of reach. 0.15 s for each variant. |
| `pnpm hold-reach <species> [--instrument violin\|viola\|<wind>\|<percussion>] [--support chair\|stand] [--set <changes>]... [--size <scale>[,<scale>]...] [--glb <file>]` | Measures the reach of the arms to the instrument in the playing pose (design 4.6). A violin or a viola gives the reached fingerboard (`stopRange`), the bow hair (`bowRange`), and the scale of a violin shop. A wind gives the spare reach of each palm to its grip, and the slide travel of a trombone (`slideReach`). Percussion gives the strikes within 5 mm (6 s). Less than 1 s. |
| `pnpm hold-fit <role> [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--sets <set>,...] [--faces <n>] [--faces-of <list>] [--demo <id>\|all]... [--midi <path>]... [--technique <t>] [--base <ref>] [--glb <file>]`, or `--scan` | Fits a hold of a role (route 3). Each variant is one row: the folds and the faces that fold most, the deepest point of each sample set, the note-target errors, the mean play turns of the arms, the instrument in the body, the lap rest, and the spare reach of a wind grip or a violin. `--grid` adds up to 40 variants, `--sets lift,rest,lower` skips the play, `--scan` measures rest variants on one sample, and `--technique pizzicato` counts only its play samples. The default demos are `FIT_DEMOS`. |
| `pnpm wind-grip <role>... [--demo <id>]... [--every <n>] [--set <changes>]... [--lines]` | Measures each paw on its tube on the studio skin, over the play, the lift, the rest, and the lowering: the gaps of the skin and the tips, the axis distance and depth in the paw, the palm angle, and the side. For a mallet, also the butt length, the held length, and the angle from the thumb side. A paw grasps when its tips touch, its palm faces the tube, it is on the side of the technique, and a shaft goes through the paw at most 60° from the thumb side. Roles: the winds but the horn, the percussion roles, and `fox-violinist`. Several `--set` give a scan. About 3 s each. |
| `pnpm fold-probe <role> [--demo <id>]... [--step <s>] [--faces <n>] [--turns <face>] [--bins <face>] [--set <changes>]... [--json <file> [--middles <faces>]] [--glb <file>] [--base <ref> [--faces-of <faces>]]` | Counts the folded faces of the studio skin of a role (design 4.4): faces whose normal turns more than 90° from the bind. Each sample set gives the share of the samples with a fold. `--faces <n>` lists the faces that fold most, with their middles for `weights.rigid`. `--turns <face>` gives the arm turn of its folds, and `--bins <face>` its folds by the turn of each arm bone. `--base` marks the new and the gone faces, and `--faces-of` pairs named faces of the commit with the tree. 10 s to 40 s. |
| `pnpm arm-look <role>... \| --all [--demo <id>]... [--step <s>] [--set <changes>]... [--glb <file> [--corners <file>]]` | Measures the arm skin of mesh rigs against the user mesh over the play: the share of the upper arm and shoulder edges whose fold angle changes by more than 40° (a crumpled skin), and the narrow / wide axis of the mid upper arm (a flat plank). The limits come from the red fox. A value over a limit is `FAIL` (exit code 1). `--glb` reads the corners beside the file (`rig-mesh --check --keep`), else `--corners`. About 50 s for each role, 21 s with `--glb`. |
| `pnpm arm-shape <role> [--demo <id>]... [--step <s>] [--set <changes>]... [--body upperTwist=<share>] [--rings] [--glb <file>] [--json <file>]` | Measures the arm skin in the samples of `pnpm fold-probe`: the twist along the upper arm, the flat and girth shares of four rings, and the shoulder spikes. `--body` sets a body rule in memory. 25 s to 55 s. |
| `pnpm arm-check <role>... \| --all [--base <ref>] [--set <changes>]... [--variant <name> [--set <changes>]...]... [--glb <file>] [--views <dir> [--views-all]] [--demo <id>]... [--midi <path>]... [--step <s>] [--jobs <n>] [--long] [--states <ref>,...]`, `<role> --trace <demo>:[lift]<from>-<to>`, or `<role> --explain stretch\|flat` | The arm gate (`2026-10-19-arm-gate.md`): the `ARM_LIMITS` of each arm over the fold samples, and the paw twist and the wrist turn rate of the lifts and the lowerings at steps of 0.01 s (`2026-10-21-wrist-lift.md`). Each value gives p50, p95, the worst demo and time, and a verdict against the limit and the base, which runs the gate of the working tree: `FAIL` (exit code 1), `OPEN`, or `PASS`. A role with no entry in `ACCEPTED_GRIPS` gets a ready entry. A cache by tree keeps each role (`tree: cached`). Each `--variant` runs in one child, at most `--jobs` at the same time (20 variants: 48 s with `--jobs 8`). `--views` writes 2x crops of the worst sample, a strike, and a rest of the demos. `--states` gives a column for each old commit. `--trace` prints the paw angles at steps of 0.01 s (1 s), and `--explain` each value from the rest and the bind (30 s). A new measure goes into `GATE_SCRIPTS`. All roles: 5 to 7 minutes cold, 2 s from the cache. |
| `pnpm raise-fit <role> --faces <list> --side L\|R [--bone upper\|forearm\|hand] [--sets <set>,...] [--demo <id>]... [--step <s>] [--set <changes>]... [--json <file>] [--glb <file>]` | Fits one rule of `raise` of a mesh rig to the folds of the faces (route 3): the mean turn of each key of the arm over the folded samples of `--sets` (the play by default), and a ready entry. `--json` writes it for `rig-mesh --set 'raise+=@<file>'`. A rule of a bent wrist turns 10° further. 15 s. |
| `pnpm body-probe [--out <file>] [--no-poses]`, `pnpm body-probe --compare <base.json> <new.json>`, or `pnpm body-probe --base <ref>` | Probes the rest joints and a mesh hash of each species and player, and a hash of the poses of each player of each demo. With no `--out`, it prints a summary and a hash. `--compare` and `--base` print each difference, and fail on it. About 6 s. |
| `pnpm beat-rates [--midi <path>]... [--demo <id>]... [--limit <bpm>] [--step <s>] [--base <ref>]`, or one file with `--trace <from>-<to> [--player <n>]` | Prints the rate of each beat or note motion over a song (design 5.1, 5.4). It fails above 2 s over `--limit` (120 sides for each minute) or a conducted beat of 168. With no file, it probes each demo (3 s each). `--trace` prints the spine sway of one player (`--player`, or the largest sway) at steps of 0.01 s. With `--base`, the commit runs the script of the working tree (1 s). |
| `pnpm clip-probe [--midi <path>]... [--demo <id>]... [--step <s>] [--jobs <n>] [--set <changes>]... [--variant <name> [--set <changes>]...]... [--base <ref>] [--json <file>]` | Finds the clips of all players of a file over the whole song: overlapped seats, a paw in the other paw, a mallet across the other hand, a paw or a mallet in its own instrument, an instrument under the floor, and a part in a near player. A measure clips above 1% of the samples. With no file, it reads each demo and the percussion test score. `--set` changes the working tree only. Each `--variant` gives a block of one table, with one run of the commit. One file of 1 minute: 6 s, all demos with `--base` and 4 jobs: about 8 minutes. |
| `pnpm shot-trace <demo> [--from <s>] [--to <s>] [--cameras] [--base <ref>]` | Prints the choice of the shot planner at each cut of a time range (design 5.6): the dropped candidates, the scores, and the refused cameras. `<demo>` is a demo or a chamber test file. Less than 1 s. |
| `pnpm light-probe [--look <JSON>] [--grid <spec>] [--goal <r>]` | Light on the players by row, and the lux for a goal. 1 s. |
| `pnpm docs-species <species> [--all]` | Prints each place of the docs checklist (section 8 of `docs/briefs/studio-body.md`) that does not name the species yet, or `not found`. It exits with 1 on a miss. Less than 1 s. |

## Rig tools

Blender 5.2 or later comes from the variable `BLENDER`, or from the path.

| Command | Action |
|---|---|
| `pnpm glb-init <species> <glb> [--force] [--preview <dir>]` | Starts a rigged GLB body (route 1, design 4.4). It copies the file with a README of its checksum to `assets/models/<species>/`, and proposes `tools/glb-bodies/<species>.json`. `--force` writes over a config, and `--preview` writes the images of `pnpm rig-body --preview`. |
| `pnpm rig-body <species> [--preview <dir>]` | Packs the rigged GLB body of a species with Blender into `src/models/rigged/<species>.ts` and the baked skin `<species>-skin.webp`, from `tools/glb-bodies/<species>.json`. `--preview` writes `skin.png` and `bones.png`. |
| `pnpm rig-mesh <animal> [--preview <dir>] [--check [--set <changes>]... [--roles <list>] [--step <s>] [--demo <id>]... [--faces <n>] [--watch <faces>] [--hold <changes>]... [--keep <dir>]]` | Rigs a textured mesh with no skeleton into a studio body GLB file (design 4.4), from `tools/mesh-rigs/<animal>.json`. `--preview` writes images. `--check` rigs into a temporary folder, and prints the reach, the budgets, the seat, the standing error, the folds and the tail gaps of each role (`tools/tail-gap.ts`), and the form against `main`. It warns above 5% dark faces outside the eye and nose boxes, with a `colors.dark` that fixes it. Each `--set` is one variant of the config: JSON for a new key (`raise.1={...}`), `<path>+=<JSON>` to add to a list, and `@<file>` for a value from a file. `--watch` gives the fold share of named faces, and `--keep` keeps each GLB file with its corners. It also prints the join of each arm into the trunk and the gap below it in the stance of the source, and warns when an arm joins past 0.79 of the upper arm or touches the trunk (`tools/arm-gap.ts`; `node tools/arm-gap.ts [<animal>...]` gives the values of the rigs in `assets/models/`, 1 s). Run `pnpm studio-body <animal>` after each write, and commit both files. The last column gives the faces that each `raise` shape leaves turned, with `FAIL` for a failed relax. 20 s to 75 s. |
| `blender -b --factory-startup --python tools/blender/arm_root.py -- tools/arm-roots/<species>.json [--out <file.glb>] [--edits <JSON list>]` | Writes a copy of a mesh of the user with local edits at the arm root: `flip`, `fair`, `smooth`, `hull`, `push`, and `split` (the TSDoc of the script). The vertices are the welded indices of `dump.py` of `docs/research/2026-10-22-arm-roots/`. `--edits` replaces the list for a variant. Put the copy in the tree, as `scratch/glb/`, and rig it with `pnpm rig-mesh <animal> --check --set source=<path> --keep <dir>`. A run gives the same bytes, and prints the SHA-256 for the README of the folder. 5 s. |
| `pnpm mesh-options <animal> <dir> --size <label>=<head top>... [--legs <f>,...] [--arms <f>,...] [--instrument <id>] [--species <id>]` | Makes the mid-report of a mesh. It rigs each size (the standing skull top in meters), leg factor, and arm factor, as `rig-mesh --check` does. `<dir>/options.md` gives the measures and the warnings of each variant. About 7 s for each variant. |
| `pnpm studio-body <animal> [--inspect [--glb <file>]]` | Writes `src/models/studio/<animal>.ts` from the GLB file of the studio or `glb` of `ANIMALS`, with no Blender, scaled by the landmark of the animal. A seated role drops onto its seat. Run it after each change of the GLB file. `--inspect` prints the joints, the clips, and the arm lengths, and writes no file. |

## Tests and scripts

All tests are paused since 2026-10-16 ([`workflow.md`](workflow.md), "Tests").

| Command | Action |
|---|---|
| `pnpm test` | Runs the Vitest project `unit`: all tests except the speed tests and the paused tests (design 9.3). While all tests are paused (`ALL_TESTS_PAUSED` of `vite.config.ts`), it runs no test and passes. |
| `pnpm test:paused [--base <ref>] [<path>]...` | Runs the paused tests (`PAUSED_TESTS` of `vite.config.ts`, and each unit test while all are paused). A path runs only its file. `--base <ref>` runs a copy of the commit beside the working tree, prints only the failures that come on the working tree alone, and then exits with 1. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time (design 9.3). A heavy load can make it fail. |
| `pnpm test:e2e [--project=chromium]` | Runs the Playwright tests of `e2e/*.e2e.ts` on the built site in Chromium, Firefox, and WebKit. The smoke test of design 9.3 plays the default demo for 4 s. Run `pnpm build` first. Set `ZOOPHONY_E2E_PORT` to a free port (4182 by default, as in CI). |
| `pnpm smoke` | Runs the smoke test on the Vite dev server in headless Chromium, with the checks that need the dev hook: the bow arm of a violin and the camera modes. |
| `pnpm frame [--demo=<id>] [--free] [--scale=<n>] [--max-cpu=<percent>] [--wait=<s>] [--no-metal] [--gpu-only] [--keep=<dir>] [--headed]` | Measures the frame target of design 9.7 on the development Mac: `perf-60.mid` in Google Chrome with a Metal System Trace. About 3 minutes. Code: `tools/measure-frame.ts`. |
| `pnpm frozen [--base <ref>] [--shots <list>] [--out <dir>] [--tree <dir>]` | Renders the four frozen shots (song time and wall time held) of the working tree into `<out>/tree/` (default `scratch/frozen/`). With `--base`, it renders the commit too and prints the difference of each shot. It exits with 1 when a pixel changed. `--tree` renders another folder in place of the working tree. Run `pnpm frozen --base main` after a cut that must keep the look, also after a change of the materials, which can change the order of the draws. About 2 minutes. |
| `pnpm cpu-profile [--demo <id>] [--seek <s>] [--sec <n>] [--top <n>] [--out <file>] [--in <file>] [--callers <function>[:<line>]] [--depth <n>]` | Profiles the main thread during play (default `perf-60` at 32 s, 10 s) and prints the self time and the total time of the top functions for each frame. `--in` reads a saved profile. `--callers` sums the time of a function by the paths of its callers, such as `update:18279` for `Skeleton.update()`. About 20 s. |
| `pnpm frame-compare <ref\|patch>... [--runs <n>] [--gate <load>] [--out <dir>] [--no-frozen] [-- <flags of pnpm frame>]` | Measures `pnpm frame` on each commit, or on `HEAD` with each `.patch` file, in temporary trees: `--runs` runs (default 3) of each item in turns, each through `tools/measure-lock.sh run --gate <load>` (default 12), with a new try after a refusal of a guard. It prints the median of the main thread, the GPU row, and the frame rate with no cap, and the frozen shots of each item against the first item. The logs are in `scratch/frame-compare/`. About 5 minutes for each run of an item: two items with 2 runs took 25 minutes. |
| `tools/check-commits.sh [--tip] [--no-cache] <base>` | Checks each commit of `<base>..HEAD` in a temporary worktree. A code commit runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the tests that it reaches, and a docs commit the format check. `--tip` also runs the full `pnpm test` on the last commit. A cache by tree keeps each passed result, and `--no-cache` reads no entry. It refuses a range with a merge commit, and exits with 4 when HEAD moves during the run. |
| `tools/measure-lock.sh run --owner <name> [--gate <load>] [--max <s>] -- <cmd>` and `tools/measure-lock.sh status` | The fair lock of the timed measures (`workflow.md`, "Performance rounds"): a queue of tickets, an optional CPU gate, the lock `scratch/measure.lock/` of the main checkout, and a stop of the command after `--max` seconds (900 by default). It frees only its own lock. |
| `tools/merge-branch.sh [--check-only] [--no-arm-check] <branch> [worktree]` | Rebases `<branch>` onto `main`, checks each commit with `tools/check-commits.sh main`, and runs the full `pnpm test`. A change of `src/pose/`, `src/models/`, or `tools/blender/` runs `pnpm arm-check --all --base main`, and a `FAIL` stops the merge (`--no-arm-check` skips it, with the reason in the report). Code then runs `pnpm build` and `pnpm size` (end-to-end tests only with `MERGE_E2E=1`). Then it fast-forwards `main`, and removes the worktree and the branch, or stops at the first failure. `--check-only` does not merge. Run it from `main`. |
| `tools/decision-rows.sh [--diff <base>] [<term>...]` | Prints each row of `docs/decisions/*.md` that holds a term. With `--diff <base>`, the identifiers and strings that `<base>..HEAD` removes outside `docs/` are terms too. |
| `tools/break-test.sh '<perl expr>' <file> <test files>...` | Applies one temporary break to a tracked `<file>`, runs the test files, restores the file (also after Ctrl-C), and prints each test that fails. It exits with 0 when a test fails. |

## CI

CI (`.github/workflows/ci.yml`) runs `pnpm install`, `pnpm typecheck`, `pnpm lint`,
`pnpm format:check`, `pnpm test`, `pnpm test:perf`, `pnpm build`, and `pnpm size`, and
`pnpm test:e2e` in one job for each browser (design 9.2). While all tests are paused, the tests
of speed and the end-to-end tests have `if: false`. `.github/workflows/pages.yml` deploys the
site to GitHub Pages under `/zoophony/` after CI passes on `main`.
