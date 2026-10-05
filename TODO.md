# TODO

This list holds the tasks that build Zoophony, in order. It is the only place for the status of
the work. The rules for each task are in [`docs/design.md`](docs/design.md). The numbers in
parentheses name its sections.

## How to use this list

1. Take the first unchecked task. Do the steps in order, and do the tasks of a step in order,
   unless a task says that it can wait.
2. Read the design sections that the task names before you start.
3. Do the task in one or more small commits (AGENTS.md). Ship the tests in the same commits.
4. In the last commit of the task, change its `[ ]` to `[x]`.
5. At the end of a step, check its "Done when" list. A step with a review ends with the review
   of design 9.8. When the review agent approves the step, write the date and "agent review"
   after "Review:". Then start the next step.
6. If a task is blocked, add a line `Blocked: <reason>` under it, and ask the user.
7. If the work shows a new task, add it under its step, unchecked, with one line on the reason.

## Step 0. Project skeleton (9.5)

- [x] Ask the user for the copyright holder of the MIT license. Propose the git user name.
      Answer: "Xueqiao Xu".
- [x] Add `package.json`: name `zoophony`, private, `"type": "module"`, the `packageManager`
      field for pnpm, Node 24 or later. Add the MIT `LICENSE` file.
- [x] Add Vite with TypeScript. `index.html` has a full-window canvas over the CSS background
      gradient (4.5). Add `pnpm dev` and `pnpm build`. Add `node_modules/` and `dist/` to
      `.gitignore`.
- [x] Add `tsconfig.json` with the compiler options of AGENTS.md. Add `pnpm typecheck`.
- [x] Add Vitest and `pnpm test`, with one test, so that the command runs.
- [x] Install `oxlint`, the same version of `@oxlint/plugins`, and `oxlint-tsgolint`. Add
      `pnpm lint` (`oxlint --type-aware .`). Make sure that the anti-slop rules run.
- [x] Install oxfmt. Add `pnpm format` and `pnpm format:check` on the explicit paths of 9.5.
- [x] Add the size check `pnpm size` in `tools/`. It sums the gzip sizes of the first download
      (7.2), prints the total, and fails above 1 MB.
- [x] Add the build step that writes the third-party license file (7.3).
- [x] Add the CI workflow: install, typecheck, lint, format check, test, build, and size (9.2).
- [x] Add a short "Commands" section with the pnpm scripts to AGENTS.md.

Done when: a clean clone runs `pnpm install`, then `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm format:check`, `pnpm build`, and `pnpm size` with no error. CI runs the same commands.
`pnpm dev` shows an empty page with the background gradient.

## Step 1. Audio spike (6, 9.5, 9.7)

- [x] Add exact pins for `spessasynth_core` and `stb-vorbis` with pnpm overrides (6.1).
- [x] Add the SF3 split script. It writes `sf/<bank>/<program>.sf3` and `sf/index.json` from
      `assets/soundfont/GeneralUserGS.sf3`, with the drum kits in bank 128 (6.2). The build runs
      it. The output is not committed.
- [x] Add the decode Worker: fetch the preset files, convert SF3 to PCM SF2 with
      spessasynth_core, keep a cache for the session, and transfer the buffers (6.3).
- [x] Add the worklet processor with spessasynth_core: add the banks, make `portCount × 16`
      channels and reset, run the block scheduler, render, and post clock anchors (6.4).
- [x] Add the first `Player` (6.8): load, play, pause, seek, rate, volume, and `now()` with
      `getOutputTimestamp()` (6.7). `setSeatAudible()` can wait for step 2.
- [x] Add the spike page. It makes the events of demo 1 with the MIDI parser of
      spessasynth_core, plays them with the `Player`, and shows `now()` and the last anchor.
