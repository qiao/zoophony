# Review of step 3: scene and one player (partial)

Date: 2026-10-05. Reviewer: an independent review agent (design 9.8). The reviewer did not do
the work of step 3.

## Scope

This review covers only the audio-free tasks of step 3. The manager started them early (TODO.md,
design section 10). The bow sync, the clock target, and the Firefox `currentTime` task wait for
the Safari check of step 1. This verdict does not cover them.

- Step 3 commits: `aadea66` to `9d64eca` (23 commits).
- The checks ran on a clean export of `0cce8e1`. The step 2 commits after `9d64eca` change no
  file in `src/models/`, `src/pose/`, `src/scene/`, `src/main.ts`, `index.html`, or
  `docs/reviews/step-3/`.
- My screenshots, test renders, and measurement scripts are in the scratch directory of the
  review session, outside the repository.

## Verdict

**APPROVED WITH CONDITIONS** for the audio-free tasks.

The default view has the four items of the composition criterion of 9.5. The pure core rule,
the triangle budgets, the bone list, the quality tiers, and the camera rules hold. I found no
blocking bug in the code. The scale of the animals and the light differ from the reference by
measured amounts. These are design values. Conditions 2 and 3 ask for a decision and a change
before step 4 starts.

## Conditions for the final approval of step 3

1. After the Safari check, do the open audio tasks. Move the bow in sync with the first violins
   of demo 1 from `Player.now()`, measure the clock target of 9.7, and do the Firefox
   `currentTime` task. Send the step again with the results and a GIF of 10 s (9.8).
2. Decide the scale of the cast (design question A), and apply it before step 4 starts. Step 4
   builds 18 species, all instruments, and `layoutScene()` on these values, so a later change
   costs more. My recommendation: H 0.38 m, the instruments at 1.27 times their size, the front
   distance 1.0 m, the margin 0.3 m, and a smallest stage of 5 m. If the manager or the user
   keeps the current values, record the reason in section 10.
3. Tune the light (design question B), and fix F1. Then measure the default view at
   1440 × 900 with means of 12 × 12 px. The camera scales with `S`, so these pixels stay on the
   same parts of the stage. The view must meet these values:

   | Area | Pixels | Required | Reference | Now |
   |---|---|---|---|---|
   | Lit stage top, saturation | (700, 450), (800, 500) | at most 0.40 | 0.25 to 0.34 | 0.56, 0.57 |
   | Near and right corners, value | (830, 600), (1030, 385) | at least 0.35 | 0.39 to 0.50 | 0.26, 0.27 |
   | Stage sides, value | (500, 518), (900, 552) | at least 0.07 | 0.08 to 0.10 | 0.06, 0.05 |

4. After conditions 2 and 3, take new screenshots at 1440 × 900 and 390 × 844. Send them with
   the step.

## Check results

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 39 files, 410 tests |
| `pnpm format:check` | pass |
| `pnpm build` | pass. Vite warns of the entry chunk: 580.44 kB, 147.85 kB after gzip (F10). |
| `pnpm size` | pass: 160,593 B of 1,000,000 B |

In the shared checkout, `node_modules/` has no `three` and no `@types/three`, but
`pnpm-lock.yaml` has them. There, `pnpm lint`, `pnpm typecheck`, and `pnpm build` fail with
"Cannot find module 'three'". `pnpm install` repairs the checkout. I did not run it there,
because another agent works in that checkout. The code has no fault.

## Composition (9.5, step 3)

I took my own screenshots of the current code with Playwright: headless Chromium with ANGLE
Metal on the M1 Max, and `vite preview`. They match the committed screenshots. The mean absolute
difference is 0.53 of 255 at both sizes, and the largest difference is 22.

| Item | Result |
|---|---|
| The stage as a diamond | Yes. The near corner points down. The left and right corners are at the sides. |
| The beam from above | Yes. |
| The dark background | Yes. The CSS gradient shows, with a value of 0.04 to 0.09 around the stage. |
| The view from behind the conductor | Yes. The camera is in front of the stage, 30° to the right. The podium is between the camera and the player. Step 3 has no conductor yet. |

