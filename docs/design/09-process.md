# 9. Process

## 9.1 Repository

- Git, with the branch `main`. Each step of the work has many fine-grained commits.
- `.gitattributes` merges `docs/design.md` with the union driver of git. Two rounds that each add
  the line of a decision file then do not conflict. A line that both sides change stays two
  times, so the agent of a round that changes a line of `docs/design.md` reads the merged file.
- The code license is MIT.
- The user creates the empty GitHub repository `zoophony` (or installs `gh`) before the first deploy. Until
  then, all commits stay local.

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
| Paused Vitest tests (`pnpm test:paused`, 9.3) | not in CI |

Headless WebKit and Firefox on Linux have weak support for WebGL2 and for audio output. Thus their
runs do not block a merge.

Since 2026-10-16, all tests are paused (9.3). `pnpm test` runs no test. The step `pnpm test:perf`
and the job `playwright` have `if: false`, and the Pages workflow skips its end-to-end test. Thus
the checks of CI are the typecheck, the lint, the format check, the build, and the size check. To
end the pause, remove each `if: false`
([`2026-10-16-all-tests-pause.md`](../decisions/2026-10-16-all-tests-pause.md)).

- `.github/workflows/ci.yml` has two jobs. The job `check` runs the checks of the table up to the
  size check. The job `playwright` runs one time for each browser: `chromium`, `firefox`, and
  `webkit`. It installs its browser with `pnpm exec playwright install --with-deps <browser>`,
  builds the site, and runs `pnpm test:e2e --project=<browser>`.
- The runs of Firefox and WebKit have `continue-on-error: true`. After a failure, a run uploads
  `test-results/` for 7 days.
- The Linux runners have no GPU, so Chromium uses ANGLE on SwiftShader (9.3). The flags of the
  Mac stay out of CI.
- The keyboard check does not run in CI. It reads the state of a control directly after a key,
  and the app shows the new state in the next frame. With SwiftShader at 1440 × 900, a frame took
  about 0.3 s, and 7 of the 66 checks failed on the development Mac. With ANGLE on Metal, all 66
  passed. It stays a local check of the reviews (9.8).
- On 2026-10-05, actionlint 1.7.12 found no error in the workflows. No Docker daemon ran on the
  development Mac, so the first CI run is the first test of SwiftShader and of the audio clock of
  headless Chromium on Linux.

A push to `main` builds with pnpm and deploys to GitHub Pages. Vite uses the repository name
(`zoophony`) as its base path.

- `.github/workflows/pages.yml` deploys the site. It starts when a CI run of a push to `main`
  passes (`workflow_run`), or when a person starts it by hand. Thus a red commit does not deploy.
- The workflow checks out the commit of that CI run, and builds with `ZOOPHONY_BASE=/zoophony/`.
  Then it runs `pnpm test:e2e --project=chromium` under `/zoophony/` (paused since 2026-10-16,
  with the install of Chromium). Then
  `actions/upload-pages-artifact` uploads `dist/`, and `actions/deploy-pages` deploys it to the
  environment `github-pages`.
- One deploy runs at a time (the concurrency group `pages`).
- The user sets the source of GitHub Pages to "GitHub Actions" one time, in the settings of the
  repository.
- `vite.config.ts` reads the base path from the environment variable `ZOOPHONY_BASE`. Without
  it, the base path is `/`, so `pnpm dev`, `pnpm build`, and `vite preview` work at `/`. With
  `ZOOPHONY_BASE=/zoophony/`, the build and `vite preview` use `/zoophony/`, and
  `playwright.config.ts` opens the site there.
- Each URL of the app starts from `import.meta.env.BASE_URL` or `import.meta.url`: the demos,
  `sf/`, the license file, the worklet, the Worker, and the hall impulse response.
- On 2026-10-05, a build with `ZOOPHONY_BASE=/zoophony/` held no absolute path to `/sf/`,
  `/demos/`, or `/assets/`. `pnpm test:e2e` passed under `/zoophony/` with `vite preview`, and
  with a plain static server (Python `http.server`) that held `dist/` as `zoophony/`, with the
  SwiftShader flags. All 38 requests of the page went to `/zoophony/` and gave HTTP 200: the
  entry, the chunks, the worklet, the Worker, `sf/index.json`, 17 SF3 files, the demo, and the
  hall impulse response. The license file also gave HTTP 200.

## 9.3 Tests

- Vitest tests the pure modules: `midi/`, `score/`, `pose/`, `models/`, `shots/`, and the block
  scheduler.
  The tests cover all rules of section 3.
- The tests check behavior: no clipping, the bow on the strings, the hidden heads, the
  footprints of the layout, and the budgets. They pin no exact tuned value, no hash, and no
  geometry of a look, because each deliberate change of the look then edits such a test, and the
  test finds no fault. A limit leaves a clear margin over the current value, and its comment
  gives the reason. On 2026-10-08, the user approved the removal of the tests of the forms of the
  parametric body and of the hash of the skeletons
  ([`2026-10-08-cleanup.md`](../decisions/2026-10-08-cleanup.md)).
