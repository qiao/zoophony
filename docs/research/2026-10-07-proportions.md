# Proportions: the model sheets against our skeleton

Date: 2026-10-07. Branch: `proportions`, from `main` at `0b1b1e1`. The user approved one skeleton
for each species: "each species gets its own skeleton proportions (a larger head, a shorter body
and legs), measure first". This report gives the measurements, the cost of each skeleton change
in the code, and a plan in stages.

## 1. Summary

- **The sheets do not show a larger head.** In head heights, all four sheets have a longer torso
  than our bodies, and the shoulders are much higher. Against the chair and the violin, the heads
  of the sheets are 0.78 to 0.86 of our heads (fox, rabbit, dog). The polar bear has our head
  size and a much larger body.
- **The sheets show a shorter body and shorter legs only against the chair.** In meters on a
  chair of 0.35 m, the crown of the sheet fox is 1.20 m above the floor (ours 1.24 m), and the
  crown of the sheet rabbit is 1.11 m (ours 1.22 m). Against their own heads, the bodies are
  longer.
- **Our proportions come from `animals.webp`.** The head top is 2.3 H above the seat "so that the
  head is 0.30 of the height of a seated rabbit, as in `animals.webp`" (`src/models/trunk.ts:90`).
  Our visible heads are 0.26 to 0.29 of the height from the floor to the crown. In the new sheets,
  this share is 0.25 (fox), 0.23 (rabbit), 0.22 (polar bear), and 0.18 (dog).
- **The largest gaps, as the factor sheet / ours:** the shoulder joint above the seat (1.44 to
  2.07), the chin above the seat (1.18 to 1.93), and the haunch length (1.22 to 1.78). The fox
  head is 1.19 times as wide, and the fox shoulders are 0.77 times as wide. The dog and the
  polar bear are 1.64 times as wide at the shoulders.
- **The cat, the panda, and the penguin of the scenes match our heights within 10%.** The wolf and
  the bear of the scenes have the high shoulders and the long torso of the sheets.
- **The skeleton values are module constants today.** Each body part reads them, and all species
  share them, except the head height `H` and the girth. A seam (stage P0) puts them in one table
  for each species, with today's values as the defaults.
- **Cost, measured.** One skeleton change for all species fails up to 64 of 2,107 unit tests
  (a longer torso). The same change for the foxes and the wolf only fails 10 tests. Seven of them
  come from the three sculpts, which the experiment did not build again. Section 6 gives each
  experiment.
- **Plan.** Five stages, at most 2 agents at the same time: about 14.5 hours of wall time. The fox
  and the rabbit come first, after the seam (section 7).
- **A decision for the user.** The measurements contradict "a larger head". Section 8 gives three
  options. The report recommends option A: follow the sheets (a smaller head in meters, a longer
  torso in H, higher shoulders).

## 2. Method

### 2.1 The unit Hv

`H` in the code is a unit of length: `0.38 m × size` (`RABBIT_HEAD_HEIGHT` in
`src/models/species.ts:475`). The visible head of our bodies is shorter than `H`: the parametric
head is 0.87 to 0.92 H from the chin to the crown, and the red fox sculpt is 0.92 H (crown 0.54 H
above the head center, chin 0.38 H below it, design 4.4). The sheets show no `H`, so this report
uses the visible head height **Hv**: the distance from the chin to the crown, without the ears.
Each value of the tables is in Hv, for the sheet and for our body.

```text
          ear tip  ─┐
                    │  ear above the crown
  crown  ───────────┤ ─┐
                    │  │ Hv (chin to crown, no ears)
  chin   ───────────┤ ─┘
  shoulder joint ───┤   (center of the ball of the upper arm)
                    │
  knee top ─────────┤
  seat   ───────────┤   0 (all heights above the seat)
                    │
  floor  ───────────┘   minus the seat height
```

### 2.2 The sheets

- The agent read the pixel place of each landmark from crops of each sheet with a grid of 10 px
  (25 px for the large fox sheet). Each place is in the pixels of the original file.
- The agent measured the front view and the side view. The heads of the sheets tilt to the violin
  or to the cello, so Hv differs between the two views by up to 14% (fox: 237 px in the front
  view, 208 px in the side view). The tables use the mean of the two views.