The camera fit of 4.5 is correct. With the target 0.05 S to the left, my camera model puts the
three visible top corners of the reference at (120, 572), (674, 749), and (916, 471). The image
has them at (114, 560), (664, 750), and (914.5, 474).

## Design question A: the scale of the animals

### Measurements

I unprojected points of the reference image onto the stage plane with the camera fit of 4.5.
At the front rabbit, one stage side `S` is 531 px high on the screen. Its head is 36 px high.

| Value | Reference | Now (H 0.30, S 8.1) | Recommended (H 0.38, S 6.6) |
|---|---|---|---|
| Head height H / S | 0.062 | 0.037 | 0.058 |
| Floor to the top of the head / S | 0.21 | 0.15 | 0.22 |
| Floor to the ear tips / S | 0.28 | 0.19 | 0.27 |
| Chair back (0.95 m) / S | 0.147 | 0.117 | 0.144 |
| Podium side (0.9 m) / S | 0.146 | 0.111 | 0.136 |
| Front edge to the podium center / S | 0.11 | 0.20 | 0.15 |
| Outer seat center to the stage edge / S | 0.08 to 0.09 | 0.21 | 0.12 |

The table shows two causes:

- **Empty stage.** The chair and the podium give a reference stage of 6.2 to 6.5 m. The front
  distance of 1.6 m and the edge margin of 1.7 m make our stage 8.1 m.
- **Small animals.** Relative to the props, the reference animals are 1.27 times larger. Their H
  is 0.062 × 6.3 m = 0.39 m.

The seat arc and the row step of 4.5 match the reference. Neighbors in the reference are
0.17 to 0.26 S apart, about 3.2 H. The design gives 0.95 m, which is 3.2 H at H 0.30. The fox
row is 0.27 S (4.3 H) behind the raccoon row. The design gives 1.2 m (4.0 H). Keep both values.

The diagram shows the depth `D` of the reference composition, from the front edge to the back
edge.

```text
now:          |front 1.6|------- row 2 radius 4.8 -------|chair 0.5|margin 1.2|  D = 8.1 m
recommended:  |front 1.0|------- row 2 radius 4.8 -------|chair 0.5|0.3|         D = 6.6 m
reference:    |0.7|-------- back row radius about 5.0 --------|0.55|              about 6.3 m
              (reference lengths in prop meters: chair back 0.95 m, podium 0.9 m)
```

### Candidates

| Change | S, reference composition | H / S | S, Boulanger | S, Handel |
|---|---|---|---|---|
| None | 8.10 | 0.037 | 13.16 | 17.24 |
| A: H 0.45 only | 8.10 | 0.056 | 13.16 | 17.24 |
| B: front 1.0, margin 0.3, smallest S 5 | 6.60 | 0.045 | 11.36 | 15.44 |
| Recommended: B and H 0.38 | 6.60 | 0.058 | 11.36 | 15.44 |

Candidate A puts 0.95 m of arc (2.1 H) between neighbors and makes the 0.40 m violin 0.9 H
long. Candidate B alone reaches only 73% of the reference ratio.

### Recommendation

Apply one change, "the reference scale", with these values:

- **Head height.** H of the rabbit 0.30 m → 0.38 m. The species sizes of 4.5 stay.
- **Instruments.** Multiply the instrument sizes by 0.38 / 0.30 = 1.27: the violin 0.40 → 0.51 m,
  the bow 0.45 → 0.57 m. Better, give the sizes of 4.6 in H, so that the next change of H keeps
  them. The chairs, the stands, the podium, and the steps keep their sizes in meters.
- **Front distance.** Stage origin, steps 3 and 4: 1.6 m → 1.0 m. With a piano, the front edge
  is also at least 0.3 m in front of the piano case.
