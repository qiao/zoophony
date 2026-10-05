# Review of step 4: models and gallery

Date: 2026-10-05. Reviewer: an independent review agent (design 9.8). The reviewer did not do
the work of step 4.

## Scope

- Step 4 commits: `9b2b830` to `05fc7ca`, the work on `src/models/`, `src/scene/`, `src/main.ts`,
  `gallery.html`, `src/gallery/`, and `docs/reviews/step-4/`.
- The checks ran on `05fc7ca` in the shared checkout, with no change to the working tree.
- My screenshots, prototypes, and measurement scripts are in the scratch directory of the review
  session, outside the repository.

## Verdict

**APPROVED WITH CONDITIONS.**

The three items of the "Done when" of 9.5 hold. All checks pass. The pure core rule holds, and
the overlap test fails when I break the layout. I found no blocking bug in the code. Two items
stop the step from closing: the open TODO task of the empty stage corners, and two species that
the gallery hides in its default view.

## Conditions

1. Apply the corner fix below ("the spread"), or the choice of the manager, with its tests and
   the design changes. Then check the last open task of step 4 in TODO.md.
2. Make each model of the gallery visible in the default view of each gallery page (F2). The
   piano lid hides the panda, and the bear hides the badger and its timpani.
3. Take the screenshots of the default view of each demo again after condition 1, at
   1440 × 900, and demo 1 at 390 × 844. Send them with the step. Fix F4 before the 390 × 844
   screenshot.

The other findings do not block. Do F3 (the long legs of a standing player) before step 5 if the
manager agrees, because the conductor pose of step 5 builds on the standing body.

## Check results

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 62 files, 669 tests |
| `pnpm format:check` | pass |
| `pnpm build` | pass, with no warning. The largest chunk is 614.85 kB, 159.41 kB after gzip. |
| `pnpm size` | pass: 185,576 B of 1,000,000 B. Step 3 had 160,593 B. The models add 25 kB. |
| Gallery in the first download | no. `gallery-*.js` is a separate chunk, and the size check does not count it (7.2). |
| Triangles, `perf-60.mid` scene | 64,444 of 150,000 |
| Largest body | 940 of 1,200 (the badger with the timpani) |
| Largest instruments | piano 720 of 1,500, xylophone 460, timpani 456, horn 414, harp 396 of 800 |
| Draw calls for each frame, shadow pass included | Beethoven 89, Handel 121, Boulanger 135 |
| Demo switch, 12 times with `]`, then 5 fast presses | 1 WebGL context, 0 lost contexts, no console error. The last request wins. |

## Done criterion (9.5, step 4)

| Item | Result |
|---|---|
| The gallery shows each species with the instrument of its section | Yes, 23 models: each species entry with each instrument of its section, the 5 percussion instruments, and the bear. The panda and the badger are hidden in the default view (F2, condition 2). |
| The triangle budget test passes | Yes. `budget.test.ts` checks each body, each instrument, each seat, the stand, and the scene of `perf-60.mid`. |
| The scene of each demo has its seats and stage size from 4.5, with no overlap of chairs | Yes. The overlap test checks the 6 demos with 3 section sizes and `perf-60.mid`. Handel gives S 10.96 m, and the reference composition gives 6.6 m, as 4.5 says. |

## Screenshots

I took my own screenshots with Playwright: headless Chromium with ANGLE Metal on the M1 Max,
and `pnpm vite preview`. I stopped each server after use.

| Screenshot | Mean difference to the committed file (of 255) | Largest difference |
|---|---|---|
| `beethoven-5-1440x900` | 0.71 | 40 |
| `boulanger-matin-1440x900` | 0.73 | 42 |
| `handel-hallelujah-1440x900` | 0.73 | 53 |
| `beethoven-5-390x844` | 0.76 | 39 |
| `gallery-species-1440x900` | 0.79 | 67 |
| `gallery-instruments-1440x900` | 0.68 | 67 |

