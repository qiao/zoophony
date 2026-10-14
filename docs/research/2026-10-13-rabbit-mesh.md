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
writes the same bytes (sha256 `341d2f0a6fb3`, 909,932 bytes, in `rig-mesh.log`).

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
| Module `src/models/studio/rabbit.ts` | 87,926 bytes, 53,963 after gzip (studio rabbit: 40,331 and 17,691) | `module-size.txt` |

Each face takes the mean color of 28 samples of the texture. The module is larger than the
module of the studio rabbit, because almost each face has a color of its own, and the palette of
the packed mesh holds each color.

## In the app, with the current holds

These checks ran with a temporary swap: the rabbit entry of `ANIMALS` named the rig GLB, and
`pnpm studio-body rabbit` wrote the module. The swap is not in a commit.

- `pnpm studio-body rabbit --inspect` (`inspect.txt`): 30 joints, no missing body bone, no
  unknown joint, the materials `fur` and `gloss`, the four morph targets, the clip `reference`,
  and the prop `chair`. The lowest point of the seated skin is 0.038 u above the floor.
- `pnpm close-views violinist` (`violinist-views.webp`): the rabbit sits on the chair and plays.
  The holds were tuned on the studio rabbit, so the violin sits low at the mouth.
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