- Since 2026-10-14, the tests of the look, the fit, and the clearance of the animal bodies are
  paused ([`2026-10-14-test-pause.md`](../decisions/2026-10-14-test-pause.md)). The user
  iterates on the look of the animals, and each model round changed the targets of these tests.
  `PAUSED_TESTS` of `vite.config.ts` lists them in the Vitest project `paused`, in four groups:
  the clearance of the bodies, the fit of a pose to a body, the look of the bodies and the seats,
  and the layout from the footprints of the bodies, with a shot plan that the layout of one demo
  decides. `pnpm test` runs the project `unit`, which
  skips them. Thus CI, `tools/check-commits.sh`, and `tools/merge-branch.sh` skip them too.
  `pnpm test:paused` runs them for information. `pnpm test:paused --base <ref>` also runs them on
  a commit, and lists only the tests that fail on the working tree alone. The typecheck and the
  lint still read them, and each test helper stays. A section of this design that names a paused
  test as the check of a rule keeps the rule, and the check waits for the end of the pause.
- Since 2026-10-16, all tests are paused
  ([`2026-10-16-all-tests-pause.md`](../decisions/2026-10-16-all-tests-pause.md)). The user asked
  for the pause, because the tests took too long while the project changes fast. The switch
  `ALL_TESTS_PAUSED` of `vite.config.ts` makes each unit test file a paused test. `pnpm test` then
  runs no test and passes, so `tools/check-commits.sh`, `tools/merge-branch.sh`, and CI run no
  unit test. `pnpm test:paused` runs each unit test for information. The merge script and CI run
  no end-to-end test and no speed test (9.2, 9.8). While the pause lasts, a change adds no test,
  unless the user asks. The rules of this section stay, and their checks wait for the end of the
  pause.
- Node tests render audio offline with spessasynth_core.
- The demo tests of 8.3 and 8.5.
- A speed test (`*-speed.test.ts`) compares the time of its work with a fixed reference work in
  the same run (`src/test-speed.ts`), and keeps the least time of each over many rounds. No test
  compares a wall time with an absolute limit. Heavy load can still make a speed test fail, so
  the speed tests are a separate Vitest project. `pnpm test:perf` runs them one file at a time,
  in CI and on demand. Since 2026-10-16, CI does not run them (above). `pnpm test` runs the other tests, which check only the behavior, except
  the paused tests (above).
- The timeout of each test is 60 s, because the slowest tests take up to 13 s at a load average
  of 300.
- Vitest runs all tests of one file in one worker. Thus a slow sweep goes into several test
  files, so that no file takes more than about 10 s alone. The shared test goes into a
  `test-*.ts` helper beside them. The play clearance test has one file for each family of
  instruments (`pose/play-clearance-*.test.ts`, `pose/test-play-clearance.ts`).
- A sweep over the demos splits into a fixed number of shard files (`shardOf()` of
  `src/test-shards.ts`). Shard file `k` of `n` checks each demo whose index `i` in the demo list
  gives `i % n === k - 1`. Each index has one remainder, so each demo is in exactly one shard, and
  a new demo joins a shard with no new file. `src/test-shards.test.ts` fails when a shard has no
  file. The tests of the shot frames read `SHOT_DEMOS` (`shots/shot-frames-<k>.test.ts`,
  `shots/test-shot-frames.ts`). The chamber test files have their own file
  (`shots/shot-frames-chamber.test.ts`). The test of the conductor clearance reads all patched
  demos, and skips a demo with no conductor (`pose/conductor-clearance-<k>.test.ts`,
  `pose/test-conductor-clearance.ts`). The test of the pianist clearance reads the patched demos
  with a piano seat (`pose/pianist-clearance-<k>.test.ts`, `pose/test-pianist-clearance.ts`). The
  test of the violinist clearance reads the patched demos with a violin seat
  (`pose/violinist-clearance-<k>.test.ts`, `pose/test-violinist-clearance.ts`). It sweeps the
  first seated rabbit of each demo and each standing rabbit soloist, because a demo has many
  rabbits with one model. The demos have no standing rabbit, so a solo violin test file stands
  one for its own sweep (`pose/violinist-standing-clearance.test.ts`). The test of the flutist
  clearance reads the patched demos with a flute seat (`pose/flutist-clearance-<k>.test.ts`,
  `pose/test-flutist-clearance.ts`). It sweeps the first seated tan fox of each demo and each
  standing tan fox soloist, such as the soloist of K. 315.
- The clearance tests of the roles share one sweep (`pose/test-sweep.ts`,
  `pose/test-role-clearance.ts`). They are paused tests (above), and the sweep stays for
  `pnpm pose-depth`. `pose/test-sweep-roles.ts` gives each role its moving parts,
  its obstacles, its sample sets, its note targets, and its limits. In each sample, the sweep
  poses the skin of the GPU. It measures the depth of each point of the paws, the claws, the
  forearms, the upper arms, and a held part such as the baton or the bow in the closed body and
  in the closed shells of the instrument
  (`closedDepth()` of `pose/test-clearance.ts`). A cap on each open loop closes a part, and a
  point is inside when its winding number is more than 0.5. Each point stays at most the contact
  depth of the role in each obstacle. A depth past it is a named entry with its reason and its
  decision row. A note target gives the distance of a hand, or of the part that it holds, from
  its target: the palm of the pianist on its keys, the bow hair of the violinist on the
  strings in the middle of each stroke, and each palm of the flutist on its grip at the start of
  each phrase. The entry is a contract of contact that the look accepts, with a margin over the
  measure. `pnpm pose-depth <role>` prints the same depths. With `--base <ref>`, it also compares
  the deepest point of each species with a commit, in cm and in the H of each body, because a body
  that grows keeps its depths in H. Each probe of a commit runs on the source and the tools of the
  commit (`withProbeTree()` of `tools/ref-tree.ts`). `pnpm pose-depth <role> --gaps` also
  prints the smallest gap in each sample set from the head to each obstacle except the body, and
  from each paw to the body (`surfaceGap()` of `pose/test-clearance.ts`). A gap is 0 when the
  parts touch.