The differences come from the WebP compression of the committed files. The screenshots match.

## Visual review

### Species

Each species has the parts of 4.3 and the colors of 4.5. At the gallery distance, these species
are clear: the rabbit, the two foxes, the raccoon, the elephant, the bear, the hippo, the deer,
the panda, the pig, the rhino, the badger, and the penguin.

These species are weak:

| Species | What a viewer sees | Cause |
|---|---|---|
| mouse | a small gray bear | The `large-round` ears (0.45 H) sit on the top of the head, as the round ears of the bear. |
| beaver | a brown bear | Small ears and a short snout. The chair hides the flat tail. |
| meerkat | a tan dog | A tan body with a long snout. The eye patches are faint. |
| dog | close to the meerkat and the tan fox | Three tan species with long snouts. The floppy ears are the only clear mark. |
| cat | a gray animal with a grille on the face | The three dark stripes of `forehead-stripes` read as bars. |

The monkey is acceptable: the face disc and the side ears separate it from the bear. None of
these blocks step 4. A larger ear for the mouse (for example 0.6 H, set out to the sides) and a
darker tail for the beaver are cheap changes.

### Proportions

The seated animals match the reference: the round bodies, the heads on the shoulders, and the
feet on the floor.

The standing animals have long legs (F3). The bear on the podium is 2.02 m tall, and its legs are
41% of its height. In the reference, the legs of the bear are about 25% of its height, and its
head is at the height of the conductor desk. Our bear head is 0.9 m above the desk. The penguins
and the meerkats have legs of about half their height, because the standing hip uses the chair
seat height of 0.45 m for each species (`src/models/biped.ts:107`).

### Instruments

The holds follow 4.6 in the bind pose. The violins and the violas show the playing pose of step
3. The cello stands between the knees, the contrabass at the left side, and the harp between the
knees. The winds are at the mouth, the horn and the tuba in the lap, and the percussion stands in
front of the player. The instruments of the other players float in their playing places while
the arms hang down. 4.7 defines this bind pose, and step 5 adds the arms.

Two details look wrong in the gallery:

- The cymbals of the meerkat are edge-on at the sides of the body, so the front view shows no
  cymbal. This is correct for the bind pose.
- The contrabass hides the face of the hippo in the front view. The scene camera sees the hippo
  from the front right, where it shows.

### Seats, stands, conductor, piano, risers, and light

- Seats and stands: the chairs, the stools, and the high stool have their 4.5 heights. Two string
  players share one stand, and each wind player has its own. No stand touches a chair.
- Conductor: the bear stands on the podium and faces the orchestra, with the conductor stand in
  front. It looks tall and narrow (F3).
- Piano: the panda sits at the left of the keyboard and faces +x, with the piano at the front
  left of the podium (4.5).
- Risers: the three levels of Handel (11, 11, and 10 penguins) are even arcs in the colors of
  the stage. They look as the steps do.
- Light: the beam, the stage corners, and the floor light match the step 3 tune. In the 390 × 844
  view, the floor light shows dark streaks (F4).

## The empty stage corners

### Measurements

I measured the distance from each front corner of the stage to the nearest seat center, in
stage sides `S`, with the real modules. The near corner is the front right corner, which the
default camera sees at the bottom of the image.

| Demo (section size auto) | S (m) | Near corner | Front left corner | Empty strip at the back (m) | Seat angles |
|---|---|---|---|---|---|
| beethoven-5 | 9.83 | 0.40 | 0.31 | 2.10 | -70° to 52° |
| boulanger-matin | 11.68 | 0.29 | 0.23 | 2.85 | -74° to 73° |
| grieg-ase | 7.12 | 0.44 | 0.31 | 0.64 | -70° to 50° |
| handel-hallelujah | 10.96 | 0.40 | 0.32 | 0.39 | -70° to 50° |
| mozart-k315 | 8.10 | 0.42 | 0.30 | 0.49 | -70° to 50° |
| mozart-k488 | 8.91 | 0.48 | 0.17 | 0.49 | -70° to 50° |
| perf-60 | 14.69 | 0.35 | 0.28 | 3.31 | -73° to 62° |

