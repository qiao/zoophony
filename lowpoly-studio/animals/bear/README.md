# The bear conductor

The first animal of the low-poly studio (see `../../README.md`): a bear conductor from one
reference sheet (`reference/bear-views.png`: front, side, back, and 3/4 views), with the role
`conductor` (`../../roles/conductor/`). This file gives the method with the numbers of the bear,
the results, and the open limits. `animal.toml` holds all constants of the bear, and
`golden.json` the stats of the regression (`python3 studio regress bear`).

![review](out/report/review.webp)

The image is the review image of the golden build. Git keeps only this render. Run
`python3 studio build bear` to make the compare image (`out/compare/compare.png`) and the other
images of the section "Images" again.

Build it from `lowpoly-studio/`:

```bash
python3 studio build bear          # the seed pool: seed 3 passes first (about 70 s cold)
python3 studio build bear --seed 5 # one seed
python3 studio view bear           # the viewer on a free port
```

## Method

The sheet is the only input. The build measures the sheet, builds a smooth body from measured
parts, remeshes it into flat facets that follow the forms, and then rigs and animates it. The
README of the studio shows the stages and the modules. This section gives the reasons and the
numbers of the bear.

### Why a measured field

Earlier work in this repository showed two facts. Image-to-3D generators gave poor
silhouettes, and blobs placed by hand gave rough forms. A visual hull of the masks matches the
silhouettes, but with three views each section is a box, and the arms merge with the body in
the side view. Thus a hull cannot put the arms in another pose.

This build uses a distance field of measured parts:

- **Trunk.** A vertical loft. At each height, the section is an egg-shaped superellipse. The
  half width comes from the front and back masks, and the back and front depth come from the
  side mask. The section therefore matches the front and the side silhouettes by
  construction, and it is round. Above the belly the arms hide the sides of the trunk, so the
  width there follows control points. A Gaussian blur of 0.012 removes the pixel steps.
- **Other parts.** Ellipsoids and round cones at measured joints: the arms, the paws, the
  legs, and the feet with toes. A smooth union joins them into one surface, with soft fillets
  where the arms and the legs meet the trunk.
- **Head.** A loft of its own (`head_table` in `studio/field.py`), so the head reads as a round ball above the
  shoulders. The front mask shows the head only from the cheeks up, so the loft follows the
  masks from the cheeks (0.153 wide at height 0.83) to the temples (0.92), closes the dome above
  with a quarter ellipse to height 0.978 between the ears, and closes the cheeks below with a
  quarter ellipse to the chin at height 0.75. From the front the head outline is then close to
  a circle from the ear bases round the cheeks to the chin. The trunk narrows above height
  0.755 to a neck that is narrower than the head (0.115 at 0.795, against 0.153 for the
  cheeks), so the shoulders start below and outside the head. A blend of 0.028 leaves a soft
  groove at the sides; a smaller blend made an undercut that the remesh could not follow (a
  slit and folded faces). A snout cone tilts up toward the front: the nose at its top reaches
  z 0.28, and the chin recedes, as on the sheet. The tan disk is about 0.12 wide from the front
  and ends at the chin (height 0.775), as measured on the sheet.
- **Arms in two poses.** The arm parts are attached to the bone frames. The same code builds
  the arms as they hang on the sheet (`reference`) or raised for the rig (`bind`).

The sheet views are separate renders of an image model, and they do not agree exactly. The
compare uses a far camera (distance 10 bear heights, so the perspective is weak), scales each
render to the height of its mask, puts its lowest pixel on the ground row, and searches the x
shift in a window of ±40 px. Nothing else is fitted. The 3/4 view uses an azimuth of 38°, the
best value of a search from 30° to 50°.

### Facets and colors

The topology follows the sheet: organic triangles of varied sizes and shapes, at many angles,
that still follow the forms, with mirrored halves and a V on the center line of the chest.
`studio/remesh.py` and `studio/organic.py` make it in six steps:

1. **Warp.** Blender QuadriFlow makes quads of one size. Radial warps first grow the head, the
   snout, the paws, and the feet, and shrink the trunk (x and z more than y). After the remesh
   the warps are undone, so the face gets smaller facets and the belly gets larger, wide ones.