- The Playwright smoke test does these steps:
  1. Load the page.
  2. Play the default demo for 4 seconds, with the autoplay policy turned off. The count-in of
     1.617 s of the Boulanger demo (5.4) comes first.
  3. Make sure that the song time reads below 0 in the count-in, then increases past 2 s, that
     the canvas is not empty, and that the console shows no errors.
- `pnpm test:e2e` runs these steps with Playwright (`e2e/smoke.e2e.ts`) on the built site in
  `dist/`, so that CI tests the files that it deploys. Run `pnpm build` first.
  `playwright.config.ts` starts `vite preview` on the port of `ZOOPHONY_E2E_PORT` (4182 when it is
  not set), and stops it at the end. It has the
  projects `chromium`, `firefox`, and `webkit`.
- The built site has no dev hook. Thus `App` writes the song time into the attribute
  `data-song-time` of the stage canvas in all builds, with one decimal (`songTimeValue()`). The
  attribute changes about 10 times each second.
- `chromiumArgs()` (`tools/chromium-args.ts`) gives the Chromium flags of the browser checks:
  ANGLE on Metal on macOS, and ANGLE on SwiftShader (a software WebGL2) on Linux, where the CI
  runners have no GPU. Firefox gets the preferences that turn off its autoplay policy.
- The page of `pnpm test:e2e` is 960 × 600. With SwiftShader on the development Mac, a frame of
  1440 × 900 took about 0.3 s, and the song time of the page lagged by up to 0.4 s.
- The first frames after the click can take up to 1 s with SwiftShader. Then the page shows the
  song time 0 from before the click. Thus the increase of the song time starts at the first
  sample below 0.
- `pnpm test:e2e` also counts each failed request (HTTP status 400 or more) as an error. Thus it
  finds an absolute path that the base path of 9.2 does not hold.
- On 2026-10-05, `pnpm test:e2e` passed on macOS in Chromium with both sets of flags, in WebKit,
  and in Firefox.
- `pnpm smoke` runs these steps with `tools/smoke.ts` on the Vite dev server in headless
  Chromium, with the flags of `chromiumArgs()`. It also checks that the right arm of the
  first violin turns by at least 0.05 rad after the downbeat, so that the bow moves with the
  song time. Only the dev server gives the values of the page to the test, as
  `window.zoophony` (`src/app/dev-hook.ts`). Thus the build does not hold this hook.
- The smoke test also checks the camera of 2.5 and 5.6. The mode at the load is Cinematic, and
  Free with reduced motion. The camera moves by at least 0.08 m in play (the push-in of the
  opening after the downbeat, about 0.14 m in the Boulanger demo). After a pause, a drag of 6 px
  gives Free mode and moves the camera by at most 2.5 m, so the change has no jump (the drag
  turns the default view of the opening at about 21 m by about 2.4°). Then the "Automatic
  camera" button gives Cinematic, and the key C gives Free.

## 9.4 Manual test before each release

- Real Safari on macOS.
- Real Safari on iOS, also with the silent switch on (2.4).
- Android Chrome.

The author of spessasynth does not test on Safari, so this manual test is necessary.

## 9.5 Order of work

The steps put the largest risks first. Each step has its work and a "done" criterion. A step is
done only when its criterion is true and its review of 9.8 is done. The "Review" line of a step
names the images that the manager reads, and the code that gets a short review agent (9.8).
[`../TODO.md`](../../TODO.md) splits each step into tasks, and it holds the status of the work.

**Step 0. Project skeleton**

- Work: Vite, TypeScript with the compiler options of `AGENTS.md`, Vitest, Oxlint, oxfmt, the size
  check, the third-party license file, and the CI workflow. `.oxlintrc.json`, `.oxfmtrc.json`, and
  the anti-slop plugin are already in the repository. Install these development dependencies:
  the current version of `oxlint`, the same version of `@oxlint/plugins`, and the current
  version of `oxlint-tsgolint`, which the type-aware rules need.
- `pnpm lint` runs `oxlint --type-aware .`. `pnpm format` and `pnpm format:check` run oxfmt on
  explicit paths: `src`, the root config files, the TypeScript files of `e2e/`, and the
  TypeScript files of `tools/` outside `tools/oxlint/`. The anti-slop plugin keeps its own style (tabs and double quotes), so oxfmt
  does not format it.
- Done when: a clean clone runs `pnpm install`, then `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm format:check`, `pnpm build`, and `pnpm size` with no error. CI runs the same commands.
  `pnpm dev` shows an empty page with the background gradient of 4.5.

**Step 1. Audio spike**

