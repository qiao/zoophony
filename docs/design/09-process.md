# 9. Process

## 9.1 Repository

- Git, with the branch `main`. Each step of the work has many fine-grained commits.
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
| Vitest | yes |
| Vitest speed tests (`pnpm test:perf`, 9.3) | yes |
| Size check (7.2) | yes |
| Playwright in Chromium | yes |
| Playwright in WebKit and Firefox | no, until the runs are stable |
| Keyboard check (`pnpm keyboard`) | not in CI |

Headless WebKit and Firefox on Linux have weak support for WebGL2 and for audio output. Thus their
runs do not block a merge.

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
  Then it runs `pnpm test:e2e --project=chromium` under `/zoophony/`. Then
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
- Node tests render audio offline with spessasynth_core.
- The demo tests of 8.3 and 8.5.
- A speed test (`*-speed.test.ts`) compares the time of its work with a fixed reference work in
  the same run (`src/test-speed.ts`), and keeps the least time of each over many rounds. No test
  compares a wall time with an absolute limit. Heavy load can still make a speed test fail, so
  the speed tests are a separate Vitest project. `pnpm test:perf` runs them one file at a time,
  in CI and on demand. `pnpm test` runs all other tests, which check only the behavior.
- The timeout of each test is 60 s, because the slowest tests take up to 13 s at a load average
  of 300.
- The Playwright smoke test does these steps:
  1. Load the page.
  2. Play the default demo for 4 seconds, with the autoplay policy turned off. The count-in of
     1.617 s of the Boulanger demo (5.4) comes first.
  3. Make sure that the song time reads below 0 in the count-in, then increases past 2 s, that
     the canvas is not empty, and that the console shows no errors.
- `pnpm test:e2e` runs these steps with Playwright (`e2e/smoke.e2e.ts`) on the built site in
  `dist/`, so that CI tests the files that it deploys. Run `pnpm build` first.
  `playwright.config.ts` starts `vite preview` on port 4182, and stops it at the end. It has the
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
- The smoke test also checks the camera of 2.5 and 5.6: the mode at the load is Cinematic, and
  Free with reduced motion; the camera moves by at least 0.08 m in play (the push-in of the
  opening after the downbeat, about 0.14 m in the Boulanger demo);
  after a pause, a drag of 6 px gives Free mode and moves the camera by at most 2.5 m, so the
  change has no jump (the drag turns the default view of the opening at about 21 m by about
  2.4°); then the "Automatic camera" button gives Cinematic, and the key C gives Free.

## 9.4 Manual test before each release

- Real Safari on macOS.
- Real Safari on iOS, also with the silent switch on (2.4).
- Android Chrome.

The author of spessasynth does not test on Safari, so this manual test is necessary.

## 9.5 Order of work

The steps put the largest risks first. Each step has its work and a "done" criterion. A step is
done only when its criterion is true. A step with a review is done only after the review agent
approves it (9.8). [`../TODO.md`](../../TODO.md) splits each step into tasks, and it holds the status of the
work.

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
- Review: the review agent reads the report.

**Step 2. MIDI and score**

- Work: `midi/` and `score/`, and the script that applies `demos/patches.json` (8.3). The demo
  tests need the changed files.
- Done when: each rule of section 3 has at least one Vitest test that fails without the rule. The
  demo tests of 8.5 pass for all demos. The step 2 targets of 9.7 pass: the score build, the
  audio render, and the memory.

**Step 3. Scene and one player**

- Work: the stage, the light, the beam, the camera, and one rabbit with a violin. The bow moves
  in sync with the first violins of the Beethoven demo.
- Done when: a screenshot of the default view at 1440 × 900 has the same composition as the
  reference: the stage as a diamond shape, the beam from above, the dark background, and the
  view from behind the conductor. The clock target of 9.7 passes.
- Review: the review agent compares the screenshot with the reference.

**Step 4. Models and gallery**

- Work: `models/` for all species and instruments of 4.3, 4.5, and 4.6, the gallery page, and
  the scene layout: the stage origin, the stage size, the seat geometry, the risers, and the
  default view for a `Score` (4.5).
- Done when: the gallery shows each species with the instrument of its section. The triangle
  budget test passes. The scene of each demo has its seats and stage size from 4.5, with no
  overlap of chairs.
- Review: the review agent examines screenshots of the gallery.

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
  change can measure the frame target again (`tools/measure-frame.ts`). The build ignores this
  id.
- Done when: the Vitest tests of `pose/` pass, and the pose and frame targets of 9.7 pass.
- Review: the review agent examines a screen recording of the Beethoven demo and of the Boulanger
  demo.

**Step 6. UI**

- Work: the transport bar, the drawer, the seat list, the demo list, the settings, the credits,
  the quality tiers, "Reset view", the drop of a file, the URL hash, and the messages of 2.8.
- Done when: the UI matches [`prototype/ui.html`](../prototype/ui.html) at 1440 × 900 and at
  390 × 844. A keyboard alone can reach and use each control.
- Review: the review agent examines screenshots at both sizes.

**Step 6b. Cinematic camera**

