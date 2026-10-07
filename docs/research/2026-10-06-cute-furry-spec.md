# Spec: cute proportions and a fur look for option B

Date: 2026-10-06. Code: commit `ed13d84` (`main`). Plan: `2026-10-06-skinned-bodies-plan.md`.

On 2026-10-06, the user sent a close front shot of two rabbits with violins and wrote: "the
animal models look bad, including but not limited to: 1. the arms are drooping 2. strangely
looking knees and necks 3. not furry 4. not cute". Point 1 belongs to another agent. Option B
covers point 2. This spec answers points 3 and 4, so that the trunk and limb stages of option B
build the cute forms directly.

This report is a spec. It gives measured targets, a fur look with measured frame costs, the
changes to the stages of option B, and the decisions for the user. It changes no code. The
prototypes are outside the repository (section 6).

## 1. Summary

- **The heads are not too small.** The head is 0.31 of the height of a seated rabbit (0.33 for
  the standing bear). The reference images give 0.21 to 0.31. A larger head is not the main
  fault.
- **The faults are below the head and in the face.** The upper torso is 0.6 to 0.65 of the head
  width (references: 0.93 to 1.7). Thus the head stands on a visible neck above narrow, sloping
  shoulders. The eyes are small (0.10 of the head width, references 0.15), they sit above the
  middle of the face (references: on or below it), and they have one small light.
- **The fur sheen of design 4.5 does nothing on `main`.** three.js defines `USE_SKINNING` only
  in the vertex shader, so the `#ifdef USE_SKINNING` block of `SHEEN_GLSL` never compiles into
  the fragment shader (section 3.1).
- **Recommended fur look:** the fixed sheen, a procedural fur shader with one fetch of a small
  3D noise texture, a soft wrap light, and a few blunt tufts at the outline of the species that
  have ruffs. Measured cost on the development Mac: about +0.3 ms of GPU time for 60 players
  (0.0 to 0.6 ms, inside the noise of a loaded machine). Shells (plush fur) cost +0.2 to +3.5 ms
  and stay a decision (D3).
- **Option B changes:** S2 also fixes the sheen. New stages C1 (cute face), FS (fur shader), and
  T (tufts). A1, A3, B1, and B2 build the new forms with new default values. About 8.5 hours
  more, from 34 to about 42.5 hours.

```text
  user faults            cause (measured)                       stage that fixes it
  ---------------------  -------------------------------------  --------------------------
  "strange necks"   ---> torso 0.4 H wide just under the chin   A1 (torso), A2 (head drop)
  "strange knees"   ---> icosahedron knee on two capped tubes   B1 (leg sweep)
  "not furry"       ---> sheen is dead code, no fur detail      S2 (sheen), FS, T
  "not cute"        ---> small high eyes, narrow shoulders,     C1 (face), A1, A3 (plump),
                         thin arms, no cheeks                   B1, B2 (thickness)
```

## 2. Cute proportions

### 2.1 Method

A script crops a part of an image, scales it 4 to 10 times, and draws a pixel grid with the
coordinates of the source image (`measure/grid.py`, section 6). An agent reads the top of the
head (without the ears), the chin, the outline of the cheeks, the eyes, the shoulders, the belly,
and the floor. The same script measured the views page of `main` (`/views.html`), because it
copies the layout and the camera of `animals.webp`. The values of the models also come from the
code (`buildPlayer()` in Node).

The references disagree. `animals.webp` is a low-poly study. `scene.png` and `mockup.png` are
the polished images, and their animals are the cute ones. This spec takes its targets from the
polished images and keeps the facets of `animals.webp`.

### 2.2 Measured values

"Head" is the head without the ears. "Height" is from the floor to the top of the head. All
widths are seen from the front.

