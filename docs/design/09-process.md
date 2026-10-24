# 9. Process

## 9.1 Repository

- Git, with the branch `main`. Each step of the work has many fine-grained commits.
- `.gitattributes` merges `docs/design.md` with the union driver of git, so two rounds that each
  add the line of a decision file do not conflict. A line that both sides change stays two times,
  so the agent of such a round reads the merged file.
- The code license is Apache-2.0.
- The user creates the GitHub repository `zoophony` before the first deploy. Until then, all
  commits stay local.

## 9.2 CI

GitHub Actions runs these checks:

| Check | Blocks a merge |
|---|---|
| Type check | yes |
| Oxlint, with `.oxlintrc.json` and the anti-slop plugin in `tools/oxlint/anti-slop/` | yes |
| oxfmt format check | yes |
| Vitest (`pnpm test`, with no paused test, 9.3) | yes |
| Vitest speed tests (`pnpm test:perf`, 9.3) | paused since 2026-10-16 (9.3) |
| Size check (7.2) | yes |
| Playwright in Chromium | paused since 2026-10-16 (9.3) |
| Playwright in WebKit and Firefox | paused since 2026-10-16 (9.3) |
| Keyboard check (`pnpm keyboard`) | not in CI |
| Frame target (`pnpm frame`, 9.7) | not in CI |
| Paused Vitest tests (`pnpm test:paused`, 9.3) | not in CI |

Headless WebKit and Firefox on Linux have weak support for WebGL2 and for audio output, so their
runs do not block a merge (`continue-on-error: true`).

While all tests are paused (9.3), `pnpm test` runs no test. The step `pnpm test:perf` and the job
`playwright` have `if: false`, and the Pages workflow skips its end-to-end test. To end the pause,
remove each `if: false`
([`2026-10-16-all-tests-pause.md`](../decisions/2026-10-16-all-tests-pause.md)).

- `.github/workflows/ci.yml` has the job `check` (the checks of the table up to the size check)
  and the job `playwright`, one time for each browser. A failed run uploads `test-results/`.
- The Linux runners have no GPU, so Chromium uses ANGLE on SwiftShader (9.3).
- The keyboard check stays a local check of the reviews (9.8). It reads the state of a control
  directly after a key, and the slow frames of SwiftShader make it fail.
- The frame target stays a local check of each change of the scene (9.7). It needs the GPU and
  the Metal System Trace of the development Mac.

A push to `main` builds with pnpm and deploys to GitHub Pages under the base path `/zoophony/`.

- `.github/workflows/pages.yml` starts when a CI run of a push to `main` passes (`workflow_run`),
  or by hand, so a red commit does not deploy. It builds the commit of that run with
  `ZOOPHONY_BASE=/zoophony/`, runs the end-to-end test of Chromium there (paused), and deploys
  `dist/` to the environment `github-pages`. One deploy runs at a time.
- The user sets the source of GitHub Pages to "GitHub Actions" one time.
- `vite.config.ts` reads the base path from `ZOOPHONY_BASE`, and `/` is the default for
  `pnpm dev`, `pnpm build`, and `vite preview`. Each URL of the app starts from
  `import.meta.env.BASE_URL` or `import.meta.url`.

## 9.3 Tests

- Vitest tests the pure modules: `midi/`, `score/`, `pose/`, `models/`, `shots/`, and the block
  scheduler. The tests cover all rules of section 3, and Node tests render audio offline with
  spessasynth_core. The demo tests of 8.3 and 8.5 check the demo files.
- The tests check behavior: no clipping, the bow on the strings, the hidden heads, the footprints
  of the layout, and the budgets. They pin no tuned value, no hash, and no geometry of a look,
  because each deliberate change of the look then edits such a test, and the test finds no fault.
  A limit leaves a clear margin, and its comment gives the reason.
- Since 2026-10-14, the tests of the look, the fit, and the clearance of the bodies, and of the
  layout from their footprints, are paused, because the user iterates on the look of the animals
  ([`2026-10-14-test-pause.md`](../decisions/2026-10-14-test-pause.md)). `PAUSED_TESTS` of
  `vite.config.ts` puts them in the Vitest project `paused`, which `pnpm test`, CI, and the check
  scripts skip. `pnpm test:paused` runs them for information. A section of this design that names
  a paused test keeps its rule, and the check waits for the end of the pause.
