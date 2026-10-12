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
| `./build.sh` | Makes everything again in about 25 s: the masks, `out/bear.glb`, the compare image, the motion frames, the 4/4 plot, and a viewer screenshot. |
| `./build.sh --no-shots` | Stops after `out/bear.glb`. |
| `pnpm exec vite bear-studio` (in the worktree root) | Serves the viewer at `/viewer/index.html`. |
| `node tools/shoot.mjs compare` | Renders the four sheet views of the GLB beside the sheet and prints the IoU. |
| `node tools/shoot.mjs frames [--only <clip>]` | Renders the motion frames into `out/frames/`. |
| `blender -b --factory-startup --python tools/bear/fit.py -- --rows` | Scores the distance field against the masks with no mesh, and prints the edges of each row. One round takes 1 s. |
| `blender -b --factory-startup --python tools/bear/pattern.py --` | Plots the path of the baton tip in the 4/4 clip. |

`tools/shoot.mjs` starts its own Vite server and headless Chromium, and stops both at the end.

## Method

The sheet is the only input. The build measures the sheet, builds a smooth body from measured
parts, cuts it into large flat facets, and then rigs and animates it.

```text
 bear-views.png
      │ tools/measure.py (Pillow)
      v
 masks + row profiles ──> tools/bear/body.py: measured parts ──> one distance field
 (out/measure.json)        trunk loft, head, arms, legs,             │ sdf.py: surface nets
                           ears, tail, smooth union                  v
                                                              dense mesh (141k quads)
                                                                     │ Blender collapse,
                                                                     v 2400 triangles
 details.py: eyes, nose, mouth, claws, baton ──> paint.py: face colors, baked occlusion
                                                                     │
 rig.py: 29 bones, bone heat weights, rigid head ────────────────────┤
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
- **Other parts.** Ellipsoids and round cones at measured joints: head (cranium, jowls,
  muzzle), ears with a hollow, arms, paws, legs, feet with toes, and the tail. A smooth union
  joins them, so the joints get soft fillets.
- **Arms in two poses.** The arm parts are attached to the bone frames. The same code builds
  the arms as they hang on the sheet (`reference`) or raised for the rig (`bind`).

The sheet views are separate renders of an image model, and they do not agree exactly. The
compare uses a far camera (distance 10 bear heights, so the perspective is weak), scales each
render to the height of its mask, puts its lowest pixel on the ground row, and searches the x
shift in a window of ±40 px. Nothing else is fitted. The 3/4 view uses an azimuth of 38°, the
best value of a search from 30° to 50°.

### Facets and colors

Surface nets make a dense mesh of the field (grid step 0.004). The Blender collapse decimation
reduces it to 2400 triangles. A vertex group keeps more facets on the muzzle. The mirror
option of the decimation folded 12 faces on the plane x = 0, so the build does not use it. The
facets of the two sides therefore differ, as they do on the sheet. The build counts the faces
whose normal points into the body: the count is 0.

Each face has one color in a vertex color attribute (glTF `COLOR_0`):

- the fur, the lighter belly, the tan muzzle, the dark inner ears, and the darker brows, by
  region rules;
- ambient occlusion baked from the field (the arms do not block, because they move);
- a value jitter of ±5% for each facet.

The palette and the light levels were tuned until the mean color of each rendered view is
within 10 of the sheet. The eyes, the nose, the mouth line, the claws, and the baton are
separate small meshes in the same skinned mesh.

### Rig

The rig has 29 bones. All bones deform, and the glTF exporter writes all of them as joints.

```text
root
└─ hips ─┬─ spine ─ spine1 ─ chest ─┬─ neck ─ head ─┬─ ear_L
         │                          │               └─ ear_R
         │                          ├─ clavicle_L ─ upper_arm_L ─ forearm_L ─ hand_L ─ fingers_L
         │                          └─ clavicle_R ─ upper_arm_R ─ forearm_R ─ hand_R ─┬─ fingers_R
         │                                                                            └─ baton
         ├─ thigh_L ─ shin_L ─ foot_L ─ toes_L
         ├─ thigh_R ─ shin_R ─ foot_R ─ toes_R
         └─ tail
