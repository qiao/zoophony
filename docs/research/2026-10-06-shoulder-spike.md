# Shoulder spike (stage S): result

Date: 2026-10-06. Code: commit `ed13d84` (`main`). Plan: `docs/research/2026-10-06-skinned-bodies-plan.md`.

## Verdict

The planned welded shoulder fails. Use the fallback D2 for the shoulder.

- The weld (a port loop of 8 vertices, an arm tube of 8 sides, a 2-bone blend, and a filler
  ball) makes a dark pocket under the arm and a crumpled back of the shoulder, with a downward
  jag. This occurs at shoulder swings of more than about 110 degrees. The contrabass, the
  conductor, and the cello reach these swings often.
- No narrow fix removes the fault. A wider shoulder-line fall-off, a wider or narrower shoulder
  band, a smaller filler, a second filler, a larger port, and helper bones with half of the
  joint turn all keep the pocket and the jag.
- D2 with a **rigid** dome holds in every worst pose: no hole, no fold, no loss of volume, and
  the dome sinks at least 0.083 H into the torso in all 160,490 arm samples of the demos.
- The literal D2 text of the plan ("only the cap rings blend from shoulder to upperArm") fails:
  the blended dome keeps only 0.37 of its radius at 138 degrees. Keep the dome rigid on
  `upperArm`.
- The elbow plan works. The elbow band of 0.06 H with the elbow filler keeps at least 0.80 of the
  elbow radius on the outer side of the bend at 156 degrees. The plan test asks for 0.6.

## Cause

In the bind pose the arm hangs, and the joint is only 0.07 H outside the torso side. Thus the
port loop faces sideways (normal +x), and the arm tube must bend 90 degrees around the joint to
hang down. A forward raise of the arm turns the arm around that same x axis. For the cap of
the tube, this turn is a twist around its own axis (a candy-wrapper twist). The IK gives no
twist around the bone axes (0.0 degrees in all samples), but the twist around the port axis
reaches 118 degrees (conductor) and 90 degrees (trumpet).

```text
   bind pose (front view, right arm)        forward raise of 120 degrees

   torso |  port loop (fixed, chest)        torso |  port loop (fixed)
         |==o  <- cap rings (blend)               |==o  <- cap twists 60 degrees
         |  ( J )  joint 0.07 H out               |  (J)    around the port axis
         |  |   |                                 |   \___________  arm
         |  | arm                                 |    pocket and jag under
         |  |   |                                 |    and behind the joint
```

A sideways raise is a bend for the cap. The cap then folds into a pocket under the arm, because
the port bottom is only 0.155 H below the joint.

## Method

All files are in this folder. Nothing in the repository changed.

| File | Work |
|---|---|
| `probe-poses.ts` | Runs `poseAt()` on the 6 patched demos (`patchedDemos()`, `sceneOf()`) every 0.05 s, with `poseSkeleton()`. Finds the largest shoulder swing, clavicle turn, and elbow bend of each family. Writes `worst-poses.json`. |
| `proto.ts` | The prototype: the torso ring grid (16 corners, the profile of `biped.ts`, three port rings of turn 0), a port of 8 vertices on each side (a 3 x 3 vertex block minus its center), the arm sweep of 8 sides (port loop, 2 cap rings, equator, upper arm, 3 elbow rings, forearm, cuff), 2-bone weights by the chain distance (smoothstep bands of plan 2.3), filler balls (`ball` of 8 x 4), helper bones, and the D2 dome. Linear blend skinning with the real bone frames. |
| `evaluate.ts` | Applies 17 worst poses to 20 variants and to the rigid parts of today. Writes `results.json` and the render data. |
| `render.ts`, `page.html` | Headless Chromium (ANGLE on Metal) with three.js r186 `SkinnedMesh`, so the GPU path of the app does the skinning. Crease normals from `shadeMesh()` of the repository. The browser closes at the end. |
| `sweep.ts`, `sink.ts` | All poses of the demos every 0.25 s and 0.5 s: angle statistics, ring ratios, and the D2 dome depth. |

Metrics (H is the head height of the species):

- **Holes**: exposed triangles whose posed normal points against their bone-turned bind normal.
  A triangle is exposed when a point 0.004 H outside it is outside every closed part
  (generalized winding number). Hidden flips are given in brackets.
