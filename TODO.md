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

## Step 1. Audio spike (6, 9.5, 9.7)

- [ ] Check the step 1 list of 9.5 in real Safari on macOS, on an idle Mac and with a load.
      Playwright WebKit drops blocks, because its AudioWorklet thread has no real-time priority.
      Blocked: turn on "Allow remote automation" in Safari, and run `sudo safaridriver --enable`.
- [ ] After the Safari check, remove the `volume` command of `processor.ts` and
      `SynthEngine.setVolume()`. The `Player` sets the volume in the output chain (6.4, 6.8).

Done when: the app plays the Beethoven demo to the end in Chrome, Firefox, and Safari on the
development Mac with no dropout.

## Step 2. MIDI and score (3, 8.3, 8.5, 9.7)

- [ ] Ask the user if the audio render target of 9.7 can use a percentile. In Node, the p99.9 of
      a block is at most 0.53 ms, but each run has a few blocks above 1.3 ms.
- [ ] Make the seek chase fit in one block of 2.667 ms. The first seek in the Boulanger demo takes
      about 4 ms. For example, keep the chase state at fixed points of the event list (6.5).

Done when: each rule of section 3 has at least one test that fails without the rule, the demo
tests pass for all demos, and the step 2 targets of 9.7 pass: the score build, the audio
render, and the memory.

## Step 3. Scene and one player (2.5, 2.6, 4.1, 4.5, 4.7)

- [ ] Measure the clock target of 9.7 with the bow.
- [ ] Measure the steps of `currentTime` in Firefox, and smooth `now()` if the bow needs it (6.7).

Done when: the screenshot has the composition of the reference (9.5), and the clock target
passes.

## Step 4. Models and gallery (4.3 to 4.7)

- [ ] Monkey: two thin faces across the wrists (329 and 1090) fold in each sample of the
      trumpeter. Rigid weights and a ring at the wrist move the fold to the next faces. Count their
      pixels in a probe build, or cut the thin faces (`2026-10-20-mesh-monkey.md`).
- [ ] Monkey trumpeter: from the front at the elevation 20, the right paw across the valve tops
      covers the mouth. From the stage camera (elevation 40), the mouth shows. A lower right grip
      or a smaller curl can free the mouth (`2026-10-25-brass-grips.md`).
- [ ] Monkey trumpeter: the right thumb of the mesh points back toward the mouthpiece at the
      height of the valve tops. A real player puts it under the lead pipe between the first and
      the second valve casing (wind-technique 2.1). The thumb has no bone.
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
- [ ] Rhino: the agent chose the stand, the arms of the mesh, the lead pipe, and the hold while the
      user slept. The user reviews them in `docs/research/2026-10-21-mesh-rhino/tubist-base-views.webp`
      and `lineup-base-views.webp` (`2026-10-21-mesh-rhino.md`).
- [ ] Rhino: with an assumed tuba of 10 kg, the center of mass is 2.7 cm to 3.4 cm in front of the
      middle of the soles, at 59% to 61% of the support depth, at the top of the stable range of
      30% to 60%. A small lean of the trunk back is an option (`balance.txt`).
- [ ] Rhino: the thick left paw goes 1.9 cm into the main branch of the tuba, an accepted depth of
      the sweep. The paws are mittens and do not wrap the tube (`TUBIST_SWEEP`).
- [ ] Deer: the manager chose arms 1.25 while the user slept, and the round `harp-lean` chose a
      harp of 0.6 (0.84 m) leaned 12° back onto the right shoulder, on a box of 0.23 m. The user
      reviews the arms against 1.15 or 1 of the report "Arms and harp"
      (`docs/research/2026-10-21-mesh-deer.md`), and the harp size, the lean, and the box
      (`docs/research/2026-10-25-harp-lean.md`, `images/`).
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
- [ ] Deer: a small cream fold of the haunch lies on the seat under the puff tail, with the shadow
      of the tail above it (`seat/zoom-top-carry.webp` of the research folder).
- [ ] Add the chair as an obstacle to the sweeps of the seated roles, with the legs and the haunch as
      parts, as the sweep of the harpist has the stool (`SEATED_PARTS`, `seatSurface()` of
      `pose/test-sweep-roles.ts`). Then add the accepted contact of each haunch.
- [ ] Deer: the user reviews the rebuilt arms of round `fifth-deer` (`user-angle.webp` and
      `arms-e40.webp` of `docs/research/2026-10-26-fifth-deer/`), and the bind upper arm 18° nearer
      to the hanging arm.
- [ ] Deer: the forearms come 2.8 cm into the harp in the play (1.8 cm on `main` before the round
      `fifth-deer`, limit 4.0 cm), and the paw swing of the left arm is 66° (limit 70°).
- [ ] Remove the parametric biped with its ears, snouts, and tails: no species has it since the
      rhino and the deer meshes (`2026-10-21-mesh-rhino.md`, `2026-10-21-mesh-deer.md`).
- [ ] Penguin: the agent chose the size, the flippers of the mesh, the folder place, the bind of
      the upper arms, and the white throat while the user slept. The user reviews them in
      `docs/research/2026-10-21-mesh-penguin/singer-base-views.webp` and `options.md`: option B
      gives flippers 1.25 times as long and the folder at the height of the reference images.
