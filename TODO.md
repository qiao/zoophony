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
- [ ] Monkey: from the front, the paws on the valves hide the mouth and the smile while the
      monkey plays, and the right fingers reach the valves from the side, because each paw lies
      along the line from its shoulder (`PAW_TURN`, `2026-10-20-mesh-monkey.md`).
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
- [ ] Rhino: faces 38 and 2413, thin faces at the shoulders above the cut of the seam, and faces 396
      and 727 at the clavicles fold in each sample of the tubist. Count their pixels in a probe
      build, or try rigid weights (`docs/research/2026-10-21-mesh-rhino/fold-probe.txt`).
- [ ] Rhino: with an assumed tuba of 10 kg, the center of mass is 2.7 cm to 3.4 cm in front of the
      middle of the soles, at 59% to 61% of the support depth, at the top of the stable range of
      30% to 60%. A small lean of the trunk back is an option (`balance.txt`).
- [ ] Rhino: the thick left paw goes 2.1 cm into the main branch of the tuba, an accepted depth of
      the sweep. The paws are mittens and do not wrap the tube (`TUBIST_SWEEP`).
- [ ] Trim `docs/agents/model-traps.md` to about 3,000 words: it has 3,964 words since the traps
      of the rhino, the deer, and the penguin meshes, and of the split beak.
- [x] Rig the mesh of the deer (harp). The user gave it on 2026-10-21. The deer sits on the stool
      of the harp with its whole haunch on the seat, at the size of the parametric deer, and plays
      a smaller harp (`2026-10-21-mesh-deer.md`).
- [ ] Deer: the manager chose arms 1.25 and a harp of 0.78 upright in front of the chest while the
      user slept. The user reviews them against the arms 1.15 or 1 of the report "Arms and harp"
      (`docs/research/2026-10-21-mesh-deer.md`).
- [ ] Deer: the harp stands upright, while a real harp leans back on the right shoulder. A tilt back
      put the upper strings into the chest of the short-armed deer (`harp/depths-arms125-a.txt`).
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
- [ ] Deer: dark faces show under the right armpit in the play, and points stand out at the
      shoulders in the back view. Look at the zoomed views of `pnpm close-views harpist`.
- [ ] Deer: 2 to 14 faces of the arms fold in each sample of the harpist, under the limit of the
      arm gate (`app/fold-probe.txt`). A fold round with rings or rigid weights.
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
- [ ] Oboe mouse: the arm skin creases against the mesh in 19.6% and 21.4% of the edges in the
      play, above the limit 14.6% of `pnpm arm-look` (`arm-look-all-main.txt` of the research
      folder of `2026-10-21-arm-form.md`).
- [ ] Elephant: the narrow axis of the middle of each upper arm is 0.32 and 0.35 of the wide axis
      in the play, below the limit 0.44 of `pnpm arm-look`.
- [ ] Beaver: the narrow axis of the middle of each upper arm is 0.40 and 0.35 of the wide axis in
      the play, below the limit 0.44 of `pnpm arm-look`.
- [ ] Rhino: the left arm skin creases in 16.7% of the edges in the play, and the narrow axis of
      the middle of each upper arm is 0.39 and 0.41 of the wide axis, past both limits of
      `pnpm arm-look`.
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
- [ ] Bear size: the skull top of the mesh bear is 9% higher than the skull top of the studio
      bear, and its shoulder joints 3.5% lower, because the mesh has low shoulders under a large
      head. Ask the user if the bear keeps this size (`2026-10-22-mesh-bear.md`).
- [ ] Bear rest: in the rest pose, the arms of the mesh bear hang about 45° out around its belly,
      and the baton points forward at the height of the waist. A conductor at rest holds the
      baton down. Try a rest with the arms nearer to the belly and the baton tip down (5.2).
- [ ] Bear neck: the head turns of the cues fold up to 3 faces at the side of the neck of the mesh
      bear in 3% of the play samples (`fold-probe.txt` of `docs/research/2026-10-22-mesh-bear/`).
- [x] Polar bear mesh: the user gave a polar bear mesh for the pianist on 2026-10-22. It sits at
      the piano at the skull top of the studio polar bear, with arms 1.25 times the mesh
      (`2026-10-22-mesh-polar-bear.md`).
- [x] Polar bear arms: the arms of the mesh reach the keys in front of its round belly only with
      a lean of 35°, so the rig makes them 1.25 times as long. The user chose to keep these arms
      (`2026-10-22-mesh-polar-bear.md`).
- [ ] Polar bear folds: faces of the head, the neck, the right forearm, and the cut of the
      shoulders fold in 52% of the play samples (9.6% on the studio polar bear). The arm gate
      passes. Fit the head line and a shape of the right forearm (`fold.txt` of
      `docs/research/2026-10-22-mesh-polar-bear/`).
- [ ] Polar bear upper arms: the thick upper arms press up to 10 cm into the sides of the round
      belly near the elbows in a play (`PIANIST_SWEEP`). Try a rounder inner side of the upper
      arm in a copy of the mesh, as for the rabbit (`2026-10-22-rabbit-elbow.md`).