- Work: the worklet with spessasynth_core, the Worker decode, the SF3 split, and the Beethoven
  demo in a bare page. The spike may use the MIDI parser of spessasynth_core to make the events
  of the Beethoven demo. Until 2026-10-05, the Beethoven demo was the default demo (8.2).
  Step 2 replaces it with `midi/` and `score/`, and then measures the targets for each demo. The
  spike checks these items:
  - Vite can bundle the worklet and the Worker.
  - There is no dropout at the first note of a sample after the Worker decode.
  - The clock (6.7) in Chrome, Firefox, and Safari.
  - A suspended AudioContext delivers messages to the worklet. If it does not, the banks go to
    the worklet at the first click.
  - The behavior in Safari and in a hidden tab.
- Done when: the spike page plays the Beethoven demo to the end in Chrome, Firefox, and Safari on the
  development Mac with no dropout. The targets of step 1 in 9.7 pass. A new report in
  `docs/research/` gives the result of each check, or the reason for each miss.
- Review: the manager reads the report. A change of a rule of the synth, such as the block
  scheduler or the clock, also gets the short review agent of 9.8.

**Step 2. MIDI and score**

- Work: `midi/` and `score/`, and the script that applies `demos/patches.json` (8.3). The demo
  tests need the changed files.
- Done when: each rule of section 3 has at least one Vitest test that fails without the rule. The
  demo tests of 8.5 pass for all demos. The step 2 targets of 9.7 pass: the score build, the
  audio render, and the memory.
- Review: each change of a rule of `midi/` or `score/` gets the short review agent of 9.8.

**Step 3. Scene and one player**

- Work: the stage, the light, the beam, the camera, and one rabbit with a violin. The bow moves
  in sync with the first violins of the Beethoven demo.
- Done when: a screenshot of the default view at 1440 × 900 has the same composition as the
  reference: the stage as a diamond shape, the beam from above, the dark background, and the
  view from behind the conductor. The clock target of 9.7 passes.
- Review: the manager compares the screenshot with the reference. No review agent runs (9.8).

**Step 4. Models and gallery**

- Work: `models/` for all species and instruments of 4.3, 4.5, and 4.6, the gallery page, and
  the scene layout: the stage origin, the stage size, the seat geometry, the risers, and the
  default view for a `Score` (4.5).
- Done when: the gallery shows each species with the instrument of its section. The triangle
  budget test passes. The scene of each demo has its seats and stage size from 4.5, with no
  overlap of chairs.
- Review: the manager examines screenshots of the gallery. No review agent runs (9.8).

**Step 5. Motion**

- Work: `pose/` for all instrument families, the idle motion, the rest pose, and the conductor.
  Also the app wiring that the review needs: load a demo, build the `Score`, build the scene,
  and play the audio with the poses in sync. A temporary play button is enough until step 6.
  Also a script in `tools/` that writes `perf-60.mid`, which the frame target of 9.7 uses. It
  has 60 s of notes on these seats, with 60 players in total: violins 1 (6), violins 2 (6),
  violas (4), cellos (4), contrabasses (3), flutes (3), oboes (3), clarinets (3), bassoons (3),
  horns (4), trumpets (3), trombones (3), tuba (1), timpani (1), percussion (4, one for each key
  group), harp (1), piano (1), and choir (7). Each seat plays chords with as many notes as its
  players, and the test uses the section size "One per part".
  `tools/write-perf-60.ts` writes the file into `perf/` from the seats of
  `src/models/test-perf-60.ts`, which the tests also use. Each seat starts one chord at the start
  of each second, and the chord sounds for 0.5 s, at 120 BPM. `pnpm dev` runs the script. The
  folder `perf/` is not in git and not in the build, so only the dev server serves the file.
  On the dev server, the hash `#demo=perf-60` shows it with "One per part", so that a later
  change can measure the frame target again (`pnpm frame`). The build ignores this
  id.
- Done when: the Vitest tests of `pose/` pass, and the pose and frame targets of 9.7 pass.
- Review: the manager examines a screen recording of the Beethoven demo and of the Boulanger
  demo. A change of the timing of `pose/` also gets the short review agent of 9.8.

**Step 6. UI**

- Work: the transport bar, the drawer, the seat list, the demo list, the settings, the credits,
  the quality tiers, "Reset view", the drop of a file, the URL hash, and the messages of 2.8.
- Done when: the UI matches [`prototype/ui.html`](../prototype/ui.html) at 1440 × 900 and at
  390 × 844. A keyboard alone can reach and use each control.
- Review: the manager examines screenshots at both sizes and the table of `pnpm keyboard`. No
  review agent runs (9.8).

**Step 6b. Cinematic camera**

- Work: the user asked on 2026-10-05 for an automatic camera (2.5). The pure module `shots/`
  with `prepareShots()` and `cameraAt()` (5.6), the two camera modes of `StageCamera`, the
  "Automatic camera" toggle and the key C, and the tests of the checklist of
  [`research/cinematic-camera.md`](../research/cinematic-camera.md).
- Done when: the tests of 5.6 pass for each demo, the two shot targets of 9.7 pass, the frame
  target of 9.7 passes in Cinematic mode, and the smoke test checks the camera.
- Review: the manager examines a frame of each kind of shot of each demo at both sizes
  (`pnpm screenshots <dir> --shots`) and a GIF of the Boulanger demo in Cinematic mode. No review
  agent runs (9.8).

**Step 7. Demo build, tests, and deploy**

