# Spike: the red fox by gated Blender modeling (route B)

Date: 2026-10-08. Branch: `spike-fox-gated`, from `main` at `a76e63c`. The spike changes no
file in `src/`.

## 1. Summary

This spike tests route B for one species, the red fox of `docs/reference/fox-views.png`. Route B
models the fox in Blender from first principles, with no AI model, and passes a gate at each
phase. The method comes from the MIT skill `blender-image-to-3d` by Majid Manzarpour
(`skills/blender-image-to-3d/` in `majidmanzarpour/blender-game-skills`).

| Result | Front | Side | Back |
|---|---|---|---|
| Silhouette IoU of the final fox | **0.924** | **0.906** | **0.778** |
| IoU of the forms (phase 3, before the low-poly pass) | 0.938 | 0.917 | 0.778 |

| Result | Value |
|---|---|
| Triangles | 2072 (2000 for the body, 72 for the eyes) |
| Palette | 8 flat colors, one for each face |
| Proportions (12 measures, final fox) | mean error 1.6% of the fox height, largest 3.6% |
| Lit and shaded orange fur (sheet 153 and 77) | 149 and 74 |
| Rig | 23 bones, 4 bones at most for each vertex, no vertex without a weight |
| `fox.glb` | 67,308 bytes, 36,629 bytes after gzip |
| Packed estimate (quantized, like the sculpts of `src/models/`) | 29,064 bytes, 19,462 after gzip |
| Time of one full run (`run_all.sh`) | about 30 s |

The silhouettes match the sheet in the front and side views. The back view of the sheet shows a
second tail and hides the lower legs, so no single model can match all three views (sections 3
and 5.1).
The fox reads as the same character, but it is not identical to the sheet: the forms are softer
and rounder than the sculpted facets of the sheet, and the face has less relief (section 9).

![The sheet above the fox of this spike, on the dark background of the sheet](2026-10-08-fox-spike-gated/side-by-side.jpg)

## 2. Method

Each phase is a script in [`tools/spike/fox-gated/`](../../tools/spike/fox-gated/), and
`run_all.sh <work-dir>` runs all of them. The gate of each phase renders the model on the camera
of the sheet and compares the silhouette with a matte of the sheet, pixel for pixel.

```text
fox-views.png
   |
   v
sheet_matte.py --> fox-matte.png (fox 255, ignored 128, background 0)
   |                    |
   |              matte_field.py --> distance field of the matte (m)
   v                    |
fox_parts.py: 26 ellipsoids and round cones, measured on the sheet
   |                    |
   v                    v
build_fox.py --phase blockout   (hard union)        --> gate.py: IoU >= 0.85
build_fox.py --phase forms      (smooth union, grow, --> gate.py: IoU >= 0.90
                                 silhouette carve,       proportions.py: 2 to 5%
                                 blur, OpenVDB mesh)
   |
   v
lowpoly.py: decimate + relax to 2000 triangles, 8 palette colors, eyes
   |
   v
rig.py: 23 bones, bone heat, part mask, 4 bones, test poses, GLB
   |
   v
render_views.py + compose.py + publish.py: the images of this report
```

### 2.1 What came from the skill

- The gates: a blockout gate at IoU 0.85, a forms gate at IoU 0.90, and the proportions within
  5% and 2%. The skill measures the IoU on a camera that covers the world window of the matte
  (`world_gate.py`), so an error of scale or of place counts. `gate.py` adapts this idea.