- **Shoulder ring, elbow ring**: the smallest posed width over the bind width of the blended
  rings. This is the thickness ratio of the skin alone.
- **Outer**: the distance from the joint to the outer surface of the skin and the fillers,
  along the outer bisector of the joint, over the bind radius (0.17 H or 0.14 H). The value in
  brackets is the skin alone. The plan test asks for 0.6 at the elbow.
- **Visible crossing**: the length of the lines where two skin triangles cross and a point next
  to the line is outside all parts, in H, within 0.45 H of the shoulder joint.
- **Filler crossing**: the same for the lines where a filler ball crosses the skin.
- **Edge stretch**: the smallest and largest posed edge length over the bind length near the
  shoulder.

## Worst poses of the demos

The real demos turn the joints more than the gallery probe of the plan (118 degrees swing and 146
degrees elbow).

| Case | Player, demo, time | Swing | Port twist | Clavicle | Elbow |
|---|---|---|---|---|---|
| violin-shoulderSwing | cat viola R, beethoven-8.mid at 67.95 s | 88° | 88° | 30° | 68° |
| violin-clavicle | cat viola R, beethoven-8.mid at 2.75 s | 84° | 84° | 30° | 75° |
| violin-elbow | rabbit violin L, boulanger-matin.mid at 160.5 s | 47° | 43° | 0° | 123° |
| cello-shoulderSwing | dog cello L, bach-bwv1048.mid at 315.6 s | 112° | 8° | 0° | 96° |
| cello-clavicle | dog cello R, bach-bwv1048.mid at 270.3 s | 57° | 47° | 40° | 71° |
| cello-elbow | dog cello R, bach-bwv1048.mid at 216.3 s | 71° | 32° | 40° | 152° |
| cello-combo | dog cello R, boulanger-matin.mid at 117.45 s | 100° | 27° | 40° | 105° |
| contrabass-shoulderSwing | hippo contrabass L, boulanger-matin.mid at 114.4 s | 138° | 63° | 0° | 50° |
| contrabass-elbow | hippo contrabass R, bach-bwv1048.mid at 159.3 s | 33° | 6° | 30° | 156° |
| timpani-shoulderSwing | elephant timpani L, beethoven-9.mid at 68.65 s | 64° | 52° | 0° | 54° |
| timpani-elbow | elephant timpani R, beethoven-9.mid at 124.5 s | 43° | 23° | 0° | 132° |
| brass-shoulderSwing | monkey trumpet R, beethoven-9.mid at 22.3 s | 92° | 90° | 0° | 47° |
| brass-clavicle | panda trombone R, beethoven-9.mid at 26.35 s | 73° | 58° | 45° | 55° |
| brass-elbow | pig horn R, boulanger-matin.mid at 25.55 s | 33° | 12° | 0° | 106° |
| brass-combo | panda trombone R, boulanger-matin.mid at 258.4 s | 82° | 70° | 45° | 29° |
| conductor-shoulderSwing | bear baton L, mozart-k525.mid at 0 s | 122° | 118° | 0° | 69° |
| conductor-elbow | bear baton R, bach-bwv1048.mid at 38.7 s | 84° | 26° | 0° | 147° |

- "Swing" is the turn of the arm axis against the `shoulder` bone. "Port twist" is the part of
  that turn around the port normal (x).
- The timpani has no clavicle turn. The largest clavicle turn of the brass is the trombone (45
  degrees). The wrist twist reaches 180 degrees in all string families, so the hands must stay
  rigid, as the plan says.
- Twist around the upper arm axis and the forearm axis: 0.0 degrees in every sample. The IK
  gives no candy-wrapper twist at the bone axes.

Share of the play time (both arms, every 0.25 s, from `sweep.json`):

| Family | Swing over 110° | Port twist over 90° | Shoulder ring of the plan under 0.6 |
|---|---|---|---|
| contrabass | 46.0 % | 0 % | 46.3 % |
| conductor | 3.8 % | 5.2 % | 0.6 % (under 0.7: 28.3 %) |
| cello | 3.2 % | 0 % | 0 % (under 0.7: 49.6 %) |
| violin family, brass, timpani | 0 % | 0 to 9 % | 0 % |

The left arm of the contrabass holds the neck high for most of each piece. Thus the fault of
the weld shows for about half of the play time of the hippo.

## Numbers of each variant

Worst value of each metric over the 17 poses (`node summarize.ts`):

