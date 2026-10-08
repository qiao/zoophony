# The route B fox: facets, thighs, and head

Date: 2026-10-08. Branch: `fox-b-model`, from `spike-fox-gated` at `b2b9966`. This work changes
no file in `src/`. It continues the route B spike of
[`2026-10-08-fox-spike-gated.md`](2026-10-08-fox-spike-gated.md), which stays as the record of
its date.

## 1. Summary

The task: make the route B fox as close to `docs/reference/fox-views.png` as possible, in this
order: the facet quality, the thighs, the head width, then the rest. The rig and the GLB format
stay the same, because the agent of branch `fox-b-app` puts this fox into the app.

| Measure | Spike fox (before) | This fox (after) | Target |
|---|---|---|---|
| IoU front | 0.926 (0.924 on the old matte) | **0.945** | 0.92 or more |
| IoU side | 0.909 (0.906 on the old matte) | **0.936** | 0.92 or more |
| IoU back | 0.781 (0.778 on the old matte) | 0.774 | none (ceiling near 0.80) |
| Proportions, 12 measures | mean 1.2%, largest 3.0% | **mean 0.9%, largest 1.9%** | mean within 2% |
| Triangles | 2,000 + 72 eye triangles | 2,262 + 72 eye triangles | 2,000 to 3,000 |
| Area ratio p90 / p10 | 3.09 | **2.81** | 3 or less |
| Face region: faces for each plane | 1.41 (111 planes of 156 faces) | **3.57** (46 planes of 164 faces) | more is better |
| Thigh region: faces for each plane | 1.48 (227 planes of 337 faces) | **3.74** (100 planes of 374 faces) | more is better |
| Edges flat, soft, crease | 10.6%, 35.9%, 53.5% | 40.9%, 22.2%, 36.9% | few soft edges |
| Palette | 8 colors | 8 colors | 8 colors |
| `fox.glb` | 67,308 B, 36,629 B after gzip | 72,984 B, 42,530 B after gzip | |
| Packed estimate (`pack_estimate.py`) | 29,064 B, 19,462 B after gzip | 32,300 B, 23,378 B after gzip | about 25 kB |

"Before" is the final fox of the spike, measured with the fixed matte and the fixed proportion
measure of section 4. The old numbers of the spike report are in brackets.

The fox for the app is [`2026-10-08-fox-b-model/fox.glb`](2026-10-08-fox-b-model/fox.glb)
(SHA-256 `4a63e655b489c282ff10067d43a94864dcba901d710d6a8c215f5da85d5a1581`). The bones,
the bone hierarchy, and the joint places did not change: `rig.py` has no change against the
spike branch.

![The sheet, the spike fox, and this fox](2026-10-08-fox-b-model/before-after.jpg)

## 2. The new low-poly pass

The spike made the low-poly fox with a collapse decimate and a relaxation. The triangles had
random directions, and the light of the faces looked like noise. The new pass has three steps.
All of them are in pure bmesh, and the pass takes about 10 s.

```text
forms mesh (84,000 quads, from build_fox.py)
   |
   v
collapse decimate to 3 x the target count
   |
   v
isotropic remesh (facets.py)        split long edges, collapse short edges, flip to
   |  10 iterations                 valence 6, relax in the tangent plane, back onto
   |                                the forms. Edge length from DENSITY and JOINTS.
   v
contour fit, 3 passes (lowpoly.py)  outline vertices of the front and side views move
   |                                to the border of the sheet fox
   v
planar pass (facets.py)             k-means on the face normals in each body region,
   |  about 5 faces for each plane   then a snap of the vertices to the planes
   |  (8 on the body)                (strength 0.75), relax and flip inside the planes
   v
contour fit, 1 pass                 the planes cut thin tips again
   |
   v
colors by part rules, eyes, rig, GLB (as in the spike)
```

### 2.1 Isotropic remesh

`isotropic_remesh` follows Botsch and Kobbelt (2004). It needs no manifold check, so it works on
the forms mesh that QuadriFlow refuses. A size grid of 2 cm gives the target edge length at each
point: the length of the nearest part in `DENSITY` (0.85 for the ears and the muzzle, 1.0 for
the cranium, 1.02 for the chest and the thighs), times 0.9 near each joint of `JOINTS`. One short
run measures the triangle count, and the edge length then changes by the square root of the
error. The remesh alone gives an area ratio of 1.93.

