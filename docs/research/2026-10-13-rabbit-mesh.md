# The rig of the rabbit mesh of the user (2026-10-13)

On 2026-10-13, the user gave the mesh `assets/models/rabbit/rabbit-4.glb` and said: "replace the
rabbit by using the model at @~/Downloads/rabbit-4.glb. Note that you need to rig it yourself."
The user then chose "Longer arms, 28 cm violin". This round makes the rig in the GLB format of a
studio body. No species uses it yet. The next round puts it into the app and refits the violin
holds. The decisions are in
[`2026-10-13-mesh-rabbit.md`](../decisions/2026-10-13-mesh-rabbit.md).

The folder [`2026-10-13-rabbit-mesh/`](2026-10-13-rabbit-mesh/) holds each probe and each log of
this report. All lengths in units (u) are in the units of the studio: 1 u from the soles to the
ear tips. All meters are at the scale of the app.

## The pipeline

`pnpm rig-mesh rabbit` reads `tools/mesh-rigs/rabbit.json` and runs
`tools/blender/rig_mesh.py`. The script writes the GLB file with its own code. Thus a second run
writes the same bytes (sha256 `b71278cfaf6f`, 909,948 bytes, in `rig-mesh.log`).

```text
 rabbit-4.glb (mesh, texture, no skeleton)
      | weld 1e-5, scale to 1 u, one color for each face from the texture
      v
 joints of the config --> bone heat --> weight rules --> 4 bones, steps of 1/255
      | arm factor 1.445 on the upper arm and the forearm (the weights blend it)
      v
 long-armed source == pose of the clip `reference`
      | seat turns and bind arms of the studio rabbit, relax of the faces that turn over
      v
 seated bind mesh + eye shells + gloss nose
      | d = A^-1 (source - b) - bind, split into the arm and the leg shapes
      v
 rabbit-4.rig.glb: fur, gloss, chair, 30 joints, 4 morph targets, clip `reference`
```

## The joints

`sections.py` cuts the mesh at each height, depth, and side (`sections-y.txt`, `sections-z.txt`,
`sections-x.txt`). `arm_axis.py` cuts the arm across its axis (`arm-axis.txt`).

| Part | Measure | Joint of the config |
|---|---|---|
| Feet and legs | Two loops below y 0.13, the middle at x ±0.08 | Thigh 0.19, knee 0.12, ankle 0.05, toes 0.02 |
| Body | One loop from y 0.13 to 0.53, the narrow neck at 0.53 (x ±0.077) | Hips 0.20 to chest 0.41, neck 0.505 |
| Head | From y 0.55, the muzzle to z 0.19 | Head 0.555 |
| Ears | Two loops from y 0.765, the middle of the cut at 0.77 at x ±0.0525 | Ear base 0.765 |
| Free arm | Apart from the body from x 0.106 out. The middle line goes from (0.106, 0.4385, 0.032) to (0.226, 0.30, 0.094) | Shoulder (0.075, 0.475, 0.016), 0.03 inside the root |
| Tail ball | Apart from the body behind z -0.145, the middle at (0, 0.197, -0.168) | Tail 0.20, z -0.125 |

The shoulder joint sets the scale of the app: 0.581 m / 0.475 u = 1.2232 m for each unit
(`inspect.txt`). The rabbit is 1.22 m from the soles to the ear tips. The studio rabbit is 1.198
m for each unit, with its shoulder joint at 0.485 u.

## The arms

| Measure | Value | Log |
|---|---|---|
| Reach of the source arm, shoulder joint to the middle of the palm | 0.2701 m | `rig-mesh.log` |
| Arm factor of the upper arm and the forearm | 1.445 | `tools/mesh-rigs/rabbit.json` |
| Reach of the rig | 0.3769 m (L and R), `--inspect`: 0.308 u, 0.377 m | `rig-mesh.log`, `inspect.txt` |
| Violin scale by the rule of a violin shop | 0.541 (a violin of 0.274 m) | `hold-reach.txt` |

The manager estimated a factor of about 1.25 from an orthographic render, with the shoulder
joint at about 0.525 u. The measured shoulder joint is at 0.475 u. A lower shoulder gives a larger
scale, and a shorter arm from the shoulder joint. A shoulder joint at 0.525 u would need a factor
of about 1.31.

The bind arms copy the directions of the arm bones of the studio rabbit in its bind pose
(`studio-targets.txt`). The legs take the inverse of the world turns of the studio rabbit from its
bind pose to its clip `reference`.

## The weights

Bone heat gives the first weights. Then the rules of the config:

- Beyond |x| = 0.106, only the free arm follows the arm bones. Bone heat gave up to 0.31 of the
  forearm weight to the side of the trunk. Inside the plane, the shoulder follows the upper arm.