| Variant | Holes (all flips) | Min shoulder ring | Min elbow ring | Min shoulder outer (skin) | Min elbow outer (skin) | Max visible crossing, H | Max filler crossing, H | Stretch | Bind: filler crossing, H |
|---|---|---|---|---|---|---|---|---|---|
| today (rigid parts) | 0 (0) | n/a | n/a | 0.95 | 0.00 (notch) | 2.80 | 0 | 1.00 | 0 |
| plan | 1 (103) | 0.39 | 0.26 | 0.89 (0.37) | 0.87 (0.19) | 2.03 | 3.52 | 0.23 to 3.14 | 1.81 |
| falloff-30 | 1 (76) | 0.39 | 0.26 | 0.89 (0.37) | 0.87 (0.19) | 2.32 | 3.52 | 0.10 to 1.96 | 1.81 |
| cap-12 | 0 (92) | 0.39 | 0.26 | 0.89 (0.34) | 0.87 (0.19) | 2.00 | 3.45 | 0.20 to 3.16 | 2.07 |
| cap-04 | 4 (159) | 0.39 | 0.26 | 0.89 (0.42) | 0.87 (0.19) | 2.27 | 2.97 | 0.23 to 3.14 | 1.94 |
| fill-small (0.92) | 1 (103) | 0.39 | 0.26 | 0.81 (0.37) | 0.82 (0.19) | 2.11 | 2.10 | 0.21 to 3.14 | 0 |
| extra-fill (second ball) | 1 (103) | 0.39 | 0.26 | 0.89 (0.37) | 0.87 (0.19) | 1.89 | 3.41 | 0.23 to 3.14 | 2.16 |
| w2 (all narrow fixes) | 0 (65) | 0.39 | 0.26 | 0.80 (0.34) | 0.80 (0.19) | 2.38 | 2.55 | 0.10 to 1.82 | 0 |
| port-wide | 1 (46) | 0.39 | 0.26 | 0.80 (0.34) | 0.80 (0.19) | 2.16 | 2.10 | 0.07 to 1.79 | 0 |
| helpers-wide | 1 (186) | 0.85 | 1.00 | 0.80 (0.65) | 0.92 (0.92) | 2.36 | 1.33 | 0.10 to 1.97 | 0 |
| **d2-rigid-dome** | **0 (22)** | **1.00** | 0.26 | **0.93 (0.93)** | 0.87 (0.19) | 2.07 | 1.31 | **0.92 to 1.07** | 0.24 |
| d2-blend-dome (literal D2) | 0 (49) | 0.39 | 0.26 | 0.37 (0.37) | 0.87 (0.19) | 2.05 | 1.31 | 0.28 to 2.05 | 0.24 |

Variant parameters (all have 2 bones at most for each vertex):

| Variant | Shoulder-line fall-off | Shoulder band | Elbow band | Shoulder filler | Elbow filler | Other |
|---|---|---|---|---|---|---|
| plan | 0.15 H | ±0.08 H | ±0.06 H | 1.0 x 0.17 H | 1.0 x 0.14 H | 2 cap rings |
| falloff-30, cap-12, cap-04 | 0.30 H, or band ±0.12 H, or ±0.04 H | | | | | others as plan |
| w2 | 0.30 H | ±0.12 H | ±0.06 H | 0.9 | 0.9 | 2 cap rings |
| port-wide | as w2 | | | | | port rings 0.98 ± 0.20 H in place of ± 0.155 H |
| helpers-wide | 0.30 H | ±0.16 H | ±0.06 H | 0.9 | 0.9 | the band middles follow 4 new bones with half of the joint turn |
| d2-rigid-dome | no port | dome, equator ring rigid on `upperArm` | ±0.06 H | none | 0.9 | |

Notes:

- The edge stretch of 3.14 in the plan comes from the clavicle turn of 45 degrees. It moves the
  port 0.21 H forward, and the fall-off of 0.15 H is shorter than one ring step (0.155 H). A
  fall-off of 0.30 H brings it to 1.96.
- A filler of radius 1.0 shows through the skin also in the bind pose (1.81 H of crossing
  lines), because the faces of an 8-sided ring lie 0.924 of the radius from the axis. A factor
  of 0.9 hides it.
- With the weld, the filler crossing lines (up to 2.55 H) replace the arm and torso crossing
  lines that the weld removes. The total line length is not smaller than with D2.
