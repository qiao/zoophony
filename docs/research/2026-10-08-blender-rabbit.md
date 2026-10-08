# Blender rabbit: a sculpt on the skeleton of option A, for stage P1

Date: 2026-10-08. Branch: `blender-rabbit`, from `main` at `c13df81` (after stage P0). The user
chose option A of [`2026-10-07-proportions.md`](2026-10-07-proportions.md): the skeleton of each
species follows its sheet. Stage P1 gives the rabbit its new skeleton. This branch builds the
rabbit sculpt now, on that target skeleton, so that P1 can wire it in quickly. The runtime does not
use the sculpt yet.

## 1. Summary

- **A recipe of the rabbit family.** `tools/blender/leporine.py` builds the rabbit of
  `rabbit-views.png`, and `tools/blender/rabbit.py` gives its measures. The steps that the dog
  family and the rabbit family share are new functions of `tools/blender/kit.py`.
- **On the target skeleton.** The sculpt has 2,334 triangles seated and standing (budget 2,600). Its
  module is 35,325 B, 15,201 B after gzip. A second build gives the same bytes.
- **The sculpt passes its own checks.** In a scratch copy of `main` with the option A values and
  the sculpt, every check of `sculpt.test.ts` passes (bones, colors, budget, closed shells, skin,
  rigid parts), and so does the head top window of `species.test.ts`.
- **Four tests fail only because of the sculpt, and P1 must fix them.** Three tests build parametric
  variants from `SPECIES.rabbit`, and one shot test counts 5 high shots against more than 5
  (section 5).
- **The fox, the tan fox, and the wolf do not change.** `pnpm sculpt` gives the same bytes for
  each of them. `canine.py` does not change, because the fox branch of P1 edits it.

![The sheet and the Blender rabbit](2026-10-08-blender-rabbit/rabbit-side-by-side.png)

The top row is `rabbit-views.png`. The bottom row is the sculpt on the chair of the previews, in
the same three views, and a close view of the head. Only the preview turns the arms forward from
the bind pose, so that the torso shows between them.

## 2. The target rig

The rig file is the input of the Blender build (`tools/sculpt-rig.ts`). The rabbit rig of `main`
still has the skeleton of today. A scratch copy of `main` got the option A values of the rabbit
row in `SPECIES.rabbit.proportions` (`scripts/blender-rabbit/patch_species.py`). Then
`node tools/sculpt-rig.ts rabbit <file>` wrote the target rig. Thus the bones come from the code
of P0 and the numbers of the report.

```text
 main (P0)                scratch copy                       Blender 5.2
+-----------+   copy    +-------------------------+  rig   +----------------------+
| src/,     |---------->| SPECIES.rabbit          |------->| build_sculpt.py      |
| tools/    |           |   .proportions = A row  | .json  |   rabbit.py          |
+-----------+           | sculpt-rig.ts rabbit    |        |   leporine.py, kit.py|
                        +-------------------------+        +----------+-----------+
                                    ^                                 | rabbit.json
                                    | sculpt: RABBIT_SCULPT           v
                        +-----------+-------------+        +----------------------+
                        | vitest --project unit   |<-------| build-sculpt.ts:     |
                        | (sections 4 and 5)      |        | sculpts/rabbit.ts    |
                        +-------------------------+        +----------------------+
```

| Value (option A) | Target | Rig, seated on 0.35 m |
|---|---|---|
| `H` | 0.293 m | 0.293 m |
| Head center above the seat | 2.10 H | 0.965 m (2.10 H) |
| Crown above the floor | 1.112 m | 0.965 + 0.5 H = 1.112 m |
| Shoulder joint above the seat | 1.41 H | 0.763 m (1.41 H), 0.53 H from the middle |
| Upper arm, forearm | 0.91, 0.84 H | 0.267 m, 0.246 m |
| Seated knee, forward of the hip and above the seat | 1.30, 0.22 H | 0.381 m forward, 0.414 m above the floor |
| Hip joint from the middle | 0.43 H | 0.126 m |
| Torso depth | × 0.67 | (the sculpt has its own depth, section 3) |

## 3. The recipe

The recipe uses the method of the dog family (`2026-10-07-blender-s1.md`): hulls of ellipsoids at
the bones, a voxel remesh, a decimate, a mirror, plane cuts for the colors, and rules for the skin.
These steps are new:

- **The base of the torso** is on the seat, 0.3 H below the hip joints. The dog family uses 0.15 H
  below the `hips` bone, which is true only for the default skeleton.
- **`kit.surface()`** casts a ray to the head shell. The eyes and the nose sit on the surface that
  it finds, so they follow each change of the head forms.
- **`kit.jitter()`** moves each vertex of the trunk and the thighs a seeded distance (at most
  0.014 H) along its normal. The facets then turn against each other, as in the sheet. A hash of the
  place with no sign on x keeps the mirror image and the bytes of a second build.

The measures come from the sheet. The scale of the side view is 317 px for each meter (the seat of
0.35 m), and the middle of the seat is the axis of the torso.

| Measure, in H | `rabbit-views.png` | Sculpt |
|---|---|---|
| Crown above the head center | 0.50 (skeleton) | 0.54 (test window 0.50 to 0.57) |
| Head width at the cheeks | 1.02 (report), 1.13 (front view) | 1.05 |
| Eye center below the crown | 0.44 | 0.44 |
| Ear tip above the crown | 0.85 | 0.89 |
| Back of the shoulders behind the torso axis | 0.25 | 0.26 |
| Back of the haunches behind the torso axis | 0.39 | 0.41 |
| Depth of the lower leg below the knee | 0.4 to 0.6 | 0.52 |
| Foot length | 0.90 | 0.86 |

| Part (each side) | Triangles |
|---|---|
| Trunk: torso, neck, and head (one shell) | 1,010 |
| Thigh with the haunch | 150 |
| Lower leg, foot | 64, 44 |
| Upper arm, forearm | 64, 64 |
| Palm, fingers | 24, 24 |
| Ear, pink inside | 48, 38 |
| Eye: dark oval, pupil, light | 72, 24, 10 |
| Nose, tail (one each) | 24, 48 |

On the same skeleton, the sculpt stays inside the box of the parametric rabbit: 0.488 m wide
(parametric 0.510 m), 0.522 m in front of the torso axis (0.524 m), and 0.196 m behind it
(0.220 m, the parametric puff). The ear tips are at 1.372 m (1.447 m).

### 3.1 Gaps that stay

- **Eyes.** The rig gives the iris color `#000000`, so the eye is dark from the rim to the pupil.
  The eyes of the sheet have a dark brown iris (`#2e0d07` to `#372117` at the rim). A brown
  `eyes.iris` would give the same look. That is a change of the colors of design 4.5.
- **Eye bones.** The eyes of the sheet are 0.14 H higher than the eye bones of the skeleton. The
  sculpt puts the eyes there. A blink scales the eye bone on y, so the eye closes down to the bone,
  near its lower edge.
- **Lower legs.** The shin bone hangs straight down from the knee. The sheet slants the lower leg
  back to the heel, so the sculpt moves the lower end of the lower leg 0.1 H back and puts the heel
  0.42 H behind the ankle.
- **Arms.** Option A keeps the arm lengths in meters, so the arms are longer than in the sheet.
- **Color in the previews.** The fur `#ece6ff` looks lavender under the lights of Blender. The warm
  lights of the app make it warm white. Judge the look in the app.

## 4. Test runs in a scratch copy

The scratch copy is `main` at `c13df81` with the option A values of section 2. `pnpm test` runs
2,115 unit tests on `main`, and the sculpt adds 9 checks of `sculpt.test.ts`. The first two runs
also ran the 8 speed tests, and they passed.

| Run | Failed |
|---|---|
| `main` | 0 |
| Option A skeleton, parametric body | 18 |
| Option A skeleton and the sculpt | 22 |

The 18 failures of the skeleton are the work of P1: `trunk.test.ts` (8), `legs.test.ts` (3),
`layout-scene.test.ts` (2), `skeleton-snapshot.test.ts`, `play-clearance.test.ts`,
`shot-frames.test.ts`, `view-poses.test.ts`, and `eyes.test.ts`.

## 5. Steps for stage P1