- A brief before any modeling (section 3), the conflict rule ("record the conflict and the
  ceiling of each view"), and one repeatable script for each phase.
- Organic forms as one fused surface. The skill joins the blockout with a voxel remesh. This
  spike joins a distance field with a smooth union and meshes it with OpenVDB.

I fetched the skill into a scratch folder and read `SKILL.md`, `scripts/world_gate.py`,
`assets/build_template.py`, `references/blender-5-notes.md`, and the creature section of
`references/categories.md`. I ran no script of the skill: the sheet needs a camera with an 8
degree elevation, three views on one image, and pixels to ignore, and the skill scripts have
none of these. No file of the skill ships, so the third-party license notes do not change.

### 2.2 The camera of the sheet

`sheet_camera.py` puts three copies of the fox on the page: front at column 385 and floor row
1117 (turn 0 degrees), side at 1100 and 1118 (turn 65 degrees), and back at 2080 and 1120 (turn
180 degrees). The camera is orthographic, 8 degrees above the floor, with 737 px for each meter.
As on the views page of the app (`src/gallery/views-main.ts`), a vertical line keeps its length,
and depth moves a point up by tan(8 deg). A pixel aspect of 1 / cos(8 deg) gives this projection
in Blender. A test cube landed within 0.5 px of the formula in all three views.

The fox has its own coordinates: meters, z up, the fox faces -y, its left side is +x. The origin
is on the floor under the middle of the chair seat, and the seat top is at z = 0.35 m.

### 2.3 The matte of the sheet

`sheet_matte.py` writes [`fox-matte.png`](2026-10-08-fox-spike-gated/fox-matte.png) at the size
of the sheet. The judge can use it for both routes.

- **Fox (255).** A pixel is fox when its value is above 0.17 (the background is near 0.07) and it
  is not ignored. Holes of at most 700 px (the pupils, the nose) are filled.
- **Ignored (128).** The chair, the violin, and the bow. The chair is the gold hue (25.5 to 45
  degrees, saturation above 0.5, value above 0.3) below row 515, plus an edge of 3 px. Above row
  515, the same hue is lit orange fur. The violins, the scrolls, the frogs, and the bows are
  polygons that I read from gridded crops of the sheet. They hide parts of the fox, so a gate
  counts these pixels neither as fox nor as background.
- **Background (0).** All other pixels, and the labels below row 1180.

## 3. Phase 0: the brief

| Item | Value |
|---|---|
| Views | One image with 3 orthographic views (small perspective), camera 8 degrees above the floor. Front (turn 0), side (turn 65, the right side), back (turn 180). |
| Scale | Chair seat 0.35 m = 258 px, so 737 px/m. Fox height (floor to ear tip) 1.334 m, seated. |
| Parts | Head (cranium, dome, face, cheeks, 2 cheek tufts, muzzle, 2 ears), neck, chest, pelvis, 2 arms (upper arm, forearm, paw), 2 legs (thigh, shin, foot), tail (2 cones). 26 parts. |
| Silhouette features | Large ears with sharp tips. Wide white cheek tufts. Pointed muzzle with a black nose. Thick thighs that point at the camera. Tail beside the right hip with a white tip. Violin arm raised to the right, bow paw at the chest. |
| Colors | Orange fur, cream white (inner ears, cheeks, lower muzzle, chest bib, tail tip), dark brown (ear tips, paws, lower legs), black nose, eyes with white, brown iris, black pupil, lid, and shine. |
| Inferred | The depth of all parts (only two view directions, 0 and 65 degrees, and the back view repeats the axis of the front). The shape of the back. The face of the fox under the violin. |
| Conflicts in the sheet | The back view shows a second tail that hangs behind the chair to row 1000, hides the lower legs, holds the violin paw about 9 cm lower than the front view, and shows smaller ears. The front and side views put the violin paw at different heights (0.86 m and 0.76 m). |

The 12 measures of the proportion gate are in section 5.2. `proportions.py` reads each one as an
extreme row or column of the fox in a box of the sheet.

## 4. Phase 1: the master file

`build_fox.py` writes a master file `fox.blend` for each phase in the work folder, and
`sheet_camera.py` builds the camera of the sheet. The gates use renders on this camera, so the
spike does not need reference planes. A person can load the sheet as the camera background.

## 5. Phases 2 and 3: blockout and forms

### 5.1 Silhouette gates

| Phase | Front | Side | Back | Gate |
|---|---|---|---|---|
| Blockout, iteration 1 | 0.832 | 0.739 | 0.752 | 0.85 |
| Blockout, iteration 5 | 0.857 | 0.850 | 0.747 | 0.85: passed in front and side |
| Blockout of the final parts | 0.841 | 0.846 | 0.729 | see below |
| Forms, iteration 1 | 0.921 | 0.911 | 0.805 | 0.90 |
| Forms, final | **0.938** | **0.917** | 0.778 | 0.90: passed in front and side |
| Low-poly fox, final | **0.924** | **0.906** | 0.778 | |

- The blockout passed at iteration 5. Later, for the forms, some parts grew larger than the
  silhouette on purpose: the ear cones, the left forearm, and the violin paw. The carve of the
  forms trims them. Thus the blockout of the final parts list scores 0.84 and 0.85.
- The back view cannot pass. In the back view, 11.7% of the sheet fox is missing from the model
  (mostly the second tail), and the model adds 13.5% (mostly the lower legs). The back view
  therefore carves only the head and the body (`CARVE_VIEWS`). Its ceiling is near 0.80 for any
  one model that also matches the front and the side.
- The ears carve only by the front and the side view. With the back view too, the front ears lost
  about 30 mm of height, because the back view shows smaller ears.

Red is the sheet only, blue is the model only, gray is both, and dark violet is ignored:

![Gate of the blockout of the final parts](2026-10-08-fox-spike-gated/blockout-diff.png)

![Gate of the forms](2026-10-08-fox-spike-gated/forms-diff.png)

![Gate of the low-poly fox](2026-10-08-fox-spike-gated/lowpoly-diff.png)

The clay renders of the two phases:

![Clay render of the blockout](2026-10-08-fox-spike-gated/blockout-clay.jpg)

![Clay render of the forms](2026-10-08-fox-spike-gated/forms-clay.jpg)

### 5.2 Proportion gate

The error is the difference of the model and the sheet as a percent of the fox height H =
1.334 m.

| Measure | Sheet (m) | Blockout | Forms | Final |
|---|---|---|---|---|
| ear tip height (front) | 1.334 | +2.8 | -2.1 | -3.0 |
| head width at the cheeks (front) | 0.469 | +1.0 | -2.8 | -3.6 |
| right side of the head (front) | -0.216 | -1.8 | +0.5 | +0.6 |
| hip and thigh width (front) | 0.488 | -1.0 | -0.2 | -0.5 |
| foot bottom (front) | 0.050 | -1.9 | +0.3 | +0.4 |
| tail end (front) | -0.374 | -1.5 | -1.5 | -1.5 |
| ear tip height (side) | 1.341 | +3.1 | -0.9 | -1.7 |
| back of the head (side) | -0.099 | +0.8 | +0.3 | +0.5 |
| nose tip (side) | 0.319 | +2.0 | -0.9 | -1.2 |
| knee front (side) | 0.379 | +0.1 | -0.4 | -0.6 |
| foot bottom (side) | 0.034 | +0.8 | +2.6 | +2.8 |
| head width at the cheeks (back) | 0.465 | +0.6 | -2.3 | -3.3 |
| **Mean, largest** | | **1.5, 3.1** | **1.3, 2.8** | **1.6, 3.6** |

The blockout passes the 5% gate. The forms have 4 measures above the 2% gate, all below 3%. The
blur of the forms and the low-poly pass make the head about 45 mm narrower at the cheeks.

### 5.3 How the forms work

`build_fox.py --phase forms` calculates a signed distance field of the fox on a 6 mm grid:

1. Each group of parts (body, head, legs, arms, tail, ears) is a smooth union of its parts, with
   a radius of 25 mm.
2. The group grows by 7 to 15 mm (`GROW`). Then the silhouette carve cuts each point that falls
   outside the matte in one of the views of the group (`CARVE_VIEWS`). This is a visual hull of
   2 or 3 views.
3. The groups join with their own radius (`JOINS`). Before the arms join, the body keeps a gap
   of 30 mm to the forearms and the paws (`SEPARATE`).
4. A blur of 4 passes rounds the flat faces that the carve leaves. The ears and the tail join
   after the blur, because the blur rounds off thin tips.
5. OpenVDB (part of Blender) turns the field into a quad mesh of about 84,000 faces.

## 6. The low-poly pass

`lowpoly.py` makes the low-poly fox in about 2 s.

- **Triangles.** QuadriFlow of Blender 5.2 refused the forms mesh ("needs to be manifold"),
  although the mesh had no open edge and one island. Thus a collapse decimate makes 2000
  triangles. Then a relaxation moves each vertex to the mean of its neighbors in its tangent
  plane and back onto the fine surface, with a beauty pass. With 12 passes, the triangles have
  almost even sizes, and their light looked noisy. With 3 passes (the default), flat areas keep
  larger triangles and curves keep smaller ones, which is nearer to the planes of the sheet.
  The spike adds no extra density at the joints.
- **Colors.** Each face gets one of 8 palette colors from its nearest part and its place on the
  part, for example the white inner ear, the brown paw, and the white mask that rises to the
  eyes at the sides of the face. The borders are triangle edges. A first try read the color of
  the sheet at each face center, in the view that sees the face best. Where the mesh and the
  sheet differ, the colors landed on the wrong parts, for example the white inner ear of the
  sheet on the cranium. The script keeps that mode only for comparison (`--colors sheet`).
- **Eyes.** A ray from the front view finds the eye places on the face. Each eye is a stack of
  almond discs (white, brown iris, black pupil, shine) with a dark upper lid, 36 triangles. Each
  disc vertex sits on the face, so the disc follows the curve of the face.

| Color | sRGB | Faces |
|---|---|---|
| orange fur | `#db6e33` | 1220 |
| white fur | `#eddecc` | 317 |
| dark brown | `#5c3626` | 456 |
| black nose | `#211a17` | 7 |
| eye white | `#fffaf2` | 16 |
| iris | `#6b381a` | 16 |
| pupil and lid | `#0d0a09` | 32 |
| shine | `#ffffff` | 8 |

The renders use EEVEE with a warm key light from the front, the left, and above, a warm fill
light from the right, a white rim light from behind, and flat faces. The lit and the shaded
orange fur measure 149 and 74 against 153 and 77 on the sheet (the method of the views page
report).

![The heads: the sheet above, this spike below](2026-10-08-fox-spike-gated/heads.jpg)

## 7. The rig test

`rig.py` adds 23 bones that fit the seated mesh: hips, spine, chest, neck, head, and on each side
a shoulder, an upper arm, a forearm, a hand, a thigh, a shin, and a foot, plus 4 tail bones.
Blender bone heat gives the weights. Each vertex keeps 4 bones at most, and its weights add up
to 1.

Each row shows a test pose in the front and side views: the right arm raised, the head turned
30 degrees, and the bow arm moved.

![The three test poses](2026-10-08-fox-spike-gated/rig-poses.jpg)

The problems that the test found, and their state:

| Problem | Cause | State |
|---|---|---|
| Bone heat failed: 1492 of 1514 vertices had no weight. | The loose eye discs. | Fixed: the eyes bind apart and follow the head bone with a weight of 1. |
| A raised arm pulled a sheet of chest skin with it. | Bone heat gave chest vertices weight on the forearm and on the right thigh. | Fixed: a part mask keeps, for each vertex, only the bones that its nearest blockout part allows. The mask removes 981 weights. |
| A thin sliver of faces still joined the raised arm and the chest. | The forms fused the forearm with the chest. The forearm rests 14 mm in front of the chest, and the blur closes a gap of 15 mm. | Fixed: the body keeps a gap of 30 mm to the forearms and the paws. |
| The skin under the raised upper arm stretches. | The rest pose is the playing pose, with the arm down at the side. | Open. A neutral rest pose (arms out) and corrective shapes would help. |
| The arm-raised pose first moved the arm down. | My rotation axis did not fit the forward arm. | Fixed in the pose. |

The head turn and the bow move deform cleanly. The legs, the tail, and the spine were not posed.
The skeleton is new and does not fit the pose code of `src/pose/`, so the app cannot use it
without a new pose layer.

## 8. Size

| File | Bytes | Gzip |
|---|---|---|
| [`fox.glb`](2026-10-08-fox-spike-gated/fox.glb): a material for each palette color | 67,308 | 36,629 |
| `fox-colors.glb`: one color attribute (not in the repository) | 71,140 | 35,387 |
| `fox-meshopt.glb`: palette materials and `EXT_meshopt_compression` (not in the repository) | 47,652 | 29,376 |
| Packed estimate (`pack_estimate.py`) | 29,064 | 19,462 |

The GLB files have 1264 vertices (vertices on a color border are doubled), float positions, and
float weights. The packed estimate stores 16-bit positions, 16-bit index steps, 8-bit joints, and
8-bit weights, as the sculpts of `src/models/` do (about 16 KB after gzip each). A pack of this
kind is near the budget of 25 KB. A GLB file alone is above it.

## 9. What worked and what failed

Worked:

- The world-registered gate. It found real errors of place and of scale (a head 30 mm too far
  back, feet 50 mm too low), and it gave one number for each view after each change.
- The silhouette carve. It made the outline of the front and side views match the sheet, and it
  needed only rough primitives.
- One fused mesh with no seams, from a distance field and OpenVDB, in less than 10 s.
- Colors by part rules, with borders on triangle edges.
- Automatic weights with a part mask. One rule table fixes the weights of all limbs.
- A full rebuild in about 30 s, so each change is cheap to check.

Failed or weak:

- **The interior form.** The gate sees only silhouettes. The faces of the forms between the
  outlines come from ellipsoids, so the thighs look like balloons, the head has flat sides, and
  the face has little relief. The sheet has sculpted planes that an artist placed.
- **The carve leaves flat faces.** Where a part is larger than the silhouette, the carve cuts a
  flat face along the view direction. The blur rounds the edges, but the face stays flat.
- **The sheet is not one model.** The back view disagrees with the front and the side. The back
  IoU stops near 0.78, and the ears and the violin arm need a choice of view.
- **The facets.** The decimate places the triangles by curvature, and their directions are
  random. The sheet has planes that follow the anatomy, such as the cheekbone and the top of the
  thigh. The spike adds no extra density at the joints.
- **QuadriFlow** refused the mesh, so the even remesh is my own relaxation.
- **Color from the sheet** (projection) put white and brown on the wrong parts. Rules worked,
  but each species needs its own rules.

## 10. Cost for 20 species

The tools exist now. For a species with a model sheet, the work is:

| Step | Agent time |
|---|---|
| Matte: polygons for the instrument and the bow, check the chair hue | 20 to 30 min |
| Parts list from landmarks, gate iterations (this fox: 5 blockout runs and about 25 full runs) | 1 to 2 h |
| Color rules and eyes | 20 to 40 min |
| Rig: bone places, part mask table, poses | 20 min (shared inside a family) |
| Report images and checks | 10 min (automatic) |

That is about 2 to 3.5 agent-hours for each species, or 40 to 70 hours for 20 species. Families
share most of a parts list: the dog family (fox, dog, wolf), the bear family (bear, polar bear,
panda), the cats, and the rabbits.

Only 4 species have a sheet: fox, rabbit, dog, and polar bear. The other 16 need a reference
first. The gate needs at least two orthographic views at a known scale. The scenes
(`orchestra-latest.png`, `orchestra-side.png`, `lowpoly-animals.png`) give one perspective view
of each species. That is enough for the colors and the character, and too little for the gate.
The practical way is a new model sheet for each species, made in the same way and with the same
chair, camera, and pose as the 4 sheets. Expect the same conflicts between views: plan one view as the master for
each part.

The app also needs work before it can use these models: a loader for the skinned mesh or the
packed format, and a new pose layer for the new skeleton. That is a separate stage.

## 11. Can this route reach "identical to the references"?

Not on its own. The route reaches the outline: IoU 0.92 and 0.90 in the front and side
views, and proportions within 3.6% of the fox height. It does not reach the inner form and the
facet design of the sheet, because the gate cannot see them and primitives cannot make them.
More parts and more color rules can close part of the gap, at about 1 to 2 hours more for each
species. A sculpted mesh (by a person, or by route A) with this gate, this rig mask, and this
palette pass on top would likely give a closer result than either part alone.

## 12. How to repeat

```bash
tools/spike/fox-gated/run_all.sh /tmp/fox-work          # about 30 s
uv run --no-project --with pillow --with numpy \
    python tools/spike/fox-gated/publish.py /tmp/fox-work docs/reference/fox-views.png \
    docs/research/2026-10-08-fox-spike-gated
```

`run_all.sh` needs Blender 5.2 (variable `BLENDER`, default `/opt/homebrew/bin/blender`) and
`uv`. The full images are [`fox-views-render.png`](2026-10-08-fox-spike-gated/fox-views-render.png)
(the fox alone, transparent, 2494 x 1354 px),
[`fox-views-chair.jpg`](2026-10-08-fox-spike-gated/fox-views-chair.jpg) (with a simple chair),
[`fox-views-silhouette.png`](2026-10-08-fox-spike-gated/fox-views-silhouette.png) (the
silhouette for a judge), and [`overlay.jpg`](2026-10-08-fox-spike-gated/overlay.jpg) (the sheet
with the render at 50%).