- Since 2026-10-16, all tests are paused, because the tests took too long while the project
  changes fast (user, [`2026-10-16-all-tests-pause.md`](../decisions/2026-10-16-all-tests-pause.md)).
  The switch `ALL_TESTS_PAUSED` of `vite.config.ts` makes each unit test file a paused test. While
  the pause lasts, a change adds no test unless the user asks.
- A speed test (`*-speed.test.ts`) compares the time of its work with a fixed reference work in
  the same run (`src/test-speed.ts`), and keeps the least time of each over many rounds, because
  load only adds time. `pnpm test:perf` runs them one file at a time.
- Vitest runs all tests of one file in one worker, so a slow sweep over the demos splits into
  shard files (`shardOf()` of `src/test-shards.ts`). A new demo joins a shard with no new file, and
  `src/test-shards.test.ts` fails when a shard has no file.
- The clearance tests of the roles share one sweep (`pose/test-sweep.ts`,
  `pose/test-role-clearance.ts`), and `pnpm pose-depth <role>` prints the same depths.
  `SWEEP_ROLES` of `pose/test-sweep-roles.ts` gives each role its moving parts, its obstacles, its
  sample sets, its note targets, and its limits. The sweep poses the skin of the GPU and measures
  the depth of each point of the paws, the arms, and a held part in the closed body and the closed
  shells of the instrument (`closedDepth()` of `pose/test-clearance.ts`). A depth past the contact
  depth of the role is a named entry with its reason and its decision row. A role that holds its
  instrument against its body (the bowed strings and the winds) also measures the instrument in
  the body (`INSTRUMENT_PART` of `pose/test-sweep-roles.ts`), with a limit of its own
  (`INSTRUMENT_CONTACT`): a real player touches the instrument with the body, such as the chin rest
  of a violin under the jaw or the back of a contrabass on the lower belly, but the instrument does
  not go into the body. `pnpm pose-depth` and `pnpm hold-fit` mark a depth past the limit. A note
  target gives the distance of a hand or its held part from its target, such as the bow hair on
  the strings.
  - Each role sweeps the first seated player of each model in each demo with its seat, and each
    standing soloist. The conductor (the bear), the pianist (the polar bear), the violinist (the
    rabbit and the red fox), and the flutist (the tan fox) have shard files
    `pose/<role>-clearance-<k>.test.ts`.
  - The violist (the cat), the cellist (the dog), the bassist (the hippo), the trombonist (the
    panda), the oboist (the mouse), the timpanist (the elephant), the bassoonist (the beaver), the
    hornist (the pig), the clarinetist (the wolf), the trumpeter (the monkey), the tubist (the
    rhino, which stands in each seat), the harpist (the deer), the singer (the penguin, with each
    palm on its grip of the folder at each note), and the five roles
    of the badger (the bass drummer, the snare drummer, the cymbalist, the percussionist, and the
    xylophonist) have a sweep and no test file, because they came while all tests are paused
    (`VIOLIST_SWEEP`, `CELLIST_SWEEP`, `BASSIST_SWEEP`, `TROMBONIST_SWEEP`, `OBOIST_SWEEP`,
    `TIMPANIST_SWEEP`, `BASSOONIST_SWEEP`, `HORNIST_SWEEP`, `CLARINETIST_SWEEP`,
    `TRUMPETER_SWEEP`, `TUBIST_SWEEP`, `HARPIST_SWEEP`, `SINGER_SWEEP`, `percussionSweep()`). The
    frame of the harp leaves out its strings, which the palms pluck. The sweep of the harpist also
    measures the arms, the legs, the haunch, and the tail in the stool (`SEATED_PARTS`), so that it
    sees a clip of a seat. The sweep of the timpanist also moves the head, so
    that the trunk, the tusks, and the ears stay out of the kettles. No demo has a snare drum or a
    xylophone, so the probes of these two roles read a percussion test score of the tools
    (`tools/probe-demos.ts`).