- **Edge margin.** Stage origin, steps 2 and 3: 1.2 m → 0.3 m. The chair allowance of 0.5 m
  stays, so the stage edge is 0.8 m from the outer seat center.
- **Smallest stage.** `S = max(7, 2 × L, D)` → `S = max(5, 2 × L, D)`.
- **Step 3 stage.** `S = 8.1` → `S = 6.6`: `D = 1.0 + 4.8 + 0.5 + 0.3 = 6.6`, and `2 × L` is
  `2 × (1.85 + 0.8) = 5.3`.

Keep these values: the seat arc 0.95 m, the row step 1.2 m, `r(-1) = 1.2`, the span of 160°,
the camera distance `3.3 × S`, and the sizes of the props.

Design changes: 4.5 body proportions (H), 4.5 stage origin (steps 2 to 4 and the paragraph on
`S = 8.1`), and 4.6 (the violin and the bow). Add a row to section 10 for each, and update the
step 3 row on `S = 8.1`.

Code changes:

- `src/models/species.ts:60`: `RABBIT_HEAD_HEIGHT` 0.38.
- `src/models/player.ts:92` and `:98`: a scale of 1.27 in the hold transforms of the violin and
  the bow. `addViolin()` and `addBow()` already apply `hold.scale`.
- `src/pose/violin-pose.ts:28` and `:92`: `bowFromGrip` and `BOW.hairGap` are in meters, so scale
  them too. `BowAnchors.reach` (`src/models/violin.ts:56`, `:160`) ignores `hold.scale`, and no
  code reads it. Remove it.
- `src/models/stage.ts:18`: `PODIUM_FROM_FRONT` 1.0.
- `src/models/layout.ts:46`: `REFERENCE_STAGE_SIDE` 6.6, and its TSDoc.
- The tests that pin 1.6 and 8.1: `src/models/stage.test.ts:133` to `:150` and
  `src/models/layout.test.ts:30`.

I rendered the recommendation in a scratch copy, with the light of question B and the rabbit at
-68°. From the floor to the top of the head, the rabbit is 100 px on a stage of 695 px screen
width (0.144). The reference has 111 px on 800 px (0.139).

### Fit of the largest demos

`buildScore()` with the section size "auto" gives these players:

- Boulanger: violins 4 + 4, violas 3, cellos 3, contrabasses 2, harp 1, piano (celesta) 1,
  flutes 3, oboes 3, clarinets 3, bassoons 3, horns 4, trumpets 2, trombones 3, tuba 1,
  percussion 2. That is 42 players in 16 seats.
- Handel: violins 4 + 4, violas 3, cellos 3, oboe 1, bassoon 1, trumpets 2, timpani 1, choir
  8 + 8 + 8 + 8. That is 51 players in 12 seats.

With the recommended rule (rows as radius in meters: players):

| Demo | Rows | 2 × L | D | S |
|---|---|---|---|---|
| Boulanger | 2.4: 7, 3.6: 7, 4.8: 14, 6.0: 13 | 11.36 | 8.65 | 11.36 |
| Handel | 2.4: 7, 3.6: 7, 4.8: 2, 6.0: 3, risers 7.2: 32 | 15.44 | 8.99 | 15.44 |
| `perf-60.mid` | 3.4: 10, 4.6: 10, 5.8: 15, 7.0: 17, risers 8.2: 7 | 13.99 | 10.85 | 13.99 |

Design 4.6 gives no size for the piano. I used a case of 2.0 m along x and 1.5 m along z, and
the pianist bench at x = -3.4 m from the podium. Thus the Boulanger front distance is
`max(1.0, 0.8 + 0.75 + 0.3) = 1.85` m.

No chair overlaps:

- In a row, two seat centers are at least `2r × sin(0.95 / 2r)` = 0.944 m apart (r = 2.4). The
  diagonal of a chair is 0.58 m.