- The sheets are perspective renders, and they show playing poses. A limb that points to the camera
  looks shorter, so an arm value is a lower limit. The error of a length is about ±8%, and of an arm
  segment about ±15%.
- Absolute sizes use the scale of the sheet where it has one: the meter lines of `dog-views.png`
  and the line of 180 cm of `polar-bear-views.png`. For the fox and the rabbit, they use a seat of
  0.35 m, the seat of our chair (`CHAIR` in `src/models/props.ts:49`). The chairs of the sheets
  have other forms: the seat of the rabbit chair is 1.67 times as wide as it is high (ours 1.2).
  Thus a value in meters is less certain than a value in Hv.
- The meter lines of `dog-views.png` are not evenly spaced: 364 px for each meter from 0 to 0.5 m,
  and 276 px for each meter from 1.0 to 1.5 m. The report uses the lines near each landmark.

### 2.3 Our bodies

- A script reads the bind pose of each species from `buildBiped()` on a seat of 0.35 m (the polar
  bear on the bench of 0.45 m), and groups the corners by their main bone. The head is the `head`
  and the `jaw` bones, the torso is `hips` to `neck`, and the paw is the part of `foot` within
  0.2 H of the floor.
- A small renderer in Python draws the same meshes with flat light from the front and from the
  right side, for the images of section 3.
- The scripts are in the scratch folder of the session. Section 9 gives the steps to make them
  again.

## 3. The four sheets

Each image shows the front view and the side view of the sheet beside our body in the same view,
at the same head height (Hv = 100 px), with the floors on one line. Each line gives its height
above the seat in Hv. Our bodies are in the bind pose, with the arms down.

![The fox sheet and our red fox](2026-10-07-proportions/fox.png)

| Measure (in Hv) | Sheet | Ours | Sheet / ours |
|---|---|---|---|
| Hv in meters (seat of 0.35 m) | 0.30 | 0.35 | 0.86 |
| Head width at the cheeks (no ears) | 1.44 | 1.21 | 1.19 |
| Head length, back of the skull to the nose | 1.38 | 1.33 | 1.04 |
| Ear tip above the crown | 0.40 | 0.58 | 0.69 |
| Crown above the seat | 2.82 | 2.54 | 1.11 |
| Chin above the seat | 1.82 | 1.54 | 1.18 |
| Shoulder joint above the seat | 1.60 | 1.07 | 1.50 |
| Shoulder width, outside of the arms | 1.19 | 1.54 | 0.77 |
| Torso width at the belly | 0.93 | 1.09 | 0.86 |
| Torso depth at the belly | 1.01 | 1.01 | 1.00 |
| Upper arm | 0.72 | 0.76 | 0.95 |
| Forearm | 0.63 | 0.71 | 0.89 |
| Hand, wrist to tip | 0.27 | 0.29 | 0.92 |
| Hip spread (knee spacing, front view) | 0.83 | 0.70 | 1.19 |
| Haunch, back of the haunch to the knee front | 1.52 | 1.25 | 1.22 |
| Knee top above the floor | 1.49 | 1.39 | 1.07 |
| Seat height | 1.16 | 1.00 | 1.16 |
| Paw length on the floor | 0.41 | 0.28 | 1.45 |
| Tail length | 1.10 | 1.20 | 0.92 |

![The rabbit sheet and our rabbit](2026-10-07-proportions/rabbit.png)