- The Playwright smoke test (`e2e/smoke.e2e.ts`, `pnpm test:e2e`) runs on the built site, so that
  CI tests the files that it deploys. It plays the default demo for 4 s, and checks the song time
  through the count-in, the canvas, the console, and the requests. A failed request finds an
  absolute path that the base path of 9.2 does not hold. The built site has no dev hook, so `App`
  writes the song time into the attribute `data-song-time` of the stage canvas.
- `chromiumArgs()` of `tools/chromium-args.ts` gives the Chromium flags of the browser checks:
  ANGLE on Metal on macOS, and ANGLE on SwiftShader on Linux.
- `pnpm smoke` (`tools/smoke.ts`) runs the smoke test on the dev server with the dev hook
  `window.zoophony` (`src/app/dev-hook.ts`). It also checks the bow arm of the first violin and the
  camera modes of 2.5.
- The dev server reads a look override, so that a round of the light compares variants with no
  patch (`src/app/look-override.ts`). The query `look` holds JSON of look paths and values, such
  as `{"BACK_ROW_LIGHT.illuminance":2.81}` (`LOOK_ROOTS` of `src/scene/look-values.ts`), and the
  query `solo` holds seats or species. The module is the first import of `src/main.ts`, so it acts
  before the other modules read the values at their load. It refuses an unknown path, and a path
  that its module reads at its own load. The solo clicks the solo buttons after the load, as the
  user does. The build gets an empty stub of the module, so the first download does not change
  (7.2).

## 9.4 Manual test before each release

- Real Safari on macOS.
- Real Safari on iOS, also with the silent switch on (2.4).
- Android Chrome.
- In real Safari on macOS and on iOS, the hall loads from its FLAC file (6.8): the network list
  shows `st-pauls-hall-c8m-*.flac` and no `.wav` file. Playwright WebKit decodes the file, but it
  is no real Safari.

The author of spessasynth does not test on Safari, so this manual test is necessary.

## 9.5 Order of work

The steps put the largest risks first. A step is done only when its "done" criterion is true and
its review of 9.8 is done. [`../TODO.md`](../../TODO.md) splits each step into tasks, and it holds
the status of the work.

**Step 0. Project skeleton**

- Work: Vite, TypeScript with the compiler options of `docs/agents/code.md`, Vitest, Oxlint with
  the anti-slop plugin, oxfmt, the size check, the third-party license file, and CI. oxfmt formats
  `src`, the root config files, and the TypeScript files of `e2e/` and of `tools/` outside
  `tools/oxlint/`, because the anti-slop plugin keeps its own style.
- Done when: a clean clone runs `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm format:check`, `pnpm build`, and `pnpm size` with no error, and CI runs the same commands.

**Step 1. Audio spike**

- Work: the worklet with spessasynth_core, the Worker decode, the SF3 split, and one demo in a
  bare page. The spike checks the bundle, the first note of a sample, the clock (6.7) in each
  browser, a suspended `AudioContext`, and a hidden tab.
- Done when: the spike plays the demo to the end with no dropout in Chrome, Firefox, and Safari,
  the step 1 targets of 9.7 pass, and a report in `docs/research/` gives each result.

**Step 2. MIDI and score**

- Work: `midi/`, `score/`, and the script that applies `demos/patches.json` (8.3).
- Done when: each rule of section 3 has a test that fails without the rule, the demo tests of 8.5
  pass, and the step 2 targets of 9.7 pass.

**Step 3. Scene and one player**

- Work: the stage, the light, the beam, the camera, and one rabbit whose bow moves in sync.
- Done when: the default view has the composition of the reference, and the clock target passes.

**Step 4. Models and gallery**

- Work: `models/` for all species and instruments of 4.3 to 4.6, the gallery, and the layout.
- Done when: the gallery shows each species with its instrument, the triangle budget test passes,
  and the chairs of each demo do not overlap.

**Step 5. Motion**

