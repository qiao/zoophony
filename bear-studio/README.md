# Bear conductor studio

This folder makes a low-poly bear conductor from one reference sheet
(`reference/bear-views.png`: front, side, back, and 3/4 views). One command makes the
mesh, the colors, the rig, the baton, and the conducting clips, and writes them into one GLB
file. The folder does not use the code of the app in `src/`.

![compare](out/compare/compare.png)

## Commands

Run the commands in this folder. The build needs python3 with Pillow, Blender 5.2 or later
(`blender` on the path, or the variable `BLENDER`), Node 24, and the packages of the worktree
(`pnpm install --offline` in the worktree root).

| Command | Result |
|---|---|
| `./build.sh` | Makes everything again in about 70 s: the masks, `out/bear.glb`, the contact and fold check, the compare images, the motion frames, the 4/4 plot, and a viewer screenshot. It tries the remesh seeds of `SEEDS` (default `2 8 1 3 4 5 6 7`) in order and keeps the first one whose clips all pass the check (see "Seed"). It fails when no seed passes. |
| `./build.sh --seed 5` | Uses one seed only, and fails when a clip of that seed fails the check. |
| `./build.sh --no-shots` | Stops after `out/bear.glb`. |
| `pnpm exec vite bear-studio` (in the worktree root) | Serves the viewer at `/viewer/index.html`. |
| `node tools/shoot.mjs compare` | Renders the four sheet views of the GLB beside the sheet and prints the IoU. |
| `node tools/shoot.mjs frames [--only <clip>]` | Renders the motion frames into `out/frames/`. |
| `blender -b --factory-startup --python tools/bear/fit.py -- --rows` | Scores the distance field against the masks with no mesh, and prints the edges of each row. One round takes 1 s. |
| `blender -b --factory-startup --python tools/bear/pattern.py --` | Plots the path of the baton tip in the 4/4 clip. |
| `blender -b --factory-startup --python tools/bear/facets.py -- out/bear.glb` | Measures the body facets of a GLB: edge length, slivers, mirror pairs, vertex valence, and the spread of the edge directions. |
| `python3 tools/topology.py [render.png ...]` | Measures the sheet and front renders: the brightness spread of a belly crop (the facet contrast), and the facets by their shading edges. |
| `blender ... tools/bear/build.py -- --quads 900 --seed 2` | Sets the target quad count and the seed of the remesh. |
| `python3 tools/ears.py` | Measures the width, the height, the place, and the dark inner part of the ears of the sheet and of the renders (after `shoot.mjs compare`), and writes `out/compare/ears.json`. |
| `node tools/shoot.mjs compare --light 1.4,3.8,0.9` | Renders the compare with other light levels (hemisphere, key, fill), for tuning. |

`tools/shoot.mjs` starts its own Vite server and headless Chromium, and stops both at the end.

## Method

The sheet is the only input. The build measures the sheet, builds a smooth body from measured
parts, remeshes it into flat facets that follow the forms, and then rigs and animates it.

```text
 bear-views.png
      │ tools/measure.py (Pillow)
      v
 masks + row profiles ──> tools/bear/body.py: measured parts ──> one distance field
 (out/measure.json)        trunk loft, head with snout, arms,        │ sdf.py: surface nets
                           legs, smooth union                        v
                                                              dense mesh (139k quads)
                                                                     │ retopo.py: warp,
                                                                     │ QuadriFlow (mirror),
                                                                     │ unwarp, snap, chevron
                                                                     │ split. organic.py:
                                                                     │ collapse, flip, relax;
                                                                     v jitter
                                                              1356 body triangles
 details.py: eyes, nose, mouth, ears, tail, claws, baton ──> paint.py: colors, occlusion
                                                                     │
 rig.py: 31 bones, weights. corrective.py: arm-down shapes ──────────┤
 motion.py + pose.py: clips from an IK solver ──> anim.py: actions ──┤
                                                                     v
                                                             out/bear.glb
                                                                     │ tools/shoot.mjs
                                                                     v
                                          compare.png + IoU, motion frames, viewer.png
```

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
- **Head.** A loft of its own (`head_table`), so the head reads as a round ball above the
  shoulders and not as one mound with them. The front mask shows the head only from the
  cheeks up, so the loft follows the masks from the cheeks (0.153 wide at height 0.83) to the
  temples (0.92), closes the dome above with a quarter ellipse to height 0.978 between the
  ears, and closes the jowls below with a squarish cap at height 0.75, so they overhang the
  neck. The front is the face plane beside the snout and the forehead of the side mask, and
  the back of the skull sits in front of the hump line. The trunk ends in a narrower neck
  inside the head, and a small blend (0.016) leaves a soft groove where the head meets the
  neck and the hump. A snout cone tilts up toward the front: the nose at its top reaches z
  0.28, and the chin recedes, as on the sheet. From the front the snout is a round tan disk
  0.13 wide.
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
`tools/bear/retopo.py` and `tools/bear/organic.py` make it in six steps:

1. **Warp.** Blender QuadriFlow makes quads of one size. Radial warps first grow the head, the
   snout, the paws, and the feet, and shrink the trunk (x and z more than y). After the remesh
   the warps are undone, so the face gets smaller facets and the belly gets larger, wide ones.
2. **Remesh.** QuadriFlow with mesh symmetry makes about 950 quads that follow the curvature:
   rings around the trunk and along the limbs, and loops around the snout.
3. **Snap and mirror.** The vertices go back through the inverse warps, onto the field surface
   (0.004 outside, so the flat facets cut the smooth surface and keep the silhouette), and into
   exact mirror pairs about x = 0. Each quad splits on the diagonal toward the center line.
4. **Organic pass.** Pairs of mirrored edges collapse (135 pairs, short edges first) and flip
   (131 pairs) at random. This breaks the grid of the remesh: vertices of valence 6 fall from
   83% to 41%. An operation is refused when a triangle gets an angle under 20° to 22°, when a
   face tilts more than 23° to 28°, or when the mesh would lose its simple surface shape. The
   skin of the shoulders, the elbows, the wrists, and the crotch keeps the even layout, which
   bends better.
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

- **Eyes.** As on the sheet: a dark outline, a thin white rim, a dark iris that looks a little
  inward, and a small highlight, in four flattened layers along the look direction. The outline
  is 0.026 bear heights across (the sheet measures 0.025 to 0.027 with its outline), at height
  0.892 and 0.043 from the middle, as measured on the sheet. The widest ring of the outline
  sits on the facet, so the whole disk shows.
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
- **Weights.** Bone heat (Blender `ARMATURE_AUTO`), then these rules (`rig.py`):
  - the trunk takes bands along the spine (`trunk_weights`): each trunk vertex blends the two
    spine bones above and below it;
  - the skin nearer to the trunk than to a forearm loses its forearm, twist, paw, and finger
    weight (`trunk_owned`);
  - each child bone of a limb loses its weight above the middle of its parent bone
    (`chain_limits`), so, for example, no paw weight reaches the elbow;
  - extra smoothing under the shoulders and around each shoulder, elbow, and wrist;
  - the snout and the face move only with the head, and the crotch only with the hips;
  - at most 4 influences for each vertex.
  The details are rigid: eyes, nose, and mouth on `head`, the ears on `ear_*`, the tail on
  `tail`, the hand claws on `fingers_*`, the foot claws on `toes_*`, and the baton on `baton`.
- **Arm-down corrective shapes** (`corrective.py`). The arms of the sheet pose are 40° below
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
build time (`tools/bear/pose.py` and `tools/bear/motion.py`).

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

`tools/bear/contacts.py` runs in each build. It skins the mesh, with the corrective shapes, at
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

The build fails when a clip has a contact deeper than 1 cm or any folded face. It reports the
faces turned past 90° too.

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

All numbers come from `./build.sh` on the last commit. "Last round" is the GLB of commit
`786a9122` (main before the look round of the eyes, the head, and the ears).

| Measure | Value |
|---|---|
| Triangles | 2882 in all: body 1248, details 1634 (eyes in four layers, brows, nose, mouth, ears, tail, 16 claws, baton) |
| Bones | 31 |
| Morph targets | 2 (`arm_down_L`, `arm_down_R`) |
| Clips | 11 |
| Remesh seed | 2 (the first seed of `SEEDS` that passes) |
| GLB size | 1.4 MB |
| Folded faces in the rest mesh | 0 |

### Facets

The facets of the body mesh (`tools/bear/facets.py`). The lengths are in px at the scale of the
sheet (the bear is 528 px tall).

| Measure | First version (decimated) | Aligned remesh | Organic remesh (`786a9122`) | Now (round head) |
|---|---|---|---|---|
| Body triangles | 2400 | 1220 | 1356 | 1248 |
| Median edge | 19.6 | 29.1 | 27.5 | 28.2 |
| Edge quartiles | 14.5 to 26.9 | 23.1 to 35.8 | 21.6 to 34.8 | 22.1 to 35.8 |
| Edge spread, IQR / median | 0.64 | 0.43 | 0.48 | 0.48 |
| Slivers (smallest angle under 15°) | 4.4% | 0.7% | 0.6% | 0.5% |
| Mirrored vertices | 4.5% | 99.8% | 99.9% | 100% |
| Vertices of valence 6 (a regular grid) | - | 83% | 41% | 38% |
| Spread of the valence (standard deviation) | - | 0.60 | 1.14 | 1.16 |
| Edge directions of the belly (entropy, 1 = all equal) | - | 0.938 | 0.955 | 0.834 |

