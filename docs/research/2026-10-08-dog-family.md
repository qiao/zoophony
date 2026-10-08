# The dog family of stage P2: the wolf, the dog, and the cat

Date: 2026-10-08. Branches: `p2-wolf` (the wolf), and `p2-dog` after it (the dog and the cat),
from `main` at `7c669cd` (after the fox look). This report gives the measures and the feature
checklists of stage P2 of [`2026-10-07-proportions.md`](2026-10-07-proportions.md). It uses the
method of the fox look ([`2026-10-08-fox-look.md`](2026-10-08-fox-look.md)).

## 1. Method

- **Hv** is the visible head height of the proportions report: 0.92 H for the dog family. A
  height in Hv is above the seat.
- The scenes `orchestra-latest.png` and `orchestra-side.png` have an error of about 15% for a
  length (report, section 4). A ratio of two vertical lengths keeps its value.
- A color sample is the mean of a box of 7 × 7 px. "Default view" is the first screen of the
  Boulanger demo at 1440 × 900 with 2 device pixels for each CSS pixel, before play.
- "State" is `done` when a feature matches within the error of the picture, `partly` when a part
  of it matches, and `open` when it does not match.
- The scripts are in [`scripts/dog-family/`](scripts/dog-family/): `preview.sh` renders the
  Blender previews, `capture.mjs` takes the views page and the default view, `sample.py` samples
  the colors, and `compose.py` makes the side-by-side images. `measure.mjs` gives the heights of
  a body on the chair.
- The shares of the hidden heads and the counts of the high shots come from copies of
  `src/scene/hidden-heads.test.ts` and of the N4 test of `src/shots/prepare.test.ts` that print
  each share and each count. The copies are not in the repository.

```text
 orchestra-latest.png, orchestra-side.png        crops, color samples (sample.py)
                 |                                        |
                 v                                        v
           +-----------+   option A row   +--------------------------+
           | checklist |----------------->| SPECIES[id].proportions  |
           +-----------+   measures in H  | tools/blender/<id>.py    |
                 ^                        +------------+-------------+
                 |                                     | pnpm sculpt <id>
                 |                                     v
   compose.py <--+---- Blender preview, views page, default view (capture.mjs)
```

## 2. The wolf

![The wolf of the scenes, the Blender preview, the views page, and the default view](2026-10-08-dog-family/wolf-side-by-side.png)

### 2.1 The skeleton

The scenes give the crown, the shoulder joints, the seat, and the width with the arms (report,
section 4). The other values come from the foxes, as the plan of the report says.

| Value | Before | Scene | After | Note |
|---|---|---|---|---|
| `headHeight` | 0.361 m | n/a | 0.315 m (× 0.87) | the crown stays 1.191 m above the floor |
| Crown above the seat | 2.53 Hv | 2.9 Hv | 2.90 Hv | head center 2.14 H |
| Shoulder joints above the seat | 1.07 Hv | 1.67 Hv | 1.67 Hv | 1.54 H |
| Torso width with the arms | 1.54 Hv | 1.4 Hv | 1.39 Hv | shoulder spread 0.45 H |
| Seat height | 1.05 Hv | 1.4 Hv | 1.21 Hv | the chair of 0.35 m stays (report, 6.3) |
| `upperArm`, `forearm` | 0.7, 0.65 H | n/a | 0.8, 0.745 H | the meters of before |
| `hipSpread` | 0.32 H | n/a | 0.38 H | the foxes |
| `seatedKnee` | 0.66, 0.22 H | n/a | 0.78, 0.12 H | the foxes |

A seat of 1.4 Hv needs a head of 0.25 m. Then the crown is 1.08 m above the floor, 0.11 m lower
than before. The skeleton keeps the height of the body, as the decision of option A asks.

### 2.2 The checklist

"Before" is `main` at `7c669cd`.

