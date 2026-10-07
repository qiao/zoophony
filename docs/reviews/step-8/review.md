# Review of step 8: Polished look

Date: 2026-10-06. Reviewer: an independent review agent (design 9.8). The reviewer did not do
the work of step 8.

## Scope

- Step 8 work: the log `6929f90..30ece53`. It holds 66 commits of the UI, camera, cast, and look
  branches, and 10 commits of the planner branch (`1606c8f..30ece53`).
- All checks and the screenshots ran on `30ece53`.
- References: `docs/reference/mockup.png` (the navigation menu is out of scope) and
  `docs/reference/scene.png`.
- Screenshots: `pnpm screenshots <dir> --play --ui --drawer --load --shots --sheet`, 100 files in
  the scratch directory of the review session. They are not in the repository.

## Verdict

**CHANGES NEEDED.**

The Chromium end-to-end tests fail (H1), and CI blocks a merge on that job (design 9.2). The
visible beam veils the back rows in the default view (H2). The gallery pages show the beam over
the models (H3). The other findings are medium or low.

The UI is close to `mockup.png`: the serif title, the floating panel, the demo rows with covers
and the level meter, the seat rows with the "M" and "S" squares, the file button, and the bar.
The camera gives the frontal default view, the high view, the side views, and the views behind
the conductor of `scene.png`. The depth of field of the section and solo shots looks like the
close shots 06 and 07 of `scene.png`. The planner commits are correct, as far as the review
found.

## Results of the commands

Each command ran alone. The exit code came from the command, with no pipe.

| Command | Exit | Result |
|---|---|---|
| `pnpm lint` | 0 | No findings. |
| `pnpm typecheck` | 0 | No errors. |
| `pnpm test` | 0 | 151 files, 1727 tests pass. |
| `pnpm format:check` | 0 | 375 files are formatted. |
| `pnpm build` | 0 | Builds `dist/` with the license file. |
| `pnpm size` | 0 | 276,028 B of 1,000,000 B. |
| `pnpm keyboard` | 0 | 76 rows pass, 0 fail. `docs/reviews/step-6/keyboard-check.md` did not change. |
| `pnpm smoke` | 0 | Song time 2.398 s after 4 s. The camera moved 0.24 m in play. |
| `pnpm test:e2e --project=chromium` | 1 | 45 pass, 3 fail (H1). |
| `pnpm screenshots ... --play --ui --drawer --load --shots --sheet` | 0 | 100 files, each at most 300 kB. |

## Findings

### H1. High: the play button of the first screen covers the stage

- Files: `e2e/first-screen.e2e.ts:181` and `:203`, `src/ui/ui.css:169` (`--play-y`),
  `src/shots/view.ts:32` (`LANDSCAPE_RULE`), `docs/design/02-product.md:362` and `:371`.
- Failure: three Chromium tests fail. The lit share under the play button is 0.82 at
  1440 × 900, 0.45 at 1280 × 720, and 0.39 beside the open drawer at 1366 × 768 (the limit is
  0.01). The screenshot `ui-first-1440x900.webp` shows the button on the podium and on the front
  edge of the stage. This is a regression of audit N14 and of FI3. The default view now stands
  at 0.56 of the default distance, so the stage reaches 72% of the height, where the button
  stands. Design 2.8 also says that the stage is "about 0.74 of the height wide", which is now
  wrong. No branch ran the end-to-end tests before the merge, and `tools/merge-branch.sh` does
  not run them.
- Fix: place the button from the projected front edge of the stage in the default view (the
  camera knows it), or move the button below the stage edge at each aspect of the wide layout.
  Then update design 2.8 and run `pnpm test:e2e --project=chromium`. Add the Chromium end-to-end
  run to the check list of a step that changes the camera or the first screen.

### H2. High: the haze of the beam veils the back rows

- File: `src/scene/beam.ts:145` (`density()`), line 154 (`vertical`).
- Failure: in the default view, the haze column (radius `0.3 × S`) has its full density down to
  the stage top. A view ray at 28° crosses the column for a long distance near the stage, so the
  back rows behind the column turn into gray shapes with low contrast. See
  `boulanger-matin-play-1440x900.webp`, `beethoven-9-play-1440x900.webp` (the choir), and
  `ui-first-390x844.webp`. In `mockup.png` and in view 01 of `scene.png`, the beam is bright in
  the upper part of the frame and faint near the players: the elephant, the wolves, and the
  pandas at the back keep their full contrast. The shader also adds the haze of the full ray
  behind an animal that stands in the column, because the ray stops only at the stage top.
