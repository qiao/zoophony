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
- [x] Add the spike page. It makes the events of the Beethoven demo with the MIDI parser of
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
- [x] Ask the user if the first sound target (9.7) counts the rest before the first note of the
      file, or ends at the heard song time 0 (spike report, section 8, item 4).
      Answer: each play starts with a count-in, and the target measures from the downbeat (song
      time 0) to the first sound (user decision of 2026-10-05, 9.7).

Done when: the spike page plays the Beethoven demo to the end in Chrome, Firefox, and Safari on the
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
- [x] Add the `setSeatAudible()` rules to the processor: skip the notes of silent seats, end
      their held notes, and restart held notes on unmute (6.5, 6.6).
      `SynthEngine` and the block scheduler hold the rules. `processor.ts` did not change: its
      dispatch already forwards the new `seat` command to the engine.
- [x] Make `loadScore()` post an anchor `{ songTime: 0, rate: 0 }`, and let the `Player` ignore
      the anchors of the old score. Else `now()` can run on with an old anchor after a new load
      (review of step 1, F3).
      Each anchor carries the load number of its score (6.7). This also fixes F4 of the review
      of step 5.
- [x] Warm up the voice code: render a few silent notes of each preset while the context is
      suspended. This removes the slow block at the first notes (spike report, section 8,
      item 2).
      `addBanks()` warms up after each bank add, with the first note of each preset of the
      score, also of a preset in the middle of the song (6.4, review of step 2, N2).
      `docs/research/step-2-warm-up.md` gives the times before and after.
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
      Wait: the Safari result (`docs/research/webkit-audio.md` section 7).
- [x] Decide about the Worker cache: the Worker and the synth each keep the PCM banks, so each
      preset is two times in memory, and design 6.3 says "no copy". Remove the cache, or count
      both copies in 6.3 and in the memory target of 9.7 (review of step 1, F5).
      Answer: the Worker keeps no cache. The synth keeps each bank for the session, and the
      `Player` asks the Worker only for new presets (6.3).

Done when: each rule of section 3 has at least one test that fails without the rule, the demo
tests pass for all demos, and the step 2 targets of 9.7 pass: the score build, the audio
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
- [x] Move the bow in sync with the first violins of the Beethoven demo, from `Player.now()` (5.3).
      The app wiring of step 5 poses all players from `Player.now()`. `pnpm smoke` checks in
      Chromium that the bow arm of the first violin moves with the song time. Safari is not
      checked yet, because Safari automation is off.
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
- [x] Add the triangle budget test (4.5).
- [x] Add `layoutScene()`: the stage origin, the stage side, the row radius rule, the choir
      risers, the piano, and the shared stands, with a test for overlaps (4.5, 5.1).
- [x] Add the gallery page: each species with the instrument of its section, each instrument
      alone, a time slider, and a test note list (7.1).
      Before step 5, a sounding test note shows the violin pose of step 3 on the violins and the
      violas, and the other players keep the bind pose.
- [x] Show the scene of each demo from `layoutScene()`, with no motion yet. Free the old scene
      with `StageScene.dispose()` before a new demo replaces it.
      For the review, `?demo=<id>` selects a demo, and the keys [ and ] switch demos.
- [x] Decide the side of the violins: 4.2 puts them at the front left, but a short row of 4.5 is
      centered on 0° (review of step 3, the rabbit behind the podium).
      Answer: row 0 holds the first violins to the left of 0° and the violas to the right. The
      other rows stay centered (4.5).
- [x] Fill the choir risers evenly, so that Handel gets S 10.59 m in place of 15.44 m. Decide the
      rule with `layoutScene()` (review of step 3, F13).
      Answer: the singers fill the levels evenly, and the count of levels that gives the smallest
      stage wins. Handel gets S 10.96 m on three levels (4.5).
- [x] Fix the text of the pianist facing in 4.5. A pianist who faces +x has the conductor ahead
      and a little to the left, and the text said the right side (agent of the step 4 instruments).