| Value | `animals.webp` | Polished images | `main` (views page and code) | Prototype "cute" |
|---|---|---|---|---|
| Head height / height, rabbit | 0.29 | 0.21 to 0.23 (`mockup.png`, `scene.png` 03) | 0.30 to 0.31 | 0.32 |
| Head height / height, fox, dog | | 0.22 (fox, 06), 0.26 (dog, 04) | 0.31 | 0.32 |
| Head height / height, panda, hippo, bear | 0.25 (bear) | 0.30 (panda, 07), 0.33 (hippo, 08), 0.25 (bear, `mockup.png`) | 0.33 (bear) | 0.33 |
| Head width / head height | 1.28 | 1.28 (panda), 1.34 (rabbit, 3/4 view) | 1.26 | 1.32 |
| Upper torso width / head width, rabbit | 0.93 (with the arms) | about 1.0 (`scene.png` 06, with the arms) | 0.65 | 0.95 |
| Upper torso width / head width, bear | 1.38 | 1.7 (`mockup.png`) | 0.60 | 1.08 |
| Belly width / head width, bear | 1.28 | 1.96 (`mockup.png`), 2.2 (05) | 0.92 | 1.24 |
| Visible neck | none | none | 0.1 to 0.15 H, 0.28 of the head width (user shot) | none |
| Eye width / head width | 0.05 (a slit) | 0.15 (rabbit), 0.10 (panda, inside a patch) | 0.10 | 0.14 |
| Eye center below the head top / head height | 0.60 | 0.51 (panda) to 0.57 (rabbit), 0.40 (fox) | 0.44 | 0.57 |
| Eye spacing / head width | 0.40 | 0.38 (panda) to 0.40 | 0.42 | 0.39 |
| Eye lights | none | one large light, upper side | one light of 0.04 H | 0.075 H and 0.032 H |
| Nose below the head top / head height | 0.89 | 0.68 (panda), 0.80 (rabbit) | 0.71 | 0.71 |

What the numbers show:

1. **Head size.** The heads of `main` are at the top of the range of the references. The polished
   rabbits and foxes have smaller heads (0.21 to 0.23) on slim bodies with long legs. Their
   cuteness comes from the face, the soft surface, and the round forms, and the bears and the
   pandas add plump bodies. Thus the spec keeps the head height of 1.0 H (decision D1 shows
   1.15 H).
2. **Shoulders and neck.** The torso of `main` narrows from 0.9 H at the shoulders to 0.4 H at
   1.2 H and to a point at 1.35 H. The head bottom is at 1.3 H. Thus a band of the neck tube
   shows under the chin, and the head looks like a ball on a stick. This is the largest fault.
3. **Eyes.** The eyes of `main` are small, high, and wide apart, with a small light. The polished
   eyes are large and glossy, on or below the middle line of the face.
4. **Bodies of the large group.** The polished bear is about 2 head widths wide at the belly.
   `main` makes it as wide as its head.

### 2.3 Hard constraints

**Arm length (measured, section 6).** A probe posed every player of the 6 demos, `perf-60.mid`,
the choir test file, and the 4 chamber test files every 0.05 s. It recorded the distance from
the posed shoulder joint to each wrist target before the reach clamp, in the H of the player.
The minimum arm (upper arm plus forearm) is the largest distance / 0.97 (`ARM_REACH`).

| Instrument (species) | Arm | Largest distance (H) | Minimum arm (H) |
|---|---|---|---|
| oboe (mouse) | R | 1.294 | **1.33** |
| clarinet (wolf) | R | 1.272 | **1.31** |
| violin (rabbit, fox) | R | 1.315 (p99 1.193) | 1.36 (p99 1.23) |
| viola (cat) | R | 1.298 (p99 1.191) | 1.34 (p99 1.23) |
| cello (dog) | R | 1.345 (p99 1.283) | 1.39 (p99 1.32) |
| contrabass (hippo) | L / R | 1.232 / 1.315 | 1.27 / 1.36 |
| piano (polar bear) | R | 1.460 (p99 1.353), 2.0% clamped | 1.51 (p99 1.40) |
| harp (deer), flute (fox), trumpet (monkey), trombone (panda) | | 1.243, 1.203, 1.237, 1.307 | 1.28, 1.24, 1.28, 1.35 |
| timpani (elephant), cymbals (badger), baton (bear) | | 1.241, 1.247, 1.230 | 1.28, 1.29, 1.27 |
| tuba, horn, bassoon, drums, choir folder | | 0.57 to 1.02 | 0.59 to 1.06 |

- The fixed grips of the oboe and the clarinet set the hard minimum: 1.33 H. The arm of `main` is
  1.35 H (0.70 + 0.65). At 0.95 of the arm, the right arm of the oboe and of the clarinet misses
  its grip in 100% of the samples.
- The bows, the fingerboards, and the trombone slide adapt to a shorter arm with no failure:
  they play a shorter part of the hair or of the slide (`bowRangeOf()`, `stopRangeOf()`,
  `slideReach`). The look of the play then gets worse with no test failure.
- A shoulder 0.1 H lower and 0.05 H further out does not lower the minimum. The worst values
  become 1.30 H (flute left, oboe right) and 1.34 H (trumpet right).
- **Rule:** the arm keeps its bone lengths (0.70 H and 0.65 H). Short and chubby arms come from
  thickness, a round shoulder, and a larger mitten.