- Fix: fade the density near the stage, for example
  `density *= smoothstep(0.05, 0.5, p.y / uHeight)`, and lower `BEAM_LOOK.bottom`. Then tune the
  value of the middle of the beam again (87 in `mockup.png`). As an option, stop the ray at the
  depth of the scene when the depth pass exists.

### H3. High: the gallery pages show the beam and the motes over the models

- File: `src/gallery/main.ts:232`.
- Failure: the code removes each `Mesh` child of the light group, but `createLights()` now adds
  the beam as a `Group` (the cone and the motes). Thus the gallery keeps the beam at its full
  strength, because no frame calls `setBeamFrame()`. The models in the middle of
  `gallery-species-1440x900.webp` and most tiles of `species-sheet.webp` are washed out, and
  their labels are not legible. The cast review of design 9.8 uses these pages. The comment "The
  gallery shows the models, so it has no visible beam" is false.
- Fix: remove the beam group by its type or by its name, and add a test that the gallery scene
  holds no object named `beam` or `motes`.

### M1. Medium: the dust motes fill the full cone of the beam

- File: `src/scene/beam.ts:223` to `:225` (`MOTE_VERTEX`).
- Failure: the radius of a mote comes from the radius of the cone (`0.75 × S` at the stage), not
  from the column of `0.3 × S`. Design 4.5 and the decision file of the look say "Dust motes
  drift in the column". Thus the motes show as small bright points over the dark hall, far from
  the light (the top left of `boulanger-matin-play-1440x900.webp` and of
  `shot-mozart-k525-conductor-1440x900.webp`). They look like stars, and `mockup.png` shows dust
  only in the beam.
- Fix: give the mote shader the uniform `uColumn`, and use `min(radius, uColumn)` for the place
  and for the fade.

### M2. Medium: a change of the tier does not change the beam

- Files: `src/scene/stage-scene.ts:230` (`setTier()`), `src/scene/lights.ts:179`
  (`setLightsTier()`), `src/scene/beam.ts:359` (`createBeam()`).
- Failure: `createBeam()` reads the haze samples and the number of motes from the tier at the
  creation of a layout. `setLightsTier()` changes only the shadow of the spotlight. After an
  automatic drop to the low tier, the beam keeps 4 haze samples and 350 motes until the next
  layout. Design 2.6 gives the low tier 2 samples and no motes.
- Fix: in `setLightsTier()`, replace the beam group with `createBeam(stageSide, tier)`, or set
  the `SAMPLES` define and `needsUpdate` on the material and the draw range of the motes. Add a
  unit test.

### M3. Medium: the opaque canvas leaves a seam beside the open drawer

- Files: `src/ui/ui.css:605` to `:607` and `:623` to `:626`, `src/style.css:9`,
  `docs/design/02-product.md:414`, `src/scene/renderer.ts` (`alpha: !post`).
- Failure: the canvas moves 176 px to the left while the drawer is open. The canvas is now
  opaque (the post effects clear it to `#0b0807`), so the right 176 px of the window show the
  page gradient. A hard vertical edge at x = 1264 shows in the gap below the drawer and behind
  the right part of the bar (`shot-boulanger-matin-solo-1440x900.webp`). In `mockup.png`, the
  scene continues under the panel and the bar. The CSS comments and design 2.8 still say that
  the canvas is transparent.
- Fix: keep the canvas at the full width, and move the image with
  `PerspectiveCamera.setViewOffset()` by 176 CSS pixels, or make the canvas 176 px wider while
  the drawer is open. Then update the comments and design 2.8.

### M4. Medium: the subject of some shots is cut

- Files: the shots of `src/shots/` with the views of `src/shots/view.ts`.
- Failure: in `shot-boulanger-matin-conductor-1440x900.webp`, the bar covers the body of the
  bear. Views 02 and 05 of `scene.png` show the full back of the bear. In
  `shot-beethoven-9-solo-390x844.webp`, the solo hippo stands cut at the bottom left corner,
  and the choir fills the frame. With the drawer open in the wide layout, each shot also loses
  176 px at each side (M3).
