# The rabbit from a rigged GLB file

On 2026-10-10, the user gave three GLB files of a rabbit and asked to use the model as the rabbit
of the app, with no comparison against `rabbit-views.png`. This report gives the facts of the
files and the measures of the packed body. The decisions are in
[`2026-10-10-rabbit-glb.md`](../decisions/2026-10-10-rabbit-glb.md).

## The source files

| File | Triangles | Skeleton | Textures | Size |
|---|---|---|---|---|
| `rabbit.glb` (first) | 18,629 | none | 4 JPEG, 4096 × 4096 base color | 17,794,932 B |
| `rabbit2.glb` | 3,148 | none | 3 PNG | 24,489,156 B |
| `rabbit-rigged.glb` | 3,148 | 23 Mixamo joints, up to 4 for each vertex, an animation `Walking` | 1 PNG | 17,349,696 B |

The rigged file holds the mesh of `rabbit2.glb` at 1.2 m from the soles to the tips of the ears,
in a T-pose. Its mesh is closed: after the weld, 1,576 vertices and 3,148 faces, with no open edge.
Only the rigged file is in the repository, as `assets/models/rabbit/rabbit.glb`.

The heads of the joints in the file, in meters, in the axes of Blender (+x the left side, -y the
front, +z up):

| Joint | Head |
|---|---|
| `Hips` | 0.003, -0.034, 0.469 |
| `LeftUpLeg` (hip) | 0.064, -0.037, 0.423 |
| `LeftLeg` (knee) | 0.101, -0.051, 0.240 |
| `LeftFoot` (ankle) | 0.092, 0.023, 0.117 |
| `Spine2` | 0.002, -0.025, 0.676 |
| `LeftArm` (shoulder) | 0.109, -0.011, 0.722 |
| `LeftForeArm` (elbow) | 0.220, 0.012, 0.672 |
| `LeftHand` (wrist) | 0.332, 0.000, 0.674 |
| `Head` | 0.001, -0.022, 0.765 |

## The packed body

`pnpm rig-body rabbit` gives these values:

- The scale is 1.6 / 1.2 = 1.333, so that the rabbit is 1.6 m high to the tips of its ears, as the
  parametric rabbit. The head height `H` from the chin to the top of the skull is 0.311 m. The
  parametric rabbit had `H` = 0.38 m.
- The collapse gives 2,436 triangles. With the eye plates, the body has 2,588 triangles.
- The texture gives 93 faces of the pink accent (the inner ears), 2 faces of the nose, and 29 dark
  faces of the eyes. The other faces are fur.
- The arms of the file are 0.52 H (upper arm) and 0.48 H (forearm) long. The skeleton of the
  species gives 0.7 H and 0.65 H, so the bind pose stretches them by about 1.35.
- The module is 27,966 B, and 16,045 B after gzip. The first download grows from 307,533 B to
  327,262 B.

## The seated legs

The hip joint of the rabbit is 0.164 m above the bottom of its haunch, and its knee is 0.348 m
above the soles with a vertical shin. On a chair of 0.35 m, a level thigh puts the knee 0.514 m
high, and the shin must stretch 1.86 times to reach the floor. A thigh that slopes 20° down puts the
knee 0.416 m high, and the shin stretches about 1.35 times.

## The tests

With the rigged rabbit and its arms of the file, 38 tests failed. With the stretched arms, 27
failed. The user asked to remove these 27 tests, and the commit
`feat(models): give the rabbit its rigged body from the GLB file` lists them.

## Images

The sheet page of the rabbit (`views.html?sheet=rabbit`) with the rigged body:

![The rabbit with the violin on a chair, from three sides](2026-10-10-rabbit-glb/rabbit-sheet-views.webp)

The default demo after 6 s of play. The rabbits of the first violins sit at the front left:

![The orchestra during play](2026-10-10-rabbit-glb/play-1440x900.webp)