2. **Remesh.** QuadriFlow with mesh symmetry makes about 950 quads that follow the curvature:
   rings around the trunk and along the limbs, and loops around the snout.
3. **Snap and mirror.** The vertices go back through the inverse warps, onto the field surface
   (0.004 outside, so the flat facets cut the smooth surface and keep the silhouette), and into
   exact mirror pairs about x = 0. Each quad splits on the diagonal toward the center line.
   Blender's normal recalculation can turn a whole mesh inward (2 of 8 seeds did after the
   round head). The field says where outside is, so when most faces point into the body, all
   of them turn over.
4. **Organic pass.** Pairs of mirrored edges collapse (135 pairs, short edges first) and flip
   (131 pairs) at random. This breaks the grid of the remesh: vertices of valence 6 fall from
   83% to 41%. An operation is refused when a triangle gets an angle under 20° to 22°, when a
   face tilts more than 23° to 28°, or when the mesh would lose its simple surface shape. The
   skin of the shoulders, the elbows, the wrists, and the crotch keeps the even layout, which
   bends better. The snout keeps the rings of the remesh too, so it reads round and smooth, as
   on the sheet.
5. **Relax.** Each vertex moves 12% of the way to the middle of its neighbors, along the
   surface, twice. This removes the worst shapes.
6. **Jitter.** Each vertex moves a little along the surface (sigma 0.005), the same on both
   sides, and less where the facets are small. It does not move in or out, which would raise
   the contrast between neighbor facets.

QuadriFlow is the right base. It aligns the quads to the curvature by construction and mirrors
them, and the organic pass then breaks the regular grid. Edge loops built by hand would need a
cage for each part and a join where the limbs meet the trunk. The decimation of the first
version gave random slivers with no flow and no mirror.

The ears, the tail, the eyes, the brows, the nose, the mouth line, the claws, and the baton
are separate low-poly pieces in the same skinned mesh. The ears and the tail sink into the
body. Quads of the body size cannot hold them.

- **Eyes.** As on the sheet: a dark outline, a thin white rim, a large dark iris that looks a
  little inward, and a small highlight, in four flattened layers along the look direction, at
  height 0.892 and 0.043 from the middle. The radius is 0.0143, and the iris fills 88% of the
  white, from the measures of the feature `eyes` (see "Eyes" in the results). The widest ring of
  the outline sits on the facet, so the whole disk shows.
- **Brows.** A thin dark arc above each eye, highest above the eye, pressed onto the facets.
- **Ears.** Round shells 0.081 wide and 0.086 high, turned out 35° and tilted out 10°, with a
  dark hollow over most of their front face.

Each face has one color in a vertex color attribute (glTF `COLOR_0`):

- the fur, a lighter upper belly (a wide, soft ellipse centered at height 0.54, where the sheet
  is brightest), a darker underside (8% darker at height 0.2), and the tan snout (the faces
  whose three corners lie on the snout cone and its base, down to the chin). The muzzle keeps
  only a fifth of the baked occlusion, and its faces that point down are up to 22% lighter,
  because the soft front light of the sheet keeps the lower muzzle light tan;
- ambient occlusion baked from the field, with each ray started outside the body. A face of an
  arm is blocked only by its own arm and keeps 30% of it, because the arms move. Any other face
  is blocked by the body without the arms. The ground blocks no rays;
- no random value jitter: the shading of the facets gives the variation, as on the sheet.

The light is a soft studio light: a bright hemisphere light (sky near white, ground a warm
gray), a key light from the upper left of the camera, a fill light, and a rim light. The key
casts soft shadows of 30% strength. The palette and the light levels were tuned until the median
hue, saturation, and value of the fur, and the brightness spread of a belly crop, match the
sheet (Results).

### Rig

The rig has 31 bones. All bones deform, and the glTF exporter writes all of them as joints.

```text
root
└─ hips ─┬─ spine ─ spine1 ─ chest ─┬─ neck ─ head ─┬─ ear_L
         │                          │               └─ ear_R
         │                          ├─ clavicle_L ─ upper_arm_L ─ forearm_L ─ forearm_twist_L
         │                          │               └─ hand_L ─ fingers_L
         │                          └─ clavicle_R ─ upper_arm_R ─ forearm_R ─ forearm_twist_R
         │                                          └─ hand_R ─┬─ fingers_R
         │                                                     └─ baton
         ├─ thigh_L ─ shin_L ─ foot_L ─ toes_L
         ├─ thigh_R ─ shin_R ─ foot_R ─ toes_R
         └─ tail
```

