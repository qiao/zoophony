# TODO

This list holds the tasks that build Zoophony, in order. It is the only place for the status of
the work. The rules for each task are in the design files of [`docs/design/`](docs/design.md).
The numbers in parentheses name its sections, and the index `docs/design.md` gives the file of
each section.

## How to use this list

1. Take the first unchecked task. Do the steps in order, and do the tasks of a step in order,
   unless a task says that it can wait.
2. Read the design sections that the task names before you start.
3. Do the task in one or more small commits (AGENTS.md). Ship the tests in the same commits.
4. In the last commit of the task, change its `[ ]` to `[x]`.
5. At the end of a step, check its "Done when" list. Then do the review of design 9.8. The
   manager reads the report and the images. After "Review:", write the date and "manager
   review". Then start the next step.
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
      Blocked: Safari WebDriver needs remote automation. In Safari 26, the user selects Safari >
      Settings > Advanced > "Show features for web developers", then Safari > Settings >
      Developer > "Allow remote automation", and runs `sudo safaridriver --enable`
      (`docs/research/webkit-audio.md`, section 8). Section 7 of the spike report gives the check
      by hand.
- [x] Measure the step 1 targets of 9.7: clock, load, and first sound.
- [x] Write the spike report in `docs/research/`, with the result of each check and target.
- [ ] Check Safari for the dropouts that Playwright WebKit showed (200 slow blocks, 0.82 s lost).
      If Safari has them too, fix them before step 2 (spike report, section 8).
      The cause in Playwright WebKit is outside our code: the AudioWorklet thread of WebKit has
      no real-time priority (`docs/research/webkit-audio.md`). Check Safari on an idle Mac and
      with a load (section 8 of that report). If Safari loses time, ask the user about section 7.
      Blocked: Safari automation is off. A person runs Safari, or turns on remote automation
      with the Safari 26 steps of the first Safari task.
- [x] Ask the user if the first sound target (9.7) counts the rest before the first note of the
      file, or ends at the heard song time 0 (spike report, section 8, item 4).
      Answer: each play starts with a count-in, and the target measures from the downbeat (song
      time 0) to the first sound (user decision of 2026-10-05, 9.7).
- [ ] When the Safari checks free `processor.ts` (review condition 3), remove its `volume`
      command and `SynthEngine.setVolume()`. Since the fix of SD2 of the UX audit, the `Player`
      sets the volume in the output chain and sends no `volume` command (6.4, 6.8).

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

Open items of the mesh rounds of 2026-10-16 to 2026-10-18 (each file is in `docs/decisions/`):

- [x] Rig the mesh of the monkey (trumpet). The user gave it on 2026-10-20. The monkey plays the
      trumpets with the studio body of the mesh, arms 1.5, a trumpet of 0.8, and no chair, as the
      user chose (`2026-10-20-mesh-monkey.md`).
- [x] Monkey: the short thighs made the seated monkey look as if it stands in front of its low
      chair. The user chose no chair (`2026-10-20-mesh-monkey.md`).
- [ ] Monkey: two thin faces across the wrists (329 and 1090) fold in each sample of the
      trumpeter. Rigid weights and a ring at the wrist move the fold to the next faces. Count their
      pixels in a probe build, or cut the thin faces (`2026-10-20-mesh-monkey.md`).
- [x] Monkey trumpeter (audit 2026-10-25, fault 2): both paws pressed together in front of the
      mouth like praying hands, and the arm gate failed the left grip turn (48°). Done: the left
      paw wraps the casings from the left, the right paw lies across the valve tops with the
      fingers down on them, and the grip turn is 17° (`2026-10-25-brass-grips.md`).
- [ ] Monkey trumpeter: from the front at the elevation 20, the right paw across the valve tops
      covers the mouth. From the stage camera (elevation 40), the mouth shows. A lower right grip
      or a smaller curl can free the mouth (`2026-10-25-brass-grips.md`).
- [ ] Monkey trumpeter: the right thumb of the mesh points back toward the mouthpiece at the
      height of the valve tops. A real player puts it under the lead pipe between the first and
      the second valve casing (wind-technique 2.1). The thumb has no bone.
- [x] Monkey: the standing monkey fell back, with its center of mass 17 cm behind its soles. It
      now stands with its feet under its hips and a forward lean (`2026-10-21-monkey-stand.md`).
- [ ] Monkey: the manager chose the stand C' while the user slept. The user reviews it against B
      in `docs/research/2026-10-20-monkey-stand/lineup.webp` (`2026-10-21-monkey-stand.md`).
- [ ] Mouse and beaver: they also stand in their seated poses with no chair. Measure their balance
      with `balance.ts` of `docs/research/2026-10-20-monkey-stand/`, and save the probe as a tool
      when a second body needs it.
- [ ] Monkey: the rig chair under the stand sets `STUDIO_MONKEY.seatHeight` to 0.292 m, the
      height of the haunch, for a body with no chair. Check each reader of the seat height of a
      body with no chair (`2026-10-21-monkey-stand.md`).
- [ ] Monkey: a chair as high as the haunch puts the root of the tail into the seat of the app.
      Only when the user asks for a chair again: a tail of three bones, or a tail over the back
      edge of the seat (`docs/research/2026-10-20-monkey-chair.md`).
- [x] Remove the unused code of the `side-round` ears and the `face-disc` face pattern: no species
      has them since the monkey mesh (`2026-10-20-mesh-monkey.md`).
- [x] Rig the mesh of the rhino (tuba). The user gave it on 2026-10-21 and asked that it stands.
      The rhino stands in each seat at the size of the parametric rhino, with a longer lead pipe
      of its tuba (`2026-10-21-mesh-rhino.md`).
- [ ] Rhino: the agent chose the stand, the arms of the mesh, the lead pipe, and the hold while the
      user slept. The user reviews them in `docs/research/2026-10-21-mesh-rhino/tubist-base-views.webp`
      and `lineup-base-views.webp` (`2026-10-21-mesh-rhino.md`).
- [x] Rhino: faces 38 and 2413, thin faces at the shoulders above the cut of the seam, fold in
      each sample of the tubist. They move rigidly (`weights.rigid`, `2026-10-22-rhino-arm.md`).
- [x] Rhino: face 773 at the middle of the chest (727 before) folds in each sample of the tubist,
      and face 448 (396 before) at rest. The rig of the arm tubes folds no face of the trunk in the
      worst sample (`fold-probe.txt` of `docs/research/2026-10-22-rhino-arm-2/`).
- [ ] Rhino: with an assumed tuba of 10 kg, the center of mass is 2.7 cm to 3.4 cm in front of the
      middle of the soles, at 59% to 61% of the support depth, at the top of the stable range of
      30% to 60%. A small lean of the trunk back is an option (`balance.txt`).
- [ ] Rhino: the thick left paw goes 1.9 cm into the main branch of the tuba, an accepted depth of
      the sweep. The paws are mittens and do not wrap the tube (`TUBIST_SWEEP`).
- [x] Rhino tubist (audit 2026-10-25, unverified row): the arm gate failed the left grip turn
      (96°), because the left paw pointed at the main branch from its back left, and its palm
      faced up. Done: the left paw lies on the left side of the branch with the knuckles to the
      left, and the grip turn is 40° (`2026-10-25-brass-grips.md`).
- [x] Rhino tubist: the left paw turns 169° on its forearm (limit 170°, 148° before), and the
      left forearm edge at rest is 22% shorter than in its bind, so the stretch measure reads
      0.24 (0.08 before, limit 0.35). With the left elbow further out, the paw passed 170°, and
      with the elbow down, the upper arm went 2.5 cm to 3.3 cm into the body
      (`2026-10-25-brass-grips.md`). Done: the bind elbow bends forward, and the tuba elbows point
      down and out. The paws turn 87° and 37° on their forearms, and the stretch reads 0.07
      (`2026-10-26-fifth-review-rhino.md`).
- [ ] Trim `docs/agents/model-traps.md` to about 3,000 words: it has 3,964 words since the traps
      of the rhino, the deer, and the penguin meshes, and of the split beak.
- [x] Rig the mesh of the deer (harp). The user gave it on 2026-10-21. The deer sits on the stool
      of the harp with its whole haunch on the seat, at the size of the parametric deer, and plays
      a smaller harp (`2026-10-21-mesh-deer.md`).
- [ ] Deer: the manager chose arms 1.25 while the user slept, and the round `harp-lean` chose a
      harp of 0.6 (0.84 m) leaned 12° back onto the right shoulder, on a box of 0.23 m. The user
      reviews the arms against 1.15 or 1 of the report "Arms and harp"
      (`docs/research/2026-10-21-mesh-deer.md`), and the harp size, the lean, and the box
      (`docs/research/2026-10-25-harp-lean.md`, `images/`).
- [x] Deer: the harp stood upright, while a real harp leans back on the right shoulder. The harp
      leans 12° back with the top of its soundbox on the front of the right shoulder, and the
      elbows point out (`docs/decisions/2026-10-25-harp-lean.md`).
- [ ] Deer harp: the right move twist max of the arm gate is 108° (100° on `main`, margin 3°,
      limit 176°), a `FAIL` on the margin only. Five right elbows gave 106° to 110°. Try a turn
      of the right paw toward the treble strings, or accept it in the gate.
- [ ] Deer harp: the left palm is 0.14 m above the middle of the strings and the right palm at the
      middle, where a harpist holds both hands at almost one level. At 0.08 m, the left paw swing
      is 68° (limit 70°) (`palm-scan.txt` of `docs/research/2026-10-25-harp-lean/`).
- [ ] Deer harp: the forearms rise about 30° from the elbow to the wrist, where a harpist holds them
      level. The elbows of the short arms hang below the strings.
- [ ] Deer harp: the knees lie under the round belly, so the base stands in front of them, between
      them only in the front view. From the front, the crown of the column stands just below the
      muzzle (`images/views-chord-front.webp` of the round).
- [ ] Deer harp: the smaller harp moved the seats of `boulanger-matin` by 4 to 6 cm, and 8 to
      30 cm for the deer, the piano, three violins, and the three oboes (`layout-moves.txt`).
      Check the shots of the demo after the test pause (`pnpm test:paused src/shots/`).
- [ ] Deer harp: `HARPIST_SWEEP` keeps the accepted depth of the forearms in the body (2.5 cm), now
      0.0 cm, and its reason of the right forearm on the soundbox. Trim them when the tests come
      back.
- [x] Deer: the haunch spread into a flat light rim on the seat of the stool, and a dark wedge
      showed under the puff tail from the back. The sit now goes to the final seat top and carries
      the tail down (`seat/seat-after.webp` of the research folder).
- [ ] Deer: a small cream fold of the haunch lies on the seat under the puff tail, with the shadow
      of the tail above it (`seat/zoom-top-carry.webp` of the research folder).
- [x] Deer: the knees, the shins, and the hooves clipped the wider stool. The stool takes the depth of
      the seat of the chair of the body, and the sweep of the harpist measures the stool
      (`stool-clip/` of the research folder).
- [ ] Add the chair as an obstacle to the sweeps of the seated roles, with the legs and the haunch as
      parts, as the sweep of the harpist has the stool (`SEATED_PARTS`, `seatSurface()` of
      `pose/test-sweep-roles.ts`). Then add the accepted contact of each haunch.
- [x] Deer: dark faces show under the right armpit in the play. The points at the shoulders in
      the back view are gone (round `deer-dog-seams`). Look at the zoomed views of `pnpm
      close-views harpist`. Done: the rebuilt arms of round `fifth-deer`
      (`2026-10-26-fifth-review-deer.md`).
- [x] Deer: 2 to 14 faces of the arms fold in each sample of the harpist, under the limit of the
      arm gate (`app/fold-probe.txt`). A fold round with rings or rigid weights. Done: 0% of the
      rest and the lift samples fold, and 8.3% of the play with one face at the right inner elbow
      (`docs/research/2026-10-26-fifth-deer.md`).
- [x] Deer (user, 2026-10-26: "the deer's upper arm are missing pieces (have dent)"): the arm and
      the trunk were two shells under the cut, and the back of each upper arm showed a notch.
      Done: the rig reads a copy with the seam cut and the side wall of the cat, quad tube arms,
      Blender weights, and arm segments (`tools/blender/deer_arms.py`).
- [ ] Deer: the user reviews the rebuilt arms of round `fifth-deer` (`user-angle.webp` and
      `arms-e40.webp` of `docs/research/2026-10-26-fifth-deer/`), and the bind upper arm 18° nearer
      to the hanging arm.
- [x] Deer: from straight behind, the outline of the corner of the left armpit has small steps
      where the bridge faces of the socket meet the side wall (`armpit-probes.webp` of the round
      `fifth-deer`). Try a smooth of the bridge vertices at the back end of the armpit line.
      Done: the dark corner is the underside of the arm root (no shadow, no fold, the normals of
      the faces), and a smoothing of the back end of the armpit line makes it smaller and its
      outline smoother. The stage light shows it soft (`2026-10-27-legs-armpit.md`).
- [x] Deer (`2026-10-27-legs-armpit.md`): one face of the right inner elbow folds in 8.2% of the
      play samples. The mean of its painted weights (`weights.rigidPainted`) folded it in each
      sample. Try a ring or a split of the face at the elbow of the rebuilt arm.
      Done: the bent bind elbow sheared its quad, so its edge was the long diagonal. The edge
      flips (`refine.pointFlip`), and the face folds in no sample of the rest, the play, the
      lifts, and the lowerings (`2026-10-27-rigs3.md`).
- [ ] Deer: the forearms come 2.8 cm into the harp in the play (1.8 cm on `main` before the round
      `fifth-deer`, limit 4.0 cm), and the paw swing of the left arm is 66° (limit 70°).
- [x] Deer: the seated deer was lower than the parametric deer (skull top 1.125 m against 1.311 m).
      The user made it 1.2 times as large: the seated skull top is 1.349 m (`2026-10-21-mesh-deer.md`).
- [ ] Remove the parametric biped with its ears, snouts, and tails: no species has it since the
      rhino and the deer meshes (`2026-10-21-mesh-rhino.md`, `2026-10-21-mesh-deer.md`).
- [x] Rig the mesh of the penguin (choir). The user gave it on 2026-10-21 and asked that it stands.
      The penguin stands on its riser at the head top of the egg penguin, with the flippers of the
      mesh and the folder within their reach (`2026-10-21-mesh-penguin.md`).
- [ ] Penguin: the agent chose the size, the flippers of the mesh, the folder place, the bind of
      the upper arms, and the white throat while the user slept. The user reviews them in
      `docs/research/2026-10-21-mesh-penguin/singer-base-views.webp` and `options.md`: option B
      gives flippers 1.25 times as long and the folder at the height of the reference images.
- [x] Penguin: the beak opens with each note on a jaw bone of the split beak of a copy of the mesh,
      and closes to half between two notes (`2026-10-21-penguin-beak.md`).
- [ ] Penguin: black wedges from the roots of the flippers show on the white belly under the
      folder, in the front views of `docs/research/2026-10-21-mesh-penguin/singer-base-views.webp`.
- [ ] Penguin: the crease angle 35° is the angle of the other meshes, with no facet probe against
      the penguins of the reference images (`ANIMALS` of `tools/studio-body.ts`).
- [ ] Red fox and rabbit: string planes of 9° and 10°, under the real 17°, because larger angles
      fold the right shoulder. A rig round on the right shoulder (`2026-10-17-bow-arm.md`).
- [x] Pig and rabbit: the upper arms of the pig crumpled into flaps, and the bow upper arm of the
      rabbit read as a flat plank. The pig takes round upper arms in a copy of its mesh, and the
      rabbit rounder upper arms and the bow elbow of the red fox (`2026-10-21-arm-form.md`).
- [x] Oboe mouse: the arm skin creases against the mesh in 5.9% and 9.5% of the edges in the
      play with the rebuilt arms (limit 14.6% of `pnpm arm-look`, `2026-10-25-wind-arms.md`).
- [x] Elephant: the narrow axis of the middle of each upper arm is 0.32 and 0.35 of the wide axis
      in the play, below the limit 0.44 of `pnpm arm-look`. Done: the rig frees each arm at its
      crease with the trunk, 0.55 and 0.47 (`2026-10-22-elephant-crease.md`).
- [ ] Panda: try `weights.armCrease` on each arm that is one solid with the trunk
      (`2026-10-22-elephant-crease.md`). The rabbit and the rhino have A-pose meshes since
      2026-10-23.
- [ ] Beaver: the narrow axis of the middle of each upper arm is 0.40 and 0.35 of the wide axis in
      the play, below the limit 0.44 of `pnpm arm-look`.
- [x] Rabbit (A-pose mesh, `2026-10-23-rabbit-apose.md`): with its own faces and the arm factor
      1.6225 of the violin reach, the arms fold past the gate limit (10 and 11 faces against 8).
      The user asked for a little stretch: the factor 1.3 and a violin of 0.83 pass each limit
      (`2026-10-23-rabbit-arms.md`).
- [ ] Pig (T-pose mesh, `2026-10-24-pig-tpose.md`): the trial rig shows a flat slab and a flap
      at the shoulders in the play, and 9 to 14 folded arm faces (limit 8). The pig of `main`
      stays. Ask the user: a ring at each shoulder, or another mesh.
- [x] Polar bear (T-pose mesh, `2026-10-24-polar-bear-tpose.md`): at rest, slivers show along the
      upper arms, and a dark notch shows under the right upper arm from the right side. The quad
      arms and the arm segments of `2026-10-24-polar-bear-arms.md` remove them.
- [ ] Polar bear (`2026-10-24-polar-bear-arms.md`): the arm root between the trunk and the
      shoulder line keeps the long faces of the user, and the left shoulder top shows a flat facet
      at rest from the back (`crops.png` of `2026-10-24-polar-bear-arms/`). In the bind, 5 faces
      of spine1 turn over (2 on `main` before), and no view shows them.
- [ ] Polar bear (`2026-10-24-polar-bear-seat.md`): with the nearer keys, the play forearms go
      4.3 cm into the belly (3.1 cm before, accepted limit 9 cm), and the left upper arm keeps
      0.55 of its round shape, at its limit. From the front, the open lid now hides the head in
      the play.
- [ ] Polar bear (`2026-10-24-pianist-pose.md`): from the front, the larger lid hides the bear
      and its paws. At the far keys, the outer upper arm stands 36° to 41° out, and the upper arms
      stand about 27° to 30° out and 19° forward around the round trunk (a pianist: 0° to 20°
      forward, `2026-10-27-polar-bench.md`).
      The wrist touches the front edge of the keys up to 1.1 cm (limit 1.5 cm).
- [x] Polar bear (audit 2026-10-25, fault 3): at rest, the paws hung in front of the chest at the
      height of the keys. Done: the paws rest in the lap on the lower belly
      (`2026-10-25-timpani-piano-rest.md`).
- [ ] Polar bear rest: the paws rest 8 cm to 10 cm below the key top, on the lower belly. The
      thighs past the belly stand 0.7 m from the shoulder joint, and the arm reaches 0.49 m. Lower
      paws folded up to 6 more faces at the right shoulder (`2026-10-25-timpani-piano-rest.md`).
- [ ] Polar bear rig: the left shoulder folds about 20 faces at rest and in most play samples
      (arm gate folds p95 19, limit 8, `OPEN`). An arm-root face folds when the upper arm turns
      more than 60° from the T bind (`pnpm fold-probe pianist --bins 1750`). No pose of the scan
      moved it: it needs loop edges or a corrective shape at the armpit
      (`2026-10-25-timpani-piano-rest.md`).
- [ ] Polar bear rig (audit 2026-10-25, fault 4): each forearm folds into a hard dark V at the
      inner elbow in the chord. The right faces 574, 575, and 576 fold in 54% to 77% of the play
      at each elbow pole of the scan, so the fix needs loop edges or a corrective shape at the
      elbow (`2026-10-25-timpani-piano-rest.md`).
- [ ] Polar bear (`2026-10-24-piano-pedals.md`): the case shades the brass pedals in the gallery
      light. From the stage camera at elevation 40, the bear and the keys hide the pedals and the
      feet. No demo has sustain pedal data (CC 64) on the piano, so the damper pedal moves only
      with a file of the user.
- [ ] Bear (T-pose mesh, `2026-10-23-bear-tpose.md`): at rest, the arms stand out about 35° from
      the body around the wide belly, where the studio bear held its paws at the hips. The
      upper arms go 2.2 cm into the body while the arms move (3.5 cm before the quad arms of
      `2026-10-26-arm-fixes.md`, which remove the long sharp facets of the bent arms).
- [x] Red and tan foxes (`2026-10-26-third-review.md`): the user saw a dark area on the back. Done:
      the undersides of small fur notches below the ruff faced down; `fox_arms.py` now smooths the
      18 vertices of the notches, as the user allowed.
- [x] Rabbit (`2026-10-26-third-review.md`): the user saw the left lap or leg as cut at rest. Done:
      the lower end of the violin sank into the left knee; the violin now stands 0.1 H above it.
- [x] Rabbit and polar bear (`2026-10-26-fourth-review.md`): the user saw a cut rabbit knee and a
      bulky polar bear knee. Done: the hips held most of each thigh, and the shin of the bear held
      the knee front. The thighs now keep their own weight (`weights.haunch`, `weights.knee`).
- [x] Cat (`2026-10-26-fourth-review.md`): the bow arm bent as a wing at rest and reached straight
      out in the moves. Done: the rest elbow hangs near the side, and the moves keep it bent.
- [x] Rabbit, red fox, and cat (`2026-10-26-fourth-review.md`): at rest, the left paws lay over
      the strings. Done: a rest twist of 0.5 rad closes each paw around the neck.
- [ ] Cat (`2026-10-26-fourth-review.md`): at rest and in the moves, the right upper arm meets the
      round belly 1.7 cm deep near the elbow (limit 1.5). A lower elbow goes deeper, and an elbow
      further out bends the arm as a wing.
- [x] Rabbit, red fox, and cat (`2026-10-26-fifth-review-strings.md`): the user saw the
      instrument turn against the wrist in the lift and the lowering. Done: the instrument hangs
      from the left paw and turns with it. No fast step turns the two in opposite senses.
- [x] Rabbit, red fox, and cat (`2026-10-26-fifth-review-strings.md`): at rest, the left paw lay
      over the neck and went into the instrument. Done: a rest grip on the neck. The paws go 0.4 cm
      to 0.8 cm in.
- [x] Rabbit, red fox, and cat (`2026-10-26-fifth-review-strings.md`): the bow paws rested high or
      at the outer side of the thigh. Done: low at the front of the lap with straight wrists.
- [x] Cat (`2026-10-26-fifth-review-strings.md`): the bow arm bent as a wing at rest, and the bow
      arm went straight in the lowering. Done: the bow paw rests at the lap with the elbow at 111°,
      and the moves keep it bent from 74° to 98°.