- [ ] Penguin: black wedges from the roots of the flippers show on the white belly under the
      folder, in the front views of `docs/research/2026-10-21-mesh-penguin/singer-base-views.webp`.
- [ ] Penguin: the crease angle 35° is the angle of the other meshes, with no facet probe against
      the penguins of the reference images (`ANIMALS` of `tools/studio-body.ts`).
- [ ] Red fox and rabbit: string planes of 9° and 10°, under the real 17°, because larger angles
      fold the right shoulder. A rig round on the right shoulder (`2026-10-17-bow-arm.md`).
- [ ] Panda: try `weights.armCrease` on each arm that is one solid with the trunk
      (`2026-10-22-elephant-crease.md`). The rabbit and the rhino have A-pose meshes since
      2026-10-23.
- [ ] Beaver: the narrow axis of the middle of each upper arm is 0.40 and 0.35 of the wide axis in
      the play, below the limit 0.44 of `pnpm arm-look`.
- [ ] Pig (T-pose mesh, `2026-10-24-pig-tpose.md`): the trial rig shows a flat slab and a flap
      at the shoulders in the play, and 9 to 14 folded arm faces (limit 8). The pig of `main`
      stays. Ask the user: a ring at each shoulder, or another mesh.
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
- [ ] Polar bear (`2026-10-29-polar-ratio.md`): with the legs of the mesh, the thigh of the
      pedal leg pulls the haunch 2.3 cm into the bench pad in the play (0.1 cm on the base).
      Keys 0.9 H away keep the haunch on the pad, but the left shoulder then folds 22 to 24
      faces (20 on the base, arm gate limit 8 with a margin of 2).
- [ ] Polar bear (`2026-10-29-polar-ratio.md`): the play upper arms go 7.6 cm into the belly
      (limit 4 cm, 8.3 cm on the base). Elbow poles further out, (±1.4, −0.7, 0.4), give 6.6 cm,
      and need the arm gate.
- [ ] Polar bear (`2026-10-29-polar-ratio.md`): the knee crease of the seated bind makes the
      thigh near the knee 0.90 of the mesh by its perimeter (0.97 by its side width). A crease
      that only fills turned 29 faces over. With no calf fair, the back of each knee has 6 more
      edges that turn more than 40° (`out/knee-variants.txt` of the report).
- [ ] Polar bear (`2026-10-29-polar-ratio.md`): with the side lean over 0.3 s, the head still
      moves about 4 cm to each side about two times each second in the fast passages of
      `bach-bwv1050`. A wider window lets the trunk lag, and the upper arms go deeper into the
      belly, so a calmer trunk needs a lean that keeps the reach of the far paw.
- [ ] Polar bear keys (`2026-10-28-piano-keys.md`): with the gaps of 1 mm between the white keys,
      the soft shadow of the paws on the keys is weaker than on `main` in the close views. With
      no gap, it is as on `main`. The cause is not known. The claws stay at the key top and do
      not follow a pressed key down (about 1 cm).
- [ ] Bear (T-pose mesh, `2026-10-23-bear-tpose.md`): at rest, the arms stand out about 35° from
      the body around the wide belly, where the studio bear held its paws at the hips. The
      upper arms go 2.2 cm into the body while the arms move (3.5 cm before the quad arms of
      `2026-10-26-arm-fixes.md`, which remove the long sharp facets of the bent arms).
- [ ] Cat (`2026-10-26-fourth-review.md`): at rest and in the moves, the right upper arm meets the
      round belly 1.7 cm deep near the elbow (limit 1.5). A lower elbow goes deeper, and an elbow
      further out bends the arm as a wing.
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
- [ ] Cat (`2026-10-27-cat-fox.md`): the armpit line at the lower back of each arm root still
      folds a little in the play. The socket of the fox, with no shoulder ring and Blender weights
      on the first ring, tore the arm root open on the cat. Since `2026-10-27-cat3.md`, the faces
      729, 688, and 728 at the right armpit line fold in 9 to 14 more points of the play samples
      (`fold.txt` of `docs/research/2026-10-27-cat3/`).
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
- [ ] Cat (`2026-10-27-cat-lap.md`): the right forearm goes 0.3 cm into the upper belly at
      f 0.6 in one play sample of `brahms-2` (0.4 cm on `main`, limit 1.5 cm). A flat zone from
      0.5 of the trunk line removed it, but the bow upper arm then went 1.53 cm in at the tip.
- [ ] Cat (`2026-10-27-cat-belly.md`): from the back, a dark band in a V lies on the lower back
      above the seat, on `main` too (`belly-back.webp`). Find the faces and the light that make it.
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
- [ ] Tan fox (`2026-10-27-cat-fox2.md`): the left flute paw keeps the move twist of 87° (67°
      before round `sixth-cat-fox`). No left elbow that grasps the flute brings it to 70°.