| Measure (in Hv) | Sheet | Ours | Sheet / ours |
|---|---|---|---|
| Hv in meters (seat of 0.35 m) | 0.26 | 0.33 | 0.78 |
| Head width at the cheeks (no ears) | 1.15 | 1.50 | 0.77 |
| Head length, back of the skull to the nose | 1.39 | 1.66 | 0.84 |
| Ear tip above the crown | 0.95 | 1.30 | 0.73 |
| Crown above the seat | 2.95 | 2.61 | 1.13 |
| Chin above the seat | 1.95 | 1.61 | 1.21 |
| Shoulder joint above the seat | 1.60 | 1.11 | 1.44 |
| Shoulder width, outside of the arms | 1.65 | 1.58 | 1.04 |
| Torso width at the belly | 1.43 | 1.45 | 0.98 |
| Torso depth at the belly | 0.91 | 1.35 | 0.67 |
| Upper arm | 0.70 | 0.80 | 0.88 |
| Forearm | 0.80 | 0.74 | 1.08 |
| Hand, wrist to tip | 0.30 | 0.27 | 1.10 |
| Hip spread (knee spacing, front view) | 0.98 | 0.73 | 1.35 |
| Haunch, back of the haunch to the knee front | 2.00 | 1.27 | 1.57 |
| Knee top above the floor | 1.83 | 1.45 | 1.26 |
| Seat height | 1.37 | 1.05 | 1.31 |
| Foot length on the floor | 1.01 | 0.92 | 1.10 |
| Tail (puff) length | 0.37 | 0.55 | 0.68 |

![The dog sheet and our dog](2026-10-07-proportions/dog.png)

| Measure (in Hv) | Sheet | Ours | Sheet / ours |
|---|---|---|---|
| Hv in meters (meter lines of the sheet) | 0.29 | 0.37 | 0.79 |
| Head width at the cheeks (no ears) | 1.09 | 1.33 | 0.82 |
| Head width with the hanging ears | 1.48 | (ears not counted) | n/a |
| Head length, back of the skull to the nose | 1.37 | 1.72 | 0.80 |
| Crown above the seat | 3.90 | 2.50 | 1.56 |
| Chin above the seat | 2.90 | 1.50 | 1.93 |
| Shoulder joint above the seat | 2.20 | 1.07 | 2.07 |
| Shoulder width, outside of the arms | 2.48 | 1.51 | 1.64 |
| Torso depth at the chest | 1.33 | 1.36 | 0.98 |
| Upper arm | 0.95 | 0.76 | 1.25 |
| Forearm | 1.15 | 0.71 | 1.63 |
| Hand, wrist to tip | 0.30 | 0.26 | 1.15 |
| Lower leg spacing (front view, around the cello) | 2.38 | 0.70 | 3.42 |
| Haunch, back of the haunch to the knee front | 1.79 | 1.14 | 1.57 |
| Knee top above the floor | 2.20 | 1.33 | 1.66 |
| Seat height (0.45 m in the sheet) | 1.80 | 0.96 | 1.88 |
| Paw length on the floor | 0.73 | 0.47 | 1.56 |
| Tail length | 1.59 | 0.67 | 2.36 |

The cello hides the belly of the dog in the front view.

![The polar bear sheet and our polar bear](2026-10-07-proportions/polar-bear.png)

| Measure (in Hv) | Sheet | Ours | Sheet / ours |
|---|---|---|---|
| Hv in meters (line of 180 cm) | 0.35 | 0.36 | 0.98 |
| Head width at the cheeks (no ears) | 1.34 | 1.49 | 0.90 |
| Ear tip above the crown | 0.00 | -0.13 | n/a |
| Crown above the seat | 3.40 | 2.64 | 1.29 |
| Chin above the seat | 2.40 | 1.64 | 1.46 |
| Shoulder joint above the seat | 1.77 | 1.13 | 1.57 |
| Shoulder width, outside of the arms | 2.62 | 1.60 | 1.64 |
| Torso width at the belly | 2.48 | 1.62 | 1.53 |
| Torso depth at the belly | 1.95 | 1.49 | 1.30 |
| Upper arm | 1.00 | 0.80 | 1.24 |
| Forearm | 1.28 | 0.75 | 1.71 |
| Hand, wrist to tip | 0.34 | 0.28 | 1.23 |
| Hip spread (knee spacing, front view) | 1.85 | 0.74 | 2.51 |
| Haunch, back of the haunch to the knee front | 2.45 | 1.38 | 1.78 |
| Knee top above the floor | 1.66 | 1.77 | 0.94 |
| Seat height (bench) | 1.20 | 1.24 | 0.97 |
| Foot length on the floor | 1.15 | 0.80 | 1.43 |

The back of the head and the tail do not show in the polar bear sheet.

### 3.1 Absolute sizes