- The thigh weight above y 0.11 to 0.16 goes to the hips. Thus the haunch stays on the seat, and
  only the short leg below it turns. In the seated bind, the knee stays under the haunch
  (`preview-knees.webp`).
- Above y 0.565, each vertex follows the head only: the eyes, the nose, and the whiskers. The ears
  follow their ear bones above y 0.745 to 0.78.
- The tail ball follows the tail only.

The seated bind turned 10 faces of the haunch over against the source. Two rounds of relaxing
cleaned them (`rig-mesh.log`). The corrective shapes give the source back from the cleaned mesh.

## The corrective shapes

The smallest determinant of the skin matrix `A` of the clip is 0.733 (`rig-mesh.log`). The script
gives the source back within 4e-16 u. The largest move is 0.013 u for an arm shape and 0.028 u for
a leg shape.

`standing-probe.ts` checks the path of the app: `studioRig(body, true)`, each arm at the turns of
the clip, and both arm shapes at the weight 1. The weight of the retarget is 1.0000 on each arm.
The largest distance of a posed vertex from the long-armed source is 0.235 mm, and the other way
also 0.235 mm (`standing-probe.txt`). The 43 vertices of the eye shells do not count. With the arm
shapes at the weight 0, the same probe gives 22.2 mm and 27.4 mm, so the probe finds a missing
shape.

```bash
pnpm rig-mesh rabbit --preview <dir>
node docs/research/2026-10-13-rabbit-mesh/standing-probe.ts <dir>/source-long-arms.obj
```

## The faces, the colors, and the eyes

| Measure | Value | Log |
|---|---|---|
| Triangles | 3,126: 3,065 of the source, 61 of the eye shells. The budget of a studio body is 3,100 | `rig-mesh.log` |
| Eye faces | 31 left, 30 right: a share of dark samples of 0.34 or more | `rig-mesh.log` |
| Nose faces | 15, gloss | `rig-mesh.log` |
| Module `src/models/studio/rabbit.ts` | 87,933 bytes, 53,969 after gzip (studio rabbit: 40,331 and 17,691) | `module-size.txt` |

Each face takes the mean color of 28 samples of the texture. The module is larger than the
module of the studio rabbit, because almost each face has a color of its own, and the palette of
the packed mesh holds each color.

## The seat

The shins hang down from the knees in the seated bind, and the heels reach back to z -0.022 u.
The first chair of the GLB file had its front edge at z 0, as the chair of the studio rabbit.
`pnpm studio-body` takes the lowest point of the body over the seat as the seat height, so the
heels put the seat of the app on the floor (0 m). The chair now goes from z -0.03 to -0.16 u, and
the script stops when a shin or a foot lies over it (`rig-mesh.log`).

| Measure | Rig | Studio rabbit | Log |
|---|---|---|---|
| Lowest point of the seated skin (the drop in the app) | 0.038 u, 0.047 m | 0.032 u, 0.039 m | `inspect.txt` |
| Seat top of the GLB chair, before the drop | 0.122 u | 0.294 u with the back | `rig-mesh.log` |
| Seat height in the app | 0.103 m | 0.126 m | `seat.txt` |
| Chair depth in the app | 0.195 m | 0.167 m | `seat.txt` |
| Head height `H` | 0.269 m | 0.224 m | `seat.txt` |

The thighs of the mesh are short and lie in the haunch, which follows the hips. Thus the seated
rabbit sits on its haunch, and the short legs and the feet come forward (`preview-knees.webp`).

## In the app, with the current holds

These checks ran with a temporary swap: the rabbit entry of `ANIMALS` named the rig GLB, and
`pnpm studio-body rabbit` wrote the module. The swap is not in a commit.

- `pnpm studio-body rabbit --inspect` (`inspect.txt`): 30 joints, no missing body bone, no
  unknown joint, the materials `fur` and `gloss`, the four morph targets, the clip `reference`,
  and the prop `chair`. The lowest point of the seated skin is 0.038 u above the floor.
- `pnpm close-views violinist` (`violinist-views.webp`): the rabbit sits on its haunch on the
  chair and plays. The holds were tuned on the studio rabbit, so the violin sits low at the mouth.
- `pnpm fold-probe violinist` (`fold-probe-new.txt`): each sample has folded faces, at most 13 at
  rest, 10 in a play, and 20 in the lift. By bone: `upper_arm_L` 30,920 faces in 6,200 samples
  (the front of the left shoulder), `hand_R` one face in each sample, `upper_arm_R` 564, and
  `hand_L` 18. The studio rabbit has 48 folded faces in all samples (`fold-probe-main.txt`).