- Two rows are at least 1.2 m apart. A chair is 0.40 m deep.
- Row 0 of Boulanger (7 seats at r = 2.4) ends at -68°. That chair center is 0.90 m behind the
  podium center. The piano case starts 0.05 m in front of it, so the gap is 0.75 m.
- The edge margin changes only the free space at the edge: 0.6 m behind the back of an outer
  chair.

In both large demos, `2 × L` is larger than `D`. The rule of 4.5 adds the extra depth at the
back: 2.7 m (Boulanger) and 6.5 m (Handel) of empty stage behind the last row. In Handel, the 32
singers fill riser level 0 up to 160°. If they fill the three levels evenly (11, 11, 10), then
`2 × L` is 7.46, `D` is 10.59, and S is 10.59 in place of 15.44. This is a step 4 item (F13).

## Design question B: the stage color

### Measurements

Means of 12 × 12 px in the default view at 1440 × 900, and in the 1024 × 1024 reference.

| Area | Reference | Now | Recommended |
|---|---|---|---|
| Lit stage top | hue 20 to 25, sat. 0.25 to 0.34, value 0.48 to 0.65 | hue 22 to 25, sat. 0.54 to 0.59, value 0.49 to 0.70 | hue 22 to 25, sat. 0.31 to 0.36, value 0.50 to 0.74 |
| Stage corners | value 0.39 to 0.50 | value 0.19 to 0.27 | value 0.29 to 0.40 |
| Stage sides | value 0.08 to 0.10 | value 0.05 to 0.06 | value 0.07 to 0.08 |
| Beam | hue 40 to 43, sat. 0.14 to 0.18 | hue 40, sat. 0.34 | hue 41, sat. 0.18 |

I changed one value at a time in a scratch copy, rendered, and measured:

| Change | Lit top saturation | Other effect |
|---|---|---|
| Exposure 0.9 | 0.54 to 0.59 | value 0.03 lower |
| `NeutralToneMapping` | 0.62 to 0.72 | |
| `AgXToneMapping` | 0.45 to 0.49 | changes all colors, value 0.03 higher |
| Spotlight `#ffffff` | 0.44 to 0.47 | |
| Spotlight `#fff3e3` | 0.49 to 0.53 | |
| Top `#76655f` with spotlight `#ffe9c7` | 0.42 to 0.44 | hue moves to 27 to 29 (yellow) |
| Top `#7a645e` with spotlight `#fff6ec` | 0.35 to 0.37 | dim areas turn pink (base hue 13) |
| Top `#7a6359` with spotlight `#fff6ec` | 0.38 to 0.40 | hue 23 to 27 |
| Spotlight 45°, penumbra 0.5 | no change | corner value 0.28 to 0.39 |
| Fill ground `#4a3a30` | no change | side value 0.07 to 0.08, lit animal fronts |

### Recommendation

Change these values, in this order of effect:

1. **Spotlight cone** (`src/scene/lights.ts:24`, `:27`): angle 36° → 45°, penumbra 0.6 → 0.5.
   The full light then reaches 22.5° from the axis. The corners are at 30.5°, where the cone
   factor goes from 0.26 to about 0.79. Keep 2.2 lux at the stage center.
2. **Spotlight color** (`src/scene/lights.ts:124`): `#ffe9c7` → `#fff6ec`. The warm light
   moves each desaturated base to yellow. The new color stays a little warm, and the beam keeps
   `#e8dcc0`.
3. **Stage top** (`src/models/colors.ts:6`, `:7`): `#7a5646` → `#7a6359`, and the plank line
   `#5e4134` → `#5e4b42`, with the same ratio of line to top.
4. **Fill ground** (`src/scene/lights.ts:141`): `#0e0c0a` → `#4a3a30`. This approximates the
   light that the lit stage reflects up. It lights the stage sides and the front of the animals.
   These faces point away from the spotlight, and the close-up shows them almost black.
5. Keep ACES Filmic and the exposure 1.0. The exposure changes only the value, and the value
   already matches.