- Fix: apply the view offset of the bar (`VIEW_OFFSET_Y`) and of the drawer to the shots, and
  check the solo framing in a portrait view.

### L1. Low: the fallback with no float target has no MSAA

- Files: `src/scene/stage-scene.ts:131` and `:134`, `src/scene/renderer.ts`.
- Failure: `StageScene` always creates the renderer with `post = true`, so the canvas has no
  MSAA. When the GPU has neither `EXT_color_buffer_float` nor `EXT_color_buffer_half_float`, the
  scene renders to the canvas with no post effects and no MSAA. Design 2.6 says that MSAA stays
  on in all tiers.
- Fix: when `targetFormatOf()` gives `none`, create the renderer again with `antialias: true`.

### L2. Low: the drop hint is not available to a screen reader

- Files: `src/ui/file-picker.ts`, `docs/design/02-product.md:455` and `:572`.
- Failure: the hint "Or drop a MIDI file on the page." is now only a tooltip, and the tooltip
  has `aria-hidden="true"`. The file button has no description. Design 2.8 says that a screen
  reader skips each tooltip because the control has its text in its name, but this is not true
  for the file button.
- Fix: add `aria-describedby` to a visually hidden hint, or accept the loss and correct design
  2.8.

### L3. Low: the haze, the motes, and the grain move with reduced motion

- Files: `src/scene/stage-scene.ts:304` (`timeSec`), `src/scene/post.ts:370` to `:372`.
- Failure: with `prefers-reduced-motion`, the noise of the haze drifts, the motes move and
  twinkle, and the grain changes about 24 times each second over the full image. Design 2.5
  does not name these effects. The grain also follows the frame count, so it changes 48 times
  each second at 120 Hz.
- Fix: with reduced motion, keep the time of the beam at 0 and keep the seed of the grain.
  Record the rule in design 2.5. Use the wall time for the grain.

### L4. Low: the docs and the comments disagree with the code

- `src/scene/hall.ts:354` and `:355`: two doc comments in a row. The first is stale.
- `src/gallery/main.ts:232`: see H3.
- `src/ui/ui.css:606`, `src/style.css:9`, `docs/design/02-product.md:414`: see M3.
- `docs/design/02-product.md:373`: see H1.
- `TODO.md:507` to `:511`: the four tasks of the look, the camera, the cast, and the UI are on
  `main`, but their boxes are not checked.

## Unverified

### U1. The environment map is lost after a loss of the WebGL context

- File: `src/scene/environment.ts:70`.
- Risk: the PMREM target is rendered one time. After `webglcontextrestored`, three.js makes the
  render targets again with no content, so the brass, the copper, and the polished wood can lose
  their reflections. The app has no handler for the loss of the context.
- Steps: open `/`, play, then run
  `const e = document.querySelector('#stage').getContext('webgl2').getExtension('WEBGL_lose_context'); e.loseContext(); setTimeout(() => e.restoreContext(), 500);`
  in the console. Compare a close shot of the brass before and after.

### U2. The depth pass ignores the cut of the hall

- File: `src/scene/post.ts:481`.
- Risk: the depth pass replaces each material with `MeshBasicMaterial`, so the vertex shader of
  the hall does not cut the near parts. A camera outside 0.85 of the ring radius with an active
  depth of field could write the depth of a cut balcony, and then blur the wrong pixels. The
  shots stand inside the ring, but Free mode can reach this place.
- Steps: in Free mode, zoom to a focus distance below `1.5 × S`, then orbit out to the edge of
  the hall ring. Look for soft areas in the shape of a balcony.

## Remaining differences to the references

The table ranks each difference by how much its fix closes the gap to `mockup.png` and
`scene.png`. The cost is an estimate for one agent.

