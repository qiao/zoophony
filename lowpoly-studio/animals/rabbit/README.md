# The rabbit violinist

The third animal of the low-poly studio (see `../../README.md`): a rabbit from the four-view
sheet of the project owner (`reference/rabbit-views.png`, facts in
`reference/README.md`), with the role `violinist` (`../../roles/violinist/`). `animal.toml`
holds all constants of the rabbit, and `golden.json` the stats of the regression
(`python3 studio regress rabbit`).

![review](out/report/review.webp)

Git keeps only the review image. Run `python3 studio build rabbit` to make the compare image
(`out/compare/compare.png`) and the frames of the clips (`out/frames/`) again.

```bash
python3 studio build rabbit --jobs 2              # the seed pool: seed 8 passes first
python3 studio build rabbit --all-seeds --jobs 2  # the seed report of every seed
python3 studio view rabbit                        # the viewer on a free port
```

## Method (round 1)

1. `studio new rabbit --like polar-bear` wrote the compact config, the masks, and the sheet check
   (warnings: `ground_line` 4 px, `arm_gap` 0, `symmetry` 0.9615; the manager accepted each).
2. The field comes from the masks. The rows of `python3 studio fit rabbit --rows` gave each
   value:
   - The trunk: the front and back masks up to 0.39, where the arms leave the trunk (the arm gap
     of the sheet is 0 from 0.45 to 0.65, because the long ears move the chest down), then
     control points to the neck (0.067 at 0.56). The side mask from 0.27 up. Below 0.27 the
     tail joins the back, so the trunk holds the depth of that row.
   - The head: a ball from the chin (0.548) to the dome (0.77), the cheeks 0.106 wide at 0.615.
     A head blend of 0.018 keeps the lower head narrower than the cheeks, as on the sheet.
   - The ears: separate pieces, long ellipsoids (radii 0.064, 0.13, 0.013) at height 0.87,
     turned 55 degrees out, the tops 17 degrees apart, and leaned back (lift 0.5).
   - The arms: thin (radius 0.03 at the shoulder), the shoulders at 0.485, the paws at 0.30.
   - The legs: short, the feet 0.06 tall and 0.16 long, four toes and four claws on each foot.
   - The tail: a ball of radius 0.04 at height 0.225, 0.125 behind the axis.
3. The skin offset of the polar bear (0.004) made the thin body about 3 px too wide on each
   side. The rabbit uses 0.0015.
4. `python3 studio calibrate rabbit` on the own model GLB set the light (hemi 3.85) and the fur
   family. By hand: the eye colors, the pink nose and inner ears, the brown pink claws, the
   key light 0.1 and the occlusion 0.12 (the facet contrast), and the fur 1 unit more red (the
   hue of each view).
5. The trunk bottom at 0.145 ends the slits and the inward faces of the crotch keel between the
   seated thighs of the violinist.

## Method (round 2, the look)

Round 2 changed the form (the field) and the paint only. The bones, the joint places, the bind
pose, the clips, the props, and the `[rig]` values stay as in round 1: no joint of the GLB
moves. The measures come from the sheet masks and the background difference of the renders
(more than 18 from RGB 204, 204, 206).

1. The face: the snout tip moves up and back with a larger radius (`field.snout`), and the face
   points move forward above the nose and back below it. The side front edge is within 0.009
   of the sheet from y 0.58 to 0.74. A chin that stays behind the chest line (`face_points` at
   0.548 and 0.565) passes the seat check. A chin moved forward to 0.10 at 0.565 gave a seat
   gap of 1.5 to 2.0 cm on seeds 1 and 5.
2. The ears lean back 22 degrees about their center (`field.ears.lean`), turn 62 degrees out,
   and are a little longer. A lean of 25 degrees lowers the fit IoU of each view.
3. The ear shells use 320 faces (`details.ears.subdivisions = 2`), so the pink is a smooth slot
   with a cream rim. A hollow radius of 0.66 follows a ring of the shell. At 0.62 the edge of
   the pink cut across the faces and showed jagged points.
4. The head width from the cheeks to the temples follows `field.head.width_points`, measured on
   the front mask. The mean of the front and back profiles was 0.003 to 0.008 wider.
5. The feet are wider, flatter, and lower, and the warp of the feet moves back over the heels.
   Larger toes (radii 0.013, 0.014, 0.017, 5 percent more spread) failed the remesh gate on
   every seed, at the seated right leg (y 0.10 to 0.12).
6. The foot claws are brown (`paint.palette.claw`), as the claw tips of the sheet.