### 2.2 Planar pass

`planar_facets` is a variational shape approximation (Cohen-Steiner, Alliez, and Desbrun, 2004).
The faces grow into planes from seed faces, nearest normal first, and a plane stays inside one
region (head, body, each arm, each thigh, each shin, each ear, tail). Then each vertex moves
toward the point nearest to the planes of its faces. A vertex inside one plane moves onto it, a
vertex on the border of two planes moves onto their crease, and a vertex at a corner moves to the
corner. The strength of 0.75 keeps a small turn between the faces of a plane, so each triangle
still catches its own light, as on the sheet. A relax inside the planes and edge flips inside the
planes follow. Their effect alone was not measured.

### 2.3 Contour fit

Flat faces cut inside the curves of the forms, and the planes cut off thin tips. Without a fix,
the low-poly fox loses about 0.02 of IoU. `fit_contour` finds the vertices on the outline of the
front and the side view: a camera ray just outside the vertex hits no face. Such a vertex moves in
the image plane by the distance from its pixel to the border of the sheet fox (at most 15 mm for
each pass), and its neighbors move half as far. The tail and the vertices near the chair, the
violin, and the bow stay. For a thin tip whose normal faces the camera (an ear tip), the outward
direction is from the middle of its neighbors to the vertex.

### 2.4 Steps and measures

The first rows use the forms of the spike and the old matte. The last rows use the final forms
and the fixed matte.

| Step | Front | Side | Area ratio | Faces for each plane (face, thigh) | Edges flat, soft, crease (%) |
|---|---|---|---|---|---|
| Spike: decimate and 3 relax passes | 0.924 | 0.906 | 3.09 | 1.41, 1.48 | 10.6, 35.9, 53.5 |
| Isotropic remesh only (2,254 triangles) | | | 1.93 | 1.64, 1.85 | 15.2, 37.8, 47.0 |
| Remesh and planes (5 faces, strength 0.75) | 0.914 | 0.901 | 3.06 | 3.22, 3.86 | 42.7, 20.4, 36.9 |
| Same, with the contour fit after the planes | 0.939 | 0.928 | 3.01 | 2.16, 3.31 | 32.9, 28.2, 38.9 |
| Same, with the contour fit before and after | 0.938 | 0.938 | 2.82 | 2.74, 4.16 | 38.5, 23.4, 38.1 |
| Final pipeline and parts | **0.945** | **0.936** | **2.81** | **3.57, 3.74** | 40.9, 22.2, 36.9 |

The area ratio moves by about 0.2 between near-equal meshes. For example, a 5 mm move of the feet
changed it from 3.0 to 3.26. The size table of the final pass gives a margin.

![Heads: the sheet, the spike fox, and this fox](2026-10-08-fox-b-model/heads-before-after.jpg)

## 3. The forms

Each change is a value in `fox_parts.py` or a color rule in `lowpoly.py`.

| Part | Change | Reason on the sheet |
|---|---|---|
| Thighs | Radius 130 to 100 mm at the hip, oval section (1.45 lower than wide), hip ends at x = ±0.125 m and 25 mm lower than in the spike | Thighs about 190 mm thick with flat tops. The white belly shows between them down to about z = 0.38 m |
| Pelvis | Smaller and lower | Its top showed above the thighs in the front view |
| Shins | Radius 75 to 55 mm at the knee, 55 to 42 mm at the ankle | Shins about 84 mm wide. The fat shins and the blur joined the two feet |
| Feet | Flat ellipsoids, soles at 38 mm, toes about 430 mm in front of the seat middle | The feet rest in front of the chair |
| Socks | Brown only below z = 0.30 m (`SOCK_TOP`) | Orange knees, dark brown socks |
| Bow forearm and paw | Radius 10 mm smaller (46 to 40 mm), paw 5 mm smaller | The forearm is in front of the chest, so the carve does not trim it |
| Upper arms | 7 to 10 mm thinner | Slim arms |
| Muzzle | A new part kind, the wedge: a rounded box that narrows to the nose, 25 mm longer | A snout with a flat top and flat sides |
| Cheeks and left tuft | Cheek part centered and 20 mm narrower, left tuft the mirror of the right one | The tuft grew behind the bow and showed as a white spike |
| Ears | Flat axis turned 20 degrees toward the violin, white only inside 0.6 of the ear radius (`EAR_RIM`) | The head turns to the violin, and the side view shows the back of the near ear. An orange rim surrounds the white inner ear |
| Eyes | Iris and pupil 6 to 8 mm toward the violin, pupil 2 mm wider | The iris fills most of the eye and looks to the violin |
| Nose | Black within 40 mm of the front end of the mesh muzzle (`NOSE_RADIUS`) | The carve cuts the muzzle part short, and the old rule found no face |
| Bib | White 120 mm on each side, down to the belly | The bib runs from the chin to the crotch |
| Body planes | 8 faces for each plane (`PLANE_SCALE`) | A few large planes on the chest |