These values agree with the values of the step 4c agent (0.29 to 0.48 S).

I put the reference image onto the stage plane with the camera of 4.5. The reference podium is
0.82 m from the front edge. The seats reach -90° (the front rabbit) and +95° (the front flute).
The rabbits sit in a nearly straight line along the left edge, at x = -2.1 to -2.2 m. The
flutes and the elephant sit along the right edge, at x = 3.0 to 3.2 m. The near corner is 0.10 S
from the nearest seat center. Neighbors are 1.1 to 1.7 m apart. Our rows use 0.95 m.

### Cause

Each row packs its seats at the smallest arc, around 0°. Thus most rows end at ±43° to ±53°, and
only the row that sets `S` reaches ±74°. The front corners are in front of all row ends.

```text
              back edge
   +----------------------------------+
   |        empty strip (2 to 3 m)    |
   |       . - - row 3 - - .          |
   |    .   - - row 2 - -    .        |
   |  .     - row 1 -          .      |
   |       - row 0 -                  |
   |  empty      [podium]      empty  |  <- rows end at +-43 to +-74 deg
   +----------[steps]-----------------+
              front edge         near corner (camera side)
```

The row that sets the width (`2 × L`) is far from the front corners. The inner rows are short and
stay near 0°. Thus the corners stay empty for each demo.

### Candidates

| Candidate | Near corner | S | Back strip | Other effect |
|---|---|---|---|---|
| Now | 0.29 to 0.48 | | 0.39 to 3.31 m | |
| Row 0 anchored at ±90° (step 4c agent) | 0.40 to 0.31 | -2% to -4% | same | A violin at -11° behind the conductor |
| Split the long rows (step 4c agent) | about the same | -4% to +15% | less | The corners stay empty |
| Rectangular stage (step 4c agent) | same | | removed | Changes the square stage of 4.1 |
| Camera fit to the seats | same on the stage | | | The corner stays on the stage. A view that hides it also cuts the stage, which breaks the diamond of 9.5, step 3. |
| Stretch the row steps into the back strip (my prototype) | same | | less | The rows that set the width move past the side edges (108 and 258 boxes off the stage) |
| **Spread the rows (my prototype, recommended)** | **0.14 to 0.30** | **no change** | same | Sparser rows, up to 1.6 m between neighbors |

### Recommendation: spread the rows after the stage size

Keep the rule of 4.5 that gives `S`. Then add one pass that spreads each row into the stage. The
stage side does not change, so the animals keep their size on the screen.

1. Calculate the packed rows and `S` as now (stage origin, steps 1 to 5).
2. For each instrumental row, from the front, multiply the angle of each seat by a factor `k`.
   Use one factor for the seats left of 0° and one for the seats right of 0°. Row 0 keeps its
   split: the first violins spread to the left, and the violas to the right.
3. Each factor is the largest value, in steps of 0.02 down from `1.6 / 0.95`, that keeps these
   limits:
   - each seat is within ±90°,
   - two neighbors are at most 1.6 m apart on the arc (the reference has 1.1 to 1.7 m),
   - each footprint box keeps 0.3 m from the side edges and from the front edge,
   - each footprint keeps 0.05 m from all items in front (the rows in front, the piano, and the
     podium with the conductor) and from all items of its own row.
4. The choir and its risers keep their places.

```typescript
/** The limits of the spread of a row (design 4.5, seat geometry). */
interface SpreadLimits {
  /** The largest angle of a seat from 0°, in radians: 90°. */
  readonly maxAngle: number;
  /** The largest arc between two neighbors, in meters: 1.6. */
  readonly maxArc: number;
}
```