**Seat height.** The shin is the seat height plus 0.2 H (1.12 H on the chair of 0.35 m), because
the feet rest on the floor (design 4.5). Short legs need lower chairs, and the cello, the piano
bench, and the stands then change. The spec keeps the chair and makes the legs thicker.

**Occlusion (design 4.2).** The prototype ran `scene/hidden-heads.test.ts` and
`models/layout-scene.test.ts` with each preset:

| Preset | Worst head of a smaller animal behind a large one (limit 10%) | First desk test | Stage sides |
|---|---|---|---|
| `main` | 0% | passes | Boulanger 11.29 m, K. 315 8.98 m |
| cute (head 1.0 H, drop 0.06 H, large torso ×1.25) | 0% | K. 315 "one per part": the standing flute fox hides 12% of the first violin (limit 10%) | 11.32 m, 9.01 m |
| chibi (head 1.15 H, drop 0.1 H) | 6.5% (hippo hides a penguin, Beethoven 9) | fails: 11% of the whole player, 6% of the playing parts (limits 10% and 5%) | 11.49 m, 9.18 m, reference composition 8.18 m (8.12), choir 12.16 m (limit 12.1) |

The cute preset keeps the hidden-heads rule. Its head top is 0.06 H lower, and the plump large
animals sit in the back row. The first-desk failure needs a move of the K. 315 soloist of a few
centimeters in the layout (stage A3).

**Triangles.** The prototype adds about 170 triangles to a body (smooth knee balls, the second
eye light, the fuller rings). The elephant with the timpani reaches 2,648 of 2,600. The leg
sweeps of B1 remove the knee balls, and stage F pays for the rest (section 4).

**Footprints.** A torso factor of 1.25 for the large group moves the stage sides by +0.03 m in
the demos. `footprint.test.ts` has one pin at 1.5 m that falls to 1.499 m. The steps of plan 3.2
apply.

### 2.4 Targets

The targets apply to all species. "Small" is a size below 1.05 (rabbit, foxes, wolf, cat, mouse,
beaver, monkey, badger, meerkat, penguin). "Medium" is 1.05 to 1.15 (dog, pig, deer, polar
bear). "Large" is 1.2 or more (bear, panda, hippo, rhino, elephant). Values in H.

| Part | `main` | Target | Group values and notes |
|---|---|---|---|
| Head height | 1.0 | 1.0 | D1 offers 1.15. |
| Head top above the seat | 2.30 | 2.24 | The head drops 0.06 H, so the chin sinks into the chest fur. |
| Head width at the cheeks | 1.26, widest 0.04 above the center | 1.32, widest 0.12 below the center | Full low cheeks, round crown. Rings in 2.5. The deer cheek keeps 0.026 m from the harp neck: check in A2. |
| Torso factor (`plump`) | 1.0 | small 1.0, medium 1.1, large 1.25 | It scales the width and the depth of the torso. The shoulder joints move out by 0.7 of the extra width, the hips by 0.5. |
| Torso half width at the shoulders (0.98 H) | 0.45 | 0.53 × plump | Head width / shoulder width: 1.40 becomes 1.25 (small), 1.14 (medium), 1.0 (large). |
| Torso rings above the shoulders | 0.41, 0.34, 0.20 at 1.09, 1.20, 1.29 | 0.50, 0.45, 0.32, top at 1.37 | No visible neck: the chest fills the space under the chin. |
| Belly bulge | 1.08 | 1.16 | Bear belly / head width: 0.92 becomes 1.24. |
| Neck ring (plan 2.5 `neck`) | 0.30 | 0.36 (penguin 0.40, deer 0.30) | The ring is inside the chest and the jaw. |
| Arm radii (shoulder, elbow, wrist) | 0.17, 0.14, 0.12 | 0.20, 0.17, 0.15 | Lengths stay 0.70 + 0.65 (minimum 1.33, 2.3). |
| Mitten | 0.26 × 0.18 × 0.20 | × 1.2 | The palm points of `BodyBones` stay. |
| Leg radii (hip, knee, knee, ankle) | 0.32, 0.27, 0.22, 0.17 | 0.34, 0.30, 0.24, 0.20 | The shin length stays (2.3). No knee ball (B1). |
| Foot | 0.72 long, 0.25 high | 0.65 long, 0.28 high | The heel stays, so the toes move back 0.07 H, away from the stands. |
| Eye size | 0.13 × 0.18 | 0.18 × 0.21 | A rounder oval. |
| Eye place | direction (0.25, 0.06, -0.45): 0.44 below the top, spacing 0.42 of the width | direction (0.22, -0.06, -0.45): 0.57 below the top, spacing 0.39 | The fox and the wolf can keep 0.06 up (references: 0.40). |
| Eye lights | one, 0.04, 0.035 above the middle | a main light of 0.075 at the upper outer side, a small light of 0.032 at the lower inner side | Both on the eye bone, so a blink closes them. |
| Short muzzle | two cheek balls 0.26 × 0.22 | × 1.15 on width and height | The muzzle pad reads as one soft form. |
| Cheeks (plan 2.5 `cheeks`) | 0 | 0.03, from the rings | |
| Blush | none | none | D4 shows two pink ovals of 0.17 × 0.10. |