If only one value can change, change the spotlight cone. The corners show the largest measured
difference, and the cone is a light value, as 4.5 asks. The saturation also needs a new base
color: no light color and no tone mapping brought the current base below 0.44. The base
`#7a5646` (saturation 0.43) came from a dark sample. In the reference, the darkest areas are the
most saturated (0.46 to 0.49), so a dark sample overstates the saturation of the wood. This
change breaks the sentence "Tune the light (not the base colors)" of 4.5. Update that sentence,
and add a row to section 10.

### The other differences

- **Near-black stage sides.** The reference sides have a value of 0.08 to 0.10, and ours 0.05 to
  0.06. The sides face away from the spotlight, so only the fill lights them. The fill ground of
  item 4 gives 0.07 to 0.08. A side base of `#5e463a` gives 0.075 to 0.082 instead. Do only one
  of the two: together they give 0.13 to 0.14.
- **No light on the floor.** The reference floor is brighter near the front of the stage (value
  0.20 below the steps) than far from it (0.07 to 0.09). The `ShadowMaterial` floor cannot show
  light. Add an additive disc under the stage, as the beam: y = -0.399, radius 1.0 S, color
  `#e8dcc0`, opacity 0.10 at 0.5 S from the center to 0 at 1.0 S, and no depth write. The stage
  hides its center, and the CSS gradient stays. These are start values that I did not render.
  Add the disc to 4.5 and to section 10. Non-blocking.
- **The rabbit behind the podium.** The code follows 4.5. The reference composition puts three
  first violins in row 0, centered on 0°, so the left seat is at -22.7°. The camera looks along
  -30°, so the rabbit is only 7.3° from the line of sight through the podium. In the reference,
  the rabbits are at -85°, -54°, and -41°, along the left edge. In all six demos, row 0 holds four
  first violins and three violas, so the outer first violin sits at -68°. Use that seat for step
  3 (`src/models/layout.ts`, `singleViolinLayout()`). My preview with the rabbit at -68° shows it
  clearly to the left of the podium. Section 4.2 says "The violins sit at the front left". The
  centered rows of 4.5 contradict it when a row has free arc. Decide this rule in step 4.

## Findings

The findings are in the order of severity. None of them blocks the partial approval.

### F1. The beam writes linear values to an sRGB canvas (medium, non-blocking)

`src/scene/lights.ts:72`. The beam `ShaderMaterial` writes `uColor` with no
`#include <colorspace_fragment>`. `new Color('#e8dcc0')` (`:95`) holds the linear values, so the
canvas shows a darker and more saturated color than 4.5 gives. Measured: saturation 0.34 against
0.17 for `#e8dcc0` and 0.14 to 0.18 in the reference.

Requested change: add `#include <colorspace_fragment>` after `gl_FragColor`. Then check the
beam opacity again. In my render, the fix gives saturation 0.18 and value 0.47 to 0.61 with the
opacity 1.0 (reference: 0.46 to 0.78). Fix it with condition 3.

### F2. The feet hang 0.29 m above the floor (medium, non-blocking, step 4)

`src/models/biped.ts:292` to `:294`. The hip is 0.17 H above the seat, the shin is 0.6 H, and
the seat is 0.45 m high. The bottom of the foot is at
`0.45 + 0.17 × 0.30 - 0.6 × 0.30 - 0.1 × 0.30` = 0.29 m (0.25 m at H 0.38). In the reference, the
rabbit shins are about 1.2 H long, and the feet rest on the floor. Requested change: in step 4,
make the feet reach the floor. For example, calculate the shin length from the seat height, and
change the shin value of 4.5 to match.

### F3. The scene has no dispose path (medium, non-blocking, step 4)

`src/scene/stage-scene.ts:29`. `StageScene` has no `dispose()`. Each player, chair, and stand
gets its own geometry. The scene also holds two materials, the beam material, the shadow map,
the `OrbitControls` listeners, and the window listener of `src/main.ts:24`. The step 4 task "Show
the scene of each demo" replaces the scene, and then these GPU resources leak. Requested change:
add `StageScene.dispose()` before step 4 changes the demo, and add the task to TODO.md.