Expected numbers, from a prototype of this rule on the real modules (`maxAngle` 90°, `maxArc`
1.6 m, section size auto):

| Demo | S (m), no change | Near corner, now to after | Front left corner, now to after |
|---|---|---|---|
| beethoven-5 | 9.83 | 0.40 to 0.25 | 0.31 to 0.25 |
| boulanger-matin | 11.68 | 0.29 to 0.22 | 0.23 to 0.17 |
| grieg-ase | 7.12 | 0.44 to 0.22 | 0.31 to 0.18 |
| handel-hallelujah | 10.96 | 0.40 to 0.25 | 0.32 to 0.25 |
| mozart-k315 | 8.10 | 0.42 to 0.23 | 0.30 to 0.21 |
| mozart-k488 | 8.91 | 0.48 to 0.30 | 0.17 to 0.17 |
| perf-60 | 14.69 | 0.35 to 0.14 | 0.28 to 0.14 |

- The 18 demo layouts (6 demos, 3 section sizes) had no overlap and no item off the stage. In
  `perf-60.mid`, one stand touched a bassoon of the same row, because my prototype checked a row
  only against the items in front. The real code must also check the pairs of one row. The
  overlap test catches this case.
- My renders of Beethoven, Boulanger, Grieg, and K488 show the rabbits along the left edge at
  -90°, and the violas and the cellos at the front right. This is the composition of the
  reference.
- Two values tune the result. `maxArc` 1.8 m gives 0.18 to 0.28 S. A `maxAngle` of 100° where
  the front distance permits it gives 0.10 S for Boulanger and `perf-60.mid`, and no change for
  the other demos. I recommend 90° and 1.6 m, because they stay inside the reference values.

What stays:

- The back strip of the width-bound demos (Beethoven 2.10 m, Boulanger 2.85 m, `perf-60.mid`
  3.31 m). Only a rectangular stage removes it, and that changes 4.1. Keep the square stage. The
  back strip is in the dim upper part of the default view.
- Small groups with the section size "One per part" stay near 0°: Handel 0.55 S, K488 0.45 S,
  Grieg 0.40 S. The arc limit of 1.6 m stops their spread.

Design changes:

- 4.5, seat geometry: add the spread rule above. Change "span at most 160°" (`docs/design.md:1034`)
  to say that 160° sets the radius of a row, and that the spread then lets a row reach ±90°.
- 4.5, stage origin: add a step after step 5 (`docs/design.md:996`): the rows spread inside `S`.
- 4.2: the text stays true. Add that the strings reach the side edges, as in the reference.
- Section 10: add a row to the manager table.

Test changes in `src/models/layout-scene.test.ts`:

- The test "steps each row back by at least 1.2 m and keeps it within 160°" checks ±90°.
- Add a test: for each demo at the section size auto, the near corner is at most 0.30 S from a
  seat center, and two neighbors of a row are at most 1.6 m apart. Make sure that it fails with
  the packed rows.
- The test of the reference composition keeps S 6.6 m and the radii.

Risk:

- Short rows look sparser. In Grieg, the gap behind the conductor in row 0 grows from 1.85 m to
  3.12 m. The conductor stands in front of this gap in the default view.
- A seat at +90° faces -x, so the camera sees the violas and the cellos from the back right. The
  reference flutes at +95° show the same view.
- Step 5: the looks at the conductor turn by up to 90°.
- Cost: about 80 lines in `layout-scene.ts` and two tests. The prototype layout took 28 to 118 ms
  in Node, against 6 to 68 ms now. A bisection of `k` can cut this time.

## Findings

The findings are in the order of severity.

### F1. The front corners of the stage stay empty (medium, condition 1)

`src/models/layout-scene.ts:312` to `:333` and `:699` to `:771`. The rows pack their seats around
0°, so the near corner is 0.29 to 0.48 S from the nearest seat, against 0.10 S in the reference.
Requested change: the spread above.