- [ ] Check each item of the step 1 list in 9.5 in Chrome, Firefox, and Safari.
      Chrome and Firefox are done (`docs/research/audio-spike.md`).
      Blocked: Safari WebDriver needs `sudo safaridriver --enable` and Develop > Allow Remote
      Automation. Section 7 of the spike report gives the check by hand.
- [x] Measure the step 1 targets of 9.7: clock, load, and first sound.
- [x] Write the spike report in `docs/research/`, with the result of each check and target.
- [ ] Check Safari for the dropouts that Playwright WebKit showed (200 slow blocks, 0.82 s lost).
      If Safari has them too, fix them before step 2 (spike report, section 8).
      The cause in Playwright WebKit is outside our code: the AudioWorklet thread of WebKit has
      no real-time priority (`docs/research/webkit-audio.md`). Check Safari on an idle Mac and
      with a load (section 8 of that report). If Safari loses time, ask the user about section 7.
      Blocked: a person must run Safari, because Safari automation is off.
- [ ] Ask the user if the first sound target (9.7) counts the rest before the first note of the
      file, or ends at the heard song time 0 (spike report, section 8, item 4).

Done when: the spike page plays demo 1 to the end in Chrome, Firefox, and Safari on the
development Mac with no dropout, and the report is committed.

Review: 2026-10-05, agent review, approved with conditions (docs/reviews/step-1.md).
Step 1 is not done until the two Safari tasks are closed. Ask the user for the Safari checks at
the next contact (review conditions 1 and 2).

## Step 2. MIDI and score (3, 8.3, 8.5, 9.7)

- [x] `midi/`: parse a Standard MIDI File into tracks of events in ticks, with running status
      and the meta events FF 03, FF 21, FF 51, and FF 58. Refuse format 2 and bad files (3.3).
- [x] `score/`: build the tempo map from all tracks, and convert ticks to seconds (3.3).
- [x] Pair the notes first in, first out. Read velocity 0 as a note off. End a note with no
      note off at the end of its track (3.3).
- [x] Apply the port rule: groups of 16 channels, ports by number, rhythm channels (3.4).
- [x] Follow the program of each channel, with the default program 0, bank select, and the
      drum kits of rhythm channels (3.5, 3.6).
- [x] Map programs to sections and techniques, with the pitch bands, the rule for 44 and 45,
      and the sound-only seat (3.5).
- [x] Map channel 10 keys to the player groups of each kit (3.6).
- [x] Build the seats: the key, the two merge rules, the program change rules, the seat order,
      `indexInSection`, and `programs` (3.2, 3.7).
- [x] Give the players: polyphony, base sizes, the orchestral rule, the section size setting,
      the caps, the removal above 60, divisi, and double stops (3.8).
- [x] Build the beats with the pattern of each time signature (3.2, 5.4).
- [x] Build the synth events with no SysEx, the preset list, `durationSec`, and `sequenceName`
      (3.2).
- [x] Add the script that applies `demos/patches.json`, with a test of the programs (8.3).
- [x] Add the demo tests: at most 60 players, the expected sections, and no wrong seat (8.5).
- [x] Use `score/` in place of the temporary parser of the spike.
- [ ] Add the `setSeatAudible()` rules to the processor: skip the notes of silent seats, end
      their held notes, and restart held notes on unmute (6.5, 6.6).
      Wait: do this task last in step 2, after the Safari result. Make no other change to the
      processor before the Safari result, because a Safari fix can replace 6.4 to 6.6 (review
      of step 1, condition 3).
- [ ] Make `loadScore()` post an anchor `{ songTime: 0, rate: 0 }`, and let the `Player` ignore
      the anchors of the old score. Else `now()` can run on with an old anchor after a new load
      (review of step 1, F3). Wait: this is a processor change, so it waits for the Safari result.
- [ ] Warm up the voice code: render a few silent notes of each preset while the context is
      suspended. This removes the slow block at the first notes (spike report, section 8,
      item 2). Wait: this is a processor change, so it waits for the Safari result.