- Work: `pose/` for all instrument families, the idle motion, the rest pose, the conductor, and
  the app wiring. `tools/write-perf-60.ts` writes `perf-60.mid` (60 s of chords for 60 players)
  for the frame target. Only the dev server serves it, at `#demo=perf-60`.
- Done when: the tests of `pose/` pass, and the pose and frame targets of 9.7 pass.

**Step 6. UI**

- Work: the bar, the drawer, the lists, the settings, the credits, the tiers, the drop of a file,
  the URL hash, and the messages of 2.8.
- Done when: the UI matches [`prototype/ui.html`](../prototype/ui.html) at 1440 × 900 and at
  390 × 844, and a keyboard alone can reach and use each control.

**Step 6b. Cinematic camera**

- Work: the automatic camera of 2.5: `shots/` with `prepareShots()` and `cameraAt()` (5.6), the
  two modes, the toggle and the key C, and the checklist of
  [`research/cinematic-camera.md`](../research/cinematic-camera.md).
- Done when: the tests of 5.6 pass for each demo, the shot targets and the frame target of 9.7
  pass in Cinematic mode, and the smoke test checks the camera.

**Step 7. Demo build, tests, and deploy**

- Work: the demo build, the Playwright tests, and the Pages workflow.
- Done when: CI passes on `main`, and the site deploys and plays the default demo.

## 9.6 Docs

All docs, comments, commit messages, and UI text use ASD-STE100 Simplified Technical English. The
project `AGENTS.md` holds the short rules for coding agents, links to this document, and indexes
the modules of `docs/agents/` with the details.

The docs keep only the high level and the most important details, because each agent reads them in
each round (user, 2026-10-17). `docs/agents/writing.md` ("Length limits") gives the limit of each
kind of doc: `AGENTS.md`, a module, a decision file, a research report, a design section, and the
brief template. A design section holds the rules, the intent, and the reasons. The tuned values
live in the code, and the history and the measures live in the decision files and the research
reports.

## 9.7 Targets

The development Mac is an Apple M1 Max with Chrome. The research timings also come from this
machine. The measures of each target are in the research reports of its step, such as
[`research/step-2-targets.md`](../research/step-2-targets.md),
[`research/step-5-frame.md`](../research/step-5-frame.md), and
[`research/default-demo.md`](../research/default-demo.md).

| Target | Value | How to measure | Step |
|---|---|---|---|
| First download | less than 1 MB after gzip | the size check (7.2) in CI | 0 |
| Score build | at most 100 ms for the largest demo on the development Mac | a timed Vitest test (`score/score-speed.test.ts`, `pnpm test:perf`), as a ratio to a reference work in the same run | 2 |
| Clock | `Player.now()` within 20 ms of the audible time | Node: an offline render shows each note on within one block (2.7 ms) of its scheduled time. Browser: the spike compares the two clock methods of 6.7. | 1, 3 |
| Pose timing | each note event of `poseAt()` within 5 ms of the note time in the `Score`, before the seeded offset | Vitest (`pose/pose-timing.test.ts`) | 5 |
| Seeded offset | at most ±20 ms for each player | Vitest | 5 |
| Audio render | at most 1.3 ms for each 128-frame block (half of the budget) for each demo | Node: an offline render of each demo, timed for each block, also for a seek and a solo (`node tools/measure-targets.ts`) | 2 |
| Frame time | high tier, `perf-60.mid` (60 players), development Mac: GPU time and main-thread time each at most 4 ms for 95% of the frames | `pnpm frame` (`tools/measure-frame.ts`): a Chrome trace of the main thread at 60 fps, and a Metal System Trace of the GPU with no frame cap, with the guards below. The rows of the timer queries are for information | 5 |
| Load | the presets of the default demo load and decode in at most 2 s on a 50 Mbit/s connection | DevTools network throttle | 1 |
| First sound | the first note sounds at its song time after the downbeat (song time 0), at most one block (2.7 ms) early and never late. The count-in starts at most 300 ms after the click on play, when the default demo is ready | Node: `audio/clock-render.test.ts` and `audio/engine.test.ts` render a play with a count-in offline. Browser: `performance.now()` at the click, against the first clock anchor plus the output latency | 1 |
| Memory | at most 100 MB of decoded samples for each demo | the `Player` reports the PCM size of the banks of the synth (`pcmBytes`). Node: `audio/pcm-memory.test.ts` converts the presets of each demo as the Worker does | 2 |
| Shot plan | `prepareShots()` at most 20 ms for the largest demo on the development Mac | the least time of many plans on the development Mac. The timed Vitest test (`shots/shots-speed.test.ts`) finds a plan that is 2 times slower | 6b |
| Camera | `cameraAt()` at most 0.01 ms for each call | the same timed Vitest test | 6b |
| Model shading | `shadeMesh()` (4.5, materials) of the player models and the props of `perf-60.mid` at most 90 ms on the development Mac | a timed Vitest test (`models/shading-speed.test.ts`), as a ratio to the reference work | 8 |