### F4. The shape switches end in `default: throw` (low, step 4)

`src/models/biped.ts:130`, `:162`, `:183`, and `src/models/player.ts:115`. These guards are
correct for step 3, and `biped.test.ts` checks them. When step 4 adds all cases, replace each
`default` with an exhaustive check (`const unhandled: never = value`). Then a new member of a
union fails at compile time, and the error does not wait for a run.

### F5. The strings are a white strip (low)

`src/models/violin.ts:123`. The strings are one box of 0.27 × 0.016 m in the bow hair color.
In the close-up, the box reads as a white bar along the neck. The reference violins show no strip.
Requested change: use a width of 0.008 m and a darker color, for example `#9a9080`, or remove the
box.

### F6. The torso follows `spine`, and the arms follow `chest` (low, step 5)

`src/models/biped.ts:227` and `:228`. The full torso is on the `spine` bone. The shoulders, the
arms, and the violin hang from `chest` (4.7). A rotation of `chest` alone moves the arms and the
violin away from the torso. 4.7 moves only `spine` in the idle layer, so step 3 is correct. Keep
this in mind for the bowing motion of step 5.

### F7. A stand can touch the chair in front of it (low, step 4)

`src/models/props.ts:26` and `src/models/layout.ts:55`. A shared stand is 0.75 m in front of its
row. Its back leg reaches 0.233 m further toward the podium. The row in front is 1.2 m nearer,
and its chair back is 0.2 m behind its seat center. When the angles agree, the gap is 0.017 m.
Requested change: include the stands in the overlap test of step 4.

### F8. The pixel ratio does not follow a change of `devicePixelRatio` (low)

`src/main.ts:15`. The app reads `devicePixelRatio` one time. Browser zoom or a move to another
display changes it. Then the canvas is blurred or renders too many pixels. Requested change: in
`resize()`, read `devicePixelRatio` again, and call `setPixelRatio()` when it changes.

### F9. A touch laptop starts at the low tier (low, design)

`src/main.ts:14` and `src/scene/quality.ts:41`. `navigator.maxTouchPoints > 0` is true on a
Windows laptop with a touch screen. The code follows 2.6. Consider the media query
`(pointer: coarse)` as the touch signal, and update 2.6 if you change it.

### F10. The Vite warning about the chunk size (low)

The entry chunk is 580.44 kB, 147.85 kB after gzip. A build of only the three.js parts that the
app imports, with the same imports and `OrbitControls`, is 147 kB after gzip. Thus nearly all of
the chunk is three.js. Tree shaking works as far as three.js permits. The chunk has no
`TorusKnotGeometry`, `ExtrudeGeometry`, `TextureLoader`, `FileLoader`, `AnimationMixer`,
`Raycaster`, or `PMREMGenerator`. The `WebGLRenderer` brings its shader chunks and its WebXR
manager. The estimate of 150 KB for three.js in 7.2 holds. Optional change: set
`build.chunkSizeWarningLimit` to 700, with a comment that the size check of 7.2 is the real
limit.

### F11. Noise on soft shadow edges in close views (low)

The `PCFShadowMap` of three.js r186 samples five points with interleaved gradient noise. The
close-up shows a stipple pattern on the arms and the torso. At the default distance, the pattern
is smaller than a pixel. Check the gallery views of step 4. If the pattern shows there, use the
radius 1 in the gallery.

### F12. The ears of neighbor elephants can overlap (low, step 4)

4.5 gives the large-flap ear 0.9 H wide. An elephant (size 1.35) at H 0.30 has a head of
0.36 m and two ears of 0.36 m, so 1.09 m in total. The seat arc is 0.95 m. Requested change:
check the cellos in the overlap test of step 4. If they overlap, give the cello and contrabass
seats a larger arc.