| Feature | Scenes | Before | After | State |
|---|---|---|---|---|
| Head on high shoulders | the chin just above the shoulders, no neck shows | the shoulder joints 0.98 H high, a neck | 1.54 H, the chin 0.23 Hv above the joints | done |
| Head form | a wedge with a flat top between the ears, a long muzzle | a round skull 0.88 H wide | a flat crown 0.72 H wide on the skull | done |
| Cheeks | white ruffs that point down and back from under the eyes to the throat | tufts 0.58 H out at 0.4 H down: a white collar on the new skeleton | tufts 0.48 H out at 0.3 H down, a V to the chin, the white up to 0.1 H below the head center and down the throat | done |
| Ears | at the corners of the crown, a base down the side of the head, a dark inside with a gray rim | close together, the inside faces dark | a base 0.32 H wide turned 15°, a tip 0.24 H out, a dark inside of 0.7 with a rim | done |
| Torso | broad, about as wide as the haunches | a pear 1.0 H wide | 0.96 H at the belly, 0.76 H at the chest | done |
| Chest | light from the throat to a point between the haunches | a narrow bib with a flat bottom | a pointed bib 0.6 H wide at the joints, 0.84 H at 0.8 H, a point 0.12 H above the base | done |
| Hands | light, with a light cuff (values 133 to 171, arms 80 to 121) | gray | the belly color on the hands and the lower 0.15 of the forearms | done |
| Fur, default view | lit head 121 to 162, hue 16, saturation 0.19 to 0.30 | 138 to 154, hue 19, 0.39 to 0.40 (`#645e6f`) | 123 to 137, hue 17, 0.25 (`#585e7c`) | done |
| Chest color | light gray (117 to 170), the cheeks white (214) | `#ece8ff` | no change | partly: one belly color for the face and the chest |
| Eyes | amber almonds with a dark rim | amber almonds | no change | done |
| Legs | thin gray lower legs, gray paws | thin gray legs | no change | done |
| Pose | on the front half of the seat | the knee 0.66 H in front of the hip | the knee 0.78 H, the seat place of all species | partly: the body keeps the seat place of the chair |
| Tail | not visible in the scenes | a bushy tail with a white tip behind the chair | no change | n/a |

The views page shows the fur bluer than the default view, because its light is neutral (fox look,
section 4.1).

### 2.3 Tests and measures

- `skeleton-snapshot.test.ts`: the new hash of the wolf. No other pin moved: the stage sides of
  `layout-scene.test.ts` keep their values to 5 mm, and the holds of the clarinet pass.
- The high shots (N4): 52 of 82 section and solo shots are low (at least 50), and 9 are high (at
  most 12), the same as on `main`.
- The hidden heads of the default view: no pair hides 5% or more of a head, in each demo and test
  file.
- The sculpt has 2,534 triangles seated and 2,550 standing (limit 2,600).
- `tools/build-sculpt.ts` packed a blend weight below half a step as 0, but kept the second bone.
  The broad torso gave one such corner at the border of the neck and the head. The packer now
  makes the corner rigid.

## 3. The dog

![dog-views.png, the Blender preview, the views page, and the cellos of the default view](2026-10-08-dog-family/dog-side-by-side.png)

The bottom row shows the cellos of the default view on `main` and on this branch, and the dogs of
`orchestra-latest.png`.

### 3.1 The skeleton

The values in Hv use 0.92 H, as the report. "Sheet" is the dog table of the report.