| Species | Crown above the floor, sheet | Ours | Hv, sheet | Ours | Violin length / Hv, sheet | Ours |
|---|---|---|---|---|---|---|
| fox | 1.20 m | 1.24 m | 0.30 m | 0.35 m | 1.7 to 2.4 | 1.45 |
| rabbit | 1.11 m | 1.22 m | 0.26 m | 0.33 m | 2.2 | 1.52 |
| dog | 1.62 m (seat 0.45 m) | 1.27 m | 0.29 m | 0.37 m | n/a | n/a |
| polar bear | 1.61 m | 1.41 m | 0.35 m | 0.36 m | n/a | n/a |

Our violin is 0.507 m long: `VIOLIN.length` × `INSTRUMENT_SCALE`
(`src/models/instruments/strings.ts:18`).
The violins of the sheets are 1.5 times as long as our violins against the head. This is a second
scale that does not use the chairs, and it agrees: the heads of the sheets are smaller.

## 4. The other species, from the scenes

`orchestra-side.png` shows the cast from the front left, from a lower angle than
`orchestra-latest.png`. The camera looks down by about 20° to 30°, so a vertical length shrinks by
up to 10%. A ratio of two vertical lengths keeps its value. The error of these values is about
±15%.

| Species | Measure (in Hv) | Scene | Ours | Scene / ours |
|---|---|---|---|---|
| cat | Crown above the floor | 3.6 | 3.59 | 1.00 |
| cat | Head width | 1.08 | 1.19 | 0.91 |
| wolf | Crown above the seat | 2.9 | 2.53 | 1.15 |
| wolf | Shoulder joint above the seat | 1.67 | 1.07 | 1.56 |
| wolf | Seat height | 1.4 | 1.05 | 1.33 |
| wolf | Torso width with the arms | 1.4 | 1.54 | 0.91 |
| panda | Crown above the seat | 2.4 | 2.64 | 0.91 |
| panda | Shoulder joint above the seat | 1.1 | 1.13 | 0.97 |
| panda | Head width | 1.3 | 1.49 | 0.87 |
| panda | Torso width | 1.65 | 1.84 | 0.90 |
| hippo | Body width | 1.85 | 1.35 | 1.37 |
| hippo | Crown above the floor | 3.2 (stands) | 2.9 (on the high stool) | n/a |
| elephant | Skull width between the ears | 0.7 | 1.38 | 0.51 |
| elephant | Ear span | 1.57 | n/a | n/a |
| bear | Crown above the floor (stands) | 4.6 or more | 3.41 | 1.35 or more |
| bear | Head width | 1.3 | 1.44 | 0.90 |
| bear | Torso width | 2.2 | 1.78 | 1.24 |
| penguin | Crown above the floor (stands) | 3.6 | 3.53 | 1.02 |
| penguin | Body width | 1.7 | 1.47 | 1.16 |

- The timpani hide the body of the elephant. The bear shows only from behind.
- The hippos of the scenes stand at their contrabasses. Ours sit on the high stool (design 4.6).
  This is a question of the support, outside the scope of the skeleton.

## 5. What the numbers mean

### 5.1 The pattern

| Group | Head against the body height | Shoulders | Haunch and legs |
|---|---|---|---|
| fox, rabbit, wolf | Smaller (crown 1.11 to 1.15 times as high above the seat, in Hv) | Joint 1.44 to 1.56 times as high. Fox shoulders narrower | Haunch 1.22 to 1.57 times as long |
| dog, polar bear, bear | Much smaller (crown 1.29 to 1.56 times as high) | Joint 1.57 to 2.07 times as high, 1.64 times as wide | Haunch 1.57 to 1.78 times as long, legs wide apart |
| cat, panda, penguin | Same (within 10%) | Same | No data from the scenes |

The head of a sheet sits low on the shoulders: the shoulder joint is 0.2 to 0.7 Hv below the chin.
On our bodies, it is 0.43 to 0.51 Hv below the chin, and a neck shows between the head and the
shoulders.

The fox head looks large in its sheet because it is wide (1.44 Hv) and the shoulders are narrow
(1.19 Hv). On our fox, the shoulders with the arms are 1.54 Hv, wider than the head.

### 5.2 Targets for the fox and the rabbit in code units

