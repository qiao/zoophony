# The dog family of stage P2: the wolf, the dog, and the cat

Date: 2026-10-08. Branch: `p2-wolf`, from `main` at `7c669cd` (after the fox look). This report
gives the measures and the feature checklists of stage P2 of
[`2026-10-07-proportions.md`](2026-10-07-proportions.md). It uses the method of the fox look
([`2026-10-08-fox-look.md`](2026-10-08-fox-look.md)).

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