1. Give the rabbit the option A values and the sculpt in `src/models/species.ts`:

   ```typescript
   rabbit: {
     // ... the fields of today
     proportions: {
       headHeight: 0.293,
       headCenter: 2.1,
       shoulderHeight: 1.41,
       shoulderSpread: 0.53,
       upperArm: 0.91,
       forearm: 0.84,
       hipSpread: 0.43,
       seatedKnee: { forward: 1.3, height: 0.22 },
       torsoDepth: 0.67,
     },
     sculpt: RABBIT_SCULPT,
   },
   ```

2. Run `pnpm sculpt rabbit` with Blender 5.2. It writes `src/models/sculpts/rabbit.ts` from the
   rig of the new skeleton. Import `RABBIT_SCULPT` in `species.ts`. If the skeleton of P1 differs
   from section 2, the same command builds the sculpt around the new bones.
3. Make these tests build the parametric rabbit with no sculpt. They make variants of
   `SPECIES.rabbit` with another leg group, size, or tail, and measure the parametric parts:
   - `legs.test.ts`: "stands each leg group on its feet, with the knee at the place of its group"
     and "makes each leg one closed tube from the hip to the ankle, with no knee ball".
   - `tails.test.ts`: "gives the bushy tail a tip of the belly color above the floor, seated and
     standing".
4. Fix the bow arm in the right thigh (`play-clearance.test.ts`). On the option A skeleton, the
   right hand and forearm of the violin go 0.07 to 0.13 H into the parametric legs, and 0.17 to
   0.20 H into the sculpt, at 66 s, 122.5 s, and 269.5 s. The knee is now 1.30 H in front of the
   hip, under the bow hand at the frog. The knee of the sculpt rises 0.23 H above the knee bone
   (the sheet about 0.22 H, the parametric knee 0.17 H).
5. Check `prepare.test.ts`, "films the high shots of the demos from the front": the sculpt gives 5
   shots, and the test asks for more than 5. Check it again after the new layout pins.
6. Record the rabbit sculpt in design 4.4 and the eye rule of section 3.1, and run `pnpm size`.
   The first download grows by about 15 KB after gzip.

These checks pass with the sculpt and need no change: `bow-hold.test.ts` (the palm of the rabbit is
0.12 × 0.1 × 0.14 H, so the stick keeps its gap of 0.015 H to 0.03 H), `arm-joints.test.ts`,
`rest-clearance.test.ts`, and `hidden-heads.test.ts`.

## 6. Notes for the other stages

- **`pnpm sculpt --all`** now builds the rabbit too. Until P1 wires the sculpt in, it writes
  `src/models/sculpts/rabbit.ts` on the skeleton of today. No module imports that file. Do not
  commit it before P1.
- **Shared steps.** `kit.py` now has the frame, the trunk skin, the arm capsules, the hand
  mittens, the accent rule, and the mirror step. `canine.py` keeps its own copies, because the fox
  branch of P1 edits them. After that branch merges, a small change can make `canine.py` use the
  kit steps. `pnpm sculpt` must then give the same bytes.
- **The base of the torso.** `canine.Frame` puts the base 0.15 H below the `hips` bone. On a
  skeleton with higher shoulders, the `hips` bone moves up with them (P0), so the base is then
  above the seat. `leporine.Frame` uses the hip joints, 0.3 H above the seat.

## 7. How to make the image and the runs again

The scripts are in [`scripts/blender-rabbit/`](scripts/blender-rabbit/).

1. Make a scratch copy of `main` with `node_modules`, and run
   `python3 patch_species.py <copy>`. Then run `node tools/sculpt-rig.ts rabbit <rig.json>` in the
   copy.
2. Run `DISTANCE=2.5 blender -b --factory-startup --python preview.py -- tools/blender <rig.json>
   <out> --pose`. It prints the triangles and the measures of section 3, and writes the four
   views.
3. Run `python3 compose.py docs/reference/rabbit-views.png <out> <image.png>`. The image of this
   report is that output at 1,400 px wide with 256 colors.
4. For the runs of section 4, copy `tools/blender/` into the scratch copy, run
   `node tools/build-sculpt.ts rabbit` there, then `python3 patch_species.py <copy> --sculpt`, and
   run `npx vitest run --project unit --reporter=json --outputFile=<report.json>`.
   `python3 failures.py <report.json> <base.json>` marks the failures that the base run does not
   have.
5. `grid.py` draws a pixel grid on a crop of the sheet, to read the landmarks.