- Work: the user asked on 2026-10-05 for an automatic camera (2.5). The pure module `shots/`
  with `prepareShots()` and `cameraAt()` (5.6), the two camera modes of `StageCamera`, the
  "Automatic camera" toggle and the key C, and the tests of the checklist of
  [`research/cinematic-camera.md`](../research/cinematic-camera.md).
- Done when: the tests of 5.6 pass for each demo, the two shot targets of 9.7 pass, the frame
  target of 9.7 passes in Cinematic mode, and the smoke test checks the camera.
- Review: the review agent examines a frame of each kind of shot of each demo at both sizes
  (`pnpm screenshots <dir> --shots`) and a GIF of the Boulanger demo in Cinematic mode.

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
| Frame time | high tier, `perf-60.mid` (60 players), development Mac: GPU time and main-thread time each at most 4 ms for 95% of the frames over 10 s | Google Chrome at 1440 × 900 and the device scale 2 (`node tools/measure-frame.ts`). The main-thread time is the sum of the tasks of each frame in a Chrome performance trace. The GPU time is a query of `EXT_disjoint_timer_query_webgl2` around each frame callback, because the GPU track of DevTools shows the CPU time of the GPU process | 5 |
| Load | the presets of the default demo load and decode in at most 2 s on a 50 Mbit/s connection | DevTools network throttle | 1 |
| First sound | the first note sounds at its song time after the downbeat (song time 0), at most one block (2.7 ms) early and never late. The count-in starts at most 300 ms after the click on play, when the default demo is ready | Node: `audio/clock-render.test.ts` and `audio/engine.test.ts` render a play with a count-in offline. Browser: `performance.now()` at the click, against the first clock anchor plus the output latency | 1 |
| Memory | at most 100 MB of decoded samples for each demo | the `Player` reports the PCM size of the banks of the synth (`pcmBytes`). Node: `audio/pcm-memory.test.ts` converts the presets of each demo as the Worker does | 2 |
| Shot plan | `prepareShots()` at most 20 ms for the largest demo on the development Mac | a timed Vitest test with the reference work of `pose/pose-speed.test.ts` (`shots/shots-speed.test.ts`) | 6b |
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

`shots/shots-speed.test.ts` times the shots in the same way (5.6). On 2026-10-05 on the
development Mac, `prepareShots()` took 8.6 ms for the Boulanger demo, the slowest of the five
demos, and `cameraAt()` took 0.15 µs for each call. Each limit is 2 times its ratio to the
reference work of `src/test-speed.ts`, about 17 ms and 0.3 µs on that Mac. The prototype of the report took 30 to 94 ms
for a plan, with no broad phase before the box tests. On 2026-10-06, the sight lines and the
foreground rule of 5.6 (UX audit 2026-10-05, SC1) made the Boulanger plan 12.2 ms (the ratio
4.2), after the planner kept the sight lines of each subject, tested the cheap rules of a move
first, and filled the arrays of `prepareMusic()` with plain loops. The full search of an entry
(5.6) made it 13 ms (the ratio 4.5). The limit stays 6.4, about 18 ms, below the 20 ms of 9.7.

The frame target leaves a margin of about 4 times for an integrated GPU of the Intel Iris Xe class.
The manual release test (9.4) checks a real phone at the low tier: the default demo must play at
30 fps or more.

## 9.8 Reviews

The user decided this process on 2026-10-04. A review agent is an independent agent that did not
do the work of the step. It reviews the step against this design. A step with a review ends with
these actions:

1. Commit the work of the step.
2. Take the screenshots with Playwright at 1440 × 900 and at 390 × 844. `pnpm screenshots
   <dir>` takes them (`tools/screenshots.ts`). For a motion step, also record a GIF of 10 s.
   `pnpm screenshots <dir>` shows each demo at 1440 × 900 and the default demo at 390 × 844.
   `pnpm screenshots <dir> --play` adds the default demo and the Beethoven 9 demo at 1440 × 900,
   and the default demo at 390 × 844, after 6 s of play. `pnpm screenshots <dir> --ui` adds the
   default demo at both sizes on the first screen and after 4 s of play with the drawer open,
   at the sizes of the prototype screenshots. `pnpm screenshots <dir> --drawer` adds, after 4 s
   of play at both sizes, the open seat list with the cellos muted, the settings, the credits,
   and the drop overlay. `pnpm screenshots <dir> --load` adds, at both sizes, the first screen
   while the samples load, the message of a failed load with the drawer open, and the full-page
   message of a browser with no WebGL2. `pnpm screenshots <dir> --shots` adds, for each demo
   at both sizes, one frame of each kind of camera shot of 5.6 in its plan: it plays the demo,
   seeks into the first shot of the kind, and waits 1.5 s. The play shots of `--play`, `--ui`,
   and `--drawer` show the automatic camera of 2.5.
   For the UI of step 6, `pnpm keyboard` (`tools/keyboard-check.ts`) also checks each control
   with the keyboard alone at both sizes, and prints a table of the results.
3. Give the files to the review agent, and name the targets of the step with their results.
4. Make each change that the review agent requests as a commit in the same step. Then send the
   step to the review agent again.

When the review agent approves the step, start the next step. Do not wait for the user. After the
last step, the user examines all steps together, with the screenshots and the GIFs of each review.
