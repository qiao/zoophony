# Review: main against the mockup

Date: 2026-10-07. Reviewer: an independent review agent. The reviewer did not do the work.
Code: `main` at `dcb2a48` (the facet look). Targets: `docs/reference/mockup.png` and
`docs/reference/scene.png`.

The user goal is "improve the look & feel of the animals and the scene until it matches the
mockup.png". This review measures how close `main` is now, and ranks what is left. The
navigation menu of the mockup is out of scope. The demo list differs on purpose.

## Method

- `pnpm screenshots <scratch>/review --play --ui --shots --sheet` on `dcb2a48`.
- Gallery close views of my own (`gallery.html?page=species&only=<species>&zoom=2.5&target=1.1`),
  from the front, turned by an orbit drag of 110 px (a 3/4 view), with `&rest`, and the whole body
  (`zoom=1.4&target=0.7`). The bear also from behind.
- The main comparison: the default demo after 6 s of play at 1440 × 900 with the drawer open,
  against `mockup.png` (1280 × 720). The Beethoven 9 demo gives the elephant, because the default
  demo has none.
- Crops with a pixel grid in the coordinates of each image, read by eye at 4 to 10 times. Light
  values are the mean luma (0.2126 R + 0.7152 G + 0.0722 B of the sRGB values) of a box.
- A head of the mockup is 22 to 46 px high. Thus a measure of the mockup has an error of about
  ±1 px, which is ±0.02 to ±0.04 of a head.
- My scripts and captures stay in the scratch folder of the session (`review-mockup/`). Each
  script stopped its server and its browser.

## Verdict

`main` matches the mockup in the scene, the colors, the facets, and the UI. It is still far from
the mockup in the animals: the heads are too large for the bodies, the eyes are too large and
round, the muzzles are short, and the conductor seems to hold its head. Thus the default view
reads as a group of toys seen from above, where the mockup shows slim sculpted animals seen from
the level of the conductor.

| Area | Score (0 to 10) | Reason |
|---|---|---|
| Scene | 7 | The stage, the warm pool, the beam, the dark hall, the chairs, and the stands match. The pool is 34% brighter, the piano inside is a flat gold tray, and four lamp glows float over the stage. |
| Animals | 5 | The species, the fur colors, and the facet size match. The heads are 0.31 to 0.36 of the height (mockup 0.21 to 0.26), the eyes are 1.2 to 3 times larger, and the conductor pose and the dog and elephant ears are wrong. |
| Camera | 6.5 | The azimuth, the extent of the orchestra, and the pixel size of the heads match. The camera looks down at about 34° at the podium (mockup about 15° to 21°), so the view shows the head tops. |
| UI | 9 | The title, the drawer rows, the seat rows, and the bar match the mockup in place, size, and color. |

`01-default-view.png` shows the two default views side by side.

![Default view](2026-10-07-mockup-match/01-default-view.png)

### The feedback of the user

| Feedback | State on `main` |
|---|---|
| The spotlight must not block the view and must reach the stage | Holds. The haze fades above the players and lights the stage. |
| No arm or hand clipping (rest, bow, body) | Holds at rest (`2026-10-07-rest-clearance.md`). The play poses are open: the decision file states that the bow arms of the violins are in the torso for 67% to 85% of the play. The play clearance branch owns it. I did not see a clear clip in the close shots at 1440 × 900. |
| No drooping arms | Holds. |
| No strange knees and necks | Knees hold. Necks fail in the default view: a dark nape on the conductor and a dark chin line on the rabbits (gap 6). |
| Small equal facets | Holds. The facets of the head and the back match the mockup (facet report). |
| Head 1.0 H, plump bodies, no fur, no blush | Holds. |
| The left arm of the bear moves | Holds. |
| The title shade does not look buggy | Holds. No shade box shows in the 1440 × 900 and 390 × 844 captures. |

## Measurements

### Scene

| Box (part of the free area left of the drawer) | `mockup.png` | `main` |
|---|---|---|
| Stage, center pool | 95 | 127 |
| Stage, back left | 36 | 67 |
| Stage, front left | 45 | 47 |
| Stage, front right | 70 | 76 |
| Top band of the hall, above the stage | 49 | 79 |
| Hall, top left | 9 | 4 |
| Floor in front of the stage | 27 | 28 |
| Piano, inside (hue, saturation) | 40 (23°, 0.63) | 80 (30°, 0.75) |