- Work: the demo build (the changed files of step 2 go into the site), the Playwright tests, and
  the Pages workflow. The third-party license file comes from step 0 and grows with each new
  dependency.
- Done when: CI passes on `main`, with Playwright in Chromium. After the user creates the GitHub
  repository, the site deploys and plays the default demo.

## 9.6 Docs

All docs, comments, commit messages, and UI text use ASD-STE100 Simplified Technical English. The
project `AGENTS.md` holds the short rules for coding agents and links to this document.

## 9.7 Targets

The development Mac is an Apple M1 Max with Chrome. The research timings also come from this
machine.

| Target | Value | How to measure | Step |
|---|---|---|---|
| First download | less than 1 MB after gzip | the size check (7.2) in CI | 0 |
| Score build | at most 100 ms for the largest demo on the development Mac | a timed Vitest test (`score/score-speed.test.ts`, `pnpm test:perf`), as a ratio to a reference work in the same run (below) | 2 |
| Clock | `Player.now()` within 20 ms of the audible time | Node: an offline render shows each note on within one block (2.7 ms) of its scheduled time. Browser: the spike compares the two clock methods of 6.7. | 1, 3 |
| Pose timing | each note event of `poseAt()` within 5 ms of the note time in the `Score`, before the seeded offset | Vitest | 5 |
| Seeded offset | at most ±20 ms for each player | Vitest | 5 |
| Audio render | at most 1.3 ms for each 128-frame block (half of the budget) for each demo | Node: an offline render of each demo with the block scheduler and spessasynth_core, timed for each block (`node tools/measure-targets.ts`). The script also times the block of a seek near the end of the largest demo, and the block of a solo of one seat and of its end at 60 % of each demo (6.6) | 2 |
| Frame time | high tier, `perf-60.mid` (60 players), development Mac: GPU time and main-thread time each at most 4 ms for 95% of the frames | `pnpm frame` (`tools/measure-frame.ts`): Google Chrome at 1440 × 900 and the device scale 2. The main-thread time is the sum of the tasks of each frame in a Chrome performance trace of 10 s at 60 fps, after a CPU use of at most 40% over 5 s. The GPU time is the time of each WebGL frame in a Metal System Trace of 3 s with no frame cap, so that the GPU runs at its highest clock, with the guards and the self-check below. Each trace starts after a seek to a fixed song time. The tool also prints the timer query of `EXT_disjoint_timer_query_webgl2` with no frame cap and at 60 fps, for information | 5 |
| Load | the presets of the default demo load and decode in at most 2 s on a 50 Mbit/s connection | DevTools network throttle | 1 |
| First sound | the first note sounds at its song time after the downbeat (song time 0), at most one block (2.7 ms) early and never late. The count-in starts at most 300 ms after the click on play, when the default demo is ready | Node: `audio/clock-render.test.ts` and `audio/engine.test.ts` render a play with a count-in offline. Browser: `performance.now()` at the click, against the first clock anchor plus the output latency | 1 |
| Memory | at most 100 MB of decoded samples for each demo | the `Player` reports the PCM size of the banks of the synth (`pcmBytes`). Node: `audio/pcm-memory.test.ts` converts the presets of each demo as the Worker does | 2 |
| Shot plan | `prepareShots()` at most 20 ms for the largest demo on the development Mac | the least time of many plans on the development Mac. The timed Vitest test (`shots/shots-speed.test.ts`) finds a plan that is 2 times slower, and its limit is above 20 ms on that Mac (below) | 6b |
| Camera | `cameraAt()` at most 0.01 ms for each call | the same timed Vitest test | 6b |
| Model shading | `shadeMesh()` (4.5, materials) of the player models and the props of `perf-60.mid` at most 90 ms on the development Mac, 2 times the time of 2026-10-06 | a timed Vitest test (`models/shading-speed.test.ts`), as a ratio to the reference work | 8 |

The user asked on 2026-10-05 for the automatic camera (2.5). Thus the targets of the shot plan
and of the camera of a frame (5.6) join the table. The frame target also holds in Cinematic mode.

The user decided on 2026-10-05 that a play starts with the count-in of the conductor (5.4, 6.5).
Thus the first sound target measures from the downbeat (song time 0) to the first sound, and
no longer from the click. The click now starts the count-in, so the 300 ms apply to its start.

On 2026-10-05, the Boulanger demo became the default demo (2.2). The targets that depend on the
default demo pass with it ([`research/default-demo.md`](../research/default-demo.md)):

- First download: 223,143 B after gzip, with 30,097 B for the demo file.
- Load: 17 preset files of 2,331,290 B, which take 0.373 s at 50 Mbit/s. In Chrome with the
  DevTools throttle, they load and decode in 659 ms (median) and 681 ms (max) over 5 runs. The
  Beethoven demo (11 files, 1,513,876 B) took 533 ms and 552 ms in the same session.
- Memory: 9,039,086 B of decoded samples (`pcmBytes`), the same value as the Node test.
- Count-in: `T` is 1.017 s, against 1.225 s for the Beethoven demo (5.4). Since the ready pause
  of 1.2 s (user feedback of 2026-10-05, 5.2), `T` is 1.617 s and 1.825 s.

On 2026-10-05, the orchestral SoundFont of 6.2 replaced GeneralUser GS. The targets that depend
on the samples have these values on the development Mac. Other agents loaded the machine during
the measures (load average 25 to 166), so the times are high.