- Helper bones keep the ring thickness (0.85 at the shoulder, 1.00 at the elbow). They do not
  remove the pocket and the jag, because those come from the twist around the port axis.

Per-pose tables of the plan, w2, helpers-wide, and D2: `tables.md`. All values: `results.json`.

## Pictures

Each PNG has 4 views (front, outer side, back, top) of one pose. The top row is shaded. The
bottom row shows the wires and the fillers in red. The file name is `<case>--<variant>.png`.

- `png/` at 3.4 H from the joint, `png-close/` at 1.9 H (the elbow cases look at the elbow).
- The shoulder fault, weld variants against D2:
  - `sheets-close/contrabass-shoulderSwing--shaded--w2-port-wide-helpers-wide-d2-rigid-dome.png`
  - `sheets-close/conductor-shoulderSwing--shaded--w2-port-wide-helpers-wide-d2-rigid-dome.png`
  - `sheets-close/contrabass-shoulderSwing--shaded--plan-w2-helpers-d2-rigid-dome.png`
  - `sheets-close/conductor-shoulderSwing--shaded--plan-w2-helpers-w1-helpers-d2-rigid-dome.png`
  - `png-close/conductor-shoulderSwing--w2.png` (wires and fillers of the crumpled shoulder)
  - `png-close/contrabass-shoulderSwing--plan.png`
- Moderate poses (all look acceptable with both methods, but w2 has a dark slit in
  `cello-clavicle`): `sheets-close/moderate-cases--w2.png`,
  `sheets-close/moderate-cases--d2-rigid-dome.png`.
- The elbow, without and with the filler:
  - `sheets-close/contrabass-elbow--shaded--plan-nofill-plan-w2-helpers-d2-rigid-dome.png`
  - `sheets-close/cello-elbow--shaded--plan-nofill-plan-d2-rigid-dome.png`
  - `sheets-close/conductor-elbow--shaded--plan-nofill-plan-w2-helpers-d2-rigid-dome.png`
- The visible hole of the plan (a thin black slit at the back of the shoulder):
  `png-hole/contrabass-elbow--plan.png` (views aimed at the shoulder).
- The bind pose of the weld and of D2: `png-close/bind-bear--w2.png`,
  `png-close/bind-bear--d2-rigid-dome.png`.

## Parameters for stage W

Stage W does not weld the shoulder. It keeps the hybrid shoulder of D2, with the arm chain of
B2. Use these values:

```typescript
/** The arm of decision D2 and stage B2. Lengths are in H, radii are multiplied by the girth. */
export const ARM_SKIN = {
  /** The sweep has 8 sides. Each ring turns by half a side against its neighbors. */
  sides: 8,
  /**
   * The dome around the shoulder joint: a top point, rings at 30 and 60 degrees, and the
   * equator ring, radius 0.17. All dome vertices and the equator follow `upperArm` with the
   * weight 1. No shoulder band, no shoulder filler, no port, no shoulder-line blend.
   */
  dome: { radius: 0.17, ringAngles: [30, 60], bone: 'upperArm' },
  /** The elbow band: smoothstep(-0.06, 0.06, d - upperArm), on 3 rings at -0.06, 0, +0.06. */
  elbowBand: 0.06,
  /** The elbow filler: ball(8 segments, 4 rings) on `forearm`, centered on the elbow joint. */
  elbowFiller: { radius: 0.9 * 0.14, bone: 'forearm' },
  /** The cuff at the wrist follows `forearm` only. The hand and the fingers stay rigid. */
  wristBlend: false,
} as const;
```

- The torso keeps no port. Its rings follow `hips`, `spine`, and `chest` with the waist band
  (0.4 ± 0.15 H) and the chest band (0.75 ± 0.15 H) of plan 2.3.
- The arm-joint test of today stays: the dome sinks at least 0.05 H into the torso. Measured
  over the demos: at least 0.083 H (rabbit violin R, `bach-bwv1048.mid` at 81.5 s).
- Add the elbow test of plan 3.5: the outer distance is at least 0.6 of the elbow radius. The
  prototype gives at least 0.80 (w2 elbow) and 0.87 (D2) in the worst poses.
- An elbow filler of 0.9 shows nowhere in the bind pose (0 exposed triangles) and covers the
  collapse of the 50/50 ring (0.19 to 0.26 of the thickness at 147 to 156 degrees).