The boxes cover the same part of each frame. The animals in a box differ, so a difference below
about 10 is noise.

### Camera

The podium is the one object of known form in both images (main: a square top of 0.9 m, 0.25 m
high).

| Measure | `mockup.png` | `main` |
|---|---|---|
| Podium: depth of the top / height of the front face | 47 / 33 px = 1.42 | 55 / 23 px = 2.4 |
| Elevation at the podium, with the box of `main` | about 21° (15° if its top is as wide as its front) | 34° |
| Head of the bear, in parts of the frame height | 0.064 | 0.067 |
| Head of a front rabbit, in parts of the frame height | 0.035 | 0.048 |
| Head of a hippo, in parts of the frame height | 0.042 | 0.044 |
| Bear, from the feet to the head top, in parts of the frame height | 0.25 | 0.17 |
| Players, left and right ends, in parts of the free width | 0.10 to 0.97 | 0.04 to 0.96 |

The heads have the same pixel size. The bodies are shorter on `main`, and the higher camera
shortens them more.

### Animals

"H" is the head height without the ears. "W" is the head width. Mockup values come from the crops
of `05-heads.png`. `main` values come from the gallery views (900 × 900, about 380 px for each H)
and from the code.

| Measure | `mockup.png` | `main` | Factor |
|---|---|---|---|
| Head height / body height, bear | 0.25 | 0.33 (code), 0.36 (default view) | 1.3 to 1.45 |
| Head height / body height, rabbit, fox, dog | 0.21 to 0.26 (spec 2.2) | 0.30 to 0.31 (code) | 1.2 to 1.45 |
| Belly width / head width, bear, from behind | 1.75 | 1.38 | 0.8 |
| Head width / head height | cat 1.0, wolf 1.1, fox 1.2, panda 1.28 | 1.32 for all | up to 1.3 |
| Eye width / W | cat 0.16, wolf 0.17, fox 0.18, elephant 0.08, panda 0.04 (patch 0.18) | 0.12 to 0.14 (rabbit, cat, fox, elephant) | 0.8 to 3.5 |
| Eye height / H | cat 0.07, beagle 0.10, wolf 0.12, rabbit 0.125, fox 0.17, elephant 0.07 | 0.14 to 0.16 (renders), 0.21 (code) | 1.2 to 3 |
| Eye form | almond or oval, wider than high, with a color iris on the cat, the fox, and the wolf | round black button, two white lights | |
| Snout in front of the eye / H (3/4 view) | rabbit 0.75, beagle 0.6 | rabbit 0.25, dog 0.46, fox 0.37 | 0.3 to 0.8 |
| Rabbit ears: length above the head / width | 1.1 H / 0.24 H | 1.05 H / 0.26 H | match |
| Beagle ears: length | 1.1 H, hanging below the chin | 0.5 H (`floppyEar()`), seen as a brown cheek | 0.45 |
| Elephant ears: height / reach past the cheek | 1.4 H / 0.5 W, beside the face | 1.1 H / 0.13 W, behind the head at the top | 0.8 / 0.25 |
| Conductor nape luma / back luma | 55 / 37 | 11 / 43 | |

The cute spec (`research/2026-10-06-cute-furry-spec.md`) set the eyes to 0.18 × 0.21 H, rounder
heads of 1.32 W, and low eyes. These values moved `main` away from `mockup.png`:

- The eyes are 1.2 to 3 times higher than the mockup eyes, in proportion to the head. They are
  round black buttons. The mockup eyes are small almonds or ovals. The spec read 0.15 W from a
  rabbit in 3/4 view, but the mockup cats, wolves, elephants, and pandas have small eyes.
- The heads are 1.32 W wide for all species. The mockup cat, wolf, and fox heads are 1.0 to 1.2
  W, with long muzzles.
- The spec kept the head at 1.0 H (0.31 of the height). Its own table gives 0.21 to 0.26 for the
  rabbits, the foxes, the dog, and the bear of the mockup.

`05-heads.png` shows six heads of the mockup above the same species of `main`.

