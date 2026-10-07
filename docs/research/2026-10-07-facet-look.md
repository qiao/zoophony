# Facet look: which shading and facet density match the mockup

Date: 2026-10-07. Code: commit `c96d7bd` (`main`). Plan: `2026-10-06-skinned-bodies-plan.md`,
stage F. Spec: `2026-10-06-cute-furry-spec.md`, section 4.

The user goal is "improve the look & feel of the animals and the scene until it matches the
mockup.png". The animals of `docs/reference/mockup.png` are faceted low-poly sculptures. Their
facets are of medium size, they follow the form, and their edges show under the light. Our
animals have smooth crease normals at 60° (`src/models/shading.ts`). They look like soft plastic
toys. This report measures the facets of the mockup, builds 15 variants, measures them in the
same way, and recommends one variant for stage F.

This report is research. It changes no code. The experiment code stayed in a scratch worktree
(section 7).

## 1. Summary

- **Recommendation: variant d7.** A lean trunk grid of 12 sides, 8 torso rings and 8 head rings,
  arms of 6 sides, legs of 8 sides, tails of 6 sides, a crease of 10° on the fur, and a seeded
  jitter of 0.02 H on the face normals only. The positions do not move.
- **It matches the back of the mockup bear.** Facet size 0.34 H (mockup 0.31 H), luma step 10.0%
  (mockup 8.7%), share of the luma change at edges 0.67 (mockup 0.69). The current models give
  0.37 H, 8.3%, and 0.48, and the 0.48 comes from film grain on a smooth surface.
- **It costs fewer triangles.** The largest body falls from 2,444 to 1,964 triangles (budget
  2,600). The scene of `perf-60.mid` falls from 163,398 to 132,810 (budget 168,500).
- **It is faster.** `buildPlayer()` takes 3.3 ms in place of 4.8 ms for each model, and
  `shadeMesh()` 2.1 ms in place of 2.5 ms (Node, mean of 16 builds).
- **The heads stay a little coarse.** The lean head has facets of 0.27 to 0.35 H. The mockup
  heads have 0.20 to 0.23 H. Section 5 gives the open item.
- **Cost:** about 3.5 hours in stage F. 14 unit tests change: 10 pin side counts, ring lists, or
  the 60° crease, and 4 show small form changes (section 6).

```text
  smooth (main)           flat on the dense grid        d7 (recommended)
  +-----------+           +-----------+                 +-----------+
  |           |           |/\/\/\/\/\/|  thin bands     | /\  /\ /  |  medium facets
  |  soft     |           |\/\/\/\/\/\|  of small       |/  \/  \/\ |  of uneven size,
  |  plastic  |           |/\/\/\/\/\/|  zigzags        |\  /\  /  \|  edges show
  |           |           |\/\/\/\/\/\|  (golf ball)    | \/  \/\  /|  under the spot
  +-----------+           +-----------+                 +-----------+
  size 0.37 H*            size 0.15 H                   size 0.34 H
  share 0.48*             share 0.79                    share 0.67     mockup: 0.31 H, 0.69
                                         * film grain only
```

## 2. Method

### 2.1 The facet measure

The script `measure.py` (section 7) reads a patch of one fur color, with no outline and no color
border in it. It scales the patch to 46 px for each head height H, because the mockup bear has
H = 46 px. Thus all images have the same pixels for each H.

```text
  image --> crop patch --> luma (Rec. 709) --> scale to 46 px/H --> blur (sigma 1.0 px)
                                                                         |
                    +----------------------------------------------------+
                    v
  each row and each column = one luma profile, in % of the mean luma of the patch
                    |
                    v
  edge = local peak of |slope|, prominence >= 1.0 %/px, step over 4 px >= 3 %
                    |
                    v
  size  = profile length / edge count, in H     (mean chord of a facet)
  step  = median luma step at an edge, in %     (how much the shade jumps)
  share = sum of edge steps / total luma change (0 = smooth ramp, 1 = flat facets)
  aniso = edges per row / edges per column      (far from 1 = bands in one direction)
```

- The blur of 1.0 px removes the film grain of the post pass. With a blur of 0.6 px, the grain
  of the smooth variant gave 0.61 share. With 1.0 px, it gives 0.48, and the faceted variants
  keep 0.67 to 0.85.
- The size is a mean chord along the rows and the columns. It is smaller than the diameter of a
  facet. All images use the same rule, so the values compare.
- The mockup bear and the mockup elephant are large in the image (H = 42 to 46 px). The rabbits
  have H = 24 px, so their values are less sure.