```

- **Bind pose.** Linear blend skinning bends well only near the bind pose. A conductor holds
  the arms up most of the time, so the mesh is built and bound with the arms raised 40°
  forward and 10° out, and with the elbows bent 25° more than on the sheet. This is near the
  middle of the range from the sheet pose to the conducting poses.
- **Weights.** Bone heat (Blender `ARMATURE_AUTO`) on the body, two rounds of smoothing over
  the edges, at most 4 influences for each vertex. The muzzle and the face then move only
  with the head (`rig.head_rigidity`), so the mouth line and the nose stay on the muzzle when
  the neck bends. The details are rigid: eyes, nose, and mouth on `head`, the hand claws on
  `fingers_*`, the foot claws on `toes_*`, and the baton on `baton`.
- **Baton.** A cork grip and a shaft (0.30 bear heights) in the right paw, on the bone
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
normal. The forearm takes half of the wrist twist, which stops a twist at the wrist. Leg IK
keeps the feet on the ground during dips and the bow. A live driver for a score could use the
same solver, ported to TypeScript. The open limits list this.

The 4/4 path of the right wrist is a ball that bounces between four ictus points: 1 down,
2 in (to the bear's left), 3 out, and 4 up. The vertical speed changes sign at each ictus,
which gives the click and the rebound. The tip of the baton also dips a little at each
ictus.

| Clip | Length | What it shows |
|---|---|---|
| `reference` | 1 frame | The pose of the sheet: the arms hang, the baton is hidden (scale 0). The compare uses it. |
| `ready` | 3.2 s | Both paws up, the baton up, breathing. |
| `beat_4_4` | 4 s | One bar of 4/4 with ictus and rebound, a knee dip on each beat, a sway, a nod on 1. |
| `cue_left` | 4 s | The head turns to the players on the left, and the left paw cues on beat 3. |
| `crescendo` | 4 s | The left palm turns up and lifts. The beat grows, and the chest rises. |
| `hush` | 4 s | The left palm turns down and presses. The beat gets small, and the bear leans in. |
| `cutoff` | 3 s | Both paws lift, make a loop, and cut off with a click. The left paw closes, and the bear holds. |
| `nod_turn` | 4 s | A nod, a turn to the left section, a turn to the right section, and a return. |
| `sway_dip` | 4 s | A torso sway over two beats and a knee dip on each beat. |
| `bow` | 4 s | The right paw goes down with the baton, the left paw goes to the belly, the bear bends at the hips and rises. |
| `performance` | 29.4 s | The clips in order, with blends of 0.3 s: ready, 2 bars of beats, cue, crescendo, hush, cutoff, bow. |

The GLB has this content:

```typescript
/** The content of out/bear.glb. */
interface BearGlb {
  /** One skinned mesh with three primitives: fur, gloss (eyes, nose, claws), baton. */
  meshes: ['Bear'];
  /** The 29 joints of the rig, in the order of the bone tree above. */
  joints: string[];
  /** The marker of the baton tip, a child of the joint 'baton'. */
  markers: ['BatonTip'];
  /** The clips. The beat clips use 60 bpm. */
  animations: Array<
    | 'reference' | 'ready' | 'beat_4_4' | 'cue_left' | 'crescendo' | 'hush'
    | 'cutoff' | 'nod_turn' | 'sway_dip' | 'bow' | 'performance'
  >;
}
```

## Results

All numbers come from `./build.sh` on the last commit.

| Measure | Value |
|---|---|
| Triangles | 3530 in all: body 2400, details 1130 (eyes, nose, mouth, 16 claws, baton) |
| Median edge of a body facet | 19.6 px at the scale of the sheet (the bear is 528 px tall) |
| Bones | 29 |
| Clips | 11 |
| GLB size | 1.3 MB |
| Folded faces | 0 |

Silhouette IoU against the masks of the sheet:

| View | GLB in the `reference` pose (three.js render) | Field before the mesh (`fit.py`) |
|---|---|---|
| Front | 0.9445 | 0.9601 |
| Side | 0.9617 | 0.9678 |
| Back | 0.9528 | 0.9451 |
| 3/4 | 0.9104 | 0.9109 |

The GLB column is the honest one: it includes the decimation, the claws, and the skinning of
the arms from the bind pose down to the sheet pose. The mean color of each view is within 10
of the sheet in each channel (`out/compare/iou.json`).

The tip of the baton at each ictus of `beat_4_4` (`pattern.py`, 120 samples per second):

| Beat | Vertical speed before | Vertical speed after |
|---|---|---|
| 1 | −0.77 | +1.20 |
| 2 | −0.57 | +1.06 |
| 3 | −0.52 | +1.11 |
| 4 | −0.54 | +1.59 |

(Units: bear heights per second at 60 bpm.)

Images:

- `out/compare/compare.png`: for each view, the sheet, the render, and the overlay (gray:
  both, red: only the sheet, blue: only the model).
- `out/frames/<clip>.png`: key frames of each clip from the front, the side, and a 3/4 view.
- `out/frames/pattern.png` and `out/frames/pattern_plot.png`: the path of the baton tip.
- `out/frames/deform.png`: close views of the shoulders, the elbows, the closed paw, and the
  belly in the extreme poses.
- `out/frames/viewer.png`: the viewer during the performance.

## Viewer

`viewer/index.html` loads `out/bear.glb` and draws flat facets. It has these controls:

- the four views of the sheet (the same cameras as the compare), and orbit controls;
- a button for each clip, a tempo slider (time scale bpm / 60), loop, and pause;
- the path of the baton tip, the bones, a wireframe, and the ground shadow.

The key, fill, and rim lights follow the camera, as the lights of the sheet do. Only the key
light casts shadows, and the baton casts none.

## Files

| Path | Content |
|---|---|
| `build.sh` | The one command. |
| `tools/measure.py` | Masks, boxes, and row profiles of the sheet (Pillow). |
| `tools/bear/sdf.py` | Distance primitives, smooth blends, and surface nets (numpy). |
| `tools/bear/body.py` | The measured parts, the trunk loft, and the arm poses. |
| `tools/bear/details.py` | Eyes, nose, mouth line, claws, and the baton. |
| `tools/bear/paint.py` | Palette, regions, baked occlusion, and facet statistics. |
| `tools/bear/rig.py` | Bone layout, armature, bone heat, and weight fixes. |
| `tools/bear/pose.py` | The pose solver: relative rotations, two-bone IK, twist share. |
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
- **The tail.** The back view shows a round tail. The side view shows none. The tail sticks
  out about 10 px behind the side silhouette.
- **Sheet pose from the bind pose.** The `reference` clip skins the arms down 40° from the
  bind pose. Together with the decimation and the claws, this makes the front IoU of the GLB
  0.016 lower than the IoU of the field.
- **Baked occlusion** is fixed to the bind pose. It is soft, and the arms do not block, but a
  deep bow does not darken the belly more.
- **Clips have a fixed shape.** A time scale follows a tempo, but a fermata, a rubato, or an
  accent needs a live driver. The solver of `pose.py` can be ported to TypeScript for that.
- **Paw grip.** The paw has one finger bone, which curls all four claws together. The baton
  sits in the closed paw. There are no separate digits.
- **Lighting match.** The mean colors match the sheet. The renders still have less contrast
  in the highlights (the 90th percentile of the luma is 107 to 118, and the sheet has 115 to
  132).
