# The rabbit violinist

The third animal of the low-poly studio (see `../../README.md`): a rabbit from the four-view
sheet that the user gave on 2026-10-13 (`reference/rabbit-views.png`, facts in
`reference/README.md`), with the role `violinist` (`../../roles/violinist/`). `animal.toml`
holds all constants of the rabbit, and `golden.json` the stats of the regression
(`python3 studio regress rabbit`).

![review](out/report/review.webp)

Git keeps only the review image. Run `python3 studio build rabbit` to make the compare image
(`out/compare/compare.png`) and the frames of the clips (`out/frames/`) again.

```bash
python3 studio build rabbit --jobs 2              # the seed pool: seed 1 passes first
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

## Numbers (round 3, role seed 5, model seed 6)

| Check | Rabbit | Round 2 | Bar |
|---|---|---|---|
| IoU front, side, back, 3/4 | 0.9244, 0.9016, 0.9159, 0.8528 | 0.9178, 0.9158, 0.9182, 0.8515 | 0.94, 0.94, 0.94, 0.91 |
| Checks | 67 of 80 pass, every gate passes | 68 of 80 | |
| Body triangles | 1204 (200 in each ear) | 1204 (320 in each ear) | 900 to 1600 |
| Median edge | 24.3 px of the sheet | 24.3 px | |
| GLB | 879 kB (model GLB 509 kB) | 920 kB (550 kB) | 1.5 MB |
| Seed report | seeds 5, 4, 8 pass every clip (3 of the 3 that pass the remesh gate) | the same | |

The seed report: seeds 3, 6, and 7 fail the remesh gate on slivers (1.21, 1.09, and 1.05
percent, limit 1 percent). Seed 1 fails at the trunk bottom between the thighs (y 0.145) and
at the crown (x 0, y 0.769, z 0.043). Seed 2 fails at the crown (y 0.770, z 0.054). The model
build fails the remesh gate on seeds 3, 1, and 5, and keeps seed 6.

## Limits of the sheet

| Check | Value (render, sheet) | Cause |
|---|---|---|
| `iou.side` | 0.9016 | The two ears of the side view are at other depths (one forward, one back), and the near ear leans back about 20 degrees, the far ear about 10 degrees. A mirrored model puts both at one depth and one lean. The round ears of round 2 (0.9158) filled more of the union of the two ears. The pointed blade leaves the back edge 0.02 short at y 0.86 to 0.97. |
| `iou.three_quarter` | 0.8515 | The 3/4 view turns the head more than the body (the compare turns the head 13 degrees), and its ears disagree with the front view. |
| `eye_outline.three_quarter`, `eye_y.three_quarter` | 0.0277, 0.0408 and 0.016, 0.0044 | The far eye is almost hidden in the 3/4 view of the sheet. The eye heights differ between the views (front 0.670, side 0.69, 3/4 0.675). |
| `ear_dark.front.left_in_image` | 0, 0.16 | The light of the sheet shades one inner ear only. |
| `ear_width.side` | 0.1077, 0.0611 | The bump measure of the side view finds only the top of the sheet ears. |
| `nose_x.side`, `nose_y.side` | x 0.157, 0.187 and y 0.660, 0.646 | The nose of the side view is 0.03 higher than the nose of the front view (0.616). The side region of the measure starts at 0.62, above the nose of the model (0.612). |

Open (not of the sheet): `iou.front` and `iou.back` (0.924, 0.916: the sheet is asymmetric,
0.9615, the arms are about 0.01 narrow at the shoulders, and the head is 0.010 too wide at
y 0.74). The ear tips of the back view of the sheet are 0.012 nearer the axis than in its front
view (y 0.94), so a better fit of the front ears costs a little of the back IoU. `fur_hue.side`
(33.5, 32.1, limit 1. Round 1 gave 32.6 with the model seed 1. The palette of the fur did not
change, so the cause is not known). `nose_height.front` (0.0363, 0.0305, limit 15 percent): in
round 2 it passed near the limit (0.0348). The new ears move the front frame by less than one
pixel (the difference of the renders is on the facet edges only), and the nose blob grows by
one pixel row.

## Known differences

- No whiskers (manager decision: the studio has no whisker detail, and on the stage of the app
  they are less than one pixel).
- One catchlight in each eye, mirrored. The sheet has the catchlight of both eyes on the same
  side.