### F2. The gallery hides models in its default view (medium, condition 2)

`src/gallery/main.ts:43` to `:54` and `:158`. The rows of the grid are 0.8 m apart, and the camera
looks down at 35°. A tall model hides the floor behind it for `height / tan 35°`: 2.9 m for the
bear (2.02 m tall).

- Species page: the piano lid hides the panda. The bear (`src/gallery/items.ts:44`, last item)
  hides the badger and the front kettles of the timpani.
- Instruments page: the timpani hide the bases of the oboe and the clarinet. The tuba bell hides
  half of the flute. The labels of these items overlap.

Requested change: make each model visible in the default view. For example, add the height of
the tallest model of the row in front times `1 / tan 35°` to the row gap, or put the tallest
models (the piano, the bear, the timpani, the contrabass) in the back row. Turn the pianist so
that the camera sees it beside the piano, as the stage view does.

### F3. A standing player has long legs (medium, non-blocking, design)

`src/models/biped.ts:105` to `:109` and `:227`, design 4.5 (`docs/design.md:948`). A standing
body has the chair shin and the thigh, straight down, so its hip is at `0.45 m + 0.55 H` plus the
hip offset. The legs are 41% of the height of the bear and about half of the height of the
penguin and the meerkat. In the reference, the legs of the bear are about 25% of its height, and
its head is level with the conductor desk. Ours is 0.9 m above the desk.

Requested change: give a standing body its own leg length in H, for example a thigh and a shin
of 0.8 to 1.0 H in total. Then the bear is about 1.6 m tall. This changes a section 10 row of the
layout agent, so the manager decides. Do it before the conductor pose of step 5.

### F4. The floor light shows dark streaks in far views (low, non-blocking)

`src/scene/stage.ts:81` and `:104` to `:111`. The shadow floor writes depth. The floor light disc
is 1 mm above it and tests depth. With the near plane at 0.1 m and a depth buffer of 24 bits, the
depth step at the distance `z` is about `z² / (0.1 × 2²⁴)`. In the 390 × 844 view of Grieg, the
camera is 50.8 m away, so the step is about 1.5 mm, which is more than the 1 mm gap. The disc
then fails the depth test in streaks, and the light is missing there.

Measured: the 390 × 844 view has 297 pixels of missing floor light. With `depthWrite: false` on
the `ShadowMaterial` of the floor, it has 0, and no other pixel changes. Requested change: set
`depthWrite: false` on the floor material. Nothing draws below the floor. Update the comment at
`:81`.

### F5. The overlap test uses the footprints of the layout as its oracle (low, non-blocking)

`src/models/layout-scene.test.ts:67` to `:80`. The test checks the layout with the same
`playerFootprint()` and `layoutObstacles()` that the layout uses. Two mutations show that the
test has force: a seat arc that does not grow, and a row that does not move back. Each one fails
the test. But a footprint that misses a part (for example a new instrument piece on a bone with
no box) passes both the layout and the test. By construction, each box holds the triangles of its
group, so this is a gap in the tests, with no current bug.

Requested change: add a test in `footprint.test.ts` that each vertex of `buildPlayer()` and of
`buildSupport()` is inside a footprint box, for each cast kind. Add the same check for
`STAND_FOOTPRINT`, which counts on 12 triangles for each box of `buildMusicStand()`
(`src/models/footprint.ts:142`).

### F6. Each demo gets a new renderer (low, non-blocking, step 5 or 6)

`src/scene/stage-scene.ts:70`. `StageScene` makes a new `WebGLRenderer` for each layout. The
canvas keeps its one WebGL context, but three.js keeps its shader programs in the renderer, so
each demo change compiles them again. I did not measure the cost. Requested change: when step 5
or 6 wires the load flow, keep one renderer for the page, and replace only the scene.

### F7. `podiumCenter()` is a leftover of step 3 (low)