- [x] Check the elephant ears of neighbor cellos in the overlap test. If they overlap, give the
      cello and contrabass seats more arc (review of step 3, F12).
      The large-flap ears now point back and out at 32°, so the elephant is 0.885 m wide, and
      `species.test.ts` checks that each species is narrower than the arc of 0.95 m. The overlap
      test of `layoutScene()` must still check the cellos with their facings.
      Answer: the ears keep apart at 0.95 m. The overlap test checks the ear boxes with the
      facings, and a test checks the nearest ear corners of neighbor cellos. The cello seats get
      more arc for their shared stands (4.5).
- [x] Decide the light on the floor: an additive disc under the stage at y = -0.399, radius
      1.0 S, color `#e8dcc0`, opacity 0.10 at 0.5 S to 0 at 1.0 S, no depth write. Design 4.5
      has a shadow-only floor, so the disc needs a design change. The values are not rendered
      yet (review of step 3, "No light on the floor").
      Answer: add the disc with the opacity 0.13. Below the steps, the floor of the Beethoven
      demo goes from 0.11 to 0.19 to 0.20, and the reference has 0.19 to 0.21 (4.5).
- [x] Check the gallery views for the noise pattern of `PCFShadowMap` on soft shadow edges. If it
      shows, use the shadow radius 1 in the gallery (review of step 3, F11).
      Answer: a close view shows a fine grid on each lit face with the radius 3. The radius 1
      halves the mean pixel step of the grid (5.5 to 2.8 of 255), so the gallery uses it (7.1).
- [x] Decide about the Vite warning for the entry chunk (148 kB after gzip, nearly all three.js).
      For example, set `build.chunkSizeWarningLimit` with a comment that gives the gzip size. The
      size check of 7.2 is the real limit (review of step 3, F10).
      Answer: the limit is 700 kB. The largest chunk is 615 kB, 159 kB after gzip.
- [x] Decide how the orchestra fills the square stage. The rows are arcs around the podium at
      the front, so the front corners and the back corners stay empty, and a wide row sets `S`.
      The near corner of the default view is 0.29 to 0.48 S from the nearest player (reference
      0.16 S), and the width-bound demos leave 0.24 to 0.27 S empty at the back (manager, step 4).
      Answer: after the stage size, each row spreads inside the stage, up to ±90° and 1.6 m
      between neighbors. `S` does not change. The near corner is 0.215 to 0.305 S for the six
      demos. The back strip stays, because 4.1 keeps the square stage (review of step 4, F1).
- [x] Take the screenshots of the gallery for the review.
      `docs/reviews/step-4/`: the default view of each demo at 1440 × 900, the Beethoven demo at
      390 × 844, and the two gallery pages.
- [x] Match the animals to the new reference image `docs/reference/animals.webp` (user,
      2026-10-05): the views page `views.html`, the sculpted head, the body, the legs, the ears,
      the tails, the colors, and the chair with an open back. The wolf plays the clarinets in
      place of the raccoon. `docs/reviews/step-4/animals-views.webp` shows the result.
      The second round made the bodies short and chubby, and the larger species sit farther
      back (user, 2026-10-05): the elephant plays the timpani and the panda the cello (4.3).
      The third round made the torsos, the heads, the limbs, and the feet round with small
      facets, lengthened the long snouts, and raised the body budget to 1,800 (4.5).
- [x] Move the large animals to the back, and seat the orchestra as a professional orchestra
      (user, 2026-10-05). `docs/research/seating.md` gives the proposal. The user chose the
      contrabasses in a line in the back row. The dog plays the cello, the pig the horn, and the
      panda the trombone (4.3). The rows follow the American seating with the string wedges
      (4.2, 4.5). A test of `scene/` checks the hidden heads in the default view.

Done when: the gallery shows each species with its instrument, the budget test passes, and the
scene of each demo has its seats and stage size with no overlap.