## Images

- `preview-seated.webp`, `preview-standing.webp`: the seated bind with the chair, and the
  long-armed source, from the front, the right side, the back, and 3/4.
- `preview-knees.webp`: the legs of the seated bind from both sides and from the front.
- `preview-bones.webp`, `preview-bones-standing.webp`: the main bone of each face.
- `violinist-views.webp`: the close views of the violinist with the current holds.

## The app round

The second round of the branch puts the rig into the app in place of the studio rabbit, for each
seated rabbit and each standing rabbit soloist, and refits the violin hold. The `rabbit` entry of
`ANIMALS` names the rig in `glb`, and `pnpm studio-body rabbit` writes the module. The decisions
are the rows of the app round in
[`2026-10-13-mesh-rabbit.md`](../decisions/2026-10-13-mesh-rabbit.md).

### The faces and the module

| Measure | Studio rabbit (main) | Rig round | App round | Log |
|---|---|---|---|---|
| Triangles | 2,920 | 3,126 | 3,086 (eye fans of 11 and 10 faces) | `rig-mesh.log` of `pnpm rig-mesh rabbit` |
| Colors of the packed mesh | 122 | 2,849 | 54 (a palette of 48 in Oklab, by finish) | `module-parts.txt` |
| Module after gzip | 17,667 B | 53,947 B | 24,696 B | `module-parts-main.txt`, `module-parts.txt` |

`module-parts.ts` splits the packed mesh into its parts and gives the gzip of each part and of
the mesh without it. With one color for each face, the palette and the color indices took
25 KB of the 54 KB. The corners took 11 KB, because the faces came in the order of the texture
atlas. Each step of the rig commits of this round:

| Step | Module after gzip |
|---|---|
| One color for each face (rig round, eye copies) | 53,947 B |
| Palette of 48 colors in Oklab (Oklab distance of a face from its color 0.0026 on the mean, 0.013 at most) | 29,980 B |
| Faces in the order of a walk over their shared edges (corners 8,945 B, places 6,293 B) | 24,780 B |
| Weight rules of thin faces and fingers (the skin bytes change) | 24,696 B |

### The folds

`pnpm fold-probe violinist` (`fold-probe-app.txt`, play step 0.25 s):

| Set | Main (studio rabbit) | Rig round, old holds | App round |
|---|---|---|---|
| Rest | 6 of 6, 1 face | 6 of 6, 13 faces | 6 of 6, 9 faces |
| Play | 0 of 6,008 | 6,008 of 6,008, 10 faces | 2,703 of 6,008 (45.0%), 3 faces |
| Lift | 42 of 186, 1 face | 186 of 186, 20 faces | 93 of 186 (50.0%), 12 faces |

The rabbit mesh of the user has many thin faces: 335 of its 3,065 faces have a corner angle below
10° in the long-armed source (`slivers.ts` on the `source-long-arms.obj` of
`pnpm rig-mesh rabbit --preview`, `slivers.txt`). A thin face whose corners have different weights turns over at a bent
joint. The rig rules of this round:

- The corners of each thin face with a corner angle below 10° and a longest edge below 0.03 u
  share one set of weights. Three thin faces at the front of each shoulder share a vertex with
  less upper arm weight than its neighbors (0.62 against 0.71 to 0.77), and they folded in each
  sample. A group with no limit of the edge pulled the side of the trunk out with the arms in the
  seated bind, and the angle 15° turned over more faces (24 at rest).
- The middle corner of each face with a corner angle above 160° takes the weights of the line of
  its two other corners. The angles 150° and 140° turned over more faces (1,249 of 1,505 play
  samples at a step of 1 s).
- The fingers keep half of their bone heat weight. With the full share, one face between the hand
  and the fingers of each paw folded in each play sample, and with 0.75 the right paw still did.

These variants made the folds worse, and the rig does not use them: 4 rounds of smoothing of
the arm weights, a relax of the bind mesh until each face keeps 60° or 37° of its source normal,
and the head weight below the head line moved to the neck.

The folds that stay are thin faces of the upper arms: face 845 at the left elbow (15.3 cm long,
the angles 173°, 4°, and 4°, the weights upper arm 0.82 and forearm 0.18 at its middle corner),
and faces at the front of the shoulders. A face along the elbow is thin only when the elbow
bends, so the line rule of the source does not reach it. The hold sets the bend of the left
elbow (`fold-variants.txt`, play samples with a fold):