- [x] Move the rule of the programs with a long sound (`sustainsAfterSeek()` in
      `audio/block-scheduler.ts`) into `score/`, next to the program map. A MIDI rule belongs in
      `score/` (AGENTS.md "One score").
- [x] Measure the step 2 targets of 9.7: score build, audio render, and memory.
- [ ] Ask the user if the audio render target (9.7) can use a percentile. In Node, the p99.9 is
      at most 0.53 ms, but each run has 0 to 6 blocks above 1.3 ms in each demo. Most of them move
      between runs, and the Mac was busy. The first notes with cold code take 3.1 to 5.0 ms (the
      warm-up task). Thus the target "each block" fails (`docs/research/step-2-targets.md`).
- [x] In the audio render target, also time the block of a seek near the end of the largest
      demo. A seek walks all events before the cursor (review of step 1, F14).
- [ ] Make the seek chase fit in one block. In the Boulanger demo (24,514 events), the first seek
      of a session takes 3.5 to 4.0 ms, and the later seeks 1.0 to 1.9 ms, against a block of
      2.667 ms. The walk over the events takes 0.70 ms, about 29 ns for each event, so a larger
      file takes more (`docs/research/step-2-targets.md`, section 6). For example, keep the
      chase state at fixed points of the event list, or warm up the chase code with the voices.
      Wait: this is a processor change, so it waits for the Safari result.
- [x] Decide about the Worker cache: the Worker and the synth each keep the PCM banks, so each
      preset is two times in memory, and design 6.3 says "no copy". Remove the cache, or count
      both copies in 6.3 and in the memory target of 9.7 (review of step 1, F5).
      Answer: the Worker keeps no cache. The synth keeps each bank for the session, and the
      `Player` asks the Worker only for new presets (6.3).

Done when: each rule of section 3 has at least one test that fails without the rule, the demo
tests pass for all six demos, and the step 2 targets of 9.7 pass: the score build, the audio
render, and the memory.

Before step 3 starts, the two Safari tasks of step 1 are closed. If Safari loses time, the user
decides about section 7 of `docs/research/webkit-audio.md` (review of step 1, condition 4).

## Step 3. Scene and one player (2.5, 2.6, 4.1, 4.5, 4.7)

Started early on 2026-10-05 by the manager: audio-free tasks only. The bow sync and the clock target
wait for the Safari check (step 1 review, condition 4).

- [x] Set up the renderer: a transparent canvas, ACES Filmic, sRGB, MSAA, and the pixel ratio
      of the tier (2.6, 4.5).
- [x] Build the stage, the planks, the steps, the podium, the conductor stand, and the
      shadow-only floor (4.5).
- [x] Add the spotlight that scales with the stage, the fill light, the visible beam, and the
      shadows of each tier (4.5).
- [x] Add the camera: the default view, the view offset, the far plane, and the orbit limits.
      Turn off the inertia for reduced motion (2.5, 4.5).
- [x] Build one rabbit and a violin with a bow as one `SkinnedMesh` with rigid parts (4.4, 4.7).
- [ ] Move the bow in sync with the first violins of demo 1, from `Player.now()` (5.3).
- [x] Take a screenshot of the default view at 1440 × 900, and compare it with the reference.
- [ ] Measure the clock target of 9.7 with the bow.
- [ ] Measure the steps of `currentTime` in Firefox, and smooth `now()` if the bow needs it. The
      latency method follows `currentTime`, which moves in steps (spike report, section 8, item 3).

Done when: the screenshot has the composition of the reference (9.5), and the clock target
passes.

Review: 2026-10-05, agent review, approved with conditions for the audio-free tasks (docs/reviews/step-3.md).

## Step 4. Models and gallery (4.3 to 4.7)

- [x] Build the parametric biped from `SpeciesParams`: the head, the torso, the limbs, the ear
      types, the snouts, the tails, the face patterns, and the accent parts (4.3, 4.5).