- [ ] Red fox and tan fox (`2026-10-28-fox-rabbit-crease.md`): at rest, the crook of the right
      elbow keeps a soft fold of the skin, with no hard line, because the linear blend pinches the
      bent inner elbow. The dual quaternion bind folds a bow arm that bends further than the bind.
- [ ] Rabbit (`2026-10-28-fox-rabbit-crease.md`): at rest, a narrow groove runs between the front
      of each upper arm and the trunk, with no hard line. It is the gap of the arm copy, which the
      arm-down shape gives back (`rabbit-arms.glb`). A fill of the gap in the copy can close it.
- [ ] Red fox and tan fox (`2026-10-28-fox-rabbit-crease.md`): thin dark V lines show on the white
      chest under the front key: splits of the normals of the fur spikes of the user mesh, on
      `main` too. Smooth them like the neck notches, or give them the skin normals.
- [ ] Cat (`2026-10-26-fifth-review-strings.md`): the round belly keeps both elbows 35° to 48°
      from the vertical at rest. Lower elbows went 2.2 cm to 4.1 cm into the belly (limit 1.5).
- [ ] Bear (`2026-10-26-fifth-review-bears.md`): in the gallery light, each arm casts a black
      shadow on the trunk under the armpit. The scene light is an open decision of the user.
- [ ] Elephant (`2026-10-27-elephant-bake.md`): in the gallery light, each arm casts a black band
      of shadow on the trunk beside the belly, as on the bear. The probe with no shadow shows the
      skin there (`armpit-probes.webp`). It waits for the same decision of the scene light.
- [ ] Polar bear (`2026-10-27-polar-legs-rebuild.md`): the seated thigh keeps a depth of about
      0.14 units from the haunch to the knee, and the source tapers from 0.183 to 0.148. The
      haunch above the cut keeps its faces. Next: a cut higher on the outer side of the hip,
      with tilted top rings, so that the tube takes the thigh up to the haunch.
- [ ] Polar bear (`2026-10-27-polar-legs-rebuild.md`): 4 edges of the crease of the left instep
      and 4 edges of the cut loop at the crotch turn more than 40° in the bind (89.6° at most).
      The instep crease is a crease of the user mesh. Next: check them in the stage light, and
      give the faces the skin normals if they shade as lines.
- [ ] Polar bench (`2026-10-28-polar-bench2.md`): the forearms and the upper arms go 8.3 cm into
      the belly in the play (6.3 and 6.8 cm before). Next: try the elbows a little further out
      (`poleL`, `poleR` of `HANDS_HOLDS.piano`) with `pnpm pose-depth pianist --base main`.
- [ ] Polar bench (`2026-10-28-polar-bench2.md`): the piano of 1.22 moves rows of the four demos
      with a piano again (`gate-body-probe.txt`). Next: check the default view of `bach-bwv1050`
      and `boulanger-matin`, and show the user the stage with the larger piano.
- [ ] Tails (`2026-10-28-tails.md`): the cat has 4 faces that stay turned over against the bone
      turn after the bind (2 before). No image shows them.
- [ ] Bear wrist (`2026-10-28-followups.md`): a soft notch stays on the top of each wrist at rest,
      and the right wrist still folds in 18,499 play samples. Next: check the paw of the user mesh
      at the cut with a fill light.
- [ ] Rhino T-pose (`2026-10-28-rhino-tpose.md`): the paws go 2.4 cm into the tuba (limit 2.2 cm,
      1.9 cm on the A-pose mesh), and the right arm folds 6 faces at p95 (3 before). Next: a
      thinner round stump at the nails, or a grip that keeps the stump on the outside of the tube.
- [ ] Penguin flank (`2026-10-28-followups.md`): the round bump at the armpit stays a little
      visible from az90. The faces around the flipper with a part of the arm weight stretch when
      the flipper rises. Next: a cut of the flipper from the body with a side wall, as the arm
      copies of route 3.
- [ ] Penguin edge (`2026-10-28-followups.md`): the flippers go 1.3 cm into the body (1.1 cm
      before), and the edge of the orange beak and feet stays uncut. Next: check the flipper roots
      with a fill light.
- [ ] Hippo arm (`2026-10-28-followups.md`): the arm gate gives `FAIL` on the right stretch p95
      (0.22 against 0.16), because the shape shortens an inner elbow edge of the rest sample. The
      left arm on the neck of the bass has no rest shape. Next: check the left arm with a fill
      light, and count the stretch from the bind for a body with a rest shape.
- [ ] Fill light (`2026-10-28-followups.md`): `pnpm close-views play` renders the app with no
      fill light. Next: add a fill to the play mode for the checks.
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
- [ ] Wolf (`2026-10-27-wolf-mouse-rests.md`): the bell of the upright clarinet rests on
      nothing, 22 cm in front of the seat. On the right knee top, the left forearm went 7 cm to
      12 cm into the belly. Next: offer the user the bell on the right knee with the right paw
      alone and the left paw on the left thigh (`restFreeL`), as a real clarinetist rests it.
- [ ] Wolf (`2026-10-27-wolf-mouse-rests.md`): the clarinet axis turns up to 14° in the closed
      left paw over a lift (8° on the rest at the knee). Next: read the left paw crops of the
      lift at 2x, and scan the left rest elbow with `wolf-rest.ts --moves` if it shows.