- If the user still wants a welded shoulder later, the next step is a change of the bind pose
  to arms out (an A pose), which the plan rejected because it touches all pose code. The narrow
  fixes of this spike are not enough.

## Limits of the spike

- The prototype torso uses the profile of `biped.ts` with three port rings of turn 0. It has no
  neck, head, or species forms (stage A3). The renders add the real head, legs, and hands of
  the model as rigid context, without the instrument.
- The renders use a key light, a rim light, and a fill light, with the fur sheen of
  `scene/geometry.ts`. They use no shadows and no baked occlusion.
- The worst poses come from one seed (1) and the default section size.

## Tables

| Case | Player, demo, time | Swing | Port twist | Clavicle | Elbow |
|---|---|---|---|---|---|
| violin-shoulderSwing | cat viola R, beethoven-8.mid at 67.95 s | 88° | 88° | 30° | 68° |
| violin-clavicle | cat viola R, beethoven-8.mid at 2.75 s | 84° | 84° | 30° | 75° |
| violin-elbow | rabbit violin L, boulanger-matin.mid at 160.5 s | 47° | 43° | 0° | 123° |
| cello-shoulderSwing | dog cello L, bach-bwv1048.mid at 315.6 s | 112° | 8° | 0° | 96° |
| cello-clavicle | dog cello R, bach-bwv1048.mid at 270.3 s | 57° | 47° | 40° | 71° |
| cello-elbow | dog cello R, bach-bwv1048.mid at 216.3 s | 71° | 32° | 40° | 152° |
| cello-combo | dog cello R, boulanger-matin.mid at 117.45 s | 100° | 27° | 40° | 105° |
| contrabass-shoulderSwing | hippo contrabass L, boulanger-matin.mid at 114.4 s | 138° | 63° | 0° | 50° |
| contrabass-elbow | hippo contrabass R, bach-bwv1048.mid at 159.3 s | 33° | 6° | 30° | 156° |
| timpani-shoulderSwing | elephant timpani L, beethoven-9.mid at 68.65 s | 64° | 52° | 0° | 54° |
| timpani-elbow | elephant timpani R, beethoven-9.mid at 124.5 s | 43° | 23° | 0° | 132° |
| brass-shoulderSwing | monkey trumpet R, beethoven-9.mid at 22.3 s | 92° | 90° | 0° | 47° |
| brass-clavicle | panda trombone R, beethoven-9.mid at 26.35 s | 73° | 58° | 45° | 55° |
| brass-elbow | pig horn R, boulanger-matin.mid at 25.55 s | 33° | 12° | 0° | 106° |
| brass-combo | panda trombone R, boulanger-matin.mid at 258.4 s | 82° | 70° | 45° | 29° |
| conductor-shoulderSwing | bear baton L, mozart-k525.mid at 0 s | 122° | 118° | 0° | 69° |
| conductor-elbow | bear baton R, bach-bwv1048.mid at 38.7 s | 84° | 26° | 0° | 147° |

Variant plan:

| Case | Holes (hidden flips) | Shoulder ring | Shoulder outer (skin only) | Elbow ring | Elbow outer (skin only) | Visible crossing near shoulder, H | Filler crossing, H | Edge stretch |
|---|---|---|---|---|---|---|---|---|
| violin-shoulderSwing | 0 (6) | 0.75 | 0.94 (0.82) | 0.83 | 0.89 (0.79) | 0.91 | 3.52 | 0.23 to 2.41 |
| violin-clavicle | 0 (7) | 0.77 | 0.96 (0.89) | 0.81 | 0.92 (0.74) | 0.96 | 3.10 | 0.31 to 2.41 |
| violin-elbow | 0 (3) | 0.92 | 0.93 (0.93) | 0.48 | 0.92 (0.47) | 0.99 | 2.94 | 0.60 to 1.81 |
| cello-shoulderSwing | 0 (10) | 0.63 | 0.89 (0.58) | 0.69 | 0.97 (0.62) | 0.09 | 2.30 | 0.52 to 1.53 |
| cello-clavicle | 0 (11) | 0.89 | 0.97 (0.97) | 0.83 | 0.92 (0.75) | 1.42 | 2.58 | 0.57 to 2.90 |
| cello-elbow | 0 (9) | 0.82 | 0.97 (0.97) | 0.26 | 0.93 (0.24) | 1.19 | 2.86 | 0.48 to 2.90 |
| cello-combo | 0 (14) | 0.66 | 0.97 (0.71) | 0.63 | 0.94 (0.58) | 0.40 | 2.38 | 0.23 to 2.90 |
| contrabass-shoulderSwing | 0 (5) | 0.39 | 0.89 (0.37) | 0.91 | 0.87 (0.87) | 0.43 | 2.41 | 0.42 to 1.76 |
| contrabass-elbow | 1 (1) | 0.96 | 0.98 (0.98) | 0.39 | 0.94 (0.19) | 2.03 | 1.87 | 0.23 to 2.41 |
| timpani-shoulderSwing | 0 (1) | 0.86 | 0.92 (0.78) | 0.90 | 0.91 (0.82) | 1.11 | 2.38 | 0.61 to 1.69 |
| timpani-elbow | 0 (1) | 0.93 | 0.95 (0.95) | 0.51 | 0.92 (0.38) | 0.84 | 2.08 | 0.62 to 1.48 |
| brass-shoulderSwing | 0 (3) | 0.71 | 0.95 (0.76) | 0.92 | 0.89 (0.89) | 1.13 | 3.30 | 0.59 to 1.62 |
| brass-clavicle | 0 (8) | 0.83 | 1.06 (1.06) | 0.89 | 0.88 (0.83) | 0.98 | 3.28 | 0.51 to 3.14 |
| brass-elbow | 0 (4) | 0.96 | 0.98 (0.98) | 0.65 | 0.95 (0.56) | 1.18 | 2.18 | 0.71 to 1.36 |
| brass-combo | 0 (9) | 0.77 | 1.04 (1.04) | 0.97 | 0.93 (0.93) | 0.84 | 3.15 | 0.46 to 3.14 |
| conductor-shoulderSwing | 0 (4) | 0.48 | 0.90 (0.64) | 0.83 | 0.89 (0.80) | 0.45 | 3.16 | 0.34 to 1.87 |
| conductor-elbow | 0 (6) | 0.75 | 1.10 (1.10) | 0.45 | 0.93 (0.26) | 0.71 | 2.76 | 0.46 to 1.77 |

Variant w2:

| Case | Holes (hidden flips) | Shoulder ring | Shoulder outer (skin only) | Elbow ring | Elbow outer (skin only) | Visible crossing near shoulder, H | Filler crossing, H | Edge stretch |
|---|---|---|---|---|---|---|---|---|
| violin-shoulderSwing | 0 (4) | 0.75 | 0.85 (0.79) | 0.83 | 0.80 (0.79) | 0.99 | 2.10 | 0.34 to 1.68 |
| violin-clavicle | 0 (5) | 0.77 | 0.87 (0.85) | 0.81 | 0.83 (0.74) | 1.05 | 1.97 | 0.34 to 1.66 |
| violin-elbow | 0 (4) | 0.92 | 0.92 (0.92) | 0.48 | 0.82 (0.47) | 0.92 | 0.79 | 0.62 to 1.45 |
| cello-shoulderSwing | 0 (11) | 0.63 | 0.80 (0.53) | 0.69 | 0.87 (0.62) | 0.00 | 2.16 | 0.45 to 1.76 |
| cello-clavicle | 0 (5) | 0.89 | 0.94 (0.94) | 0.83 | 0.83 (0.75) | 0.84 | 0.91 | 0.13 to 1.72 |
| cello-elbow | 0 (1) | 0.82 | 0.91 (0.91) | 0.26 | 0.83 (0.24) | 0.86 | 2.01 | 0.13 to 1.72 |
| cello-combo | 0 (6) | 0.66 | 0.88 (0.66) | 0.63 | 0.85 (0.58) | 0.01 | 2.17 | 0.13 to 1.73 |
| contrabass-shoulderSwing | 0 (5) | 0.39 | 0.80 (0.34) | 0.91 | 0.87 (0.87) | 0.29 | 1.45 | 0.36 to 1.71 |
| contrabass-elbow | 0 (0) | 0.96 | 0.96 (0.96) | 0.39 | 0.84 (0.19) | 2.38 | 0.76 | 0.34 to 1.51 |
| timpani-shoulderSwing | 0 (1) | 0.86 | 0.83 (0.80) | 0.90 | 0.82 (0.82) | 1.09 | 1.10 | 0.68 to 1.55 |
| timpani-elbow | 0 (1) | 0.93 | 0.94 (0.94) | 0.51 | 0.83 (0.38) | 0.87 | 0.75 | 0.67 to 1.39 |
| brass-shoulderSwing | 0 (1) | 0.71 | 0.85 (0.74) | 0.92 | 0.89 (0.89) | 1.19 | 1.53 | 0.58 to 1.70 |
| brass-clavicle | 0 (5) | 0.83 | 1.01 (1.01) | 0.89 | 0.83 (0.83) | 0.26 | 1.27 | 0.10 to 1.82 |
| brass-elbow | 0 (4) | 0.96 | 0.99 (0.99) | 0.65 | 0.85 (0.56) | 1.08 | 0.71 | 0.73 to 1.30 |
| brass-combo | 0 (5) | 0.77 | 1.05 (1.05) | 0.97 | 0.93 (0.93) | 0.44 | 1.31 | 0.11 to 1.82 |
| conductor-shoulderSwing | 0 (4) | 0.48 | 0.81 (0.64) | 0.83 | 0.80 (0.80) | 0.40 | 2.55 | 0.23 to 1.63 |
| conductor-elbow | 0 (3) | 0.75 | 1.10 (1.10) | 0.45 | 0.84 (0.26) | 0.68 | 2.17 | 0.54 to 1.66 |