- [x] Add the parameters and the colors of all 18 species (4.3, 4.5).
- [x] Keep the torso in front of the chair back. The round torso of step 4 (1.2 H wide, 0.85 as
      deep) goes through the back slats by 0.007 m at the size 1.0 and by 0.07 m at the size 1.35
      (the elephant and the rhino). For example, move the body forward on the seat by the overlap.
- [x] Build the string instruments: violin, viola, cello, contrabass, and the bows (4.6).
- [x] Build the harp, the piano with its bench, and the choir folder (4.6).
- [x] Build the woodwinds: flute, oboe, clarinet, and bassoon (4.6).
- [x] Build the brass: horn, trumpet, trombone with its slide, and tuba (4.6).
- [x] Build the percussion: timpani, bass drum, snare drum, cymbals, triangle, tambourine,
      xylophone, the mallets, and the baton (4.6).
- [x] Build the props: chairs, stools, the high stool, music stands, and risers (4.5).
      Step 3 built the chair and the music stand (`models/props.ts`).
- [ ] Add the triangle budget test (4.5).
- [ ] Add `layoutScene()`: the stage origin, the stage side, the row radius rule, the choir
      risers, the piano, and the shared stands, with a test for overlaps (4.5, 5.1).
- [ ] Add the gallery page: each species with the instrument of its section, each instrument
      alone, a time slider, and a test note list (7.1).
- [ ] Show the scene of each demo from `layoutScene()`, with no motion yet. Free the old scene
      with `StageScene.dispose()` before a new demo replaces it.
- [ ] Decide the side of the violins: 4.2 puts them at the front left, but a short row of 4.5 is
      centered on 0° (review of step 3, the rabbit behind the podium).
- [ ] Fill the choir risers evenly, so that Handel gets S 10.59 m in place of 15.44 m. Decide the
      rule with `layoutScene()` (review of step 3, F13).
- [ ] Check the elephant ears of neighbor cellos in the overlap test. If they overlap, give the
      cello and contrabass seats more arc (review of step 3, F12).
      The large-flap ears now point back and out at 32°, so the elephant is 0.885 m wide, and
      `species.test.ts` checks that each species is narrower than the arc of 0.95 m. The overlap
      test of `layoutScene()` must still check the cellos with their facings.
- [ ] Decide the light on the floor: an additive disc under the stage at y = -0.399, radius
      1.0 S, color `#e8dcc0`, opacity 0.10 at 0.5 S to 0 at 1.0 S, no depth write. Design 4.5
      has a shadow-only floor, so the disc needs a design change. The values are not rendered
      yet (review of step 3, "No light on the floor").
- [ ] Check the gallery views for the noise pattern of `PCFShadowMap` on soft shadow edges. If it
      shows, use the shadow radius 1 in the gallery (review of step 3, F11).
- [ ] Decide about the Vite warning for the entry chunk (148 kB after gzip, nearly all three.js).
      For example, set `build.chunkSizeWarningLimit` with a comment that gives the gzip size. The
      size check of 7.2 is the real limit (review of step 3, F10).
- [ ] Take the screenshots of the gallery for the review.

Done when: the gallery shows each species with its instrument, the budget test passes, and the
scene of each demo has its seats and stage size with no overlap.

Review:

## Step 5. Motion (5, 4.7, 9.7)

- [ ] Add `poseAt()` with all its inputs and the three layers (5.1).
- [ ] Add the analytic two-bone IK for the arms (4.7).
- [ ] Animate the bowed strings: bow direction, bow speed, left hand, pizzicato, tremolo, and
      double stops (5.3).
- [ ] Animate the woodwinds and the brass: breath, fingers, and the trombone slide (5.3).
- [ ] Decide how a wind player shows two notes. A woodwind or brass seat at its cap gives one
      player two notes at a time (3.8), but a wind instrument plays one note. The pose must
      show one of them (second re-review of step 2, P1).