![Heads](2026-10-07-mockup-match/05-heads.png)

## Ranked gaps

The rank is the gain in the default view for each hour of work. Costs are agent time without the
review rounds.

```text
  gain in the default view
  high |  1 conductor pose      2 eyes            3 head size (user)
       |  4 camera elevation    5 muzzles, head width
  mid  |  6 dark nape, chin     7 dog, elephant ears   8 hippo head
  low  |  9 light pool          10 piano inside    11 lamp glows
       +------------------------------------------------------------> cost
          1 h        2 to 3 h        4 to 6 h          10 h or more
```

### 1. The conductor seems to hold its head

- **Region:** the conductor, the center of the default view and of each conductor shot.
- **Measurement:** in the mockup, the elbows are at the shoulders and the forearms point up and
  out. The baton hand is at the height of the head top (y 360, head top y 348), and the left hand
  is 25 px outside the body. On `main`, both hands stay in front of the chest at the height of the
  mouth, 0 to 10 px from the outline of the head. From behind, the forearms point in to the head.
  The gallery back view shows the left hand behind the head. `02-conductor.png`.
- **Files:** `src/pose/conductor.ts` (`CONDUCTOR_HOLD.beatPoint`, `poleL`, `poleR`,
  `LEFT_HAND_PLACES`), `src/pose/conductor-left.ts`, `src/pose/conductor-clearance.test.ts`,
  design 5.4.
- **Fix:** move the beat point up and out: from `[-0.1, 0.45, -1.3]` to about
  `[0.35, 0.8, -0.95]` from the right shoulder, and mirror the quiet and mirror places of the left
  hand (`[-0.35, 0.7, -0.9]`). Point the elbow poles down and back (`[±1, -0.6, 0.3]`). Add a test
  that each hand stays at least 0.3 H outside the outline of the head in the view from behind.
  Keep the desk clearance and the 2 cm head clearance. The UX audit AM1 rejected a hand "next
  to the head" at 0.9 H up and 1.2 H forward. The new place is out at the side, so the hand
  shows beside the head.
- **Cost:** 3 h.

![Conductor](2026-10-07-mockup-match/02-conductor.png)

### 2. The eyes are too large and round

- **Region:** each face. It shows most on the pandas, the elephant, the cats, and the dogs.
- **Measurement:** eye height / H is 0.07 to 0.17 in the mockup and 0.14 to 0.16 on the renders
  (0.21 H in the code). The panda, the elephant, and the hippo of the mockup have eyes of 0.04
  to 0.08 W. On `main`, they have the same 0.13 W eyes as the rabbit.
- **Files:** `src/models/eyes.ts` (`EYE`, `EYE_LIGHTS`, `eyePlace()`), `src/models/species.ts`,
  design 4.5, a new decision file.
- **Fix:** an eye form for each species, with three forms: an almond of 0.16 × 0.09 H for the
  cat, the fox, the wolf, and the dog, an oval of 0.13 × 0.12 H for the rabbit and the mouse, and
  a small eye of 0.07 × 0.07 H for the elephant, the hippo, the panda, and the bears. One small
  light. An amber iris ring for the cat, the fox, and the wolf. The user asked for "cute" on
  2026-10-06, so show the user one image with the spec eyes and these eyes before the merge.
- **Cost:** 3 h, and one user decision.

```typescript
/** The eye of a species (design 4.5). Values in H. */
export interface EyeForm {
  /** Width and height of the eye. The width is the larger value for an almond. */
  readonly size: readonly [width: number, height: number];
  /** The color of the iris ring, or null for a black eye. */
  readonly iris: Rgb | null;
  /** The diameter of the one light. */
  readonly light: number;
}
```

### 3. The heads are too large for the bodies

- **Region:** all players. It is the largest difference of the default view, together with
  gap 4.
- **Measurement:** head height / body height is 0.21 to 0.26 in the mockup and 0.30 to 0.36 on
  `main`. The heads have the same pixel size in both images, so the bodies of `main` are 0.6 to
  0.7 of the mockup bodies. The mockup rabbits and foxes are slim, with long legs.