### 2.2 The views

- **Default view during play.** The default demo (`#demo=boulanger-matin`) after 6 s of play,
  at 1440 × 900 with a device scale of 2. It shows the conductor from behind, as the mockup
  does, under the stage light. The conductor has H = 102 px. This view is the main test.
- **Gallery close views.** `gallery.html?page=species&only=<species>&zoom=2.5&target=1.1` for
  the bear, the rabbit, the red fox, the panda, the dog, and the elephant. The gallery light is
  flat and bright, so the luma steps there are about half of the steps on the stage.
- **Gallery back view.** The bear at `zoom=1.5&target=0.75`, turned to show its back (H = 238
  px). An experiment-only `turn` query turned the model.

### 2.3 The patches

| Image | Patch (x0, y0, x1, y1) | H (px) |
|---|---|---|
| `mockup.png`, bear back | 485, 405, 545, 478 | 46 |
| `mockup.png`, bear head (back) | 484, 356, 540, 392 | 46 |
| `mockup.png`, elephant forehead | 462, 124, 500, 145 | 42 |
| `mockup.png`, elephant ear | 432, 135, 458, 165 | 42 |
| `mockup.png`, front rabbit torso | 213, 360, 235, 392 | 24 |
| play view, conductor back | 1040, 1090, 1140, 1165 | 102 |
| play view, conductor head (back) | 1040, 975, 1130, 1030 | 102 |
| gallery, elephant forehead | 580, 60, 860, 220 | 370 |

The hippo patch of the mockup held the edge of the bass, so this report does not use it. The
close shots 05 and 06 of `scene.png` show a plush bear and smooth rabbits. They are not low-poly,
so this report takes its targets from `mockup.png` only.

## 3. The mockup facets

| Patch | Size (H) | Step (%) | Share | Aniso |
|---|---|---|---|---|
| Bear back | 0.31 | 8.7 | 0.69 | 0.69 |
| Bear head (back) | 0.23 | (mixed light) | 0.60 | 1.5 |
| Elephant forehead | 0.20 | 12.8 | 0.67 | 2.3 |
| Elephant ear | 0.25 | 8.4 | 0.68 | 0.62 |
| Rabbit torso (H = 24 px) | 0.25 | 18.9 | 0.72 | 0.53 |

- **Size.** The facets are 0.2 to 0.3 H across: about 5 facets across the back of the bear and
  4 to 5 across a head. The body facets are larger than the head facets.
- **Step.** Neighbor facets differ by 8 to 13% of the mean luma on the dark bear and the gray
  elephant, and by about 19% on the white rabbit.
- **Edges.** About 0.7 of the luma change is at edges. The faces are flat, and the edges are
  sharp. The facets have uneven sizes and no regular grid. The outline is smooth, with no lumps.
- **Where the edges are sharp.** On the back, the shoulders, the crown, the ears, and the arms.
  The faces of the rabbits and the foxes have larger, softer planes around the eyes and the
  muzzle.

## 4. Variants and results

### 4.1 The variants

All variants keep the instruments, the props, and the eyes at the crease of 60°. The crease and
the jitter apply to the matte corners of the body bones only.

| Id | Grid | Crease | Jitter |
|---|---|---|---|
| a | current: 16 sides, 11 torso rings, 11 head rings, arms 8, legs 10 (`main`) | 60° | none |
| b | current | 0° (flat) | none |
| c15, c25, c35 | current | 15°, 25°, 35° | none |
| d1 | lean: 12 sides, 8 torso rings, 8 head rings, arms 6, legs 8, tails 6 | 0° | none |
| d2 | lean | 20° | none |
| d3 | lean | 10° | none |
| d4 | lean | 10° | 0.02 H on the positions |
| d5 | lean | 6° | 0.03 H on the positions |
| d6 | lean | 14° | 0.03 H on the positions |
| d7 | lean | 10° | 0.02 H on the normals only |
| e1 | current | 0° | 0.03 H on the positions |
| e2, e3 | lean | 0° | 0.03 H, 0.05 H on the positions |
| f | lean torso, current head rings, 12 sides | 10° | 0.02 H on the normals only |

The lean grid keeps the rings at the changes of the form and removes the others:

```text
  torso ring y (H)   0  0.05 0.16 0.30 0.45 0.60 0.75 0.87 0.97 1.09 1.20
  current            x   x    x    x    x    x    x    x    x    x    x     11 rings
  lean               x   x    x    x    .    x    x    .    x    .    x      8 rings

  head ring y (H)  -0.50 -0.46 -0.37 -0.25 -0.12 0.02 0.16 0.28 0.38 0.46 0.50
  current            x     x     x     x     x    x    x    x    x    x    x   11 rings
  lean               x     x     x     .     x    .    x    x    .    x    x    8 rings
                                             ^ widest ring keeps turn 0, the others alternate
```

### 4.2 Measured values

Default view during play, conductor back (the main test). Mockup bear back: 0.31 H, 8.7%, 0.69.

| Id | Size (H) | Step (%) | Share | Aniso | Look |
|---|---|---|---|---|---|
| a | 0.37 | 8.3 | 0.48 | 0.96 | smooth plastic, the edges are film grain |
| b | 0.15 | 9.5 | 0.79 | 0.89 | small zigzags, golf ball on the head |
| c15 | 0.23 | 10.8 | 0.71 | 0.58 | horizontal bands, one for each ring |
| c25 | 0.33 | 8.0 | 0.53 | 0.57 | nearly smooth, soft bands |
| d1 | 0.19 | 8.5 | 0.80 | 1.10 | regular diamond grid |
| d2 | 0.96 | 7.3 | 0.33 | 1.41 | smooth body, faceted head |
| d3 | 0.26 | 8.7 | 0.73 | 1.29 | regular diamonds, a little larger |
| d4 | 0.31 | 9.0 | 0.68 | 0.93 | uneven medium facets |
| d5 | 0.21 | 10.0 | 0.81 | 0.91 | busy |
| d6 | 0.30 | 11.2 | 0.68 | 1.08 | bands on the back |
| **d7** | **0.34** | **10.0** | **0.67** | **1.01** | **uneven medium facets, outline unchanged** |
| e1 | 0.17 | 10.1 | 0.84 | 0.72 | busy, small |
| e2 | 0.20 | 10.1 | 0.81 | 0.98 | uneven, small |
| e3 | 0.21 | 12.7 | 0.85 | 0.92 | lumpy outline |
| f | 0.32 | 9.8 | 0.68 | 0.94 | dark slits at the nape |

Heads. Mockup: bear head 0.23 H, elephant forehead 0.20 H, 12.8%, 0.67.

| Id | Conductor head, play (size, step, share) | Elephant forehead, gallery (size, step, share) |
|---|---|---|
| a | 0.45 H, 21.2%, 0.47 | 1.60 H, 11.0%, 0.15 |
| b | 0.21 H, 11.2%, 0.77 | 0.26 H, 8.4%, 0.66 |
| c15 | 0.24 H, 14.8%, 0.74 | 0.41 H, 10.2%, 0.51 |
| d1 | 0.22 H, 13.0%, 0.76 | 0.39 H, 11.6%, 0.61 |
| d4 | 0.26 H, 16.1%, 0.79 | 0.33 H, 10.8%, 0.73 |
| d7 | 0.27 H, 17.6%, 0.77 | 0.35 H, 10.7%, 0.72 |
| f | 0.18 H, 11.2%, 0.79 | 0.25 H, 8.8%, 0.77 |

The gallery back view gives the same order. Its flat light halves the steps. Its anisotropy shows
the bands of c15 most clearly: 0.17 (d7: 0.59, b: 0.38).

### 4.3 What the values show

```text
  share of luma change at edges (play, conductor back)
  0.4        0.5        0.6        0.7        0.8        0.9
   |----------|----------|----------|----------|----------|
   a  *                                                      0.48  smooth
   c25    *                                                  0.53
   c15                          *                            0.71  bands
   d7                         *                              0.67
   mockup                      #                             0.69
   d4                         *                              0.68
   d1                                    *                   0.80  grid
   b                                     *                   0.79  golf ball
   e3                                          *             0.85
```

- **A crease angle alone cannot give the look.** On the current grid, a crease of 0° to 15°
  shows the small triangles of the dense grid, and 25° or more hides them. Between the two, the
  crease keeps only the ring edges, as horizontal bands (c15, anisotropy 0.17 in the gallery).
- **Larger facets need fewer rings and sides.** The lean grid gives facets of 0.2 to 0.35 H, the
  size of the mockup. Flat shading of the lean grid (d1) shows a regular diamond grid.
- **A small crease and a small jitter break the grid.** The crease of 10° joins neighbor
  triangles that are nearly flat into one larger facet. The jitter of 0.02 H turns each face
  normal by up to about 5° to 10°. Thus some neighbors join and some split, and the facets get
  uneven sizes, as in the mockup.