Wider shoulder tops (`field.trunk.width_points` 0.092 at y 0.50) left no model seed that
passes the remesh gate, and seeds 2 and 8 got a seat gap of 2.2 and 2.4 cm. So the arms stay
about 0.01 narrow at the shoulders.

## Method (round 3, the ears)

Round 3 changed the ear details only (`details.ears`). The field, the bones, the bind pose, the
clips, the props, and the `[rig]` values stay as in round 2. Each vertex of the role GLB
outside the ears has the same place, joints, and weights as in round 2. The measures come from
the sheet mask, the sheet pixels, and the background difference of the renders (more than 18
from RGB 204, 204, 206). Pink is R - B > 45.

1. Each ear is a blade loft (`details.ears.blade`) in place of the icosphere shell: 10 rings
   from the base to a tip point, 6 front columns in each ring, and 200 triangles in each ear
   (round 2: 320). The outer edge follows the ellipse of round 2, and the inner edge comes in
   toward the tip, so the tip is pointed near the outer edge.
2. The tip point keeps the top of round 2 (y 0.99373, `tip_x`). The renders scale the model to
   its top, so a lower tip makes the whole body larger in the frame. The first blade had its tip
   at 0.972, and the front IoU fell to 0.868.
3. The pink slot is the front faces between two columns (`slot_columns`) from the ring at
   t -0.75 to the ring at t 0.9 (`slot_rows`), so its edge follows the mesh edges.
   `slot_scale` spreads the slot of each ring from its outer column: the slot is a point at the
   bottom and widest near the top, as on the sheet. The outer band stays about 0.01 wide.
4. A seeded jitter of 0.35 z radii moves the points that are not on an edge of the ear or of
   the slot. It gives soft facets, and the edges of the pink stay straight.

The probe `rings.py` of the round (in the session scratchpad of the brief) rasterizes the front
view of the blade in about 2 s. It reads the config, so a round of the rings needs no build.

## Method (round 4, the arms)

The arm joints of the sheet pose (`field.arm.joints`) and the props of the violinist follow a
product choice of the project owner: arms 1.4 times longer, and a violin of 28 cm. With the short
arms of the sheet, the rule of a violin shop gave the app rabbit a violin of only 0.15 m.

1. The reach is the measure of the app: the shoulder joint to the elbow, the elbow to the wrist,
   and the wrist to the middle of the paw (half way from the joint `hand_L` to the joint
   `fingers_L`). The probe `joints.py` of the round (in the session scratchpad of the brief)
   reads the joints from the inverse bind matrices of the GLB.
2. The upper arm and the forearm get 1.444 times their length along the directions of the sheet
   pose. The clavicle, the shoulder joint, the paw (the offset from the wrist to the knuckle),
   and the radii of the arm do not change. Lengths in studio units:

   | Measure | Round 3 | Round 4 | Factor |
   |---|---|---|---|
   | Upper arm (`upper_arm_L` to `forearm_L`) | 0.1106 | 0.1596 | 1.443 |
   | Forearm (`forearm_L` to `hand_L`) | 0.0919 | 0.1327 | 1.444 |
   | Paw (`hand_L` to `fingers_L`) | 0.0444 | 0.0444 | 1.000 |
   | Reach to the middle of the palm | 0.2247 | 0.3146 | 1.400 |

3. The bind pose of the violinist stays (shoulder flex 40, abduct 30, elbow flex 70), because
   each gate passes with it. In the GLB, only the joints `forearm`, `forearm_twist`, `hand`, and
   `fingers` of each arm and the prop bones `violin` and `bow` move. The other 22 joints stay.
4. The median distance of the arm skin from its bone stays within 0.0006 (upper arm 0.0335 to
   0.0338, paw 0.0254 to 0.0248). The forearm bone gives 0.0314 to 0.0276: the longer forearm
   has a smaller share of its skin at the elbow bulge.
5. The violin is 0.234 long (about 0.28 m in the app, 0.80 arm reaches), and the bow is 0.29
   (1.25 violins). The app drops both props.
6. The remesh covers the whole body, so the longer arms move each face. The role build keeps
   seed 8, and the model build keeps seed 3.

## Numbers (round 4, role seed 8, model seed 3)

| Check | Rabbit | Round 3 | Bar |
|---|---|---|---|
| IoU front, side, back, 3/4 | 0.8905, 0.9061, 0.8833, 0.8412 | 0.9244, 0.9016, 0.9159, 0.8528 | 0.94, 0.94, 0.94, 0.91 |
| Checks | 66 of 80 pass, every gate passes | 67 of 80 | |
| Body triangles | 1112 (200 in each ear) | 1204 | 900 to 1600 |
| Median edge | 25.2 px of the sheet | 24.3 px | |
| GLB | 861 kB (model GLB 524 kB) | 879 kB (509 kB) | 1.5 MB |
| Seed report | seed 8 passes every clip (1 of the 2 that pass the remesh gate) | seeds 5, 4, 8 (3 of 3) | |