![Legs: the sheet, the spike fox, and this fox](2026-10-08-fox-b-model/legs-before-after.jpg)

## 4. The head width was a matte error

The spike measured the head 45 mm too narrow at the cheeks (-3.6% in the front view, -3.3% in
the back view). The matte caused this. The white bow hair beside each bow line stayed in the
matte as fox slivers of 1 to 5 px, and the width measure took the widest row, from the head to
the sliver. Two fixes:

- `sheet_matte.py` draws the bow lines 8 px wider, and fox lines of 1 or 2 px at the edge of an
  ignored region become ignored. The sheet head is then 0.402 m wide in the front view and
  0.430 m in the back view, in place of 0.469 m and 0.465 m.
- `proportions.py` skips the model pixels on ignored pixels, as `gate.py` does. Before this fix, a
  cheek that grew behind the bow counted as too wide.

With both fixes, the spike fox measures +0.2% (front) and -1.2% (back), and this fox +1.3% and
-0.8%. The new matte is
[`2026-10-08-fox-b-model/fox-matte.png`](2026-10-08-fox-b-model/fox-matte.png). The matte of
the spike folder did not change.

## 5. The rig test

The skeleton, the weights method, the part mask, and the GLB export are those of the spike.
Bone heat skins all 1,217 vertices, with at most 4 bones for each vertex. The rows show the right
arm raised, the head turned 30 degrees, and the bow arm moved. All three deform cleanly. The
raised arm does not pull the chest.

![The three test poses](2026-10-08-fox-b-model/rig-poses.jpg)

## 6. What worked and what did not

Worked:

- The isotropic remesh: even triangles (area ratio 1.93 alone) with no QuadriFlow.
- The planar pass: 2.5 times more faces for each plane, and the share of soft edges went from
  35.9% to 22.2%.
- The contour fit before and after the planes: it recovers the IoU that flat faces lose, and the
  side view passes 0.92 for the first time.
- The matte fix: it found that the head width gap was a measure error.
- Parts from the sheet measures: thin shins, parted thighs, flat feet, and the wedge snout.

Did not work:

- **A uniform offset of the vertices** in place of the contour fit. With 4 mm, the IoU went to
  0.909 (front) and 0.904 (side). With 7 mm, 0.898 and 0.900. The losses are local (tips,
  cheeks, paws), and an offset grows the parts that are already too large.
- **Larger planes everywhere** (7 faces for each plane): the area ratio went to 3.43.
- **A full snap** (strength 1.0): area ratio 3.43, and the faces of a plane merge into one
  polygon.
- **Rounded box thighs**: the flat tops looked right in the side view, but in the front view the
  two thighs merged into one block, and the belly V disappeared. Reverted.
- **A milder snap** (strength 0.7 or 0.65) to lower the area ratio: 0.17 at most. The size
  table had the larger effect.

## 7. What remains different from the sheet

- **The face.** The sheet face has a crease from the eye to the cheek tuft and wide white cheek
  planes that face forward. This face is flatter, and its white lower faces point down, so they
  look gray in shade. The eyes are 8-sided discs. The sheet eyes are large almonds with a flick at
  the outer corner of the lid.
- **The thighs** still read rounder from the front, and the belly V ends near row 770 in place of
  row 850.
- **The torso** is wider at the shoulders than the slim torso of the sheet.
- **The color borders** follow faces of about 45 mm, so the white mask has a jagged edge.
- **The back view** stays near 0.77. The back view of the sheet shows another tail and hides the
  lower legs (spike report, section 5.1).