Review: 2026-10-05, agent review, approved (docs/reviews/step-4.md).

## Step 5. Motion (5, 4.7, 9.7)

- [x] Add `poseAt()` with all its inputs and the three layers (5.1).
- [x] Add the analytic two-bone IK for the arms (4.7).
- [x] Animate the bowed strings: bow direction, bow speed, left hand, pizzicato, tremolo, and
      double stops (5.3).
- [x] Animate the woodwinds and the brass: breath, fingers, and the trombone slide (5.3).
- [x] Check the reach of the arms to each instrument in the review. In the bind pose, the bow hand
      of the rabbit cannot reach the strings of its violin, and the cello and the contrabass are
      0.17 m and 0.25 m out of reach. The pose turns the right shoulder forward, slants the bow
      20°, and leans the low strings forward (5.3). Longer arms in `models/` can replace this
      (agent of the step 5 strings).
      Answer: the manager adopted option (c) of the review of step 4: upper arm 0.7 H and
      forearm 0.65 H, with smaller shoulder turns. The bow reaches the full hair (4.5, 5.3).
- [x] Decide how a wind player shows two notes. A woodwind or brass seat at its cap gives one
      player two notes at a time (3.8), but a wind instrument plays one note. The pose must
      show one of them (second re-review of step 2, P1).
      Answer: the player shows the last note that started, and the highest note of a chord
      (notes within 50 ms). Section 10 holds the row (5.3).
- [x] Add a move of the trombone slide to `AnimalPose`. A pose has only bone rotations (5.1), and
      a rotation cannot move the slide along its axis (4.6, the target `slide`).
      Answer: `poseAt()` fills `slideOffset` for the trombone each frame, and `applyPose()` of
      `scene/` adds it to the bind position of the slide bone.
- [x] Animate the piano, the harp, the mallets, and the percussion (5.3, 4.6).
      The piano and the harp are in `pose/hands.ts`, the mallets and the percussion in
      `pose/percussion.ts`. The shoulders of the standing badger are at 0.63 m, so the snare
      drum, the xylophone, and the tambourine now stand at 0.48 m (4.6). The beater strikes the
      bass drum at 0.52 m, and the elephant reaches the timpani heads at 0.72 m.
- [x] Animate the choir: the jaw or the beak, and the sway (5.3).
- [x] Add the motion before each note, the seeded offsets, and the loudness (5.3).
- [x] Add the idle layer: breath, blinks, and looks at the conductor (5.1).
- [x] Connect the time slider and the test note list of the gallery to `poseAt()`, so that each
      model of the gallery plays the test notes (7.1). Step 4 shows only the violin pose.
- [x] Add the rest pose, the transport rules, and the silent seats (5.2, 5.5).
- [x] Animate the conductor: the patterns, the gesture size, and the cues (5.4).
- [x] Replace the tuple math of `models/math.ts` with the math classes of three.js in one
      refactor, and delete `math.ts` (user decision of 2026-10-05). Keep the returned data plain.
      Reuse objects in the frame path of `poseAt()` to cut its allocation.
      Reason: the tuple math repeats math that three.js already has, and each call makes a new
      array in the frame path. The pure core can now use the math classes (7.1).
      Answer: the data stays in `Vec3` and `Quat` tuples (7.1). With perf-60, a frame of
      `poseAt()` takes 0.09 ms in place of 0.36 ms, and allocates 0.08 MB in place of 2.36 MB.
- [x] Wire the app: load a demo, build the score and the layout, build the scene, and play with
      the poses in sync. A temporary play button is enough (9.5).
      Ignore the `LoadReplacedError` of a load that a later selection replaced (6.8).
      `src/main.ts` does it, and `pnpm smoke` checks it (9.3). The layout, the pose plan, and the
      scene share one `ModelCache`. `docs/reviews/step-5/` holds two screenshots during play.
