# Test pause (2026-10-14)

On 2026-10-14, the user said: "we have too many tests right now. disable the unnecessary ones for
now. especially because we're now constantly iterating on the design / look&feel of the animal
models. also, disable the frame test for now. we can do a sweep of performance improvements
later." This report gives the measures behind the decisions of
[`2026-10-14-test-pause.md`](../decisions/2026-10-14-test-pause.md). The probes and their output
are in the folder [`2026-10-14-test-pause/`](2026-10-14-test-pause/).

## The method

- The base is `d46d7fbe` of `main`. Its `pnpm test` ran with a JSON report.
- `test-times.ts` reads a report and gives the run time and the test count of each file. It also
  counts the commits of the base from 2026-10-10 to 2026-10-14 that changed each test file. The
  time of a file is the run time of its tests in its worker, with no import and no collection.
  Its output for the base is `before-times.tsv`, and for `pnpm test` on the tip
  `after-times.tsv`.
- `classify.ts` reads `before-times.tsv`, puts each file into a group, and prints the tables of
  this report. It asks Vitest for the files of the project `paused`, and stops when its groups
  and the list of `vite.config.ts` differ.
- `ab.sh` runs the base set (the projects `unit` and `paused` together, the same 224 files as the
  base) and the new set (the project `unit`) in turn, two times each, on the tip of the branch.
  The test files and the sources are those of the base. Only the configuration differs.
  `ab.txt` gives the load before each run and the span of each JSON report.

Run these commands from the repository root.

```bash
P=docs/research/2026-10-14-test-pause
pnpm exec vitest run --project unit --reporter=json --outputFile=<report.json>
node $P/test-times.ts <report.json> '2026-10-10 00:00' '2026-10-15 00:00' d46d7fbe > <times.tsv>
node $P/classify.ts $P/before-times.tsv
$P/ab.sh <dir>
```

## The tests of the base

The base had 229 test files: 224 in `pnpm test` and 5 speed tests of `pnpm test:perf`. The 224
files held 2,347 tests (2,325 passed, 22 skipped), and their file times added up to 634.7 s
(`before-times.tsv`). The run took 121.6 s with a load average of about 46.

Of the 960 commits of the base from 2026-10-10 to 2026-10-14, 227 changed a test file. These
files had the most edits, also a file that a later commit removed:

| File | Edits | Kind of edit |
|---|---|---|
| `src/models/species.test.ts` | 18 | the forms, the colors, and the budgets of new bodies |
| `tools/measure-frame.test.ts` | 17 | the features of `pnpm frame` |
| `src/pose/bowed.test.ts` | 14 | the holds of the violin on new bodies |
| `tools/studio-body.test.ts` | 13 | the features of `pnpm studio-body` |
| `src/pose/hands.test.ts` | 13 | the rest pose and the reach of the pianist |
| `src/models/rigged-body.test.ts` | 13 | the rigged bodies, removed on 2026-10-11 |
| `src/models/player.test.ts` | 12 | the instruments and the chairs of new bodies |
| `tools/gpu-trace.test.ts` | 11 | the features of `pnpm frame` |
| `src/models/props.test.ts` | 11 | the seats that fit the legs of new bodies |

The commands of these counts:

```bash
W=(--since='2026-10-10 00:00' --until='2026-10-15 00:00')
git log d46d7fbe $W --format=%h | wc -l                   # 960
git log d46d7fbe $W --format=%h -- '*.test.ts' | wc -l   # 227
git log d46d7fbe $W --name-only --format= -- '*.test.ts' | sort | uniq -c | sort -rn | head
```

A test of a tool changes with the features of its tool. A test of the look, the fit, or the
clearance of a body changes with each new body or each new hold, and finds no fault. The kept
files with the most edits test a tool or a mechanism, and they changed with its features, such
as `tools/measure-frame.test.ts` (17) and `src/scene/player.test.ts` (8).

## The rule of the choice