- Each timed measure of this section runs through the fair lock `tools/measure-lock.sh`, so
  that two agents on one machine do not measure at the same time. `pnpm load-probe` measures the
  load of the default demo ([`agents/workflow.md`](../agents/workflow.md), "Performance rounds").
- The frame target also holds in Cinematic mode (2.5). The first sound target measures from the
  downbeat, because a play starts with the count-in of the conductor (5.4, 6.5).
- A timed test fails when the ratio of its work to the reference work is more than 2 times its
  ratio on the development Mac, so a loaded machine passes and a work 3 times slower fails.
- The GPU time of a frame is the time in which an encoder of the WebGL frame runs in a Metal
  System Trace with no frame cap (`tools/gpu-trace.ts`,
  [`2026-10-13-frame-time.md`](../decisions/2026-10-13-frame-time.md)). At 60 fps, the GPU lowers
  its clock while the frames fit, so a timer query measures the clock more than the work. Guards
  make the measure valid: a quiet CPU, the highest GPU state, and a self-check of the frames
  against the writes of the canvas
  ([`2026-10-13-frame-tools.md`](../decisions/2026-10-13-frame-tools.md)).
- Each change of `src/scene/`, of a shader, or of the post effects runs `pnpm frame` before its
  report, with the table in the report or in the commit message (`AGENTS.md`). CI has no GPU
  (9.2), so this check is local
  ([`2026-10-21-frame-performance.md`](../decisions/2026-10-21-frame-performance.md)).
- The frame target leaves a margin of about 4 times for an integrated GPU of the Intel Iris Xe
  class. The manual release test (9.4) checks that a real phone plays the default demo at 30 fps
  or more at the low tier.

## 9.8 Reviews

A review checks the work of a step or a round before its merge. Since 2026-10-16, no round gets a
review agent (user: "no need for the review agent for future sessions",
[`2026-10-16-no-review.md`](../decisions/2026-10-16-no-review.md)). The manager reviews each round
from the report and the images, and `tools/merge-branch.sh` runs the checks of each commit and the
arm gate of a pose or model change (`pnpm arm-check`, 4.4). The gate keeps the values of each
tree in a cache by tree, so the merge reads the values of the gate run of the branch. The user
judges the look from the images. The implementation agent or a fix agent makes each change that
the manager requests as a commit on the same branch.

At the end of a step or a round of the look, take the images at 1440 × 900 and at 390 × 844, and
for a motion step a GIF of 10 s. These commands take them (`docs/agents/commands.md`):

- `pnpm screenshots <dir>` shows each demo, with `--play`, `--ui`, `--drawer`, `--load`, and
  `--shots` for the play frames, the UI states, the drawer, the load states, and a frame of each
  kind of camera shot of 5.6.
- `pnpm close-views` shows a body round: the species alone on their seats, the views of a role,
  a lineup, and the play frames (`batch` makes all in one run). With `--base main`, it puts the
  images of `main` above the images of the branch (7.1).
- `pnpm keyboard` (`tools/keyboard-check.ts`) checks each control with the keyboard alone at both
  sizes for the UI.

Give the images to the manager with the report, and name the targets of the step with their
results. When a step is done, start the next step without a wait for the user. After the last
step, the user examines all steps together.