- [x] Add the script that writes `perf-60.mid` (9.5).
- [x] Add the pose tests: the pose timing, the seeded offsets, and the rest rules (9.7).
- [x] Measure the frame target with `perf-60.mid` (9.7).
      Answer: the target passes in Google Chrome at 1440 × 900 and the device scale 2. Main
      thread p50 2.62 ms and p95 2.95 ms, GPU p50 1.86 ms and p95 2.27 ms, at 60 fps
      (`docs/research/step-5-frame.md`).
- [x] Record the screen recordings of the Beethoven demo and of the Boulanger demo for the review.
      `docs/reviews/step-5/`: a GIF of 10 s at 720 × 450 and 20 fps, and a WebM at 1440 × 900
      and 30 fps, of each demo from 0.5 s before the click on play. Also the Beethoven demo at
      390 × 844 after 6 s of play. `docs/research/scripts/step-5/` holds the recording scripts.

- [x] Start each play with the count-in of the conductor (user decision of 2026-10-05): the
      ready gesture and one preparatory beat from the song start, one beat after a pause. The
      transport starts below the start point, and the first note sounds at the downbeat
      (2.4, 5.2, 5.4, 6.5, 9.7). `docs/reviews/step-5/count-in-720x450.gif` first showed the
      Beethoven demo. Now it shows the Boulanger demo, the default demo.
- [x] Make the Boulanger demo the default demo (user decision of 2026-10-05: a more positive and
      cheerful default music). It is demo 1 of the list, the first screen, and part of the first
      download (2.2, 7.2, 8.2). The other demos stay in the app.
      Answer: the first download is 223,143 B, and the 17 presets load in 681 ms at most at
      50 Mbit/s (`docs/research/default-demo.md`, 9.7). `pnpm smoke` passes with the default
      demo, and `docs/reviews/step-5/` holds its first screen and its count-in.
- [x] Add a bit of randomness to the times at which the animals lift and lower their instruments
      (user decision of 2026-10-05). Each player moves in a seeded part of the lift and of the
      lowering of the transport and of its seat, so that each lift still ends before the
      downbeat and a change still starts from the height at the change (5.2, 5.5).