- **Bind pose.** Linear blend skinning bends well only near the bind pose. A conductor holds
  the arms up most of the time, so the mesh is built and bound with the arms raised 40°
  forward and 10° out, and with the elbows bent 46°. This is near the middle of the range of
  the conducting poses.
- **Forearm twist bone.** The forearm bone bends at the elbow. The twist bone, from the middle
  of the forearm to the wrist, takes a share of the twist of the paw (50% to 65%), and the paw
  takes the rest. With no twist bone, a palm-up paw twisted the elbow skin like a candy
  wrapper.
- **Automatic clavicle.** The pose solver turns each clavicle by 25% of the swing of its arm
  toward the wrist target (at most 15°), for a raised arm only (wrist height 0.45 to 0.55 blends
  it in). A real shoulder girdle follows the arm, and the skin over the shoulder no longer
  takes the whole rotation.
- **Weights.** Bone heat (Blender `ARMATURE_AUTO`), then these rules (`templates/biped/rig.py`):
  - the trunk takes bands along the spine (`trunk_weights`): each trunk vertex blends the two
    spine bones above and below it;
  - the skin nearer to the trunk than to a forearm loses its forearm, twist, paw, and finger
    weight (`trunk_owned`);
  - each child bone of a limb loses its weight above the middle of its parent bone
    (`chain_limits`), so, for example, no paw weight reaches the elbow;
  - the upper arm and the forearm lose their weight beyond the middle of their child bone
    (`PARENT_LIMITS`), so no face of the wrist mixes the forearm (no twist), the twist bone
    (half), and the paw (all of it), and no stray upper arm weight reaches the wrist;
  - the legs keep bone heat only inside the thigh and the shin and below the trunk; the low
    belly that hangs over the knees takes the trunk bands, because a face there with hips,
    thigh, and shin weight folded over when the knee bent;
  - the clavicle weight of the front of the neck moves to the neck bone (`throat_to_neck`), so
    the throat does not fold when the head turns and a shoulder lifts;
  - extra smoothing under the shoulders and around each shoulder, elbow, and wrist;
  - the snout and the face move only with the head, and the crotch only with the hips;
  - at most 4 influences for each vertex.
  The details are rigid: eyes, nose, and mouth on `head`, the ears on `ear_*`, the tail on
  `tail`, the hand claws on `fingers_*`, the foot claws on `toes_*`, and the baton on `baton`.
- **Arm-down corrective shapes** (`templates/biped/corrective.py`). The arms of the sheet pose are 40° below
  the bind pose. There, skinning folded the skin under the arms and at the back of the
  elbows. Two glTF morph targets (`arm_down_L`, `arm_down_R`) fix it. In the sheet pose, the
  arm skin moves onto the surface of its own arm in the field of the sheet pose, the change
  spreads into the skin around it, and any face that still turns over relaxes. The deltas are
  stored in bind space. Each clip drives the weight of each shape from the angle of its upper
  arm (0 at the bind pose, 1 at the sheet pose). The `reference` clip and the low bow use it.
- **Baton.** A cork grip and a shaft (0.36 bear heights) in the right paw, on the bone
  `baton`. The node `BatonTip` (a child of the joint `baton`) marks the tip.
- **No jaw.** The sheet shows a closed mouth, and the muzzle has no inner mouth, so a jaw bone
  would only stretch the muzzle.

### Motions: clips in the GLB

The motions are animation clips in the GLB. A procedural IK solver in Python makes them at
build time (`templates/biped/solver.py` and `roles/conductor/clips.py`).

Clips are the better delivery here for these reasons:

- Any glTF player plays them (three.js, Blender, game engines), with no code of this studio.
- The data is fixed. A clip gives the same frame each time, so a test or a review can point
  at a frame.
- The beat clips use 60 bpm, and the ictus of beat n is at t = n − 1 s exactly. A player
  sets the time scale to bpm / 60, and each ictus lands on the beat. The viewer does this
  with its tempo slider.