- **Jitter of the normals is safer than jitter of the positions.** d4 and d7 measure nearly the
  same. d4 moved the head surface by up to 0.02 H, which pushed the small nose of the rabbit
  partly into the head. d7 keeps every position, so the outline, the eyes, the nose, the
  footprints, and the clearances do not change.
- **Jitter above 0.03 H is too much.** e3 (0.05 H) gives a lumpy outline and steps of 12.7%.
- **The current head rings are too thin for flat facets.** Variant f kept them. The low rings
  of the head point down and make dark slits at the nape.

`2026-10-07-facet-look/bear-back.png` shows the back of the conductor in the default view: the
mockup, then a, b, c15, d4, and d7. `2026-10-07-facet-look/species-close.png` shows the rabbit,
the fox, the elephant, and the panda in the gallery close view, next to the mockup crops.
`2026-10-07-facet-look/default-view.png` shows the mockup and the default view of a and d7.

## 5. Recommendation

Use variant d7 in stage F.

```typescript
/** The facet look of the bodies (design 4.5, facets). */
export interface FacetLook {
  /** The crease angle of the `fur` finish, in degrees. The other finishes keep 60°. */
  readonly furCrease: number; // 10
  /** The corners of each ring of the trunk grid and of the head (`loft()`). Even. */
  readonly trunkSides: number; // 12
  /** The indices of `TORSO_PROFILE` that stay: the rings at the changes of the form. */
  readonly torsoRings: readonly number[]; // [0, 1, 2, 3, 5, 6, 8, 10]
  /** The indices of `HEAD_RINGS` that stay. The turns alternate from the widest ring (turn 0). */
  readonly headRings: readonly number[]; // [0, 1, 2, 4, 6, 7, 9, 10]
  /** The sides of the arm sweep (`ARM_SIDES`). */
  readonly armSides: number; // 6
  /** The sides of the leg sweep (`LEG_SIDES`). */
  readonly legSides: number; // 8
  /** The sides of the tail sweeps. */
  readonly tailSides: number; // 6
  /**
   * The largest offset of a welded vertex for the face normals, in H. The positions stay.
   * The offset is a hash of the weld grid point (|x|, y, z), and its x part takes the sign of
   * x, so the left half stays the mirror of the right half. A vertex on the middle plane gets
   * no x offset. The hash is the seed: no random state, so each build gives the same normals.
   */
  readonly normalJitter: number; // 0.02
}
```

### 5.1 Triangles against the budgets

| Model | `main` | d7 | Budget |
|---|---|---|---|
| Largest body (badger, elephant) | 2,444 | 1,964 (badger), 1,940 (elephant) | 2,600 |
| Rabbit | 2,240 | 1,760 | 2,600 |
| Bear | 2,208 | 1,728 | 2,600 |
| Scene of `perf-60.mid` | 163,398 | 132,810 | 168,500 |

The body parts of d7 for the rabbit: trunk grid and head 480, eyes 192, ears 112, tail 80, arms
312, hands 168, legs 288, feet 128. The free 636 triangles of each body can pay for the tufts and
the eye lights of the spec (section 4, rows T and F).

### 5.2 Open items

- **Head facets.** The lean head gives 0.27 to 0.35 H, against 0.20 to 0.23 H in the mockup. A
  head of 12 sides with 7 rings at the crown, the brow, the cheeks, and the jaw, and with no thin
  ring that points down, can close the gap. Variant f shows the fault of the thin rings.
- **The dark nape.** All variants show a dark V under the back of the head in the default view,
  also the smooth variant a. The faces under the head point down, and the baked occlusion
  darkens them. The mockup shows a soft collar line there. This is a fault of the form between
  the jaw ring and the neck ring, and it is separate from the facets.
- **The shine of the light.** The step of d7 on the head (17.6%) is higher than on the mockup
  bear. The mockup light is softer. The scene polish owns the light.

## 6. Cost to build

About 3.5 hours of agent time in stage F, without the review rounds.

```text
  mesh.ts        `fur` finish (crease 10°, roughness 0.85)  --+
  body files     body parts take `fur`                        |
  trunk.ts       12 sides, torso rings [0,1,2,3,5,6,8,10]     +--> shadeMesh(mesh, parents, jitter)
  head.ts        12 sides, head rings, cheek and brow shares  |      jitter = 0.02 x headHeight
  arms.ts        ARM_SIDES 6                                  |
  legs.ts        LEG_SIDES 8                                  |    scene/geometry.ts and
  tails.ts       sides 6                                     -+    scene/player.ts pass it
```