```text
   main (front)                         target (front)

        /\    /\                             /\    /\
       /  \  /  \                           /  \  /  \
     .-''''''''''-.                       .-''''''''''-.
    /   o      o   \  <- eyes 0.44       /              \
   |       ..       |     below top     |    (O)    (O)  |  <- eyes 0.57 below top,
    \     (..)     /                     \      (..)    /       0.18 x 0.21 H
     '-.________.-'                       '-.  ______ .-'   <- cheeks widest 0.12 H
          |  |      <- neck 0.1 H        __/          \__      below the center
       ___|  |___      visible          /                \  <- chest fills the space
      /          \  <- shoulders       |                  |     under the chin
     |    0.9 H   |     0.9 H          |      1.06 H      |
     |            |                    |   (x 1.25 large) |
      \  belly    /                     \   belly 1.16   /
       '--1.28---'                       '----1.28 x p--'
```

### 2.5 Data for the stages

The form values extend `BodyForm` of plan 2.5. The defaults change to the targets, so a species
with no value gets the cute body.

```typescript
/** The forms of the welded body of a species (design 4.3, 4.5). All values are in H. */
export interface BodyForm {
  /** The half width of the neck ring between the torso top and the jaw. Default 0.36. */
  readonly neck?: number;
  /** The half width of the torso at the shoulder joints, before the girth. Default 0.53. */
  readonly shoulders?: number;
  /** The forward bulge of the belly, as a factor of the half width. Default 1.16. */
  readonly belly?: number;
  /** The forward move of the ring above the eyes. Default 0, at most 0.08. */
  readonly brow?: number;
  /** The extra half width of the cheek ring. Default 0.03. */
  readonly cheeks?: number;
  /**
   * The factor of the torso width and depth. Default 1 (small), 1.1 (medium), 1.25 (large).
   * The shoulder joints move out by 0.7 of the extra width, and the hips by 0.5.
   */
  readonly plump?: number;
  /** The places of the fur tufts of section 3.4. Default: none. */
  readonly tufts?: readonly TuftPlace[];
}

/** A place of blunt fur tufts on the outline (section 3.4). */
export type TuftPlace = 'cheek-ruff' | 'chest-ruff' | 'crown';

/** The eyes of all species (design 4.5). Values in H. */
export interface EyeLook {
  /** Width and height of the oval: 0.18 and 0.21. */
  readonly size: readonly [number, number];
  /** Direction of the right eye from the head center: (0.22, -0.06, -0.45). */
  readonly direction: Vec3;
  /** Diameters of the main light and the small light: 0.075 and 0.032. */
  readonly lights: readonly [number, number];
}
```

The head rings of the target (the prototype values, `cute.ts`). Each row is the height, the half
width, the front depth, the back depth, the move of the middle on z, and the turn:

```typescript
const CUTE_HEAD_RINGS: readonly LoftRing[] = [
  { y: -0.5, halfWidth: 0, front: 0, back: 0, z: -0.08 },
  { y: -0.46, halfWidth: 0.3, front: 0.42, back: 0.26, z: -0.05 },
  { y: -0.37, halfWidth: 0.5, front: 0.58, back: 0.38, turn: 0.5 },
  { y: -0.25, halfWidth: 0.62, front: 0.63, back: 0.46 },
  { y: -0.12, halfWidth: 0.66, front: 0.61, back: 0.5, turn: 0.5 },
  { y: 0.02, halfWidth: 0.645, front: 0.57, back: 0.53 },
  { y: 0.16, halfWidth: 0.6, front: 0.52, back: 0.53, turn: 0.5 },
  { y: 0.28, halfWidth: 0.54, front: 0.45, back: 0.49, z: 0.01 },
  { y: 0.38, halfWidth: 0.45, front: 0.36, back: 0.41, z: 0.02, turn: 0.5 },
  { y: 0.46, halfWidth: 0.3, front: 0.24, back: 0.29, z: 0.03 },
  { y: 0.5, halfWidth: 0, front: 0, back: 0, z: 0.03 },
];
```