| Rank | Difference | Fix | Cost |
|---|---|---|---|
| 1 | The haze veils the back rows, and the motes look like stars in the hall (H2, M1) | Fade the haze near the stage, keep the motes in the column | 2 h |
| 2 | The image is too saturated and too even. The stage is salmon orange to the back edge, and white fur reads beige. `mockup.png` has dark walnut, a pool of light near the conductor, and dark sides and back | Saturation 1.25 to about 1.05, a less orange key light, a faster fall-off of the key to the back corners | 3 h |
| 3 | The hall does not show in the default view. `mockup.png` has warm soft lamps at the left and right edges, and view 09 of `scene.png` shows the balconies with lamps | Larger and brighter lamps with a bloom halo, a smaller cutaway angle, or lamps on the side walls in view | 4 h |
| 4 | The close shots have no warm bokeh discs. The lamps are 0.14 m points and the hall is dark behind the players | Larger lamps (also rank 3), and a brighter hall behind the close shots | 2 h |
| 5 | The animals are blockier than in the references: small heads, box limbs, and few facets on the faces | Rounder heads and bodies, larger eyes, finer faces | 2 to 3 days |
| 6 | The canvas ends beside the drawer, and the bar shows the page background (M3) | View offset in place of the move of the canvas | 3 h |
| 7 | The conductor shots cut the bear with the bar (M4) | View offset of the bar in the shots | 2 h |
| 8 | The demo rows wrap to two or three lines, so the panel shows 7 of 9 seats at 1440 × 900. `mockup.png` shows one line for each demo and all seats | Short display titles in the list, or one line with the full title in the tooltip and the label | 1 h |
| 9 | On a phone, the stage fills about 45% of the height, and the lower 40% is dark floor | A lower target or a nearer portrait camera | 3 h |

## Status

Date: 2026-10-06. The review fixes agent worked on the branch `worktree-agent-ab415ab65f6637a7b`.
The beam agent owns H2, H3, M1, M2, and L3.

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| H1 | fixed | `b963019`, `7b8e7e8`, `e94b31c`, `87a5e45` | While the play button shows, the frame of the camera shrinks until the stage is 12 px clear of the load ring. The three Chromium tests pass. `tools/merge-branch.sh` now runs the Chromium end-to-end tests. Nothing is left. |
| H2 | open (beam agent) | | |
| H3 | open (beam agent) | | |
| M1 | open (beam agent) | | |
| M2 | open (beam agent) | | |
| M3 | fixed | `092ddac` | The canvas fills the window, and the camera moves its frame with `setViewOffset()`. Nothing is left. |
| M4 | partly fixed | `1f9dcdb` | A close shot fits its full frame above the bar and left of the open drawer, so the bar no longer covers the bear. The phone frame of `shot-beethoven-9-solo-390x844.webp` shows the solo baritone (seat 12, a penguin) in the middle. The hippo at the bottom left is a contrabass 1.3 m in front of it, which the depth rule of 0.9 lets through. A stricter rule changes the planner, so it needs a decision of the user. |
| L1 | fixed | `7e2d72f` | A GPU with no target of floats now gets the MSAA. No test GPU lacks the target, so only the settings have a unit test. |
| L2 | fixed | `d22eb45` | Nothing is left. |
| L3 | open (beam agent) | | |
| L4 | partly fixed | `092ddac`, `b963019`, `d09099c` | The comments of `ui.css` and `style.css`, design 2.8, and `hall.ts` are true. `src/gallery/main.ts:232` belongs to H3. `TODO.md:507` to `:511` are not in the files of this agent. |
| U1 | fixed | `20f5775` | Confirmed: after a loss and a restore of the WebGL context, the stage and the players were 2.6% darker. `e2e/context.e2e.ts` failed before the fix and passes after it. |
| U2 | fixed | `d09099c` | Confirmed in the code: the override material of the depth pass has no cutaway. The fault needs Free mode near the ring wall with an open aperture, and it was not shown on the screen. |

The commands ran on the head of the branch, each alone: `pnpm lint`, `pnpm typecheck`,
`pnpm test` (1762 tests), `pnpm format:check`, `pnpm build`, `pnpm size` (278,567 B),
`pnpm test:e2e --project=chromium` (51 pass), `pnpm keyboard` (all rows pass, and the table of
`docs/reviews/step-6/keyboard-check.md` did not change), and `pnpm smoke` (pass, with the new
check of the first paint). Each exit code was 0.
