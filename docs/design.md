# Zoophony: design

This document records the design of a WebGL MIDI player for orchestral music. Low-poly animals
play the music on a small stage. The design was confirmed on 2026-10-04, before the first line
of code.

The facts behind the decisions are in [`research/`](research/README.md). Section 10 lists the
decision files of [`decisions/`](decisions/): the details that agents decided after the design
session, for the user to confirm.

The design is the single source of truth for the product and design decisions. The text of
sections 1 to 9 is in [`design/`](design/), in one file for each section. The two-digit number at
the start of a file name is the number of its section. Thus a pointer "design X.Y" names the
heading "X.Y" in the file of section X. For example, design 4.5 is the heading "4.5 Visual values"
in `design/04-stage-cast-look.md`. Read only the files of your area.

| File | Section and scope |
|---|---|
| [`01-goals.md`](design/01-goals.md) | 1. Goals and budgets: the platform, the budgets, and the reference images |
| [`02-product.md`](design/02-product.md) | 2. Product: input, first screen, layout, play and keyboard, camera, quality tiers, privacy, and UI spec (2.1 to 2.8) |
| [`03-midi-to-seats.md`](design/03-midi-to-seats.md) | 3. From MIDI to seats: pipeline, data model, file rules, ports and channels, program map, channel 10, seats, and players (3.1 to 3.8) |
| [`04-stage-cast-look.md`](design/04-stage-cast-look.md) | 4. Stage, cast, and look: look, layout, species, models, visual values, model inventory, and rig (4.1 to 4.7) |
| [`05-animation.md`](design/05-animation.md) | 5. Animation: pose function, rest pose, instrument motion, conductor, silent seats, and camera shots (5.1 to 5.6) |
| [`06-audio.md`](design/06-audio.md) | 6. Audio: engine, SoundFont, load flow, block scheduler, seek and pause, mute and solo, clock, and interfaces (6.1 to 6.8) |
| [`07-architecture.md`](design/07-architecture.md) | 7. Architecture: modules, first download, and third-party licenses (7.1 to 7.3) |
| [`08-demos.md`](design/08-demos.md) | 8. Demos: license rules, list, changes to the files, OpenScore files, and demo tests (8.1 to 8.5) |
| [`09-process.md`](design/09-process.md) | 9. Process: repository, CI, tests, manual test, order of work, docs, targets, and reviews (9.1 to 9.8) |

## 10. Decisions to confirm

After the design session of 2026-10-04, agents decided more details, so that a fresh agent can
build with no guess. The user did not review them one by one. Treat them as decided, unless a
newer decision of the user or a newer row replaces them. A decision
file in [`decisions/`](decisions/) holds the details of one agent session in one table, with a
row for each decision. The Section column of a row names the section of this design that holds
the decision.

- **New decisions.** An agent that decides details adds a new file
  `decisions/<YYYY-MM-DD>-<topic>.md`. The file has a title, one paragraph that tells who decided
  and why, and the table. Add the file to the list below.
- **Old files.** Keep the file of another session as it is. The only change to it is the removal
  of a row that the user reversed, or that a newer decision or the code replaced.
- **Reversal.** The user can reverse each decision. Then update the section of this design that
  holds it, and remove its row. An agent that replaces a decision does the same in the commit of
  the change, and names the removed row in the commit message. When a file has no rows, delete
  it and its line below.

The decision files:

- [`2026-10-04-design-session.md`](decisions/2026-10-04-design-session.md): the design session.
- [`2026-10-05-manager-review-advice.md`](decisions/2026-10-05-manager-review-advice.md): the manager on the advice of a review.
- [`2026-10-05-step-2.md`](decisions/2026-10-05-step-2.md): the step 2 agent.
- [`2026-10-05-step-4-instruments.md`](decisions/2026-10-05-step-4-instruments.md): the step 4 instruments.
- [`2026-10-05-step-4-layout.md`](decisions/2026-10-05-step-4-layout.md): the step 4 layout.
- [`2026-10-05-step-4-scene-gallery.md`](decisions/2026-10-05-step-4-scene-gallery.md): the step 4 scene and gallery.
- [`2026-10-05-step-5-motion.md`](decisions/2026-10-05-step-5-motion.md): the step 5 motion.
- [`2026-10-05-step-5-winds-brass.md`](decisions/2026-10-05-step-5-winds-brass.md): the step 5 winds and brass.
- [`2026-10-05-pose-code-audit.md`](decisions/2026-10-05-pose-code-audit.md): the pose code audit.
- [`2026-10-05-animal-views.md`](decisions/2026-10-05-animal-views.md): the animal views.
- [`2026-10-05-animal-views-checks.md`](decisions/2026-10-05-animal-views-checks.md): the checks of the animal views.
- [`2026-10-05-step-5-piano-harp-choir.md`](decisions/2026-10-05-step-5-piano-harp-choir.md): the step 5 piano, harp, and choir.
- [`2026-10-05-step-5-percussion-conductor.md`](decisions/2026-10-05-step-5-percussion-conductor.md): the step 5 percussion and conductor.
- [`2026-10-05-animal-views-round-3.md`](decisions/2026-10-05-animal-views-round-3.md): the third round of the animal views.
- [`2026-10-05-step-5-app-wiring.md`](decisions/2026-10-05-step-5-app-wiring.md): the step 5 app wiring.
- [`2026-10-05-step-5-review-fixes.md`](decisions/2026-10-05-step-5-review-fixes.md): the fixes of the step 5 review.
- [`2026-10-05-step-2-processor.md`](decisions/2026-10-05-step-2-processor.md): the step 2 processor tasks.
- [`2026-10-05-professional-seating.md`](decisions/2026-10-05-professional-seating.md): the professional seating.
- [`2026-10-05-count-in.md`](decisions/2026-10-05-count-in.md): the count-in.
- [`2026-10-05-step-5-re-review-processor.md`](decisions/2026-10-05-step-5-re-review-processor.md): the processor findings of the step 5 re-review.
- [`2026-10-05-step-6-bar-first-screen.md`](decisions/2026-10-05-step-6-bar-first-screen.md): the step 6 bar, first screen, and demo list.
- [`2026-10-05-natural-lift.md`](decisions/2026-10-05-natural-lift.md): the natural lift.
- [`2026-10-05-step-6-file-seats-settings.md`](decisions/2026-10-05-step-6-file-seats-settings.md): the step 6 file button, seat list, and settings.
- [`2026-10-05-step-6-credits-messages-keys.md`](decisions/2026-10-05-step-6-credits-messages-keys.md): the step 6 credits, messages, keys, and phone layout.
- [`2026-10-05-step-6-review-fixes.md`](decisions/2026-10-05-step-6-review-fixes.md): the fixes of the step 6 review.
- [`2026-10-05-step-6-re-review-fixes.md`](decisions/2026-10-05-step-6-re-review-fixes.md): the fixes of the step 6 re-review.
- [`2026-10-05-score-build-test.md`](decisions/2026-10-05-score-build-test.md): the score build test.
- [`2026-10-05-room-and-mix.md`](decisions/2026-10-05-room-and-mix.md): the room and the mix.
- [`2026-10-05-conductor-cues.md`](decisions/2026-10-05-conductor-cues.md): the conductor cues.
- [`2026-10-05-soundfont.md`](decisions/2026-10-05-soundfont.md): the SoundFont.
- [`2026-10-05-cinematic-camera.md`](decisions/2026-10-05-cinematic-camera.md): the cinematic camera.
- [`2026-10-05-cheerful-demos.md`](decisions/2026-10-05-cheerful-demos.md): the cheerful demos.
- [`2026-10-05-step-7-tests-deploy.md`](decisions/2026-10-05-step-7-tests-deploy.md): the step 7 tests and deploy.
- [`2026-10-06-ux-audit-sound.md`](decisions/2026-10-06-ux-audit-sound.md): the sound findings of the UX audit.
- [`2026-10-06-ux-audit-camera-stage.md`](decisions/2026-10-06-ux-audit-camera-stage.md): the camera and stage findings of the UX audit.
- [`2026-10-06-ux-audit-ui-app-flow.md`](decisions/2026-10-06-ux-audit-ui-app-flow.md): the UI and app flow findings of the UX audit.
- [`2026-10-06-ux-audit-manager.md`](decisions/2026-10-06-ux-audit-manager.md): the manager on the UX audit.
- [`2026-10-06-portrait-soloist.md`](decisions/2026-10-06-portrait-soloist.md): the portrait view and the soloist.
- [`2026-10-06-ux-audit-2-layout-score-choir.md`](decisions/2026-10-06-ux-audit-2-layout-score-choir.md): the layout, score, and choir findings of the second UX audit.
- [`2026-10-06-ux-audit-2-ui.md`](decisions/2026-10-06-ux-audit-2-ui.md): the UI findings of the second UX audit.
- [`2026-10-06-ux-audit-2-shots.md`](decisions/2026-10-06-ux-audit-2-shots.md): the shot composition findings of the second UX audit.
- [`2026-10-06-chamber-groups.md`](decisions/2026-10-06-chamber-groups.md): the chamber groups with no conductor.
- [`2026-10-06-polished-ui.md`](decisions/2026-10-06-polished-ui.md): the UI of the polished mockup.
- [`2026-10-06-polished-camera.md`](decisions/2026-10-06-polished-camera.md): the camera of the polished look.
- [`2026-10-06-polished-cast.md`](decisions/2026-10-06-polished-cast.md): the animals and the instruments of the polished reference images.
- [`2026-10-06-polished-look.md`](decisions/2026-10-06-polished-look.md): the hall, the stage, the light, the beam, and the post effects of the polished look.
- [`2026-10-06-planner-stability.md`](decisions/2026-10-06-planner-stability.md): the shot planner that stays stable against small moves of the players.
- [`2026-10-06-arm-and-hand-contact.md`](decisions/2026-10-06-arm-and-hand-contact.md): the join of the arm and the torso, and the hands on the bowed strings.
- [`2026-10-06-beam-clear-view.md`](decisions/2026-10-06-beam-clear-view.md): the beam that keeps the orchestra clear.
- [`2026-10-06-conductor-left-arm.md`](decisions/2026-10-06-conductor-left-arm.md): the conductor stand in front of the podium, and the motion of the left arm of the conductor.
- [`2026-10-06-step-8-review-fixes.md`](decisions/2026-10-06-step-8-review-fixes.md): the fixes of the review of step 8 in the UI, the camera frame, and the shots.
- [`2026-10-06-polar-bear-pianist.md`](decisions/2026-10-06-polar-bear-pianist.md): the polar bear at the piano.
- [`2026-10-06-beam-to-stage.md`](decisions/2026-10-06-beam-to-stage.md): the beam that reaches the stage and keeps the players clear.
- [`2026-10-06-fur-shading.md`](decisions/2026-10-06-fur-shading.md): the crease normals and the baked occlusion. The soft edge of the fur is gone (2026-10-07).
- [`2026-10-06-joyful-ode.md`](decisions/2026-10-06-joyful-ode.md): the traditional and joyful excerpt of the Ode to Joy.
- [`2026-10-06-skinned-bodies.md`](decisions/2026-10-06-skinned-bodies.md): the skin of two bones at a joint, the area modules of the body, and the user decisions on the cute bodies that stay (no fur, no blush, the head height).
- [`2026-10-06-choir-shots.md`](decisions/2026-10-06-choir-shots.md): the choir as a subject of the shots, and the test of the first voice.
- [`2026-10-06-rest-arms-and-bow.md`](decisions/2026-10-06-rest-arms-and-bow.md): the rest pose with held arms, and the bow stick in the fingers.
- [`2026-10-07-rest-clearance.md`](decisions/2026-10-07-rest-clearance.md): the arms of the rest pose that stay out of the body.
- [`2026-10-07-scene-polish.md`](decisions/2026-10-07-scene-polish.md): the light from behind, the walnut stage, the hall lamps, the beam shaft, and the grade of the scene polish.
- [`2026-10-07-title-shade.md`](decisions/2026-10-07-title-shade.md): the shade of each title line, with a level from the frame behind its text.
- [`2026-10-07-cast-colors.md`](decisions/2026-10-07-cast-colors.md): the move of the species colors into `models/colors.ts`, and the samples of the colors that the revert of 2026-10-09 replaced.
- [`2026-10-07-play-clearance.md`](decisions/2026-10-07-play-clearance.md): the arms of the playing pose that stay out of the body, the holds of the bowed strings and the winds, and the horn.
- [`2026-10-07-credits-modal.md`](decisions/2026-10-07-credits-modal.md): the link "Credits" at the end of the drawer, the modal dialog that it opens, and the link to GitHub after the logo.
- [`2026-10-07-conductor-pose.md`](decisions/2026-10-07-conductor-pose.md): the raised arms of the conductor, with both hands beside the head from behind, and the beat plane square to the baton.
- [`2026-10-07-camera-angle.md`](decisions/2026-10-07-camera-angle.md): the target of the default view 0.25 m below the stage top, and the wide shots and Free mode on that target.
- [`2026-10-07-scene-details.md`](decisions/2026-10-07-scene-details.md): the light on the stage wood behind the podium, the darker planks, the hall lamps behind the stage, and the inside of the open piano.
- [`2026-10-07-neck-seams.md`](decisions/2026-10-07-neck-seams.md): the cause of the dark seams at the neck, the dark lens on the head of the conductor, and the short muzzle that the bear keeps.
- [`2026-10-07-spotlight-pool.md`](decisions/2026-10-07-spotlight-pool.md): the pool of the stage lights on the conductor and the middle of the orchestra, the key light on the axis of the stage, and the end of the fall-off of the wood alone.
- [`2026-10-07-anatomy-track.md`](decisions/2026-10-07-anatomy-track.md): the rest places of the violin, the viola, the bow, the piano, and the harp on the lap.
- [`2026-10-07-camera-bugs.md`](decisions/2026-10-07-camera-bugs.md): no zoom on the first screen, the near orbit limit outside the box of the stage and the players, and the focus of Free mode on the middle of the frame.
- [`2026-10-07-scene-latest.md`](decisions/2026-10-07-scene-latest.md): the default view of `orchestra-latest.png` at 33° above a target 0.7 m behind the stage center, the low hall lamps 60° from the back, the stage with cut corners and a raised lip, the podium with cut corners and framed panels, and the wide wooden risers with steps.
- [`2026-10-07-blender-sculpts.md`](decisions/2026-10-07-blender-sculpts.md): the step of a packed coordinate, and the light, the tone mapping, and the pose of the views page. The rows of the recipes and the sculpts went with the sculpt tools.
- [`2026-10-07-spotlight.md`](decisions/2026-10-07-spotlight.md): the wider pool of the key light on the first screen, from a rough and stronger gloss of the stage wood and a wider hot spot, and the spotlight that moves to the soloed seats: the key light, its pool, and the leaning beam.
- [`2026-10-07-entry-shots.md`](decisions/2026-10-07-entry-shots.md): the measure of the cuts at an entry, the rest of 4 s and the passage of an entry, the cut in the reach of the first entry after the shortest length, the ranks of a wide view that cannot wait, a soloist, and an entering seat, and no shot of a seat before its entry.
- [`2026-10-07-proportions.md`](decisions/2026-10-07-proportions.md): the table of the proportions of each species with its defaults, and the shots that read the chest bone.
- [`2026-10-08-views-page.md`](decisions/2026-10-08-views-page.md): the views page of each model sheet at the size, the scale, and the camera of the sheet, the light and the AgX tone mapping of the views page, and the sheet poses of the violin on the shoulder, the cello, and the piano.
- [`2026-10-08-spike-fox-gated.md`](decisions/2026-10-08-spike-fox-gated.md): the silhouette gate of a model against the matte of its sheet. The other rows went with the tools of route B.
- [`2026-10-08-fox-arms.md`](decisions/2026-10-08-fox-arms.md): the bow arm of the violin and the sheet moment in the middle of the bow. The rows of the rig of the route B fox went with the tools of route B.
- [`2026-10-08-cleanup.md`](decisions/2026-10-08-cleanup.md): the tests and the design rules that pinned tuned values or the old body, and the limit of the shot plan test.
- [`2026-10-08-fox-feet.md`](decisions/2026-10-08-fox-feet.md): the test of the feet of each seated body.
- [`2026-10-09-body-revert.md`](decisions/2026-10-09-body-revert.md): the revert of the animal bodies to 2026-10-06 18:58: the parametric bodies, the skeletons, and the colors of that time, and the pose that fits the old bodies.
- [`2026-10-09-test-trim.md`](decisions/2026-10-09-test-trim.md): the removal of the meerkat and of the tip help of a short bow arm, the steps of the slow sweeps, and the split of the slow test files.
- [`2026-10-10-reference-target.md`](decisions/2026-10-10-reference-target.md): the reference images as the target of the animal bodies, the anatomy of each species, the contact between the arms and the body, and the facets and the arms of `animals.webp`.
- [`2026-10-10-arms-close.md`](decisions/2026-10-10-arms-close.md): the arms of the players close to the body and the instruments, and the elbow directions that the old gap had forced out.
- [`2026-10-10-fox-body.md`](decisions/2026-10-10-fox-body.md): the silhouette check of the sheet page of the fox.
- [`2026-10-10-bear-body.md`](decisions/2026-10-10-bear-body.md): the conductor of `bear-views.png`: the one baton, the holds, the paws of the ready gesture at the height of the chin, the podium, and the sheet page. The rows of its code-built body went with the rigged bear.
- [`2026-10-10-rabbit-glb.md`](decisions/2026-10-10-rabbit-glb.md): the packer of the rigged GLB file of the rabbit, the bones that the file lacks, two bones for each vertex, and the tests that the user removed.
- [`2026-10-10-bear-glb.md`](decisions/2026-10-10-bear-glb.md): the bear from the rigged GLB file of the user, the limbs that keep their lengths, the size of the rabbit, the palette of the face colors, the tests that the user removed, `pnpm glb-init`, and the faster bow hold sweep.
- [`2026-10-10-trim.md`](decisions/2026-10-10-trim.md): the trim audit of 2026-10-10: the tools of route B and the sculpt tools go, because `pnpm rig-body` and `pnpm glb-init` replace them.
- [`2026-10-10-glb-skins.md`](decisions/2026-10-10-glb-skins.md): the skins of the rigged rabbit and bear, baked from the textures of their GLB files with the colors of the reference images, the eye plates that carry the eyes of the textures, the white corner for the parts with no skin, the skin materials, the tail of the bear, and the size check of the skins.
- [`2026-10-10-rabbit-sheet.md`](decisions/2026-10-10-rabbit-sheet.md): the rabbit of `rabbit-views.png`: the shape of a GLB body in its config, its dark eyes and tail, the eye plates of one UV island, the smooth and the collapse, the shoulder hold of the violin, and the matte of the sheet.
- [`2026-10-10-rabbit-knees.md`](decisions/2026-10-10-rabbit-knees.md): the seated knees of the rabbit: the haunch on the hips against the older rule, and the shape of the rabbit with its longer limbs against the older rule.
- [`2026-10-11-body-revert.md`](decisions/2026-10-11-body-revert.md): the second revert of the animal bodies to 2026-10-06 18:58: the parametric bodies of all species, the removal of the body code that no species uses, the tools that stay, the props and pose features that stay, and the body probe.
- [`2026-10-11-penguin-body.md`](decisions/2026-10-11-penguin-body.md): the egg body of the penguin after the choir of `orchestra-latest.png` and `orchestra-side.png`, its bones, its colors, its flippers and feet, the higher folder hold, the parametric parts of the penguin that stay, the shared parts that came back, and `pnpm choir-check`.
- [`2026-10-11-short-legs.md`](decisions/2026-10-11-short-legs.md): the short legs of the reference images: the seated knee near the height of the seat, the chair and the foot ring at the legs of each species, the short standing legs of the default skeleton, the props of the standing players, and the pose fits.
- [`2026-10-11-low-seats.md`](decisions/2026-10-11-low-seats.md): the user decision of the low seats of 0.75 head heights, the high stool, the harp stool, and the bench, and the pose fits of the cello and the horn.
- [`2026-10-12-studio-bear.md`](decisions/2026-10-12-studio-bear.md): the studio bear of `lowpoly-studio/` as the conductor, the retarget of the pose of the player to its bones, the scale at the shoulders, the export command, the new hold of the baton and the ready gesture, the hanging arms, the conductor stand, and the checks that went. The row of the clearance test went to `2026-10-13-role-sweep.md`.
- [`2026-10-12-studio-polar-bear.md`](decisions/2026-10-12-studio-polar-bear.md): the studio polar bear of `lowpoly-studio/` as the pianist, the four digits on one finger bone, the scale at the keys, the seated body on the floor, the reach of the paws, the accepted limits, `pnpm close-views`, and the checks that went. The row of the clearance test went to `2026-10-13-role-sweep.md`, the rows of the rest place and of the arc of the paws to `2026-10-13-pianist-rest.md`, the rows of the bench and of the lean to `2026-10-14-polar-bench.md`, and the row of the keys in front of the belly to `2026-10-14-polar-fix.md`.
- [`2026-10-13-role-sweep.md`](decisions/2026-10-13-role-sweep.md): the sweep of the clearance tests of each role: the closed body with the shoulders, the bone of a point, the accepted depths of the forearms and the upper arms, the note targets of the pianist, the case of the piano, and the tests of the conductor and the pianist clearance on the sweep.
- [`2026-10-13-pianist-rest.md`](decisions/2026-10-13-pianist-rest.md): the rest lean of the hold of the piano and the harp. The rows of the target of the look, the rest lean of the pianist, the paws, the elbows, the head lift, and the arc of the paws went to `2026-10-13-pianist-lap.md`.
- [`2026-10-13-pianist-lap.md`](decisions/2026-10-13-pianist-lap.md): the rest pose of the pianist as a real pianist before a performance: the tall trunk with the lean of the `ready` clip, the head up, the side of the palm of a rest hand, the paws on the low front of the belly over the thighs, the elbows by the sides, the accepted depths of the arms at rest, and the changed tests. The row of the arc of the paws went to `2026-10-14-polar-bench.md`.
- [`2026-10-13-frame-time.md`](decisions/2026-10-13-frame-time.md): the GPU time of the frame target with no frame cap in a Metal System Trace, `pnpm frame` with its exit codes, the read of the title backdrop at the start of a frame with a new pixel buffer, the scene target with no depth resolve, and the switches that did not go into the code. The row of the load limit went to `2026-10-13-frame-tools.md`.
- [`2026-10-13-frame-tools.md`](decisions/2026-10-13-frame-tools.md): the CPU gate of the main-thread phase of `pnpm frame`, the guard of the GPU phase with one more record, `--gpu-only`, the share of the "Maximum" state, the self-check of the GPU row, the seeks to fixed song times, `run.json`, and the console warnings.
- [`2026-10-13-straight-baton.md`](decisions/2026-10-13-straight-baton.md): the user decision of the straight baton of the two newest reference images in place of the bent tip of `bear-views.png`.
- [`2026-10-13-studio-rabbit.md`](decisions/2026-10-13-studio-rabbit.md): the studio rabbit of `lowpoly-studio/` as the violinist, seated on a chair of its own depth and standing as a soloist, the two sheets, the scale at the standing shoulders, the violin by the rule of real violins, the shoulder hold with no lean and the side rest, the instrument offsets of the retarget, the sweep of the violinist, the budget of a studio body, the accepted limits, and the changed tests.
- [`2026-10-13-mesh-rabbit.md`](decisions/2026-10-13-mesh-rabbit.md): the rabbit mesh of the user as the violinist, rigged in the format of a studio body: the longer arms and their factor, `AnimalSettings.glb`, one color for each face from a palette in Oklab, the seated bind of the studio rabbit, the GLB file of `pnpm rig-mesh`, the measured joints, the weight rules for thin faces and the fingers, the eye fans and the triangle budget, the relax of the bind mesh, the chair, the swap in the app, the level violin hold with the bow elbow of the 14 demos, the accepted folds of the shoulders, the accepted limits, the dark band under the head, and the changed tests.
- [`2026-10-14-cheerful-demos.md`](decisions/2026-10-14-cheerful-demos.md): the curated library of cheerful orchestral pieces in `demos/curated/` and the addition of 8 cheerful orchestral demos to the live player (demos #7 to #14).
- [`2026-10-14-mesh-rig-retro.md`](decisions/2026-10-14-mesh-rig-retro.md): the retro items of the rabbit mesh rig: the gzip budget of a studio body mesh, `--glb` of the probes on a copy of `src/`, `pnpm rig-mesh --check` with no write, its stop above the triangle budget, its thin faces near the joints and its app checks, and section 7 of the brief template.
- [`2026-10-14-rabbit-smooth.md`](decisions/2026-10-14-rabbit-smooth.md): the smooth normals of the three studio bodies with a crease angle for each body, the measure of the facet contrast that chose the angles of the two bears, the angle of the rabbit that the manager chose from the play frames, the morph normals of the corrective shapes, the flat gloss, the end of the flat path, and the fur colors of a mesh rig that skip the black gaps of the texture.
- [`2026-10-14-test-pause.md`](decisions/2026-10-14-test-pause.md): the pause of the tests of the look, the fit, and the clearance of the bodies and of the layout from their footprints, the rule of the choice, the list in the Vitest project `paused`, the way back, and the pause of the frame rule.
- [`2026-10-14-smooth-retro.md`](decisions/2026-10-14-smooth-retro.md): the retro items of the smooth studio bodies: `--base <ref>` of `pnpm size` and `pnpm close-views` with `tools/ref-tree.ts`, `--url <url>` of `pnpm close-views`, the hash of each field of a mesh in `pnpm body-probe` with the corrective shapes and the normals of a studio body, `tools/break-test.sh` with its exit codes, the rules of `AGENTS.md`, and the range check of the brief template.
- [`2026-10-14-size-retro.md`](decisions/2026-10-14-size-retro.md): the retro items of the size round: `--base <ref>` and `--json <file>` of `pnpm pose-depth` and `pnpm hold-fit` with two child processes, the probe folder of a commit, the compare of the depths of each species in the H of each body with the mark `GROWS`, the species in the label of each player, the gallery query `distance`, and the lineup of `pnpm close-views` with the gallery of the working tree.
- [`2026-10-14-probe-retro.md`](decisions/2026-10-14-probe-retro.md): the probe items of the retro of the form and neck rounds: `traceShots()` beside `prepareShots()` with the kept refusals and the share of the distance, `pnpm shot-trace` with a chamber test file and `--base`, the grid and the best variant of `pnpm hold-fit`, the bone of a fold and the same face of two trees in `pnpm fold-probe`, and the violin sizes of `pnpm hold-reach`.
- [`2026-10-14-review-rule.md`](decisions/2026-10-14-review-rule.md): the review rule that replaces the review of each step, the short review agent of the code, the fixes with no second review, and the optional review brief of a studio body.
- [`2026-10-14-mesh-fox.md`](decisions/2026-10-14-mesh-fox.md): the fox mesh of the user on the red violin foxes: the arm factor of the rabbit reach, the tail of two bones, the seat of a long thigh, the triangle budget of 3,200, the eye loop and the nose box, the weight rules of the shoulders and the jaw, the hold of the fox, the accepted folds, the role of the fox in the tools, the paused shot test, and the changes of the scene.
- [`2026-10-14-animal-size.md`](decisions/2026-10-14-animal-size.md): the red violin fox at 1.3 times and the rabbit at 1.2 times the size that the user asked for, with a linear scale of each body and the arm factors that stay, the head ratio of a seated rabbit and a seated red fox, and the violins of both by the rule of a violin shop.
- [`2026-10-14-fox-rabbit-form.md`](decisions/2026-10-14-fox-rabbit-form.md): the larger head of the red fox, the longer legs, and the higher seats of the red fox and the rabbit that the user asked for and then made smaller: the head factor and the leg factor of the rig, the head of the holds before the growth, the seat with level thighs, the seat of 0.36 m with hanging and relaxed feet, the scale that keeps the meters, the seated head tops, the tail over the seat, the folds of the rigs, the music stands of a row, the growth of the stages, the stretch between the joints, the violin on the collarbone of a real violinist, the violins of its rule and the arm options, the free hair of the bow, the rest on the lap, the open folds and depths, and the changed tests. The row of the margin of the two-shot of a duo went to `2026-10-14-polar-fix.md`.
- [`2026-10-14-neck-violin.md`](decisions/2026-10-14-neck-violin.md): the short neck of the red fox, the violins at the neck, and the seat place that the user asked for: the seat move back on the chair, the short neck and the head of the holds on it, the level thighs, the longer arms, the stretch of the free upper arm, the rings at both elbows of the rabbit, the place of the violins at the neck, the size of the violins, and the open folds and depths.
- [`2026-10-14-polar-bench.md`](decisions/2026-10-14-polar-bench.md): the bench of the polar bear pianist at about twice the height of its legs, the rule of a real pianist, the arc of the paws for the higher bench, and the changed test. The rows of the lean, of the elbows, and of the depths went to `2026-10-14-polar-fix.md`.
- [`2026-10-14-fox-flute.md`](decisions/2026-10-14-fox-flute.md): the fox mesh on the tan flute foxes with a tan palette of the same faces, the flute hold of a real flutist with a head turn of 30° and the lip plate under the long muzzle, the wind hold of a species, the roles of the flutist in the tools, the wolf as the sample body, the paused counts of the shot plans, and the changes of the scene.
- [`2026-10-14-rig-retro.md`](decisions/2026-10-14-rig-retro.md): the rig items of the retro of the form and neck rounds and four items of the retro of the flute round: the union merge of `docs/design.md`, the order of the form rounds and the hold rounds, the check of the pose code before a fit, no test that compares two bodies, the kept meters of a variant of `pnpm rig-mesh --check`, the seat of the legs, the form and the stage sides against `main`, the bones of the folds, the one-to-one faces of two trees, the rig configs in the copy of `--glb`, the stretch check, the ring radius as a part of the arm, the one-line comments of `ANIMALS`, and the tools of a commit in its probe tree with the check of the role.
- [`2026-10-14-arms-rest.md`](decisions/2026-10-14-arms-rest.md): the shorter arms of the rabbit and the red fox with the violins of the same size that the user asked for, the end of the rule of a violin shop for their size, the rings of the rabbit rig, the stretch of the red fox rig with no fade, the violins further back, so that the left paws reach the nut, the rest of the cat violas for the red fox, and the flute of the tan fox a little back from square to the face.
- [`2026-10-14-fox-rabbit-fix.md`](decisions/2026-10-14-fox-rabbit-fix.md): the fixes of the red fox and the rabbit after the list of the manager: the rest of the right arm of the rabbit, which the user found deformed, the haunch of both rigs lowered onto the seat, the upright rest violin of the red fox, the holds of both violinists fitted for less clipping, and the smoothing box of a rig, which the foxes use since `2026-10-15-fox-rig2.md`.
- [`2026-10-14-polar-fix.md`](decisions/2026-10-14-polar-fix.md): the fixes of the polar bear pianist: the shot check of the small moves in the paused list.
- [`2026-10-14-polar-fix.md`](decisions/2026-10-14-polar-fix.md): the fixes of the polar bear pianist: the longer shins of the studio with the lift of the parts above the knees, the soles on the floor, the scale at the raised keys of the studio, the knees under the keys, the changed tests, and the shot check of the small moves in the paused list.
- [`2026-10-14-polar-fix.md`](decisions/2026-10-14-polar-fix.md): the fixes of the polar bear pianist: the longer shins of the studio with the lift of the parts above the knees, the soles on the floor, the seed of the fewest folds, the scale at the raised keys of the studio, the head height of the new mesh, the changed tests, and the shot check of the small moves in the paused list.
- [`2026-10-14-polar-fix.md`](decisions/2026-10-14-polar-fix.md): the fixes of the polar bear pianist: the longer shins of the studio with the lift of the parts above the knees, the soles on the floor, the seed of the fewest folds, the scale at the raised keys of the studio, the head height of the new mesh, the piano further from the bear, the lean, the palm, and the elbows of the fit, the tries, the depths, the knees under the keys, the margin of the two-shot, the changed tests, and the shot check of the small moves in the paused list.
- [`2026-10-14-polar-fix.md`](decisions/2026-10-14-polar-fix.md): the fixes of the polar bear pianist: the longer shins of the studio with the lift of the parts above the knees, the soles on the floor, the seed of the fewest folds, the scale at the raised keys of the studio, the head height of the new mesh, the piano further from the bear, the lean, the palm, and the elbows of the fit, the tries, the depths, the knees under the keys, the margin of the two-shot, and the changed tests.
- [`2026-10-15-fox-rig2.md`](decisions/2026-10-15-fox-rig2.md): the second round of the fox rig: the smoothed back of the neck of the foxes with the head center of the holds before the smoothing, the chosen candidate of the trace tests of the shot planner, the corrective shape of the raised bow arm of the red fox with its pose and its fade, the accepted limits, and the body probe.
- [`2026-10-15-flute-rest.md`](decisions/2026-10-15-flute-rest.md): the free left paw of a wind hold in the rest pose with its arc, the flute of the tan fox upright on the right leg with the left paw on the left thigh, the left arm that hangs straight, the elbows down, the paw on a thigh of `pose/lap.ts`, and the paused tests that fail.
