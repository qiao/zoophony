# Back-row lights

Date 2026-10-18. Round `back-light`. Decisions:
[`2026-10-18-back-light.md`](../decisions/2026-10-18-back-light.md). The probes and their outputs
are in [`2026-10-18-back-light/`](2026-10-18-back-light/). Each command runs from the root of the
tree.

## 1. The question

The user sent a screenshot of the default view: "the back rows of the stage are too dark. Should we
add more lighting from front to back". The manager recommended a second pair of cross lights, and
the user said "do it". In `orchestra-latest.png`, the back rows are almost as bright as the front
rows. The measures that decide: the direct light on the fronts of each row, the white fur of the
back pandas against the front rabbits, the front rows against `main`, the shade side of a back-row
body, the floor at the back of the stage, and a close shot of a back-row player.

## 2. The measures

### 2.1 The two causes

The probe `back-light-probe.ts.txt` of the manager gives the direct light on the front of each
player (chest height, normal along the facing), by row, as a part of the first row.
`row-light.ts.txt` is the same probe with the back-row lights and the reach of the pool
(`node scratch/bl/row-light.ts <demo> [hot] [<JSON>]`, output `row-light.txt`). Two causes
multiply. The side lights aim at the middle of each section, so the back rows are at the edge of
their cones. The pool of `addLightPool()` keeps only about 0.5 of the light at the back row.

### 2.2 The place, the aim, and the cone

`search.ts.txt` solves the illuminance that gives the back row 0.85 of the first row (the mean of
Beethoven 9, Brahms 2, and Boulanger), then measures the light on the first row and on the floor
behind the back row (`search.txt`).

| Variant | Lux | First row gets more | Floor behind the back row gets more |
|---|---|---|---|
| Start values: 1.7 S high, 0.9 S forward, aim 0.3 S back, 14° | 2.71 | 48% to 63% | 80% of the key light |
| Chosen place 1.0 S high, 0.6 S forward, aim 0.5 S back and 0.15 S high, 10° | 2.25 | 0% | 26% |
| The chosen aim and cone from 1.7 S high | 2.70 | 0% | 48% |
| The chosen place with a cone of 14° | 1.58 | 0% | 28%, and the second row from the back gets 1.11 to 1.13 |

A cone of 14° holds the first row. A higher light falls more steeply on the floor and less directly
on the fronts.

### 2.3 The pool

The pool on the players and the props gets a longer radius behind its center (`reachBack`). The
stage keeps the round pool. At the chosen light, a longer reach needs less light, so the floor gets
less (`search.txt`, section 4).

| Reach behind the center | Lux | Floor behind the back row gets more |
|---|---|---|
| 0.42 S (the round pool of `main`) | 4.13 | 47% |
| 0.9 S | 2.49 | 29% |
| 1.2 S (chosen) | 2.25 | 26% |
| 2.0 S | 2.05 | 24% |

The new lights take the pool as all spotlights do, so no patch reads the index of a light in the
light loop of three.js.

### 2.4 The three steps

The look lab renders each step on a dev server with `look-override.patch` and `run-variants.sh`
(`variants.json`, frames of Boulanger at 33.5 s). `back_measures.py` measures the camera `default`
(`back-measures.txt`), and `b9_measures.py` the choir of Beethoven 9 (`b9-measures.txt`). The steps
keep the reach of 1.2 S and change the lux.

