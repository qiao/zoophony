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

## Numbers (round 1, role seed 1, model seed 1)

| Check | Rabbit | Bar |
|---|---|---|
| IoU front, side, back, 3/4 | 0.9147, 0.8817, 0.9188, 0.8500 | 0.94, 0.94, 0.94, 0.91 |
| Checks | 63 of 80 pass, every gate passes | |
| Body triangles | 1148 (3216 with the details and the props) | 900 to 1600 |
| Median edge | 24.1 px of the sheet | |
| GLB | 828 kB (model GLB 513 kB) | 1.5 MB |
| Seed report | seeds 1, 6, 4, 7 pass every clip | |

The seed report: seeds 3 and 2 fail the remesh gate at the trunk bottom between the thighs
(y 0.146), seed 5 at the right shin against the belly (y 0.096). Seed 8 passes the remesh gate
and folds 1 face at the top of the right upper arm in `ready` and `rest` (the paw between the
rest and the play).

## Limits of the sheet

| Check | Value (render, sheet) | Cause |
|---|---|---|
| `iou.side` | 0.8817 | The two ears of the side view are at other depths (one forward, one back). A mirrored model puts both at one depth. |
| `iou.three_quarter` | 0.8500 | The 3/4 view turns the head more than the body (the compare turns the head 8 degrees), and its ears disagree with the front view. |
| `eye_outline.three_quarter`, `eye_y.three_quarter` | 0.0292, 0.0408 and 0.016, 0.0044 | The far eye is almost hidden in the 3/4 view of the sheet. The eye heights differ between the views (front 0.670, side 0.69, 3/4 0.675). |
| `ear_dark.front.left_in_image` | 0, 0.16 | The light of the sheet shades one inner ear only. |
| `ear_width.side`, `ear_height.side` | 0.0932, 0.0611 and 0.0742, 0.198 | The bump measure finds only the top of the render ear in the side view. |
| `nose_*.side` | y 0.6245, 0.6463 | The nose of the side view is 0.03 higher than the nose of the front view (0.616). |

Open (not of the sheet): `iou.front` and `iou.back` (0.915, 0.919: the sheet is asymmetric,
0.9615, and the thin arms lose width to the facets), `belly_width.front` (0.071, 0.096), and
`facet_contrast` (3.70, 3.02).

## Known differences

- No whiskers (manager decision: the studio has no whisker detail, and on the stage of the app
  they are less than one pixel).
- One catchlight in each eye, mirrored. The sheet has the catchlight of both eyes on the same
  side.