- **The blockout gate** of the final parts is 0.816 (front) and 0.802 (side). The parts are
  smaller than the silhouette on purpose, and the grow and the carve of the forms fill it.
- **The render light** of these images is the light of the spike. The sheet has a stronger fill
  light, so its white fur stays bright in shade. This is a render difference. The app has its
  own light.
- **The size** went up by 4 kB after gzip in the packed estimate (more triangles and more color
  borders), to 23,378 B, still inside the budget of about 25 kB.

## 8. General steps and fox-only steps

General steps (they apply to each species with a model sheet):

| Step | File |
|---|---|
| The sheet camera, the gate, and the proportion measure | `sheet_camera.py`, `gate.py`, `proportions.py` |
| The matte method: chair hue, instrument polygons, bow lines that cover the hair, thin lines at ignored edges | `sheet_matte.py` |
| The two distance fields of the matte | `matte_field.py` |
| The forms: smooth union, grow, silhouette carve, blur, OpenVDB | `build_fox.py` |
| The isotropic remesh and the planar pass | `facets.py` |
| The contour fit, the size grid from a part table, the eye discs | `lowpoly.py` (functions) |
| The facet measure | `facet_metrics.py` (the region names come from the parts) |
| Bone heat, part mask, 4 bones, GLB export | `rig.py` (functions) |
| Renders, compare images, publish, packed estimate | `render_views.py`, `compose.py`, `publish.py`, `pack_estimate.py` |

Fox-only steps (each species needs its own values):

| Step | Where |
|---|---|
| The parts, the carve views, the grow, the joins | `fox_parts.py` |
| The polygons of the violin and the bow lines | `sheet_matte.py` |
| The size table, the joints, the plane scale | `lowpoly.py`: `DENSITY`, `JOINTS`, `PLANE_SCALE` |
| The palette and the color rules (socks, ear rim, nose, bib, mask) | `lowpoly.py`: `ROLES`, `rule_roles`, `SOCK_TOP`, `EAR_RIM`, `NOSE_RADIUS` |
| The eye places and layers | `lowpoly.py`: `EYES`, `EYE_LAYERS` |
| The bones, the part mask table, the test poses | `rig.py`: `BONES`, `allowed_bones`, `POSES` (shared inside a family) |
| The 12 measure boxes | `proportions.py`: `MEASURES` |

For the next species, measure the parts on the sheet with row runs of the matte (as section 3
did for the shins and the feet), and check each interior form against the sheet in close-ups.
The gate sees only outlines, and the thighs, the belly V, and the bow forearm were all inside the
outline.

## 9. How to repeat

```bash
tools/spike/fox-gated/run_all.sh /tmp/fox-work          # about 40 s
uv run --no-project --with pillow --with numpy \
    python tools/spike/fox-gated/publish.py /tmp/fox-work docs/reference/fox-views.png \
    docs/research/2026-10-08-fox-b-model [<spike-work-dir>]
```

`run_all.sh` writes the matte into this folder and prints the gates, the facet measures, and
the proportions. The fourth argument of `publish.py` is the work folder of a run of the spike
branch, for the compare images.

## 10. Files

All images are in [`2026-10-08-fox-b-model/`](2026-10-08-fox-b-model/), each at most 300 kB.

| File | Content |
|---|---|
| `fox.glb` | The skinned fox for the app: 1 mesh, 23 bones, 8 palette materials |
| `fox-matte.png` | The fixed matte of the sheet |
| `before-after.jpg` | The sheet, the spike fox, and this fox in the three views |
| `heads-before-after.jpg`, `legs-before-after.jpg` | Close-ups of the same three |
| `fox-views-render.png` | This fox alone, 2494 x 1354 px, transparent |
| `fox-views-chair.jpg` | This fox on a simple chair |
| `fox-views-silhouette.png` | The silhouette for a judge |
| `overlay.jpg`, `side-by-side.jpg`, `heads.jpg` | The sheet with this fox at 50%, the sheet above this fox, the heads |
| `blockout-diff.png`, `forms-diff.png`, `lowpoly-diff.png` | The gates of the three phases |
| `blockout-clay.jpg`, `forms-clay.jpg` | Clay renders of the blockout and the forms |
| `rig-poses.jpg` | The three test poses |