`src/models/stage.ts:57`. Only `stage.test.ts` and a TSDoc link at `:155` use it. Its value is
wrong for a piano layout (F 1.81 m). Requested change: remove it, and let the tests give the
podium point.

### F8. The comments name a screenshot script that is not in the repository (low)

`src/main.ts:65` and `src/gallery/main.ts:290`. Requested change: commit the Playwright script
that takes the review screenshots, for example `tools/screenshots.ts`, so that each review of
9.8 can repeat them. Else reword the two comments.

### F9. `layoutScene()` drops a player with no place (info)

`src/models/layout-scene.ts:767`. Today each section has a row, and a test checks the order of
the cast. If a later section has no row, the layout loses the player with no error, and
`SceneLayout.players` no longer follows the order of 5.1. Requested change: throw an error for a
player with no place.

### F10. A long comment line (info)

`src/models/footprint.ts:102` has 129 characters. oxfmt does not wrap comments. Wrap it at 100.

## What I checked and found correct

- Pure core: `src/models/` and `src/pose/` import no Three.js module, read no clock, use no
  `Math.random()`, and touch no DOM. The footprint cache is a pure memo.
- Instrument API: `InstrumentModel`, `InstrumentPiece`, `PieceHold`, the grips, and the targets
  match 4.6. `holdInstrument()` and `attachInstrument()` attach each instrument to each species
  with one function. Each piece follows one bone.
- `buildPlayer()` sets the stance from the support, moves the body forward on a chair, and gives
  each skeleton all bones of 4.7. `castScore()` follows 4.3 and 4.6, with the drum player rule
  and the kettle count.
- `layoutScene()` follows 4.5: the split row 0, the row radius rule, the steps of 0.02 m, the
  shared and the own stands, the piano place, the even risers, and `S = max(5, 2 × L, D)`.
  Piano channels on two ports, or four piano programs, merge into one pianist (3.7). Thus the
  piano place never holds two pianists.
- Scene: each kind of player shares one geometry, and all players share the two materials. A
  player costs one or two draw calls, plus the shadow pass (4.4).
- `dispose()`: `disposeTree()` frees each shared geometry and material one time, the skeletons,
  and the shadow maps. `StageCamera.dispose()` removes the listeners of the orbit controls.
- The temporary `?demo=` query and the keys [ and ] use 15 lines in `src/main.ts` and two small
  functions in `src/app/demos.ts`. Each one says that it is temporary. Design 2.2, section 10,
  and a step 6 task in TODO.md record its removal.
- The gallery is a separate entry, and it is not in the first download.
- The exhaustive `never` checks of the step 3 review (F4) are in place.
- Each export has TSDoc. The prose checks of AGENTS.md give 0 em dashes, no semicolon splices,
  and no banned word.
- No dead code of step 3 remains, except `podiumCenter()` (F7).

## Status

Date: 2026-10-05. The fixes are the commits `86a444f` to `d3a3863`. The manager adopted F1, F3,
and the work on the weak species as manager decisions, on the advice of this review. Section 10
of the design records them. The user can reverse each one.

### Conditions

| Condition | Verdict | Commits | What is left |
|---|---|---|---|
| 1. The corner fix | fixed | `0296cdc`, `07d123c` | The back strip of the width-bound demos stays, because 4.1 keeps the square stage. |
| 2. Each gallery model visible | fixed | `d2712e4` | None. The rabbit ears touch the lower edge of the panel of the species page. |
| 3. The screenshots again | fixed | `ded92fb`, `575b01d`, `d3a3863` | None. `pnpm screenshots docs/reviews/step-4 --sheet` takes them again. |