- [ ] Mouse (`2026-10-27-wolf-mouse-rests.md`): the left paw twists 134° on its forearm at rest,
      and the left palm turns 58° from the oboe (grasp limit 60°), so the rest elbows have
      little room. Next: supinate the bind left paw of the mouse (`studio.bindSupination`), as
      for the wolf, and scan the rest elbows again.
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
- [ ] Hippo stop in pizzicato (`2026-10-28-hippo-grip.md`): in the lowering after a pizzicato,
      the path of the bow from the pluck to the rest turns the forearm up to 79° off its angle in
      the plane of the palm. The bow then turns 79° in the paw in about 0.6 s, and the paw swings
      up to 22° toward the palm. Give this move a path of the bow that keeps the forearm near 45°
      (`liftMix()` and `BowVia` of `pose/bowed.ts`), and follow it with `probes/move-probe.ts` of
      `docs/research/2026-10-28-hippo-grip/`.
- [ ] Rabbit: the largest twist step between two arm bones is 42.1° on the left forearm (target
      25°, 83.7° on `main`), because the left paw asks for about 150° of twist in the play. A
      smaller twist of the hold, or more forearm segments, can lower it (`2026-10-24-violin-arms.md`).
- [ ] Cat: the largest twist step between two arm bones is 40.8° on the left forearm and 26.0° on
      the right upper arm (target 25°), because the left paw twists about 148° in the play
      (`2026-10-25-cat-arms.md`).
- [ ] Cat: the manager decides on the left forearm twist p95 71° of the arm gate (52° on `main`,
      past the margin), as for the rabbit (`2026-10-25-cat-arms.md`).
- [ ] Cat: 11 to 12 hidden faces of the armpit lines turn over in each sample of the fold probe
      (`2026-10-25-cat-arms.md`).
- [ ] Rabbit: the bow goes up to 2.5 cm into the arms in the lowering and 1.0 cm at rest, near the
      grip (`shares.txt` of `2026-10-24-violin-arms/`).
- [ ] Rabbit, red fox, and cat: the forearms and the upper arms go up to 2.1 cm (rabbit), 2.5 cm
      (red fox, 2.4 cm before the middle turn), and 2.5 cm (cat, 2.9 cm before) into the
      instrument in the lift and the lowering (limit 1.5), near the end of the lift
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
- [ ] Elephant: a short light sliver stays at the inner root of the right arm, near the tusk, from
      the front (`2026-10-25-elephant-hippo-creases.md`).
- [ ] Elephant: the right flat p5 of the arm gate is 0.78 at the shoulder ring (0.87 before the
      arm tubes, margin 0.05). The manager decides (`2026-10-25-elephant-arms.md`,
      `2026-10-25-elephant-hippo-creases.md`).
- [ ] Elephant timpanist: between strikes, the heads stay 2 cm to 7 cm above the spots with the
      shafts 15° to 22° down. A real timpanist sets them one inch above the head with a level
      shaft. A larger wrist lift moved the shafts out of the closed paws
      (`2026-10-25-timpani-piano-rest.md`).
- [ ] Pig: the dome of each new upper arm lies inside the shoulder, so `pnpm pose-depth hornist`
      gives the upper arms 4.2 cm in the body in each set (0.5 cm before). Give the sweep an
      accepted depth after the test pause. Small dark facets show at the top of the shoulders.
- [ ] Rabbit: the dark wedge on the chest under the bow arm is the shadow of the arm (4.5).
- [ ] Rabbit: a small dark sliver stays under the right elbow from the right side at the frog
      (2,625 band pixels with no shadows, 740 on `main`, `band-measures.txt` of `round4/`).
- [ ] Rabbit: the section of the right upper arm of `pnpm arm-look` fell from 0.74 to 0.60 with the
      round elbow patch (limit 0.44). Find the cause of the drop of the median, and keep the
      round elbow (`2026-10-22-rabbit-elbow.md`, section 5).
- [ ] Rabbit: "upper arms in body" of `pnpm pose-depth violinist` grows from 0 to 2.5 cm at rest
      and 5.9 cm in the lowering with the round elbow patch (3.3 cm on the red fox). Keep the
      patch out of the trunk when the arm hangs (`2026-10-22-rabbit-elbow.md`, section 5).
- [ ] Rabbit: a dark lower face of the bow elbow shows from azimuth 150 at `lower50` and
      `lift50`, and a thin dark line under the forearm near the elbow from the front at the frog
      (`pairs-*.webp` of `2026-10-22-rabbit-elbow/`).
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
- [ ] Hippo nose: the tip lies on a nostril 2.8 cm from the middle plane, and the rig checks warn.
      A tip on the plane moves the jaw of the rig 3.0 cm up (`2026-10-19-mesh-retro.md`).