- [x] Rabbit, red fox, and cat (`2026-10-26-fifth-review-strings.md`): in each move, the left
      forearm skin passes one twist step of 180°, so the wrist flattens for a moment near the jaw
      (lift flat p5 0.72 to 0.76 against 0.81 to 0.86), and the moves of the arm gate are worse
      than on `57849ac5` within each limit (move turn up to 2,197°/s). A playing grip near the
      supination of a real violinist (about 90° in place of 156°) removes it. A play elbow nearer to
      the middle flattened the play skin (flat 0.31 on the cat). Round `fifth-strings2`: no rest
      grip with a natural elbow avoids the pass, because the play lies 215° to 234° of supination
      from the bind of the mesh paw, and 12 rest elbows give rest twists of -177° to 28°. The band
      is now 27°: lift flat p5 0.72 to 0.82, move turn up to 2,067°/s, and the forearm twist still
      dips to 6° to 9° for about 0.1 s (`2026-10-27-violin-carry.md`). A new bind of the paw with
      a supinated paw also removes it. Round `fifth-strings3`: the rest and the play fix both ends
      of the twist path, so each path from the upright rest passes 180°. A rest roll (only 60° to
      90° with the scroll to the side avoids the pass), an elbow path in the middle, and a play
      elbow toward the middle (cat shoulder ring flat 0.24 to 0.50, red fox forearm twist 92° to
      102°) failed (`2026-10-27-violin-unwind.md`). Next: a new bind of the mesh paw, supinated
      about 60° in Blender, for the rabbit, the red fox, and the cat. The rest twist then lies near
      -31° and the play twist near -155°. Check the play skin with the arm gate first. Done: the
      bind left paw turns 100°, 110°, and 120° toward supination (`bindSupination`), each twist
      stays within 122°, the left forearm twist changes at most 9.6° in 0.05 s over all moves
      (58.1° before), the unwind is gone, and the left arms pass the gate against `57849ac5`
      (`2026-10-27-left-paw-bind.md`).
- [ ] Rabbit, red fox, cat, and tan fox (`2026-10-27-left-paw-bind.md`): the bind forearm of the
      left arm is twisted 100° to 120° by the linear skin of the rig, and the arm-down shape of the
      clip `reference` restores the loss twice. The mean radius of the rest forearm is 3% to 9%
      above the bind forearm of `main` (`forearm-radius.txt` of
      `docs/research/2026-10-27-left-paw-bind/`), and four depth pairs grow by 0.1 cm to 0.2 cm
      (rabbit paws in the violin in the lift 0.9 cm, cat paws in the viola in the play 0.9 cm).
      Mask the forearm part of the arm-down shape on a supinated side, and compare the 2x crops of
      the rest from each side.
- [ ] Cellist, bassist, and hornist (`2026-10-27-left-paw-bind.md`): their accepted left grips
      twist -146°, -164°, and -153° from the pronated bind of their meshes, near the limit of 170°.
      A supinated bind paw (`bindSupination`) can lower these twists. Scan the angle with
      `bind-scan.ts` of `docs/research/2026-10-27-left-paw-bind/` and the arm gate.
- [x] Cat and tan fox (`2026-10-27-cat-fox.md`): the user said "the cat's arm has dent and is
      longer than expected" and "the fox doesn't seem to be holding the instrument properly".
      Done: the cat bind upper arm lies nearer to the hanging arm of the mesh, its arm roots take
      the skin normals, and the rest viola stands nearer to the hip (rest elbow 116°, 131°
      before). The left flute paw faces the flute in the play and holds it from its front, and it
      grasps in each play sample (0% before).
- [x] Cat (`2026-10-27-cat-fox.md`): the arm keeps the length of the mesh, 1.30 H from the
      shoulder joint to the wrist, against about 1.10 H on `cat-views.png`. With arms 0.88 as
      long, the left paw reached the fingerboard only from 0.62 (0.33 now). Ask the user before a
      shorter arm with a smaller viola or a nearer hold. Done: in H the mesh arm matches the
      sheet, but the cat trunk is 0.69 of the mesh. The arm is 1.10 H (upper arm 0.92, forearm
      0.78), the cat plays a 10-inch viola near the neck, the paw reaches the nut, and the bow
      the hair to 5 mm before its end (`2026-10-27-cat-fox2.md`).
- [ ] Cat (`2026-10-27-cat-fox.md`): the armpit line at the lower back of each arm root still
      folds a little in the play. The socket of the fox, with no shoulder ring and Blender weights
      on the first ring, tore the arm root open on the cat. Since `2026-10-27-cat3.md`, the faces
      729, 688, and 728 at the right armpit line fold in 9 to 14 more points of the play samples
      (`fold.txt` of `docs/research/2026-10-27-cat3/`).
- [x] Tan fox (`2026-10-27-cat-fox.md`): the right flute paw holds the flute from behind and
      above. In front of the flute, it turned 180° on its forearm in the moves (move turn up to
      17,945°/s). The left paw fails the margin of the move twist of the gate (87°, `main` 67°,
      margin 3°, limit 176°) and goes 0.4 cm into the flute (0.2 cm). The manager decides on the
      2x paw crops (`flutist-e20-*.webp` of `docs/research/2026-10-27-cat-fox/`).
      Done: the right paw holds the flute as a right hand, behind it and a little below, with
      the fingers over the top, and grasps in each sample with no flip (`2026-10-27-cat-fox2.md`).
- [x] Cat (`2026-10-27-cat-fox2.md`): the user said "the cat is not "holding" the viola in rest
      mode". Done: the left rest paw closes around the neck (92% of the directions around the
      neck, 42% before), and goes 0.4 cm into the viola.