### Findings

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| F1. Empty front corners | fixed | `0296cdc`, `07d123c` | The near corner is 0.215 to 0.305 S, and 0.154 S for `perf-60.mid`. See below. |
| F2. The gallery hides models | fixed | `d2712e4` | None. |
| F3. Long standing legs | fixed | `733b2be` | The shoulders of the standing percussion are now below the timpani heads. A step 5 task in TODO.md records the check. |
| F4. Dark streaks of the floor light | fixed | `ded92fb` | None. |
| F5. The overlap test uses the footprints as its oracle | fixed | `e1808a1` | None. |
| F6. A new renderer for each demo | fixed | `7bdc711` | None. |
| F7. `podiumCenter()` | fixed | `f1fef4d` | None. |
| F8. The screenshot script is missing | fixed | `575b01d`, `207750f` | None. |
| F9. `layoutScene()` drops a player with no place | fixed | `e93dd08` | None. |
| F10. A long comment line | fixed | `86a444f` | None. |
| Weak species (visual review) | fixed | `3734d5b`, `279b4ce`, `df991e1`, `5de55ca`, `e903bd0`, `462b5dc` | The beaver keeps the round head and the small ears. Its teeth are its clear mark. See below. |

### The spread (F1)

The spread follows the recommendation, with one change. A pure factor on the angles cannot keep
the arc limit when a packed arc is already above 1.6 m, for example the 1.85 m of two
contrabasses with their shared stand. Such a row did not spread at all. Thus each arc grows by
the factor `k` up to 1.6 m, and an arc that is already longer stays. In row 0, the gap of the
conductor grows with `k` and has no limit. The layout also checks each pair of items of one row.
The overlap test of `layoutScene()` checks all pairs of the layout, also the pairs of one row: a
spread that squeezes a row fails it.

`S` is the same for all 19 test layouts. Measured with the real modules, section size auto:

| Demo | S (m) | Near corner, before to after | Front left corner, before to after |
|---|---|---|---|
| beethoven-5 | 9.83 | 0.401 to 0.259 | 0.310 to 0.245 |
| boulanger-matin | 11.68 | 0.294 to 0.221 | 0.234 to 0.171 |
| grieg-ase | 7.12 | 0.438 to 0.215 | 0.306 to 0.184 |
| handel-hallelujah | 10.96 | 0.399 to 0.278 | 0.320 to 0.251 |
| mozart-k315 | 8.10 | 0.417 to 0.229 | 0.301 to 0.206 |
| mozart-k488 | 8.91 | 0.480 to 0.305 | 0.171 to 0.171 |
| perf-60 | 14.69 | 0.346 to 0.154 | 0.284 to 0.137 |

A warm layout takes 6 to 86 ms in Node, against 4 to 59 ms before. A memo of the stand arc of a
string player with no partner keeps this time low.

### The standing body (F3)

The torso base of a standing body is 0.75 H above the floor, and its thigh is 0.42 H. The legs
are 28% of the height, and the bear is 1.67 m tall, in place of 2.02 m. On the podium, the top of
the bear head is 1.87 m above the stage top, 0.52 m above the center of the conductor desk (0.90 m
before). In the reference image, the head is level with the desk. The desk height of 1.10 m above
the podium did not change. In the default view of each demo, the bear hides no player.

### The weak species

| Species | Change |
|---|---|
| mouse | The large round ears are 0.7 H, set high and out to the sides. The new snout `pointed` is a thin cone of 0.3 H. A longer tail moved the Handel stage, so the mouse keeps its thin tail. |
| beaver | The new snout `buck-teeth` has two white front teeth of 0.1 × 0.2 H. The paddle of the flat tail is 0.45 H wide. |
| meerkat | The new optional parameter `girth` is 0.75, so the body is thin. The snout is `pointed`, and the eye patches and the ears are `#2a1f17`. |
| dog | A cream coat, with brown floppy ears and the new face pattern `eye-patch` around the left eye. |
| cat | Two forehead stripes of 0.03 H in place of three of 0.05 H. |

`docs/reviews/step-4/species-sheet.webp` shows a close view of each gallery model.