- [ ] Mouse eyes: in the front view, the bent pea eyes of the mouse lean in at the top, because
      the surface under them faces 17° to 21° more up than their direction. Try a direction
      between the two for the mouse (`2026-10-20-pea-eyes.md`).
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
- [ ] Bear notch: trunk faces of the notch below the caps of the cut still face down under each
      raised arm, 19 cm² and 23 cm² against 5 cm² on the red fox (`flap-round.txt` of
      `docs/research/2026-10-22-bear-armpit/`). No view shows them.

Done when: the gallery shows each species with its instrument, the budget test passes, and the
scene of each demo has its seats and stage size with no overlap.

## Step 5. Motion (5, 4.7, 9.7)

- [ ] Dog cellist: the left ear touches the cello, the left forearm and paw go 2.1 cm and 1.6 cm
      into it, the right upper arm 2.0 cm into the body, and the bow reach is 69% (goal 70%). A loop
      that moves the cello and rebuilds the left-arm shapes (`2026-10-17-dog-folds.md`).
- [ ] Dog cellist: the knees stay about 21 cm from the leaned cello (`2026-10-17-dog-rest.md`).
- [ ] Cat violist: in the 5th position, the left wrist under the neck keeps a twisted band, as on
      `main` before the tilt (`2026-10-20-cat-left-arm.md`).
- [ ] Cat violist: the left wrist bends about 30° from the forearm in the low positions, where a
      real violist keeps it straight. The manager accepts the crops and the grip entry of the arm
      gate, or the user chooses a smaller viola (`2026-10-20-cat-left-arm.md`).
- [ ] Red fox: the bow grip is 2.2 cm from the middle of the paw for the standing soloist
      (`2026-10-17-grip-all.md`).
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
- [ ] Panda trombonist: the shadow band of the left arm covers 44.6% of the belly box with the left
      shoulder at 15°, against 20.9% at 9°. A turn of 10° folds the left shoulder at this slide
      (`docs/research/2026-10-18-trombone-fit.md`).
- [ ] Panda trombonist: a slide nearer to the front needs a larger forward turn of the right
      shoulder, and a turn of 50° folds faces 86 and 497 in 6.5% of the lift samples. A rule of the
      right shoulder in the panda rig can permit it (`2026-10-18-trombone-fit.md`).
- [ ] Double horn: advanced players use the B♭ side above the written G4, but the app has a single
      F horn. The B♭ side needs a thumb valve and a second fundamental, B♭1
      (`docs/reference/wind-technique.md` 2.2, `2026-10-18-horn-fundamental.md`).
- [ ] The paused shot test of the moves of 2 cm keeps 74.2% of the shots (limit 75%) with the
      standing hippo. It kept 71.8% since the panda mesh, and passed with the hippo on the stool
      (`docs/research/2026-10-18-hippo-mesh/shots-test.log`). The elephant mesh keeps 74.7%
      (`docs/research/2026-10-19-elephant-mesh/shots-test.log`).
- [ ] Panda trombonist: face 467 at the front of the right shoulder folds in 2.2% of the lift
      samples, and the shadow of the left arm crosses the belly in the gallery front view of the
      first position, smaller since the 9° turn (`turn-9.webp`). Show the user the images of
      `docs/research/2026-10-18-panda-folds/` (`2026-10-18-panda-folds.md`).
- [ ] Hippo bassist: the sweep gives the right upper arm root 4.1 cm to 6.1 cm in the body
      (0.0 cm before the rebuilt arms). The flat inner side of the tube lies behind the side
      wall by design and now counts as upper arm. Measure the clip of the visible surface only,
      or give the pair an accepted depth (`2026-10-25-hippo-arms.md`).
- [ ] Hippo bassist: the left paw goes over 1.5 cm into the neck in 27.0% of the play samples
      (0.9% before), at most 1.7 cm, inside the accepted 2.0 cm, while the left forearm passes
      1.5 cm in 1.6% (19.7%): the wrist skin counts as paw now. The left forearm goes 2.1 cm in,
      in 0.1% of the play, and the right upper arm 2.0 cm in 0.4% of the lowering. A light face
      of the texture under the right arm shows from az150 (`2026-10-25-hippo-arms.md`).
- [ ] Hippo bassist: on the E and A strings, the roll of the bow paw stays at its low end, and the
      paw goes more than 1.5 cm into the belly in 4.6% of the play samples. A hold that moves the
      right elbow off the line of the stick, such as the slant -10°, can remove it
      (`2026-10-18-hippo-arm.md`).
- [ ] Hippo bassist: the thick arms go into the body and the contrabass in the play and the
      lowering, the upper arms up to 6.0 cm into the body in the play, and the right upper arm
      4.7 cm into the contrabass in the lowering (2.3 cm before the chest fix). A shoulder turn
      above 50° folds the chest under the chin. Fit the hold further, or accept the depths as
      limits of the sweep (`2026-10-18-mesh-hippo.md`, `2026-10-19-hippo-chest.md`).
- [ ] Hippo bassist: the high notes take lower places on the neck, because the left paw stops
      only up to 0.7 of the fingerboard. Show the user the left hand in a high passage of
      `bach-bwv1050` (`2026-10-21-hippo-bass-arms.md`).