The solver gives the IK benefits at build time. Each wrist follows a target in the frame of
the chest, so a sway or a bow carries the hands. An analytic two-bone IK with an elbow pole
solves the arm. The hand gets its orientation from a baton (or finger) direction and a palm
normal. The forearm twist bone takes half or more of the wrist twist, and the clavicle follows
a raised arm. Leg IK keeps the feet on the ground during dips and the bow. A live driver for a score could use the
same solver, ported to TypeScript. The open limits list this.

The 4/4 path of the right wrist is a ball that bounces between four ictus points: 1 down,
2 in (to the bear's left), 3 out, and 4 up. The vertical speed changes sign at each ictus,
which gives the click and the rebound. The tip of the baton also dips a little at each
ictus. The pattern is at the chest, in front of the right shoulder, and as large as the short
arms reach with the elbow bent by 35° or more: the tip spans 0.29 wide and 0.23 tall. The
torso turns a little with the paw, and the head stays on the players.

### Contact and fold check

`studio/contacts.py` runs in each build. It skins the mesh, with the corrective shapes, at
each baked frame of each clip (30 per second) with linear blend skinning, as three.js does.

- **Contacts.** For each arm it measures how deep the paw, the claws, the forearm, and the
  baton go into the rest of the body (the trunk, the head, the legs, and the other arm). A point
  is inside when it is on the inner side of its nearest face and its winding number is above
  0.5. The limit is 1 cm on the 1 m bear (0.01 bear heights). A test with the left paw moved
  into the belly gave 7.8 cm and a failure.
- **Folds.** For each face it compares the posed normal with the rest normal turned by the
  dominant bone of the face. A face turned past 90° stands edge-on. A face turned past 120°
  has folded over: that is a fold, which shows as a dark crease. A test with the left paw
  turned 170° and no twist on the twist bone gave a fold and a failure.

**Fold repair.** A fold means that the weights step sharply across one face between bones that
turn far apart. After the check, the build smooths the weights around each folded face and its
neighbors two rings deep (`repair_folds` in `studio/weights.py`), makes the corrective shapes again, and checks
again, for up to 4 rounds. The stats file lists the folded faces of each round
(`fold_repairs`).

The build fails when a clip has a contact deeper than 1 cm or any folded face after the
repair. It reports the faces turned past 90° too.

| Clip | Length | What it shows |
|---|---|---|
| `reference` | 1 frame | The pose of the sheet: the arms hang, the baton is hidden (scale 0). The compare uses it. |
| `ready` | 3.2 s | Both paws up, the baton up, breathing. |
| `beat_4_4` | 4 s | One bar of 4/4 with ictus and rebound, a knee dip on each beat, a sway, a nod on 1. |
| `cue_left` | 4 s | The head turns to the players on the left, and the left paw cues on beat 3. |
| `crescendo` | 4 s | The left palm turns up and in, and lifts. The beat grows, and the chest rises. |
| `hush` | 4 s | The left palm turns down and presses. The beat gets small, and the bear leans in. |
| `cutoff` | 3 s | Both paws lift, make a loop, and cut off with a click in front of the shoulders, 0.35 apart. The left paw closes, and the bear holds. |
| `nod_turn` | 4 s | A nod, a turn to the left section, a turn to the right section, and a return. |
| `sway_dip` | 4 s | A torso sway over two beats and a knee dip on each beat. |
| `bow` | 4 s | The right paw swings out and down to the pose of the sheet, with the baton turned back past the hip, the left paw goes to the chest, the bend spreads over the hips and the three spine bones, and the bear rises. |
| `performance` | 29.4 s | The clips in order, with blends of 0.3 s: ready, 2 bars of beats, cue, crescendo, hush, cutoff, bow. |

The GLB has this content:

```typescript
/** The content of out/bear.glb. */
interface BearGlb {
  /** One skinned mesh with three primitives: fur, gloss (eyes, nose, claws), baton. */
  meshes: ['Bear'];
  /** The morph targets of the mesh: the arm-down corrective shapes. */
  morphTargets: ['arm_down_L', 'arm_down_R'];
  /** The 31 joints of the rig, in the order of the bone tree above. */
  joints: string[];
  /** The marker of the baton tip, a child of the joint 'baton'. */
  markers: ['BatonTip'];
  /** The clips. Each one also sets the weights of the morph targets. The beat clips use 60 bpm. */
  animations: Array<
    | 'reference' | 'ready' | 'beat_4_4' | 'cue_left' | 'crescendo' | 'hush'
    | 'cutoff' | 'nod_turn' | 'sway_dip' | 'bow' | 'performance'
  >;
}
```

## Results

All numbers come from `python3 studio build bear` on the last commit (byte-identical to the GLB of main c528ca2e). "Last round" is the GLB of commit
`8ae25d46` (main before the round of the round head, the snout, the eyes, and the folds).

| Measure | Value |
|---|---|
| Triangles | 2834 in all: body 1200, details 1634 (eyes in four layers, brows, nose, mouth, ears, tail, 16 claws, baton) |
| Bones | 31 |
| Morph targets | 2 (`arm_down_L`, `arm_down_R`) |
| Clips | 11 |
| Remesh seed | 3 (the first seed of `facets.seeds`. 7 of 8 seeds pass: the remesh gate stops seed 2, see "Seed") |
| Fold repair | 1 round, 1 face |
| GLB size | 1.4 MB |
| Folded faces in the rest mesh | 0 |

### Facets

The facets of the body mesh (`studio/measure_mesh.py`). The lengths are in px at the scale of the
sheet (the bear is 528 px tall).

| Measure | First version (decimated) | Aligned remesh | Organic remesh (`786a9122`) | Head ball (`8ae25d46`) | Now (round head, seed 3) |
|---|---|---|---|---|---|
| Body triangles | 2400 | 1220 | 1356 | 1248 | 1200 |
| Median edge | 19.6 | 29.1 | 27.5 | 28.2 | 28.1 |
| Edge quartiles | 14.5 to 26.9 | 23.1 to 35.8 | 21.6 to 34.8 | 22.1 to 35.8 | 20.7 to 37.6 |
| Edge spread, IQR / median | 0.64 | 0.43 | 0.48 | 0.48 | 0.60 |
| Slivers (smallest angle under 15°) | 4.4% | 0.7% | 0.6% | 0.5% | 0.2% |
| Mirrored vertices | 4.5% | 99.8% | 99.9% | 100% | 100% |
| Vertices of valence 6 (a regular grid) | - | 83% | 41% | 38% | 43% |
| Spread of the valence (standard deviation) | - | 0.60 | 1.14 | 1.16 | 1.15 |
| Edge directions of the belly (entropy, 1 = all equal) | - | 0.938 | 0.955 | 0.834 | 0.924 |

The facets change with each change of the field and with the seed, because the remesh lays its
faces out again.

The sheet has no mesh, so `studio/measure_shading.py` measures its facets from the shading of the
front view. It finds 8.6 facets across the belly, 9.7 along the arm, and an edge of about
49 px. This measure counts only the edges where the brightness steps by 3 levels or more, so
it depends on the contrast. It misses many edges of the soft renders now, so the mesh measures
above are the reliable ones for the model.

### Facet contrast

The brightness of a belly crop of the front view (x from −0.13 to 0.13, height 0.30 to 0.52).
"Fine spread" is the standard deviation of the luminance minus a blur of 8 px: it keeps the
steps between neighbor facets and drops the gentle gradients.

| Measure | Sheet | Aligned remesh | Organic remesh (`786a9122`) | Head ball (`8ae25d46`) | Now |
|---|---|---|---|---|---|
| Fine spread (facet contrast) | 3.60 | 4.88 | 3.51 | 3.09 | 4.06 |
| Spread (standard deviation of the luminance) | 16.6 | 15.5 | 15.4 | 15.7 | 17.4 |
| Mean luminance | 102 | 113 | 97 | 97 | 97 |

### Silhouette and color

Silhouette IoU against the masks of the sheet:

| View | GLB now | GLB of the last round (`8ae25d46`) | Field before the mesh now (`fit.py`) |
|---|---|---|---|
| Front | 0.9468 | 0.9508 | 0.9535 |
| Side | 0.9596 | 0.9593 | 0.9678 |
| Back | 0.9495 | 0.9500 | 0.9513 |
| 3/4 | 0.9154 | 0.9133 | 0.9154 |

The front lost 0.004: the narrower neck no longer fills the rows from height 0.775 to 0.80,
where the front mask joins the cheek fur and the shoulders into one outline.

The GLB column includes the facets, the ears, the claws, the skinning of the arms from the
bind pose down to the sheet pose, and the corrective shapes.

The median color of the fur (the bear pixels from height 0.25 to 0.70, with saturation 0.2 or
more and value 0.18 or more), in hue (degrees), saturation, and value:

| View | Sheet | Render now |
|---|---|---|
| Front | 22.7°, 0.603, 0.494 | 23.0°, 0.613, 0.502 |
| Side | 22.6°, 0.602, 0.486 | 22.9°, 0.616, 0.494 |
| Back | 22.3°, 0.615, 0.463 | 22.7°, 0.596, 0.510 |
| 3/4 | 22.8°, 0.607, 0.529 | 22.9°, 0.598, 0.510 |

### Eyes

The feature `eyes` of `measure.features` (`studio/measure_features.py`, method "blobs") finds
each eye as a blob of near-black and near-white pixels in the band of the eyes, in bear
heights. "Outline" is the width of the eye with its dark outline. "Rim" is the
white area over the circumference (the width of an even white ring of the same area): the iris
of the sheet looks to one side, so one row does not give the rim.

| View | Sheet: outline, rim | Last round: outline, rim | Now: outline, rim |
|---|---|---|---|
| Front, eye 1 | 0.0265, 0.0008 | 0.0208, 0.0014 | 0.0246, 0.0007 |
| Front, eye 2 | 0.0246, 0.0009 | 0.0189, 0.0013 | 0.0246, 0.0009 |
| 3/4, near eye | 0.0261, 0.0006 | 0.0205, 0.0020 | 0.0261, 0.0014 |

The far eye of the 3/4 view is 0.011 wide on the sheet and 0.024 on the render, because the
sheet turns the head more toward the camera than the body (see "Open limits").

### Ears

The feature `ears` (method "bump") measures each ear on the silhouette, in bear heights: the
widest row of the ear while it stands free of the skull, and the height from its top to the notch where it meets the
head. "Dark" is the share of the ear disk of the front view that is darker than its fur.

| View | Sheet: width, height | Last round: width, height | Now: width, height |
|---|---|---|---|
| Front | 0.066, 0.076 (dark 0.37) | 0.068, 0.078 (dark 0.33) | 0.066, 0.074 (dark 0.30) |
| Side | 0.056, 0.080 | 0.050, 0.078 | 0.052, 0.078 |
| Back | 0.065, 0.075 | 0.070, 0.079 | 0.070, 0.074 |

The ears are a little larger than the sheet from the back, and a little narrower from the
side. A wider ear from the side needs a turn of the ear toward the front, and that
makes it narrower from the front.

### Nose, muzzle, belly, and claws

The generic feature measure (`measure.features` of `animal.toml`) also measures these features,
on the golden build (seed 3), in bear heights. The crops are in `out/report/features/`.

| Feature, view | Sheet | Render | Check |
|---|---|---|---|
| Nose, front | y 0.833, width 0.066 | y 0.858, width 0.076 | fails: 2.5 cm higher |
| Nose, side | x 0.264, width 0.033 | x 0.282, width 0.028 | fails: 1.8 cm further forward, narrower |
| Muzzle, front | y 0.820, height 0.125 | y 0.852, height 0.091 | fails: higher and shorter |
| Muzzle, side | y 0.831, height 0.100 | y 0.841, height 0.087 | fails: 1.0 cm higher |
| Belly, front | y 0.503, width 0.239 | y 0.518, width 0.214 | passes |
| Claws, front | 4 claws on each paw | 1 blob on each paw | fails: the claws touch |

The nose and the muzzle are measured in the front and the side views only, because the 3/4
view of the sheet turns the head more.

### Contacts and folds

The worst value of each clip:

| Clip | Deepest contact | Faces turned past 90° | Folded faces (past 120°) |
|---|---|---|---|
| `reference` (the four views) | 0.00 cm | 0 | 0 |
| `ready` | 0.00 cm | 0 | 0 |
| `beat_4_4` | 0.00 cm | 0 | 0 |
| `cue_left` | 0.00 cm | 0 | 0 |
| `crescendo` | 0.00 cm | 0 | 0 |
| `hush` | 0.00 cm | 0 | 0 |
| `cutoff` | 0.00 cm | 1 | 0 |
| `nod_turn` | 0.00 cm | 0 | 0 |
| `sway_dip` | 0.00 cm | 0 | 0 |
| `bow` | 0.00 cm | 1 | 0 |
| `performance` | 0.00 cm | 1 | 0 |

The values are after the fold repair: the first check found one folded face in the bow, and
one round of smoothing removed it. The faces turned past 90° are single faces that stand
edge-on.

`out/diag/folds.json` lists these faces with their places, and `out/diag/` has a crop of each.
Git does not keep `out/diag/`: `python3 studio build bear` writes it again.

| Face | Status | Region | Clips | Worst turn | Weights |
|---|---|---|---|---|---|
| 134 | repaired | upper arm, front, right | bow, performance (before the repair) | 145.4° | upper_arm_R 0.47, clavicle_R 0.21, forearm_R 0.15 |
| 687 | turned | forearm, front, left | cutoff, performance | 106.7° | forearm_L 0.34, upper_arm_L 0.27, forearm_twist_L 0.16 |
| 179 | turned | upper arm, side, right | bow, performance | 95.1° | upper_arm_R 0.42, spine 0.28, hips 0.26 |
| 361, 960 | sliver | hips, under (right and left) | rest mesh | smallest angle 4.1° | hips 0.94 |

The closest approach of the bow is the right forearm, 0.89 cm from the right hip
(`out/diag/contacts.json`).

### Seed

The facets come from a QuadriFlow remesh, and its seed decides where each face lands. The full
check of all 8 seeds, before and after this round:

| Seed | Before (`8ae25d46`) | Now: first check | Now: after the fold repair |
|---|---|---|---|
| 1 | fails: knee fronts (cutoff, bow) | passes | passes |
| 2 | passes | 9 folded faces | passes (1 round) |
| 3 | fails: a wrist (crescendo, cutoff) | 1 folded face | passes (1 round) |
| 4 | fails: under the right arm (bow) | passes | passes |
| 5 | fails: 1 face (cue) | passes | passes |
| 6 | fails: 1 face (bow) | passes | passes |
| 7 | fails: 4 faces, 0.11 cm (bow) | 4 folded faces | passes (1 round) |
| 8 | passes | 2 folded faces | passes (1 round) |
| Pass count | 2 of 8 | 4 of 8 | 8 of 8 |

The causes, each with its fix:

- **Slivers in deep creases** (seeds 1, 2, 4: faces with a smallest angle of 4° to 13° under
  the raised arm). Their normal turns over at the first bend, and no weight helps. The remesh
  now flips or collapses each sliver (`clean_slivers` in `studio/organic.py`).
- **Faces inside out after the remesh** (the crown of the dome, the crotch, the groove under the
  head, and in seeds 5 and 6 the whole mesh). The remesh turns a mesh that points inward, and an
  untangle pass moves the corners of each inward face (`untangle` in `studio/remesh.py`). The dome closes as a
  round cap, because a dome that closed in width before depth left a ridge on the crown.
- **Weights of bones that turn far apart on one face**: paw and twist weight on the upper arm
  near the raised paw (`arm_owned`, more `CHAINS`), twist weight up to the inner elbow (the
  twist weight starts at 70% of the forearm bone), forearm and upper arm weight at the wrist
  (`PARENT_LIMITS`), hips, thigh, and shin weight on the belly over the knees, clavicle weight on
  the throat and head weight on the shoulder tops (`throat_to_neck`), and ear weight on the crown
  (`ears_to_head`).
- **What is left** is a single face here and there. The fold repair smooths the weights around
  it (one ring), which removes it in one round in all 8 seeds. A wider repair (two rings) moved
  the forearm skin into the body near the elbow (1.17 cm in the hush), so the repair stays small.

`python3 studio build` keeps the seed search as a fallback (the seed order is `facets.seeds` of `animal.toml`). The default order starts with seed 3, which
has the best sum of the four IoU values (3.771) and the cleanest face of seeds 1 and 3.

### Beat pattern

The tip of the baton at each ictus of `beat_4_4` (`roles/conductor/pattern.py`, 120 samples per second):

| Beat | Vertical speed before | Vertical speed after |
|---|---|---|
| 1 | −1.08 | +1.47 |
| 2 | −0.70 | +1.33 |
| 3 | −0.65 | +1.40 |
| 4 | −0.68 | +2.23 |

(Units: bear heights per second at 60 bpm.)

### Images

A build writes these images. Git keeps only `out/report/review.webp`, so run
`python3 studio build bear` (or `python3 studio compare bear` for the renders alone) to make the
others again.

- `out/compare/compare.png`: for each view, the sheet, the render, and the overlay (gray:
  both, red: only the sheet, blue: only the model).
- `out/compare/face_<view>.png`: the head of the sheet beside the render, at 3x.
- `out/compare/facets_chest_belly.png`, `facets_shoulder_arm.png`, `facets_head.png`: the
  facets of the sheet beside the render, at the same scale (2x).
- `out/compare/render_<view>.png`: the aligned renders, and `topology.json`, `iou.json`,
  `features.json`, `mesh.json`.
- `out/report/index.html`: the look report of the build, and `out/report/review.png`: its key
  crops and numbers in one image (`review.webp`: the same image in at most about 300 kB).
- `out/diag/`: the fold debug list (`folds.json`), the contacts and the closest approaches
  (`contacts.json`), and a crop of each located face.
- `out/frames/<clip>.png`: key frames of each clip from the front, the side, and a 3/4 view.
- `out/frames/pattern.png` and `out/frames/pattern_plot.png`: the path of the baton tip.
- `out/frames/deform.png`: close views of the shoulders, the elbows, the closed paw, and the
  belly in the extreme poses.
- `out/frames/bow.png`, `out/frames/cutoff.png`, and the other clip sheets: the conducting
  frames.
- `out/frames/viewer.png`: the viewer during the performance.

## Open limits

- **The sheet disagrees with itself.** The 3/4 view has the head turned more toward the
  camera than the body, and its arms hang further forward than the side view shows. One rigid
  pose cannot match all four views, so the 3/4 IoU stays near 0.91. The front view of the
  sheet is not symmetric, and the model is.
- **The remesh seed matters for the look.** All 8 seeds pass the contact and fold check, but
  the facets, the facet contrast, and the shape of the tan edge change with the seed. Seed 3 is
  the default. The remesh gate stops seed 2: 1036 quads (the band is 765 to 1035),
  1.08% slivers, and 4 open edges.
- **Snout from the front.** The snout reads round from the side and the 3/4 view. From the
  front, the tan edge follows the facets, so it reads as a rounded block, not as the smooth
  disk of the sheet.
- **Facet contrast.** The fine spread of the belly is 4.06, against 3.60 on the sheet (3.09 in
  the last round, on another remesh).
- **Facet shapes.** The sheet still has more long, thin triangles that follow a fold, and its
  chest edges are more diagonal. The organic pass refuses angles under 20°, so it makes none.
- **Twist.** The palm-up crescendo uses a palm turned up and in (about 85° of twist), because a
  palm fully up (120°) folded the wrist even with the twist bone.
- **Corrective shapes** exist only for the arms down. Other extreme poses rely on the twist
  bones, the automatic clavicles, and the weight rules.
- **The tail.** The back view shows a round tail. The side view shows none. The tail sticks
  out about 10 px behind the side silhouette.
- **Baked occlusion** is fixed to the bind pose. It is soft, but a deep bow does not darken the
  belly more.
- **Clips have a fixed shape.** A time scale follows a tempo, but a fermata, a rubato, or an
  accent needs a live driver. The solver of `pose.py` can be ported to TypeScript for that.
- **Paw grip.** The paw has one finger bone, which curls all four claws together. The baton
  sits in the closed paw. There are no separate digits.
- **Nose, muzzle, and claws.** The feature checks find that the nose sits 2.5 cm higher than
  on the sheet in the front view and 1.8 cm further forward in the side view, that the tan
  muzzle is shorter and does not reach down to the chin, and that the four claws of each paw
  touch, so they read as one dark blob. These are look items for a next round.
- **Highlights.** The renders have a little less contrast in the highlights (the 90th
  percentile of the luma is 108 to 112, and the sheet has 115 to 132), and the lit quarter of
  the fur is 1° to 2° redder.