| Measure | Before | Sheet | After | Note |
|---|---|---|---|---|
| `headHeight` | 0.399 m | 0.29 m (Hv) | 0.315 m (× 0.79) | Hv 0.29 m |
| Crown above the seat | 2.50 Hv | 3.90 Hv | 3.76 Hv | head center 2.95 H, section 3.3 |
| Crown above the floor | 1.27 m | 1.62 m (seat 0.45 m) | 1.44 m (seat 0.35 m) | 1.17 m and 1.09 m above the seat |
| Shoulder joints above the seat | 1.07 Hv | 2.20 Hv | 2.20 Hv | 2.02 H |
| Shoulders with the arms | 1.51 Hv | 2.48 Hv | 2.26 Hv | spread 0.8 H, arm 0.24 H thick at the joint |
| Upper arm, forearm | 0.76, 0.71 Hv | 0.95, 1.15 Hv | 1.0, 1.15 Hv | 0.92 and 1.06 H, section 3.3 |
| Head width at the cheeks | 1.33 Hv | 1.09 Hv | 1.09 Hv | skull 1.0 H wide |
| Head width with the ears | n/a | 1.48 Hv | 1.35 Hv | the ears hang close to the head |
| Head length | 1.72 Hv | 1.37 Hv | 1.53 Hv | partly: the muzzle is longer |
| Paw length | 0.47 Hv | 0.73 Hv | 0.74 Hv | |
| Tail length | 0.67 Hv | 1.59 Hv | 1.1 Hv | the tip stays above the floor when the dog stands |
| Seated knee | 0.66 H forward | haunch 1.79 Hv | 1.05 H forward, 0.2 H high | hips 0.5 H from the middle |
| Seat height | 0.96 Hv | 1.80 Hv | 1.21 Hv | the chair of 0.35 m stays (report, 6.3) |

### 3.2 The checklist

| Feature | `dog-views.png` | Before | After | State |
|---|---|---|---|---|
| Color | one golden color, lit 235 to 250, hue 34, saturation 0.53 to 0.59 | gray beagle with a brown cap and brown ears | `#f2d08e` on the whole body. Default view: lit head 236, hue 35, saturation 0.55 | partly: the views page shows a pale yellow (fox look, 4.1) |
| Nose | large, black (`#191515`) | small, brown | 0.3 H wide at the tip of the muzzle, `#1d1a19` | done |
| Eyes | dark brown with a light | black ovals | dark brown almonds 0.17 × 0.13 H with a light | done |
| Ears | soft, hang from the top of the head to the jaw | brown floppy ears | flaps 0.42 H wide from the crown to 0.55 H below the ear bone | done |
| Head | broad skull, a stop, a broad deep muzzle | a round head of the rings | skull 1.0 H wide with a flat crown, a broad muzzle | partly: the muzzle is 0.15 Hv longer and the stop is soft |
| Neck and shoulders | the head low on broad sloped shoulders | a neck between narrow shoulders | a neck 1.0 H wide, a yoke over shoulders 1.6 H apart | done |
| Chest fur | long fur at the front of the chest | none | a ruff with a pointed tip | partly: the facets of the sheet show many small tufts |
| Leg fur | long fur behind the forearms and the thighs | none | a short fin behind each elbow and a tuft under each thigh | partly: section 3.3 |
| Tail | a plume that hangs behind the chair to near the floor | a thin tail | a plume to 0.15 m above the floor with a light tip | partly: shorter and narrower |
| Arms | thick, long | 0.7 and 0.65 H | 0.92 and 1.06 H, 0.48 to 0.24 H thick | done |
| Paws | large | 0.47 Hv long | 0.74 Hv long | done |
| Cello | the scroll at the height of the crown | the cello of all players | no change | open: our scroll is about 0.3 m below the crown |
| Hind legs | wide apart around the cello | 0.7 Hv apart | 1.0 H apart at the hips | partly: the lower legs of the sheet are 2.38 Hv apart |

### 3.3 Tests and measures

- **Bow reach.** With the upper arm of the sheet (0.87 H), the bow arm reached the hair of the
  cello only from 0.045 m (limit 0.03 m). The contact point of the bow is 0.508 m above the floor,
  and the shoulder joint 0.986 m. With 0.92 H (1.0 Hv, within the error of 15% of an arm), the
  arm reaches 0.03 m to 0.525 m of the hair of 0.557 m.
- **The lift.** The rest bow lay on the right knee with its hair down. On the tall dog, the roll
  of the bow hand was +100° at rest and -88° in play, so the hand turned 1,499° a second in the
  lift (limit 1,000°). The rest bow of the cello turns its hair down and out, (1, -1, 0.3). The
  peak is 569° a second. A change of the knee, the arms, or the shoulders did not remove the
  peak.
