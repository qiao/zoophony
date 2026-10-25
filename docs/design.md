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

| File                                                    | Section and scope                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`01-goals.md`](design/01-goals.md)                     | 1. Goals and budgets: the platform, the budgets, and the reference images                                                             |
| [`02-product.md`](design/02-product.md)                 | 2. Product: input, first screen, layout, play and keyboard, camera, quality tiers, privacy, and UI spec (2.1 to 2.8)                  |
| [`03-midi-to-seats.md`](design/03-midi-to-seats.md)     | 3. From MIDI to seats: pipeline, data model, file rules, ports and channels, program map, channel 10, seats, and players (3.1 to 3.8) |
| [`04-stage-cast-look.md`](design/04-stage-cast-look.md) | 4. Stage, cast, and look: look, layout, species, models, visual values, model inventory, and rig (4.1 to 4.7)                         |
| [`05-animation.md`](design/05-animation.md)             | 5. Animation: pose index, pose function, rest pose, instrument motion, conductor, silent seats, and camera shots (5.1 to 5.6)         |
| [`06-audio.md`](design/06-audio.md)                     | 6. Audio: engine, SoundFont, load flow, block scheduler, seek and pause, mute and solo, clock, and interfaces (6.1 to 6.8)            |
| [`07-architecture.md`](design/07-architecture.md)       | 7. Architecture: modules, first download, and third-party licenses (7.1 to 7.3)                                                       |
| [`08-demos.md`](design/08-demos.md)                     | 8. Demos: license rules, list, changes to the files, OpenScore files, and demo tests (8.1 to 8.5)                                     |
| [`09-process.md`](design/09-process.md)                 | 9. Process: repository, CI, tests, manual test, order of work, docs, targets, and reviews (9.1 to 9.8)                                |

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
- [`2026-10-11-penguin-body.md`](decisions/2026-10-11-penguin-body.md): the beak snout that left the biped, and the gallery views of `pnpm choir-check`.
- [`2026-10-11-short-legs.md`](decisions/2026-10-11-short-legs.md): the short legs of the reference images.
- [`2026-10-12-studio-bear.md`](decisions/2026-10-12-studio-bear.md): the studio bear of `lowpoly-studio/` as the conductor, and the retarget of the studio bodies.
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
- [`2026-10-18-mesh-hippo.md`](decisions/2026-10-18-mesh-hippo.md): the hippo mesh of the user, which stands at the contrabass, its size, arms, legs, eyes, nose, and colors, the smaller contrabass and its hold, and the open depths of the arms.
- [`2026-10-18-hippo-arm.md`](decisions/2026-10-18-hippo-arm.md): the far side of the roll of the bow paw of the hippo, so that the paw does not flip at a string change.
- [`2026-10-19-mesh-mouse.md`](decisions/2026-10-19-mesh-mouse.md): the mouse mesh of the user as the oboist, its arms, legs, nose, colors, and tail on the floor, and the oboe in the mouth with the elbows down.
- [`2026-10-19-mesh-elephant.md`](decisions/2026-10-19-mesh-elephant.md): the elephant mesh of the user, which stands at the timpani, its size, arms, legs, trunk, ears, and colors, the place of the kettles, the playing spot and the hands of the timpani, and the open folds.
- [`2026-10-19-mesh-retro.md`](decisions/2026-10-19-mesh-retro.md): the retro of the mouse and elephant mesh rounds, the tool of the corrective shapes, the fast checks of a hold fit, and the tip of the nose near the middle plane.
- [`2026-10-19-mouse-size.md`](decisions/2026-10-19-mouse-size.md): the mouse at the size of the parametric mouse, its smaller oboe, the deeper reed, and the rest shape of the left arm.
- [`2026-10-19-fox-red.md`](decisions/2026-10-19-fox-red.md): the redder orange fur of the red fox, the color shift of a rig with its gamut limit, the tan palette from the texture colors, and the new fur color of the red fox.
- [`2026-10-19-hippo-chest.md`](decisions/2026-10-19-hippo-chest.md): the upper bout of the contrabass in front of the chest of the hippo, the clavicle weights of the middle of its chest, the shape of its bow arm, and the shoulder turn and the left paw tilt that bring its arms back.
- [`2026-10-19-hippo-retro.md`](decisions/2026-10-19-hippo-retro.md): the retro of the hippo chest round, the instrument in the body in the sweep of each held role, the camera and the cell size of the close views of a role, the new keys and the watched faces of `pnpm rig-mesh --check`, the samples over a goal of `pnpm pose-depth`, the named faces of `pnpm hold-fit`, and the cached base row of `pnpm pose-depth --set`.
- [`2026-10-19-mesh-pig.md`](decisions/2026-10-19-mesh-pig.md): the pig mesh of the user as the hornist, at the size of the parametric pig, the arms that the user chose, the horn hold turned back toward the body, the rest on the belly, the shapes, and the open folds of the right hoof at rest.
- [`2026-10-19-mesh-beaver.md`](decisions/2026-10-19-mesh-beaver.md): the beaver mesh of the user as the bassoonist, its size, arms, smaller bassoon, and tail, the beaver with no chair, and the cut of its armpits.
- [`2026-10-19-winds-retro.md`](decisions/2026-10-19-winds-retro.md): the retro of the beaver and pig mesh rounds, the tuples and turns of `--set`, the one list of the scaled instruments, the ready raise entry, the plan of a sweep, the wind grips of a hold fit, the Blender error, the paired watch, the close-view pairs, the git repository of a probe tree, the most folded faces of a hold fit, the close-view variants, and the base faces of a fold probe.
- [`2026-10-19-hippo-arms.md`](decisions/2026-10-19-hippo-arms.md): the twisted arms of the hippo bassist, the cut of its armpits, its level elbows, the shapes of its level bow arm, bent right elbow, and bent left wrist, the fade of its arm weights into the neck, and the rigid faces of its arms.
- [`2026-10-19-elephant-arms.md`](decisions/2026-10-19-elephant-arms.md): the round arms of the elephant timpanist, the mallet home, the arm cut, and the ring.
- [`2026-10-19-arms-retro.md`](decisions/2026-10-19-arms-retro.md): the retro of the elephant arm rounds, the probe query of the gallery and `--probe` of the close views, the stage camera at one player, the twist and the swing of the paws in a hold fit, and the phase of each deepest point of a sweep.
- [`2026-10-19-cut-caps.md`](decisions/2026-10-19-cut-caps.md): the normals of the caps of the arm cut from the skin around them, for the hippo, the elephant, and the beaver, the old normals of the panda, and the open light slivers at the right shoulder of the hippo.
- [`2026-10-19-arm-skin.md`](decisions/2026-10-19-arm-skin.md): the measure of the twist and the collapse of the arm skin, the twist bone of the upper arm and the lower elbows that the user chose for the hippo and the elephant, the rejected dual quaternion blend, and the elephant with no rigid face.
- [`2026-10-19-elephant-pose.md`](decisions/2026-10-19-elephant-pose.md): the pose of the elephant timpanist that the user chose from the reference images, the kettles of the real size and their height, the two front kettles, the strike 0.25 m in from the rim, and the rest over the kettles.
- [`2026-10-19-arm-gate.md`](decisions/2026-10-19-arm-gate.md): the arm gate `pnpm arm-check`, its measures and its limits from the good arms, the accepted grips of the paws, the stretch from the rest, the verdicts against the base, the merge that runs it, the cache of the working tree, and the views of its crop pairs.
- [`2026-10-19-elephant-grip.md`](decisions/2026-10-19-elephant-grip.md): the reference of the timpani technique, the grip of the elephant with the head out of the front of the fist, the mallets forward and in, the lift of the wrist between strikes, and the homes out from the shoulders.
- [`2026-10-20-mesh-wolf.md`](decisions/2026-10-20-mesh-wolf.md): the wolf mesh of the user as the clarinetist, at the seated height of the orchestra images, its arms, legs, chair, tail, colors, and face, the clarinet hold with the mouthpiece under the muzzle, and the rigid faces.
- [`2026-10-20-mesh-badger.md`](decisions/2026-10-20-mesh-badger.md): the badger mesh of the user as the percussion player, at the size of the parametric badger, its arms, colors, and face, the percussion test score of the probes, the holds of the bass drum, the snare drum, and the small percussion, and the open xylophone.
- [`2026-10-20-badger-cymbals.md`](decisions/2026-10-20-badger-cymbals.md): the scale and the turn of hand cymbals, the scan of hand cymbals on the badger, and the suspended cymbal of the badger with its stand, its yarn mallets, its spots opposite each other, and its homes.
- [`2026-10-20-grip-tools.md`](decisions/2026-10-20-grip-tools.md): the retro of round elephant-grip, the one fit demo of a role with no demo of `FIT_DEMOS`, the explain of a measure of the arm gate, the child that failed first in a probe beside a commit, and several `--set` variants of the play frames from one build.
- [`2026-10-20-mesh-tools.md`](decisions/2026-10-20-mesh-tools.md): the retro of round mesh-wolf, the ready grip entry of the arm gate, the warning of the dark faces of a mesh rig, the tail gaps of the rig check, and the face crops of the close views.
- [`2026-10-20-wolf-shape.md`](decisions/2026-10-20-wolf-shape.md): the wolf 0.9 times as high and 1.2 times as wide that the user asked for, with the head at its size, the proportions rule of a mesh rig and its head keep, the conflict with the size of the orchestra images, the joints, the arms, the chair, the tail, and the rigid faces of the new form.
- [`2026-10-20-wolf-face.md`](decisions/2026-10-20-wolf-face.md): the head of the wolf at the size of the head of the red fox with a smaller body, the head factor of the proportions rule, the clarinet hold for the larger head, and the happy face: level brows, level pea eyes, and a thin smile line.
- [`2026-10-20-camera-lower.md`](decisions/2026-10-20-camera-lower.md): the default view and the Cinematic shots that the user asked to be slightly lower, and the conflict with the camera of `orchestra-latest.png`.
- [`2026-10-20-armpits.md`](decisions/2026-10-20-armpits.md): the cut of the arm seams of the rabbit with its trunk weights and its shape of the bow arm, the wider play shape of the right arm of the pig, and the right palm of the hornist just inside the bell.
- [`2026-10-20-pea-eyes.md`](decisions/2026-10-20-pea-eyes.md): the pea eyes of the studio bodies bent to the head surface, their middle on the surface, and the light on the front of a bent eye.
- [`2026-10-20-bear-eyes.md`](decisions/2026-10-20-bear-eyes.md): the bear pea eyes moved out and down to a part of the face with less fold, bent to the head, and the end of the flat pea eyes.
- [`2026-10-20-cat-left-arm.md`](decisions/2026-10-20-cat-left-arm.md): the left paw of the cat violist tilted further over the neck, so that it curls around the neck and the wrist skin does not twist into a band, the rigid faces of its wrist, and the open fifth position.
- [`2026-10-20-mesh-monkey.md`](decisions/2026-10-20-mesh-monkey.md): the monkey mesh of the user as the trumpet player, at 1.1 times the size of the parametric monkey, its arms, colors, the smile line of its face, no chair, and its trumpet hold with a smaller trumpet.
- [`2026-10-21-monkey-stand.md`](decisions/2026-10-21-monkey-stand.md): the stand of the trumpet monkey with no chair, with its center of mass over the middle of its soles: the legs under the hips, the forward lean of the trunk, the round haunch with no sit rule, and the tail on the floor.
- [`2026-10-21-mesh-rhino.md`](decisions/2026-10-21-mesh-rhino.md): the rhino mesh of the user as the tuba player, standing in each seat at the size of the parametric rhino, with the arms of the mesh, the free arm and the cut of the seam, a twist bone of each upper arm, the mouth under the horn, and its tuba hold with a longer lead pipe.
- [`2026-10-21-mesh-deer.md`](decisions/2026-10-21-mesh-deer.md): the deer mesh of the user as the harp player, at 1.2 times the size of the parametric deer, on the stool of the harp with its whole haunch on the seat, with arms 1.25, a smaller harp upright in front of the chest, and its harp hold.
- [`2026-10-21-mesh-penguin.md`](decisions/2026-10-21-mesh-penguin.md): the penguin mesh of the user as the choir singer on its riser in place of the egg body, at the head top of the egg penguin, with the flippers of the mesh, the folder within the reach of the flippers, and the white throat.
- [`2026-10-21-penguin-beak.md`](decisions/2026-10-21-penguin-beak.md): the beak of the penguin that opens with each note: the split beak of a copy of the mesh, the optional jaw bone of a studio body, the opening of 50°, and the head lift of 15°.
- [`2026-10-21-tool-speedups.md`](decisions/2026-10-21-tool-speedups.md): `--glb` of `pnpm pose-depth` and `pnpm hold-fit` in the copy of the glb swap, and the variants of `pnpm arm-check` in parallel children.
- [`2026-10-21-rabbit-armpit.md`](decisions/2026-10-21-rabbit-armpit.md): the soft normals and the fair copy of the mesh at the notch under the right armpit of the rabbit, the soft normals of the left arm seam, a twist bone of each upper arm, and the shadow of the arm at the seam.
- [`2026-10-21-stage-exposure.md`](decisions/2026-10-21-stage-exposure.md): the exposure of the stage, the soft shoulder of the grade, the smaller pool of light, the darker planks, the beam, the fill of the floor, and the softer shadows of the players.
- [`2026-10-21-demo-loudness.md`](decisions/2026-10-21-demo-loudness.md): the values of the demo loudness from `pnpm loudness`, the target of -16 LUFS of AES TD1008, the limiter at -3 dBFS, and the range rule of the soft demos that waits for the user.
- [`2026-10-21-hold-tools.md`](decisions/2026-10-21-hold-tools.md): `pnpm hold-scan` with its score and its reuse of the plans, and `--per-bone`, `--every`, and `--where` of `pnpm pose-depth`.
- [`2026-10-21-hippo-bass.md`](decisions/2026-10-21-hippo-bass.md): the limit of a held instrument in the body in the sweep, and the place of the contrabass of the hippo out of its belly.
- [`2026-10-21-hippo-bass-arms.md`](decisions/2026-10-21-hippo-bass-arms.md): the pizzicato of the hippo from the side of the fingerboard, the end of the stops of its left paw before the upper bout, and the wrist of its left paw on the neck.
- [`2026-10-21-wrist-lift.md`](decisions/2026-10-21-wrist-lift.md): the side of the bow mix in the lift and the lowering, the twist limit of the baton turn of the conductor, the move measures of the arm gate, and the open left paw of the violins and the viola.
- [`2026-10-21-beat-fold.md`](decisions/2026-10-21-beat-fold.md): the conducted beats of a fast 4/x, 9/8, and 12/8, the felt pulse of the sway, and the limits of `pnpm beat-rates`.
- [`2026-10-21-pirates-clip.md`](decisions/2026-10-21-pirates-clip.md): the paws of the pianist two octaves apart, the octave of a xylophone part outside the bars, the mallets of the xylophone off each other, and the clip rule of `pnpm clip-probe`.
- [`2026-10-21-seat-glow.md`](decisions/2026-10-21-seat-glow.md): the ring on the dot of a seat that plays: its form, its spans and their level, the fade in song time, the lighter ring of a dark fur, and its threshold with reduced motion.
- [`2026-10-21-arm-form.md`](decisions/2026-10-21-arm-form.md): the new round upper arms of the pig, the rounder upper arms of the rabbit, the free arm and the twist bone of the pig, the smooth walls of its shoulders, the bow elbow of the rabbit, and the four views of each mesh check.
- [`2026-10-21-user-midi-tools.md`](decisions/2026-10-21-user-midi-tools.md): `--midi` of the probe tools and of `close-views play`, the frozen song time of `--strip` and the cache of its base frames, the camera in JSON, `--trace` of `pnpm beat-rates`, and the variants of `pnpm clip-probe`.
- [`2026-10-21-load-performance.md`](decisions/2026-10-21-load-performance.md): the dense pack of the studio meshes, the decode Workers and their start, and the preload of the default demo.
- [`2026-10-21-hall-flac.md`](decisions/2026-10-21-hall-flac.md): the FLAC file of the hall impulse response, its fallback to the WAV file, and its one-time encoder.
- [`2026-10-21-frame-performance.md`](decisions/2026-10-21-frame-performance.md): the end of the pause of the frame rule, the cuts of the frame time with the same pixels (one pose of the bones in each frame, a material for each program variant, and the culling of the players), the options that change the look, and the missed frames of a capped window.
- [`2026-10-21-perf-retro.md`](decisions/2026-10-21-perf-retro.md): the decisions of the performance retro: the fair lock of the measures, the tools of the load and the frame rounds, and the facts of the docs.
- [`2026-10-22-rabbit-elbow.md`](decisions/2026-10-22-rabbit-elbow.md): the copy of the rabbit mesh with a round inner side of each arm, the islands of the free arm, the open trunk hole of the cut, and the section of the right upper arm.
- [`2026-10-22-mesh-bear.md`](decisions/2026-10-22-mesh-bear.md): the rig config of the bear mesh of the user, with the arms of the mesh and a cut of each arm seam, and the brown of the reference image. The app uses the studio bear again.
- [`2026-10-22-mesh-polar-bear.md`](decisions/2026-10-22-mesh-polar-bear.md): the rig config of the polar bear mesh of the user, on a bench that fits its legs, with arms 1.25 times the mesh, a cut of each arm seam, a twist bone, the white of the reference, and a smile line. The app uses the studio polar bear again.
- [`2026-10-22-polar-seat.md`](decisions/2026-10-22-polar-seat.md): the seat of the rig of the polar bear mesh: the hip joints in the haunch, level thighs, knees near 90°, and a bench under the thighs that holds the haunch.
- [`2026-10-22-seam-gate.md`](decisions/2026-10-22-seam-gate.md): the search for a measure of the arm seams with no result, the audit sheet of `pnpm close-views audit` at two camera heights, and the intake check of the arm joins and gaps of `pnpm rig-mesh --check`.
- [`2026-10-22-panda-armpit.md`](decisions/2026-10-22-panda-armpit.md): the back lips of the panda arm roots in the free arm, and two shapes of its right arm.
- [`2026-10-22-arm-roots.md`](decisions/2026-10-22-arm-roots.md): the bear copy with raised shoulder balls, and the edit script of the arm roots.
- [`2026-10-22-polar-legs.md`](decisions/2026-10-22-polar-legs.md): the longer legs of the rig of the polar bear mesh with its size kept.
- [`2026-10-22-deer-dog-seams.md`](decisions/2026-10-22-deer-dog-seams.md): the deer copy with round inner arms and a cut of each arm seam above the back notch.
- [`2026-10-22-dog-seams.md`](decisions/2026-10-22-dog-seams.md): the dog copy with round inner arms, a cut of each arm seam, a chest share of the inner arm root, and the open depth and gate items of the cellist.
- [`2026-10-22-rhino-arm-2.md`](decisions/2026-10-22-rhino-arm-2.md): the rhino copy with a round tube for each arm and a fair fill of the trunk, the triangle budget of 4,600, the arm weights of the tubes, and the head floor of the rhino.
- [`2026-10-22-rhino-arm-3.md`](decisions/2026-10-22-rhino-arm-3.md): the rhino copy with a round shoulder for each arm, a fine fill of the trunk with smooth colors, and the triangle and gzip budgets of a studio body.
- [`2026-10-22-rabbit-armpit.md`](decisions/2026-10-22-rabbit-armpit.md): the rabbit copy with the front notch of the right arm root filled, the cause of the dent (the bend of the bind arm and the twist), and the open V crease in the play.
- [`2026-10-22-studio-bears.md`](decisions/2026-10-22-studio-bears.md): the studio bear and the studio polar bear back in the app, smooth: an even spread of the facets within 3,000 faces, a large crease angle, the color blend of the fur, the baton hold of the studio bear, and the seat of the polar bear.
- [`2026-10-22-dq-bind.md`](decisions/2026-10-22-dq-bind.md): the dual quaternion bind of the arm roots (`bind.blend`), which does not shrink the rabbit dent and ships on no species.
- [`2026-10-22-elephant-crease.md`](decisions/2026-10-22-elephant-crease.md): the elephant elbows near the body at the timpani.
- [`2026-10-23-elephant-apose.md`](decisions/2026-10-23-elephant-apose.md): the elephant mesh in an A-pose with no cut or split, its size, the line rule, and the smaller eyes.
- [`2026-10-23-rhino-apose.md`](decisions/2026-10-23-rhino-apose.md): the rhino mesh in an A-pose with its own faces and no copy, cut, or split, its size and arms, the line rule, the new accepted grip of the tubist, and its depths.
- [`2026-10-23-night-fixes.md`](decisions/2026-10-23-night-fixes.md): the pizzicato of the dog from the side, the rest viola of the cat and the rest elbow of the beaver with no twist through 180°, and the palms of the woodwinds toward the tube.
- [`2026-10-23-bear-eye-size.md`](decisions/2026-10-23-bear-eye-size.md): the slightly larger eyes of the bear and the polar bear.
- [`2026-10-23-bear-tpose.md`](decisions/2026-10-23-bear-tpose.md): the T-pose bear mesh with its own faces and no cut or split, its size, its elbow and palm, and its open rest arms.
- [`2026-10-24-wind-paws.md`](decisions/2026-10-24-wind-paws.md): the wind paws across the tube, and the clarinet of the wolf and the oboe of the mouse nearer the body.
- [`2026-10-24-polar-bear-tpose.md`](decisions/2026-10-24-polar-bear-tpose.md): the T-pose polar bear mesh, its size, legs, and seat, and the eye size of the bear.
- [`2026-10-24-polar-bear-seat.md`](decisions/2026-10-24-polar-bear-seat.md): the smaller polar bear pianist from the keys of its sheet.
- [`2026-10-24-rabbit-hold.md`](decisions/2026-10-24-rabbit-hold.md): the shorter rabbit arms with rings at the elbows, the true palm, and the violin under the chin.
- [`2026-10-24-violin-rest.md`](decisions/2026-10-24-violin-rest.md): the rabbit violin and the cat viola upright on the left knee at rest, and upright in front of the chest in the middle of the lift, as the red fox.
- [`2026-10-24-violin-poses.md`](decisions/2026-10-24-violin-poses.md): the bent rest arms of the rabbit, the scroll of the cat viola toward the left shoulder in the middle of the lift, and the nearer rest viola of the cat.
- [`2026-10-24-bow-holds.md`](decisions/2026-10-24-bow-holds.md): the hippo bow through the middle of the closed paw, and the cat arms bent near the body in the lift and the lowering.
- [`2026-10-24-wind-holds.md`](decisions/2026-10-24-wind-holds.md): the wolf clarinet at 20° with the paws across the back of the tube, the oboe of the mouse at 30°, and the flute of the tan fox leaned out on the right knee at rest.
- [`2026-10-24-wind-grips.md`](decisions/2026-10-24-wind-grips.md): the contact probe of the wind grips, the palms toward the tube axis, the grips moved around the tube in the play and at rest, the wolf bell on the seat between the knees, and the upright mouse oboe at rest.
- [`2026-10-24-polar-bear-arms.md`](decisions/2026-10-24-polar-bear-arms.md): the quad arm faces of the polar bear, its Blender weights, and the arm segments and helpers that the pose code turns.
- [`2026-10-24-pianist-pose.md`](decisions/2026-10-24-pianist-pose.md): the upright polar bear pianist after a professional pianist, the larger and nearer piano, the claws on the key tops, the low shoulders, and the side lean toward the far keys.
- [`2026-10-24-violin-review.md`](decisions/2026-10-24-violin-review.md): the fixes of the review of the violin poses: the right elbow of the cat at the tip, the cat rest viola turned toward the audience, the cat bow beside the viola in the moves, and the accepted cat bow paw.
- [`2026-10-24-violin-arms.md`](decisions/2026-10-24-violin-arms.md): the quad arm faces, the Blender weights, and the arm segments and helpers of the rabbit, the arm tools that count the segments, and the cat arms that stay.
- [`2026-10-24-piano-pedals.md`](decisions/2026-10-24-piano-pedals.md): the pedal lyre and the three brass pedals of the piano, and the right foot of the pianist on the damper pedal with the sustain pedal of the score.
- [`2026-10-25-wind-arms.md`](decisions/2026-10-25-wind-arms.md): the quad arm faces, the Blender weights, and the arm segments of the mouse and the wolf, the mouse oboe nearer to the body and on the belly at rest, the left rest paw of the wolf, and the tan fox flute on the right thigh at rest.
- [`2026-10-25-grips.md`](decisions/2026-10-25-grips.md): the grasp check of the wind paws, the palm side of each paw, the grip curls and the whole finger weights, the bassoon diagonal, the forward trombone slide, the lower trumpet, the right tuba paw on the valve tops, and the triangle clip.
- [`2026-10-25-elephant-arms.md`](decisions/2026-10-25-elephant-arms.md): the quad arm tubes, the Blender weights, and the arm segments of the elephant timpanist, its cuts and elbow rings for a thick arm, and the paw colors.
- [`2026-10-25-beaver-rhino-arms.md`](decisions/2026-10-25-beaver-rhino-arms.md): the skin normals of the arm roots of the beaver bassoonist and the rhino tubist, the rebuilt arms that the round did not ship, and the open crease and twist steps.
- [`2026-10-25-fox-arms.md`](decisions/2026-10-25-fox-arms.md): the quad arm tubes, the side walls, the Blender weights, and the arm segments of the two foxes, the palm grip and the rest of the flute, the grip around the tube, and the open twist steps and depths.
- [`2026-10-25-elephant-hippo-creases.md`](decisions/2026-10-25-elephant-hippo-creases.md): the skin normals of the elephant elbows and of the hippo arm roots, and the timpani elbows a little out.
- [`2026-10-25-open-grips.md`](decisions/2026-10-25-open-grips.md): the right panda paw on the slide brace and the slide travel, the wolf right paw, the rhino left paw, the trumpet angle, the flute in the moves, and the bassoon grip turns.
- [`2026-10-25-thick-arm-depth.md`](decisions/2026-10-25-thick-arm-depth.md): the cause of the depth of the elephant and rhino upper arms in the body, the flatter inner upper arms of the elephant, and the right rhino elbow out.
- [`2026-10-25-percussion-tips.md`](decisions/2026-10-25-percussion-tips.md): the cause of the tips that swung out over the rim between strikes, and the pitch of the snare sticks and the cymbal mallets from their strike direction.
- [`2026-10-23-rabbit-arms.md`](decisions/2026-10-23-rabbit-arms.md): the A-pose rabbit mesh with its own faces, a short arm stretch, a violin of 0.83, its elbows and rest grip, and the open shards of its arms.