A test stays when it guards a rule that the look of an animal does not change, or a crash. A test
pauses when it checks the look or the geometry of a body or a seat, the fit of a pose to a body,
the clearance of a body, the layout from the footprints of the bodies, or a pose of a sheet page
or of the gallery. A file goes into the group of its main checks, and a file stays when the
choice is not clear. The decision file gives the full rule and the mixed files.

## The groups

`classify.ts` gives this table from `before-times.tsv`. The time is the file time of the base
run, and the edits count the commits of the model rounds.

| Group | Action | Files | Tests | Time (s) | Edits | Reason |
|---|---|---|---|---|---|---|
| Clearance of the bodies | pause | 16 | 48 | 427.9 | 17 | Sweeps the posed skin of a body against the body and the instrument. |
| Fit of a pose to a body | pause | 10 | 92 | 34.5 | 61 | Checks where a pose puts the paws, the instrument, or the feet of a body. |
| Look of the bodies and the seats | pause | 7 | 182 | 3.4 | 53 | Checks the forms, the colors, the sizes, or the triangles of a body or a seat. |
| Layout from the footprints | pause | 2 | 38 | 12.9 | 5 | Checks the stage and the gaps that the footprints of the bodies give. |
| MIDI and score | keep | 16 | 343 | 17.1 | 2 | Guards a rule of the MIDI file or of the score (One score). |
| Audio engine and scheduler | keep | 14 | 136 | 11.1 | 1 | Guards the synth, the clock, the decode, or the block scheduler. |
| App and UI | keep | 28 | 253 | 4.6 | 8 | Guards the app state, the URL, the transport, or the UI. |
| Pose rules | keep | 25 | 253 | 44.3 | 22 | Guards a motion rule that reads no form of a body. |
| Model code | keep | 28 | 198 | 6.2 | 45 | Tests a builder, a codec, or a rule with test input or with any body. |
| Scene and camera | keep | 34 | 445 | 30.9 | 24 | Guards a render rule or a camera rule. |
| Gallery logic | keep | 5 | 36 | 0.2 | 10 | Tests the query, the items, or the plan of a gallery page. |
| Tools and docs paths | keep | 39 | 323 | 41.5 | 99 | Tests a repository tool or a docs path. |

The four paused groups hold 35 files and 360 tests (22 of them skipped), with 478.7 s of the
634.7 s of file time. The clearance sweeps alone took 427.9 s. The longest of them,
`src/pose/violinist-clearance-2.test.ts`, took 74.3 s, and the slowest file decides the end of a
run.

## Before and after

| Run | Load before | Files | Tests | Span (s) | File time (s) |
|---|---|---|---|---|---|
| `pnpm test` on `d46d7fbe` | about 46, during the run | 224 | 2,347 | 121.6 | 634.7 |
| base set, round 1 | 11.9 | 224 | 2,347 | 86.1 | 489.6 |
| new set, round 1 | 56.0 | 189 | 1,987 | 18.7 | 99.6 |
| base set, round 2 | 82.2 | 224 | 2,347 | 81.9 | 508.5 |
| new set, round 2 | 103.7 | 189 | 1,987 | 18.9 | 101.1 |
| `pnpm test` on the tip | 3.5 | 189 | 1,987 | 17.7 | 94.9 |
| `pnpm test:paused` on the tip | 91.9 | 35 | 360 | 71.7 | 384.2 |

The rows come from `runs.txt` and `ab.txt`. The span is the "Duration" of Vitest: the time from
the start of the run to the end of its last file. The load is the 1-minute load average.

The span of a run depends on the load of the machine, because other agents ran at the same time.
The base set ran in 81.9 to 121.6 s, and the new set in 17.7 to 18.9 s. The slowest kept files
are `tools/body-probe.test.ts` (21.5 s in the base run) and `tools/check-commits.test.ts`
(13.8 s).

`pnpm test:paused` ran on the tip: the 35 files passed, with 338 tests passed and 22 skipped, in
71.7 s (`runs.txt`).

## The checks of the commit script