Option A (section 8) follows the sheets in Hv and in meters. A smaller `H` makes the seat higher in
head heights, as in the sheets: with `H` × 0.86 for the fox, the seat of 0.35 m is 1.16 Hv, the
value of the sheet. Then the body values in `H` grow.

| Value | Today (all species) | Fox, option A | Rabbit, option A |
|---|---|---|---|
| `H` | 0.380 m | 0.327 m (× 0.86) | 0.293 m (× 0.77) |
| Crown above the seat | 2.34 H (fox sculpt), 2.30 H | 2.59 H | 2.60 H |
| Head center above the seat (`HEAD_CENTER`) | 1.80 H | 2.05 H | 2.10 H |
| Shoulder joint above the seat (`SHOULDER_JOINT.height`) | 0.98 H | 1.47 H | 1.41 H |
| Shoulder joint from the middle (`SHOULDER_JOINT.spread`) | 0.52 H | 0.35 H | 0.53 H |
| Upper arm, forearm (`UPPER_ARM`, `FOREARM`) | 0.70, 0.65 H | 0.81, 0.75 H (today's meters) | 0.91, 0.84 H (today's meters) |
| Hip joint from the middle (`HIP_JOINT.spread`) | 0.32 H | 0.38 H | 0.43 H |
| Seated knee, forward of the hip and above the seat | 0.66, 0.22 H | 0.90, 0.12 H | 1.30, 0.22 H |
| Torso depth, as a factor | 1 | 1 | 0.67 |
| Crown above the floor | 1.239 m, 1.224 m | 1.197 m | 1.112 m |

- The arms keep their length in meters. The sheet arms are 0.79 (fox) and 0.75 (rabbit) times as
  long in meters, but our holds need today's reach (section 6.3).
- The knee of the rabbit at 1.30 H in front of the hip puts the toes about 0.13 m further forward.
  The music stands then move (section 6.3).
- The head forms (width, ears, muzzle) belong to the sculpts. The head width of the fox grows from
  1.11 H to 1.33 H. The rabbit head is narrower: 1.01 H in place of 1.32 H.

## 6. Cost of each change

### 6.1 Who reads the skeleton

The skeleton values are constants of `src/models/`. All later modules read the bones and the body
points of `buildBiped()`, and many of them add offsets in `H` that agents tuned against today's
skeleton.

```text
 species.ts              body-frame.ts               trunk.ts, arms.ts, legs.ts
+---------------+       +---------------------+     +---------------------------+
| size, girth   |------>| H = 0.38 m x size   |---->| HEAD_CENTER 1.8, CHEST,   |
| legs (group)  |       | SHOULDER_JOINT 0.98 |     | NECK, TORSO_PROFILE,      |
+---------------+       | HIP_JOINT 0.3, 0.32 |     | UPPER_ARM 0.7, FOREARM    |
                        | STANDING_BASE 0.77  |     | 0.65, SEATED_LEGS knee    |
                        +---------------------+     +-------------+-------------+
                                                                  | BodyBones: bones, H,
                                                                  | head center, mouth,
                                                                  v palms, finger blocks
   +----------------+---------------+----------------+-----------+----------------+
   |                |               |                |                            |
   v                v               v                v                            v
 instruments/     pose/           shots/          footprint.ts,               sculpt-rig.ts
 hold.ts:         ik, rest,       subjects.ts:    layout*.ts:                 -> Blender ->
 offsets in H     lap, hang,      head radius     boxes of the mesh,          sculpts/*.ts
 from the head,   bowed-rig,      0.6 H, chest    stage sides pinned          (bones pinned
 mouth, palms     winds, cond.    = head - 1 H    to 5 mm                     by a test)
```

- `src/models/instruments/hold.ts:94` places each piece at a body point plus `offsetH × H`. The
  violin hangs 0.6 H below the head center (`CHIN_HOLD`, `strings.ts:74`). A new head center moves
  each violin, flute, and clarinet with it.
- `src/shots/subjects.ts:348` puts the chest of a subject 1 H below the head center. With a
  longer torso, this point moves into the neck. It must read the `chest` bone.