- [ ] Hippo bassist: the bow plays only 0.25 m to 0.415 m of the hair (0.045 m before), so the
      strokes are shorter. Show the user the close views, and offer longer arms or a smaller
      contrabass for longer strokes (`2026-10-21-hippo-bass.md`).
- [ ] Hippo bassist: in the change from the bow to pizzicato at 248.13 s of `boulanger-matin`,
      the right forearm goes 4.2 cm into the right rim of the upper bout for a moment (0.0% of
      the samples). Try a path of the change around the rim (`2026-10-21-hippo-bass-arms.md`).
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
- [ ] The mittens of the wind players close as one block, so no finger lies on a key. The red fox
      on the violin neck has its tips on the neck (`pnpm wind-grip`, `2026-10-25-grips.md`).
- [ ] Wind grips, after the review of the 2x crops of `docs/research/2026-10-25-grips/` and
      `docs/research/2026-10-25-open-grips/` by the manager: write the new entries of
      `ACCEPTED_GRIPS` for the bassoonist, the trombonist, the oboist, and the clarinetist. The
      gate fails their grip turns until then. The trumpeter and the tubist pass with their entries
      since `2026-10-25-brass-grips.md`. The bassoon turns of
      175° and 163° come from the entry of the hold before the palms faced the tube
      (`2026-10-25-open-grips.md`, section 6). After the side grips of the woodwinds, the grip
      turns are oboist 140° and 13°, clarinetist 21° and 6°, and bassoonist 11° and 10°: the
      paws turned back near the grips of 2026-10-24 (`2026-10-25-wind-palms.md`).
- [ ] Wind palms gate: the oboist and the bassoonist grow on the margin against main, inside the
      limits: oboist left paw twist 137° (93°), move twists 137° (93°) and 121° (99°), bassoonist
      left forearm twist 38° (14°), paw twist 135° (57°), paw swing 54° (27°), right rest folds 8
      (4, limit 8). The manager decides (`gate.txt` of `docs/research/2026-10-25-wind-palms/`).