The head changed the field, so the remesh lays its faces out again. The belly of this layout
has more horizontal edges (a lower entropy of the edge directions) than the last round.

The sheet has no mesh, so `tools/topology.py` measures its facets from the shading of the
front view. It finds 8.6 facets across the belly, 9.7 along the arm, and an edge of about
49 px. This measure counts only the edges where the brightness steps by 3 levels or more, so
it depends on the contrast. It misses many edges of the soft renders now, so the mesh measures
above are the reliable ones for the model.

### Facet contrast

The brightness of a belly crop of the front view (x from −0.13 to 0.13, height 0.30 to 0.52).
"Fine spread" is the standard deviation of the luminance minus a blur of 8 px: it keeps the
steps between neighbor facets and drops the gentle gradients.

| Measure | Sheet | Aligned remesh | Organic remesh (`786a9122`) | Now |
|---|---|---|---|---|
| Fine spread (facet contrast) | 3.60 | 4.88 | 3.51 | 3.09 |
| Spread (standard deviation of the luminance) | 16.6 | 15.5 | 15.4 | 15.7 |
| Mean luminance | 102 | 113 | 97 | 97 |

### Silhouette and color

Silhouette IoU against the masks of the sheet:

| View | GLB now | GLB of the last round (`786a9122`) | Field before the mesh now (`fit.py`) |
|---|---|---|---|
| Front | 0.9508 | 0.9523 | 0.9551 |
| Side | 0.9593 | 0.9600 | 0.9695 |
| Back | 0.9500 | 0.9489 | 0.9516 |
| 3/4 | 0.9133 | 0.9141 | 0.9156 |

The GLB column includes the facets, the ears, the claws, the skinning of the arms from the
bind pose down to the sheet pose, and the corrective shapes.

The median color of the fur (the bear pixels from height 0.25 to 0.70, with saturation 0.2 or
more and value 0.18 or more), in hue (degrees), saturation, and value:

| View | Sheet | Render now |
|---|---|---|
| Front | 22.7°, 0.603, 0.494 | 22.9°, 0.613, 0.498 |
| Side | 22.6°, 0.602, 0.486 | 22.9°, 0.612, 0.490 |
| Back | 22.3°, 0.615, 0.463 | 22.6°, 0.597, 0.518 |
| 3/4 | 22.8°, 0.607, 0.529 | 22.7°, 0.602, 0.514 |

### Ears

`tools/ears.py` measures each ear on the silhouette, in bear heights: the widest row of the ear
while it stands free of the skull, and the height from its top to the notch where it meets the
head. "Dark" is the share of the ear disk of the front view that is darker than its fur.

| View | Sheet: width, height | Last round: width, height | Now: width, height |
|---|---|---|---|
| Front | 0.066, 0.076 (dark 0.37) | 0.062, 0.074 (dark 0.30) | 0.068, 0.078 (dark 0.33) |
| Side | 0.056, 0.080 | 0.052, 0.076 | 0.050, 0.078 |
| Back | 0.065, 0.075 | 0.064, 0.074 | 0.070, 0.079 |

The ears are a little larger than the sheet from the front and the back, and a little narrower
from the side. A wider ear from the side needs a turn of the ear toward the front, and that
makes it narrower from the front.

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
| `cutoff` | 0.00 cm | 0 | 0 |
| `nod_turn` | 0.00 cm | 0 | 0 |
| `sway_dip` | 0.00 cm | 0 | 0 |
| `bow` | 0.00 cm | 3 | 0 |
| `performance` | 0.00 cm | 3 | 0 |

The faces turned past 90° are three single faces of the bow that stand edge-on. The close
view of the bow shows no crease there.

### Seed

The facets come from a QuadriFlow remesh, and its seed decides where each face lands. A seed
can put one face across two weight regions, and that face folds over in one clip. The full
check of eight seeds after the head change:

| Seed | Result |
|---|---|
| 1 | fails: 2 folded faces at the knee fronts (cutoff, bow) |
| 2 | passes |
| 3 | fails: 1 folded face at a wrist (crescendo, cutoff) |
| 4 | fails: 1 folded face under the right arm (bow) |
| 5 | fails: 1 folded face (cue) |
| 6 | fails: 1 folded face (bow) |
| 7 | fails: 4 folded faces and 0.11 cm of contact (bow) |
| 8 | passes |

No seed has a contact deeper than 0.11 cm: the failures are always 1 to 4 folded faces. Before
this round, seed 2 also failed, with one face of the crotch keel that folded in the bow: the
crotch mask of `rig.py` faded out at height 0.13 to 0.15, so that face had half hips and half
thigh weight. The mask now stays full on the center line down to height 0.10.