- Load: the preset files of each demo were 2,969,292 B (Grieg) to 9,358,224 B (Boulanger, 17
  files, 1.50 s at 50 Mbit/s). In Chrome with the DevTools throttle, the default demo (Boulanger)
  loads and decodes in 1,941 ms (median) and 1,998 ms (max) over 5 runs. The Beethoven demo took
  1,312 ms and 1,377 ms, and the Mozart K. 488 demo 1,778 ms and 1,792 ms. The default demo thus
  passes with a margin of 2 ms. The Node decode of the Boulanger presets takes 770 ms.
- Memory: 18,071,790 B (Grieg) to 62,174,356 B (Boulanger) of decoded samples. Chrome reported the
  same `pcmBytes` as the Node test.
- After the user decision of 2026-10-05 (8.2), the preset files of each demo are 2,327,090 B
  (Eine kleine Nachtmusik, 3 files) to 9,358,224 B (Boulanger, 17 files), and the decoded samples
  13,796,144 B to 62,174,356 B in Node. The Beethoven 9 demo needs 14 files of 7,016,612 B
  (1.12 s at 50 Mbit/s) and 46,479,312 B of decoded samples. The default demo did not change.
- Audio render: the median and the p99 of a block did not change. In Node, 140 s of the Handel
  demo gave a p99 of 0.227 ms against 0.237 ms with GeneralUser GS, with the same voice count.
  `node tools/measure-targets.ts` gave blocks above 1.3 ms in five demos in one run and in all
  six in another. The two runs did not agree, so the machine load caused these blocks. A run on a
  quiet machine must confirm the target. These measures ran before the removal of the Handel
  demo on 2026-10-05, so they count six demos.

The step 2 results are in [`research/step-2-targets.md`](../research/step-2-targets.md). The step 5
frame results are in [`research/step-5-frame.md`](../research/step-5-frame.md): main-thread p95
2.95 ms and GPU p95 2.27 ms on 2026-10-05. Then the bones stopped the update of their Euler
angles (`scene/player.ts`). Two runs of the same day gave the main-thread p50 1.74 ms and p95
2.03 to 2.06 ms, against 2.01 to 2.12 ms and 2.36 to 2.46 ms just before (review of step 5,
F13).

The pose tests of step 5 (`pose/pose-timing.test.ts`) sample the pose every 0.5 ms around each
note. Each note event of the bowed strings falls on the sample of its note time plus the seeded
offset, in a test file and in the first 10 s of the Bach demo. The demo parts of the other tests
are the winds and the beats of the Beethoven 8 demo, the harpsichord of the Bach demo, and the
timpani and the singers of the Beethoven 9 demo. Until 2026-10-05, the strings, the winds, the
timpani, and the beats came from the Beethoven 5 demo, and the piano from the Mozart K. 488
demo. A test file of 2/4 at 192 BPM now checks the beats of pattern 1. `pose/pose-speed.test.ts`
times `poseAt()` on the development Mac: 0.12 ms for the 60 players of `perf-60.mid`, and 0.12 ms
for 60 bowed string players (2026-10-05). Before the math of three.js replaced the tuple math
(7.1), they were 0.37 ms and 0.47 ms. The test also times a fixed reference work of float
math (`src/test-speed.ts`), 2.64 ms on that Mac, in turn with the poses. It takes the least time of each over 60 short
rounds, because load only adds time. It fails when the ratio of the pose time to the reference
time is more than 2 times its value on the development Mac. Thus the limits stay below 1 ms on
that Mac, a pose that is 3 times slower fails, and a loaded or a slower machine passes.

`score/score-speed.test.ts` checks the score build target with the same method. It times
`buildScore()` of the Boulanger demo and the reference work in turn, and takes the least time of
each over 40 rounds. On the development Mac, the build takes about 16 ms, 6.1 to 6.6 times the
reference work at a load average of 25 (2026-10-05). The test fails when the ratio is more than
13, 2 times 6.5. Thus the limit is about 34 ms on that Mac, below the 100 ms of the target, and a
build that is 3 times slower fails. An absolute limit of 100 ms failed when the Mac was under
load: a build took 124 ms at a load average of 174. With 8 more busy processes, at a load average
of 170 to 300, the ratio was 5.7 to 8.1, and the test passed. A script with 16 busy processes,
at a load average of 260 to 330, gave ratios up to 8.9 with 20 rounds, and up to 6.3 with 40.

On 2026-10-05, `node tools/measure-frame.ts` measured `perf-60.mid` in both camera modes (2.5)
in the same session, after the SoundFont and the beam rule of 5.6. Free mode at the default view
(`--free`, with reduced motion): main-thread p95 2.50 to 2.62 ms and GPU p95 2.26 to 2.39 ms.
Cinematic mode, over the conductor, section, and solo shots of the song times 3 to 23 s:
main-thread p95 2.54 to 2.66 ms and GPU p95 3.11 to 3.36 ms. A close shot fills more pixels of
the image with lit and shadowed faces, so the GPU time grows, and the target still passes. One
run of Free mode gave a GPU p95 of 4.85 ms while other agents used the GPU, and the next two runs
gave 2.26 and 2.39 ms. Before this session, the GPU probe of the tool read the
WebGL2 context of the check of 2.6, which draws nothing, and gave no GPU values. The probe now
reads the context of the canvas `#stage`.
After the fade of the beam in the close shots (5.6), one run of Cinematic mode over the same song
times gave main-thread p95 2.23 ms and GPU p95 3.50 ms (2026-10-05).
After the camera and stage fixes of the UX audit (the light on the face of the conductor, the
shadow bias, and the new shots, 2026-10-06), one run of Cinematic mode gave main-thread p95
2.44 ms and GPU p95 3.77 ms, with 99.5% of the GPU frames within 4 ms, at 60.1 fps.