- [ ] Polar bear seat (user, 2026-10-22: "also the polar bear's pose is very wrong now"): the mesh
      polar bear does not read as seated. Its legs are near straight, the bench (0.173 m) is a low
      block behind its heels, and the body leans over the keys. Give it a seated pose with the
      haunch on the bench, level thighs, knees near 90° under the key bed, and the soles on the
      floor, at each moment and in the rest pose. The user chose to queue this round.
- [ ] Polar bear rest: in the rest pose, the paws of the mesh polar bear rest on the upper belly,
      higher than a pianist before a performance. Lower lap places fold 9 faces at rest
      (`scans/rest-lap.txt` of `docs/research/2026-10-22-mesh-polar-bear/`).
- [ ] Polar bear tail: from behind, the short tail of the seated mesh polar bear shows a light
      jagged facet on its lower side in the play strip (`strip-az180.webp` of
      `docs/research/2026-10-22-mesh-polar-bear/`). Round it in a copy of the mesh.
- [x] Bear armpit: the user wrote "the bear has deformed meshes under the arm". The free arm
      takes the back strip of each arm root (`2026-10-22-bear-armpit.md`).
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
- [ ] Cat violist: the left forearm goes 1.5 cm into the viola in the play (2.5 cm before the tilt
      of `2026-10-20-cat-left-arm.md`). The user decides if the viola moves forward and the paw
      loses the nut (`2026-10-17-cat-hand.md`).
- [ ] Cat violist: in the 5th position, the left wrist under the neck keeps a twisted band, as on
      `main` before the tilt (`2026-10-20-cat-left-arm.md`).
- [ ] Cat violist: the left wrist bends about 30° from the forearm in the low positions, where a
      real violist keeps it straight. The manager accepts the crops and the grip entry of the arm
      gate, or the user chooses a smaller viola (`2026-10-20-cat-left-arm.md`).
- [ ] Cat violist: the play forearm twist of the arm gate grew from 32° to 49° with the tilt of
      the left paw, below the limit of 80°. Find its cause in the crops (`2026-10-20-cat-left-arm.md`).
- [ ] Cat violist: play and lift folds 1.3 and 1.4 points over the limit since the slim arms
      (`2026-10-17-cat-look.md`).
- [ ] Red fox: the bow grip is 2.2 cm from the middle of the paw for the standing soloist
      (`2026-10-17-grip-all.md`).
- [ ] Tan fox: the flute end is 4.3 cm above the leg, and the left inner elbow goes 1.9 cm into the
      trunk at rest (`2026-10-17-tan-rest.md`).
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
- [ ] Hippo bassist: the skin folds in 9.5% of the play samples (the lift and the rest in none):
      the pizzicato of `boulanger-matin` (4.7%), faces 258 and 442 of the right shoulder (2.6%,
      2.0%), and the left clavicle (1.5%). In pizzicato, the paw turns about 134° on the forearm,
      and a shape of the bent wrist moved the folds to faces 434 and 436. Try a pizzicato that
      keeps the arm of the bow (`refit-hippo-rigs.txt` of `docs/research/2026-10-19-arm-skin/`).
- [ ] Hippo bassist: the shoulder ring of the bow arm keeps a flat share of 0.68 (goal 0.80), and
      8 shoulder faces stretch more than 1.8 times (`pnpm arm-shape bassist`). The renders show no
      flat band. One shape of `raise` is free (`2026-10-19-arm-skin.md`).
- [ ] Hippo bassist: with the forward elbow, the right forearm goes 1.2 cm deeper into the body in
      the lift and 1.8 cm in the lowering (`refit-hippo-depths.txt`). Fit `restPoleR` or the via
      of the rest bow, and count the roll jumps of the bow paw again (`2026-10-18-hippo-arm.md`).
- [x] Hippo bassist: the dark slot at the front of the right armpit is the shading of the cut
      caps, whose normals point away from the light. Done: the caps of the arm take the normals
      of the skin around them, also on the elephant and the beaver (`2026-10-19-cut-caps.md`).
- [ ] Hippo bassist: the 50° shoulder turn squeezes faces 114 to 116 and 238 to light slivers.
      Rigid weights and a ring at the shoulder fold more, and a turn of 45° or 48° keeps their
      mean creases above 60° (`docs/research/2026-10-19-cut-caps.md`). Try a flip of their long
      edges or a shape that relaxes them.
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
- [ ] Mouse oboe rest: a real oboist rests the oboe on the legs, but the round belly covers the
      short thighs, so the oboe stays in both paws in front of the body at rest
      (`docs/reference/wind-technique.md` 4.2, `2026-10-19-mesh-mouse.md`).
- [ ] Mouse tail: the loop of the long tail lies on the floor behind the mouse, and the footprint
      is 0.764 m deep. The stages of the demos with oboes are 2.1% to 6.3% smaller
      than with the large mouse, about the stages of the parametric mouse. Check the tail between
      the rows of the stage with the user (`2026-10-19-mouse-size.md`).
