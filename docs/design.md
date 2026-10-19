# Zoophony: design

This document records the design of a WebGL MIDI player for orchestral music. Low-poly animals
play the music on a small stage. The design was confirmed on 2026-10-04, before the first line
of code.

The design is the single source of truth for the product and design decisions. The facts behind
the decisions are in [`research/`](research/README.md). The text of sections 1 to 9 is in
[`design/`](design/), in one file for each section. The two-digit number at the start of a file
name is the number of its section. Thus a pointer "design X.Y" names the heading "X.Y" in the file
of section X. For example, design 4.5 is the heading "4.5 Visual values" in
`design/04-stage-cast-look.md`. Read only the files of your area.

| File | Section and scope |
|---|---|
| [`01-goals.md`](design/01-goals.md) | 1. Goals and budgets: the platform, the budgets, and the reference images |
| [`02-product.md`](design/02-product.md) | 2. Product: input, first screen, layout, play and keyboard, camera, quality tiers, privacy, and UI spec (2.1 to 2.8) |
| [`03-midi-to-seats.md`](design/03-midi-to-seats.md) | 3. From MIDI to seats: pipeline, data model, file rules, ports and channels, program map, channel 10, seats, and players (3.1 to 3.8) |
| [`04-stage-cast-look.md`](design/04-stage-cast-look.md) | 4. Stage, cast, and look: look, layout, species, models, visual values, model inventory, and rig (4.1 to 4.7) |
| [`05-animation.md`](design/05-animation.md) | 5. Animation: pose index, pose function, rest pose, instrument motion, conductor, silent seats, and camera shots (5.1 to 5.6) |
| [`06-audio.md`](design/06-audio.md) | 6. Audio: engine, SoundFont, load flow, block scheduler, seek and pause, mute and solo, clock, and interfaces (6.1 to 6.8) |
| [`07-architecture.md`](design/07-architecture.md) | 7. Architecture: modules, first download, and third-party licenses (7.1 to 7.3) |
| [`08-demos.md`](design/08-demos.md) | 8. Demos: license rules, list, changes to the files, OpenScore files, and demo tests (8.1 to 8.5) |
| [`09-process.md`](design/09-process.md) | 9. Process: repository, CI, tests, manual test, order of work, docs, targets, and reviews (9.1 to 9.8) |

## 10. Decisions to confirm

After the design session, agents decided more details, so that a fresh agent can build with no
guess. Treat each decision as decided, unless a newer decision of the user or a newer row replaces
it. A decision file in [`decisions/`](decisions/) holds the decisions of one agent session in one
table, with one row for each decision. The Section column of a row names the section of this
design that holds the decision.

- **New decisions.** An agent that decides details adds a new file
  `decisions/<YYYY-MM-DD>-<topic>.md` with the template of
  [`agents/writing.md`](agents/writing.md), and adds its line to the list below.
- **Old files.** Keep the file of another session as it is. The only change to it is the removal
  of a row that the user reversed, or that a newer decision or the code replaced.
- **Reversal.** The user can reverse each decision. Then update the section of this design that
  holds it, and remove its row. An agent that replaces a decision does the same in the commit of
  the change, and names the removed row in the commit message. When a file has no rows, delete
  it and its line below.

The decision files:

- [`2026-10-04-design-session.md`](decisions/2026-10-04-design-session.md): the design session.
- [`2026-10-05-animal-views-checks.md`](decisions/2026-10-05-animal-views-checks.md): the checks of the animal views.
- [`2026-10-05-animal-views-round-3.md`](decisions/2026-10-05-animal-views-round-3.md): the third round of the animal views.
- [`2026-10-05-animal-views.md`](decisions/2026-10-05-animal-views.md): the animal views.
- [`2026-10-05-cheerful-demos.md`](decisions/2026-10-05-cheerful-demos.md): the cheerful demos.
- [`2026-10-05-cinematic-camera.md`](decisions/2026-10-05-cinematic-camera.md): the cinematic camera.
- [`2026-10-05-conductor-cues.md`](decisions/2026-10-05-conductor-cues.md): the conductor cues.
- [`2026-10-05-count-in.md`](decisions/2026-10-05-count-in.md): the count-in.
- [`2026-10-05-manager-review-advice.md`](decisions/2026-10-05-manager-review-advice.md): the manager on the advice of a review.
- [`2026-10-05-natural-lift.md`](decisions/2026-10-05-natural-lift.md): the natural lift.
- [`2026-10-05-pose-code-audit.md`](decisions/2026-10-05-pose-code-audit.md): the pose code audit.
- [`2026-10-05-professional-seating.md`](decisions/2026-10-05-professional-seating.md): the professional seating.
- [`2026-10-05-room-and-mix.md`](decisions/2026-10-05-room-and-mix.md): the room and the mix.
- [`2026-10-05-score-build-test.md`](decisions/2026-10-05-score-build-test.md): the score build test.
- [`2026-10-05-soundfont.md`](decisions/2026-10-05-soundfont.md): the SoundFont.
- [`2026-10-05-step-2-processor.md`](decisions/2026-10-05-step-2-processor.md): the step 2 processor tasks.
- [`2026-10-05-step-2.md`](decisions/2026-10-05-step-2.md): the step 2 agent.
- [`2026-10-05-step-4-instruments.md`](decisions/2026-10-05-step-4-instruments.md): the step 4 instruments.
- [`2026-10-05-step-4-layout.md`](decisions/2026-10-05-step-4-layout.md): the step 4 layout.
- [`2026-10-05-step-4-scene-gallery.md`](decisions/2026-10-05-step-4-scene-gallery.md): the step 4 scene and gallery.
- [`2026-10-05-step-5-app-wiring.md`](decisions/2026-10-05-step-5-app-wiring.md): the step 5 app wiring.
- [`2026-10-05-step-5-motion.md`](decisions/2026-10-05-step-5-motion.md): the step 5 motion.
- [`2026-10-05-step-5-percussion-conductor.md`](decisions/2026-10-05-step-5-percussion-conductor.md): the step 5 percussion and conductor.
- [`2026-10-05-step-5-piano-harp-choir.md`](decisions/2026-10-05-step-5-piano-harp-choir.md): the step 5 piano, harp, and choir.
- [`2026-10-05-step-5-re-review-processor.md`](decisions/2026-10-05-step-5-re-review-processor.md): the processor findings of the step 5 re-review.
- [`2026-10-05-step-5-review-fixes.md`](decisions/2026-10-05-step-5-review-fixes.md): the fixes of the step 5 review.
- [`2026-10-05-step-5-winds-brass.md`](decisions/2026-10-05-step-5-winds-brass.md): the step 5 winds and brass.
- [`2026-10-05-step-6-bar-first-screen.md`](decisions/2026-10-05-step-6-bar-first-screen.md): the step 6 bar, first screen, and demo list.
- [`2026-10-05-step-6-credits-messages-keys.md`](decisions/2026-10-05-step-6-credits-messages-keys.md): the step 6 credits, messages, keys, and phone layout.
- [`2026-10-05-step-6-file-seats-settings.md`](decisions/2026-10-05-step-6-file-seats-settings.md): the step 6 file button, seat list, and settings.
- [`2026-10-05-step-6-re-review-fixes.md`](decisions/2026-10-05-step-6-re-review-fixes.md): the fixes of the step 6 re-review.
- [`2026-10-05-step-6-review-fixes.md`](decisions/2026-10-05-step-6-review-fixes.md): the fixes of the step 6 review.
- [`2026-10-05-step-7-tests-deploy.md`](decisions/2026-10-05-step-7-tests-deploy.md): the step 7 tests and deploy.
- [`2026-10-06-arm-and-hand-contact.md`](decisions/2026-10-06-arm-and-hand-contact.md): the join of the arm and the torso, and the hands on the bowed strings.
- [`2026-10-06-beam-clear-view.md`](decisions/2026-10-06-beam-clear-view.md): the beam that keeps the orchestra clear.
- [`2026-10-06-beam-to-stage.md`](decisions/2026-10-06-beam-to-stage.md): the beam that reaches the stage and keeps the players clear.
- [`2026-10-06-chamber-groups.md`](decisions/2026-10-06-chamber-groups.md): the chamber groups with no conductor.
- [`2026-10-06-choir-shots.md`](decisions/2026-10-06-choir-shots.md): the choir as a subject of the shots.
- [`2026-10-06-conductor-left-arm.md`](decisions/2026-10-06-conductor-left-arm.md): the conductor stand, and the left arm of the conductor.
- [`2026-10-06-fur-shading.md`](decisions/2026-10-06-fur-shading.md): the crease normals and the baked occlusion.
- [`2026-10-06-joyful-ode.md`](decisions/2026-10-06-joyful-ode.md): the joyful excerpt of the Ode to Joy.
- [`2026-10-06-planner-stability.md`](decisions/2026-10-06-planner-stability.md): the shot planner that stays stable against small moves of the players.
- [`2026-10-06-polar-bear-pianist.md`](decisions/2026-10-06-polar-bear-pianist.md): the polar bear at the piano.
- [`2026-10-06-polished-camera.md`](decisions/2026-10-06-polished-camera.md): the camera of the polished look.
- [`2026-10-06-polished-cast.md`](decisions/2026-10-06-polished-cast.md): the animals and the instruments of the polished reference images.
- [`2026-10-06-polished-look.md`](decisions/2026-10-06-polished-look.md): the hall, the stage, the light, the beam, and the post effects of the polished look.
- [`2026-10-06-polished-ui.md`](decisions/2026-10-06-polished-ui.md): the UI of the polished mockup.
- [`2026-10-06-portrait-soloist.md`](decisions/2026-10-06-portrait-soloist.md): the portrait view and the soloist.
- [`2026-10-06-rest-arms-and-bow.md`](decisions/2026-10-06-rest-arms-and-bow.md): the rest pose with held arms, and the bow stick in the fingers.
- [`2026-10-06-skinned-bodies.md`](decisions/2026-10-06-skinned-bodies.md): the skin of two bones at a joint, and the cute bodies that stay.
- [`2026-10-06-step-8-review-fixes.md`](decisions/2026-10-06-step-8-review-fixes.md): the fixes of the review of step 8.
- [`2026-10-06-ux-audit-2-layout-score-choir.md`](decisions/2026-10-06-ux-audit-2-layout-score-choir.md): the layout, score, and choir findings of the second UX audit.
- [`2026-10-06-ux-audit-2-shots.md`](decisions/2026-10-06-ux-audit-2-shots.md): the shot composition findings of the second UX audit.
- [`2026-10-06-ux-audit-2-ui.md`](decisions/2026-10-06-ux-audit-2-ui.md): the UI findings of the second UX audit.
- [`2026-10-06-ux-audit-camera-stage.md`](decisions/2026-10-06-ux-audit-camera-stage.md): the camera and stage findings of the UX audit.
- [`2026-10-06-ux-audit-manager.md`](decisions/2026-10-06-ux-audit-manager.md): the manager on the UX audit.
- [`2026-10-06-ux-audit-sound.md`](decisions/2026-10-06-ux-audit-sound.md): the sound findings of the UX audit.
- [`2026-10-06-ux-audit-ui-app-flow.md`](decisions/2026-10-06-ux-audit-ui-app-flow.md): the UI and app flow findings of the UX audit.
- [`2026-10-07-anatomy-track.md`](decisions/2026-10-07-anatomy-track.md): the rest places of the instruments on the lap.
- [`2026-10-07-blender-sculpts.md`](decisions/2026-10-07-blender-sculpts.md): the step of a packed coordinate, and the light of the views page.
- [`2026-10-07-camera-angle.md`](decisions/2026-10-07-camera-angle.md): the target of the default view.
- [`2026-10-07-camera-bugs.md`](decisions/2026-10-07-camera-bugs.md): the zoom of the first screen, the near orbit limit, and the focus of Free mode.
- [`2026-10-07-cast-colors.md`](decisions/2026-10-07-cast-colors.md): the species colors in `models/colors.ts`.
- [`2026-10-07-conductor-pose.md`](decisions/2026-10-07-conductor-pose.md): the raised arms of the conductor.
- [`2026-10-07-credits-modal.md`](decisions/2026-10-07-credits-modal.md): the link "Credits" and its modal dialog.
- [`2026-10-07-entry-shots.md`](decisions/2026-10-07-entry-shots.md): the cuts at an entry.
- [`2026-10-07-neck-seams.md`](decisions/2026-10-07-neck-seams.md): the dark seams at the neck, and the short muzzle of the bear.
- [`2026-10-07-play-clearance.md`](decisions/2026-10-07-play-clearance.md): the arms of the playing pose that stay out of the body.
- [`2026-10-07-proportions.md`](decisions/2026-10-07-proportions.md): the proportions of each species.
- [`2026-10-07-rest-clearance.md`](decisions/2026-10-07-rest-clearance.md): the arms of the rest pose that stay out of the body.
- [`2026-10-07-scene-details.md`](decisions/2026-10-07-scene-details.md): the stage wood, the hall lamps, and the inside of the open piano.
- [`2026-10-07-scene-latest.md`](decisions/2026-10-07-scene-latest.md): the default view, the stage, the podium, and the risers of `orchestra-latest.png`.
- [`2026-10-07-scene-polish.md`](decisions/2026-10-07-scene-polish.md): the light from behind, the walnut stage, the hall lamps, and the beam shaft.
- [`2026-10-07-spotlight-pool.md`](decisions/2026-10-07-spotlight-pool.md): the pool of the stage lights.
- [`2026-10-07-spotlight.md`](decisions/2026-10-07-spotlight.md): the pool of the key light, and the spotlight on the soloed seats.
- [`2026-10-07-title-shade.md`](decisions/2026-10-07-title-shade.md): the shade of each title line.
- [`2026-10-08-cleanup.md`](decisions/2026-10-08-cleanup.md): the tests and the design rules that pinned tuned values or the old body.
- [`2026-10-08-fox-arms.md`](decisions/2026-10-08-fox-arms.md): the bow arm of the violin and the sheet moment.
- [`2026-10-08-fox-feet.md`](decisions/2026-10-08-fox-feet.md): the test of the feet of each seated body.
- [`2026-10-08-spike-fox-gated.md`](decisions/2026-10-08-spike-fox-gated.md): the silhouette gate of a model against the matte of its sheet.
- [`2026-10-08-views-page.md`](decisions/2026-10-08-views-page.md): the views page of each model sheet, and the sheet poses.
- [`2026-10-09-body-revert.md`](decisions/2026-10-09-body-revert.md): the revert of the animal bodies to 2026-10-06 18:58.
- [`2026-10-09-test-trim.md`](decisions/2026-10-09-test-trim.md): the removal of the meerkat, and the split of the slow tests.
- [`2026-10-10-arms-close.md`](decisions/2026-10-10-arms-close.md): the arms of the players close to the body and the instruments.
- [`2026-10-10-bear-body.md`](decisions/2026-10-10-bear-body.md): the conductor of `bear-views.png`: the baton, the holds, and the podium.
- [`2026-10-10-bear-glb.md`](decisions/2026-10-10-bear-glb.md): the bear from the rigged GLB file of the user, and `pnpm glb-init`.
- [`2026-10-10-fox-body.md`](decisions/2026-10-10-fox-body.md): the silhouette check of the sheet page of the fox.
- [`2026-10-10-glb-skins.md`](decisions/2026-10-10-glb-skins.md): the skins of the rigged rabbit and bear.
- [`2026-10-10-rabbit-glb.md`](decisions/2026-10-10-rabbit-glb.md): the packer of the rigged GLB file of the rabbit.
- [`2026-10-10-rabbit-knees.md`](decisions/2026-10-10-rabbit-knees.md): the seated knees of the rabbit.
- [`2026-10-10-rabbit-sheet.md`](decisions/2026-10-10-rabbit-sheet.md): the rabbit of `rabbit-views.png`.
- [`2026-10-10-reference-target.md`](decisions/2026-10-10-reference-target.md): the reference images as the target of the animal bodies.
- [`2026-10-10-trim.md`](decisions/2026-10-10-trim.md): the trim audit of 2026-10-10.
- [`2026-10-11-body-revert.md`](decisions/2026-10-11-body-revert.md): the second revert of the animal bodies to 2026-10-06 18:58.
- [`2026-10-11-low-seats.md`](decisions/2026-10-11-low-seats.md): the low seats and the stools that the user decided.
- [`2026-10-11-penguin-body.md`](decisions/2026-10-11-penguin-body.md): the egg body of the penguin, and `pnpm choir-check`.
- [`2026-10-11-short-legs.md`](decisions/2026-10-11-short-legs.md): the short legs of the reference images.
- [`2026-10-12-studio-bear.md`](decisions/2026-10-12-studio-bear.md): the studio bear of `lowpoly-studio/` as the conductor.
- [`2026-10-12-studio-polar-bear.md`](decisions/2026-10-12-studio-polar-bear.md): the studio polar bear of `lowpoly-studio/` as the pianist.
- [`2026-10-13-frame-time.md`](decisions/2026-10-13-frame-time.md): the GPU time of the frame target in a Metal System Trace.
- [`2026-10-13-frame-tools.md`](decisions/2026-10-13-frame-tools.md): the guards and the checks of `pnpm frame`.
- [`2026-10-13-mesh-rabbit.md`](decisions/2026-10-13-mesh-rabbit.md): the rabbit mesh of the user as the violinist, rigged as a studio body.
- [`2026-10-13-pianist-lap.md`](decisions/2026-10-13-pianist-lap.md): the rest pose of the pianist as a real pianist before a performance.
- [`2026-10-13-pianist-rest.md`](decisions/2026-10-13-pianist-rest.md): the rest lean of the hold of the piano and the harp.
- [`2026-10-13-role-sweep.md`](decisions/2026-10-13-role-sweep.md): the sweep of the clearance tests of each role.
- [`2026-10-13-straight-baton.md`](decisions/2026-10-13-straight-baton.md): the straight baton of the two newest reference images.
- [`2026-10-13-studio-rabbit.md`](decisions/2026-10-13-studio-rabbit.md): the studio rabbit of `lowpoly-studio/` as the violinist.
- [`2026-10-14-animal-size.md`](decisions/2026-10-14-animal-size.md): the larger red fox and rabbit that the user asked for.
- [`2026-10-14-arms-rest.md`](decisions/2026-10-14-arms-rest.md): the shorter arms of the rabbit and the red fox.
- [`2026-10-14-cheerful-demos.md`](decisions/2026-10-14-cheerful-demos.md): the curated cheerful pieces, and the demos 7 to 14.
- [`2026-10-14-fox-flute.md`](decisions/2026-10-14-fox-flute.md): the fox mesh on the tan flute foxes.
- [`2026-10-14-fox-rabbit-fix.md`](decisions/2026-10-14-fox-rabbit-fix.md): the fixes of the red fox and the rabbit.
- [`2026-10-14-fox-rabbit-form.md`](decisions/2026-10-14-fox-rabbit-form.md): the larger head and the longer legs of the red fox and the rabbit.
- [`2026-10-14-mesh-fox.md`](decisions/2026-10-14-mesh-fox.md): the fox mesh of the user on the red violin foxes.
- [`2026-10-14-mesh-rig-retro.md`](decisions/2026-10-14-mesh-rig-retro.md): the retro items of the rabbit mesh rig.
- [`2026-10-14-neck-violin.md`](decisions/2026-10-14-neck-violin.md): the short neck of the red fox, and the violins at the neck.
- [`2026-10-14-polar-bench.md`](decisions/2026-10-14-polar-bench.md): the bench of the polar bear pianist.
- [`2026-10-14-polar-fix.md`](decisions/2026-10-14-polar-fix.md): the fixes of the polar bear pianist.
- [`2026-10-14-probe-retro.md`](decisions/2026-10-14-probe-retro.md): the probe items of the retro of the form and neck rounds.
- [`2026-10-14-rabbit-smooth.md`](decisions/2026-10-14-rabbit-smooth.md): the smooth normals of the studio bodies with a crease angle for each body.
- [`2026-10-14-review-rule.md`](decisions/2026-10-14-review-rule.md): the review rule of 2026-10-14.
- [`2026-10-14-rig-retro.md`](decisions/2026-10-14-rig-retro.md): the rig items of the retros of the form, neck, and flute rounds.
- [`2026-10-14-size-retro.md`](decisions/2026-10-14-size-retro.md): the retro items of the size round.
- [`2026-10-14-smooth-retro.md`](decisions/2026-10-14-smooth-retro.md): the retro items of the smooth studio bodies.
- [`2026-10-14-test-pause.md`](decisions/2026-10-14-test-pause.md): the pause of the tests of the look, the fit, and the clearance of the bodies.
- [`2026-10-15-fit-retro.md`](decisions/2026-10-15-fit-retro.md): the tool items of the retro of the fix waves.
- [`2026-10-15-flute-rest.md`](decisions/2026-10-15-flute-rest.md): the free left paw of a wind hold in the rest pose.
- [`2026-10-15-fox-rig2.md`](decisions/2026-10-15-fox-rig2.md): the second round of the fox rig.
- [`2026-10-15-pea-eyes.md`](decisions/2026-10-15-pea-eyes.md): the pea eyes on the studio bodies.
- [`2026-10-16-all-tests-pause.md`](decisions/2026-10-16-all-tests-pause.md): the pause of all tests.
- [`2026-10-16-bow-rest.md`](decisions/2026-10-16-bow-rest.md): the upright rest of the violin and the bow of the seated rabbit and red fox.
- [`2026-10-16-cat-form.md`](decisions/2026-10-16-cat-form.md): the form of the cat.
- [`2026-10-16-cat-seat.md`](decisions/2026-10-16-cat-seat.md): the seated cat and the standing bow.
- [`2026-10-16-cat-trunk.md`](decisions/2026-10-16-cat-trunk.md): the shorter trunk of the cat.
- [`2026-10-16-close-modes.md`](decisions/2026-10-16-close-modes.md): the modes `species` and `play` of `pnpm close-views`.
- [`2026-10-16-fit-rest.md`](decisions/2026-10-16-fit-rest.md): the rest mode `--sets` of `pnpm hold-fit`.
- [`2026-10-16-fox-brow.md`](decisions/2026-10-16-fox-brow.md): the black mark above the left eye of the fox.
- [`2026-10-16-hip-open.md`](decisions/2026-10-16-hip-open.md): the seated posture of the red fox and the rabbit.
- [`2026-10-16-mesh-cat.md`](decisions/2026-10-16-mesh-cat.md): the cat mesh of the user as the viola cat.
- [`2026-10-16-no-review.md`](decisions/2026-10-16-no-review.md): the end of the review agents.
- [`2026-10-16-pose-index.md`](decisions/2026-10-16-pose-index.md): the pose index at the top of design 5.
- [`2026-10-16-rabbit-arm.md`](decisions/2026-10-16-rabbit-arm.md): the right arm of the seated rabbit in the rest.
- [`2026-10-16-retro-arm.md`](decisions/2026-10-16-retro-arm.md): the tool changes of the retros of the rounds rabbit-arm and cat-trunk.
- [`2026-10-16-retro-cat.md`](decisions/2026-10-16-retro-cat.md): the tool changes of the retro of the cat round.
- [`2026-10-16-retro-seat.md`](decisions/2026-10-16-retro-seat.md): the tool changes of the retro of the round cat-seat, and `pnpm docs-species`.
- [`2026-10-16-review-views.md`](decisions/2026-10-16-review-views.md): the moves of the gallery and of `pnpm close-views`.
- [`2026-10-16-seat-rest.md`](decisions/2026-10-16-seat-rest.md): the seats of the rabbit and the red fox that fit their legs.
- [`2026-10-16-views-batch.md`](decisions/2026-10-16-views-batch.md): the mode `batch` of `pnpm close-views`.
- [`2026-10-17-bow-arm.md`](decisions/2026-10-17-bow-arm.md): the bow arm of the string players.
- [`2026-10-17-cat-bow.md`](decisions/2026-10-17-cat-bow.md): the bow hold of the cat.
- [`2026-10-17-cat-hand.md`](decisions/2026-10-17-cat-hand.md): the left arm of the cat violist in high positions.
- [`2026-10-17-cat-look.md`](decisions/2026-10-17-cat-look.md): the slim arms and the rest of the cat.
- [`2026-10-17-design-condense.md`](decisions/2026-10-17-design-condense.md): the condensed design files.
- [`2026-10-17-docs-length.md`](decisions/2026-10-17-docs-length.md): the length of the docs, and the modules of `docs/agents/`.
- [`2026-10-17-dog-arms.md`](decisions/2026-10-17-dog-arms.md): the arms, the cello size, and the tail of the dog.
- [`2026-10-17-dog-folds.md`](decisions/2026-10-17-dog-folds.md): the corrective shapes of the dog cellist.
- [`2026-10-17-dog-rest.md`](decisions/2026-10-17-dog-rest.md): the rest of the dog cellist.
- [`2026-10-17-dog-tail.md`](decisions/2026-10-17-dog-tail.md): the thin hanging tail of the dog.
- [`2026-10-17-fox-form.md`](decisions/2026-10-17-fox-form.md): the seated posture of the red fox, the tan fox, and the rabbit.
- [`2026-10-17-grip-all.md`](decisions/2026-10-17-grip-all.md): the bow grip of the red fox and the rabbit.
- [`2026-10-17-left-hand.md`](decisions/2026-10-17-left-hand.md): the left hand of the violin, the viola, the cello, and the contrabass.
- [`2026-10-17-mesh-dog.md`](decisions/2026-10-17-mesh-dog.md): the dog mesh of the user as the cellist.
- [`2026-10-17-multi-shape.md`](decisions/2026-10-17-multi-shape.md): the corrective shapes of the kind `raise` in a mesh rig.
- [`2026-10-17-rabbit-pose.md`](decisions/2026-10-17-rabbit-pose.md): the rabbit from the side and from behind.
- [`2026-10-17-string-hands.md`](decisions/2026-10-17-string-hands.md): the hands of the string players, and `docs/reference/string-technique.md`.
- [`2026-10-17-tan-rest.md`](decisions/2026-10-17-tan-rest.md): the rest of the tan fox.
- [`2026-10-18-body-shade.md`](decisions/2026-10-18-body-shade.md): the narrow side lights, their shadows on the players, and the fill light of the players.
- [`2026-10-18-key-beam.md`](decisions/2026-10-18-key-beam.md): the far key light at the back right, and the beam as its fan.
- [`2026-10-18-light-color.md`](decisions/2026-10-18-light-color.md): the colors of the lights, the amber wood, the floor shadows, and the haze.
- [`2026-10-18-cinematic-light.md`](decisions/2026-10-18-cinematic-light.md): the look lab, the floor, the grade, the bake of the props, the captured environment, the shot light, the lens, and the room haze.
- [`2026-10-18-mesh-panda.md`](decisions/2026-10-18-mesh-panda.md): the panda mesh of the user as the trombonist.
- [`2026-10-18-mesh-retro.md`](decisions/2026-10-18-mesh-retro.md): the retro of the panda mesh round, the probes of the real body in phase 1, and `pnpm mesh-options`.
- [`2026-10-18-panda-folds.md`](decisions/2026-10-18-panda-folds.md): the folds of the left shoulder of the panda and the reference white of its fur.
- [`2026-10-18-panda-face.md`](decisions/2026-10-18-panda-face.md): the round eye patches and the thin smile line of the panda.
- [`2026-10-18-panda-marks.md`](decisions/2026-10-18-panda-marks.md): the light border of the black band under the arms of the panda, and the gray streaks and the shadows that stay.
- [`2026-10-18-wind-technique.md`](decisions/2026-10-18-wind-technique.md): the reference of the wind and brass technique, and the motion spec of the trombone of the panda.
- [`2026-10-18-slide-notes.md`](decisions/2026-10-18-slide-notes.md): the brass partials with no seventh partial, and the real spacing of the trombone slide positions.
- [`2026-10-18-horn-fundamental.md`](decisions/2026-10-18-horn-fundamental.md): the fundamental F1 of the horn, and the partials of the single F horn chart.
- [`2026-10-18-back-light.md`](decisions/2026-10-18-back-light.md): the back-row lights, and the reach of the pool of the stage lights toward the back rows.
- [`2026-10-18-trombone-fit.md`](decisions/2026-10-18-trombone-fit.md): the slide angle of the panda trombone, and the forward turn of the left shoulder that it needs.
- [`2026-10-18-check-tools.md`](decisions/2026-10-18-check-tools.md): the temporary worktree of the commit checks, and the Cinematic and shot frames of `pnpm close-views play`.
- [`2026-10-18-look-tools.md`](decisions/2026-10-18-look-tools.md): the look override of the dev server, `pnpm look-variants`, `pnpm light-probe`, and the regions of the camera `default` of `pnpm look-lab`.
- [`2026-10-18-mesh-hippo.md`](decisions/2026-10-18-mesh-hippo.md): the hippo mesh of the user, which stands at the contrabass, its size, arms, legs, eyes, nose, and colors, the smaller contrabass and its hold, and the open folds.
- [`2026-10-18-hippo-arm.md`](decisions/2026-10-18-hippo-arm.md): the far side of the roll of the bow paw of the hippo, so that the paw does not flip at a string change.
- [`2026-10-19-mesh-mouse.md`](decisions/2026-10-19-mesh-mouse.md): the mouse mesh of the user as the oboist, its arms, legs, nose, colors, and tail on the floor, and the oboe in the mouth with the elbows down.
- [`2026-10-19-mesh-elephant.md`](decisions/2026-10-19-mesh-elephant.md): the elephant mesh of the user, which stands at the timpani, its size, arms, legs, trunk, ears, and colors, the place of the kettles, the playing spot and the hands of the timpani, and the open folds.
- [`2026-10-19-mesh-retro.md`](decisions/2026-10-19-mesh-retro.md): the retro of the mouse and elephant mesh rounds, the tool of the corrective shapes, the fast checks of a hold fit, and the tip of the nose near the middle plane.
- [`2026-10-19-mouse-size.md`](decisions/2026-10-19-mouse-size.md): the mouse at the size of the parametric mouse, its smaller oboe, the deeper reed, and the rest of the oboe.