`shots/shots-speed.test.ts` times the shots in the same way (5.6). Each limit is 2 times the
ratio of its work to the reference work of `src/test-speed.ts` on the development Mac, and the
test file gives the ratio of record. The sight lines, the entry shots, and the bodies of
2026-10-07 and 2026-10-08 made the plan of the Boulanger demo slower: the new bodies block more
lines of sight, so the planner tests more cameras. Thus the limit of `prepareShots()` is above
the 20 ms of the target. The test finds a plan that is 2 times slower, and a measure on the
development Mac checks the target.

On 2026-10-13, the manager changed the condition of the GPU measure, and told the user
([`2026-10-13-frame-time.md`](../decisions/2026-10-13-frame-time.md)). The facts are in
[`research/2026-10-13-frame-time.md`](../research/2026-10-13-frame-time.md):

- At 60 fps, the GPU of the development Mac stays in its lowest performance state for about 77%
  of the time. It lowers its clock while the frames fit. Thus the timer query at 60 fps measures
  the clock more than the work, and a cheaper frame can give a higher value.
- With no frame cap, the GPU runs at its highest clock. On ANGLE on Metal, a timer query gets the
  time of the whole command buffer, also its wait in the queue of the GPU. With no frame cap,
  the queue is always full, so the timer query with no frame cap is for information only.
- The Metal System Trace of Xcode gives the start and the end of each encoder on the GPU. The
  GPU time of a frame is the time in which at least one encoder of the WebGL frame runs
  (`tools/gpu-trace.ts`). A WebGL frame starts at the command buffer with the clear of the
  drawing buffer, and it holds each WebGL command buffer until the next start. Each frame writes
  the canvas in two command buffers: the clear, then the final pass. The trace sometimes gives
  no label to the clear. Then a frame also starts at a command buffer that writes the canvas
  after the final pass of the frame. A command buffer with the clear or a write of the canvas
  counts, also when the trace puts a surface of the display into it. Each other command buffer
  that reads or writes a surface of another size than the drawing buffer is work of the
  compositor of Chrome, and it does not count. The first version of the filter also dropped the
  first command buffer of each frame, about 0.7 ms (review of 2026-10-13). The trace also gives the
  GPU work of the other processes. A page of another browser that renders shares the GPU and makes
  the frames slower, so the tool prints that share and a warning above 10%.
- Each change of `src/scene/`, of a shader, or of the post effects runs `pnpm frame` before its
  report (`AGENTS.md`). CI has no GPU. The user paused this rule on 2026-10-14 (below).

On 2026-10-13, after the frame-time rounds, the manager added guards and checks to the measure
([`2026-10-13-frame-tools.md`](../decisions/2026-10-13-frame-tools.md)). The facts are in
[`research/2026-10-13-frame-retro.md`](../research/2026-10-13-frame-retro.md):

- The main-thread phase starts when the CPU use of all cores over 5 s is at most 40%. The tool
  starts no process before it, so the use is the use of the other processes. The 1-minute load
  average falls slowly after the save of a Metal trace, so it is for information only.
- The GPU phase has no CPU gate. Its result is valid when the GPU is in its "Maximum" state for
  at least 90% of the state time of the trace, the rows of "Maximum" cover at least 60% of the
  span of the GPU intervals, and other processes use the GPU in at most 10% of the trace. The
  open state at each end of the trace has no row, so the share of the state time alone passes
  one short row of "Maximum". Else the tool records the GPU phase one more time, and then exits
  with 2.
- A self-check guards the GPU row against the faults of its filter. It uses only the sizes of the
  surfaces. It prints the time of the command buffers that the filter dropped in each frame, the
  WebGL frames against the count that the canvas writes of the trace give (two in each frame),
  and the frames with more than two writes of the canvas. The count takes the canvas writes of
  the whole trace of the GPU process of Chrome, less the writes of the partial frames at its two
  ends. Thus a filter that loses frames cannot lower its own expected count. The GPU row fails
  when the filter gives no frame, when the dropped canvas buffers take more than 0.1 ms in each
  frame, when the count is more than 2% off, or when a frame holds more than two writes of the
  canvas. The check finds the buffers that a filter drops and the frames that it merges. It
  cannot find a buffer that a filter adds to a frame by mistake, such as a buffer of the
  compositor, because the frame count and the canvas writes of each frame stay the same. The frame
  rate of the page in the middle half of the record gives a second count for information. The page
  drew 1.1% to 2.7% more frames than the trace holds in four runs, so that count cannot fail the
  row. On the 18 kept traces of the rounds, the check passes with the filter of the tip, and it
  fails with each filter that reached a review (`e584e16f` and `332d09ba`) where that filter gave
  other frames.