So `build.sh` tries the seeds of `SEEDS` in order and keeps the first one that passes. With
the default order it keeps seed 2 on the first try. A test with `SEEDS="1 2"` failed on seed 1
and kept seed 2.

### Beat pattern

The tip of the baton at each ictus of `beat_4_4` (`pattern.py`, 120 samples per second):

| Beat | Vertical speed before | Vertical speed after |
|---|---|---|
| 1 | −1.08 | +1.47 |
| 2 | −0.70 | +1.33 |
| 3 | −0.65 | +1.40 |
| 4 | −0.68 | +2.23 |

(Units: bear heights per second at 60 bpm.)

### Images

- `out/compare/compare.png`: for each view, the sheet, the render, and the overlay (gray:
  both, red: only the sheet, blue: only the model).
- `out/compare/face_<view>.png`: the head of the sheet beside the render, at 3x.
- `out/compare/facets_chest_belly.png`, `facets_shoulder_arm.png`, `facets_head.png`: the
  facets of the sheet beside the render, at the same scale (2x).
- `out/compare/render_<view>.png`: the aligned renders, and `topology.json`, `iou.json`.
- `out/frames/<clip>.png`: key frames of each clip from the front, the side, and a 3/4 view.
- `out/frames/pattern.png` and `out/frames/pattern_plot.png`: the path of the baton tip.
- `out/frames/deform.png`: close views of the shoulders, the elbows, the closed paw, and the
  belly in the extreme poses.
- `out/frames/bow.png`, `out/frames/cutoff.png`, and the other clip sheets: the conducting
  frames.
- `out/frames/viewer.png`: the viewer during the performance.

## Viewer

`viewer/index.html` loads `out/bear.glb` and draws flat facets. It has these controls:

- the four views of the sheet (the same cameras as the compare), and orbit controls;
- a button for each clip, a tempo slider (time scale bpm / 60), loop, and pause;
- the path of the baton tip, the bones, a wireframe, and the ground shadow.

The key, fill, and rim lights follow the camera, as the lights of the sheet do. Only the key
light casts shadows (soft, 30% strength), and the baton casts none.

## Files

| Path | Content |
|---|---|
| `build.sh` | The one command. |
| `tools/measure.py` | Masks, boxes, and row profiles of the sheet (Pillow). |
| `tools/bear/sdf.py` | Distance primitives, smooth blends, and surface nets (numpy). |
| `tools/bear/body.py` | The measured parts, the trunk loft, and the arm poses. |
| `tools/bear/retopo.py` | The aligned remesh: warps, QuadriFlow, mirror, chevron split, jitter. |
| `tools/bear/organic.py` | The organic pass: mirrored edge collapses and flips, and the relaxation. |
| `tools/bear/details.py` | Eyes, nose, mouth line, ears, tail, claws, and the baton. |
| `tools/bear/paint.py` | Palette, regions, baked occlusion, and facet statistics. |
| `tools/bear/rig.py` | Bone layout, armature, bone heat, trunk bands, and weight rules. |
| `tools/bear/corrective.py` | The arm-down corrective shapes and their driver. |
| `tools/bear/contacts.py` | The contact and fold check of each clip. |
| `tools/bear/facets.py` | The facet measures of a GLB. |
| `tools/topology.py` | The facet contrast and the facet measures of the sheet and of renders. |
| `tools/bear/pose.py` | The pose solver: relative rotations, two-bone IK, twist bone, automatic clavicle. |
| `tools/bear/motion.py` | The clips as functions of time. |
| `tools/bear/anim.py` | Bakes the clips into Blender actions and NLA tracks. |
| `tools/bear/build.py` | The Blender entry point and the glTF export. |
| `tools/bear/fit.py`, `views.py` | The fast field score (no mesh, no browser). |
| `tools/bear/pattern.py` | The plot of the 4/4 path. |
| `tools/shoot.mjs` | Compare, frames, viewer shot, and custom shots (Playwright, Vite). |
| `viewer/` | The viewer page, the compare page, the frames page, and the shared scene. |

## Open limits

- **The sheet disagrees with itself.** The 3/4 view has the head turned more toward the
  camera than the body, and its arms hang further forward than the side view shows. One rigid
  pose cannot match all four views, so the 3/4 IoU stays near 0.91. The front view of the
  sheet is not symmetric, and the model is.
- **The remesh seed matters.** The look, the facet contrast, and the edge-on faces change with
  the seed of QuadriFlow. Seed 2 at 900 quads was chosen from 8 candidates by the IoU and the
  facet contrast, and the full check passes on it. Another seed can need new pose fixes.
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
- **Highlights.** The renders have a little less contrast in the highlights (the 90th
  percentile of the luma is 108 to 112, and the sheet has 115 to 132), and the lit quarter of
  the fur is 1° to 2° redder.