- `placeSculpt()` (`src/models/sculpt.ts:246`) gives `null` when the sculpt was built for another
  `H`. Then the body is parametric, with no error. `sculpt.test.ts` catches it, because it compares
  the bones of each sculpt with the current skeleton.
- A sculpt holds seated legs for a drop of 0.35 m only (`SCULPT_STANCES`, `tools/sculpt-rig.ts`).
  A new chair height for a species needs a new stance in the sculpt.

### 6.2 Experiments

Each experiment changed one constant in the worktree, ran `pnpm test` (2,107 tests in 182 files on
`0b1b1e1`), and put the code back. The count is the first run, before any fix.

| Experiment | Change | Failed tests | Files | Main failures |
|---|---|---|---|---|
| Torso, all species | Each height above the hip joints × 1.25 (head center 1.8 to 2.18 H, shoulder 0.98 to 1.15 H) | 64 | 16 | `species.test.ts` 20 (head top pinned at 2.3 H), `trunk.test.ts` 14 (ring heights), `play-clearance.test.ts` 5, `shots/prepare.test.ts` 4 (low cameras, choir shots, plan stability 72% against 75%), `layout-scene.test.ts` 3 (stage sides), `bowed.test.ts` 3 (bow reach, fingerboard map, bow-hand turn 1,128°/s), `winds.test.ts` 3 (horn grip, 97% reach, trombone slide), `arm-joints.test.ts` 2, others 10 |
| Torso, fox and wolf | The same, for the 3 dog-family sculpts | 10 | 4 | `sculpt.test.ts` 3, `species.test.ts` 3, `arm-joints.test.ts` 2, `play-clearance.test.ts` 2 (violin, flute) |
| Shoulders, fox and wolf | Shoulder spread 0.52 to 0.42 H | 5 | 2 | `sculpt.test.ts` 3, `arm-joints.test.ts` 2 (the yoke of the sculpt) |
| Arms, all species | Upper arm 0.85 H, forearm 0.80 H | 15 | 8 | `layout-scene.test.ts` 5 (stage of 8.12 m grows to 8.29 m, 8 contacts in Beethoven 9), `rest-clearance.test.ts` 2 (19 points), `sculpt.test.ts` 3, a rabbit choir hand below the floor, the violin play clearance |
| Haunch, digitigrade | Seated knee 0.80 H forward and 0.40 H above the seat | 7 | 4 | `sculpt.test.ts` 3, toes past 1.11 H (music stands), harp palms off the thighs, viola and cello play clearance |
| `H`, fox and wolf | `H` × 1.15 (the whole body larger) | 14 | 6 | `sculpt.test.ts` 4, `layout-scene.test.ts` 3 (stage +0.027 m, a hidden first desk), `species.test.ts` 3, `prepare.test.ts` 2, `sculpt-rig.test.ts` 1, `player.test.ts` 1 |
| `H`, all species | `RABBIT_HEAD_HEIGHT` 0.38 to 0.33 m | 110 | 29 | Pins in meters across the models, the poses, the instruments, and the shots |

`hidden-heads.test.ts` (at most 10% of a head hidden in the default view) passed in each
experiment. A change for one species only fails about one sixth of the tests of the same change
for all species.

### 6.3 Cost of each kind of change