The envelope rule of plan 2.6 changes in three values: the head top is 2.24 H above the seat, the
head is 1.32 H wide, and the torso is at most 1.28 H × girth × plump wide. The bones and the
points of `BodyBones` do not move, except the bones of the head, the jaw, the ears, and the eyes
(they drop 0.06 H with the head, and the eyes take the place of 2.4).
The mouth and the head center drop with them, so the holds follow.

## 3. Fur look

### 3.1 The sheen of `main` is dead code

`createMaterials()` (`scene/geometry.ts`) puts the sheen into the fragment shader inside
`#ifdef USE_SKINNING`. three.js 0.186 writes `#define USE_SKINNING` only into the prefix of the
vertex shader (`WebGLProgram.js`, line 579). The fragment prefix has no such line. Thus no pixel
gets the sheen. Proof: in the prototype, the fur shader of 3.2 first sat in the same `#ifdef`, and
its frame was equal to the frame with no fur shader, pixel for pixel. With a varying `vFurSkin`
(1 in the vertex shader of a skinned mesh, else 0), 181,877 pixels of the close shot changed by
more than 5 of 255 levels, and
the outlines got the soft edge of design 4.5. The frame cost of the fix was 0 within the noise.

### 3.2 Candidates

All candidates ran on the cute bodies of section 2, in a close shot like the user screenshot (two
rabbits with violins, 1000 × 1000 px, with the post effects), and on the bear.

| Id | Candidate | Prototype |
|---|---|---|
| s | The fixed sheen of 3.1 only. | `sheen=1` |
| a | Fur shader: a strand noise in the bind-pose position of each pixel, fine across the hairs and long along them (hairs point down the body, and back on top of the head). The noise tilts the normal by its screen derivatives, darkens the grooves by up to 28%, and the diffuse light wraps 0.35 past the terminator. Two octaves of hash noise (16 hashes). | `fur=a` |
| a2 | As a, with one fetch of a 32 × 32 × 32 R8 noise texture (32 kB) in place of the hash noise. | `fur=a2` |
| b | Tufts in the geometry: flat pyramids of 6 triangles. Three on each cheek, three on the crown, five on the chest. About 70 triangles for each body. | `tufts=1` |
| c | Shells: N copies of the fur triangles, pushed out along the skinned normal by up to 14 mm, with an alpha test on a strand noise. The fur gets short near the eyes, so the eyes stay above it. On all players, or on the K players nearest to the camera. | `fur=cN`, `fur=cNnearK` |
| d | Fins: one quad on each edge of the fur triangles, along the normals. A fin shows only where the surface turns away from the view (the silhouette), with a jagged strand edge. | `fur=d` |

```text
  fragment of a fur pixel (candidate a2)

  bind position p, bind normal n (varyings)
        |
        v
  hair direction t = down the body, projected on the surface (back on the crown)
        |
        v
  q = p * 150/m, compressed along t (x 0.2)  ---> one fetch of the 32^3 noise ---> h
        |                                                                         |
        v                                                                         v
  fade = 1 - smoothstep(0.6, 1.6, |fwidth(q)|)      tilt normal by dFdx(h), dFdy(h)
  (no fur detail on far players)                     albedo x mix(0.72, 1.08, h)
                                                     wrap light 0.35, then the sheen
```

### 3.3 Measured frame cost

The test scene: 60 players of 15 species with their instruments and chairs, at 1440 × 900 and
the device scale 2, in headless Chromium with ANGLE on Metal on the development Mac. The time is
a GPU timer query around each frame (300 frames after 40 frames of warm-up). Two views: a wide
view of all players, and a close view of the front rows. No post effects, so that the noise of
the post passes stays out. Other agents used the machine: the load average was 13 to 64. The
values are the median of 3 to 5 runs, each against the base in the same session. The base was
3.0 to 3.6 ms (p10) and 5.3 to 5.5 ms (p50).