- **The bow in the hand.** The canine hand put the stick 0.0143 H from the palm (limit 0.015 H)
  and 0.012 m into the finger ball at 224 s. The hand balls of the dog grow 0.05 H to the back of
  the hand, and the finger ball moves 0.03 H up the hand, as the parametric mitten. A fin of long
  fur at the middle of the forearm took the stick 0.002 m into the forearm at 60.4 s. The fin is
  now short and near the elbow.
- **The high shots (N4).** With the head center 3.09 H (the crown of the sheet), 50 of 83 section
  and solo shots were low (at least 50). The taller dogs hid more of the violas, and three viola
  section shots rose from 30° to 34° to 40°. With 2.95 H (the crown 3.76 Hv, 4% below the sheet),
  51 of 83 are low, and 10 are high (at most 12). `main` has 52 of 82.
- **The hidden heads.** In the default view of each demo and test file, no pair hides 5% or more
  of a head. The largest share is 3.9% (a monkey and an elephant of the choir file). The dogs
  hide no head.
- **The layout.** The cello stands 0.42 H + 0.44 m in front of the seat center, so it is 0.035 m
  nearer with the smaller H. The front of a cello player is 0.588 m in front of the seat center
  (0.608 m before), and its back is the tail, 0.333 m behind it. The stages are smaller:
  Boulanger 11.26 m, K. 315 8.93 m, Beethoven 9 11.77 m, Beethoven 8 9.84 m, and the choir 12.11 m
  (11.27, 9.0, 11.84, 9.91, and 12.18 m before).
- **The test pins.** `skeleton-snapshot.test.ts` has the new hash of the dog, and
  `layout-scene.test.ts` the five stage sides above.
- The sculpt has 2,126 triangles seated and 2,142 standing (limit 2,600).

## 4. The cat

![The cats of the scenes, and the violas of the default view before and after](2026-10-08-dog-family/cat-side-by-side.png)

The report measured the cat within 10% of the scenes (crown 1.00, head width 0.91), so its
skeleton and its forms stay. Only the colors and the pattern change.

| Feature | Scenes | Before | After | State |
|---|---|---|---|---|
| Pattern | plain gray, no stripes | two dark stripes on the forehead | none | done |
| Fur, default view | lit head 124 to 142, hue 17 to 20, saturation 0.17 to 0.22 | 127, saturation 0.40 (`#75707a`) | 126, hue 22, saturation 0.24 (`#747a98`) | done |
| Inner ears and nose | pink | belly color and a brown nose | pink accent `#d9928c` | done |
| Muzzle | white | the belly color on the lower face | no change | done |
| Chest | gray | a white stripe down the front | no change | partly: the parametric body gives the belly color to the chest and the face together |

## 5. For the later stages

- `canine.py` has new measures, each with a default that keeps the fox and the wolf sculpts to
  the byte: `hand_region`, `plain`, `ear_hang`, `eye_light` for eyes with no white, `neck`,
  `yoke`, `arm_radii`, `chest_ruff`, `arm_feather`, `leg_feather`, `hand_back`, and
  `finger_lift`. An accent nose of a canine species has the accent color.
- `tools/build-sculpt.ts` makes a corner rigid when its blend weight packs as 0 steps.
- The N4 test has a margin of one shot on this branch (51 of 83 low, limit 50). A taller
  species in the front rows raises the cameras of the sections behind it. Measure N4 after each
  change of the height of a species.
- `shots-speed.test.ts` failed on each run of `pnpm test:perf` of this stage, at loads of 40 to 60
  (6.9 and 7.0 against the limit 6.4). The other speed tests passed.
- The cello of the sheet is larger and more upright than ours: its scroll is at the height of the
  crown. A longer end pin for the cello moves the bow contact, the left hand, and the layout.
- The views page shows the dog pale yellow and the wolf blue, because its light is neutral and
  the colors are tuned for the warm default view (fox look, 4.1).