- **Files:** `src/models/body-frame.ts` (`H`, the stance), `src/models/trunk.ts`,
  `src/models/legs.ts`, `src/models/head.ts`, the holds of `src/pose/` and
  `src/models/instruments/hold.ts`, the layout tests.
- **Fix:** two choices for the user. (a) A head of 0.85 H on the small and medium species, with
  the body points unchanged. The holds move with the mouth and the chin, and the tests of the
  holds, the snouts, and the hidden heads need new values. (b) Keep the head, and make the torso
  0.15 H longer and the legs 0.1 H longer, with taller chairs. The seat rows and the stands
  change. The user chose 1.0 H against 1.15 H on 2026-10-07. A head below 1.0 H was not one of
  the choices.
- **Cost:** 10 to 14 h, and one user decision.

### 4. The camera looks down too steeply

- **Region:** the default view and the conductor shots.
- **Measurement:** about 34° at the podium on `main`, about 15° to 21° in the mockup. The mockup
  shows the faces and the bodies of the back rows above the front rows. `main` shows the head
  tops and the floor between the rows.
- **Files:** `src/shots/view.ts` (`DEFAULT_ELEVATION` 28°, `LANDSCAPE_RULE`, `VIEW_OFFSET_Y`),
  `src/scene/hidden-heads.test.ts`, decision file `2026-10-06-polished-camera.md`, design 4.5.
- **Fix:** set `DEFAULT_ELEVATION` to 20° and raise the target by about 0.3 m, so that the stage
  keeps its place in the frame. Then run the hidden-heads test on all demos. The default demo
  has about 45 players, so the limit of 10% can fail in the back rows. If it fails, try 22° or
  24°.
- **Cost:** 2 to 3 h.

### 5. The muzzles are short and the heads are wide

- **Region:** the rabbits, the foxes, the cats, the wolves, and the dogs.
- **Measurement:** the snout in front of the eye is 0.25 H on the rabbit (mockup 0.75 H) and
  0.46 H on the dog (mockup 0.6 H). The long muzzle of the code reaches 0.25 H in front of the
  face. The head is 1.32 W for each species (mockup cat 1.0, wolf 1.1, fox 1.2).
- **Files:** `src/models/snouts.ts` (the `long`, `blunt`, and `short` muzzles), `src/models/head.ts`
  (the head rings), `src/models/species.ts` (`form.cheeks`), the mouth places of the wind holds.
- **Fix:** a head width form for each species (cat, wolf, fox 1.1 to 1.2 W). The long muzzle
  reaches 0.4 H, and the blunt muzzle 0.4 H. The rabbit gets a muzzle that reaches 0.3 H, so
  that the head is an egg in side view. Keep the mouth places of the winds, or move the holds
  with them.
- **Cost:** 5 h.

### 6. The nape and the chin show dark seams

- **Region:** the conductor (from behind) and the rabbits in the default view.
- **Measurement:** the nape of the conductor has a luma of 11 against 43 on its back (mockup 55
  against 37). Each rabbit shows a dark line of 2 px under the chin (luma 30 to 60 against 150
  to 190), which reads as a collar. The gallery back view of the bear shows a dark shelf under
  the head and dark slits behind the knees.
- **Files:** `src/models/trunk.ts` (neck ring and jaw ring), `src/models/head.ts`,
  `src/models/shading.ts` (the baked occlusion of the faces that point down), design 4.5.
- **Fix:** fill the gap between the jaw ring and the top of the torso at the back and the front,
  and clamp the baked occlusion of the head bottom and the knee fold to at most 0.5 darkening.
  Check in the default view, from behind, and in the side shot.
- **Cost:** 2 to 3 h.

### 7. The ears of the dog and the elephant

- **Region:** the cellos and the timpani.
- **Measurement:** the beagle ears of the mockup hang 1.1 H, below the chin. On `main`, the ears
  are 0.5 H and read as brown cheeks, so the dog looks like a Saint Bernard pup. The elephant ears
  of the mockup are 1.4 H high and reach 0.5 W past the cheeks, beside the face. On `main`, they
  point 32° back behind the head and show only at its top corners, as the ears of a mouse.
- **Files:** `src/models/ears.ts` (`floppyEar()`, `flapEar()`, `FLAP_EAR_ANGLE`, `FLAP_OUTLINE`),
  `src/models/ears.test.ts`.