- [ ] Mouse haunch: with no chair, the haunch hangs 0.076 m above the floor behind the heels,
      and in the low side view of the play it seems to float a little
      (`chair-species-play-views.webp` of `docs/research/2026-10-19-mouse-size/`). Show the user
      the side view, and offer a lower haunch or the heels further back, with a rig round of the
      legs (`2026-10-19-mouse-size.md`).
- [ ] Mouse oboe size: the mouse plays an oboe of 0.62 of the oboe of the app (0.34 m). No source
      gives the size of a smaller oboe for a child (`docs/reference/wind-technique.md` 4.2). Show
      the user the play frame with the small oboe (`2026-10-19-mouse-size.md`).
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
- [ ] Elephant timpanist arms after the refit: the long thin faces at the front of the right
      armpit shade dark. From the front, the bent left elbow shows a sharp corner, and the cut a
      dark slot at the top of the left upper arm (`arms.webp` of
      `docs/research/2026-10-19-arm-skin/elephant/`).
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
- [ ] Elephant timpanist: the third shape of `raise` (the bent right wrist with the mallet up)
      has no pose near its rule since the new grip. Remove it, or fit it to another fold
      (`tools/mesh-rigs/elephant.json`).
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
- [ ] Badger xylophone: the short arms reach at most 85% of the xylophone strikes, because the
      body does not move from side to side behind the notes. Ask the user for a smaller
      xylophone, longer arms, or a side step of the body (`2026-10-20-mesh-badger.md`).
- [ ] Badger xylophone mallets: between strikes, each head swings in to the rest direction of the
      snare grip, so two heads on near bars can meet. The offsets and the repeat rule of
      `2026-10-21-pirates-clip.md` leave a touch in 1% of the samples of the steel drum part of the
      pirates file. A rest direction of 0 removes it, but turns the accepted grip by 36°: show the
      user the crops, and update `ACCEPTED_GRIPS` if the user accepts.
- [ ] Badger xylophone reach: the left arm misses its bars by 38 mm (median) on the steel drum part
      of the pirates file, and the forearms go 3.5 cm into the body in 11% of the play samples
      (`docs/research/2026-10-21-pirates-clip.md`). This waits for the xylophone task above.
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
- [ ] Left paw of the violins and of the viola: in each lift and lowering, the paw twist passes
      180° on the forearm, and the twist bone jumps by 180° in one frame, because the rest twist
      (-122° on the rabbit) and the play twist (137°) lie on the two sides of 180°. Fix the rest
      grip on the neck, so that its twist lies on the side of the play twist, and show the user
      the rest views (`2026-10-21-wrist-lift.md`).
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
- [ ] Tools of a mesh round (retro of the bear mesh round, 2026-10-22):
      - Let `pnpm close-views` use the build again when the tree hash is the same, and take more
        than one `--glb` in one run, each variant into its own folder. The bear round made about
        20 renders, and each one built the site first (60 s to 90 s): about 25 minutes.
      - Let `--at` of `pnpm close-views play` and `--views` of `pnpm arm-check` take the
        conductor (`--at conductor` aims at the podium). The bear round wrote a JSON camera and
        its own crop and strip scripts, and lost a set of 8 strips: about 20 minutes.
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
- [ ] `docs/agents/commands.md` has 3,385 words, above its limit of about 3,000. Cut it in a
      prose pass.

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
- [ ] The white fur of the back rows has 0.92 of the p90 of the front rows, against 0.98 in
      `orchestra-latest.png` (`pnpm look-lab`, camera `default`).
- [ ] The chair mask of the look lab ("chair, front left") holds 4 pixels after the lower
      exposure, because its luma limit is 90 (`LOOK_REGIONS` of `tools/look-lab.ts`).
- [ ] The hot spot of the key light also multiplies the side lights on the high and medium tiers,
      because they cast shadows there (`SPOT_POOL_GLSL` of `scene/light-pool.ts`). There, the first
      row gets about 1.3 times the light of the low tier, and the back row only 0.63 to 0.77 of the
      first row (`docs/research/2026-10-18-back-light.md`). A hot spot on the key light alone dims
      the front rows of the high tier.
- [ ] The floor at the back of the stage has a luma p50 of 52, against 39 before the back-row
      lights and 41 in `orchestra-latest.png` (`docs/research/2026-10-18-back-light.md`).
- [ ] Measure the frame cost of the two back-row lights in the performance sweep: two more
      spotlights in the light loop of each pixel of the players, the props, and the stage.
- [ ] Cut the frame cost of the shadows of the side lights in the performance sweep: about 0.9 ms
      of GPU time and 0.4 ms of main-thread time in each frame of `perf-60.mid` on the high tier.
      Options: smaller maps, or a new map only every second frame.
      2026-10-21: maps of 512 save only 0.07 ms of the GPU p95, because the vertex work of the
      skinned players is the cost (`docs/research/2026-10-21-frame-performance.md`, section 6).
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