### F13. The choir fills the widest riser first (low, step 4)

Design 4.5, seat geometry. The fill order makes Handel 15.44 m wide and leaves 6.5 m of empty
stage at the back (question A). If the singers fill the three levels evenly, S is 10.59 m.
Decide the fill rule with `layoutScene()`.

### F14. Small text and doc items (info)

- `docs/design.md:1910`: the section 10 row "The light and the fog scale with the stage size"
  conflicts with the row at `:1921` ("no fog"). This text is older than step 3.
- `src/models/primitives.ts:62`: "puts a face, not an edge, at the front" is an antithesis tic
  of AGENTS.md. Write "puts a face at the front (-z) and at the sides".
- `src/main.ts:16`: the app reads the reduced motion setting one time. 2.5 does not ask for a
  live update.

## What I checked and found correct

- **Pure core.** `src/models/` and `src/pose/` import no Three.js, read no clock, use no
  randomness, and touch no DOM (grep of `three`, `Date.`, `performance.`, `Math.random`,
  `document.`, and `window.`).
- **Triangle budgets (4.5).** Rabbit body 716 of 1,200. Violin and bow 232 of 500. Chair 84 of
  120. Stand 62 of 80. Stage 292 at S 8.1 and 476 at S 17.24. Tests in `src/models/` check the
  body, the instrument, the chair, and the stand.
- **Bones (4.7).** `BONE_NAMES` holds the 38 bones of 4.7 in its order. Each skeleton has all
  of them. The parents match 4.7: `instrument` on `chest` for the violin, `bow` on `handR`, and
  `slide` on `instrument`. The rabbit uses 24 bones.
- **Rigid parts.** `MeshBuilder.add()` gives one bone to all vertices of a part.
  `createPlayerMesh()` writes that bone with the weight 1 and three zero weights.
- **Quality tiers (2.6).** The shadow map sizes, the radii, and the pixel ratio limits match the
  table. The pixel ratio is at most `devicePixelRatio`. MSAA is on.
- **Camera (2.5, 4.5).** Field of view 30°, near 0.1. The far plane is the distance plus `3 × S`
  on each frame. Elevation 10° to 80° through the polar angles. Distance 0.5 to 2 times the
  default. No pan. No damping with reduced motion. The view offset is 34 px. A resize keeps a
  view that the user moved.
- **Design changes of step 3.** Each changed value has a reason in 4.5, 4.6, 4.7, or 2.6, and a
  row in the first table of section 10: the treads, the conductor stand and the plank lines, the
  PCF radius and the pixel ratio, `S = 8.1` and the stand place, the eyes, the bind pose, the
  violin sizes and hold, the static pose, the tread color, and the light tune.
- **TSDoc and naming.** Each exported symbol has TSDoc. The names follow AGENTS.md. The prose
  checks of AGENTS.md find no em dash and no semicolon splice in the step 3 files.

## Status

Date: 2026-10-05. A fix agent applied the conditions 2 to 4 and the findings in the commits
`4286e24` to `0c96b08`. The manager adopted the recommendations of questions A and B on
2026-10-05. Design section 10 records them in the second table. The user can reverse them.

### Conditions

| Condition | Verdict | Commits | What is left |
|---|---|---|---|
| 1. Audio tasks after the Safari check | open | | The bow sync, the clock target, and the Firefox `currentTime` task wait for the Safari check. |
| 2. Scale of the cast (question A) | fixed | `15bedd7`, `efb6c29`, `3df41e9` | Nothing. H 0.38 m, instruments at 1.27, front distance 1.0 m, margin 0.3 m, smallest S 5 m. |
| 3. Light (question B) and F1 | fixed | `4286e24`, `bddafeb`, `b138d34` | Nothing. The view meets each required value (table below). |
| 4. New screenshots | fixed | `0c96b08` | Nothing. |

