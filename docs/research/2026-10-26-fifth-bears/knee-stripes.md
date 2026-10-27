# The stripes at the back of the polar bear knees

Date 2026-10-27. Round `fifth-bears`, second part. Decisions:
[`2026-10-26-fifth-review-bears.md`](../../decisions/2026-10-26-fifth-review-bears.md). The first part
is [`2026-10-26-fifth-bears.md`](../2026-10-26-fifth-bears.md). The probes and their outputs are in
this folder. Each command runs from the root of the tree.

## 1. The question

The three knee rings of the first part removed the block and the slab of the knees. The manager
found a new fault in the low views from the back right (az 120 and 150): thin light stripes,
stacked like shelves, at the back of each knee. `main` shows a smooth crease there. The goal is
the cause, a fix with no stripes, and a knee as slim as the knee of the first part.

## 2. The cause

The seated bind bends the knee by about 95°. At the back of the knee, the bend presses the skin
of the thigh and of the calf together. A vertex nearer to the knee plane than the radius of the
leg goes inside the leg with each blend of the thigh and the shin weights. Its thigh place lies
in the calf, and its shin place lies in the thigh. The three whole rings put three such loops at
the back, 0.05 units above the knee plane, on it, and 0.04 units below it. The faces between them
folded through the skin of the thigh underside, and each fold showed as a light stripe.

`section.py` cuts the seated left leg across the bend axis (`knee-section.webp`: `main`, the
three rings before and after the relax steps, and the fix). In the pure skin of the bind, the
calf of the three rings rises 0.03 units (5 cm) past the thigh underside and turns back: a hook.
The relax steps make the hook smaller, but faces of it stay. `crossings.py` counts the edges
that pass through a face of the skin at the back of the knee, and `hard_edges.py` counts the
edges there whose faces turn more than the crease angle of 40° (each such edge shows as a shading
step in the app). The source faces are the same, so the cause is in the rig: the ring vertices
and their weights.

## 3. The measures

The variants run `steps.py` on a copy of the config with `variant.py`. All rings have the radius
0.25, `minEdge` 0.03, and `ends` 0.2. An offset below 0 lies on the thigh side. A front arc is
`toward` [0, 0, 1] with `within` 90, and a back arc `toward` [0, 0, -1].

| Variant | Rings | Through the skin, bind | Through the skin, last step | Hard edges at the back | Knee edge |
|---|---|---:|---:|---:|---:|
| `main` | none | 3 | 0 | 0 | 0.161 |
| rings3 (first part) | 0, -0.05, 0.04, whole | 32 | 4 | 42 | 0.100 |
| front | rings3 on the front arc only | 4 | 0 | 4 | 0.130 |
| back | front, and -0.1, 0.08 on the back arc | 4 | 0 | 4 | 0.119 |
| wide | front, and -0.07, 0.06 on a back arc of 110° | 4 | 0 | 3 | 0.134 |
| final | back, with `kneeCrease` 2 rings, 4 rounds | 4 | 0 | 0 | 0.100 |

The outputs are `crossings.txt`, `hard-edges.txt`, and `knee-facets-2.txt`. The knee edge is the
longest edge within 0.1 units of the knee joint. Back offsets of -0.06 to -0.07 with 0.05 to
0.06, and back arcs of 60° to 110°, gave 3 to 7 hard edges.

The front variant keeps the front of the knee round, but the long faces of the back stay one
plane from the calf to the haunch: the slab under the thigh comes back (side views of
`leg_views.py`). Back rings at -0.1 and 0.08 stand where the thigh underside and the calf meet in
the bind, so their vertices stay on the skin, and the thigh underside stays level. In the app,
the back variant still showed a light wedge at the crease from three of the four low views,
because the faces at the corner turned more than 40° from each other. `kneeCrease` smooths the
seam of the thigh and the shin faces at the back of each knee (`knee_relax()` of
`tools/blender/rig_mesh.py`). It moves 256 vertices, at most 0.071 units (11.6 cm), on the
inner side of the knees. The crease of the haunch moves up to 0.049 units in the same rig. With
1 ring and 3 rounds, a thin light line stayed on the calf from az 150. A move along the vertex
normal only turned 5 to 12 faces over in the bind.

## 4. The gates

| Gate | `main` | Final |
|---|---|---|
| `pnpm rig-mesh polar-bear --check`, triangles, mesh gzip | 4,142, 27,851 B | 4,442, 29,932 B |
| `pnpm fold-probe pianist --base main` rest, play, lift | 34, 32, 34 | 34, 32, 34 (`fold-pianist-2.txt`) |
| Folded leg samples (`rig-check-polar-bear-2.txt`) | none | none (rings3: 29 of the right shin, 6 of the right thigh) |
| `pnpm arm-check pianist conductor --base main` | | the values of `main`, no `FAIL` (`arm-check-2.txt`) |
| `pnpm size --base main` | 808,401 B | 803,505 B (`size-2.txt`; `main` has other changes since the base of the round) |

The bench top stays at 0.232 m, and the head and the hold anchors do not move.

## 5. The result

The stripes came from the ring vertices at the back of the bent knee, which the bind put inside
the leg. The rings near the knee plane now cut only the front arc of each knee, two rings cut the
back where the thigh and the calf meet, and a smoothing rounds the crease. No edge passes through
the skin, no hard edge stays at the back of the knee, and the knee edge stays at 0.100. The low
views of `knee-cams.ts` from ten directions, at 8 s in the play and at 60 s at rest, and a strip
from 104 s to 111.5 s show no stripe. From each direction the back of the knee looks as smooth as
on `main` or smoother (`knee-low-2.webp`: `main`, rings3, and the final rig at 8 s). A vertical groove on the front of the left shin and light wedges
on the calf back from az 150 to 180 stay. `main` has both, from long faces of the source shin.