| Measure | `main` | Step 1 | Step 2 | Step 3 | Reference |
|---|---|---|---|---|---|
| Back-row lights, lux | none | 1.69 | 2.25 | 2.81 | |
| Probe, back row (Beethoven 9, Brahms 2, Boulanger) | 0.33, 0.09, 0.10 | 0.81, 0.65, 0.64 | 0.93, 0.81, 0.81 | 1.04, 0.98, 0.97 | |
| Probe, second row from the back | 0.63, 0.42, 0.38 | 0.78, 0.80, 0.80 | 0.79, 0.89, 0.89 | 0.79, 0.97, 0.99 | |
| Probe, choir of Beethoven 9 | 0.00 | 0.76 | 1.01 | 1.26 | |
| White fur p90, back pandas against front rabbits | 0.79 | 0.93 | 0.94 | 0.96 | 0.96 |
| White fur p50, back pandas, front rabbits | 160, 211 | 167, 211 | 182, 211 | 192, 211 | 136, 181 |
| White fur p90, penguins against front rabbits | 0.75 | 0.78 | 0.85 | 0.90 | 0.84 |
| Front rows, luma p50 and p90 of all pixels | 126.7, 198.6 | 126.8, 198.6 | 127.0, 198.6 | 126.9, 198.6 | |
| Back rows, luma p50 of all pixels | 52.7 | 70.4 | 72.9 | 75.1 | |
| Shade p10 / p90: back pandas, back hippo, front rabbits | 0.75, 0.90, 0.66 | 0.63, 0.50, 0.66 | 0.65, 0.47, 0.66 | 0.66, 0.47, 0.66 | 0.42 (pandas), 0.54 (rabbits) |
| Back floor, luma p50 | 39 | 49 | 52 | 55 | 41 |

The frames of a state differ by a mean of about 2.4 levels from run to run, because of the grain and
the motes. The `main` of the override has the same measures as a build of `d6485c4d`, and step 2 the
same as a build of the tree (`pnpm look-lab --base d6485c4d`, the rows `base`). The metrics of the
camera `orchestra` stay within 2 levels (`variants.txt`). The white fur of `main` has fewer pixels
below a saturation of 0.4, because the key light makes the dim fur orange. The hippo had no shade
side in `main` (0.90), because only the fill light and the environment lit it.

![main and the three steps, each with a crop of the back rows](2026-10-18-back-light/lineup.webp)

### 2.5 The solo, the low tier, and the hot spot

`look-override.patch` also solos one seat (`?solo=<seat>`). In the default view
(`solo-measures.txt`), a solo of the pandas (seat 13) gives the front rows a p50 of 43.6 in `main`
and 43.5 in step 2. A solo of the first rabbits (seat 0) keeps 0.72 of the back rows in `main` (38.2
of 52.7) and 0.70 in step 2 (51.0 of 72.9). Thus the solo dims the new lights as it dims the other
lights.

With no shadow maps of the side lights, the spotlights have the indices of the low tier. The shaders
compile, and the back rows go from 54.2 to 73.7, as on the high tier (`noside-measures.txt`).

The hot spot of the key light multiplies each spotlight with a shadow (`SPOT_POOL_GLSL`). On the
high and medium tiers, the side lights cast shadows, so the first row gets 2.52 lux against 1.95 lux
of the probe. There, step 2 gives the back row 0.63 to 0.77 of the first row
(`row-light-hot.txt`). The low tier has no hot spot on the side lights, and its front rows are darker
(p50 123.6 against 126.7).

### 2.6 The close shots

`shot-frames.ts.txt` renders Cinematic frames of Boulanger (`shots.ts.txt` lists the shots), and
`close_measures.py` measures the subject (`close-measures.txt`).

| Shot | Fur p10, p50, p90 in `main` | Fur p10, p50, p90 in step 2 | Pixels above 245 in step 2 |
|---|---|---|---|
| Solo of the front rabbit, 46.5 s | 177, 223, 239 | 177, 223, 239 | 1.4% |
| Solo of the back badger, 172.5 s | 71, 89, 169 | 81, 112, 205 | 0.0% |
| Solo of the hippo with the double bass, 234.5 s | 62, 119, 150 | 99, 146, 189 | 0.0% |

The shot light adds to the new lights, and the back-row subject stays darker than the front rabbit.

![The hippo and the badger, main against step 2](2026-10-18-back-light/close-views.webp)

## 3. The result

Step 2 is the default: 2.25 lux, the reach 1.2 S. The back pandas reach 0.94 of the front rabbits
against 0.96, and the penguins 0.85 against 0.84. The front rows stay within 0.3% of `main`. The back
bodies get a shade side, and the hippos show the purple fur of the reference. The back floor goes
from 39 to 52 against 41 in the reference, a dark floor with no bright patch in the lineup. On the
high tier, the hot spot on the side lights keeps the first row brighter than the probe says. The
frame cost of the two lights is not measured, because the frame rule is paused.