- **Fix:** the floppy ear grows to 1.0 H long and 0.35 H wide, and hangs from the crown sides. The
  flap ear turns forward to about 70° from the middle plane, its base moves out to 0.55 H, and it
  grows by 1.25. Check the clearance of two elephants on neighbor seats and of the timpani
  sticks.
- **Cost:** 3 h.

![Back row](2026-10-07-mockup-match/04-back-row.png)

### 8. The hippo head is a flat disc

- **Region:** the contrabasses in the back row.
- **Measurement:** the mockup hippo has a round head with a large round muzzle, nostrils on the
  top of the muzzle, and small ears on the top. The `broad` muzzle of `main` is a flat plate of
  0.88 H. From the camera, the head reads as a helmet.
- **Files:** `src/models/snouts.ts` (`broad`), `src/models/head.ts`.
- **Fix:** a muzzle of two round lobes, 0.5 H deep, with two nostril bumps on the top, and the
  eyes on two small bumps on the crown.
- **Cost:** 2 h.

### 9. The light pool is too bright and too wide

- **Region:** the stage.
- **Measurement:** the center pool is 127 (mockup 95), the back left of the stage is 67
  (mockup 36), and the top band of the hall is 79 (mockup 49).
- **Files:** `src/scene/lights.ts` (the key light and its cone), `src/models/colors.ts`.
- **Fix:** narrow the cone from 34° to about 28° and lower the key light by about 15%. The cast
  colors of `2026-10-07-cast-colors.md` use this light, so tune the fur colors again with the same
  samples.
- **Cost:** 2 h.

### 10. The inside of the piano is a flat gold tray

- **Region:** the piano at the left, and the piano solo shot.
- **Measurement:** the inside of the piano is 80 with the saturation 0.75 in the default view,
  and about 180 in the solo shot. The mockup inside is 40, dark, with gold lines.
- **Files:** `src/models/instruments/piano.ts`, `src/models/colors.ts` (`pianoPlate` `#b8913f`).
- **Fix:** a dark soundboard, a darker plate (about `#6b5226`), and a few dark string bands.
- **Cost:** 1 h.

### 11. Lamp glows float above the stage

- **Region:** the top of the default view.
- **Measurement:** four glow discs of the hall lamps show at y 75 to 110 of 900, above the back
  of the stage. The mockup default view has no lamp glows. The close views of `scene.png` have
  them.
- **Files:** `src/scene/hall.ts` (the lamp rows and the glow points).
- **Fix:** fade the glows in the wide shots, or keep only the row below the balconies.
- **Cost:** 1 h.

`03-strings.png` shows the string sections. It shows gaps 2, 3, 4, 5, and 6 together.

![Strings](2026-10-07-mockup-match/03-strings.png)

### Differences on purpose

These differences come from decisions, so this review does not rank them:

- The polar bear plays the piano in place of the meerkat (`2026-10-06-polar-bear-pianist.md`).
- The default demo has about 45 players in place of about 22. The demo list holds licensed
  pieces.
- The conductor shot is a view from behind over the orchestra, as view 02 of `scene.png`.

## Checks

Each command ran alone on `dcb2a48`, at a load average of 38 to 52 from other agents.

| Command | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 173 files, 1,922 tests |
| `pnpm format:check` | pass |
| `pnpm build` | pass |
| `pnpm size` | pass: 294,610 B of 1,000,000 B |

`node tools/measure-frame.ts` with `perf-60.mid` (60 players, 1440 × 900, device scale 2):

| Mode | Load average | Main thread p95 (callback) | GPU p95 (timer query) |
|---|---|---|---|
| Cinematic, run 1 | 54 to 40 | 4.80 ms | 18.45 ms |
| Cinematic, run 2 | 51 to 123 | 4.70 ms | 20.69 ms |
| Free | 40 to 32 | 4.40 ms | 8.86 ms |

The load was too high for a decision on the target of 4 ms (design 9.7). The Free value agrees
with the scene polish (8.55 to 10.28 ms at a load of 165 to 340). The Cinematic GPU time is about
twice the Free time. Measure it again at a low load before more geometry goes in.