| Candidate | Wide view, p10 / p50 (ms) | Close view, p10 / p50 (ms) | Triangles in the scene | Look in the close shot |
|---|---|---|---|---|
| s (sheen fix) | +0.0 / +0.0 | +0.0 / +0.0 | 0 | Soft bright outlines, as `scene.png` |
| a (hash noise) | +0.35 / +1.0 | +0.5 / +1.3 | 0 | Fine fur texture in the light, felt from afar |
| a2 (texture noise) | +0.3 / +0.4 | 0 to +0.6 / +0.6 | 0 | Equal to a |
| b (tufts) | +0.0 to +0.2 | +0.0 to +0.2 | +4,200 | Spikes on the cheeks. On the bear crown and chest, they read as thorns. |
| c2, all players | +1.3 / +1.5 to +3.5 | +1.8 / +4.4 | 2 × the fur triangles in the vertex stage | |
| c3 with a2, all players | +2.3 / +2.2 | +2.5 (p50) | 3 × | Plush: a fuzzy outline and a soft surface |
| c4, all players | +3.5 / +3.4 | +3.2 / +3.0 | 4 × | Plush, strongest |
| c4, 8 nearest players | +0.2 / +0.2 | +1.7 / +1.0 | 4 × on 8 players | Plush on the subjects of a close shot |
| c3 with a2, 6 nearest players | +0.2 to +1.1 / up to +1.0 | 0 to +1.5 / +0.3 to +0.5 | 3 × on 6 players | Plush on the subjects |
| d (fins) | +1.8 / +3.3 | +0.9 / +1.1 | about 3 × | Fuzzy outline, with dark specks and lines where a fin crosses the face |

- The noise of a loaded machine is about ±0.5 ms on p50. Only the shells and the fins are clearly
  above it.
- Design 9.7 gives 4 ms of GPU time for 95% of the frames. The last Cinematic measure was
  3.77 ms (2026-10-06). Thus the margin is about 0.2 ms. The shells on all players and the fins
  break the target on the development Mac. The shells on the nearest players break it in a close
  shot, where the fur fills the frame.
- An integrated GPU of the Iris Xe class is about 4 times slower (design 9.7). The pixel count of
  a laptop at device scale 1 is about 0.4 of the test. Thus a2 costs about 0.5 ms there, and c3
  on 6 players 0.3 to 2.5 ms.

### 3.4 Recommendation

Take **s + a2 + selective b**. Defer c to decision D3. Reject d.

```text
                    +--------------------------------------------+
  every tier  ----> | s: sheen fix (varying vFurSkin)            |  0 ms
                    +--------------------------------------------+
  high, medium ---> | a2: fur shader, one 3D texture fetch,      |  about +0.3 ms
                    |     fades out on far players               |
                    +--------------------------------------------+
  geometry    ----> | b: blunt tufts, only on the species with   |  about 40 triangles
                    |    ruffs: fox, wolf, cat cheeks and chest  |  for each of those bodies
                    +--------------------------------------------+
  decision D3 ----> | c: 3 shells on the 6 nearest players,      |  +0.5 to +1.5 ms
                    |    high tier, close shots only             |
                    +--------------------------------------------+
```

Values of the fur shader (a2):

```typescript
/** The fur look of the player material (design 4.5). */
export interface FurLook {
  /** Noise cells for each meter across the hairs: 150. */
  readonly frequency: number;
  /** Frequency along the hairs, as a part of the frequency across: 0.2. */
  readonly stretch: number;
  /** Tilt of the normal for one unit of noise change in a pixel: 2.0. */
  readonly bump: number;
  /** Darkening of the grooves: 0.28. The tips get 0.3 of this as extra light. */
  readonly shade: number;
  /** Wrap of the diffuse light past the terminator: 0.35. */
  readonly wrap: number;
  /** The fur detail fades out between these screen sizes of a noise cell, in pixels. */
  readonly fade: readonly [number, number];
}
```

Rules for the fur:

- The fur goes only on the `fur` finish of plan 2.8. The eyes (`lacquer`), the noses, the inner
  ears, the teeth, the horn, the beak, and the hooves keep `matte` with no fur. The prototype put
  fur on the inner ears and the result looked like a towel.
- The hair direction comes from the bind normal. A future `hairDirection` attribute can comb the
  fur away from the face. The prototype does not need it.
- The tufts of b are blunt: the base is at least 0.6 of the length wide, at most 0.16 H long, and
  in the fur or the belly color. Sharp thin spikes read as thorns on the bear. Only these species
  get tufts: the foxes and the wolf (cheek ruff and chest ruff, as the white ruffs of
  `animals.webp`), the cat and the rabbit (cheek ruff). The tufts are rigid parts on `head` and
  `chest`.
- The shells of D3, if the user wants them: 3 shells, 14 mm of fur, the high tier only, the 6
  players nearest to the camera, and only in the close shots of the Cinematic mode. The eyes
  stay 0.04 H above the shells, so that the fur does not cover them. The frame target needs a
  measure with them, and design 9.7 needs a new margin or another cut.