The stage sides of `S` with the new rule, from the calculation of question A: the reference
composition 6.6 (a test pins it), Boulanger 11.36, and Handel 15.44. `layoutScene()` does not
exist yet, so the Boulanger and Handel values are not from code. I checked their arithmetic
against the row rule of 4.5.

Means of 12 × 12 px in the new default view at 1440 × 900 (lossless capture, before the WebP
encode):

| Area | Pixels | Target of the review | Measured |
|---|---|---|---|
| Lit stage top, saturation | (700, 450), (800, 500) | 0.31 to 0.36 (at most 0.40) | 0.324, 0.340 |
| Lit stage top, hue and value | same | hue 22 to 25, value 0.50 to 0.74 | hue 23.7, 22.7, value 0.663, 0.578 |
| Near and right corners, value | (830, 600), (1030, 385) | 0.29 to 0.40 (at least 0.35) | 0.394, 0.398 |
| Stage sides, value | (500, 518), (900, 552) | about 0.07 to 0.08 (at least 0.07) | 0.084, 0.085 |
| Beam, saturation | (720, 60), (720, 150), (700, 230) | about 0.18 | 0.178, 0.176, 0.179 (hue 39 to 41) |

From the floor to the top of the head, the rabbit is about 108 px on a stage of 695 px screen
width (0.155). The reference has 0.139. The feet now rest on the floor, so the measure starts
lower than in the preview of the review (0.144).

### Findings

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| F1. Beam color space | fixed | `4286e24` | Nothing. A test checks the `colorspace_fragment` chunk. |
| F2. Feet above the floor | fixed | `b292447` | Nothing. The shin is the seat height plus 0.07 H. A test checks three sizes and two seat heights. |
| F3. No dispose path | fixed | `661e29a`, `62609e1` | Nothing. The step 4 demo task now calls `StageScene.dispose()`. |
| F4. `default: throw` in the shape switches | fixed | `ee35096` | Nothing. A missing union member fails `pnpm typecheck`. |
| F5. White strip of the strings | fixed | `3c2ef25` | Nothing. A strip of 0.008 m (model size) in `#9a9080`. |
| F6. Torso on `spine`, arms on `chest` | fixed | `97257f0` | Nothing. The torso above the chest bone follows `chest`. |
| F7. Stand near the chair in front | fixed | `73f259d` | Nothing. The stand is 0.65 m in front of its row. A test checks a gap of at least 0.1 m with the real meshes (0.115 m). |
| F8. Pixel ratio after a zoom or a display change | fixed | `abd2690` | Nothing. A media query on the resolution calls `resize()`. |
| F9. Touch laptop at the low tier | fixed | `6c9d85f` | Nothing. The touch signal is `(pointer: coarse)` (design 2.6). |
| F10. Vite chunk warning | open | `62609e1` | A step 4 task. |
| F11. Shadow noise in close views | open | `62609e1` | A step 4 task. |
| F12. Elephant ears of neighbors | fixed | `62609e1`, `5f7669a` | Nothing. The ears keep apart at 0.95 m. The overlap test checks the ear boxes with the facings, and the cellos get more arc for their shared stands. |
| F13. Choir fill order | fixed | `62609e1`, `5f7669a` | Nothing. The singers fill the levels evenly. Handel gets S 10.96 m on three levels. |
| F14. Small text items | partly fixed | `ac43d5d`, `28985ec` | The fog row and the lathe comment are fixed. The reduced motion setting stays a one-time read, because 2.5 asks for no live update. |

### Other differences

| Item | Verdict | Commits | What is left |
|---|---|---|---|
| Near-black stage sides | fixed | `bddafeb` | Nothing. The fill ground alone gives 0.084 to 0.085. The side base color stays. |
| No light on the floor | open | `62609e1` | Design 4.5 has a shadow-only floor, so the disc needs a design change. A step 4 task holds the start values. |
| The rabbit behind the podium | fixed | `93de8a3`, `5f7669a` | Nothing. Row 0 holds the first violins to the left of 0° and the violas to the right (4.5). |