- [ ] Add a move of the trombone slide to `AnimalPose`. A pose has only bone rotations (5.1), and
      a rotation cannot move the slide along its axis (4.6, the target `slide`).
- [ ] Animate the piano, the harp, the mallets, and the percussion (5.3, 4.6).
- [ ] Animate the choir: the jaw or the beak, and the sway (5.3).
- [ ] Add the motion before each note, the seeded offsets, and the loudness (5.3).
- [ ] Add the idle layer: breath, blinks, and looks at the conductor (5.1).
- [ ] Add the rest pose, the transport rules, and the silent seats (5.2, 5.5).
- [ ] Animate the conductor: the patterns, the gesture size, and the cues (5.4).
- [ ] Wire the app: load a demo, build the score and the layout, build the scene, and play with
      the poses in sync. A temporary play button is enough (9.5).
      Ignore the `LoadReplacedError` of a load that a later selection replaced (6.8).
- [ ] Add the script that writes `perf-60.mid` (9.5).
- [ ] Add the pose tests: the pose timing, the seeded offsets, and the rest rules (9.7).
- [ ] Measure the frame target with `perf-60.mid` (9.7).
- [ ] Record the screen recordings of demo 1 and of the Boulanger demo for the review.

Done when: the pose tests pass, and the pose and frame targets pass.

Review:

## Step 6. UI (2, 6.6, 9.5)

- [ ] Add the tokens and the layout of the prototype (2.8).
- [ ] Build the bar with all its controls and the rules that hide it (2.3, 2.8).
- [ ] Build the first screen: the play button, the load ring, and the load text (2.2, 2.8).
- [ ] Build the drawer and the demo list, with the texts of 8.2 (2.8, 8.2).
- [ ] Add the file button, the drop overlay, and the drop of a file (2.1, 2.2, 2.8).
- [ ] Build the seat list with the seat texts, and the mute and solo rules. Send the result to
      the `Player` and to `poseAt()` (2.8, 6.6).
- [ ] Open the seat row of an animal on a click (2.3).
- [ ] Add the settings: the section size and the quality, with the automatic tier (2.6, 3.8).
- [ ] Add the credits and the link to the third-party licenses (2.8, 7.3).
- [ ] Add the messages and the WebGL2 check, with the exact texts (2.8, 3.3).
      The `Player` gives a failure during play to its `onError` function (6.8). 2.8 has no
      text for this case yet (review of step 1, F2).
- [ ] Add the keyboard keys and the accessibility rules (2.4, 2.8).
- [ ] Add the URL hash and the start of a selected demo (2.2).
- [ ] Add the iOS audio session (2.4).
- [ ] Build the phone layout: the sheet above the bar, the playback group, and the 44 px
      controls (2.8).
- [ ] Take the screenshots at 1440 × 900 and at 390 × 844. Check each control with a keyboard
      alone.

Done when: the UI matches the prototype at both sizes, and a keyboard alone can reach and use
each control.

Review:

## Step 7. Demo build, tests, and deploy (8, 9)

- [ ] Put the changed demo files into the site. Demo 1 is part of the first download (7.2).
      The build already writes them to `dist/demos/` (8.3). The app must load demo 1 from there.
- [ ] Add the Playwright smoke test (9.3).
- [ ] Add Playwright to CI: Chromium blocks a merge, WebKit and Firefox do not (9.2).
- [ ] Add the Pages workflow, with the base path of the repository `zoophony` (9.2).
- [ ] Ask the user to create the GitHub repository `zoophony`, or to install `gh`. Add the
      remote and push.
- [ ] Open the deployed site and play demo 1.
- [ ] Add `AudioContext.playbackStats` to the manual release test of 9.4. Chrome gives the
      underruns there (spike report, section 8, item 5).
- [ ] Do the manual release test of 9.4 with the user.

Done when: CI passes on `main` with Playwright in Chromium, and the deployed site plays demo 1.