## 4. Changes to the stages of option B

The plan of the stages stays. These rows change or join it. The costs are agent time without the
review rounds, as in plan section 4.

| Stage | Change | Files | Done when | Extra cost |
|---|---|---|---|---|
| **S2. Fur finish** | Also the sheen fix of 3.1: a varying `vFurSkin` in place of `#ifdef USE_SKINNING` in the fragment shader. A test reads the compiled fragment source of a skinned mesh and finds the sheen code outside any `#ifdef USE_SKINNING`. The `fur` finish goes on the body parts, except the parts in the rule list of 3.4. | `scene/geometry.ts`, `models/mesh.ts`, the body files, design 4.5 | The close shot of the gallery shows the soft edge. The finish table has 5 rows. | +0.5 h |
| **C1. Cute face (new)** | The head rings of 2.5, the eye look of 2.5 (size, place, two lights), the short muzzle × 1.15, the head drop of 0.06 H. Before A2, on the head of today, so the user sees the face early. | `models/head.ts`, `models/biped.ts` (eyes), `models/snouts.ts`, design 4.5 | The eye place and spacing of 2.4 within 0.01. The hidden-heads test passes. The deer cheek keeps 0.026 m from the harp neck. | 2 h |
| **FS. Fur shader (new)** | Candidate a2 with `FurLook`, on the high and the medium tier. The 3D noise texture is made in code (no file). | `scene/geometry.ts`, `scene/quality.ts`, design 4.5, 9.7 | A test of the shader source. A frame measure of `perf-60.mid` in both camera modes: the GPU p95 grows by at most 0.4 ms. | 2 h |
| **A1. Trunk grid** | The torso rings of 2.4 directly: shoulder fill, top at 1.37 H, belly 1.16, and the `plump` factor. The chair clearance moves with the plump back. | as planned | The torso box equals the new envelope of 2.5 (not `main`). The stage sides are measured again (plan 3.2). | +0.5 h |
| **A2. Neck and head** | The cute rings of C1 join the grid. The neck ring default is 0.36. | as planned | No neck shows in the conductor shot and the section shot. | 0 |
| **A3. Species forms** | The new defaults and `plump` of 2.5. The table of plan 2.5 changes its necks: no species below 0.30 (deer, meerkat 0.30, penguin 0.40). The K. 315 soloist moves until it hides less than 10% of the first violin. | as planned, `models/layout-scene.ts` | The review agent compares each group with section 2.2. The first-desk test passes. | +1 h |
| **T. Tufts (new)** | `TuftPlace` and the blunt tufts of 3.4 on the fox, the wolf, the cat, and the rabbit. After A2, because the tufts sit on the head surface. | `models/tufts.ts` (new, trunk agent), `models/species.ts` | Each tuft is rigid, closed, and inside the budget. | 1.5 h |
| **B1. Sweeps and legs** | The leg radii of 2.4, a smooth knee in the sweep, the foot of 0.65 × 0.28 H with the heel in place. | as planned | The toes stay at least 0.05 m from the stand legs (footprint test). | 0 |
| **B2. Arm chain** | The arm radii of 2.4, the mitten × 1.2. The bone lengths stay. | as planned | The palms and the finger blocks equal `main`. The probe of 2.3 gives the same minimum arm. | 0 |
| **F. Facets** | The budget also pays for the eye light (about 36 triangles) and the tufts (about 40 on 4 species). | as planned | The scene of `perf-60.mid` stays at most 168,500 triangles. | +0.5 h |
| **G. Close** | The frame measure includes FS. Design 4.5 gets the new body table and the fur. | as planned | The target of 9.7 passes with FS. | +0.5 h |

In all, about 8.5 hours more: from about 34 to about 42.5 hours. Track A stays the longest path
and gets 5 hours of it. With two tracks in parallel, about 28.5 hours pass from S0 to G (22
before).

```text
  S0 skin data --> S1 split --> S2 fur finish + sheen fix --+--> C1 cute face --> Track A: A1 A2 A3 T --+
        |                                                   |                                         |
        +--> S shoulder spike (scratch) --------------------+--> FS fur shader                        +--> W --> F --> G
                                                            |                                         |
                                                            +--> Track B: B1 B2 B3 -------------------+
```

- C1 and FS change no file of track B, so they run beside track B.
- C1 belongs to the trunk agent. FS belongs to the agent of S2, because it touches the material.
- The parallel split of plan section 4 stays. `tufts.ts` belongs to the trunk agent.