The arms of the model are longer than the arms of the sheet (a product choice of the project owner), so the
paws show outside the sheet in the front, back, and 3/4 views. The IoU of these views falls.

The seed report:

- Seeds 3, 5, 4, and 7 fail the remesh gate on slivers (1.45, 1.65, 1.12, and 2.06 percent,
  limit 1 percent). The slivers are on the center line of the crown (x 0, y 0.77) and at the
  trunk bottom (y 0.145).
- Seeds 3, 1, 2, and 7 have slit faces: seed 3 at the right knee (-0.071, 0.104, 0.057), seed 1
  at the right foot (-0.123, 0.051, 0.120), seed 2 at the right shin (-0.097, 0.068, 0.088), and
  seed 7 at the trunk bottom (-0.018, 0.145, -0.013). Seeds 1 and 7 also have inward faces at
  the trunk bottom (y 0.145).
- Seed 6 passes the remesh gate and fails the seat gap in each seated clip (3.01 cm at the
  thighs, limit 1.5 cm).
- No failure is at the shoulder or at the elbow.

Seed 8 has one near check in each seated clip and in `stand_play`: face 805, a thin face of the
left upper arm near the armpit (rest place 0.089, 0.447, 0.072, smallest angle 15.9 degrees,
area 0.00023), turns 97 to 98 degrees. The fold limit is 120 degrees, and the frames show no
fold there (`out/diag/fold-805-play.png`).

## Limits of the sheet

| Check | Value (render, sheet) | Cause |
|---|---|---|
| `iou.side` | 0.9061 | The two ears of the side view are at other depths (one forward, one back), and the near ear leans back about 20 degrees, the far ear about 10 degrees. A mirrored model puts both at one depth and one lean. The pointed blade leaves the back edge 0.02 short at y 0.86 to 0.97. |
| `iou.three_quarter` | 0.8412 | The 3/4 view turns the head more than the body (the compare turns the head 13 degrees), and its ears disagree with the front view. The longer arms add to the difference. |
| `eye_outline.three_quarter`, `eye_y.three_quarter` | 0.0277, 0.0408 and 0.0146, 0.0044 | The far eye is almost hidden in the 3/4 view of the sheet. The eye heights differ between the views (front 0.670, side 0.69, 3/4 0.675). |
| `ear_dark.front.left_in_image` | 0, 0.16 | The light of the sheet shades one inner ear only. |
| `ear_width.side` | 0.1077, 0.0611 | The bump measure of the side view finds only the top of the sheet ears. |
| `nose_y.side`, `nose_width.side`, `nose_height.side` | y 0.625, 0.646, width 0.0131, 0.016, height 0.0073, 0.0204 | The nose of the side view is 0.03 higher than the nose of the front view (0.616). The side region of the measure starts at 0.62, above the middle of the nose of the model (0.612), so the measure cuts the nose of the model. With the facets of model seed 3, the measure finds the nose of the model (`nose_x.side` passes: 0.1857, 0.1872). With model seed 6 of round 3 it found a blob above it (x 0.157). |

Open (not of the sheet): `iou.front` and `iou.back` (0.891, 0.883). The longer arms are the
largest cause. Before round 4 (0.924, 0.916), the causes were the asymmetric sheet (0.9615), the
shoulders 0.01 narrow, and the head 0.010 too wide at y 0.74. `nose_height.front` (0.0363,
0.0305, limit 15 percent, as in round 3). `eye_outline.front.1` (0.0218, 0.0247, limit 8
percent): the eyes of model seed 3 are 1 px narrower than with model seed 6 (0.0232). The eye
details and the head field did not change, so the facets of the seed are the cause.
`fur_hue.side` passes again (32.7, 32.1).

## Known differences

- No whiskers (manager decision: the studio has no whisker detail, and on the stage of the app
  they are less than one pixel).
- One catchlight in each eye, mirrored. The sheet has the catchlight of both eyes on the same
  side.
- `instrument_reach.violin` fails: the violin of 0.234 is 0.589 of the arm from the neck to the
  middle of the palm (0.397), and the size chart of a violin shop gives 0.9 to 1.1. This follows the
  product choice of the arms 1.4 times longer and a violin of 28 cm, and it is no blocker for the
  app. (Measured from the shoulder joint, as before the review of the retro, the ratio is
  0.744.)
