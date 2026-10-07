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
build with no guess. The user did not review them one by one. Treat them as decided. A decision
file in [`decisions/`](decisions/) holds the details of one agent session in one table, with a
row for each decision. The Section column of a row names the section of this design that holds
the decision.

- **New decisions.** An agent that decides details adds a new file
  `decisions/<YYYY-MM-DD>-<topic>.md`. The file has a title, one paragraph that tells who decided
  and why, and the table. Add the file to the list below.
- **Old files.** Keep the file of another session as it is. The only change to it is the removal
  of a row that the user reversed.
- **Reversal.** The user can reverse each decision. Then update the section of this design that
  holds it, and remove its row. When a file has no rows, delete it and its line below.

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
- [`2026-10-06-skinned-bodies.md`](decisions/2026-10-06-skinned-bodies.md): the skinned bodies with two bones at the joints.
- [`2026-10-06-choir-shots.md`](decisions/2026-10-06-choir-shots.md): the choir as a subject of the shots, and the test of the first voice.
- [`2026-10-06-rest-arms-and-bow.md`](decisions/2026-10-06-rest-arms-and-bow.md): the rest pose with held arms, and the bow stick in the fingers.
- [`2026-10-07-rest-clearance.md`](decisions/2026-10-07-rest-clearance.md): the arms of the rest pose that stay out of the body.
- [`2026-10-07-scene-polish.md`](decisions/2026-10-07-scene-polish.md): the light from behind, the walnut stage, the hall lamps, the beam shaft, and the grade of the scene polish.
- [`2026-10-07-title-shade.md`](decisions/2026-10-07-title-shade.md): the shade of each title line, with a level from the frame behind its text.
- [`2026-10-07-cast-colors.md`](decisions/2026-10-07-cast-colors.md): the base colors of the species, tuned against `mockup.png` under the light of the scene polish.