| Change | What it breaks | Fix | Cost for one species |
|---|---|---|---|
| Head size `H` in meters | All offsets in `H` scale with it: holds, rest places, conductor hands, shots. The sculpt falls back to the parametric body. Pinned stage sides | Build the sculpt again. Update the pins of `species.test.ts`, `sculpt-rig.test.ts`, and the stage sides | 1 to 2 h |
| Longer torso, higher head center | The violin, the flute, and the clarinet move up with the head. The bow arm and the wind arms must reach higher (97% rule). Shots read head heights. The head pin of 2.3 to 2.37 H | A per-species head pin. Check each hold of the species. Read the `chest` bone in `subjects.ts` | 1.5 to 3 h |
| Higher shoulder joints | The shoulder ball must stay 0.05 H inside the torso (`arm-joints.test.ts`). The torso rings near the joints must follow. The rest arms reach the thighs from higher up | Scale `TORSO_PROFILE` between the base and the joints with the joint height | Part of the torso change |
| Narrower shoulders | The yoke of the sculpt. The bow arm of a narrow body comes closer to the chin | Build the sculpt again, check the play clearance | 0.5 h |
| Shorter arms in meters | The full bow hair, the fingerboard, and the far keys go out of reach (`bowed.test.ts:183`, `winds.test.ts:136`). The conductor hands drop | Keep the arms in meters (recommended), or shorten the bow stroke. A smaller instrument for a smaller species would differ inside a section of two species, so the report advises against it | 0 h if kept, 3 h or more if not |
| Longer arms | The rest arms go into the thighs (19 points). Footprints grow, and the stages grow by up to 0.17 m | Retune the rest places of the species, re-pin the stage sides | 1 to 2 h |
| Longer haunch, knee forward | The toes pass 1.11 H in front of the hip, near the music stands. The harp palms leave the thighs. The bow arm of the viola and the cello touches the knee | Move the stands with the knee, retune the lap places | 1 to 2 h |
| Chair height for one species | `CHAIR` is one size for all (`props.ts:49`), and `chairForward()`, the sculpt stances, the layout, and the footprints read it. A new size adds a stance to each sculpt | Avoid it. The smaller `H` of option A gives the seat height of the sheets on the same chair | 3 h or more |
| Longer tail | The stage side follows the tail depth (`layout-scene.test.ts` pins it to 5 mm) | Let the tail lie on the seat, as the sheets, or re-pin | 0.5 to 1 h |

Each stage also pays the fixed costs of design 9.8: the screenshots, a review of the default view,
`pnpm test:perf` for the pose and the shots, and the design update. That is about 1 hour.

## 7. Plan

### 7.1 The seam: one proportions table for each species

All values stay where the parts need them, but the parts read them from one table. The defaults are
today's constants, so the seam stage changes no bone.

```typescript
/** The skeleton of one species (design 4.5). Lengths are in H unless noted. */
export interface BodyProportions {
  /** The head height `H`, in meters. Default: 0.38 m × size. */
  readonly headHeight: number;
  /** The head center above the base of the torso. Default 1.8. */
  readonly headCenter: number;
  /**
   * The shoulder joints above the base of the torso. Default 0.98. The torso rings between the
   * base and the joints scale with it.
   */
  readonly shoulderHeight: number;
  /** The distance of each shoulder joint from the middle, before the girth. Default 0.52. */
  readonly shoulderSpread: number;
  /** The upper arm, from the shoulder joint to the elbow. Default 0.7. */
  readonly upperArm: number;
  /** The forearm, from the elbow to the wrist. Default 0.65. */
  readonly forearm: number;
  /** The distance of each hip joint from the middle, before the girth. Default 0.32. */
  readonly hipSpread: number;
  /** The seated knee: forward of the hip joint and above the seat. Default: the leg group. */
  readonly seatedKnee: KneePlace;
  /** The factor of the depth of the torso. Default 1. */
  readonly torsoDepth: number;
}

/** The parameters of one species: the new field. */
export interface SpeciesParams {
  // ... the fields of today
  /** The skeleton of the species. A missing value takes its default. */
  readonly proportions?: Partial<BodyProportions>;
}
```

```text
 SPECIES[id].proportions  --proportionsOf()-->  BodyProportions (all values)
                                                  |
                                                  v
                                       bodyFrame(): frame.body
                                                  |
               +----------------------------------+------------------------+
               v                  v                v                       v
           trunk.ts           arms.ts           legs.ts            species.test.ts:
           head center,       joints,           hip joints,        head top from the
           torso rings        lengths           seated knee        table, per species
```

- `proportionsOf(species)` fills each missing value with its default. It is pure, and a test
  checks that the defaults give today's bones for each species (a snapshot of `sculptRig()`).
- `subjects.ts` reads the `chest` bone in place of "head center − 1 H". This is a change in
  `src/shots/`, so it waits for the agent that works there now, or goes into its branch.
- The tests that pin a skeleton value read it from the table.

### 7.2 Stages

At most 2 agents work at the same time. Each stage ends with `pnpm test`, `pnpm test:perf`,
`pnpm size`, the screenshots of design 9.8, a review, and the update of design 4.5 and 4.7.