`tools/check-commits.sh` runs the tests that read a docs path with `pnpm -s test <files>`. The list
holds paused files, such as `src/models/species.test.ts`, beside kept files. Vitest runs only the
kept files of the list in the project `unit`, and the command passes (`docs-tests.txt`). A list
with only paused files would find no test file and fail. Each list holds kept files, such as
`tools/check-cache.test.ts`, so this does not occur.

## The frame rule

The user also paused the frame test. The rule "Frame time" of `AGENTS.md` asked each change of
`src/scene/`, of a shader, or of the post effects to run `pnpm frame` before its report. A run
takes about 3 minutes. The rule pauses until the user starts the sweep of the performance work.
The tool, its unit tests, and the target of design 9.7 stay.

## The table of each file

| File | Time (s) | Tests | Edits | Group | Action | Reason |
|---|---|---|---|---|---|---|
| `src/app/audio-session.test.ts` | 0.00 | 2 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/backdrop-probe.test.ts` | 0.01 | 3 | 2 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/bar-rules.test.ts` | 0.01 | 6 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/camera-mode.test.ts` | 0.00 | 7 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/credits.test.ts` | 0.00 | 5 | 1 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/demos.test.ts` | 1.26 | 14 | 1 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/file-rules.test.ts` | 0.01 | 9 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/keys.test.ts` | 0.00 | 8 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/messages.test.ts` | 0.00 | 6 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/meter.test.ts` | 0.01 | 8 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/page-title.test.ts` | 0.04 | 7 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/phone-layout.test.ts` | 0.00 | 3 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/pick.test.ts` | 0.00 | 2 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/play-control.test.ts` | 0.02 | 21 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/seat-flags.test.ts` | 0.00 | 9 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/seat-text.test.ts` | 2.98 | 20 | 3 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/seek.test.ts` | 0.00 | 3 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/settings.test.ts` | 0.18 | 17 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/stage-cover.test.ts` | 0.00 | 4 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/time-text.test.ts` | 0.00 | 6 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/tooltips.test.ts` | 0.00 | 2 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/transport.test.ts` | 0.01 | 21 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/webgl.test.ts` | 0.00 | 2 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/app/wide-layout.test.ts` | 0.00 | 13 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/audio/block-scheduler.test.ts` | 0.04 | 40 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/clock-render.test.ts` | 4.82 | 7 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/clock.test.ts` | 0.01 | 15 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/decode.test.ts` | 0.41 | 1 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/demo-loudness.test.ts` | 0.00 | 3 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/engine.test.ts` | 5.47 | 29 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/fetch-ok.test.ts` | 0.03 | 2 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/hall-credit.test.ts` | 0.01 | 2 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/pcm-memory.test.ts` | 0.00 | 2 | 1 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/player.test.ts` | 0.11 | 22 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/preset-index.test.ts` | 0.00 | 5 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/read-progress.test.ts` | 0.03 | 2 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/soundfont-info.test.ts` | 0.15 | 2 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/audio/synth-events.test.ts` | 0.00 | 4 | 0 | Audio engine and scheduler | keep | Guards the synth, the clock, the decode, or the block scheduler. |
| `src/gallery/items.test.ts` | 0.06 | 14 | 4 | Gallery logic | keep | Tests the query, the items, or the plan of a gallery page. |
| `src/gallery/notes.test.ts` | 0.02 | 7 | 0 | Gallery logic | keep | Tests the query, the items, or the plan of a gallery page. |
| `src/gallery/plan.test.ts` | 0.13 | 4 | 3 | Gallery logic | keep | Tests the query, the items, or the plan of a gallery page. |
| `src/gallery/sheet-poses.test.ts` | 0.54 | 9 | 7 | Fit of a pose to a body | pause | The poses of the sheet pages against the bodies. |
| `src/gallery/sheets.test.ts` | 0.01 | 6 | 3 | Gallery logic | keep | The query of a sheet page and the size of each sheet image. |
| `src/gallery/view-poses.test.ts` | 0.94 | 2 | 3 | Fit of a pose to a body | pause | The poses of the gallery pages against the bodies. |
| `src/gallery/views.test.ts` | 0.00 | 5 | 0 | Gallery logic | keep | The rows and the turns of the animal views page. |
| `src/midi/demos.test.ts` | 1.88 | 14 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/midi/parse.test.ts` | 0.01 | 18 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/midi/test-smf.test.ts` | 0.00 | 3 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/models/beam.test.ts` | 0.00 | 2 | 0 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/budget.test.ts` | 1.59 | 4 | 7 | Look of the bodies and the seats | pause | The triangle budgets of the bodies, the props, and the scene. |
| `src/models/cast.test.ts` | 2.18 | 10 | 0 | Model code | keep | The cast rules of the sections and the supports. |
| `src/models/face-patterns.test.ts` | 0.11 | 1 | 2 | Look of the bodies and the seats | pause | The eye patches against the eyes. |
| `src/models/face-plates.test.ts` | 0.01 | 2 | 3 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/footprint.test.ts` | 1.12 | 10 | 1 | Model code | keep | The footprint holds each vertex of any player. |
| `src/models/instruments/baton.test.ts` | 0.00 | 3 | 1 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/brass.test.ts` | 0.03 | 5 | 0 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/catalog.test.ts` | 0.04 | 9 | 3 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/harp.test.ts` | 0.03 | 6 | 0 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/hold.test.ts` | 0.12 | 7 | 3 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/percussion.test.ts` | 0.27 | 11 | 0 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/piano.test.ts` | 0.01 | 7 | 1 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/piece.test.ts` | 0.00 | 5 | 1 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/instruments/woodwinds.test.ts` | 0.01 | 5 | 0 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/layout-scene.test.ts` | 4.43 | 37 | 5 | Layout from the footprints | pause | The stage growth and the gaps from the footprints. |
| `src/models/layout.test.ts` | 0.00 | 4 | 2 | Model code | keep | The seat rule of design 4.5. |
| `src/models/legs.test.ts` | 0.01 | 3 | 6 | Look of the bodies and the seats | pause | The knee heights and the leg lengths of the reference images. |
| `src/models/limb-tube.test.ts` | 0.02 | 2 | 3 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/mesh.test.ts` | 0.02 | 14 | 3 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/model-cache.test.ts` | 0.87 | 2 | 0 | Model code | keep | Builds each kind of player one time. |
| `src/models/packed-mesh.test.ts` | 0.09 | 5 | 2 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/painted.test.ts` | 0.00 | 2 | 1 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/penguin/penguin-body.test.ts` | 0.06 | 9 | 2 | Look of the bodies and the seats | pause | The egg body of the penguin. |
| `src/models/player.test.ts` | 2.24 | 12 | 12 | Fit of a pose to a body | pause | The instruments on the bind pose, the bodies before the chair. |
| `src/models/primitives.test.ts` | 0.03 | 16 | 4 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/proportions.test.ts` | 0.12 | 7 | 7 | Look of the bodies and the seats | pause | The skeleton table of design 4.3 in the bodies. |
| `src/models/props.test.ts` | 0.48 | 23 | 11 | Look of the bodies and the seats | pause | The seats that fit the legs, and the look of the props. |
| `src/models/rig.test.ts` | 0.00 | 3 | 0 | Model code | keep | The bones of design 4.7 that each pose and the scene need. |
| `src/models/shading.test.ts` | 0.03 | 13 | 0 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/species.test.ts` | 1.04 | 135 | 18 | Look of the bodies and the seats | pause | The forms, the colors, and the budget of each species. |
| `src/models/stage.test.ts` | 0.46 | 22 | 3 | Model code | keep | The stage, the planks, and the podium. |
| `src/models/studio-body.test.ts` | 0.45 | 7 | 4 | Model code | keep | Builds and draws a studio body with its skin. |
| `src/models/studio-format.test.ts` | 0.00 | 5 | 1 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/studio-normals.test.ts` | 0.19 | 5 | 2 | Model code | keep | Tests a builder, a codec, or a rule with test input or with any body. |
| `src/models/studio-rig.test.ts` | 0.14 | 13 | 6 | Model code | keep | Drives the bones of a studio body from a pose. |
| `src/models/studio-size.test.ts` | 0.08 | 3 | 1 | Model code | keep | The gzip budget of each studio body (design 7.2). |
| `src/pose/blend.test.ts` | 0.00 | 6 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/bow-hold.test.ts` | 5.87 | 2 | 6 | Fit of a pose to a body | pause | The bow stick in the fingers and out of the paw. |
| `src/pose/bowed.test.ts` | 17.65 | 17 | 14 | Fit of a pose to a body | pause | The bow on the strings, the violin at the shoulder, the rest bow. |
| `src/pose/choir-notes.test.ts` | 0.01 | 7 | 1 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/choir.test.ts` | 0.36 | 9 | 3 | Fit of a pose to a body | pause | The folder and the flippers out of the penguin body. |
| `src/pose/conductor-clearance-1.test.ts` | 19.72 | 3 | 0 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/conductor-clearance-2.test.ts` | 24.22 | 3 | 0 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/conductor-clearance-3.test.ts` | 28.46 | 2 | 0 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/conductor-clearance-4.test.ts` | 13.44 | 2 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/conductor-clearance-5.test.ts` | 24.76 | 2 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/conductor-clearance-6.test.ts` | 15.68 | 2 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/conductor-left.test.ts` | 17.40 | 22 | 1 | Pose rules | keep | The left hand of the conductor with no jump in a frame. |
| `src/pose/conductor-notes.test.ts` | 0.02 | 10 | 1 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/conductor.test.ts` | 3.77 | 18 | 7 | Pose rules | keep | The cues, the count-in, and the seek of the conductor. |
| `src/pose/count-in.test.ts` | 0.07 | 12 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/cues.test.ts` | 0.52 | 13 | 1 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/family.test.ts` | 0.00 | 2 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/hand-notes.test.ts` | 0.01 | 11 | 1 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/hands.test.ts` | 5.43 | 15 | 13 | Fit of a pose to a body | pause | The palms on the keys and the strings, the reach, the rest lean. |
| `src/pose/idle.test.ts` | 0.51 | 6 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/ik.test.ts` | 0.00 | 8 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/lap.test.ts` | 0.07 | 2 | 0 | Pose rules | keep | Finds the lap point on any body. |
| `src/pose/leader.test.ts` | 0.36 | 6 | 0 | Pose rules | keep | The leader of a chamber group: the looks and the nods. |
| `src/pose/loudness.test.ts` | 0.01 | 5 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/note-groups.test.ts` | 0.01 | 5 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/passages.test.ts` | 0.01 | 6 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/percussion.test.ts` | 0.19 | 14 | 2 | Fit of a pose to a body | pause | The mallet heads on their targets, the reach, the rest arms. |
| `src/pose/pianist-clearance-1.test.ts` | 36.23 | 2 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/pianist-clearance-2.test.ts` | 34.84 | 2 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/play-clearance-brass.test.ts` | 13.42 | 5 | 0 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/play-clearance-strings.test.ts` | 5.16 | 2 | 2 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/play-clearance-woodwinds.test.ts` | 13.67 | 4 | 0 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/pose-at.test.ts` | 7.14 | 29 | 3 | Pose rules | keep | Stateless poses. Poses each species of perf-60.mid alone. |
| `src/pose/pose-timing.test.ts` | 13.10 | 16 | 1 | Pose rules | keep | The pose timing target of design 9.7. |
| `src/pose/random.test.ts` | 0.33 | 5 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/rest-clearance.test.ts` | 2.58 | 3 | 6 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/rest.test.ts` | 0.31 | 21 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/seated-feet.test.ts` | 0.40 | 2 | 1 | Fit of a pose to a body | pause | The feet on the floor or on the foot ring of each species. |
| `src/pose/strikes.test.ts` | 0.03 | 9 | 1 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/strokes.test.ts` | 0.01 | 15 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/test-clearance.test.ts` | 0.44 | 8 | 3 | Pose rules | keep | The depth and gap helpers of pnpm pose-depth, on test shapes. |
| `src/pose/test-sweep.test.ts` | 0.15 | 3 | 2 | Pose rules | keep | The gap sweep of pnpm pose-depth, on test boxes. |
| `src/pose/violinist-clearance-1.test.ts` | 54.68 | 5 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/violinist-clearance-2.test.ts` | 74.31 | 5 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/violinist-clearance-3.test.ts` | 64.02 | 4 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/violinist-standing-clearance.test.ts` | 2.73 | 2 | 1 | Clearance of the bodies | pause | Sweeps the posed skin of a body against the body and the instrument. |
| `src/pose/wind-notes.test.ts` | 0.00 | 8 | 0 | Pose rules | keep | Guards a motion rule that reads no form of a body. |
| `src/pose/winds.test.ts` | 0.85 | 10 | 0 | Fit of a pose to a body | pause | The mouth on the mouthpiece, the palms on the grips, the reach. |
| `src/scene/beam.test.ts` | 0.23 | 17 | 2 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/camera.test.ts` | 0.01 | 10 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/dispose.test.ts` | 0.01 | 4 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/environment.test.ts` | 0.00 | 2 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/focus.test.ts` | 0.01 | 13 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/geometry.test.ts` | 0.33 | 7 | 4 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/hall.test.ts` | 0.17 | 16 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/hidden-heads.test.ts` | 8.47 | 1 | 0 | Layout from the footprints | pause | The heads behind the large animals in the default view. |
| `src/scene/light-pool.test.ts` | 0.01 | 6 | 1 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/lights.test.ts` | 0.19 | 15 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/pick.test.ts` | 0.03 | 3 | 3 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/pixel-ratio.test.ts` | 0.00 | 2 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/player.test.ts` | 1.12 | 12 | 8 | Scene and camera | keep | The skin of the GPU matches the skin of the tests. |
| `src/scene/post.test.ts` | 0.00 | 7 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/quality.test.ts` | 0.01 | 8 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/renderer.test.ts` | 0.00 | 3 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/shadow-chunk.test.ts` | 0.00 | 1 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/solo-light.test.ts` | 0.12 | 8 | 2 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/stage-scene.test.ts` | 0.23 | 7 | 2 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/scene/stage.test.ts` | 0.04 | 4 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/score/beats.test.ts` | 0.07 | 24 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/demos.test.ts` | 8.70 | 87 | 1 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/drum-map.test.ts` | 0.00 | 8 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/players.test.ts` | 0.13 | 54 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/program-map.test.ts` | 0.01 | 26 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/score.test.ts` | 0.13 | 20 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/seats.test.ts` | 0.01 | 16 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/soloist.test.ts` | 3.34 | 31 | 1 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/stage-mix.test.ts` | 2.33 | 7 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/synth.test.ts` | 0.00 | 3 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/tempo-map.test.ts` | 0.00 | 5 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/timeline.test.ts` | 0.01 | 24 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/score/vocal-soloists.test.ts` | 0.50 | 3 | 0 | MIDI and score | keep | Guards a rule of the MIDI file or of the score (One score). |
| `src/shots/beam-opacity.test.ts` | 0.31 | 21 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/camera-at.test.ts` | 0.07 | 20 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/camera-keys.test.ts` | 0.00 | 8 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/clearance.test.ts` | 0.07 | 9 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/entries.test.ts` | 0.01 | 3 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/entry-cuts.test.ts` | 0.13 | 1 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/foreground.test.ts` | 0.00 | 9 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/frame.test.ts` | 0.00 | 10 | 1 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/music.test.ts` | 0.03 | 11 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/prepare.test.ts` | 13.19 | 105 | 1 | Scene and camera | keep | The cut and shot rules of the camera plan. |
| `src/shots/shot-frames-1.test.ts` | 7.63 | 18 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/shot-frames-2.test.ts` | 4.18 | 18 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/shot-frames-3.test.ts` | 2.37 | 19 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/shot-frames-chamber.test.ts` | 0.37 | 36 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/shots/view.test.ts` | 0.01 | 12 | 0 | Scene and camera | keep | Guards a render rule or a camera rule. |
| `src/test-shards.test.ts` | 0.04 | 4 | 2 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `src/ui/contrast.test.ts` | 0.04 | 23 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/ui/covers.test.ts` | 0.00 | 17 | 1 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/ui/logo.test.ts` | 0.00 | 2 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `src/ui/title-shade.test.ts` | 0.01 | 13 | 0 | App and UI | keep | Guards the app state, the URL, the transport, or the UI. |
| `tools/body-probe.test.ts` | 21.46 | 21 | 8 | Tools and docs paths | keep | The probe of pnpm body-probe. Slow: it builds each body. |
| `tools/build-soundfont.test.ts` | 0.01 | 11 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/check-cache.test.ts` | 0.00 | 12 | 2 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/check-commits.test.ts` | 13.78 | 11 | 6 | Tools and docs paths | keep | The commit check and its cache. Slow: it runs git. |
| `tools/choir-check.test.ts` | 0.00 | 2 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/chromium-args.test.ts` | 0.01 | 3 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/close-views.test.ts` | 0.01 | 5 | 5 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/decision-index.test.ts` | 0.01 | 2 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/decision-rows.test.ts` | 0.01 | 6 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/e2e-port.test.ts` | 0.00 | 3 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/fold-probe.test.ts` | 1.61 | 5 | 2 | Tools and docs paths | keep | The fold count of pnpm fold-probe. |
| `tools/glb-init.test.ts` | 0.01 | 8 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/glb-swap.test.ts` | 0.43 | 6 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/gpu-trace.test.ts` | 0.02 | 16 | 11 | Tools and docs paths | keep | The GPU row and its self-check of pnpm frame. |
| `tools/hold-reach.test.ts` | 0.56 | 10 | 2 | Tools and docs paths | keep | The rule of a violin shop of pnpm hold-reach. |
| `tools/hold-sets.test.ts` | 0.05 | 6 | 3 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/keyboard-check.test.ts` | 0.00 | 2 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/licenses.test.ts` | 0.01 | 6 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/measure-frame.test.ts` | 0.78 | 29 | 17 | Tools and docs paths | keep | The parse and the gates of pnpm frame. |
| `tools/measure-targets.test.ts` | 0.00 | 4 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/patch-demos.test.ts` | 0.71 | 16 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/pose-depth.test.ts` | 0.00 | 1 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/pose-probe.test.ts` | 0.05 | 1 | 2 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/rig-body.test.ts` | 0.05 | 8 | 5 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/rig-mesh-check.test.ts` | 0.00 | 6 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/rig-mesh.test.ts` | 0.01 | 14 | 5 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/sample-cut.test.ts` | 0.06 | 14 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/screenshots.test.ts` | 0.00 | 7 | 2 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/sfz.test.ts` | 0.00 | 7 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/sheet-check.test.ts` | 0.00 | 9 | 2 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/size.test.ts` | 0.03 | 8 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/smoke.test.ts` | 0.01 | 13 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/snapshot.test.ts` | 0.00 | 3 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/split-soundfont.test.ts` | 0.10 | 7 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/stop-cleanup.test.ts` | 0.40 | 2 | 1 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/studio-body.test.ts` | 0.40 | 28 | 13 | Tools and docs paths | keep | The export of pnpm studio-body on the studio files. |
| `tools/wav.test.ts` | 0.00 | 5 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
| `tools/write-perf-60.test.ts` | 0.92 | 2 | 0 | Tools and docs paths | keep | Tests a repository tool or a docs path. |