- The tool seeks to 32 s before the Chrome trace and to 16 s before the Metal trace. Each trace
  then lies in one section shot of `perf-60.mid` with the depth of field, so two runs measure the
  same shots.

On 2026-10-14, the user paused the frame test until a sweep of the performance work
([`2026-10-14-test-pause.md`](../decisions/2026-10-14-test-pause.md)). Until the sweep starts, a
change of `src/scene/`, of a shader, or of the post effects does not run `pnpm frame` before its
report. The frame target, `pnpm frame`, and its unit tests stay, and the sweep measures the target
again.

The frame target leaves a margin of about 4 times for an integrated GPU of the Intel Iris Xe class.
The manual release test (9.4) checks a real phone at the low tier: the default demo must play at
30 fps or more.

## 9.8 Reviews

A review checks the work of a step or a round before its merge. On 2026-10-04, the user decided
a review agent for each step. On 2026-10-14, the user asked: "is the review round really useful?
skip it if not necessary". The three reviews of that day found old claims in docs, wording, one
missing test, and three faults of tools. No finding was a fault that shows in the app. Thus the
manager replaced the review of each step with the rule below
([`2026-10-14-review-rule.md`](../decisions/2026-10-14-review-rule.md)).

`tools/merge-branch.sh` checks each commit with the lint, the typecheck, the format check, and
the tests that the commit reaches. Then it runs the full `pnpm test`, the build, the size check,
and the end-to-end tests. Since 2026-10-16, all tests are paused (9.3): `pnpm test` runs no test,
and the merge script skips the end-to-end tests. The user judges the look from the images. A review agent thus runs
only for code whose faults these checks and the images do not show:

| Kind of round | Review |
|---|---|
| The look of the scene, the UI, or a model, a docs round, or a change of the test setup | No review agent. The manager reads the report and looks at the images. The merge script runs the checks. |
| A change of tool code that deletes files, starts processes, or changes the git state | A short review agent, about 10 minutes, on the code only. |
| A change of a rule of the pure core: `midi/`, `score/`, the timing of `pose/`, or the synth | A short review agent, about 10 minutes, on the code only. |

The timing of `pose/` is the time of each motion against the notes and the transport. Examples
are the note times, the lift, the lowering, and the pose after a seek. The synth includes the
worklet, the block scheduler, and the clock. `models/`, `shots/`, and the look of a pose are pure
modules too. Their faults show in the gallery, the shot frames, and the close views, so they get
no review agent. A round of more than one kind gets the short review agent for the code of the
last two rows.

A review agent is an independent agent that did not do the work of the round. It does these
checks:

1. It runs `tools/check-commits.sh --tip main` in a worktree of the branch (`AGENTS.md`).
2. It reads the diff of the code of its kind. It checks the correctness, the rules of
   `AGENTS.md`, and the edge cases. For a tool, these are the stop paths, the removed files, the
   ports, and the git state. For the pure core, these are the rules of its design section.
3. It runs the break command of each new test with `tools/break-test.sh`, and reads the test
   that fails.
4. It reports each finding with its file and line. It runs no image tool and no probe of a body.

The implementation agent or a fix agent makes each change that the review requests as a commit
on the same branch. The manager reads the report of the fixes, and the merge script runs the
checks. A second review runs only when the manager asks for it.

The manager and the user judge the look from images. At the end of a step or a round of the
look, take the images with Playwright at 1440 × 900 and at 390 × 844. `pnpm screenshots <dir>`
takes them (`tools/screenshots.ts`). For a motion step, also record a GIF of 10 s.
`pnpm screenshots <dir>` shows each demo at 1440 × 900 and the default demo at 390 × 844.
`pnpm screenshots <dir> --play` adds the default demo and the Beethoven 9 demo at 1440 × 900,
and the default demo at 390 × 844, after 6 s of play. `pnpm screenshots <dir> --ui` adds the
default demo at both sizes on the first screen and after 4 s of play with the drawer open, at the
sizes of the prototype screenshots. `pnpm screenshots <dir> --drawer` adds, after 4 s of play at
both sizes, the open seat list with the cellos muted, the settings, the credits, and the drop
overlay. `pnpm screenshots <dir> --load` adds, at both sizes, the first screen while the samples
load, the message of a failed load with the drawer open, and the full-page message of a browser
with no WebGL2. `pnpm screenshots <dir> --shots` adds, for each demo at both sizes, one frame of
each kind of camera shot of 5.6 in its plan: it plays the demo, seeks into the first shot of the
kind, and waits 1.5 s. The play shots of `--play`, `--ui`, and `--drawer` show the automatic
camera of 2.5. For a round of a body, `pnpm close-views species <species,...> <dir>` shows the
species alone on their seats at named views (7.1). `pnpm close-views play <dir>` shows a demo
during play at the default view of "Reset view". `--camera violins` shows it low from the front
left, close to the violins, as the frame of the user of 2026-10-16. With `--base main`, both
modes put the images of `main` above the images of the branch. For the UI of step 6,
`pnpm keyboard` (`tools/keyboard-check.ts`) also checks each control with the keyboard alone at both
sizes, and prints a table of the results. Give the images to the manager with the report, and
name the targets of the step with their results.

When a step is done, start the next step. Do not wait for the user. After the last step, the
user examines all steps together, with the screenshots and the GIFs of each step.
