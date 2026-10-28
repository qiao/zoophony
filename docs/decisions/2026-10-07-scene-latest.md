# Decisions of the scene of the newest reference

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user added the newest target images `reference/orchestra-latest.png` (the
default view) and `reference/orchestra-side.png` (a view from the front left). Design 1 says that
they win where the references differ. The scene latest agent measured them and decided the
details below. The user can reverse each row. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| `orchestra-latest.png` wins over `mockup.png` for the default view. The default view looks down 33° (was 25°) at a target 0.25 m below the stage top and 0.7 m behind its center (was at the center), at 0.58 of the default distance (was 0.56). In the free area of 1088 × 832 px beside the open drawer at 1440 × 900, Boulanger puts the highest back head at 0.142 of the height (0.145 in the image), the front of the podium at 0.858 (0.944), and the depth of the orchestra at 0.68 of its width (0.68). The view of 25° gave 0.151, 0.741, and 0.55 | 2.5, 4.5, 5.6 |
| The field of view stays 30°. The image has almost no perspective: the heads of the hippos 8 m behind the bear are 0.9 of its head, and 0.68 in our view. Thus its local angles (about 16° at the kettles, 20° to 27° at the podium) and its framing do not fit one camera of 30°. The framing wins: our view looks down at the podium at 41° and at the back row at 24°. A narrower field of view with a farther camera would change the wide shots, the planner, the beam fade, and Free mode | 4.5 |
| The target moves back, and the camera does not move nearer. A nearer camera put the sides of the orchestra under the drawer. The target 0.7 m behind the center puts the podium near the bottom of the free area | 4.5 |
| The landscape rule takes 0.58 of the default distance (was 0.56). At 33° with 0.56, the players of K. 525 filled 0.00 to 0.98 of the free area. With 0.58, the six demos fill 0.02 to 0.96 (0.07 to 0.96 in the image) | 4.5 |
| The low lamps of the hall skip 60° around the back (was 40°). With 40°, the higher view put the lamp 42° from the back behind the composer line of the first screen at 1440 × 900, which then got a shade, and the lamp 54° from the back at the edge of the play button at 667 × 375. Each target near the chosen one passed one of the two tests and failed the other. With 60°, the targets 0.15 to 0.35 m below the stage top and 0.5 to 0.8 m behind its center pass both. `orchestra-latest.png` shows no lamp behind the stage | 4.5 |
| The rows of the elevation of 25°, the camera height from the hidden heads, the pairs of hidden heads at 25°, and the distance of [`2026-10-07-camera-angle.md`](2026-10-07-camera-angle.md) go away. At 33°, no large animal hides 5% of the head of a smaller animal (7.8% at 25°). One pair of any species reaches 10% (five at 25°): a rabbit of the violins of Bach hides 10.2% of the head of another rabbit | 4.2, 4.5 |
| Each corner of the stage is cut by `0.1 × S` along each edge (`STAGE_CORNER_CUT`), so the outline has eight sides. The stage side `S` and its rules stay. The footprints of the demos allow up to `0.115 × S`: with `0.12 × S`, the first violin of K. 525 goes 0.035 m into the cut. The cut of the front corners of `orchestra-latest.png` looks larger (about 0.12 of the width of the image, against about 0.05 in our view), but a larger cut needs a larger stage or other seats | 4.5 |
| The spread of a row keeps each footprint box 0.3 m from the corner cuts, as from the edges (`boxOnStage()`). It changes no layout of the demos, the section sizes, `perf-60.mid`, or the chamber groups. It keeps the cuts off the seats of other files | 4.5 |
| A raised lip of 0.1 m runs around the top of the stage, 0.045 m above the planks, with a round top and an inner bevel, as the edge of `orchestra-latest.png`. It replaces the chamfer of 0.04 | 4.5 |
| The lip has the color `#5e3c24` (the chamfer had `#8c5a36`). The top of the lip faces up into the key light, and the old color gave a bright orange line around the stage. The lip of `orchestra-latest.png` is a little lighter than the planks | 4.5 |
| The podium keeps its box of 0.9 × 0.9 × 0.25 m. Each corner of its top plate is cut by 0.1 m, the body stands 0.02 m in under the plate, the top has a framed panel with a dark groove, and each main side has a darker panel in a frame (`PODIUM_TRIM`). The podium of `orchestra-latest.png` looks larger than the bear (about 1.8 times the width of its body, against 1.0 in our view), but a larger podium moves the first rows | 4.5 |
| The haze, the focus of Free mode, the near orbit limit, the frame of the first screen, and the shadow camera keep the square of the stage. Only the four cut triangles differ: there, the haze treats the space above the cut as the stage, the focus can find the plane of the stage top, and the orbit box is up to 0.8 m larger than the stage. No player stands there | 4.5 |
| Three steps of 0.2 m stand in front of the lowest riser level, 0.25, 0.5, and 0.75 m high, so the risers rise from the stage in even steps of 0.25 m, as the wooden risers of `orchestra-latest.png` and `orchestra-side.png`. The levels, their heights, and the places of the singers on them stay. A lower first level would give more steps, but the test of the hidden heads set its 1.0 m | 4.5 |
| The footprint of the lowest level holds the steps, so the risers move 0.22 m back from the back row: Beethoven 9 has 11.84 m (11.62 m), the choir test file 12.18 m (11.96 m), and `perf-60.mid` 13.67 m (13.45 m). The space in front of the lowest level was 0.43 m in each choir layout, and the three steps need 0.6 m and the gap of 0.05 m | 4.2, 4.5 |
| Each tread has a lighter front edge of 0.04 m (`#7b5335`) and boards of at most 0.4 m (`#553620`) with a dark line between them. The risers stand outside the pool of the stage lights, and the plank color of the stage made a dark wall behind the contrabasses | 4.5 |
| After the stage size, the risers widen by up to 1.0 m of arc on each side of the singers (`widenRisers()`), as far as the outline of the stage and the other items permit. The stage side stays. Beethoven 9 gets the full wing, and the choir test file 0.62 m. A full wing in the fit of the choir made the stage of the choir test file 12.89 m | 4.5 |
| The risers keep their arcs around the podium. The risers of `orchestra-side.png` are straight, but straight levels would stand nearer to the ends of the back row. The risers keep no rails: the back rail of `orchestra-side.png` stands behind the top row of singers | 4.5 |

Measures at 1440 × 900 with the drawer open, from the meshes of the bind poses in the frame of
the app. "Top" is the highest point of the players, "podium" the front edge of the podium foot,
and "front" the front edge of the stage, each as a part of the free height of 832 px. "Depth"
is (front less top) divided by the width of the players.

| Demo | Main (25°) top, podium, front, depth | Branch (33°) top, podium, front, depth |
|---|---|---|
| Boulanger | 0.151, 0.741, 0.779, 0.55 | 0.142, 0.858, 0.906, 0.68 |
| Beethoven 9 | 0.160, 0.743, 0.779, 0.57 | 0.147, 0.858, 0.905, 0.70 |
| K. 525 | 0.162, 0.699, 0.760, 0.50 | 0.212, 0.851, 0.934, 0.59 |
| `orchestra-latest.png` | 0.145, 0.944, about 1.0, 0.68 | |

At 390 × 844, the portrait rule keeps its 4°, so a phone looks down at 29°. The stage keeps the
full width of the phone (the players from 0.11 to 0.90), and the depth of Boulanger grows from
0.54 to 0.66.