| Stage | Change | Files |
|---|---|---|
| F1. Fur finish | `FINISHES` gets `fur` with the crease 10°. The finish texture gets a fifth texel. The body parts use `fur`. The instruments, the props, and the eyes keep their finishes. | `models/mesh.ts`, the body files, `scene/geometry.ts`, design 4.5 |
| F2. Lean grid | The side counts and the ring lists of section 5. The skin blends of the torso keep their heights, so `torsoSkin()` needs no change. | `models/trunk.ts`, `models/head.ts`, `models/arms.ts`, `models/legs.ts`, `models/tails.ts` |
| F3. Normal jitter | `shadeMesh()` gets the jitter in meters. It computes the face data from offset copies of the welded positions and keeps the positions. | `models/shading.ts`, `scene/geometry.ts`, `scene/player.ts` |
| F4. Tests and docs | The 14 tests below, new tests for the jitter (mirror, same result twice, positions unchanged), and the counts of design 4.5. The decision row of the crease of 60° in `2026-10-06-fur-shading.md` changes. | tests, design 4.5, a new decision file |

The unit tests with the d7 knobs: 14 of 1,915 fail.

| Test | Kind | Change |
|---|---|---|
| `arms.test.ts:60` | count pin | 8 sides becomes 6 |
| `legs.test.ts:109` | count pin | 180 triangles become 144 |
| `legs.test.ts:133` | count pin | 10 sides become 8 |
| `trunk.test.ts:68` | ring list | the blend rings 0.45, 0.87, and 1.09 H are gone |
| `trunk.test.ts:104` | ring list | the face ring at -0.25 H is gone (the widest front is now at -0.12 H) |
| `trunk.test.ts:138` | ring list | the blaze of the beagle cap at 12 sides |
| `trunk.test.ts:164` | count pin | the neck width uses cos(π/12) in place of cos(π/16) |
| `trunk.test.ts:221` | count pin | the shoulder half width at 0.98 H is 3% less with 12 sides |
| `trunk.test.ts:260` | ring list | the brow ring at 0.16 H turns by half a side, so its front corner moves |
| `shading.test.ts:112` | crease | the seam test uses two body bones, which get the crease of 10° |
| `snouts.test.ts:96` | form | a snout reaches 0.0846 m in front of the face (limit 0.0836 m), because the face front moves back |
| `tails.test.ts:58` | form | the flat tail is 0.152 m wide (limit 0.158 m) with 6 sides. Keep 8 sides for the flat tail |
| `tails.test.ts:92` | form | the bushy tail folds by 40.4° (limit 40°) with 6 sides. Keep 8 sides, or set the limit to 45° |
| `pose-at.test.ts:742` | form | a rest motion jumps by 0.064 (limit 0.06). Find the cause in stage F |

`budget.test.ts`, the footprint tests, the hidden-head tests, and the clearance tests pass with
d7. `shading-speed.test.ts` gets less work.

## 7. How to repeat the numbers

The scratch folder of this session holds the scripts:
`/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/bbc72698-2ea8-4111-b511-ab4feb30dd03/scratchpad/facet-look/`.

- `experiment-final.patch` and `facet-knobs-final.ts`: the knobs on `c96d7bd`. The page query
  `?facet=` or the env variable `FACET` sets them, for example
  `trunk:12,rings:lean,arm:6,leg:8,tail:6,crease:10,jit:0.02,jn:1` (d7). `rings:torso` makes
  the torso lean only (f). `jn:1` puts the jitter on the normals only. The gallery query `turn`
  turns the models, in degrees.
- `shoot.ts`: starts Vite on port 5391, takes the jobs of a list in headless Chromium with ANGLE
  on Metal, and stops the server and the browser. `make_jobs.py` writes the job lists.
- `measure.py`: the facet measure of 2.1. `measure_all.sh` runs it on the patches of 2.3.
- `count.ts`: the triangles of each body and of the scene of `perf-60.mid`.
- `time.ts`: the build and shading times.

```bash
SCRATCH=<scratch folder>
git apply $SCRATCH/experiment-final.patch && cp $SCRATCH/facet-knobs-final.ts src/models/facet-knobs.ts
FACET='trunk:12,rings:lean,arm:6,leg:8,tail:6,crease:10,jit:0.02,jn:1' node $SCRATCH/count.ts all
node $SCRATCH/shoot.ts $SCRATCH/jobs4.json $SCRATCH/shots
zsh $SCRATCH/measure_all.sh a d7
```