- [x] Make the cues of the conductor realistic (user decision of 2026-10-05: "a more realistic
      conductor that cues each section before it plays"). The conductor cues each section entry.
      It turns the head and the upper body to the section one beat before the entry, and the
      left hand or the baton lands on the entry (5.4). Record 15 s of the Boulanger demo from the
      orchestra side in `docs/reviews/step-5/conductor-cues-720x450.gif`.
      Answer: `pose/cues.ts` gives the Boulanger demo 81 cues (58 of the left hand, 23 of the
      baton), and each cue of its first 60 s lands within 5 ms of its entry. The GIF is 1.9 MB
      at 20 fps, and `docs/research/scripts/step-5/close/cues.mjs` records it.
- [x] Make the lift and the lowering natural (user feedback of 2026-10-05: "too synchronized
      and too fast"). Each player has its own seeded lift of 0.6 to 0.9 s and lowering of 1.0
      to 1.6 s, with a ripple from the principal of each seat. `Transport.before` and
      `SeatAudibility.before` replace `weightAtChange`, and the ready pause of the count-in is
      1.2 s (5.2, 5.4, 5.5).

Done when: the pose tests pass, and the pose and frame targets pass.

Review: 2026-10-05, agent review, approved (docs/reviews/step-5.md).

## Step 6. UI (2, 6.6, 9.5)

- [x] Add the tokens and the layout of the prototype (2.8).
      `src/ui/ui.css` holds the tokens as CSS custom properties. `src/app/app.ts` holds the load
      flow and the transport, and `src/main.ts` only starts it.
- [x] Build the bar with all its controls and the rules that hide it (2.3, 2.8).
      The pure rules are in `app/bar-rules.ts`, `app/time-text.ts`, `app/seek.ts`, and
      `seekPlayState()` of `app/transport.ts`.
- [x] Build the first screen: the play button, the load ring, and the load text (2.2, 2.8).
      `app/play-control.ts` holds the rules. The temporary play button of step 5 is gone.
- [x] Build the drawer and the demo list, with the texts of 8.2 (2.8, 8.2).
      `DEMOS` of `app/demos.ts` holds the texts. The keys [ and ] of step 4 are gone.
      `docs/reviews/step-6/` holds the screenshots of these four tasks.
- [x] Add the file button, the drop overlay, and the drop of a file (2.1, 2.2, 2.8).
      `app/file-rules.ts` holds the rules and the message texts of the file errors. Until the
      messages task, `#showMessage()` of `App` writes a message to the console.
- [x] Build the seat list with the seat texts, and the mute and solo rules. Send the result to
      the `Player` and to `poseAt()` (2.8, 6.6). Make each change of a seat with
      `changeAudibility()` of `app/transport.ts`, so that fast mutes do not make the instruments
      jump (5.5, review of step 5, F8).
      `app/seat-text.ts` holds the seat texts, and `app/seat-flags.ts` the mute and solo rules.
- [x] Open the seat row of an animal on a click (2.3).
      `app/pick.ts` holds the click rule, and `scene/pick.ts` the ray test.
- [x] Add the settings: the section size and the quality, with the automatic tier (2.6, 3.8).
      `app/settings.ts` holds the texts and the automatic tier. A change of the section size
      keeps the score of the `Player`, because only the player counts change.
- [x] Add the credits and the link to the third-party licenses (2.8, 7.3).
      `app/credits.ts` holds the texts. The credits list the source of each demo (8.1).
- [x] Add the room and the mix (user decision of 2026-10-05: "very hifi and professional",
      recommendation 1 of `docs/research/sound-quality.md`): the pan and the reverb send of each
      channel from the stage, a short room and no chorus in the synth, the hall reverb of St
      Paul's Hall, the gain of each demo, and a limiter (6.1, 6.2, 6.8).
      `docs/research/room-and-mix.md` gives the numbers against the B2 render.
- [x] Pass the mix and the gain of each piece to the `Player` (6.8).
      `preparePiece()` keeps `stageMix(score, layout)` in the piece, and `#loadAudio()` sends it
      with `pieceGainDb(file)`. `PlayerScore.mix` and `PlayerScore.gainDb` are required.
- [x] Add the hall impulse response to `tools/licenses.ts`: an entry with `HALL_CREDIT` and
      `assets/hall/LICENSE.txt` (7.3). CC BY 4.0 asks for the credit.
      `hallEntry()` makes it.
- [x] Show the credit of the hall reverb in the credits: `HALL_CREDIT` of
      `src/audio/hall-credit.ts`, with its links to the source and to CC BY 4.0 (2.8, 6.8).
      `HALL_REVERB_CREDIT` of `app/credits.ts` holds the text and the links.
- [x] Add the messages and the WebGL2 check, with the exact texts (2.8, 3.3).
      The `Player` gives a failure during play to its `onError` function (6.8). 2.8 has no
      text for this case yet (review of step 1, F2). The temporary button of step 5 pauses the
      transport on a failure and offers a retry (review of step 5, F9). Keep both rules.
      `app/messages.ts` holds the texts and the close rule, and `app/webgl.ts` the WebGL2 check.
      A failure after the load gets the new text "An error stopped the music. Try again." (10).
- [x] Add the keyboard keys and the accessibility rules (2.4, 2.8).
      `app/keys.ts` holds the key rules. Escape closes the drawer, and the title announces the
      current piece.
- [x] Add the URL hash and the start of a selected demo (2.2). Remove the temporary query
      `?demo=<id>` of `src/main.ts` (step 4). Keep a dev-only way to show `perf-60.mid` for the
      frame target (9.5). `tools/screenshots.ts` and `tools/measure-frame.ts` use the query.
      `fileFromHash()` of `app/demos.ts` reads `#demo=<id>`, and `#demo=perf-60` works only on
      the dev server. The tools use the hash.
- [x] Add the iOS audio session (2.4).
      `playWithSilentSwitch()` of `app/audio-session.ts` runs before the `Player` makes its
      `AudioContext`. An iPhone check waits for a person.
- [x] Build the phone layout: the sheet above the bar, the playback group, and the 44 px
      controls (2.8).
      `ui.css` already has the sheet position and the 44 px sizes, and it hides the speed menu,
      the volume slider, "Reset view", and full screen below 700 px. Until the "Playback" group
      shows them in the settings, a phone cannot reach them.
      `Bar.placePlayback()` moves the four controls into the "Playback" group, and
      `app/phone-layout.ts` holds the rules of the drag handle.
- [x] Take the screenshots at 1440 × 900 and at 390 × 844. Check each control with a keyboard
      alone.
      `docs/reviews/step-6/` holds the screenshots of each UI state at both sizes
      (`pnpm screenshots <dir> --ui --drawer --load`), and `keyboard-check.md` the result of
      `pnpm keyboard`: each control passes at both sizes.
- [x] Remove the Handel demo from the app (user decision of 2026-10-05, 8.2). The choir stays,
      because a file of the user can have one.
      `choirFile()` of `models/test-choir.ts` gives the choir tests 32 singers on two riser
      levels in place of the demo. The demo list and the step 6 records now have five demos.
- [x] Replace the sound samples with a high-quality SoundFont (user decision of 2026-10-05,
      6.2). `tools/build-soundfont.ts` makes `assets/soundfont/Zoophony.sf3` from GeneralUser
      GS, VSCO 2 CE, and VCSL. The credits data is `SOUNDFONT_CREDITS` (2.8).
- [x] Add the gain `SOUNDFONT_HEADROOM_DB` (6.5 dB) to the output chain, so that the loudness
      stays the same as with GeneralUser GS (6.2). The new SoundFont plays 6.5 dB lower.
      The `Player` adds it to the input gain, and `DEMO_LOUDNESS` holds new values (6.8).
- [ ] Run `node tools/measure-targets.ts` on a quiet machine. The render target of 9.7 failed
      only under the load of other agents.
- [x] Replace the dark demos with cheerful pieces and add the Ode to Joy (user decision of
      2026-10-05, 8.2). `docs/research/cheerful-demos.md` gives the choice.
      The list is Boulanger, Beethoven 9 (bars 216 to 330), Eine kleine Nachtmusik, Brandenburg
      No. 3, Beethoven 8 mvt 2, and K. 315. The risers now stand 1.0 m high (4.5).

- [ ] Move the seat flags and the settings of `App` into small classes next to it, because
      `app/app.ts` has about 900 lines (review of step 6, N7). This task can wait until the work
      on the audio chain and the camera in `app.ts` is merged.

- [ ] Ask the user if a silent seat row needs a second cue (re-review of step 6, N3). With the
      flutes soloed, the 7 silent rows (opacity 0.8, for 4.5:1 contrast) look almost as bright
      as the flute row, and only the pressed "S" shows the solo. Options: keep it, or add a mark
      to each silent row. No change until the user decides.

Done when: the UI matches the prototype at both sizes, and a keyboard alone can reach and use
each control.

Review: 2026-10-05, agent review, approved (docs/reviews/step-6.md).

## Step 6b. Cinematic camera (2.3, 2.4, 2.5, 2.8, 4.5, 5.6, 9.7)

The user asked on 2026-10-05 for an automatic camera that cuts between camera positions, with
slow moves. `docs/research/cinematic-camera.md` holds the plan and its checklist.

- [x] Add the pure module `shots/`: the camera keys, the music windows, the entries, the
      clearance of a camera, `prepareShots()`, and `cameraAt()` (5.6). Test the cut rules, the
      choice rules, the jump cuts, the clearance every 50 ms at four aspects, the subject in the
      frame, the transport cases, reduced motion, the blends, and determinism.
- [x] Time `prepareShots()` and `cameraAt()` against the targets of 9.7.
- [x] Let `StageCamera` follow the camera of a shot, with the near orbit limit of 2.0 m (4.5).
- [x] Add the camera modes (2.5), the "Automatic camera" toggle in the bar, and the key C (2.4,
      2.8).
- [x] Check the camera in the smoke test and in the keyboard check, and take a frame of each
      kind of shot with `pnpm screenshots <dir> --shots` (9.8).
- [x] Keep each camera on one side of the cone of the beam for a full shot (5.6). A camera that
      crossed it in a push-in made the image darker at once.
- [x] Measure the frame target in both camera modes, and record a GIF of 20 s of the Boulanger
      demo in Cinematic mode (`docs/reviews/step-6/cinematic-720x450.gif`).
- [x] Fade the beam in the close shots and for a near camera in Free mode (manager decision of
      2026-10-05, 4.5, 5.6). The additive beam washed out a close shot from outside the cone.
- [ ] The review of 9.8: frames of each kind of shot of each demo at both sizes, and the GIF.

Done when: the tests of 5.6 pass for each demo, the shot targets and the frame target of 9.7
pass, and the smoke test checks the camera.

Review:

## Step 7. Demo build, tests, and deploy (8, 9)

- [x] Put the changed demo files into the site. The default demo is part of the first download
      (7.2). The build already writes them to `dist/demos/` (8.3). The app must load the default
      demo from there.
      Checked on 2026-10-05: `tools/patch-demos.ts` writes the five files into `public/demos/`,
      and `pnpm build` copies them to `dist/demos/`. `demoUrl()` loads each demo from
      `<base>demos/`, and `pnpm size` counts `dist/demos/boulanger-matin.mid` (30,097 B).
- [x] Add the Playwright smoke test (9.3).
- [ ] Add Playwright to CI: Chromium blocks a merge, WebKit and Firefox do not (9.2).
- [ ] Add the Pages workflow, with the base path of the repository `zoophony` (9.2).
- [ ] Ask the user to create the GitHub repository `zoophony`, or to install `gh`. Add the
      remote and push.
- [ ] Open the deployed site and play the default demo.
- [ ] Add `AudioContext.playbackStats` to the manual release test of 9.4. Chrome gives the
      underruns there (spike report, section 8, item 5).
- [ ] Add the three checks that the step 6 reviews could not make to the manual release test of
      9.4, because headless Chromium opens no native list, has no phone call, and is not iOS
      Safari.
      U1: in Chrome on a desktop below 700 px, open the sheet, open the speed menu with Space,
      and press Escape. The list closes, and the sheet stays open. `App.#pressKey()` closes the
      drawer on each Escape that reaches the page.
      U2: on an iPhone, play a demo, take a phone call, and end it. The app must show "Play" or
      the audio failure message. The app has no `statechange` listener on the `AudioContext`:
      a suspended context stops the song time, the bar keeps "Pause", and Pause, then Play,
      resumes it.
      U3: on an iPhone, play a demo and wait until the bar hides. Tap Pause, then tap it again
      0.3 s later: the second tap pauses. Then tap Play four times at 0.4 s intervals: the play
      state changes each time. iOS Safari can send no click for the tap that shows the bar, so
      the guard of R1 ends 0.5 s after the lift, and fast taps can restart it (second re-review
      of step 6, U3).
- [ ] Stop a few missed frames from dropping the tier on a display at 50 Hz (second re-review of
      step 6, S2). `slowWindow()` (`app/settings.ts`) keeps a tier at 50 fps only if each kept
      interval is in the band. On a 50 Hz display, 5 missed frames in one window of 2 s drop the
      tier. With 1% missed frames at random, the tier drops one step in 16% of the minutes. A
      possible fix: scale the count of missed frames that a window permits to the frame rate.
- [ ] Do the manual release test of 9.4 with the user.

Done when: CI passes on `main` with Playwright in Chromium, and the deployed site plays the
default demo.