## 5. Decisions for the user

**D1. Head size.** Image: `2026-10-06-cute-furry/cute-head-size.png` (left two panels, and the
right panel for the bear).

- Recommendation: keep the head at 1.0 H. It is already at the top of the references (0.31 of the
  height, references 0.21 to 0.31). It keeps the occlusion rule with a margin (0%) and the stage
  sides within 0.03 m.
- The other choice: 1.15 H, a toy look. The worst hidden head becomes 6.5% (limit 10%), the stage
  of Boulanger grows by 0.2 m, and the choir test file passes its stage limit of 12.1 m (12.16 m).

**D2. Plump large animals.** Image: `2026-10-06-cute-furry/cute-before-after.png` (the two right
panels).

- Recommendation: torso × 1.25 for the large group and × 1.1 for the medium group, as the bear of
  `mockup.png` and `scene.png` 05. The stage sides grow by about 0.03 m.
- The other choice: keep the slim bear of `animals.webp` (torso × 1.0). Design 4.5 chose it on
  2026-10-05 against that image.

**D3. Fur level.** Image: `2026-10-06-cute-furry/cute-fur-level.png`.

- Recommendation: the fur shader with the sheen fix and the tufts of the ruff species (+0.3 ms).
  It keeps the frame target of 9.7.
- The other choice: also 3 shells on the 6 nearest players in the close shots of the high tier.
  The animals look plush, as soft toys. It costs +0.5 to +1.5 ms of GPU time on the development
  Mac, which breaks the target of 4 ms in Cinematic mode, unless the user raises the target or
  another effect gets cheaper.

**D4. Blush.** Image: `2026-10-06-cute-furry/cute-head-size.png` (third panel).

- Recommendation: no blush. At the size of a head in the default view (about 40 px), the ovals
  do not read, and the references show none.
- The other choice: two pink ovals of 0.17 × 0.10 H below the eyes of the rabbit, the mouse, and
  the pig.

## 6. How to repeat the numbers

The scratch folder of this session holds the prototypes. They are not in the repository. A copy
of the repository (`art/repo`, with `node_modules` linked to the worktree) holds these changes:

- `src/models/cute.ts`: the presets `main`, `cute`, `chibi`, `blush`, `eyesonly`, and `bodyonly`,
  read from `?cute=` on a page and from `CUTE` in Node. `TUFTS=1` or `?tufts=1` adds the tufts of
  `src/models/tufts.ts`. The script `art/patch_cute.py` patches `head.ts`, `snouts.ts`, and
  `biped.ts` of a fresh copy.
- `src/proto/fur.ts`: the candidates of 3.2, read from `?fur=`. `?sheen=1` turns on the fixed
  sheen. `art/patch_fur.py` patches `scene/geometry.ts`, `scene/player.ts`, and
  `scene/stage-scene.ts`.
- `close.html` and `src/proto/close.ts`: the close shot (`subject=rabbits`, `bear`, or `panda`)
  and the test scene of 60 players (`subject=grid`, `view=wide` or `close`, `measure=1`,
  `nopost=1`).
- `shoot.ts`: serves the copy with Vite, opens each page of a job list in headless Chromium with
  ANGLE on Metal, writes the screenshots, prints the `RESULT` lines, and stops the server and the
  browser.

```bash
ART=<scratch>/art
cd $ART/repo
node tools/patch-demos.ts
python3 ../jobs_grid_measure.py 3 && node shoot.ts ../jobs-grid-measure.json ../shots/measure
python3 ../jobs.py ../jobs-fur.json 1000 'r-a=subject=rabbits&cute=cute&fur=a' && node shoot.ts ../jobs-fur.json ../shots/fur
CUTE=cute npx vitest run --project unit src/scene/hidden-heads.test.ts src/models/layout-scene.test.ts
python3 ../measure/grid.py <image> <x0> <y0> <x1> <y1> <scale> <step> <out.png>
```

- **Arm probe.** `art/reach/probe.ts` on its own copy (`art/reach/repo`). `ik.ts` and
  `pose-at.ts` record each wrist target and the play weight. `REACH_FREE=1` turns off the reach
  limits, `SH_DROP` and `SH_OUT` move the shoulder, and `ARM_SCALE` scales the arm. The tables
  are `art/reach/table-*.md`.
- **Comparison sheets.** `art/shots/sheet-r-fur.png` and `art/shots/sheet-b-fur.png` show all
  candidates side by side. `art/shots/views-main.png`, `views-cute.png`, and `views-chibi.png`
  are the views page with each preset.