Variant helpers-wide:

| Case | Holes (hidden flips) | Shoulder ring | Shoulder outer (skin only) | Elbow ring | Elbow outer (skin only) | Visible crossing near shoulder, H | Filler crossing, H | Edge stretch |
|---|---|---|---|---|---|---|---|---|
| violin-shoulderSwing | 0 (11) | 0.93 | 0.88 (0.88) | 1.00 | 0.96 (0.96) | 0.94 | 0.48 | 0.33 to 1.65 |
| violin-clavicle | 0 (11) | 0.94 | 0.91 (0.91) | 1.00 | 0.93 (0.93) | 0.90 | 0.20 | 0.32 to 1.62 |
| violin-elbow | 0 (15) | 0.98 | 0.94 (0.94) | 1.00 | 0.99 (0.99) | 1.00 | 0.94 | 0.66 to 1.37 |
| cello-shoulderSwing | 1 (15) | 0.90 | 0.80 (0.74) | 1.00 | 0.93 (0.93) | 0.10 | 0.98 | 0.44 to 1.80 |
| cello-clavicle | 0 (10) | 0.97 | 0.95 (0.95) | 1.00 | 0.93 (0.93) | 0.80 | 0.02 | 0.10 to 1.72 |
| cello-elbow | 0 (15) | 0.96 | 0.95 (0.95) | 1.00 | 0.97 (0.97) | 1.01 | 1.21 | 0.16 to 1.72 |
| cello-combo | 0 (16) | 0.92 | 0.88 (0.80) | 1.00 | 0.94 (0.94) | 0.20 | 1.10 | 0.15 to 1.74 |
| contrabass-shoulderSwing | 0 (9) | 0.85 | 0.80 (0.65) | 1.00 | 0.96 (0.96) | 0.09 | 1.16 | 0.44 to 1.97 |
| contrabass-elbow | 0 (10) | 0.99 | 0.98 (0.98) | 1.00 | 0.92 (0.92) | 2.36 | 1.19 | 0.34 to 1.52 |
| timpani-shoulderSwing | 0 (4) | 0.97 | 0.90 (0.90) | 1.00 | 0.93 (0.93) | 1.15 | 0.18 | 0.56 to 1.49 |
| timpani-elbow | 0 (10) | 0.99 | 0.96 (0.96) | 1.00 | 0.93 (0.93) | 0.91 | 1.09 | 0.69 to 1.33 |
| brass-shoulderSwing | 0 (4) | 0.93 | 0.86 (0.86) | 1.00 | 0.97 (0.97) | 1.02 | 0.55 | 0.43 to 1.69 |
| brass-clavicle | 0 (10) | 0.96 | 1.01 (1.01) | 1.00 | 0.94 (0.94) | 0.51 | 0.04 | 0.12 to 1.82 |
| brass-elbow | 0 (10) | 0.99 | 1.01 (1.01) | 1.00 | 0.93 (0.93) | 1.00 | 0.55 | 0.75 to 1.26 |
| brass-combo | 0 (6) | 0.94 | 1.04 (1.04) | 1.00 | 0.96 (0.96) | 0.56 | 0.12 | 0.12 to 1.82 |
| conductor-shoulderSwing | 0 (17) | 0.87 | 0.95 (0.95) | 1.00 | 0.97 (0.97) | 0.41 | 1.10 | 0.41 to 1.88 |
| conductor-elbow | 0 (12) | 0.94 | 1.12 (1.12) | 1.00 | 0.92 (0.92) | 0.74 | 1.33 | 0.50 to 1.64 |