| Stage | Work | Agents | Wall time |
|---|---|---|---|
| P0 Seam | `BodyProportions`, `proportionsOf()`, the reads in `body-frame.ts`, `trunk.ts`, `arms.ts`, `legs.ts`, the pins of the tests, and the snapshot test. No bone moves | 1 | 2.5 h |
| P1 Fox and rabbit | A: the red and the tan fox (option A row, the sculpts built again with `canine.py`, the holds of the violin and the flute, the stage pins). B: the rabbit (option A row, parametric body, the violin holds, the rest places). The second branch to merge makes the stage pins again | 2 | 3.5 h |
| P2 Dog family | A: the dog (the dog row, together with stage S2 of the Blender plan, so its sculpt builds one time). B: the wolf (the fox values) and a check of the cat (no change measured) | 2 | 3.5 h |
| P3 Large species | A: the polar bear (a wider and taller body on the bench, the piano reach). B: the bear conductor (taller, the conductor hands, the view from behind, the hidden heads) | 2 | 3.5 h |
| P4 Rest | The hippo (body width), and a check of the panda, the penguin, the elephant, and the species with no reference | 1 | 1.5 h |

```text
 P0 seam (1) --> P1 fox | rabbit (2) --> P2 dog | wolf (2)
    2.5 h            3.5 h                  3.5 h
                                              |
                                              v
                 P4 rest (1) <-- P3 polar bear | bear (2)
                    1.5 h              3.5 h
```

The total is about 14.5 hours of wall time.

- **The order with the Blender plan.** Each sculpt must fit the skeleton of its species. Do the
  proportions of a species before its first sculpt: the rabbit before stage S2 of the Blender plan,
  and the polar bear before S3. The fox and the wolf have sculpts now, so P1 and P2 build them
  again.
- **Layout pins.** `layout-scene.test.ts` pins the stage sides to 5 mm. Each species stage moves
  them. The agent that merges second makes the pins again from the new layouts, with a reason in
  the commit message.
- **Shots.** The shot plans follow the head heights. `prepare.test.ts` asks for 75% and 90% of the
  cuts to stay after small moves. Each stage checks the shots of the default demo.
- **Risk order.** The fox and the rabbit sit in the front rows, and a smaller `H` lowers their
  heads, so the hidden heads get better. The dog, the polar bear, and the bear get taller, and the
  bear stands in front of the camera. They come later, so that the method is known first.

## 8. Decision for the user

The decision text asks for "a larger head, a shorter body and legs". The sheets show a smaller
head against the body, the chair, and the violin, a longer torso, and higher shoulders. Three
options use the same seam and the same stages:

| Option | Head in meters | Torso and shoulders in H | Matches the sheets | Cost |
|---|---|---|---|---|
| A. Follow the sheets (recommended) | Fox × 0.86, rabbit × 0.77, dog × 0.79, polar bear × 0.98 | Longer, joints 1.4 to 2.2 Hv above the seat | Yes, in Hv and in meters | The plan of section 7 |
| B. Keep the heads | No change | Longer, as A | In Hv only. The fox gets 0.1 m taller, the dog 0.5 m | As A, plus a larger risk of hidden heads |
| C. Larger heads, shorter bodies | Larger | Shorter | No: against all four sheets | As A |

## 9. How to make the measurements again

1. Run `pnpm install`.
2. Write a script that calls `buildBiped(new MeshBuilder(), SPECIES[id], seated(0.35))` (the polar
   bear with `seated(0.45)`), builds the mesh, and groups the corners by `MeshData.bones`. Take the
   extents of each group, and the bones of `BodyBones.positions`.
3. Divide each value by the visible head height: the crown (the highest `head` corner) minus the
   chin (the lowest `head` or `jaw` corner within 0.2 H of the middle plane). For the red fox
   sculpt, use the chin 0.38 H below the head center.
4. For a sheet, crop each view with a pixel grid and read the landmarks of section 2.1. Divide by
   the mean Hv of the front view and the side view.
5. For an experiment of section 6.2, change one constant, run `pnpm vitest run --reporter=json`,
   count the failed tests, and put the code back.