- [ ] Cat (`2026-10-27-cat-fox2.md`): with the shorter arm and the viola near the neck, the bow
      upper arm goes 2.5 cm into the belly at the tip (1.1 cm before, 1.7% of the play over the
      limit), the viola 1.9 cm into the chest (1.0 cm), and the claws 2.1 cm into the viola in the
      lowering (1.2 cm). `pnpm pose-depth violist --base main` marks 15 pairs.
      Partly done (`2026-10-27-cat3.md`): the jaw goes 1.2 cm into the chin rest, the claws 1.1 cm
      into the viola in the lowering, and the bow reaches the tip. Open: the bow upper arm goes
      2.7 cm into the belly at the tip and 2.5 cm in pizzicato, and 1.2 cm at rest (0.9 cm before
      `sixth-cat-fox2`). Fit it after the round of the oval belly (user, 2026-10-27: "make the
      cat's belly more oval and smooth"), with the levers of section 4 of the report.
      Partly done (`2026-10-27-cat-belly.md`): with the even oval belly, the right shoulder turn
      of 36°, and the new pizzicato and rest elbows, the bow upper arm goes 2.3 cm into the belly
      in the play (2.7 cm on `main`), 1.9 cm in the lowering after a pizzicato (2.7 cm), and
      0.8 cm at rest (1.2 cm). Open: the play and the lowering over the limit of 1.5 cm, and the
      right claws 2.2 cm into the viola at the frog. A shoulder turn of 38° folds 8 arm faces, and
      a pizzicato elbow of (1.5, -0.5, -1) passes the margin of the move twist.
      Partly done (`2026-10-27-cat-lap.md`): the front of the upper belly is a little flatter,
      most at the middle line, and the pizzicato palm plucks from the side of the strings. The
      bow upper arm goes 2.1 cm into the body at the tip on the lowest string (2.3 cm on
      `main`, 0.7% of the play over the limit) and 1.6 cm in one lowering (1.9 cm). Open: the
      manager accepts up to 2.0 cm at the tip. A larger flat move left a gap in the side view,
      and a shoulder turn of 38° (1.97 cm) folds face 785 in 50% of the play. A flatter inner
      upper arm can take a part (`probes/arm-flat-est.ts` of the report).
- [ ] Cat (`2026-10-27-cat-lap.md`): the right claws go 2.2 cm into the viola at the frog on the
      A string in the play and 2.1 cm at the end of the lift (limit 1.5 cm), as on `main`.
- [ ] Cat (`2026-10-27-cat-belly.md`): the right shoulder turn of 36° folds the faces 820, 821,
      832, and 1046 at the right clavicle and the neck under the chin in 81% to 100% of the play
      (none with 30°, all with 33°). The most folded faces in a sample do not grow (28, 29 on
      `main`). The manager decides on the crops, or a `raise` shape of the clavicle fixes them.
      Partly done (`2026-10-27-cat-lap.md`): with `weights.armTop` 0.645 to 0.69, faces 820,
      821, and 1046 fold in no sample. Open: face 832 at the front of the right armpit folds in
      82% of the play (81% on `main`). A rigid face folded three new faces, and arm segments
      allow no `raise`.
- [x] Cat (`2026-10-27-cat-belly.md`): the even oval belly meets the thigh tops with a turn of
      34° in the side view (22° on `main`), because the arc starts steep at the lap. Look at the
      side crops of `docs/research/2026-10-27-cat-belly/`, and lower the start of the arc or end
      the lap crease of the seat (`crease` of `tools/mesh-rigs/cat.json`) if it shows.
      Done (`2026-10-27-cat-lap.md`): a second smoothing of the seated bind reaches 4 rings up
      the belly front (`crease.lap`). The largest turn of the front is 12° to 13.6°, and no lap
      edge is over 35.5°.
- [x] Cat (`2026-10-27-cat-belly.md`): a ridge runs along the middle line of the chest: the
      largest angle between light faces stays 48° at 0.65 to 0.76 of the trunk line. The round of
      the belly front fades out at the ends of the arc.
      Done (`2026-10-27-cat-lap.md`): the 48° edge lay on the middle line of the lower belly
      (f 0.17 of the bind), and the lap smoothing removed it. The flat zone of the upper belly
      peaks at the middle line, so the largest edge of the patch is 34.5° (48° on `main`),
      under the crease angle of 35°, and no light strip shows at rest.
- [ ] Cat (`2026-10-27-cat-lap.md`): the right forearm goes 0.3 cm into the upper belly at
      f 0.6 in one play sample of `brahms-2` (0.4 cm on `main`, limit 1.5 cm). A flat zone from
      0.5 of the trunk line removed it, but the bow upper arm then went 1.53 cm in at the tip.
- [ ] Cat (`2026-10-27-cat-belly.md`): from the back, a dark band in a V lies on the lower back
      above the seat, on `main` too (`belly-back.webp`). Find the faces and the light that make it.
- [x] Cat (`2026-10-27-cat-arm.md`): the user said "the cat's arm has lumps". Done: the linear
      blend of the seated bind (elbow 79°, left paw 120°) left the elbow and the forearm thin, so
      the upper arm read as a bulge. The left lower arm takes the dual quaternion bind
      (`bind.arm`): in the play, the elbow is 5.15 cm (4.40 cm) and the forearm 4.65 cm (4.24 cm),
      tube 5.2 cm. The bow arm keeps the linear blend, at 0.93 of the tube.
- [x] Cat (`2026-10-27-cat-arm.md`): the side wall under each arm is a flat plate on the plane of
      the seam, 15 cm high, with corners of about 45° to the trunk and thin faces of the seam cut
      at its lower tip. The raised arm of the play shows it as a light patch with a crease. Round
      it into the trunk in the copy, clean the thin faces (`step_clean_cut()` of
      `wind_arms.py`), and keep the flat inner side of the arm inside it (`wall-cuts.png`).
      Done (`2026-10-28-cat-wall.md`): the lips of the cut under each wall go, even faces fill
      the wall, and the trunk near it rounds into it. The outline of the cuts under the wall
      turns at most 48° (142° to 180° before), and no light patch shows in the play.
- [ ] Cat (`2026-10-27-cat-arm.md`): a dark crease lies at the front of the left arm root in the
      play, between the chest and the upper arm. The root of the tube holds 0.2 to 0.5 of chest
      weight (`anchor` and Smooth), so it narrows when the arm rises: 4.65 cm at 0.5 of the upper
      arm in the play, 4.93 cm in the bind (`weights-main.txt`).
      Tried (`2026-10-28-cat-wall.md`): the Smooth of `step_paint()` gives the second and the
      third ring of each tube 0.6 and 0.28 of the trunk bones from the socket ring. A Smooth of
      the arm bones alone kept the root 4.91 cm in the play (bind 5.00 cm), but folded 11 new
      faces at the root at rest and in the play, and on the right arm a dark
      notch opened at rest. Each mix that folded no new face kept the crease. Next: a root
      weight that differs between the front and the inner side, or a bind arm nearer to the rest.
      Partly done (`2026-10-28-cat-root.md`): two shapes of `raise` take the front of the left
      root half of the way with the first upper arm segment in the play and at rest. The
      deepening of the valleys in front of the root goes from 1,830 to 694 cm·° in the play and
      from 3,643 to 2,185 cm·° at rest, and the root at 0.45 of the upper arm is 4.64 cm in the
      play (4.48 cm, bind 5.26 cm). A soft fold stays where the chest meets the arm. A smoothing in the pose of the shape filled it, but turned over the
      thin faces at the front end of the armpit line: clean them in the copy first.
      Partly done (`2026-10-28-cat-root2.md`): the band of the left armpit line has no thin face
      (`step_clean_pit()`), a third shape covers the steps between the rest and the play, and
      the follow reaches 0.05 units. The deepening goes from 694 to 441 cm·° in the play, from
      2,185 to 1,391 cm·° at rest, and from 1,984 to 1,001 cm·° in the lift sample 5, with no new
      folded face. A softer fold stays in the play and at rest (`user51-zoom.webp`,
      `rest-zoom.webp`). A smoothing of the skin in the pose pulled the root front into a dark
      pocket also after the clean. Next: a root ring with more vertices at the front, or a bind
      arm nearer to the play.
      Partly done (`2026-10-28-cat-root3.md`): the shape of the play fills the valleys of the
      root front and moves no vertex in (`follow.fill`). The valleys in front of the root at 30 s
      of the play are 828 cm·° (1,154), and the crease at az -72 is lighter. Face 2826 below the
      root folds in 0.1% of the play. The notch at rest stays: the copy has a fin at the front
      end of the left armpit line, where the socket and the first shoulder ring lie on the plane
      of the seam and the trunk in front of them curves in (`fin-copy.webp`). A smoothing of the
      line ends in the copy folded new faces. Next: put the socket front and the first ring
      front onto the trunk surface in the copy, before the weights.
- [x] Cat (`2026-10-28-cat-wall.md`): with the round side walls, face 1594 at the front of the
      left armpit folds in each play sample (faces 1440, 2609, and 2610 1.5 to 2 cm from it did
      on `main`). Done (`2026-10-28-cat-root.md`): the shape of the raised left arm folds it in no
      sample, and against `95a99a39d` no new face folds.
- [ ] Cat (`2026-10-28-cat-wall.md`): at the ends of each armpit line, the wall meets the trunk at
      up to 108°, and a small point shows from az 150 and az -150. Vertices 1607, 1609, and 1610
      at the front end of the left line lie on one line, so a smoothing near them turned their
      thin faces over (`2026-10-28-cat-root.md`).
      Partly done (`2026-10-28-cat-root2.md`): near the ends of the left line, 4 faces have a
      corner under 12° (13 before), and no three corners lie on one line. The right line keeps
      its 14 thin faces: with the clean, the root ring of the bow arm went flatter in the play
      (flat p5 0.75, 0.84 on `main`, a fail of the gate), and with the new strip alone, the
      valleys in front of the right root deepened. A clean of the right band needs weights that
      keep the root ring round, such as the weights of the copy before the clean on the tube.
      Partly done (`2026-10-28-cat-root3.md`): a fourth shape of `raise` takes the root front of
      the bow arm along in the play. Faces 772 and 775 fold in 10% of the play (100%), the
      right valleys at 30 s are 3,158 cm·° (4,991), and the point from az 150 is smaller. Faces
      815 and 721 at the right shoulder top fold in under 0.05% of the play. The 14 thin faces
      stay: a clean that keeps the ring and slides its near vertices to the next ring, and a
      smoothing of the line ends, each folded new faces in each play sample.
- [ ] Cat (`2026-10-27-cat-arm.md`): near the elbow, the left forearm is 0.89 of the tube in the
      play (4.65 cm, 5.2 cm), because the app turns the paw about 100° from the bind with the
      linear blend, over three forearm segments for each ring.
- [x] Cat (`2026-10-27-cat-fox2.md`): the pits at the back of the left arm root are larger in the
      play (14.5 cm³, 4.7 cm³ before, `dent.txt`), with no hard edge. Look at the crops of the
      user angle. Done: the left shoulder turn of 35° made them. The shoulder turns 20°, the
      viola falls 10° to the scroll, and the pits are 4.8 cm³ in the play (`2026-10-27-cat3.md`).
- [x] Cat (`2026-10-27-cat-fox2.md`): the head lift of 15° turns face 4220 under the jaw over in
      each play sample. Done: the tips of the lower whiskers hung below the head line on the neck
      bone. They follow the head now, and faces 4220 and 4223 fold in no sample
      (`2026-10-27-cat3.md`).
- [ ] Tan fox (`2026-10-27-cat-fox2.md`): the left flute paw keeps the move twist of 87° (67°
      before round `sixth-cat-fox`). No left elbow that grasps the flute brings it to 70°.
- [x] Red fox, tan fox, and rabbit (`2026-10-28-fox-rabbit-crease.md`): the user said "seeing
      visible crease on fox and rabbit's arm", then "it may be existing fault. anyways, fix
      them". Done: both creases were old splits of the smooth normals of the seated bind, which
      the front key light shows. The fox elbows and the rabbit arm roots and
      elbows take the skin normals (`rootNormals`): no hard edge over 16° stays at the arm roots
      and the elbows (125 cm and 99 cm at rest before), with the poses and the gate of `main`.
- [ ] Red fox and tan fox (`2026-10-28-fox-rabbit-crease.md`): at rest, the crook of the right
      elbow keeps a soft fold of the skin, with no hard line, because the linear blend pinches the
      bent inner elbow. The dual quaternion bind folds a bow arm that bends further than the bind.
- [ ] Rabbit (`2026-10-28-fox-rabbit-crease.md`): at rest, a narrow groove runs between the front
      of each upper arm and the trunk, with no hard line. It is the gap of the arm copy, which the
      arm-down shape gives back (`rabbit-arms.glb`). A fill of the gap in the copy can close it.
- [ ] Red fox and tan fox (`2026-10-28-fox-rabbit-crease.md`): thin dark V lines show on the white
      chest under the front key: splits of the normals of the fur spikes of the user mesh, on
      `main` too. Smooth them like the neck notches, or give them the skin normals.
- [x] Rabbit, red fox, and cat (`2026-10-26-fifth-review-strings.md`): the grip that the viewer sees
      changes by 56° to 79° in the moves (target 30°), because the retarget turns each paw toward
      its forearm (`PAW_TURN`), and the forearm crosses the neck at rest and runs along it in the
      play. Done: the rest paw takes its own turn in the plane of its palm near the turn of the
      play, and the grip changes by 22° to 27° (`2026-10-27-violin-carry.md`).
- [x] Rabbit, red fox, and cat (`2026-10-26-fifth-review-strings.md`): the carried instrument
      goes up to 2.2 cm into the body near the jaw in some moves (limit 2.0, up to 1.9 cm on
      `57849ac5`), because it hangs from the paw there. Each other wrist via of the scan went
      deeper. With the rest grip of round `fifth-strings2`, up to 2.1 cm (red fox lift, cat
      lowering). Done: the wrist vias of the red fox and the cat move out, and the instrument
      goes at most 1.9 cm in, with no pair deeper (`2026-10-27-violin-unwind.md`).
- [ ] Cat (`2026-10-26-fifth-review-strings.md`): the round belly keeps both elbows 35° to 48°
      from the vertical at rest. Lower elbows went 2.2 cm to 4.1 cm into the belly (limit 1.5).
- [x] Cat (`2026-10-26-fifth-review-strings.md`): at rest, the left paw goes 0.8 cm into the
      viola (target about 0.5 cm, 0.8 cm on `57849ac5`). The claws went from 1.0 cm to 0.3 cm.
      Done: with the rest grip of the play, 11 mm off the neck, the paw stays out of the viola
      (0.0 cm), and the claws go 0.3 cm in (`2026-10-27-violin-carry.md`).
- [x] Bear and polar bear (`2026-10-26-fifth-review-bears.md`): the user saw a black area under
      the bear armpit and bulky polar bear knees. Done: the bear arm bake comes before the flatten
      (65 black faces before, 0 now), and rings cut the long faces of each polar bear knee.
- [x] Elephant (`2026-10-26-fifth-review-bears.md`): `elephant_arms.py` also flattens the upper
      arms before the bake (0.009 units, bake rays from 0.006), and about 24 faces of the inner
      upper arms take black texels (`dark-elephant.txt`). Put the flatten after the bake. Done:
      the elephant arm bake comes before the flatten (30 black faces before, 0 now), with the
      same geometry and weights (`2026-10-27-elephant-bake.md`).
- [ ] Bear (`2026-10-26-fifth-review-bears.md`): in the gallery light, each arm casts a black
      shadow on the trunk under the armpit. The scene light is an open decision of the user.
- [ ] Elephant (`2026-10-27-elephant-bake.md`): in the gallery light, each arm casts a black band
      of shadow on the trunk beside the belly, as on the bear. The probe with no shadow shows the
      skin there (`armpit-probes.webp`). It waits for the same decision of the scene light.
- [x] Polar bear (`2026-10-26-fifth-review-bears.md`): stacked light stripes at the back of each
      knee, and a face of the right shin that folds in 0.6% of the play samples. Done: the rings
      near the knee plane cut only the front of each knee, two rings cut the back where the thigh
      and the calf meet, and a smoothing rounds the crease. No edge passes through the skin there,
      and no face of the legs folds (`knee-stripes.md` of `docs/research/2026-10-26-fifth-bears/`).
- [x] Polar bear (`2026-10-26-fifth-review-bears.md`): a short vertical groove stays on the front
      of the left shin, and light wedges on the calf back from az 150 to 180. Done: the groove
      was a long source diagonal across the knee front, which now flips before the rings, and the
      wedges came from the crease smoothing, whose weight now falls with the distance from the
      seam over two more calf rings (`2026-10-27-legs-armpit.md`).
- [x] Polar bear (`2026-10-27-legs-armpit.md`): at L180, one soft darker facet stays on the left
      calf, where the fillet of the crease smoothing ends above the first calf ring (edge 2214 to
      2251 turns 72°). A longer reach moved the sole or folded a face of the inner thigh.
      Done: the smoothing slid sliver corners of the calf rings apart. The back of the calf is
      faired along the normals, and the faces behind the knees take the skin normals. The facet
      and its groove are gone, with the poses, the folds, and the arm gate of `main`
      (`2026-10-27-rigs3.md`).
- [x] Polar bear (`2026-10-27-wolf-knee.md`): the user saw the top of the seated left knee as a
      block with a sharp edge. The source knee is a round column. Done: the linear blend put
      the knee front on a flat bevel with 12 hard edges (the largest 78.7°). The knee front is
      now rounded across the leg bones over two more front rings (2 hard edges, 54.1°), and its
      faces take the skin normals.
- [x] Polar bear (`2026-10-27-wolf-knee.md`): the knee front still lies about 1 cm inside the
      round of the leg on the bisector, so from a low front angle the knee keeps a soft flat
      top. Done: the quad legs with the dual quaternion knees put the knee front at 0.98 of the
      round of the leg (`2026-10-27-polar-legs-rebuild.md`).
- [x] Polar bear (`2026-10-27-wolf-knee.md`, section 11): the user said that the seated knee is
      still much bulkier than expected and not anatomical. Long source faces join the underside
      of the haunch to the heel, so the seated leg is a wedge with no hollow behind the knee.
      Done: each leg is a quad tube (`polar_bear_legs.py`), and the knees take the dual
      quaternion blend: the knee is 0.141 units deep on its bisector (0.148 in the source, 0.199
      before), with a hollow behind it, and the folds of `main`
      (`2026-10-27-polar-legs-rebuild.md`).
- [ ] Polar bear (`2026-10-27-polar-legs-rebuild.md`): the seated thigh keeps a depth of about
      0.14 units from the haunch to the knee, and the source tapers from 0.183 to 0.148. The
      haunch above the cut keeps its faces. Next: a cut higher on the outer side of the hip,
      with tilted top rings, so that the tube takes the thigh up to the haunch.
- [ ] Polar bear (`2026-10-27-polar-legs-rebuild.md`): 4 edges of the crease of the left instep
      and 4 edges of the cut loop at the crotch turn more than 40° in the bind (89.6° at most).
      The instep crease is a crease of the user mesh. Next: check them in the stage light, and
      give the faces the skin normals if they shade as lines.
- [x] Polar bear (`2026-10-27-polar-bench.md`): the user asked: "should the polar bear's seat be
      taller for it to be more natural?", and chose the bench of 0.38 m and the seated size of
      before. Done: level thighs, vertical shins 3.208 times as long as on the mesh, flat feet,
      a bench that holds the whole haunch in the form of the reference bench, and a hold that
      brings the elbows to about 6 cm above the keys with each note target within 5 mm.
- [x] Polar bear (`2026-10-27-polar-bench.md`): the lean of the high bench put the head top at
      1.45 m in the play, and the upper arms 10.3 cm and the forearms 8.8 cm into the trunk.
      Done: the low bench and the lean of 6° put them 6.8 cm and 6.3 cm into the trunk
      (`2026-10-28-polar-legs.md`).
- [x] Polar bear (`2026-10-28-polar-legs.md`): the user said: "the polar bear's leg is too long,
      making it like a human instead of polar bear". Done: the thighs and the shins are 1.2 times
      as long as on the mesh, the thighs slope 10° down on a bench of 0.166 m, the piano is 1.03
      times a real piano with the keys at 0.72 m, and the elbows stand 4 to 6 cm above the keys
      with level forearms. The arm gate passes, and each note target is within 5 mm.
- [x] Polar bear (`2026-10-28-polar-legs.md`): the bear sits lower: the head top is 1.31 m in the
      play (1.46 m before), and in the default view of `bach-bwv1050` the red fox violinists hide
      more of it. Done: the user asked for a taller bench, and the body is 1.1 times as large, with
      the head top at 1.53 m in the play (`2026-10-28-polar-bench2.md`).
- [x] Polar bench (user, 2026-10-28): "can the polar bear's bench be taller so that it's leg is
      more natural?" Done: the legs are 1.3 times the mesh, the thighs slope 25° down on a bench
      of 0.255 m, the body is 1.1 times as large, and the piano is 1.22 times a real piano with
      the keys at 0.85 m (`2026-10-28-polar-bench2.md`). The arm gate gives no `FAIL`, and each
      note target is within 5 mm.
- [ ] Polar bench (`2026-10-28-polar-bench2.md`): the forearms and the upper arms go 8.3 cm into
      the belly in the play (6.3 and 6.8 cm before). Next: try the elbows a little further out
      (`poleL`, `poleR` of `HANDS_HOLDS.piano`) with `pnpm pose-depth pianist --base main`.
- [ ] Polar bench (`2026-10-28-polar-bench2.md`): the piano of 1.22 moves rows of the four demos
      with a piano again (`gate-body-probe.txt`). Next: check the default view of `bach-bwv1050`
      and `boulanger-matin`, and show the user the stage with the larger piano.
- [x] Tails (user, 2026-10-28): "the cat's tail has malformed meshes", "the dog's tail is
      unnatural". Done: the curl measures each tail vertex against the middle line of the source
      tail, Taubin rounds round the curled tube, and the dog tail shrinks less
      (`2026-10-28-tails.md`).
- [ ] Tails (`2026-10-28-tails.md`): the cat has 4 faces that stay turned over against the bone
      turn after the bind (2 before). No image shows them.
- [x] Dog tail root (user, 2026-10-28): "it's too bulky at the root". Done: the tail weights
      reach less far over the rump, and the root moves over a short range of the tail share. The
      chair is 2 cm deeper, and the left paw of the cellist folds in 705 samples again
      (`2026-10-28-followups.md`).
- [x] Bow arm (user, 2026-10-28): "the red fox's bow arm is going up and down too rapidly". Done:
      a measured tremolo moves the bow 1.2 cm for each note (`2026-10-28-followups.md`).
- [x] Penguin head (user, 2026-10-28): "unnatural gradient between black and white". Done: a face
      across the black and white edge of the texture takes one side (`2026-10-28-followups.md`).
- [ ] Penguin head (`2026-10-28-followups.md`): the edge is a zigzag along the faces, and the
      user asked why the head cannot use the look of the original mesh. Next: with the choice of
      the user, cut the head faces along the edge of the texture, or give the penguin a small
      texture.
- [x] Hippo arm (user, 2026-10-28): "the hippo's arm is still not fixed". Done: a shape of
      `raise` smooths the bow arm in the rest pose, where the bent tube showed a bulge, a kink,
      and a bump (`2026-10-28-followups.md`).
- [ ] Hippo arm (`2026-10-28-followups.md`): the arm gate gives `FAIL` on the right stretch p95
      (0.22 against 0.16), because the shape shortens an inner elbow edge of the rest sample. The
      left arm on the neck of the bass has no rest shape. Next: check the left arm with a fill
      light, and count the stretch from the bind for a body with a rest shape.
- [ ] Fill light (`2026-10-28-followups.md`): `pnpm close-views play` renders the app with no
      fill light. Next: add a fill to the play mode for the checks.
- [ ] Bright elbow (user, 2026-10-28): "the cat's elbow has an area that's too bright". The image
      shows the colors of the red fox at rest. The role views show only a faint light crease at
      its inner right elbow, with no fold. Next: ask the user for the demo and the time.
- [x] Arm lumps (user, 2026-10-28): "the hippo's arm has lumps / dents", "the wolf's arm has
      unexpected dents / bends", "the cat's arm has unexpected lumps". Partly done: the rebuilt
      arm tubes took the ridges of the big faces of the user meshes. Taubin rounds smooth the
      tubes of the wolf, the bow arm of the cat, and the middles of the hippo tubes
      (`2026-10-28-arm-smooth.md`). The folds fall for each of the three roles.
- [ ] Cat bow arm (`2026-10-28-arm-smooth.md`): the crumple share of `pnpm arm-look violist` stays
      23.9% (limit 14.6%). At the tip, thin dark wavy folds cross the right shoulder. A larger
      rim of skin normals did not remove them, so they are folds of the geometry at the root.
      Next: a bind of the right upper arm nearer to the bow arm of the play, with the raise
      shapes fitted again.
- [ ] Hippo bow at rest (user, 2026-10-28): "not holding the bow properly". The stick goes
      through the middle of the round paw, and the frog end hides inside it, so the paw reads as a
      lid on the stick. Next: ask the user for the form of the rest hold, such as the bow on the
      strings, or the frog end out of the paw on the thumb side.
- [ ] Polar bear (`2026-10-28-polar-legs.md`): with the wrists 0.2 H up in the lift, the paws go
      1.0 cm and the forearms up to 1.5 cm into the front of the case in the lift and the
      lowering (limit 1.5 cm, 0 cm before). In the bind, 3 faces of the left shin and thigh turn
      over after the groin crease (0 before).
- [x] Polar bear wrist (user, 2026-10-27): "there's a crease around the bear's wrist". Done: the
      wrist band of the arm copy had 46 thin faces and was 2 mm wide on the palm side. The cut
      stands parallel to the last ring, the band is cleaned, smoothed, and snapped back onto the
      arm, and it takes the skin normals: no hard line at the wrists in any sample
      (`2026-10-27-polar-wrist.md`).
- [ ] Polar bear wrist (`2026-10-27-polar-wrist.md`): one edge of the left wrist band, on the
      palm side of the paw, stays concave up to 82° in the play (88° before), at a groove of the
      paw of the user mesh. It shades soft with the skin normals. Next: check it from below in
      the stage light, and fair the groove in the copy if it shows.
- [ ] Polar bear paws (`2026-10-27-polar-wrist.md`): the automatic weights give each paw about
      0.35 of the wrist helper and 0.1 to 0.25 of the last forearm segment, so the paw turns
      only about two thirds of the hand turn. Next: take the wrist helper off the paws, as
      `step_wrist()` of `hippo_arms.py` does, and check the wrist bend and the claws on the keys.
- [ ] Polar bear copy (`2026-10-27-polar-wrist.md`): `polar_bear_legs.py` stops when the JPEG of
      the arm image leaks above 0.02 into the free columns of the strip, as a try with no wrist
      smooth did. Next: skip a border of 8 columns in the check of `atlas_strip()`.
- [ ] Close views: the pianist has no lift or lowering moment in `ROLE_VIEWS`, so
      `close-views pianist --moments lift50` fails. Next: give the role the moments of
      `halfMoves()`, as the violinist has.
- [x] Wolf (`2026-10-27-wolf-knee.md`): the user said that the wolf does not hold the clarinet
      properly at rest: the left paw capped the mouthpiece end, the bell hung 12 cm in front of
      the seat, and each paw slid 15 cm along the tube in each move. Done: the bell rests against
      the inner right knee, and both paws keep their grips of the play.
- [x] Wolf (`2026-10-27-wolf-knee.md`): the arm gate fails its margins against `876ba389` on the
      left arm at rest (paw twist 152°, 89° before, limit 170°) and on the right flat (0.75,
      0.82 before). Each rest with the old twists capped the mouthpiece end. Done: the bind
      elbows turn 45° forward, the bind paws 66° and 57° toward supination, and the rest elbows
      point down and out of the belly. The gate has no `FAIL` against `876ba389` and `main`
      (`2026-10-27-wolf-bind.md`).
- [x] Wolf (`2026-10-27-wolf-bind.md`): the left wrist bends 54° at rest, 1° under its margin
      limit against `876ba389` (40° there). A rest aim of 0.8 gave 51° with a full grasp, but
      each move turned the paws around the tube. Done: the upright rest bends the left wrist
      45° (p95), 10° under the margin (`2026-10-27-wolf-mouse-rests.md`).
- [x] Wolf (`2026-10-27-wolf-mouse-rests.md`): the user said that the clarinet should be
      vertical at rest. Done: the clarinet stands upright (0° from the front and the side) in
      front of the belly, with the bell between the knees at their height, and both paws keep
      their grips of the play. The gate has no `FAIL` against `main` and `876ba389`.
- [ ] Wolf (`2026-10-27-wolf-mouse-rests.md`): the bell of the upright clarinet rests on
      nothing, 22 cm in front of the seat. On the right knee top, the left forearm went 7 cm to
      12 cm into the belly. Next: offer the user the bell on the right knee with the right paw
      alone and the left paw on the left thigh (`restFreeL`), as a real clarinetist rests it.
- [ ] Wolf (`2026-10-27-wolf-mouse-rests.md`): the clarinet axis turns up to 14° in the closed
      left paw over a lift (8° on the rest at the knee). Next: read the left paw crops of the
      lift at 2x, and scan the left rest elbow with `wolf-rest.ts --moves` if it shows.
- [x] Mouse (`2026-10-27-wolf-mouse-rests.md`): the user said that the two paws overlap at rest.
      Both paws closed on the middle of the oboe and overlapped by 4.5 cm along the tube. Done:
      both paws keep their grips of the play at rest, with a gap of 5.7 cm, no paw in the other,
      and a slide of 0.4 cm in a move (5 cm before).
- [ ] Mouse (`2026-10-27-wolf-mouse-rests.md`): the left paw twists 134° on its forearm at rest,
      and the left palm turns 58° from the oboe (grasp limit 60°), so the rest elbows have
      little room. Next: supinate the bind left paw of the mouse (`studio.bindSupination`), as
      for the wolf, and scan the rest elbows again.
- [x] Badger bass drum (`2026-10-27-badger-beater.md`): the user said "the badger is not holding
      the drumstick properly". Done: the drum and the beater take the scale of the badger, the
      badger stands behind the drum, and the right paw holds the beater one third up from the butt
      at the near rim, along the head, 13 cm from the trunk. The head of the beater leaves the
      drum head 5 cm between strikes and up to 12 cm before a strike.
- [ ] Badger bass drum (`2026-10-27-badger-beater.md`): from the front, the drum hides the right
      arm and the beater, as a real drum hides its player. Show the user the front and the stage
      images, and ask if the badger must show more from the front.
- [ ] Badger sticks (`2026-10-27-badger-beater.md`): the snare sticks, the yarn mallets, and the
      xylophone mallets of the badger keep about real lengths (34 cm), longer than the scaled
      bass drum beater (25.8 cm). Ask the user if the scale of the badger applies to them too.
- [ ] Badger bass drum (`2026-10-27-badger-beater.md`): between strikes, the paw keeps its turn
      in the world while the body sways, so its twist on the forearm moves from -15° to 5° in
      about 1 s. The paw grasps the shaft in 83% of the play samples (`pnpm wind-grip`).
- [ ] Badger bass drum (`2026-10-27-badger-beater.md`): the left paw hangs and does not muffle
      the head in the rests, as section 5 of the percussion reference gives for marches.
- [x] Hippo bow arm (`2026-10-28-hippo-arm.md`): the user said "also the hippo's arm is messed
      up. fix it", with a close image of the bow arm from the right. Done: the wrist cut of the
      copy crossed the last ring of the tube on the inner side of the wrist turn, and the bridge
      made a lip with a slit, a pale band or a dark slit around the wrist. The cut now stands
      parallel to the last ring, and a smooth evens the band of each wrist.
- [x] Hippo bow arm (`2026-10-28-hippo-paw.md`): in the play, the paw swings 25° to 31° off the
      forearm (arm gate, p95), so the heel of the paw and the end of the forearm show as a lump
      under the bow paw from the right and from az120. Done: the swing of 25° was the bend of the
      bind paw, which the retarget took away, so the thick wrist bent 25° off its form. The bow
      paw now keeps the bind bend (`HIPPO_HOLD.pawKeepR`): swing 2, wrist edges stretch 1.3
      times (1.9 before).
- [x] Hippo bow paw (`2026-10-28-hippo-paw.md`): the stick runs up to 2.4 cm from the middle of
      the closed paw in the lowering (1.75 cm on the old paw). The forearm turns about 45° against
      the bow over a stroke, and the paw slides on the stick with it. A grip that turns with the
      wrist needs an own turn of the bow paw.
      Done (`2026-10-28-hippo-grip.md`): the bow hand turns around the grip in the middle of the
      paw, so that the forearm keeps 45° in the plane of the palm (`HIPPO_HOLD.stickTurnR`). The
      stick stays within 0.35 cm of the middle of the paw (2.43 cm before), and the pizzicato bow
      tip points up and forward, so the paw swing of the play is at most 5° (41.6° before).
- [ ] Hippo stop in pizzicato (`2026-10-28-hippo-grip.md`): in the lowering after a pizzicato,
      the path of the bow from the pluck to the rest turns the forearm up to 79° off its angle in
      the plane of the palm. The bow then turns 79° in the paw in about 0.6 s, and the paw swings
      up to 22° toward the palm. Give this move a path of the bow that keeps the forearm near 45°
      (`liftMix()` and `BowVia` of `pose/bowed.ts`), and follow it with `probes/move-probe.ts` of
      `docs/research/2026-10-28-hippo-grip/`.
- [x] Arm replays: `fox_arms.py` and `deer_arms.py` stop with a KeyError at the belly step of
      `cat_arms.py` (2026-10-27), as `hippo_arms.py` did. Leave the step out of their steps maps,
      or skip it for an animal with no `belly` rule, and check the bytes of each replay.
      Done (`2026-10-28-cat-wall.md`): the step skips an animal with no `belly` key, and all 11
      arm replays give their files byte for byte (`replays.txt`).
- [x] Bear rig (`2026-10-26-arm-fixes.md`): the left shoulder bridge folds 8 tiny faces at p95
      in the play (4 on the old rig, limit 8), and the right move twist max is 87 (81). Done: the
      head keeps the rule weights, and four shoulder faces take the mean of their painted weights
      (6 folds, twist 82).
- [x] Rhino (`2026-10-26-fifth-review-rhino.md`): the user saw the arms stretched and twisted.
      Done: rebuilt quad arms with arm segments, a bind elbow bent forward, and the tuba elbows
      down and out. The largest twist step falls from 84.4° to 22.7°, and the forearms stay round.
- [x] Rabbit (A-pose mesh): the long arm faces show dark shards on the bent arms at rest, at the
      frog, and at the tip (`arm-crops.webp` of `2026-10-23-rabbit-arms/`). The user allowed one
      ring at each elbow (`2026-10-24-rabbit-hold.md`).
- [x] Rabbit: the right wrist stretched 0.37 in the play (limit 0.35). With the rebuilt arms, it
      stretches 0.08 (`2026-10-24-violin-arms.md`). The lift from the knee turns the paws at
      563°/s and 880°/s (limit 3,000) (`2026-10-24-violin-moves.md`).
- [x] Cat: the left paw swung 91° at rest on the knee (limit 70). With the top plate 30° to the
      left of the front, it swings 26° (`2026-10-24-violin-review.md`).
- [x] Rabbit and cat: the left elbow straightened in the middle of the lift and of the lowering,
      because the short arm reached the instrument in front of the round belly. Now the left paw
      carries the instrument by the end of the fingerboard, and the left elbow opens to 137°
      (rabbit) and 142° (cat), against 127° on the red fox (`2026-10-24-violin-moves.md`).
- [x] Rabbit: 7 faces of the right arm folded at rest with the bent elbow (limit 8). With the
      rebuilt arms, 3 fold (`2026-10-24-violin-arms.md`).
- [ ] Rabbit: the largest twist step between two arm bones is 42.1° on the left forearm (target
      25°, 83.7° on `main`), because the left paw asks for about 150° of twist in the play. A
      smaller twist of the hold, or more forearm segments, can lower it (`2026-10-24-violin-arms.md`).
- [x] Cat: the arms keep the faces of `main`, because the upper arm joins the trunk down to the
      elbow. The copy `cat-arms.glb` has a cut along the seam, a side wall under each arm, and a
      quad tube with arm segments, joined at an armpit line under the shoulder
      (`2026-10-25-cat-arms.md`).
- [ ] Cat: the largest twist step between two arm bones is 40.8° on the left forearm and 26.0° on
      the right upper arm (target 25°), because the left paw twists about 148° in the play
      (`2026-10-25-cat-arms.md`).
- [ ] Cat: the manager decides on the left forearm twist p95 71° of the arm gate (52° on `main`,
      past the margin), as for the rabbit (`2026-10-25-cat-arms.md`).
- [ ] Cat: 11 to 12 hidden faces of the armpit lines turn over in each sample of the fold probe
      (`2026-10-25-cat-arms.md`).
- [x] Cat: the right paw turned 32° from its accepted grip in the play, because the forearm rolls
      with the lower elbow at the tip. The manager accepted the 2x paw crops, and the violist entry
      of `ACCEPTED_GRIPS` takes the new medians (`2026-10-24-violin-review.md`).
- [x] Cat: the head goes 1.2 cm into the viola. The viola sits 0.04 H lower, and the head goes
      0.1 cm in, as on the red fox (`2026-10-25-cat-arms.md`).
- [x] Cat: the viola pointed 74° to the left (64° on the red fox). The cat plays a 1/2 viola at
      45°, with the left shoulder 1.9 cm forward, and the paw reaches the nut. The red fox holds the
      violin at 45° and the rabbit at 50° (`2026-10-25-string-angle.md`).
- [x] Cat: the viola went 2.6 cm into the chest in the play (limit 2.0). It goes 1.6 cm in
      (`2026-10-25-string-angle.md`).
- [ ] Rabbit: the bow goes up to 2.5 cm into the arms in the lowering and 1.0 cm at rest, near the
      grip (`shares.txt` of `2026-10-24-violin-arms/`).
- [ ] Rabbit, red fox, and cat: the forearms and the upper arms go up to 2.1 cm (rabbit), 2.5 cm
      (red fox, 2.4 cm before the middle turn), and 2.5 cm (cat, 2.9 cm before) into the
      instrument in the lift and the lowering (limit 1.5), near the end of the lift
      (`2026-10-25-string-angle.md`).
- [x] Red fox: the left paw twist passed 180° once in the lift and in the lowering. The violin
      turns upright in the middle of the moves, as the rabbit violin, and the twist stays at 147°
      (`2026-10-25-string-angle.md`).
- [ ] Rabbit: the violin points 50° to the left, 5° more than a real player: at 45°, the bow paw at
      the frog went 1.9 cm into the jaw and the right forearm 2.3 cm into the body. A bow arm round
      or a smaller violin can bring it to 45° (`2026-10-25-string-angle.md`).
- [ ] Cat: the claws of the bow paw go 2.2 cm into the viola in the play (1.5 cm before), and the
      left upper arm 2.2 cm into the body in the moves (1.5 cm before) (`2026-10-25-string-angle.md`).
- [ ] Rabbit, red fox, and cat: the left elbow points to the side under the instrument, and the
      upper arm turns 29° to 46° to the side, where a violin student turns it 16° to 25° toward the
      middle. Further in, the paw twisted past 170° on the forearm (`2026-10-25-string-angle.md`).
- [ ] User decision: the cat plays a 1/2 viola, the size of the red fox violin, so that it can
      hold it at 45°. A 3/4 viola (0.94) reaches the nut at about 55° (`2026-10-25-string-angle.md`).
- [ ] The 1/2 viola of the cat moves the seats of the layout by up to 9.5 cm. Run
      `pnpm test:paused src/shots/` and `src/models/layout-scene.test.ts` when the tests come back
      (`layout-move.txt` of `docs/research/2026-10-25-string-angle/`).
- [ ] The gap of a piano case moves the contrabass rows of `bach-bwv1048` and `bach-bwv1050` back,
      and the stage of `bach-bwv1050` grows by 0.18 m. Run `pnpm test:paused src/shots/` and
      `src/models/layout-scene.test.ts` when the tests come back (`2026-10-25-bass-piano-gap.md`).
- [ ] The layout knows only the bind footprints, so only a piano case keeps the reach of a player
      in play. A bassist stands 0.15 m from a seated clarinet in `beethoven-8` with no clip now.
      A new hold that reaches further can clip there (`2026-10-25-bass-piano-gap.md`).
- [ ] In the default view of `bach-bwv1048` and `bach-bwv1050`, the open lid of the harpsichord
      hides the contrabasses behind it up to the eyes, on main too (`2026-10-25-bass-piano-gap.md`).
- [x] Elephant (A-pose mesh): the long arm faces show dark shards on the bent arms from the front
      and a slit under the left forearm from the back, and one to three thin faces fold in each
      sample. Done: quad arm tubes, Blender weights, and arm segments. The gate folds 3 and 2
      faces (`2026-10-25-elephant-arms.md`).
- [x] Elephant: the upper arms go 3.4 cm into the belly near the elbow (1.8 cm before the arm
      tubes, accepted 3.0 cm). Done: the timpani elbows point a little out (pole x 0.8). The
      upper arms go 2.9 cm in, and the back shows no gap (`2026-10-25-elephant-hippo-creases.md`).
- [x] Elephant: the upper arms still go 2.9 cm into the belly at 0.71 of the right upper arm. No
      elbow pole gives less than 2.7 cm. Done: the elbow helper is not the cause. The thick arm
      turns into the belly as one rigid part, and the inner front of each upper arm is a little
      flatter in `tools/blender/elephant_arms.py`. The upper arms go 1.3 cm in
      (`2026-10-25-thick-arm-depth.md`).
- [x] Elephant: short light and dark creases show at each inner elbow from the front, where the
      thick arm bends about 90°. Done: a split of the normals of the bent bind elbow. The faces
      around each elbow take the skin normals (`rootNormals.elbow`,
      `2026-10-25-elephant-hippo-creases.md`).
- [ ] Elephant: a short light sliver stays at the inner root of the right arm, near the tusk, from
      the front (`2026-10-25-elephant-hippo-creases.md`).
- [ ] Elephant: the right flat p5 of the arm gate is 0.78 at the shoulder ring (0.87 before the
      arm tubes, margin 0.05). The manager decides (`2026-10-25-elephant-arms.md`,
      `2026-10-25-elephant-hippo-creases.md`).
- [x] Elephant timpanist (audit 2026-10-25, faults 1 and 4): the right mallet lay level across
      the belly between strikes, and the moments looked the same. Done: the set position and the
      full stroke (`2026-10-25-timpani-piano-rest.md`).
- [x] Elephant timpanist: the strike roll turns the right paw 18° from its accepted grip (arm
      gate grip turn, `main` 0°, limit 45°). Done: the manager accepted the 3x paw crops, and
      `ACCEPTED_GRIPS` holds the new play medians (`2026-10-25-timpani-piano-rest.md`).
- [ ] Elephant timpanist: between strikes, the heads stay 2 cm to 7 cm above the spots with the
      shafts 15° to 22° down. A real timpanist sets them one inch above the head with a level
      shaft. A larger wrist lift moved the shafts out of the closed paws
      (`2026-10-25-timpani-piano-rest.md`).
- [x] Hippo bassist: a hard dark crease shows under the left arm from the left side. Done: a split
      of the normals of the arm root. The faces around each shoulder joint take the skin normals
      (`rootNormals`, `2026-10-25-elephant-hippo-creases.md`).
- [x] Hippo bassist: a soft dark patch stays at the inner left elbow from the left side, also with
      no shadow. Done: the rim gave trunk faces 776 and 777 the normal of the turned arm root.
      The rim keeps only the faces that the arm moves, and no face with a far corner normal, so
      the black wedge under the bow arm goes too (`rootNormals.armShare`, `rootNormals.turn`,
      `2026-10-25-hippo-skin.md`).
- [x] Hippo bassist: a crease line runs over the top of the right shoulder from the right in the
      play. Done: the relax of the shape `arm_raise_R` moved vertex 177 3.6 cm, and its move
      spreads over one ring (`spread`, `2026-10-25-hippo-skin.md`).
- [x] Hippo bassist: a small dark slit shows on the belly beside the right arm at rest from the
      right. The inner side of the hanging arm of the source lies inside the plane of `armSplit`,
      so the rig keeps it on the trunk. Rebuild the arms with a seam cut and a side wall, as the
      fox (`docs/agents/rig-blender.md`, `2026-10-25-hippo-skin.md`).
      Done: the rebuilt arms take the seam cut at the crease of the arm and a side wall, so
      the inner side of the arm moves with the arm, and no slit shows at rest
      (`2026-10-25-hippo-arms.md`).
- [x] Rhino: the left arm skin creased in 16.7% of the edges in the play, and the narrow axis of
      the middle of each upper arm was 0.39 and 0.41 of the wide axis. Now 11.1% and 12.0%, and
      0.65 and 0.63 (`2026-10-22-rhino-arm.md`).
- [ ] Pig: the dome of each new upper arm lies inside the shoulder, so `pnpm pose-depth hornist`
      gives the upper arms 4.2 cm in the body in each set (0.5 cm before). Give the sweep an
      accepted depth after the test pause. Small dark facets show at the top of the shoulders.
- [ ] Rabbit: the dark wedge on the chest under the bow arm is the shadow of the arm (4.5).
- [x] Rabbit: the left upper arm kept a section of 0.47. It moves its inner side and the arm run of
      its cut, and its section is 0.82 (`2026-10-21-arm-form.md`, round `arm-form-2`).
- [x] Rabbit: the right upper arm kept a section of 0.60 (0.93 on the red fox). Its arm run moves
      except two vertices, and its section is 0.74 (`2026-10-21-rabbit-right-arm.md`).
- [x] Rabbit: from the right side at the frog, a dark band showed under the rounder right upper
      arm. A cap face at the top of the cut turned down. Vertex 975 keeps its place, and the
      lift fold of face 224 is gone too (`2026-10-21-rabbit-right-arm.md`, section 4).
- [ ] Rabbit: a small dark sliver stays under the right elbow from the right side at the frog
      (2,625 band pixels with no shadows, 740 on `main`, `band-measures.txt` of `round4/`).
- [x] Rabbit: each bent elbow showed the flat cap of the arm cut as a sheet with a straight end.
      A copy of the mesh closes each arm with a round patch, and the mid section is 0.94 / 0.96
      (0.63 / 0.79 before, `2026-10-22-rabbit-elbow.md`).
- [ ] Rabbit: the section of the right upper arm of `pnpm arm-look` fell from 0.74 to 0.60 with the
      round elbow patch (limit 0.44). Find the cause of the drop of the median, and keep the
      round elbow (`2026-10-22-rabbit-elbow.md`, section 5).
- [ ] Rabbit: "upper arms in body" of `pnpm pose-depth violinist` grows from 0 to 2.5 cm at rest
      and 5.9 cm in the lowering with the round elbow patch (3.3 cm on the red fox). Keep the
      patch out of the trunk when the arm hangs (`2026-10-22-rabbit-elbow.md`, section 5).
- [ ] Rabbit: a dark lower face of the bow elbow shows from azimuth 150 at `lower50` and
      `lift50`, and a thin dark line under the forearm near the elbow from the front at the frog
      (`pairs-*.webp` of `2026-10-22-rabbit-elbow/`).
- [x] Pig: a thin dark line and dark spikes showed at the top of each shoulder. The wall around
      each tube is smooth, and the right dome is higher (round `arm-form-2`).
- [x] `pnpm arm-check --views` stopped when the worst sample lay at the end of a demo. A frame past
      the length of its demo moves to 0.05 s before the end (`frameInDemo()`).
- [x] Remove the unused code of the face pattern `cap` (`2026-10-17-mesh-dog.md`).
- [x] Remove the unused code of the face pattern `eye-patches`: no species has it since the panda
      mesh (`2026-10-18-mesh-panda.md`).
- [x] Remove the unused code of the `broad` muzzle: no species has it since the hippo mesh
      (`2026-10-18-mesh-hippo.md`).
- [x] Remove the unused code of the `large-round` ears and the `pointed` snout: no species has
      them since the mouse mesh (`2026-10-19-mesh-mouse.md`).
- [x] Remove the unused code of the `flat-nose` snout: no species has it since the pig mesh
      (`2026-10-19-mesh-pig.md`).
- [ ] Remove the unused high stool (`HIGH_STOOL`, the support `high-stool`, and the foot ring of the
      parametric legs): no player sits on it since the hippo stands (`2026-10-18-mesh-hippo.md`).
- [ ] Panda face: the round patches have angular edges, because the rule recolors whole faces of
      1 cm to 2 cm. The left patch is 18% of the head width high, and the right patch 22% (the
      reference 23% to 27%). Show the user `widths.webp`, and ask if a smoother oval is worth a
      vertex move (`2026-10-18-panda-face.md`).
- [ ] Panda smile: from 30° above, the mouthpiece and the paws hide the mouth at both widths of
      the line. Check the smile in a close play frame of the stage with the user
      (`2026-10-18-panda-face.md`).
- [ ] Condense design 1, 3, 7, and 8, which still hold dated history
      (`2026-10-17-design-condense.md`).
- [x] Snare drum and xylophone: no demo has them, so `pnpm hold-reach` and `pnpm mesh-options`
      measure no strike of these. Give the badger round a score with them
      (`2026-10-19-mesh-retro.md`).
      Answer: the probes read the percussion test score of `tools/probe-demos.ts` (round
      `mesh-badger`).
- [ ] Hippo nose: the tip lies on a nostril 2.8 cm from the middle plane, and the rig checks warn.
      A tip on the plane moves the jaw of the rig 3.0 cm up (`2026-10-19-mesh-retro.md`).
- [ ] Brief template: `docs/briefs/studio-body.md` has 2,625 words, above its limit of about
      2,500 (2,611 before the mesh retro). Cut it in a prose pass.
- [x] Top plate in the sweep: the pair "instrument in body" gives the deepest corner of the
      instrument, for the hippo the back of the upper bout (14.7 cm) against 1.5 cm of the top
      plate. Offer a part of the visible top plate of the bowed instruments, as `top-plate.ts` of
      the chest round measures it (`2026-10-19-hippo-retro.md`).
      Answer: the user saw the whole contrabass clip. The sweep limits the whole instrument to
      2 cm, and the contrabass of the hippo goes 1.9 cm in (`2026-10-21-hippo-bass.md`).
- [x] Bear eyes: the user wrote "the bear's eyes are too far from the head". A bent oval reads
      as a bean on the twisted face of the bear (`2026-10-20-pea-eyes.md`).
      Answer: the user chose flat ovals halfway to the surface normal, with the rim 0.027 H out
      (`eyeNormal`).
- [x] Bear eyes in the face: the user wrote "also the bear's eyes are still too far from the
      face". Each eye place moves 0.1 H out and 0.02 H down, and the oval bends to the head: the
      rim lies 0.011 H out (`2026-10-20-bear-eyes.md`).
- [x] Bear eyes from the front: the moved bear eyes show 12% less area in the front view than the
      flat eyes, and the twist of their bend is 3.4, above the 2.5 of the other bodies. From the
      front and above, the lower end of each oval is a little pointed (`2026-10-20-bear-eyes.md`).
      The mesh bear replaced the studio bear, and its pea eyes keep their default places
      (`2026-10-22-mesh-bear.md`).
- [ ] Mouse eyes: in the front view, the bent pea eyes of the mouse lean in at the top, because
      the surface under them faces 17° to 21° more up than their direction. Try a direction
      between the two for the mouse (`2026-10-20-pea-eyes.md`).
- [x] Bear mesh: the user gave a bear mesh for the conductor on 2026-10-22. It stands on the
      podium near the size of the studio bear, with the baton along the index finger
      (`2026-10-22-mesh-bear.md`).
- [x] Bear size: the skull top of the mesh bear is 9% higher than the skull top of the studio
      bear, and its shoulder joints 3.5% lower, because the mesh has low shoulders under a large
      head. Ask the user if the bear keeps this size (`2026-10-22-mesh-bear.md`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Bear rest: in the rest pose, the arms of the mesh bear hang about 45° out around its belly,
      and the baton points forward at the height of the waist. A conductor at rest holds the
      baton down. Try a rest with the arms nearer to the belly and the baton tip down (5.2).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Bear neck: the head turns of the cues fold up to 3 faces at the side of the neck of the mesh
      bear in 3% of the play samples (`fold-probe.txt` of `docs/research/2026-10-22-mesh-bear/`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear mesh: the user gave a polar bear mesh for the pianist on 2026-10-22. It sits at
      the piano at the skull top of the studio polar bear, with arms 1.25 times the mesh
      (`2026-10-22-mesh-polar-bear.md`).
- [x] Polar bear arms: the arms of the mesh reach the keys in front of its round belly only with
      a lean of 35°, so the rig makes them 1.25 times as long. The user chose to keep these arms
      (`2026-10-22-mesh-polar-bear.md`).
- [x] Polar bear folds: faces of the head, the neck, the right forearm, and the cut of the
      shoulders fold in 37% of the play samples since the seat of `2026-10-22-polar-seat.md`
      (52% before, 9.6% on the studio polar bear). The arm gate
      passes. Fit the head line and a shape of the right forearm (`fold.txt` of
      `docs/research/2026-10-22-mesh-polar-bear/`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear upper arms: the thick upper arms press up to 10 cm into the sides of the round
      belly near the elbows in a play (`PIANIST_SWEEP`). Try a rounder inner side of the upper
      arm in a copy of the mesh, as for the rabbit (`2026-10-22-rabbit-elbow.md`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear seat (user, 2026-10-22: "also the polar bear's pose is very wrong now"): the mesh
      polar bear sits on near level thighs with its knees at 95°, the hip joints in the haunch,
      and the haunch on a bench under the thighs (`2026-10-22-polar-seat.md`).
- [x] Polar bear legs (user, 2026-10-22: "Longer legs, keep size"): the thighs and the shins of
      the mesh polar bear are 1.6 times as long, at the scale of `main`, so the bench is 0.269 m
      high and the knees show in front of the belly (`2026-10-22-polar-legs.md`).
- [x] Polar bear arm gate: on the longer legs, no piano hold passes the whole arm gate. The
      manager chose the hold g4 and accepted its move twist, lift folds, lowering depth, and note
      targets as the new base of the pianist (`2026-10-22-polar-legs.md`).
- [x] Polar bear forearms and lift: with the hold g4, the forearms slope down 15° to the paws
      (a real pianist keeps them about level), the lift folds 73% of its samples (57% on `main`),
      and the left paw misses 7 of 3,931 notes by up to 10.4 mm
      (`docs/research/2026-10-22-polar-legs.md`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear head top: the seated head top is 7.4% higher than on `main` (1.857 m), because
      the longer legs raise the haunch, and the head keeps 6.3 cm from the case (12 cm on `main`)
      (`docs/research/2026-10-22-polar-legs.md`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear balance: the center of mass of the seated polar bear is 6 cm (rest) to 16 cm
      (play) in front of the front edge of the bench, between the bench and the soles. The calves
      stop the bench front (`seat-round.txt` of `docs/research/2026-10-22-polar-seat/`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear rest: in the rest pose, the paws of the mesh polar bear rest at chest height,
      higher than a pianist before a performance. On the longer legs, the lap point takes the top
      of the belly over the thigh, and lower places put the upper arms up to 11 cm into the belly
      (`logs/fit-rest3.txt` of `docs/research/2026-10-22-polar-legs/`).
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Polar bear tail: from behind, the short tail of the seated mesh polar bear shows a light
      jagged facet on its lower side in the play strip (`strip-az180.webp` of
      `docs/research/2026-10-22-mesh-polar-bear/`). Round it in a copy of the mesh.
      Closed: the app uses the studio body again (`2026-10-22-studio-bears.md`).
- [x] Bear armpit: the user wrote "the bear has deformed meshes under the arm". The free arm
      takes the back strip of each arm root (`2026-10-22-bear-armpit.md`).
- [x] Studio bears (user, 2026-10-22: "revert to previous studio-generated bears, but add more
      triangle to them to make them more smooth", "do not exceed 3000 meshes"): both bears have
      their studio bodies again, with even facets within 3,000 faces, a crease angle of 70°, and
      the color blend of the fur (`2026-10-22-studio-bears.md`).
- [ ] Bear left upper arm: in Mozart K. 315 at 125.15 s, the left upper arm of the studio bear of
      seed 2 goes 2.4 cm into the body (limit 1.5 cm, 2.3% of the samples). Seed 3 had 0 cm. An
      elbow pole further out changed nothing (`docs/research/2026-10-22-studio-bears.md`).
- [ ] Polar bear lap: on the near level thighs, the knees show in front of the belly, but the
      thighs stay short, and the lap is small. A lower knee in the field of the studio failed the
      gates on most seeds. Try a longer thigh with a new bind of the role and its seeds.
- [ ] Polar bear upper arms: the upper arms of the studio polar bear go up to 7.2 cm into the
      belly in a play and 7.5 cm in the lowering (accepted 4 cm). Elbows at (±1, -0.3, 0.3) give
      5.8 cm and 6.0 cm. Check the arm gate and the folds of that hold
      (`docs/research/2026-10-22-studio-bears.md`).
- [ ] Bear head facets: at the crease angle 70° and the blend 0.12, the cheeks and the brow of
      the bear show a few facets in the head crops. Try a larger blend on the head only.
- [x] Bear arm gate: with the back strip on the arm, the rest arm hangs 2.2 cm to 2.5 cm further
      out (`radiusOf()` of `pose/hang.ts`), and the move twist max of the right paw grows from 73°
      to 79° (limit 176°, margin 3°), a `FAIL` of `pnpm arm-check conductor --base 5593e92b`.
      The manager accepted the new base; the round of the bear rest pose reworks the hang
      (`2026-10-22-mesh-bear.md`).
- [ ] Bear notch: trunk faces of the notch below the caps of the cut still face down under each
      raised arm, 19 cm² and 23 cm² against 5 cm² on the red fox (`flap-round.txt` of
      `docs/research/2026-10-22-bear-armpit/`). No view shows them.

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
      (notes within 50 ms). A row in a decision file (`docs/decisions/`) holds it (5.3).
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

Open items of the pose rounds of 2026-10-16 to 2026-10-18 (each file is in `docs/decisions/`):

- [ ] Dog cellist: the left ear touches the cello, the left forearm and paw go 2.1 cm and 1.6 cm
      into it, the right upper arm 2.0 cm into the body, and the bow reach is 69% (goal 70%). A loop
      that moves the cello and rebuilds the left-arm shapes (`2026-10-17-dog-folds.md`).
- [ ] Dog cellist: the knees stay about 21 cm from the leaned cello (`2026-10-17-dog-rest.md`).
- [x] Cat violist: the left forearm went 2.5 cm into the viola in the fifth position of
      `mozart-k191`. With the 1/2 viola at 45°, it goes 1.5 cm in
      (`2026-10-17-cat-hand.md`, `2026-10-25-string-angle.md`).
- [ ] Cat violist: in the 5th position, the left wrist under the neck keeps a twisted band, as on
      `main` before the tilt (`2026-10-20-cat-left-arm.md`).
- [ ] Cat violist: the left wrist bends about 30° from the forearm in the low positions, where a
      real violist keeps it straight. The manager accepts the crops and the grip entry of the arm
      gate, or the user chooses a smaller viola (`2026-10-20-cat-left-arm.md`).
- [x] Cat violist: the play forearm twist of the arm gate grew from 32° to 49° with the tilt of
      the left paw. The rebuilt arm spreads the twist along the forearm, so the gate rings see 71°
      (`2026-10-25-cat-arms.md`).
- [x] Cat violist: play and lift folds 1.3 and 1.4 points over the limit since the slim arms. The
      rebuilt arms fold 4 faces on each side at most (p95, limit 8, `2026-10-25-cat-arms.md`).
- [ ] Red fox: the bow grip is 2.2 cm from the middle of the paw for the standing soloist
      (`2026-10-17-grip-all.md`).
- [x] Tan fox: the flute end stands on the right thigh, and the arms go at most 0.8 cm into the
      body or the flute in each set (`2026-10-25-fox-arms.md`).
- [ ] Standing soloists: the left arm goes 1.8 cm to 2.8 cm into the instrument in the lift and the
      lowering (`2026-10-17-cat-bow.md`).
- [ ] The change to pizzicato takes the bow hair 28.5 mm off the strings at one stroke of
      `boulanger-matin` (18.96 s) (`2026-10-17-mesh-dog.md`).
- [ ] The paused shot test of the choir of the Ode to Joy fails since the larger cats
      (`2026-10-16-mesh-cat.md`).
- [ ] The paused test "moves the trombone slide with the pitch, within the reach of the arm" of
      `src/pose/winds.test.ts` pins the equal steps of the slide. Since `slideTravel()`, the
      positions keep the real spacing (`2026-10-18-slide-notes.md`).
- [ ] Wind motion spec T3: the breath in expands the chest and the belly, with still shoulders, in
      place of the lean back of 3° (`docs/research/2026-10-18-wind-technique.md`).
- [ ] Wind motion spec T5: in a fast run, the trombone takes the alternate position that moves the
      slide less, such as B♭3 in 5 and F4 in 4 or 6 (`docs/research/2026-10-18-wind-technique.md`).
- [x] Wind motion spec T1: a slide nearer to the level. Done: the user chose 35° below the level
      and 30° to the right, with the left shoulder at 15° (`2026-10-18-trombone-fit.md`).
- [ ] Panda trombonist: the shadow band of the left arm covers 44.6% of the belly box with the left
      shoulder at 15°, against 20.9% at 9°. A turn of 10° folds the left shoulder at this slide
      (`docs/research/2026-10-18-trombone-fit.md`).
- [ ] Panda trombonist: a slide nearer to the front needs a larger forward turn of the right
      shoulder, and a turn of 50° folds faces 86 and 497 in 6.5% of the lift samples. A rule of the
      right shoulder in the panda rig can permit it (`2026-10-18-trombone-fit.md`).
- [x] Horn valves above the written C5: the horn takes the 9th, 11th, 13th, and 14th partials of
      the shared `PARTIALS`, so C♯5, D5, F♯5, A♭5, A5, and B♭5 get one or two valves too few.
      Options: a horn list of partials as the single F horn chart, or the B♭ side of a double horn
      above the written G4 (`2026-10-18-horn-fundamental.md`). Done: the manager chose the horn
      list (`HORN_PARTIALS`).
- [ ] Double horn: advanced players use the B♭ side above the written G4, but the app has a single
      F horn. The B♭ side needs a thumb valve and a second fundamental, B♭1
      (`docs/reference/wind-technique.md` 2.2, `2026-10-18-horn-fundamental.md`).
- [x] Panda trombonist: faces 717, 1147, and 1148 at the front of the left shoulder fold in each
      play, lift, and rest sample. A raise rule of the left arm does not relax them
      (`2026-10-18-mesh-panda.md`). Done: the left shoulder turns forward
      (`2026-10-18-panda-folds.md`).
- [ ] The paused shot test of the moves of 2 cm keeps 74.2% of the shots (limit 75%) with the
      standing hippo. It kept 71.8% since the panda mesh, and passed with the hippo on the stool
      (`docs/research/2026-10-18-hippo-mesh/shots-test.log`). The elephant mesh keeps 74.7%
      (`docs/research/2026-10-19-elephant-mesh/shots-test.log`).
- [x] Panda: the white fur of the mesh has three times the chroma of `SPECIES_COLORS.panda` (0.042
      against 0.013). Ask the user about a move of the fur colors, as the cat got
      (`docs/research/2026-10-18-panda-mesh.md`). Done: the user chose the reference white
      (`2026-10-18-panda-folds.md`).
- [ ] Panda trombonist: face 467 at the front of the right shoulder folds in 2.2% of the lift
      samples, and the shadow of the left arm crosses the belly in the gallery front view of the
      first position, smaller since the 9° turn (`turn-9.webp`). Show the user the images of
      `docs/research/2026-10-18-panda-folds/` (`2026-10-18-panda-folds.md`).
- [x] Panda trombonist: gray streaks under both arms (marks 3 and 4 of `marks-main.webp`) are the
      shading of the seam where the hanging arm of the mesh touches the belly. Done: the user chose
      a cut of the mesh at the seam, and the streak share goes from 16.4% to 3.7%
      (`docs/research/2026-10-18-panda-cut.md`, `2026-10-18-panda-marks.md`).
- [x] Hippo bassist: the skin folded in each sample, up to 23 faces: the right armpit, the left
      wrist on the neck, and the front of the right shoulder. The user saw twisted arms. Done: a
      cut of both armpits, level elbows, two more shapes, and three rigid faces. The rest folds
      in no sample (`2026-10-19-hippo-arms.md`).
- [x] Hippo bassist: the user saw the arms still twisted and deformed in the play. Done: the twist
      bone of the upper arm, the right elbow forward and a little down, a trunk rule under the
      armpit, and new shapes. The shoulder ring turns 30° (56°), and the dark spikes go
      (`refit-hippo-views.webp` of `docs/research/2026-10-19-arm-skin/`, `2026-10-19-arm-skin.md`).
- [x] Hippo bassist: the skin folds in 29.0% of the play samples (28.6% on main, 9.5% before the
      holds of 2026-10-21 and 2026-10-24): faces 258, 442, and 561 under the 50° shoulder turn
      of the bow arm (23.2%, 21.6%, 7.9%), and the pizzicato paw (4.7%). A bow turn of 40°
      folds 6.6%, but straightens the bow arm in 11.7% of the play samples. Refits of the shape,
      rigid faces, and weight smoothing moved the folds. Try the arm rebuild, or a trunk turn that
      takes a part of the shoulder turn (`2026-10-25-hippo-skin.md`).
      Done: with the rebuilt arms, 20.0% of the play samples fold, and faces 258, 442, and
      561 are gone. The rest and the lift fold more: see the open items below
      (`2026-10-25-hippo-arms.md`).
- [x] Hippo bassist: each rest sample folds 5 faces against the bind, and the lift 19.0% of
      its samples (0% and 9.7% before the rebuilt arms). The bind crushes the inner right
      elbow and the trunk at the back of the right arm root (`2026-10-25-hippo-arms.md`).
      Done: the flip of thin bind faces takes corners above 130 degrees, and the arm vertices
      hang on no lower trunk bone. No rest sample and no lift sample folds, and 9.7% of the
      play (`2026-10-25-hippo-arms.md`).
- [x] Hippo bassist: from az-150, the back of the right arm root shows past the trunk as a
      dark flat piece in the play (`arm-root-az-150.webp`) (`2026-10-25-hippo-arms.md`).
      Done: the back of the first ring hung 0.6 to 0.8 on the spine and spine1 and stayed with
      the trunk. The arm vertices now hang on no lower trunk bone (`step_tube_trunk()`), and
      the piece is gone from az-150 and az150 (`2026-10-25-hippo-arms.md`).
- [x] Hippo bassist: the arm gate gives the right twist at rest 40 (25 before the rebuilt
      arms, limit 55) (`2026-10-25-hippo-arms.md`).
      Done: the rest elbow points down and a little out (`restPoleR`), and the twist is 29.
      Poles that give 25 put the forearm into the belly (`2026-10-25-hippo-arms.md`).
- [ ] Hippo bassist: the sweep gives the right upper arm root 4.1 cm to 6.1 cm in the body
      (0.0 cm before the rebuilt arms). The flat inner side of the tube lies behind the side
      wall by design and now counts as upper arm. Measure the clip of the visible surface only,
      or give the pair an accepted depth (`2026-10-25-hippo-arms.md`).
- [ ] Hippo bassist: the left paw goes over 1.5 cm into the neck in 27.0% of the play samples
      (0.9% before), at most 1.7 cm, inside the accepted 2.0 cm, while the left forearm passes
      1.5 cm in 1.6% (19.7%): the wrist skin counts as paw now. The left forearm goes 2.1 cm in,
      in 0.1% of the play, and the right upper arm 2.0 cm in 0.4% of the lowering. A light face
      of the texture under the right arm shows from az150 (`2026-10-25-hippo-arms.md`).
- [x] Hippo bassist: the shoulder ring of the bow arm keeps a flat share of 0.68 (goal 0.80), and
      8 shoulder faces stretch more than 1.8 times (`pnpm arm-shape bassist`). The renders show no
      flat band. One shape of `raise` is free (`2026-10-19-arm-skin.md`).
      Done: the shoulder ring of the rebuilt bow arm keeps 0.88 in the play, and no shoulder
      spike stretches (`pnpm arm-shape bassist --rings`, `2026-10-25-hippo-arms.md`).
- [x] Hippo bassist: with the forward elbow, the right forearm goes 1.2 cm deeper into the body in
      the lift and 1.8 cm in the lowering (`refit-hippo-depths.txt`). Fit `restPoleR` or the via
      of the rest bow, and count the roll jumps of the bow paw again (`2026-10-18-hippo-arm.md`).
      Done: `pnpm pose-depth bassist` gives 0.0 cm for each arm part in the body, before and
      after the rebuilt arms (`2026-10-25-hippo-arms.md`).
- [x] Hippo bassist: the dark slot at the front of the right armpit is the shading of the cut
      caps, whose normals point away from the light. Done: the caps of the arm take the normals
      of the skin around them, also on the elephant and the beaver (`2026-10-19-cut-caps.md`).
- [x] Hippo bassist: the 50° shoulder turn squeezes faces 114 to 116 and 238 to light slivers.
      Rigid weights and a ring at the shoulder fold more, and a turn of 45° or 48° keeps their
      mean creases above 60° (`docs/research/2026-10-19-cut-caps.md`). Try a flip of their long
      edges or a shape that relaxes them.
      Tried: a bow turn of 40° keeps their creases. Faces 115 and 116 crease 53° (47° on main)
      after the spread of the shoulder shape (`2026-10-25-hippo-skin.md`).
      Done: the rebuilt arms replace these faces, and the views of the right shoulder show no
      light sliver (`2026-10-25-hippo-arms.md`).
- [ ] Hippo bassist: on the E and A strings, the roll of the bow paw stays at its low end, and the
      paw goes more than 1.5 cm into the belly in 4.6% of the play samples. A hold that moves the
      right elbow off the line of the stick, such as the slant -10°, can remove it
      (`2026-10-18-hippo-arm.md`).
- [ ] Hippo bassist: the thick arms go into the body and the contrabass in the play and the
      lowering, the upper arms up to 6.0 cm into the body in the play, and the right upper arm
      4.7 cm into the contrabass in the lowering (2.3 cm before the chest fix). A shoulder turn
      above 50° folds the chest under the chin. Fit the hold further, or accept the depths as
      limits of the sweep (`2026-10-18-mesh-hippo.md`, `2026-10-19-hippo-chest.md`).
- [x] Hippo bassist: in the high positions, the thick left forearm crosses the upper bout of the
      contrabass, 7.4 cm deep (5.2 cm before the chest fix). Try a forward turn of the left
      shoulder for the bowed holds, as `WindHold.reachL`, and count the samples with
      `left-forearm.ts` of `docs/research/2026-10-19-hippo-chest/arms/`
      (`2026-10-19-hippo-chest.md`).
      Tried: a left shoulder turn of 25° with the contrabass in front of the belly keeps it at
      7.0 cm in `bach-bwv1050` (`2026-10-21-hippo-bass.md`).
      Done: the left paw stops the strings only up to 0.7 of the fingerboard, over the neck
      (`stopEnd`, `2026-10-21-hippo-bass-arms.md`).
- [ ] Hippo bassist: the high notes take lower places on the neck, because the left paw stops
      only up to 0.7 of the fingerboard. Show the user the left hand in a high passage of
      `bach-bwv1050` (`2026-10-21-hippo-bass-arms.md`).
- [x] Hippo bassist: the user wrote "the hippo is clipping with the contrabass". The back of the
      contrabass went 14.8 cm into the belly. Done: the contrabass stands in front of the belly
      (1.9 cm at the most), with a left shoulder turn, string planes 6° apart, and no hair within
      0.25 m of the frog (`2026-10-21-hippo-bass.md`).
- [ ] Hippo bassist: the bow plays only 0.25 m to 0.415 m of the hair (0.045 m before), so the
      strokes are shorter. Show the user the close views, and offer longer arms or a smaller
      contrabass for longer strokes (`2026-10-21-hippo-bass.md`).
- [x] Hippo bassist: in pizzicato (`boulanger-matin`, `brahms-2`), the straight bow arm crosses
      the right rim of the upper bout, 7.7 cm deep, in 66% of the play samples of
      `boulanger-matin`. Pole and pluck place change nothing. Try a pluck place on the right of
      the strings, or a forward turn of the trunk (`inbass.ts` of
      `docs/research/2026-10-21-hippo-bass/`).
      Done: the paw plucks 0.18 m right of the strings, from the side, with the elbow out
      (`pluckSide`, `2026-10-21-hippo-bass-arms.md`).
- [ ] Hippo bassist: in the change from the bow to pizzicato at 248.13 s of `boulanger-matin`,
      the right forearm goes 4.2 cm into the right rim of the upper bout for a moment (0.0% of
      the samples). Try a path of the change around the rim (`2026-10-21-hippo-bass-arms.md`).
- [x] Hippo bassist: the left wrist on the neck goes 1.5 cm to 1.8 cm into the contrabass in
      15% to 34% of the play samples, so the gate "arms in the contrabass at 1.5 cm or less in
      1% of the samples" fails. Accept it as the contact of a grip, or fit the left paw
      (`2026-10-21-hippo-bass.md`).
      Tried: it is a clip, because a real bassist touches the neck with the thumb only. The paw
      of the mesh is 5.9 cm long and the wrist 8.3 cm thick in radius, so no tilt, elbow, or
      stop keeps the wrist off the neck. Ask the user for a longer paw or a thinner wrist of the
      mesh (`2026-10-21-hippo-bass-arms.md`).
      Done: the user accepted the contact of 1.5 cm to 2.0 cm and keeps the mesh as it is
      (user, 2026-10-21). A later round must not make it deeper.
- [ ] Held instruments over the new limit of 2 cm in the body (`roles/summary.txt` of
      `docs/research/2026-10-21-hippo-bass/`): the pig hornist 4.5 cm in the lift, the rest, and
      the lowering, the rhino tubist 2.9 cm in the play, the red fox and rabbit violinists 2.9 cm
      and 2.8 cm in the lift and the lowering, and the cat violist 2.4 cm in the play. Fit each
      hold, or give the pair an accepted depth with its reason.
- [ ] The merge gate runs no clearance sweep, so a new instrument in the body shows only in
      `pnpm pose-depth` and the paused tests. Add the pair "instrument in body" of each held role
      to the gate, or end the test pause for it (`2026-10-21-hippo-bass.md`).
- [ ] Hippo bassist: the top edge of the upper bout touches the chest under the chin, and a few
      teeth of the skin show over it in a close view from the front (`chest-compare.webp` of
      `docs/research/2026-10-19-hippo-chest/`, `2026-10-19-hippo-chest.md`).
- [ ] Hippo face: the brow ridge of the mesh shades a crease above each pea eye, which can read
      stern in a close front view. Show the user the face, and offer a face rule
      (`2026-10-18-mesh-hippo.md`).
- [ ] Mouse oboist: the paws hold the oboe at the height of the shoulders, higher than a real
      oboist, because the big head puts the reed about 0.13 m above the shoulder joints. Show the
      user the close views, and offer a bowed head while the mouse plays
      (`2026-10-19-mesh-mouse.md`).
- [x] Mouse oboe rest: the oboe stands upright against the belly, with both paws closed on it,
      after the rebuilt arms (`2026-10-25-wind-arms.md`).
- [x] Mouse oboe play: the oboe hangs 15° from the vertical, the elbows bend near the body, and
      both paws close on the tube with no slit on the rebuilt arms (`2026-10-25-wind-arms.md`).
- [x] Mouse oboe and wolf clarinet angle: the oboe hung 15° and the clarinet 20° from the
      vertical. Done: the oboe at 40° on an oboe of 0.5, and the clarinet at 30° of the reference
      images (`2026-10-25-wind-angle.md`).
- [ ] Wind angle gate: three values grow on the margin against main, inside their limits: the
      left forearm twist of the mouse at rest 59° (40°, limit 80°), and the right move twist max
      of the mouse 99° (84°) and of the wolf 103° (93°, limit 176°). The manager decides
      (`gate.txt` of `docs/research/2026-10-25-wind-angle/`).
- [ ] Wind angle twist steps: the right forearm steps of the mouse and the wolf grow to 24.8° and
      25.8° (21.1° and 23.3° on main, target 25°, `twist-*.txt` of
      `docs/research/2026-10-25-wind-angle/`).
- [ ] Mouse oboe at 40°: from the side, the arms reach forward with a more open elbow than at
      15°. Show the user `oboist-play-side.webp` of `docs/research/2026-10-25-wind-angle/`, and
      offer a smaller oboe or a forward lean of the head.
- [ ] Wolf clarinet angle: renders of the app from the camera of the reference images put the
      wolf of the images at about 30° to 35°. The clarinet takes 30°. Show the user
      `wolf-reference.webp`, and offer 35° (`2026-10-25-wind-angle.md`).
- [ ] Oboist close views: at zoom 2, the oboe at 40° leaves the frame of the ±35° views at the
      paws. Widen the frame of the oboist in `ROLE_VIEWS` of `tools/close-views.ts`.
- [x] Tan fox flute rest: the foot joint stands on the top of the right thigh, and the closed
      right paw holds the upper body of the flute (`2026-10-25-fox-arms.md`).
- [ ] The mittens of the wind players close as one block, so no finger lies on a key. The red fox
      on the violin neck has its tips on the neck (`pnpm wind-grip`, `2026-10-25-grips.md`).
- [x] Wolf clarinet: the right finger tips stood 4.3 cm from the tube. Done: they close on the
      lower joint, 0.1 cm (`2026-10-25-open-grips.md`).
- [ ] Wind grips, after the review of the 2x crops of `docs/research/2026-10-25-grips/` and
      `docs/research/2026-10-25-open-grips/` by the manager: write the new entries of
      `ACCEPTED_GRIPS` for the bassoonist, the trombonist, the oboist, and the clarinetist. The
      gate fails their grip turns until then. The trumpeter and the tubist pass with their entries
      since `2026-10-25-brass-grips.md`. The bassoon turns of
      175° and 163° come from the entry of the hold before the palms faced the tube
      (`2026-10-25-open-grips.md`, section 6). After the side grips of the woodwinds, the grip
      turns are oboist 140° and 13°, clarinetist 21° and 6°, and bassoonist 11° and 10°: the
      paws turned back near the grips of 2026-10-24 (`2026-10-25-wind-palms.md`).
- [x] Mouse oboe hands: both paws lay together on the lower half, 0.2 cm apart. Done: the left
      paw on the upper joint, 9.7 cm from the reed, 6.0 cm from the right paw
      (`2026-10-25-wind-palms.md`).
- [x] Wind palms: the woodwind palms faced the audience and the thumbs pointed down. Done: each
      paw holds its tube from its own side, with the thumb up (`2026-10-25-wind-palms.md`).
- [ ] Wind palms gate: the oboist and the bassoonist grow on the margin against main, inside the
      limits: oboist left paw twist 137° (93°), move twists 137° (93°) and 121° (99°), bassoonist
      left forearm twist 38° (14°), paw twist 135° (57°), paw swing 54° (27°), right rest folds 8
      (4, limit 8). The manager decides (`gate.txt` of `docs/research/2026-10-25-wind-palms/`).
- [x] Wind palms twist steps: the left oboe forearm step grew to 34.2°, and the left bassoon
      forearm to 64.6° at each link. Done: the lower left oboe elbow gives 21.3° (largest 30.5°
      at rest), and the left bassoon elbow back gives 55.4° (`2026-10-25-wind-elbows.md`).
- [ ] Beaver left forearm: each of its two links twists 55.4° in the play (target 25°), because
      the beaver has no arm segments. Only rebuilt arms with segments lower it (see "Beaver
      rebuilt arms", `2026-10-25-wind-elbows.md`).
- [x] Panda trombone right paw: the palm faced the audience (+0.93) and the thumb pointed down the
      brace. Done: from sources, the paw holds the low brace from the right of the panda, the
      palm to the side (-0.17), the thumb 5.8 cm up (`2026-10-25-wind-elbows.md`).
- [ ] Panda trombone right forearm: with the side palm, each of its two links twists 42.8° in
      the play and up to 70.6° at rest (5.4° and 15.8° before), and the paw twist p95 is 141°
      (limit 170°). No image shows a band. The panda has no arm segments
      (`twist-branch-trombonist.txt` of `docs/research/2026-10-25-wind-elbows/`).
- [ ] Wind elbows gate: five values grow on the margin against main, inside the limits: oboist
      left flat p5 0.68 (0.75), trombonist right forearm twist 45° (9°), paw twist and move
      twist 141° (32°), and flat p5 0.66 (0.79). The manager decides (`gate.txt` of
      `docs/research/2026-10-25-wind-elbows/`).
- [ ] Panda trombone right paw in the front view: the paw lies below the lower slide tube with
      its finger tips on the brace, so from the front it reads as a paw under the slide. Show the
      user `trombonist-right-paw-first.webp` of `docs/research/2026-10-25-wind-elbows/`.
- [x] Beaver bassoon rest: the right paw stood about 10 cm from the boot joint at rest. Done: the
      rest turns the lower end 10° back, and both paws grasp in each set
      (`2026-10-25-wind-elbows.md`).
- [ ] Wind thumbs: the mesh thumbs have no bone, so on the left oboe paw and the right bassoon
      paw the thumb tip lies 1.2 cm and 5.0 cm in front of the tube axis. Add the
      thumb measure of `palm-probe.ts` to `pnpm wind-grip`, so that a gate sees the thumb.
- [ ] Rhino and pig paws have no separate digit, so the palm probe gives no thumb for the tuba
      and the horn. Check the horn hold from the images and the technique (`palm-branch.txt`).
      The left tuba palm faced the audience by +0.43. It faces the main branch since
      `2026-10-25-brass-grips.md` (0.90 to the right, -0.06 to the audience).
- [x] Panda trombone: the right mitten stood 2 cm off the slide brace. Done: the finger tips hold
      the brace from the right of the slide (`2026-10-25-open-grips.md`).
- [ ] Panda trombone travel: the arm reaches 0.105 m of the slide at 45° to the right, 18% of a
      real seventh position (0.57 m), since the right paw holds the far side of the brace (0.17 m
      before, `2026-10-25-wind-elbows.md`). On the grip before, 60° gave 0.26 m and 90° 0.455 m.
      Show the user the lineup of 45° and 60° (`slide-scan-final.txt` of
      `docs/research/2026-10-25-open-grips/`).
- [ ] Panda trombone: with the play hold at rest, the left finger tips stand 0.7 cm from the slide
      tubes at rest (0.4 cm on 0cfe7ee6, limit 0.6 cm). A rest aim for each paw would keep the left
      paw as before (`2026-10-25-open-grips.md`).
- [x] Monkey trumpet: the bell pointed 20° below the level. Done: 10°, slightly down, with the
      mouth visible (`2026-10-25-open-grips.md`).
- [x] Rhino tuba: the left paw kept the roll of its shoulder. Done: the palm faces the main branch
      at its back left (`2026-10-25-open-grips.md`).
- [ ] Beaver bassoon: the right claws go 1.5 cm into the bassoon in one lowering sample of 30 in
      four demos (`depth-bassoonist.txt` of `docs/research/2026-10-25-grips/`).
- [ ] Badger triangle: the left paw stands with the fingers up and the clip leaves its heel. A
      real player holds the clip between the thumb and the fingers at eye level
      (`docs/reference/percussion-technique.md` 10).
- [x] Beaver and rhino: black slots and wedges under both arms from each side. The arm roots take
      the normals of the skin (`rootNormals`), and the slots shade as soft armpits
      (`2026-10-25-beaver-rhino-arms.md`).
- [ ] Beaver right arm root: a soft dark crease stays at its front from the right side at the
      elevation 20 (`bassoonist-views.webp` of `docs/research/2026-10-25-beaver-rhino-arms/`).
- [ ] Beaver rebuilt arms: the method of the cat folded 15 faces of each arm (limit 8) around the
      socket of the seam cut. A new try needs a smaller socket, because the upper arm joins the
      trunk down to 0.9 of its length (`2026-10-25-beaver-rhino-arms.md`).
- [x] Rhino rebuilt arms: the round tubes put the upper arms 3.5 cm into the belly, and the right
      tuba paw grasped in 0% of the play samples of `pnpm wind-grip` (97% on `main`), because the
      far claw corners stood 1.2 cm off the valves. A new try needs a flatter inner side of the
      upper arm, or a choice of the user on its thickness (`2026-10-25-beaver-rhino-arms.md`).
      Done: the inner lower side of each upper arm is flatter after the bake, and the paws keep
      the rule weights. The upper arms go 0.3 cm to 0.9 cm in, and both paws grasp in each
      sample (`2026-10-26-fifth-review-rhino.md`).
- [x] Rhino tubist: the upper arms go 1.8 cm to 2.0 cm into the body (goal 1.5 cm). Done: the
      right shoulder turns 45° forward, and the right elbow points more out than down. The upper
      arms go 1.4 cm to 1.5 cm in (`2026-10-25-thick-arm-depth.md`).
- [x] Rhino tubist: the arm gate fails the margin of the right move twist max, 148° against 133°
      before the elbow change, inside the limit 176°. The manager decides
      (`2026-10-25-thick-arm-depth.md`). Done: the right move twist max is 37°
      (`2026-10-26-fifth-review-rhino.md`).
- [ ] Twist step of the beaver upper arm: 64.8° (target 25°). Only rebuilt arms with segments
      lower it (`2026-10-25-beaver-rhino-arms.md`). The rhino has them since 2026-10-27, with
      the largest steps 22.7° and 19.6° (74.1° before, `2026-10-26-fifth-review-rhino.md`).
- [ ] Rhino tubist: the left forearm comes 1.5 cm into the main branch of the tuba in the moves
      and at rest (limit 1.5 cm, 0.8 cm before), because the left elbow is lower
      (`pose-depth.txt` of `docs/research/2026-10-26-fifth-rhino/`).
- [ ] Rhino tubist: the manager checks the new accepted grips of the tubist (-87°, -32°) in the
      2x paw crops (`paws.webp` of `docs/research/2026-10-26-fifth-rhino/`). The bind moved the
      zero of the paw twist, so the old entry failed the same grips.
- [ ] Mesh rigs: the bind arms of the other configs bend the elbow up, so their bind paws can
      start pronated on the forearm, and their paws twist more than a real forearm turns. Read
      the bind turn of each role with `forearm-turn.ts` of the probes of
      `docs/research/2026-10-26-fifth-rhino/` (the rhino read -78°, and -13° with its elbow
      forward).
- [x] Arm segments for the wolf and the mouse: copies of the meshes with the arm factors in
      Blender, and Blender weights (`2026-10-25-wind-arms.md`).
- [x] Arm segments for the foxes: a copy of the mesh with a side wall under each arm, Blender
      weights, and arm segments, one rig for the red and the tan fox (`2026-10-25-fox-arms.md`).
- [ ] Foxes: the largest twist step is a forearm segment step, a quarter of the paw twist: 44.5°
      on the red fox left arm (the accepted violin hold twists the paw 168°), and 31° and 33° on
      the tan fox (target 25°, `2026-10-25-fox-arms.md`).
- [ ] Tan fox flute: the grips of the play and the rest lie on two sides of the flute, so the
      right paw turns around the tube in the lift (`gripAround`). Show the user the 2x cells of
      the lift (`2026-10-25-fox-arms.md`). The right paw stays within 0.7 cm of the flute in each
      step, and the flute stays out of the body, but in the first and the last 0.4 s of the move
      the finger tips are 0.6 cm to 0.9 cm off (`crops/flute-moves.webp` of
      `docs/research/2026-10-25-open-grips/`).
- [ ] Mouse tail: the loop of the long tail lies on the floor behind the mouse, and the footprint
      is 0.764 m deep. The stages of the demos with oboes are 2.1% to 6.3% smaller
      than with the large mouse, about the stages of the parametric mouse. Check the tail between
      the rows of the stage with the user (`2026-10-19-mouse-size.md`).
- [ ] Mouse haunch: with no chair, the haunch hangs 0.076 m above the floor behind the heels,
      and in the low side view of the play it seems to float a little
      (`chair-species-play-views.webp` of `docs/research/2026-10-19-mouse-size/`). Show the user
      the side view, and offer a lower haunch or the heels further back, with a rig round of the
      legs (`2026-10-19-mouse-size.md`).
- [ ] Mouse oboe size: the mouse plays an oboe of 0.5 of the oboe of the app (0.275 m), so that
      it holds the oboe at 40°. No source gives the size of a smaller oboe for a child
      (`docs/reference/wind-technique.md` 4.2). Show the user the play frame with the small oboe
      (`2026-10-25-wind-angle.md`).
- [x] Elephant timpanist: the skin folded in each sample, up to 23 faces. The mallet grip with
      its top toward the shoulder, the mallet home further forward, the arm cut, a ring, three
      rigid faces, and four new shapes cut the play folds to 0.4%, the lift to 11.3%, and the rest
      to none (`2026-10-19-elephant-arms.md`).
- [x] Elephant timpanist lift: face 235 at the front of the right armpit folds in 9.7% of the
      lift samples (`docs/research/2026-10-19-elephant-arms.md`). Done: the twist bone, the
      elbows down, and four new shapes. Face 235 folds in no sample, and the lift folds in 0.8%
      (`2026-10-19-arm-skin.md`).
- [x] Elephant timpanist: in the right side view of the gallery, the raised right arm casts a
      shadow on the chest, and the area under the arm is darker than on the base (mean light
      0.378 against 0.441). Done: the elbows point down and near the body, so the right arm
      hangs beside the chest (`compare.webp` of `docs/research/2026-10-19-arm-skin/elephant/`).
- [x] Elephant timpanist: the user saw twisted and deformed arms in the play. Done: the twist
      bone and the elbows down. The play twist goes from 57° and 43° to 22° and 22°, and the
      flat share from 0.96 and 0.74 to 0.91 and 0.91 (`2026-10-19-arm-skin.md`).
- [x] Elephant timpanist pose: the upper arms pointed out, and each paw bent down to hold its
      mallet straight down. Done: the user chose "V1, reference": kettles of the real size, paws
      above the near rims, mallets up between strikes, three new shapes, play folds 0.0%
      (`2026-10-19-elephant-pose.md`).
- [x] Elephant timpanist paws: the manager saw wrung paws in phase 2 (the paw turned about 130°
      on the forearm). Done: the mallet across the forearm with its head at the back of the fist;
      the paw turns 36° (`2026-10-19-elephant-pose.md`).
- [x] Elephant timpanist: the right shoulder ring is flat (0.70 of the bind, goal 0.80), and the
      right forearm looks thin at azimuth 35. Rings of the right forearm gave no visible gain.
      Done: a ring at the right shoulder gives 0.79 (p50) and removes the sharp wedge at the front
      of the right armpit (`2026-10-19-elephant-grip.md`).
- [x] Remove the mallet cock (`PercussionHold.cock`): no hold uses it since phase 3 of the
      elephant pose (`2026-10-19-elephant-pose.md`). Done in round `elephant-grip`.
- [x] Elephant timpanist arms after the refit: the long thin faces at the front of the right
      armpit shade dark. From the front, the bent left elbow shows a sharp corner, and the cut a
      dark slot at the top of the left upper arm (`arms.webp` of
      `docs/research/2026-10-19-arm-skin/elephant/`). Done: the A-pose mesh has no cut, and its
      arms are quad tubes (`2026-10-25-elephant-arms.md`).
- [x] Elephant timpanist grip: the user saw the mallets held in the reverse direction, and
      squeezed arms from the back. Done: the head out of the front of the fist, the mallets
      forward and in, the paw turn 39° / 44° (`2026-10-19-elephant-grip.md`).
- [x] Elephant timpanist arm gate: the grip turn failed (28° / 32°) against the old accepted grip.
      Done: the manager accepted the paw crops, and `ACCEPTED_GRIPS` of the timpanist is L -2,
      R -6 (`2026-10-19-elephant-grip.md`).
- [ ] Arm gate: the stretch counts from the rest sample, so a rest where the wrist lifts the head
      gives a false stretch. The elephant left arm gives 0.22 (base 0.09, limit 0.35), and less
      than the base against the bind. Count the stretch from the bind, or from the rest only when
      the rest keeps the wrist straight (`docs/research/2026-10-19-elephant-grip.md` 5).
- [ ] Seam gate: no measure of the skin separates the flaps, the shards, and the dents at the arm
      seam from the good roles, so `pnpm arm-check` does not see them
      (`docs/research/2026-10-22-seam-gate.md`). Each mesh round looks at the sheets of
      `pnpm close-views audit`. Next idea: a render measure on the audit cells, or a form
      measure of the trunk under the source arm.
- [x] Elephant timpanist: the third shape of `raise` (the bent right wrist with the mallet up)
      has no pose near its rule since the new grip. Done: the arm segments replace each shape of
      `raise` (`2026-10-25-elephant-arms.md`).
- [ ] Pig hornist folds: two faces of the right hoof fold in each rest sample and in 26.5% of the
      lift samples, because a body has at most four corrective shapes (`RAISE_LIMIT`). Try a
      weight rule of the right paw, or a rest with a smaller turn of the right wrist
      (`2026-10-19-mesh-pig.md`).
- [ ] Pig horn rest: the round belly covers the short thighs, so the horn rests on the belly over
      the lap, with the bell beside the right haunch. Show the user the close views
      (`hornist-base-views.webp` of `docs/research/2026-10-19-pig-mesh/`).
- [ ] Pig arms: in the front view, the skin of the armpits stretches into bands from the trunk to
      the raised upper arms, most on the right arm. Show the user the close views
      (`2026-10-19-mesh-pig.md`).
- [ ] Pig standing soloist: no demo has a standing pig, and `pnpm pose-depth --soloist` takes only
      a bowed role, so only the close views check it (`2026-10-19-mesh-pig.md`).
- [ ] Pig right armpit at rest and in the lift: 22 faces turn past 45° in each rest sample (23.5 on
      `main`), and the rest shape keeps face 217 turned over. The cut of `cut_seam()` fails on the
      pig seam (a vertex with two loop edges). Make the cut take that seam, or try a weight rule
      (`2026-10-20-armpits.md`).
- [x] Rabbit armpit cut: a thin dark slit shows at the top of each cut on the side of the chest in
      the play, and an open edge pair of 3.1 cm stays under the right armpit
      (`docs/research/2026-10-20-armpits/views/`). Close the pair in `cut_seam()`, then check the slit.
      The user saw the right slit as a missing piece. The cut faces and the rim there take the
      normals of the skin (`2026-10-21-rabbit-armpit.md`).
- [x] Rabbit right armpit: a soft hollow and a short dark wedge stay under the raised bow arm,
      because the caps of the body lie in a notch of the trunk. A fill of the notch made a sharp
      tent. Try a fair surface across the notch with no tent (`2026-10-21-rabbit-armpit.md`).
      The rig reads a Blender copy of the mesh with the notch vertices half of the way out to a
      fitted surface (`rabbit-4-armpit.glb`).
- [ ] Rabbit right armpit after the fair move: a shallow hollow with a small sharp tip stays
      under the raised bow arm at the camera of the user. The full move made facets and a pit, so
      a smoother hollow needs more vertices in the notch (`2026-10-21-rabbit-armpit.md`).
- [x] Rabbit right armpit front: with the arm down, the notch at the front of the right arm root
      showed as a dark pocket from the right front. A copy fills the notch toward the hull of the
      trunk (`rabbit-4-roots.glb`, `2026-10-22-rabbit-armpit.md`).
- [ ] Rabbit right armpit front in the play: a V crease stays at the front of the arm root from
      az60 at the frog, the tip, and the crossing. 84% of its depth comes from the bend of the
      bind arm, 16% from the twist. A push of the root front softens it (p5), but each push on top
      of the fill makes the shapes of the right arm fail (`2026-10-22-rabbit-armpit.md`). A dual
      quaternion bind does not shrink it (`2026-10-22-dq-bind.md`).
- [ ] Arm root dents of the mesh rigs: the bend from the hanging source arm to the bind arm makes
      them, and no blend of the bind removes them (`2026-10-22-dq-bind.md`). Next: a bind arm
      nearer to the source arm (`studio.bindArms`), measured with `split.py` of the report.
- [ ] Rabbit: commit `b1e270f0` of the paused round `rabbit-depth` (the via of the bow grip in the
      lift and the lowering) still waits for its gates (`2026-10-22-rabbit-armpit.md`).
- [x] Rabbit left armpit: a thin dark line stays at the top of the cut under the violin arm. The
      normals of the skin put a light sliver there, and the half move of the right side a light
      streak, so the left side keeps its face normals and vertices (`2026-10-21-rabbit-armpit.md`).
      The left cut now takes the normals of the skin, which removes a black spike at the seam
      under the bent violin arm (`2026-10-21-rabbit-arm.md`).
- [x] Rabbit arm shadows: the hard shadow of each arm on the white trunk shows as black wedges
      with steps of the shadow map along the seam. About half of the black pixels of the seam go
      with no shadow on the rabbit (`2026-10-21-rabbit-arm.md`). The user chose "Keep, softer":
      the shadow radius 5 on the high tier and in the gallery removes the steps, and the seam has
      15% fewer black pixels than the gallery at radius 1 (`2026-10-21-stage-exposure.md`).
- [ ] Rabbit arm shadows: the shadows of the side lights keep about 13,000 black pixels more in
      the seam of the rabbit than no shadow (`seam-final.txt` of
      `docs/research/2026-10-21-stage-exposure/`).
- [ ] Rabbit soloist: with the twist bones, the violin goes 0.5 cm deeper into the body in the lift
      and the lowering of the standing soloist (2.3 cm, no limit). Check the chin and the left
      shoulder in the close views (`pose-depth-soloist-base.txt` of
      `docs/research/2026-10-21-rabbit-arm/`).
- [ ] Rabbit upper arms: the narrow axis of the middle ring of each upper arm keeps 0.62 to 0.81
      of the bind, so the shoulders look flatter than the source in the back views. Try a bind arm
      nearer to the play, or a shape of the raised arm (`arm-shape.txt` of
      `docs/research/2026-10-21-rabbit-arm/`).
- [ ] Rabbit open edges: a flap face with two open edges (3.1 cm) stays under the right armpit.
      The module before the cut has such a pair too, and no frame of the round shows the flap
      (`open-edges.txt` of `docs/research/2026-10-21-rabbit-armpit/`).
- [ ] Horn right paw: the palm lies on the bell axis 2.5 cm inside the opening, and the paw lies
      across the opening, 86° from the axis. A real hand goes deeper, against the far wall at 2
      o'clock. Turn the paw along the bell for the horn, and update the accepted grip of the gate
      after the manager accepts the crops (`2026-10-20-armpits.md`).
- [x] Wolf size: the agent chose the seated skull top at 1.10 times the dog cellist, the middle of
      the ratio 1.03 to 1.16 of the orchestra images, while the user slept. The user then asked
      for 0.9 of the height and 1.2 of the width (`2026-10-20-wolf-shape.md`).
- [ ] Wolf shape: the body is 0.9 times as high and 1.2 times as wide, and the head keeps its size
      (round `wolf-head`). The seated wolf is now 1.01 times the dog cellist, below the range of
      the orchestra images. Show the user `compare.webp` of `docs/research/2026-10-20-wolf-head/`
      (`2026-10-20-wolf-shape.md`).
- [ ] Wolf grip: the play medians of the paw twists are -97° and 79°, against the accepted -86° and
      67° of `ACCEPTED_GRIPS`. The grip turn passes (11° and 12°). Update the entry after the
      manager accepts `arms-strike.webp` and `arms-rest.webp` (`2026-10-20-wolf-shape.md`).
- [ ] Wolf colors: the fur keeps the hues of the texture and of the sheet (no tone rule, round
      `mesh-badger`), but the warm light of the stage still shows a warm gray, and the wolf of the
      orchestra images is a cool gray with no cream chest (`faces-colors.webp` of
      `docs/research/2026-10-20-wolf-mesh/`). Show the user the face pair and the play frame.
- [ ] Wolf tail: at rest, the root of the tail goes 0.6 cm into the back of the seat
      (`tail-variants.txt` of `docs/research/2026-10-20-wolf-shape/`).
- [ ] Wolf clarinet: the mouthpiece goes 1.3 cm into the head under the long muzzle, and no demo
      has a standing wolf soloist, so only the close views check it (`2026-10-20-mesh-wolf.md`).
- [x] Wolf head size: the head has the size of the head of the red fox, and the body below the
      neck is 0.9422 times as large, so the standing skull top stays at 1.620 m
      (`2026-10-20-wolf-face.md`).
- [ ] Wolf face: level brows, level pea eyes, and a thin smile line (round `wolf-face`). Show the
      user `compare.webp` and `faces.webp` of `docs/research/2026-10-20-wolf-face/`, with the
      variant with no body change (`2026-10-20-wolf-face.md`).
- [ ] Wolf reach: the right paw reaches its clarinet grip with only 0.9 cm to spare (5.1 cm at
      `0e7130db`), because the arms take the body factor. A larger arm factor (up to 1.25) or a
      new mouthpiece place can give more (`2026-10-20-wolf-face.md`).
- [x] Badger cymbals: hand cymbals of the smallest real size (14 in) go 7.6 cm or more into the
      round body at each crash place in reach, so the badger plays a suspended cymbal on a stand
      with two yarn mallets (`2026-10-20-badger-cymbals.md`).
- [ ] Badger cymbals choice: the agent chose the suspended cymbal while the user slept. Show the
      user `compare.webp` of `docs/research/2026-10-20-badger-cymbals/`, and ask if the badger
      keeps it, or gets longer arms for hand cymbals.
- [ ] Suspended cymbal: the free paw does not muffle the plate after a note, and the moments of
      `ROLE_VIEWS.cymbalist` still have the names of a crash (`tools/close-views.ts`).
- [x] Badger xylophone: the short arms reach at most 85% of the xylophone strikes, because the
      body does not move from side to side behind the notes. Ask the user for a smaller
      xylophone, longer arms, or a side step of the body (`2026-10-20-mesh-badger.md`).
      Done: the wrists stopped at their full reach in front of the bars. The spine leans over
      the bars, and the body moves from side to side behind the notes with the feet in place
      (`2026-10-25-xylophone-sway.md`).
- [x] Badger xylophone back row: the sharp bars stay about 11 cm out of reach also with the lean
      (`2026-10-25-xylophone-sway.md`). Ask the user for a smaller xylophone or longer arms.
      Done: the user prefers a smaller xylophone. The bars are 3 cm wide and 12 cm to 8 cm long,
      0.42 m in front, and each strike of the pirates part lands within 5 mm
      (`2026-10-25-xylophone-reach.md`).
- [ ] Badger xylophone runs: a scale stays in one hand, because a hand does not cross the other
      (`alternateHands()`), so on the percussion test score the right paw reaches across the
      body to the lowest bars (median miss 9.5 cm). A real player alternates the hands in a
      scale, with no cross of the mallets (`docs/reference/percussion-technique.md` 9).
      Done: a run that leaves the reach of one paw goes on in the other paw, and the right paw
      strikes 93% of its bars within 5 mm, median 0 mm (`2026-10-25-xylophone-reach.md`). The
      alternation stays open (below).
- [x] Badger xylophone alternation: a scale stays in one hand up to the reach of the paw, where
      a real player alternates the hands (`docs/reference/percussion-technique.md` 9). With full
      alternation, each head passes the other head at one height, and the shafts touched in 3.9%
      to 7.1% of the samples of the test score (`2026-10-25-xylophone-reach/clip-alternate.txt`).
      Done: a fast strike takes the other paw and passes the other paw by up to 3.5 cm, the right
      head lifts higher than the left head, and the reach counts from the shoulders of the side
      move. The hands change in 35% of the fast pairs of the test score and 74% of the pirates
      part, and the mallets touch in 0% and 1% (`2026-10-25-percussion-rest.md`).
- [ ] Badger xylophone outer runs: the runs at the outer bars of the test score stay in one paw,
      because the other short arm does not reach them (reach 0.53 m from the moved shoulders).
      A real player alternates there too. A larger side move of the body or a step can help.
- [ ] Badger xylophone passes: where one paw passes the other in a run, the two shafts show as
      an X from above, at two heights, with no touch. A real player keeps a V with no cross
      (`docs/reference/percussion-technique.md` 9, `2026-10-25-percussion-rest/pairs/`).
- [ ] Badger xylophone head height: between strikes, the right head stands up to 13 cm above the
      right shoulder joint and shows beside the shoulder from the back, and the left head about
      13 cm above its bar. A real player keeps the stroke 2 to 3 inches high (source 39). A lower
      head bent the wrist over the gate (`2026-10-25-percussion-rest/runs-gate.txt`).
- [ ] Badger xylophone back row middle: in a run up the test score, the right paw misses 4
      strikes on the two sharp bars in the middle of the back row by 8 to 26 mm, and the paw
      rises to the height of the muzzle there (`2026-10-25-xylophone-reach/run-test.webp`).
- [ ] Badger xylophone mallets: the mallets of 0.30 m look long beside the small bars of 11 cm
      to 7 cm. A shorter mallet moves the band of reach nearer, and the bars with it.
- [x] Badger xylophone soles: the side move of the hips sinks the soles 3 to 6 mm into the floor,
      because the foot skin follows the tilted shin (`2026-10-25-xylophone-sway.md`).
      Done: the hips keep their place, and the spine takes the whole side move. No sole corner
      sinks or lifts (`2026-10-25-xylophone-reach.md`).
- [x] Badger xylophone mallets: between strikes, each head swings in to the rest direction of the
      snare grip, so two heads on near bars can meet. The offsets and the repeat rule of
      `2026-10-21-pirates-clip.md` leave a touch in 1% of the samples of the steel drum part of the
      pirates file. A rest direction of 0 removes it, but turns the accepted grip by 36°: show the
      user the crops, and update `ACCEPTED_GRIPS` if the user accepts.
      The pitch from the strike direction of the snare and the cymbal (`MalletAcross.pitch`,
      `2026-10-25-percussion-tips.md`) can also keep the heads apart: try it here.
      Done: the pitch 0.5 keeps the heads at least 2.5 cm apart on the steel drum part, and the
      grip turns 7° and 4° from `ACCEPTED_GRIPS` (`2026-10-25-xylophone-sway.md`).
- [x] Badger xylophone grips: the lean and the pitch turn the play median of each paw by 7° (L) and
      4° (R) from `ACCEPTED_GRIPS`. The manager reads the 2x paw crops of
      `docs/research/2026-10-25-xylophone-sway/` and sets the new medians.
      Done: the manager accepted the crops on 2026-10-25, and `ACCEPTED_GRIPS` holds L -28, R -22.
- [ ] Badger xylophone shafts: on a chord of two near bars, the shafts of the two mallets touch
      in 0.4% of the samples of the steel drum part (`2026-10-25-xylophone-sway.md`). The smaller
      bars and heads leave 0.1% (`2026-10-25-xylophone-reach.md`).
- [x] Percussion grip, xylophone folds: with mallets of 0.40 m from homes 0.55 H out, the arm
      gate counted 12 and 14 folds. Done: the mallets of 0.30 m, the homes of `main`, and bars of
      11 cm to 7 cm give 7 and 3 folds, and grip turns of 15 and 9
      (`2026-10-25-percussion-grip.md`).
- [x] Percussion grip, accepted grips: done, the manager accepted the crops of the snare drum,
      the cymbal, the bass drum, the triangle, and the timpani (`ACCEPTED_GRIPS`).
- [ ] Percussion grip, xylophone exit: the mallets run near the line of the forearms, so the
      shafts leave the fists past the knuckles, under the curled claws. The paws hold as fists in
      62% (L) and 90% (R) of the play, but grasp in 0% by the exit rule. Accept the crops, then
      set the xylophone medians in `ACCEPTED_GRIPS`.
      Round `percussion-rest`: no grip passes the limits. The rest angle 0.6 grasps the right paw in
      81% of the play, but folds the left knuckles 11 times and turns the grips 70° to 73°. The roll
      at the strike turns the paws up to 109° in 0.01 s (`2026-10-25-percussion-rest/exit-scan.txt`).
- [ ] Percussion grip, elephant left paw: it grasps in 68% of the lift samples, and its total
      arm twist grows from a mean of 61.5° to 81.0° (`twist-branch-timpanist.txt`). Its largest
      step is 29° in 0.01 s (`main` 16°).
- [x] Percussion grip, butt ends: the butt of the right elephant mallet, of the triangle beater,
      and of the bass drum beater stays in the paw, where a real player has 13 mm to 25 mm
      behind the hand (`percussion-technique.md` 1). A longer butt (`MALLET_BUTT`) or a grip
      further toward the head fixes it.
      Done: the shafts are 6 cm (timpani, bass drum) and 7 cm (triangle) long behind the grip
      (`malletButt`), and the butt ends stick out 1.8 cm to 2.3 cm (`2026-10-25-percussion-rest.md`).
- [x] Percussion grip, rest: the arms of the snare drum, cymbal, and xylophone players hang, and
      each closed paw holds its stick up and forward from the front of the fist. Show the user.
      Done: the snare and the cymbal paws hold the sticks level across the waist, palms down, as a
      real snare drummer between entrances (`PercussionHold.set`, `2026-10-25-percussion-rest.md`).
- [ ] Xylophone rest: the xylophone paws still hold the mallets up and forward at rest. No source
      gives the rest of a xylophonist. The set position of the snare drum can fit it.
- [ ] Snare stretch gate: the arm gate counts the stretch from the rest sample, so the new rest
      raises the snare stretch p95 from 0.14 to 0.28 (limit 0.35) with no change of the play.
      From the bind, the left play stretch is 0.32 (`2026-10-25-percussion-rest/set-gate.txt`).
- [ ] Wind grip tips: `pnpm wind-grip` now takes the finger tips from the bind pose. The right
      oboe paw then grasps in 54% of the play samples in place of 100%: its old tips were the
      knuckles (`2026-10-25-percussion-grip.md`).
- [ ] Twist steps of the percussion: `twist-steps.ts` of `docs/research/2026-10-24-violin-arms/`
      reads the demos only, so the snare drum and the xylophone get no rows. Give it the
      percussion test score.
- [x] Snare and cymbal grips: the pitch between strikes turns the play median of the paw by 13°
      to 23° from `ACCEPTED_GRIPS`. Done: the manager accepted the 2x paw crops of
      `docs/research/2026-10-25-percussion-tips/` and set the new medians in `ACCEPTED_GRIPS`.
- [ ] Snare and cymbal rest: the arms hang, so the tips point forward beside the drum and the
      plate, 5 cm to 9 cm outside the rim (design 5.2). `ready` keeps the tips over the instrument
      also at rest, as for the bass drum, and removes the lift. Ask the user.
- [x] Badger xylophone reach: the left arm misses its bars by 38 mm (median) on the steel drum part
      of the pirates file, and the forearms go 3.5 cm into the body in 11% of the play samples
      (`docs/research/2026-10-21-pirates-clip.md`). This waits for the xylophone task above.
      Done: the median miss is 0 mm, 90% of the left strikes land within 5 mm, and the forearms
      go 1.5 cm into the body in 0.4% of the samples (`2026-10-25-xylophone-sway.md`).
- [ ] Polar bear pianist: the paws keep apart, but their claw tips almost touch when the paws play
      two octaves apart, because the paws point in along the forearms (`PAW_TURN`). A turn of the
      paws toward the fallboard would need a hold of its own and a new accepted grip
      (`2026-10-21-pirates-clip.md`).
- [ ] Dog cellist: in Boulanger, the third cellist puts one paw 2.4 cm into the other in 15 of
      1,123 samples (121 s to 127 s), where its notes mix pizzicato on the low strings with a held
      arco note. `pnpm clip-probe --demo boulanger-matin` gives this clip on `main` too
      (`docs/research/2026-10-21-pirates-clip.md`).
- [ ] Badger size: the agent chose the head top of the parametric badger (1.038 m) while the user
      slept. Show the user the lineup and the play frame (`2026-10-20-mesh-badger.md`).
- [ ] Badger triangle: three faces of the front of the left shoulder stay turned after the relax
      of the shape of the raised left arm, and fold in 86% of the play of the percussionist
      (`raise-fit` rule of `tools/mesh-rigs/badger.json`).
- [ ] Badger colors: the front fur and the eye stripes of the mesh are darker than the sheet
      (Oklab L 0.28 against 0.40), and the warm light shows the stripes on the top of the head as
      a mid brown. Show the user `faces.webp` of `docs/research/2026-10-20-badger-mesh/`.
- [ ] Badger arm views: `pnpm arm-check --views` renders no crop of the snare drummer and of the
      xylophonist, because only the percussion test score has them, and `close-views play`
      renders only demos.
- [x] Remove the unused code of the `pointed` ears and the `bushy` tail: no species has them
      since the wolf mesh. The outline of the pointed ear stays for the antlered ears of the deer,
      and the `long` snout for the deer and the badger (`2026-10-20-mesh-wolf.md`). Since the
      badger mesh, the face pattern `stripe` and the `small` ears of the badger have no species
      either, except the small ears of the rhino.
- [ ] Elephant timpanist: the seam where the upper arm of the mesh lies on the side of the body
      shades dark lines on the front of the body when the arms play (`timpanist-base-views.webp`
      of `docs/research/2026-10-19-elephant-mesh/`). The arm cut of `2026-10-19-elephant-arms.md`
      takes the seam below the shoulder, and dark areas stay on the chest beside the raised arms
      (`timpanist-views.webp` of `docs/research/2026-10-19-elephant-arms/`).
- [ ] Elephant timpanist: each hand keeps the front kettle on its side of the trunk, so a roll
      stays in one hand, and the outer kettles stand out of reach and are never struck
      (`PercussionHold.pair`). Show the user the views, and offer longer arms for rolls with
      both hands and for the outer kettles (`2026-10-19-elephant-pose.md`).
- [x] Remove the unused code of the `trunk` snout with its tusks and of the `large-flap` ears: no
      species has them since the elephant mesh (`2026-10-19-mesh-elephant.md`).
- [x] Beaver bassoonist: three faces of the left arm folded in each play sample. A cut of both
      armpits and one shape of the left arm remove each play fold (`arm-cut.txt` of
      `docs/research/2026-10-19-beaver-mesh/`, `2026-10-19-mesh-beaver.md`).
- [ ] Beaver bassoonist: three faces of the left wrist, forearm, and shoulder top fold in each
      rest sample and in 13% of the lift samples. In the lift and the rest, a dark slot with a
      thin dark wedge shows at the cap of the cut under the left arm (`fold-probe-arm.txt` and
      `arm-cut-left.webp` of `docs/research/2026-10-19-beaver-mesh/`).
- [ ] Beaver colors: the mesh keeps the orange-brown fur of its texture (Oklab hue 55°, chroma
      0.096). The tone rule of the hippo, the mouse, and the elephant would give the plain fur the
      chroma 0.060 of `SPECIES_COLORS.beaver`. Show the user the close views, and ask
      (`2026-10-19-mesh-beaver.md`).
- [ ] Beaver bassoon size: the beaver plays a bassoon of 0.82 of the bassoon of the app. No source
      gives the size of a smaller bassoon (`docs/reference/wind-technique.md` 4.2).
- [x] Remove the unused code of the `buck-teeth` snout with `TEETH_COLOR` and of the `flat` tail:
      no species has them since the beaver mesh (`2026-10-19-mesh-beaver.md`).
- [ ] Remove the parametric biped (the branch of `buildBiped()` after the studio bodies, and
      `trunk.ts`, `arms.ts`, `legs.ts`, `ears.ts`, `snouts.ts`, `tails.ts`) when the deer and the
      rhino have bodies of their own. Until then, the harp and the tuba players use it.
      `face-patterns.ts` went on 2026-10-20, because no species had a face pattern.
- [ ] `docs/agents/model-traps.md` has 3,170 words, above its limit of about 3,000
      (`docs/agents/writing.md`). Cut it in a prose pass.
- [x] Bear conductor: at the start of the lift, the baton paw turns from 26° to 180° in 0.13 s, and
      at 0.20 s it snaps from 176° to 105° in 0.01 s. `pnpm arm-check conductor` fails on the paw
      jumps of the right arm in 5.8% of the lift samples (`2026-10-19-arm-gate.md`,
      `docs/research/2026-10-19-arm-gate-2/conductor-lift.webp`). The baton turn of the lift now
      keeps at most 60° of twist: the paw twist stays at most 105°, and the paw jumps are 0%
      (`2026-10-21-wrist-lift.md`).
- [x] Left paw of the violins and of the viola: in each lift and lowering, the paw twist passes
      180° on the forearm, and the twist bone jumps by 180° in one frame, because the rest twist
      (-122° on the rabbit) and the play twist (137°) lie on the two sides of 180°. Done: at rest,
      the paw holds the neck with a natural twist and a straight wrist (`restTwistL`), and it
      changes to the playing grip in the lift. The middle turn that rolled the instrument a full
      turn is gone (user, 2026-10-25: "the violins / violas are rotated by nearly 360 degress",
      `2026-10-26-violin-lift.md`).
- [x] Rabbit, red fox, and cat: in the middle of the lift and of the lowering, the bow stands
      upright in front of the body with its tip near the eyes for a moment. Done: the bow tip
      points forward beside the body in the middle, and the left paw carries the instrument by the
      nut, so its heel stays out of the instrument (`2026-10-26-violin-lift.md`).
- [ ] Rabbit lowering: the right forearm goes 2.1 cm into the body for 0.2 s at the song end of
      `bach-bwv1050`, against 1.0 cm before the fix of the bow flip (`pnpm pose-depth violinist
      --base 39aa09c9`, `2026-10-21-wrist-lift.md`).
- [ ] Tools of the beat motion (retro of the beat fold round, 2026-10-21):
      - Done (`2026-10-21-user-midi-tools.md`): `--midi`, `--strip`, the strip pair sheet of
        `--base` with its cache, and a camera in JSON in `pnpm close-views play`. `--midi` in
        `pose-depth`, `hold-fit`, and `arm-check`, `--set` and `--variant` in `pnpm clip-probe`,
        and `--trace` in `pnpm beat-rates`.
      - Let `pnpm arm-check --views` render a `--midi` file and the percussion test score, so
        that the views of the badger arms of the snare and the xylophone work. `arm-views.ts`
        renders only the demos of the app, so `--views` refuses `--midi`.
      - Start `docs/reference/conducting-technique.md`, a living reference like the string, wind,
        and percussion files: the beat patterns, the tempo at which a conductor beats in 2 or in
        1, and the sway of real players, with a source for each fact. The limit of 168 BPM for a
        4/4 in 2 has no source yet (`2026-10-21-beat-fold.md`).
- [ ] Tools of a move (retro of the wrist lift round, 2026-10-21):
      - Add `pnpm move-views <role> <demo> lift|lower <at> <times> [--base <ref>] [--set ...]`.
        It writes 2x crop pairs (base | tree) of frames inside a demo lift or lowering. Start
        from `dump.ts` and `render.py` of `docs/research/2026-10-21-wrist-lift/`.
      - Extend `pnpm arm-check --trace` to lowerings and pause points
        (`<demo>:lower@<s>:<from>-<to>`), with columns for the twist bone and the turn rates of
        the wrist and the forearm, and with `--base`.
      - Bring the cold gate back near 2.5 to 3 minutes: pose only the body of the role in the
        set `move`, use a step of 0.02 s with one pause point, and run the set `move` in its own
        child process.
- [x] Tools of a hold (retro of the hippo bass rounds, 2026-10-21): `pnpm hold-scan`, and
      `--per-bone`, `--every`, and `--where` of `pnpm pose-depth` (`2026-10-21-hold-tools.md`).
- [ ] Hold scan of the winds and the percussion: give `pnpm hold-scan` the spare reach of a wind
      grip and the strikes of a percussion hold, and lift and lowering samples
      (`2026-10-21-hold-tools.md`).
- [ ] `pnpm close-views --camera-at <bone>`: crop pairs from four directions around a bone, after
      the arm form round merges (`cams.ts` and `sheet.py` of
      `docs/research/2026-10-21-hippo-bass-arms/`).
- [ ] Armpit flaps from the back (user, 2026-10-22: "the bear has deformed meshes under the arm",
      then "the panda and rhino's arms also got deformed"). A flat flap or shard sticks out under
      the arm from the back or az150 on the bear at the beat (round `bear-armpit`), the panda
      (`first`, `rest`), the rhino (flat left forearm from az-150), the deer (`chord`), and the
      dog (shoulders at `frog`). The other roles are clean from the back at their play moment
      (`pnpm close-views <role> <dir> --lineup --views back,150,-150,front,left,right --crop 2`).
      Fix the panda, rhino, deer, and dog in one round after the cause of the bear is known.
      - [x] Panda: the back lips of the notches join the free arm (round `panda-armpit`,
            `docs/research/2026-10-22-panda-armpit.md`). The down area falls from 34.7 / 32.5 to
            18.7 / 22.2 cm².
      - [ ] Panda arm gate: the flat p5 of the lift falls from 0.80 / 0.84 to 0.69 / 0.71, and
            `pnpm arm-check trombonist --base c5fae22c` gives `FAIL` (limit 0.55). Accept it as
            a decision row, or revert `2ae168dc`.
      - [x] Bear dent (user, 2026-10-22: "the bear is not fixed. there's still visible dent there
            in the arms"): the rig reads a copy with raised shoulder balls (round `arm-roots`,
            `docs/research/2026-10-22-arm-roots.md`). The V at the right root is gone.
      - [ ] Bear left root and back pocket: from az-150, a softer dark crease stays at the left
            root, most at rest (the left shoulder ball 2.49 cm deep at rest). From az150, a small
            dark pocket stays where the raised right arm meets the back at `between`. Try a push
            of vertices 438 and 442, and a second split on the left (`tools/arm-roots/bear.json`).
      - [ ] Panda front notch: a small gray dent below each arm from the left side. Round
            `arm-roots`: a `hull` fill of the 7 front lips (`tools/arm-roots/panda.json`) at half
            makes the V smaller, a full fill puts the lips in the free arm with gray streaks, and a
            fill along +z changes nothing. Next: move the body run of the cut (787, 793, 800).
      - [x] Deer shards: the rig reads a copy with a round patch on each inner arm and cuts the
            seam above the back notch (round `deer-dog-seams`,
            `docs/research/2026-10-22-deer-dog-seams.md`).
      - [x] Deer upper arms in the body: with the cut, the sweep gave 4.9 cm in the play (limit
            3.5 cm, 15.5% of the samples), 3.7 cm at rest, and 4.5 cm in the lowering, against
            3.2, 1.9, and 3.1 cm on the base. With the elbows out at the leaned harp, they are
            3.2, 2.4, and 2.9 cm (`pose-depth.txt` of `docs/research/2026-10-25-harp-lean/`).
      - [x] Deer marks after the cut: at az150, a dark area with a light jagged line on the back
            of the right upper arm root, most at rest from 40°, and a small dark V under the left
            root at az-150 (`deer-root-rest-e40.webp` of the round `deer-dog-seams`). Done: the
            deer has rebuilt arms with no cut (round `fifth-deer`).
      - [x] Deer arm gate: the right twist p95 rises from 40° to 55° (`FAIL`, limit 55°), because
            the free root turns with the bone and the measure starts at the chest. The twist along
            the upper arm falls from 17° to 6°. Accept it as a decision row, or let the twist of
            `tools/arm-shape.ts` start at the shoulder ring for a cut arm.
      - [x] Dog shards at both shoulders from the back: the rig reads a copy with a round patch
            on each inner arm, cuts the seam at 0.64, and gives the inner root a chest share
            (round `dog-seams`, `docs/research/2026-10-22-dog-seams.md`).
      - [ ] Dog upper arms in the body: 5.2 cm in the play and the lowering (goal 3.5 cm, base
            2.0 cm), 4.7 cm in the lift. The front of the bow arm crosses the chest at 248 s of
            boulanger-matin. Try a larger `weights.armRoot.along`, or a bow hold that keeps the
            upper arm off the chest.
      - [ ] Dog lift folds: 17.1% (base 16.1%), faces 342 and 172 at the right shoulder top. A
            `raise` shape for them pushed a pointed sheet out of the shoulder
            (`shape-spike-247.webp`). Try a shape fitted on the lift alone with the fade 5° to
            10°, and check the zoomed strip from the right.
      - [ ] Dog marks after the cut: a soft star dent on the chest below the right arm root from
            the right side (`strip-dog-az90-shoulder.webp`), where the caps of the body meet in a
            fan, and a thin dark line at the right root from az150 at rest. Try a fair of the
            body caps (`fair.py` of `docs/research/2026-10-21-rabbit-notch.md`).
      - [x] Dog arm gate: twist p95 L 46° (base 31°), R 59° (46°), flat p5 R 0.62 (0.68), all
            `FAIL`. The cut root turns with the bone, as on the deer. Accept it as a decision
            row, or let the twist of `tools/arm-shape.ts` start at the shoulder ring.
      - [x] Rhino arms (user, 2026-10-22: "the rhino's left arm is now completed deformed", "the
            rhino's arm is still deeformed"). At full size from the stage, the elbows read as flat
            slabs with sharp corners. The rig reads a copy with a round tube for each arm and a
            fair fill of the trunk (`rhino-tubes.glb`, `2026-10-22-rhino-arm-2.md`).
      - [x] Rhino shoulders (user, 2026-10-22: "the rhino's arm is deformed again"). Dark gashes
            beside each arm root, no shoulder, and color patches on the trunk fill. Each arm
            starts at a ball around the shoulder joint, in a fine fill of the trunk with smooth
            colors (`rhino-shoulders.glb`, `2026-10-22-rhino-arm-3.md`).
      - [x] Rhino right arm: a thin dark line shows where the tube meets the trunk from az150 at
            e20. The round shoulder of `rhino-arm-3` removes it (`root3x-az150-e20.webp`).
      - [x] Rhino arms: the ball and the inner side of each tube lie inside the trunk, so the
            sweep gives the upper arms of the tubist 16.5 cm in the body at rest. Give the sweep
            an accepted depth after the test pause.
      - [x] Rhino trunk fill: `rhino-arm-3` replaced the fill under each shoulder, and no probe
            measured its down area again (`flap.ts` of `2026-10-22-rhino-arm-2/`: 582 and 654 cm²
            on the old fill). No view shows a flap. Done: the A-pose mesh replaces the copy
            (`2026-10-23-rhino-apose.md`), and so for each item of the tubes and the ball here.
      - [x] Rhino right shoulder: from az90 it shows only as a soft bulge above the arm, because
            the source trunk rises 4.3 cm above the ball (`root3x-az90-e20.webp` of
            `2026-10-22-rhino-arm-3/`). A larger ball widens the footprint.
      - [ ] Rhino footprint: the shoulders widen it 2.1 cm, and the conductor pose of
            boulanger-matin changes from 257.38 s (`body-probe.txt` of `2026-10-22-rhino-arm-3/`).
            Check that the cue of the conductor still aims at the tuba.
      - [x] Rhino tubes: `pnpm frame` gives a GPU p50 of 6.45 ms (5.75 ms on the tip of
            2026-10-21). Compare with the base (`pnpm frame-compare afff590f <tip>`).
      - [ ] Body probe of the panda round: 18 pose sets of other players change at the start of
            brahms-2 and beethoven-9. Find the shared input that the panda rig moves.
- [ ] Tools of a mesh round (retro of the bear mesh round, 2026-10-22):
      - Let `pnpm close-views` use the build again when the tree hash is the same, and take more
        than one `--glb` in one run, each variant into its own folder. The bear round made about
        20 renders, and each one built the site first (60 s to 90 s): about 25 minutes.
      - Let `--at` of `pnpm close-views play` and `--views` of `pnpm arm-check` take the
        conductor (`--at conductor` aims at the podium). The bear round wrote a JSON camera and
        its own crop and strip scripts, and lost a set of 8 strips: about 20 minutes.
- [ ] Tools of a mesh round (retro of the rounds of the night of 2026-10-28):
      - Give `pnpm close-views play` the `--glb` option of the role mode, so that a rig variant
        renders at the camera of a user image with no swap of the rig and the module in the tree.
        The polar legs, polar wrist, hippo, and fox and rabbit rounds each asked for it: each
        swap blocked the probes of `main` for 6 to 8 minutes.
      - Let `--set` change `PIANO_SCALE` and `PIANO_FRONT_H` in memory, as it does for the hold
        values (polar legs round: the scans edited `src/` with perl).
      - Save the crease probe of the fox and rabbit round (`probes/crease.ts`, about 30 s for
        each try) and the loop and non-manifold check of the cat wall round (`body-loops.ts`,
        `glb_nm.py`, about 2 s) as repository tools with `--base`.
      - Let `pnpm arm-check` print the bind bend of each paw beside the paw swing: a straight
        paw read as a 25° bend in the hippo arm round.
- [ ] Tools of a mesh edit (retro of the arm form rounds 3 and 4, 2026-10-21):
      - Add `pnpm arm-variants <animal> --edit <script> --opts <json>...`. For each option set,
        it makes the copy, rigs it with `rig-mesh --check --keep`, runs `pnpm studio-body`, and
        prints one row: the section, the crease, the folds of each set, the stretch p95, the
        flat p5, the area that faces down, and the faces that the shapes leave turned. Add the
        depth of the upper arms in the body (`pose-depth --glb --every 4`) and the elbow rings:
        the rabbit elbow round found a depth of 5.9 cm only at its end (retro, 2026-10-22).
      - Save `elbow-look.ts` of `docs/research/2026-10-21-rabbit-elbow/` as `pnpm elbow-look`.
      - Add `pnpm arm-look --explain section`: the ring points, their weights, and the posed
        section of the worst sample, for the base and the tree. The rabbit elbow round spent
        about 45 minutes on the cause of a section drop.
      - Add `--no-shadows` to `pnpm close-views`, and save `round4/shade-probe.ts` of
        `docs/research/2026-10-21-arm-form/` as `pnpm shade-probe`. Then add a trap: a dark patch
        from one side renders with `--no-shadows` first, and `shade-probe` maps its largest face
        to source vertices through `s` of `<name>.corners.json`.
- [ ] Check with the user the slurs that the bow plan infers from the MIDI files (21% to 38% of the
      notes) (`2026-10-17-bow-arm.md`).
- [x] Sway of a fast notated beat: the file of the user notates a ballad at 241 BPM in 4/4, and
      the sway changed its side each 0.25 s. A fast 4/x is now conducted in 2 or in 1, and the
      sway follows the felt pulse of the song (`2026-10-21-beat-fold.md`, `pnpm beat-rates`).
- [ ] Beat fold limits: no source gives the tempo at which a conductor goes from 4 to 2. The app
      uses 168 for 4/x as for 2/x and 3/x. Ask the user, or find a conducting text with a tempo
      (`docs/research/2026-10-21-beat-fold.md`, section 4).
- [ ] Felt pulse of the demos: the sway of `beethoven-9`, `boulanger-matin`, `brahms-2`, and
      `mozart-k525` now takes 2 beats a side. Show the user the change. The measured sideways
      sway locks to the bar also at 89 BPM, so a lower `PULSE_TEMPO` would follow the source more
      closely and change more demos.
- [ ] Fast `generic` bars: the last bar of 7/8 of `bach-bwv1048` is conducted at 200 beats for
      each minute for 1.5 s, and the count-in beat of its first bar of 1/8 is 0.3 s. A fold needs
      an uneven grouping, such as 2+2+3.
- [ ] Sway at the song end: the sway stops at the last pulse, so the file of the user does not
      sway in its last 0.5 s. The base stopped at the last beat.
- [ ] `docs/agents/commands.md` has 4,740 words, above its limit of about 3,000. Cut it in a
      prose pass.
- [ ] Tools of a rig round (retro of the fifth review, 2026-10-27):
      - Mark in red the pixels of `close-views --sheet` that change by more than 40 between the
        base and the round. The elephant round looked through 12 wide sheets by eye.
      - Save the Blender variant runner of `docs/research/2026-10-26-fifth-deer/probes/`
        (`variant.py`, `variants.sh`), or fold it into `pnpm arm-variants` above. The variant
        loop was most of the deer round.
      - Let `pnpm rig-mesh --check --keep` run `pnpm arm-check --glb` on each kept variant in
        parallel jobs. The deer round ran them one after the other, 1 to 2 minutes each.
      - Add the forearm turn from a neutral forearm (bind and pose) as a column of
        `pnpm arm-check`. The bind-relative paw twist hid the bind offset of the rhino
        (`docs/research/2026-10-26-fifth-rhino/probes/forearm-turn.ts`).
      - Print the edges that pass through the skin and the hard edges near each knee in
        `pnpm rig-mesh --check` (`crossings.py` and `hard_edges.py` of
        `docs/research/2026-10-26-fifth-bears/`).
      - Give `pnpm carry-check` a cache of the working tree, as `pose-depth` has. Each run
        takes about 44 s now.
      - Keep the base frames of `close-views play --base` in a cache, keyed by the tree hash,
        the camera, the time, and the size. The legs round rendered `main` again for each
        variant, about 3 minutes for each 20 frames.
      - Let `pnpm pose-depth` print, for each body, only the pairs that differ between its
        `--set` rows. The violin carry round wrote a parser to compare its variants.
      - Give `pnpm pose-depth` an option `--sets lift,lower`, as `pnpm hold-fit` has. A wrist
        via changes only the moves, and the violin unwind round swept the play with each row
        (about 90 s of each row of 4 demos, with `--every 20` about 40 s).

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
      A failure after the load gets the new text "An error stopped the music. Try again." (a row
      in a decision file, `docs/decisions/`).
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
- [x] Measure each demo with `pnpm loudness`, refresh `DEMO_LOUDNESS`, raise the target to
      -16 LUFS, and lower the limiter to -3 dBFS (user, 2026-10-21, 6.8). Seven newer demos
      played 1.0 to 7.8 LU too loud. `research/2026-10-21-demo-loudness.md` gives the measures.
- [ ] Decide the range rule of the soft demos with the user (6.8). Beethoven 8 keeps 58 % of
      its time below -30 LUFS short-term. Research section 6 proposes a velocity curve of
      `30 log10(v / 127)` for the demos only.
- [ ] Run `pnpm loudness --check` after each change of a demo file, the SoundFont, the mix, the
      hall, or the limiter, until a check of CI or of the merge runs it (6.8).
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

- [ ] Show the user the seat rings during play, and ask if the pulse of fast short notes is
      correct (2.8). The cellos of Beethoven 8 mvt 4 at 30 s dip from the level 0.88 to 0.35
      between notes 0.36 s apart. A tutti turns on each ring, so the rings then show no lead.
- [ ] Check the seat rings in Safari, in Firefox, and on a real phone (2.8). The round of
      2026-10-21 checked them only in headless Chromium.

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
- [x] Give a portrait viewport a lower and more frontal default view and wide shots (user
      decision of 2026-10-06, UX audit SC8, design 4.5).
- [x] Seat the soloist of a concerto at the front left of the conductor (user decision of
      2026-10-06, UX audit AM3, design 3.8, 4.2, 4.5).
- [x] Give a chamber group of at most 5 players no conductor and no podium (user decision of
      2026-10-06, UX audit 2 N9, design 4.2, 4.5, 5.4, 5.6). The players sit in a small arc at
      the stage center. The leader gives the count-in, and the shots have no conductor shot.
- [ ] The review of 9.8: frames of each kind of shot of each demo at both sizes, and the GIF.

Done when: the tests of 5.6 pass for each demo, the shot targets and the frame target of 9.7
pass, and the smoke test checks the camera.

Review:

## Step 8. Polished look (1, 2.5, 2.8, 4.1 to 4.6, 5.6)

The user added `docs/reference/mockup.png` and `docs/reference/scene.png` on 2026-10-06 and asked
for a result that is as close to them as possible (design 1). The navigation menu at the top of
the mockup is out of scope.

- [ ] Scene look: the hall with warm lights out of focus, the visible beam, the glossy stage,
      the lights, and the post effects (bloom, depth of field, vignette, grain, color grade).
- [ ] Camera: the default view and the shots of `scene.png`.
- [ ] Cast: the faceted animals and the instruments of `scene.png`.
- [ ] UI: the title, the panel, the demo rows, the seat rows, and the bar of `mockup.png`.
- [x] Make the shot planner stable against small changes of the player footprints, then
      restore the horn entry test of `shots/prepare.test.ts` to the cut at the entry, and
      restore the bound 0.15 of the neighbor-length test. A change of 1 to 2 cm moved the first
      horn shot of seed 4 from 24 s to 30 s, and gave Boulanger 5 equal neighbor lengths of 30
      (cast branch, 2026-10-06).
- [ ] Turn the conductor to the audience for the bow at the song end. Now it bows to the
      players. A conductor turns around on the podium, bows to the audience, and turns back
      (user request of 2026-10-07, design 5.4). Keep the clearance tests of the stand.
- [ ] Audit the seating algorithm of design 4.2 against the seating of professional orchestras
      and choirs, with sources: the place of each section, the desks, the rows, the risers, the
      soloist, the chamber groups, and the choir. Write the audit in `docs/audits/` with the
      file and the line of each finding, then fix the findings that the user approves (user
      request of 2026-10-07).
- [x] Move the spotlight to the soloed seat: when the user turns on "S" (solo) for one or more
      seats, the key light and its pool move to light the players of those seats, and they move
      back when no seat is soloed (user request of 2026-10-07, design 2.4 and 4.5). Keep the
      rule "Stateless poses": the light comes only from the solo state, and no timer moves it.
- [x] Make the bottom of the first spotlight wider: the pool of the key light on the stage, as
      the user sees it on the first screen (user request of 2026-10-07, design 4.5).
- [x] Shorten the arms of the bear (the conductor), as the user asked on 2026-10-07. Keep the
      conductor clearance and view tests and the beat pattern of design 5.4.
- [x] Let the automatic camera film the player who just started to play: when a section or a
      soloist enters, the next cut goes to it (user request of 2026-10-07, design 5.6). Check
      the rules of the shot planner that already favor entries, and its stability tests.
- [ ] Bring the high tier back within the frame target of 9.7. On 2026-10-13, `pnpm frame` gave
      a GPU p95 of 4.76 ms and a main-thread p95 of 4.6 to 4.9 ms. The target is at most 4 ms
      for each. The post effects of this step caused most of the GPU time
      (`docs/research/2026-10-13-frame-time.md`, section 10). Each option below has one run at a
      load of about 7. Measure it again at a low load before a choice.
      - Cut the JavaScript of each frame by about 0.7 ms, with the same pixels.
      - Find the geometry pass of about 0.64 ms after the scene pass. The fix round did not find
        its code.
      - a. The depth of field reads the depth of the beam: GPU p95 4.38 ms. A rim of 1 to 2
        pixels shows on the back-row heads, only in shots with the depth of field. The main
        thread also gets faster.
      - b. MSAA with 2 samples in place of 4: GPU p95 4.20 ms. Thin lines show more steps.
      - c. The two side spotlights become directional lights: GPU p95 4.63 ms. The stage corners
        get brighter, and the pool of light gets flatter.
      - d. The high tier renders at the device scale 1.5 in place of 2: GPU p95 3.13 ms. The
        whole image is softer. Only this option passes the target alone.
      - a and b together: GPU p95 4.28 ms.
      - A new target of 5 ms for the high tier, with a change of design 9.7.
      The image `docs/research/2026-10-13-frame-time/options.webp` shows each option beside the
      current frame.
      Waits for the user: on 2026-10-13, the user asked to record these options and to choose
      no path yet.
      2026-10-21: the cuts with the same pixels of `docs/research/2026-10-21-frame-performance.md`
      took the main-thread p95 from 8.83 ms to 4.74 ms and the GPU p95 from 6.80 ms to 5.89 ms.
      Its section 6 measures the options again on the new code, with an image of each one in its
      folder `options/`. Only the device scale 1.5 passes the GPU target alone (4.06 ms).
- [ ] Skin the players one time in each frame. Each pass of a frame skins them again in its vertex
      shader: 0.2 ms to 0.5 ms of GPU time for each shadow map and each depth pass
      (`docs/research/2026-10-21-frame-performance.md`, section 8). The pixels must stay the same.
- [ ] Cut `poseStudioBones()`: about 0.5 ms of each frame for the 55 studio bodies of
      `perf-60.mid`, the largest part of the main thread after the round `perf-frame`.
- [ ] Compile the shaders before the first frame, for example with `compileAsync()`, with the same
      first frame: `setProgram()` took 381 ms from the load to 2 s after play
      (`docs/research/2026-10-21-frame-performance/logs/load-tip.txt`, found by the round
      `perf-load`).
- [ ] 6 of the 13 tests of the paused file `scene/player.test.ts` fail on `main` (found by the round
      `perf-frame`). Fix them when the pause of the tests ends.
- [x] Cinematic light, steps P0 to P2 of `docs/research/2026-10-17-cinematic-lighting.md` (user
      request of 2026-10-17, design 4.5): the look lab (`pnpm look-lab`), the band-limited grain
      and the planks, the lacquer and the lighter walnut, the grade of a 3D lookup table, and the
      bake of the static props. Measures: `docs/research/2026-10-18-cinematic-light.md`.
- [x] Cinematic light, step P3: capture the hall and the lit stage as the environment of each
      layout (D3, approved on 2026-10-17, user "do it" on 2026-10-18). The bounce term of the plan
      waits, because the back of the conductor reached a luma of 50 against 52 in the reference.
      The floor in front of the podium is at a luma p90 / p5 of 5.6 against 4.7.
- [x] Cinematic light, step P4: the light of each shot kind, the diffusion, the halation, the
      vignette of each shot, and the room haze (D4 and D5, approved on 2026-10-17, user "yes" on
      2026-10-18). The chromatic shift is left out. Measures:
      `docs/research/2026-10-18-shot-light-lens-haze.md`.
- [x] Measure the frame cost of the cinematic light (user "do it" on 2026-10-18,
      `docs/research/2026-10-18-light-frame-cost.md`). It adds about 1.1 ms of GPU time in each
      frame of `perf-60.mid` on the high tier (4.75 ms to 5.86 ms): the shot light 0.45 ms, the
      bake step 0.42 ms, the floor and the grade 0.16 ms, the haze 0.08 ms, and the lens 0.06 ms.
      The main thread does not change.
- [x] Measure the GPU row of the frame target again with the Metal trace. On 2026-10-18,
      `xctrace` could not connect to DTServiceHub, so `pnpm frame` ran with `--no-metal`.
      Done on 2026-10-21: after a restart of the Mac, `pnpm frame` runs with the Metal trace again
      (`docs/research/2026-10-21-frame-performance.md`, section 2).
- [x] Cut the cost of the shot light (user "do 2" on 2026-10-18): a diffuse term of the material
      of the players and the props in place of two spotlights saves 0.44 ms in each frame.
- [ ] Cut the rest of the frame cost of the cinematic light in the performance sweep: about
      0.67 ms in each frame of `perf-60.mid`. The bake step costs 0.42 ms, with 20 shadow samples
      of the baked stage in place of 12.
- [ ] The glow of the haze around the beam is weaker than in `orchestra-latest.png`: the hall
      above the stage has a luma p90 of 26 against 49 in the camera `orchestra`, after the fan of
      the beam. Free mode dims the beam there, as in a close shot.
- [ ] Give the players the shadows of the props on their bodies again, such as the shadow of a
      chair seat on the shins. The bake took the props out of the shadow map.
- [ ] The white fur of the rabbit is a little more yellow than in `orchestra-latest.png`: a hue
      of 26° against 19°, and a saturation of 0.32 against 0.30 (`pnpm look-lab`, after the warm
      white side lights).
- [x] Give the bodies a shade side and shadows (user, 2026-10-18: "no shadow on the animals. They
      look plain, over-exposed, low-contrast"). The side lights stand higher with narrow cones, so
      each lights only the far section, and they cast the shadows of the players on the players.
      The players take 0.6 of the fill light. Measures: `docs/research/2026-10-18-body-shade.md`.
- [x] Steps 1 to 4 of the compare with `orchestra-latest.png` (user "do 1-4" on 2026-10-18): warm
      white side lights and a neutral fill, an amber wood of finer planks, honey chairs, softer and
      lighter floor shadows, and a brighter haze and beam. Measures:
      `docs/research/2026-10-18-light-color.md`.
- [x] The key light far at the back right and the beam as its fan (user "do your recommendation"
      on 2026-10-18): parallel shadows to the front left, as in `orchestra-latest.png`, and a beam
      that comes from the key light. Measures: `docs/research/2026-10-18-key-beam.md`.
- [ ] The chairs have a lit saturation of 0.52 against 0.65 in `orchestra-latest.png`, and the
      stage of the camera `orchestra` a median luma of 130 against 107 outside the pool of light.
- [ ] A cool fill (`#282c34`) against the warm keys waits for the user: it makes the shade of the
      white fur a little grayer (`docs/research/2026-10-18-key-beam.md`).
- [x] Measure the back rows after the far key light, and light them when they stay too dark
      (user "do it" on 2026-10-18, after "the back rows of the stage are too dark"): two back-row
      lights from the front corners, and a pool that reaches far toward the back on the players.
      Measures: `docs/research/2026-10-18-back-light.md`.
- [x] Make the stage less exposed and more cinematic (user, 2026-10-21: "the scene seems to be
      over-exposed?", variant B): the exposure 0.7, a soft shoulder of the grade curve, a pool
      narrower than the stage, darker planks, a stronger beam, less fill on the floor, softer
      shadows of the players, and back-row lights of 2.9 lux. No channel of the lit floor clips.
      Measures: `docs/research/2026-10-21-stage-exposure.md`.
- [ ] The lit floor in the pool is darker than in `orchestra-latest.png` after variant B: a luma
      of 152 against 179 in the user view, and 119 against 191 left of the podium in the camera
      `orchestra`. Ask the user if the planks should go back to their color, with the narrow pool.
      2026-10-27: the hot spot of the front key light on the podium gives 138 and 133 beside the
      podium, against 191 and 158 (`docs/research/2026-10-27-key-look.md`).
- [ ] The white fur of the back rows has 0.92 of the p90 of the front rows, against 0.98 in
      `orchestra-latest.png` (`pnpm look-lab`, camera `default`).
- [ ] The chair mask of the look lab ("chair, front left") holds 4 pixels after the lower
      exposure, because its luma limit is 90 (`LOOK_REGIONS` of `tools/look-lab.ts`).
- [ ] The hot spot of the key light also multiplies the side lights on the high and medium tiers,
      because they cast shadows there (`SPOT_POOL_GLSL` of `scene/light-pool.ts`). There, the first
      row gets about 1.3 times the light of the low tier, and the back row only 0.63 to 0.77 of the
      first row (`docs/research/2026-10-18-back-light.md`). A hot spot on the key light alone dims
      the front rows of the high tier.
      2026-10-27: the players take a hot spot of 0.3 of its radii, on the podium alone, and the
      side lights give 0.5 lux (`docs/research/2026-10-27-key-front.md`).
- [ ] The floor at the back of the stage has a luma p50 of 52, against 39 before the back-row
      lights and 41 in `orchestra-latest.png` (`docs/research/2026-10-18-back-light.md`).
- [ ] Measure the frame cost of the two back-row lights in the performance sweep: two more
      spotlights in the light loop of each pixel of the players, the props, and the stage.
- [ ] Cut the frame cost of the shadows of the side lights in the performance sweep: about 0.9 ms
      of GPU time and 0.4 ms of main-thread time in each frame of `perf-60.mid` on the high tier.
      Options: smaller maps, or a new map only every second frame.
      2026-10-21: maps of 512 save only 0.07 ms of the GPU p95, because the vertex work of the
      skinned players is the cost (`docs/research/2026-10-21-frame-performance.md`, section 6).
- [x] Move the key light to the front (user, 2026-10-27: "make the key light go from front to
      back"): 35° left of the front axis and 60° high, with the shadows to the back right, weaker
      side and back-row lights, and a rim light behind the stage that motivates the beam, the
      room haze, and the floor gloss. Measures: `docs/research/2026-10-27-key-front.md`.
- [x] Pick the beams and the height of the key light from `variants.webp` of
      `docs/research/2026-10-27-key-front/`. The manager chose one beam and the key light at 60°
      (2026-10-28), because each reference image has one beam and the shadows show beside the
      players in both user views (rows of `docs/decisions/2026-10-27-key-front.md`). The user
      asked for no questions, and can reverse it: no beam, three beams, 72°, or 45°.
- [x] The front key light lights the faces of the front rows: the rabbit close shot clips a channel
      on 5.3% of its light fur, against 2.4% on the key light from behind (`clip.txt` of
      `docs/research/2026-10-27-key-front/`). The wide views clip as before.
      2026-10-27: the soft key and the extra exposure of a close shot take the shade share of the
      key light, and the key light gives 5.8 lux: the rabbit shot clips 2.0%, and the wide views
      1.7% and 2.8% (`docs/research/2026-10-27-key-look.md`).
- [x] Give the lit floor and the back of the conductor at least their light with the key light
      from behind (110 and 106 against 118 and 131, 36 against 43): the hot spot of the key light
      on the podium has a boost of 2.5, and a solo keeps 0.85. The floor has 138 and 133, and the
      conductor 52 (`docs/research/2026-10-27-key-look.md`).
- [ ] The polar bear close shot clips a channel on 0.6% of its light fur, against 0.1% with the key
      light from behind: the camera stands behind the pianist, and the key light and the kicker
      light the tops of its shoulders and arms (`docs/research/2026-10-27-key-look.md`).
- [ ] The paused test "goes into the material of the players only with a pool" of
      `src/scene/light-pool.test.ts` fails on `main`: its test shader has no
      `#include <lights_fragment_end>`, which `addPlayerFill()` of `scene/geometry.ts` needs.
- [ ] The shot planner keeps one upright cone at the stage center (`insideBeam()`). With three
      beams (`RIM_PLACE.count` 3), a camera can stand in a side beam, which draws its back faces.
- [ ] Give `pnpm close-views play` a `--look <JSON>` option that starts its own dev server, as
      `look-variants` does (retro of the key light round, 2026-10-27). A variant sheet at any
      camera then needs no dev server and no URL script made by hand.
- [ ] Give `pnpm look-variants` a `--shots <subjects>` option that renders the close shot of each
      variant on its own dev server and prints the clip measure of `clip.py` (retro of the round
      `sixth-key-look`, 2026-10-27). That round used `shot-variants.sh` of
      `docs/research/2026-10-27-key-look/`, made by hand, for six runs.
- [ ] Find the reads of the look roots at the load of a module with a saved check. Today
      `LOAD_TIME_PATHS` of `scene/look-values.ts` lists them by hand, so a new read at load gives
      an override with no effect and no error (`docs/decisions/2026-10-18-look-tools.md`).
- [x] Add a lens flare from the bloom levels (user "do it" on 2026-10-20). The user then asked
      to revert it on the same day. The report `docs/research/2026-10-20-lens-flare.md` keeps
      the measures.
- [ ] Fetch the presets of the default demo before the first frame (round `perf-load`,
      `docs/research/2026-10-21-load-performance.md`). On the Fast 4G phone run, the link is idle
      for about 4.8 s while the main thread builds the scene, and the presets then take about
      10 s. AGENTS.md loads the SoundFont files after the first frame, so this needs the user.
      The fetches must start before the score build: a fetch after it waits for the 2.8 s task.
- [ ] Move the layout, the pose plan, and the geometry of the players off the main thread of the
      first frame, into a Worker or into the build: about 680 ms of the 740 ms task of the
      default demo on the development Mac, and about 2.8 s on the phone run.
- [ ] Remove the CPU skin of each player in the first frame: `SkinnedMesh.computeBoundingSphere()`
      takes about 138 ms on the development Mac, for the depth sort of three.js. The owner of the
      render loop decides, because a new sphere can change the draw order.
- [ ] Compile the shaders of the stage without a block of the first frame (`compileAsync()`): about
      335 ms of `setProgram()` in the first frame of the default demo on the development Mac.
- [ ] Encode the hall impulse response as FLAC: about 177 KB in place of 480,044 B, if GitHub
      Pages sends a WAV file with no gzip. Check `decodeAudioData()` in Chrome, Firefox, and
      Safari against the samples of the WAV file first.
- [ ] Decide on a service worker for the repeat visits (round `perf-load`). It saves the
      revalidation of each file after the 600 s of `max-age` of GitHub Pages, and a new fetch of
      an SF3 file that the HTTP cache dropped.

Done when: the screenshots of design 9.8 look like `mockup.png` and `scene.png`, the size check
passes, and the quality tiers of 2.6 keep 60 fps on a laptop.
Review:

## Step 7. Demo build, tests, and deploy (8, 9)

- [x] Put the changed demo files into the site. The default demo is part of the first download
      (7.2). The build already writes them to `dist/demos/` (8.3). The app must load the default
      demo from there.
      Checked on 2026-10-05: `tools/patch-demos.ts` writes the five files into `public/demos/`,
      and `pnpm build` copies them to `dist/demos/`. `demoUrl()` loads each demo from
      `<base>demos/`, and `pnpm size` counts `dist/demos/boulanger-matin.mid` (30,097 B).
- [x] Add the Playwright smoke test (9.3).
- [x] Add Playwright to CI: Chromium blocks a merge, WebKit and Firefox do not (9.2).
      The keyboard check stays out of CI (9.2). The first CI run is the first test on Linux.
- [x] Add the Pages workflow, with the base path of the repository `zoophony` (9.2).
      `pages.yml` deploys after CI passes on `main`. The smoke test passed under `/zoophony/`
      with `vite preview` and with a plain static server (9.2).
- [ ] Ask the user to create the GitHub repository `zoophony`, or to install `gh`. Add the
      remote and push.
      After the first push, the user sets the source of GitHub Pages to "GitHub Actions" in the
      settings of the repository. Then check the first CI run: it is the first run of
      SwiftShader and of the audio of headless Chromium on Linux (9.2).
- [ ] Open the deployed site and play the default demo.
      The site is at `https://<owner>.github.io/zoophony/` after the first Pages run.
- [ ] Add an Open Graph image to `index.html`: a screenshot of the default view, with the
      absolute URL of the deployed site (design 2.8, audit 2026-10-05-ux-design, CP1). A crawler
      needs an absolute URL, and the owner of the site is not known yet.
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
- [x] Stop a few missed frames from dropping the tier on a display at 50 Hz (second re-review of
      step 6, S2). `slowWindow()` (`app/settings.ts`) keeps a tier at 50 fps only if each kept
      interval is in the band. On a 50 Hz display, 5 missed frames in one window of 2 s drop the
      tier. With 1% missed frames at random, the tier drops one step in 16% of the minutes. A
      possible fix: scale the count of missed frames that a window permits to the frame rate.
      Done on 2026-10-21: a capped window permits the share of missed frames of 60 Hz. With 1%
      missed frames, the tier drops in 0.0% of the minutes, against 8.8% before
      (`docs/research/2026-10-21-frame-performance/tier-drop.ts`).
- [ ] Check the FLAC hall in the manual release test of 9.4: in real Safari on macOS and on iOS,
      the network list shows the FLAC file of the hall and no WAV file (round `perf-hall`,
      `docs/research/2026-10-21-load-performance/hall-flac.md`). Playwright WebKit is no Safari.
- [ ] Do the manual release test of 9.4 with the user.
      It needs the deployed site and the real devices of 9.4.

Done when: CI passes on `main` with Playwright in Chromium, and the deployed site plays the
default demo.