| Hold | Play | Rule of the violin (`reach-set.ts`) |
|---|---|---|
| Hold of the studio rabbit (scroll 15° down) | 44.6% | 0.541 |
| Scroll level, no move back | 19.9% | 0.511 |
| Scroll 2° down, 0.02 H back | 26.1% | 0.526 |
| Scroll 2° down, 0.04 H back (the app) | 45.0% | 0.536 |
| The app hold with the left elbow further in, (0.6, -1, -0.8) | 100% | 0.536 |

The violin of the rule needs the violin back on the collarbone, and the left elbow then bends
more. The brief stops this item at more than 1% of the play samples.

### The hold

`violin-probe.ts` measures the hold on the sheet moment of the violin (`violin-probe.txt`), and
`reach-set.ts` and `pnpm hold-reach rabbit` the rule of a violin shop (`hold-reach-app.txt`).

| Measure | Studio rabbit hold on the new body | App round |
|---|---|---|
| Violin to the left of the front | 45° | 45° |
| Scroll | 15° down | 2° down |
| Chin rest from the left shoulder joint (out, up, forward) | (-0.16, 0.30, 0.62) H | (-0.17, 0.31, 0.58) H |
| Chin rest under the mouth | 0.36 H | 0.35 H |
| Left elbow out of the plane of the violin | 0.34 H | 0.29 H |
| Left palm from the neck | 0.11 H | 0.11 H |
| Bow to the violin axis | 85° | 85° |
| Rule of the violin, scale and length | 0.541, 0.274 m | 0.536, 0.271 m |
| `violinScale` | 0.55 (0.279 m) | 0.54 (0.274 m) |

The rest probe (`rest-probe.ts`, `rest-probe.txt`) measures the rested violin and bow against the
trunk and the head, as `pose/rest-clearance.test.ts`. With the hand on the neck near the scroll
(`restPlace` 0.4), the violin touched the trunk. With the hand near the body of the violin (0.8),
it keeps 2.4 cm, and with 1.0, 4.1 cm.

### The sweeps

`pnpm pose-depth violinist --gaps` (`pose-depth-gaps.txt`, the first seated rabbit of each demo)
gives each part within the contact depth of 1.5 cm, except the upper arms in the body in the
rest pose, the lift, and the lowering: 2.1 cm, accepted up to 2.5 cm. The deepest corners lie at
the root of the left upper arm, 2 cm inside the shoulder joint in the bind pose of the player
(`deep-probe.ts`, `deep-probe.txt`). They turn behind the fan cap of the
cut to the arm when the arm hangs. The other deepest values: the paws in the body 1.2 cm and in
the violin 1.3 cm in a play, the forearms in the violin 1.2 cm in the lift and 1.3 cm in the
lowering. The head keeps 0.5 cm from the violin in a play. The solo violin test file of
`pose/violinist-standing-clearance.test.ts` passes for the standing rabbit. The sweep of the
violinist expects 6 open loops in the closed body: the two cuts to the arms, the edge of each eye
fan, and two open edges of the whiskers.

`limits-probe.ts` (`limits-probe.txt`) measures the accepted limits of the studio rabbit again.
The bow of the side rest is 0 mm in the trunk and in the arms (0.53 mm on the studio rabbit). The
bow paw turns 329° a second in the lift of the Boulanger demo. In Bach and Beethoven 9, it turns
3,579° to 3,690° a second in one step of 1 ms, as on main.

### The scale, the scene, and the other players

- `height-probe.ts` (`height-probe.txt`): the seated head top of the rabbit is 0.784 m above its
  seat, 0.897 of the 0.874 m of the red fox. The studio rabbit gave 0.86. The landmark stays.
- `scene-triangles.ts` (`scene-triangles.txt`): the scene of `perf-60.mid` has 166,722
  triangles (165,726 with the studio rabbit).
- `pnpm body-probe --base main` (`body-probe.txt`) names only the rabbit violinist: 5 bodies, 1
  player, and the pose sets of 27 rabbit players. No other player and no cue of the conductor
  changes.
- `pnpm fold-probe conductor` and `pnpm fold-probe pianist` give the tables of main.

### The dark band under the head

`neck-probe.ts` (`neck-probe.txt`) reads the 155 faces between the neck joint and the head joint
of the seated bind. Their colors have a linear luminance of 0.80 or more, the fur color of the
palette. 38 of them face down, to the weak ground fill of the stage light. No face of the neck or
the head folds in `pnpm fold-probe violinist`. So the band comes from the light, an open item of
the user that affects each player.

### Images of the app round

- `violinist-views-app.webp`: `pnpm close-views violinist` on the hold of the app round. The
  violin lies under the jaw, about level, and turns to the left front. The rabbit sits on its
  haunch at the front of the chair, and its knees stay low in the side views. The dark band under
  the head shows in the side and the back views.