Variant d2-rigid-dome:

| Case | Holes (hidden flips) | Shoulder ring | Shoulder outer (skin only) | Elbow ring | Elbow outer (skin only) | Visible crossing near shoulder, H | Filler crossing, H | Edge stretch |
|---|---|---|---|---|---|---|---|---|
| violin-shoulderSwing | 0 (2) | 1.00 | 0.96 (0.96) | 0.83 | 0.89 (0.79) | 1.33 | 1.22 | 0.99 to 1.01 |
| violin-clavicle | 0 (3) | 1.00 | 0.95 (0.95) | 0.81 | 0.92 (0.74) | 1.34 | 0.99 | 0.99 to 1.01 |
| violin-elbow | 0 (2) | 1.00 | 0.96 (0.96) | 0.48 | 0.92 (0.47) | 1.28 | 0.84 | 0.99 to 1.01 |
| cello-shoulderSwing | 0 (4) | 1.00 | 0.93 (0.93) | 0.69 | 0.97 (0.62) | 0.85 | 1.03 | 0.99 to 1.01 |
| cello-clavicle | 0 (3) | 1.00 | 0.94 (0.94) | 0.83 | 0.92 (0.75) | 1.21 | 0.95 | 1.00 to 1.01 |
| cello-elbow | 0 (0) | 1.00 | 0.93 (0.93) | 0.26 | 0.93 (0.24) | 1.67 | 0.85 | 1.00 to 1.01 |
| cello-combo | 0 (2) | 1.00 | 0.97 (0.97) | 0.63 | 0.94 (0.58) | 0.94 | 0.94 | 0.99 to 1.00 |
| contrabass-shoulderSwing | 0 (0) | 1.00 | 0.94 (0.94) | 0.91 | 0.87 (0.87) | 0.85 | 1.31 | 0.99 to 1.01 |
| contrabass-elbow | 0 (0) | 1.00 | 0.95 (0.95) | 0.39 | 0.94 (0.19) | 2.07 | 0.89 | 0.99 to 1.01 |
| timpani-shoulderSwing | 0 (0) | 1.00 | 0.99 (0.99) | 0.90 | 0.91 (0.82) | 1.20 | 0.73 | 1.00 to 1.01 |
| timpani-elbow | 0 (0) | 1.00 | 0.96 (0.96) | 0.51 | 0.92 (0.38) | 1.20 | 1.01 | 0.99 to 1.01 |
| brass-shoulderSwing | 0 (0) | 1.00 | 0.96 (0.96) | 0.92 | 0.89 (0.89) | 1.32 | 1.13 | 1.00 to 1.00 |
| brass-clavicle | 0 (0) | 1.00 | 0.95 (0.95) | 0.89 | 0.88 (0.83) | 1.12 | 1.26 | 1.00 to 1.02 |
| brass-elbow | 0 (4) | 1.00 | 0.98 (0.98) | 0.65 | 0.95 (0.56) | 1.16 | 1.05 | 0.99 to 1.01 |
| brass-combo | 0 (0) | 1.00 | 0.95 (0.95) | 0.97 | 0.93 (0.93) | 1.11 | 0.88 | 1.00 to 1.01 |
| conductor-shoulderSwing | 0 (2) | 1.00 | 0.95 (0.95) | 0.83 | 0.89 (0.80) | 0.93 | 1.24 | 0.92 to 1.07 |
| conductor-elbow | 0 (0) | 1.00 | 0.93 (0.93) | 0.45 | 0.93 (0.26) | 1.53 | 0.90 | 0.99 to 1.01 |

Variant today:

| Case | Holes (hidden flips) | Shoulder ring | Shoulder outer (skin only) | Elbow ring | Elbow outer (skin only) | Visible crossing near shoulder, H | Filler crossing, H | Edge stretch |
|---|---|---|---|---|---|---|---|---|