- [ ] Beaver left forearm: each of its two links twists 55.4° in the play (target 25°), because
      the beaver has no arm segments. Only rebuilt arms with segments lower it (see "Beaver
      rebuilt arms", `2026-10-25-wind-elbows.md`).
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
- [ ] Wind thumbs: the mesh thumbs have no bone, so on the left oboe paw and the right bassoon
      paw the thumb tip lies 1.2 cm and 5.0 cm in front of the tube axis. Add the
      thumb measure of `palm-probe.ts` to `pnpm wind-grip`, so that a gate sees the thumb.
- [ ] Rhino and pig paws have no separate digit, so the palm probe gives no thumb for the tuba
      and the horn. Check the horn hold from the images and the technique (`palm-branch.txt`).
      The left tuba palm faced the audience by +0.43. It faces the main branch since
      `2026-10-25-brass-grips.md` (0.90 to the right, -0.06 to the audience).
- [ ] Panda trombone travel: the arm reaches 0.105 m of the slide at 45° to the right, 18% of a
      real seventh position (0.57 m), since the right paw holds the far side of the brace (0.17 m
      before, `2026-10-25-wind-elbows.md`). On the grip before, 60° gave 0.26 m and 90° 0.455 m.
      Show the user the lineup of 45° and 60° (`slide-scan-final.txt` of
      `docs/research/2026-10-25-open-grips/`).
- [ ] Panda trombone: with the play hold at rest, the left finger tips stand 0.7 cm from the slide
      tubes at rest (0.4 cm on 0cfe7ee6, limit 0.6 cm). A rest aim for each paw would keep the left
      paw as before (`2026-10-25-open-grips.md`).
- [ ] Beaver bassoon: the right claws go 1.5 cm into the bassoon in one lowering sample of 30 in
      four demos (`depth-bassoonist.txt` of `docs/research/2026-10-25-grips/`).
- [ ] Badger triangle: the left paw stands with the fingers up and the clip leaves its heel. A
      real player holds the clip between the thumb and the fingers at eye level
      (`docs/reference/percussion-technique.md` 10).
- [ ] Beaver right arm root: a soft dark crease stays at its front from the right side at the
      elevation 20 (`bassoonist-views.webp` of `docs/research/2026-10-25-beaver-rhino-arms/`).
- [ ] Beaver rebuilt arms: the method of the cat folded 15 faces of each arm (limit 8) around the
      socket of the seam cut. A new try needs a smaller socket, because the upper arm joins the
      trunk down to 0.9 of its length (`2026-10-25-beaver-rhino-arms.md`).
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
- [ ] Arm gate: the stretch counts from the rest sample, so a rest where the wrist lifts the head
      gives a false stretch. The elephant left arm gives 0.22 (base 0.09, limit 0.35), and less
      than the base against the bind. Count the stretch from the bind, or from the rest only when
      the rest keeps the wrist straight (`docs/research/2026-10-19-elephant-grip.md` 5).
- [ ] Seam gate: no measure of the skin separates the flaps, the shards, and the dents at the arm
      seam from the good roles, so `pnpm arm-check` does not see them
      (`docs/research/2026-10-22-seam-gate.md`). Each mesh round looks at the sheets of
      `pnpm close-views audit`. Next idea: a render measure on the audit cells, or a form
      measure of the trunk under the source arm.
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
- [ ] Rabbit right armpit after the fair move: a shallow hollow with a small sharp tip stays
      under the raised bow arm at the camera of the user. The full move made facets and a pit, so
      a smoother hollow needs more vertices in the notch (`2026-10-21-rabbit-armpit.md`).
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
- [ ] Wolf face: level brows, level pea eyes, and a thin smile line (round `wolf-face`). Show the
      user `compare.webp` and `faces.webp` of `docs/research/2026-10-20-wolf-face/`, with the
      variant with no body change (`2026-10-20-wolf-face.md`).
- [ ] Wolf reach: the right paw reaches its clarinet grip with only 0.9 cm to spare (5.1 cm at
      `0e7130db`), because the arms take the body factor. A larger arm factor (up to 1.25) or a
      new mouthpiece place can give more (`2026-10-20-wolf-face.md`).
- [ ] Badger cymbals choice: the agent chose the suspended cymbal while the user slept. Show the
      user `compare.webp` of `docs/research/2026-10-20-badger-cymbals/`, and ask if the badger
      keeps it, or gets longer arms for hand cymbals.
- [ ] Suspended cymbal: the free paw does not muffle the plate after a note, and the moments of
      `ROLE_VIEWS.cymbalist` still have the names of a crash (`tools/close-views.ts`).
- [ ] Badger xylophone runs: a scale stays in one hand, because a hand does not cross the other
      (`alternateHands()`), so on the percussion test score the right paw reaches across the
      body to the lowest bars (median miss 9.5 cm). A real player alternates the hands in a
      scale, with no cross of the mallets (`docs/reference/percussion-technique.md` 9).
      Done: a run that leaves the reach of one paw goes on in the other paw, and the right paw
      strikes 93% of its bars within 5 mm, median 0 mm (`2026-10-25-xylophone-reach.md`). The
      alternation stays open (below).
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
- [ ] Badger xylophone shafts: on a chord of two near bars, the shafts of the two mallets touch
      in 0.4% of the samples of the steel drum part (`2026-10-25-xylophone-sway.md`). The smaller
      bars and heads leave 0.1% (`2026-10-25-xylophone-reach.md`).
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
- [ ] Snare and cymbal rest: the arms hang, so the tips point forward beside the drum and the
      plate, 5 cm to 9 cm outside the rim (design 5.2). `ready` keeps the tips over the instrument
      also at rest, as for the bass drum, and removes the lift. Ask the user.
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
- [ ] Elephant timpanist: the seam where the upper arm of the mesh lies on the side of the body
      shades dark lines on the front of the body when the arms play (`timpanist-base-views.webp`
      of `docs/research/2026-10-19-elephant-mesh/`). The arm cut of `2026-10-19-elephant-arms.md`
      takes the seam below the shoulder, and dark areas stay on the chest beside the raised arms
      (`timpanist-views.webp` of `docs/research/2026-10-19-elephant-arms/`).
- [ ] Elephant timpanist: each hand keeps the front kettle on its side of the trunk, so a roll
      stays in one hand, and the outer kettles stand out of reach and are never struck
      (`PercussionHold.pair`). Show the user the views, and offer longer arms for rolls with
      both hands and for the outer kettles (`2026-10-19-elephant-pose.md`).
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
- [ ] Remove the parametric biped (the branch of `buildBiped()` after the studio bodies, and
      `trunk.ts`, `arms.ts`, `legs.ts`, `ears.ts`, `snouts.ts`, `tails.ts`) when the deer and the
      rhino have bodies of their own. Until then, the harp and the tuba players use it.
      `face-patterns.ts` went on 2026-10-20, because no species had a face pattern.
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
- [ ] Panda arm gate: the flat p5 of the lift falls from 0.80 / 0.84 to 0.69 / 0.71, and
      `pnpm arm-check trombonist --base c5fae22c` gives `FAIL` (limit 0.55). Accept it as
      a decision row, or revert `2ae168dc`.
- [ ] Bear left root and back pocket: from az-150, a softer dark crease stays at the left
      root, most at rest (the left shoulder ball 2.49 cm deep at rest). From az150, a small
      dark pocket stays where the raised right arm meets the back at `between`. Try a push
      of vertices 438 and 442, and a second split on the left (`tools/arm-roots/bear.json`).
- [ ] Panda front notch: a small gray dent below each arm from the left side. Round
      `arm-roots`: a `hull` fill of the 7 front lips (`tools/arm-roots/panda.json`) at half
      makes the V smaller, a full fill puts the lips in the free arm with gray streaks, and a
      fill along +z changes nothing. Next: move the body run of the cut (787, 793, 800).
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
- [ ] Rhino footprint: the shoulders widen it 2.1 cm, and the conductor pose of
      boulanger-matin changes from 257.38 s (`body-probe.txt` of `2026-10-22-rhino-arm-3/`).
      Check that the cue of the conductor still aims at the tuba.
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

## Step 6. UI (2, 6.6, 9.5)

- [ ] Run `node tools/measure-targets.ts` on a quiet machine. The render target of 9.7 failed
      only under the load of other agents.
- [ ] Decide the range rule of the soft demos with the user (6.8). Beethoven 8 keeps 58 % of
      its time below -30 LUFS short-term. Research section 6 proposes a velocity curve of
      `30 log10(v / 127)` for the demos only.
- [ ] Run `pnpm loudness --check` after each change of a demo file, the SoundFont, the mix, the
      hall, or the limiter, until a check of CI or of the merge runs it (6.8).
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

## Step 6b. Cinematic camera (2.3, 2.4, 2.5, 2.8, 4.5, 5.6, 9.7)

- [ ] The review of 9.8: frames of each kind of shot of each demo at both sizes, and the GIF.

Done when: the tests of 5.6 pass for each demo, the shot targets and the frame target of 9.7
pass, and the smoke test checks the camera.

## Step 8. Polished look (1, 2.5, 2.8, 4.1 to 4.6, 5.6)

- [ ] Scene look: the hall with warm lights out of focus, the visible beam, the glossy stage,
      the lights, and the post effects (bloom, depth of field, vignette, grain, color grade).
- [ ] Camera: the default view and the shots of `scene.png`.
- [ ] Cast: the faceted animals and the instruments of `scene.png`.
- [ ] Give the cello and the contrabass the deeper ribs of the real instruments (about 0.16 of
      the body length against 0.10 now), with a check of the holds of the dog and the hippo
      (`docs/research/2026-10-29-string-models.md`).
- [ ] Slope the strings of the bowed strings down about 5° from the bridge to the nut, as on a
      real instrument, so that the fingerboard can lie close to the top and the neck can be
      thinner. The bow contact, the fingerboard target, and the left hand poses must follow the
      new string line (`docs/decisions/2026-10-29-string-models.md`).
- [ ] UI: the title, the panel, the demo rows, the seat rows, and the bar of `mockup.png`.
- [ ] Turn the conductor to the audience for the bow at the song end. Now it bows to the
      players. A conductor turns around on the podium, bows to the audience, and turns back
      (user request of 2026-10-07, design 5.4). Keep the clearance tests of the stand.
- [ ] Audit the seating algorithm of design 4.2 against the seating of professional orchestras
      and choirs, with sources: the place of each section, the desks, the rows, the risers, the
      soloist, the chamber groups, and the choir. Write the audit in `docs/audits/` with the
      file and the line of each finding, then fix the findings that the user approves (user
      request of 2026-10-07).
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
- [ ] The chairs have a lit saturation of 0.52 against 0.65 in `orchestra-latest.png`, and the
      stage of the camera `orchestra` a median luma of 130 against 107 outside the pool of light.
- [ ] A cool fill (`#282c34`) against the warm keys waits for the user: it makes the shade of the
      white fur a little grayer (`docs/research/2026-10-18-key-beam.md`).
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
- [ ] Fetch the presets of the default demo before the first frame (round `perf-load`,
      `docs/research/2026-10-21-load-performance.md`). On the Fast 4G phone run, the link is idle
      for about 4.8 s while the main thread builds the scene, and the presets then take about
      10 s. AGENTS.md loads the SoundFont files after the first frame, so this needs the user.
      The fetches must start before the score build: a fetch after it waits for the 2.8 s task.
      The round `perf-gzip-audio` measured the idle link again: about 4.7 s, from the end of the
      first download to the audio chunks (`docs/research/2026-10-29-network-load.md`,
      `docs/decisions/2026-10-29-gzip-audio.md`). Start the fetches, and yield once, before
      `select()` of `src/app/app.ts`.
- [ ] Ship the packed meshes of the studio bodies as one binary file with gzip, read with
      `DecompressionStream` (round `perf-gzip-audio`, `docs/decisions/2026-10-29-gzip-audio.md`).
      Their base64 text is most of the renderer chunk, and the binary file saves about 50 KB of
      the first download (`docs/research/2026-10-29-network-load.md`).
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
      an SF3 file that the HTTP cache dropped. In the round `perf-gzip-audio`, about 745 KB
      revalidates after 10 min (`docs/decisions/2026-10-29-gzip-audio.md`). A host with brotli
      would also save about 128 KB of the first download. The host is a decision of the user
      (`docs/research/2026-10-29-network-load.md`).

Done when: the screenshots of design 9.8 look like `mockup.png` and `scene.png`, the size check
passes, and the quality tiers of 2.6 keep 60 fps on a laptop.
Review:

## Step 7. Demo build, tests, and deploy (8, 9)

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
- [ ] Check the FLAC hall in the manual release test of 9.4: in real Safari on macOS and on iOS,
      the network list shows the FLAC file of the hall and no WAV file (round `perf-hall`,
      `docs/research/2026-10-21-load-performance/hall-flac.md`). Playwright WebKit is no Safari.
- [ ] Do the manual release test of 9.4 with the user.
      It needs the deployed site and the real devices of 9.4.

Done when: CI passes on `main` with Playwright in Chromium, and the deployed site plays the
default demo.
