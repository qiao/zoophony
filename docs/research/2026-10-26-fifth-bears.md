# The bear armpit and the polar bear knees

Date 2026-10-26. Round `fifth-bears`. Decisions:
[`2026-10-26-fifth-review-bears.md`](../decisions/2026-10-26-fifth-review-bears.md). The probes and
their outputs are in [`2026-10-26-fifth-bears/`](2026-10-26-fifth-bears/). Each command runs from
the root of the tree. The base is `main` at `57849ac5`.

## 1. The question

The user wrote: "there's black area under the bear's armpit" and "the polar bear's knees are more
bulky than it should be". The goal is the cause of each fault, a fix in the rig step that makes
it, and close images from many angles, at rest and in the play, with the base beside the round.

## 2. The measures

### The bear armpit

The colors probe of `pnpm close-views conductor --probe colors,normals,noshadow` shows black faces
under both armpits with no light (`armpit-probes.webp`: lit base, lit round, colors base, colors
round). `dark_faces.py` lists the faces that the color rule of the rig makes dark, outside the eye
and nose boxes:

| Source | Dark faces | Output |
|---|---:|---|
| `bear-tpose.glb` of the user | 0 | `dark-user.txt` |
| `bear-arms.glb` of `main` | 65 | `dark-base.txt` |
| `bear-arms.glb` of the round | 0 | `dark-round.txt` |
| `elephant-arms.glb` of `main` | 37 (about 24 black) | `dark-elephant.txt` |

All 65 faces lie on the front and lower side of the upper arms, at 0.3 to 0.6 of the upper arm,
and their UVs lie in the baked strip of the atlas. `tools/blender/bear_arms.py` moved that part of
the tube up to 0.015 units into the source arm (`flatten`) before the bake, whose rays start 0.006
units out of the tube. The rays missed the source arm, and the bake wrote black texels. With the
flatten after the bake, the replay gives the same geometry and the same weights file byte for
byte, and no dark face. The rig check gives the same folds (`rig-check-bear.txt`).

In the stage light of the app, the front of the conductor shows black jagged patches under both
arms on `main` at each of six song times, and the fur on the round (`armpit-stage.webp`). The
gallery light also casts a black shadow of each arm on the trunk. The probe with no shadow shows
the fur there, so the round keeps the light.

### The polar bear knees

`steps.py` runs the rig with hooks and saves the mesh after each step of the seated bind.
`leg_views.py` draws the left leg after each step. The bind skin makes the fault, and the later
steps (relax, sit, lift, crease) keep it. In the stretched source, 35 faces of each leg cross the
knee joint by more than 2 cm on each side, and 20 of them span more than 0.15 units of height
(`long-faces.txt`). Their longest edge is 0.185 units on the median, against 0.061 on the leg. A
face cannot bend, so each stays a flat plane in the seated bind: an angular block at the knee with
hard ridges, and a slab from the calf to the haunch under the thigh (`knee-steps.webp`, first
row).

`knee_facets.py` measures the faces within 0.1 units of the knee joint of the bind
(`knee-facets.txt`). The area unit is 1e-4 square units. The play folds come from
`pnpm rig-mesh polar-bear --check --set` (`rig-check-polar-bear.txt` for the final variant).

| Variant | Change | Longest edge | Largest face | Edges > 0.1 | Slab | Play folds |
|---|---|---:|---:|---:|---|---:|
| `main` | | 0.161 | 32.3 | 13 | yes | 32 |
| k2 | `weights.knee` 0.14 to 0.17 | 0.134 | 32.0 | 14 | yes | |
| k4 | knee 0.12 to 0.2, `haunch` 0.24 to 0.34 | 0.161 | 30.5 | 17 | yes | |
| k6 | no knee rule | 0.173 | 32.5 | 10 | yes, and a hump | |
| p1 | thighs 15° down | 0.161 | 32.0 | 14 | yes | |
| p2 | shins 10° forward | 0.167 | 32.1 | 16 | yes | |
| r3 | rings at 0 and ±0.04, radius 0.17, mean weights | 0.098 | 13.7 | 0 | yes | |
| r3n | r3 with the leg rules of new vertices | 0.095 | 13.7 | 0 | smaller | |
| r3w | r3n with the radius 0.25, ends 0.1 | 0.081 | 8.9 | 0 | no | 34 |
| e2 | r3w with ends 0.2 | 0.100 | 8.9 | 1 | no | 33 |
| final | e2 with the upper ring at -0.05 | 0.100 | 10.2 | 1 | no | 32 |

The rings of `refine.rings` cut each edge that crosses their planes near the knee. With the mean
weights of its edge, a new vertex between the haunch (hips) and the calf (shin) had no thigh
weight, and the slab stayed. `ring_leg_weights()` gives each new vertex of a leg ring the knee and
haunch rules at its place in the source. The radius 0.25 reaches the corners of the haunch. The
angle between neighbor faces grows in the last rows (`knee-facets.txt`), because the back of the
knee now has a crease where the slab was.

The e2 rings folded one face between the thighs in each play sample: its two crotch corners
follow the hips, and its third corner the thigh and the shin. A scan of ring offsets and ends
(`pnpm rig-mesh polar-bear --check --set`) gave the fold table of `main` with the upper ring at
-0.05. A face of the right shin then folds in 29 of the 4,940 samples.

In the app, the low cameras of `knee-cams.ts` look at each knee from 30°, 60°, 120°, and 150°
on each side (`knee-low.webp`, play at 8 s, `main` on top). The round shows a level thigh, a
round knee, and a vertical shin. The 2x crops of `pnpm close-views pianist --lineup --crop 2`
show the same at each moment from the four sides and az ±150 (`knee-crops-rest.webp`). A crease
with thin light stripes stays at the back of each knee, and a short groove on the front of the
left shin.

### The gates

| Gate | `main` | Round |
|---|---|---|
| `pnpm arm-check conductor pianist --base 57849ac5` | | conductor `PASS`, pianist `OPEN` (folds p95 19 and 15 at rest, as on `main`), no `FAIL` (`arm-check.txt`) |
| `pnpm fold-probe conductor` rest, play, lift | 6, 24, 16 | 6, 24, 16 (`fold-conductor.txt`) |
| `pnpm fold-probe pianist` rest, play, lift | 34, 32, 34 | 34, 32, 34 (`fold-pianist.txt`) |
| `pnpm size --base 57849ac5` | 801,256 B | 804,916 B, +3,660 B (`size.txt`) |
| Polar bear triangles, packed mesh after gzip | 4,142, 27,851 B | 4,656, 31,342 B |
| `pnpm body-probe --base 57849ac5` | | only the bear colors and the polar bear mesh change, the joints and all 1,492 pose sets stay (`body-probe.txt`) |

The bench top rises 6 mm to 0.232 m, the lowest point of the seated body over the seat. The head,
the hold anchors, and the poses do not move.

## 3. The result

The bear armpit was black from the texels of a bake after a flatten. The bake now comes before
the flatten, and no face is dark. The polar bear knee was bulky because long source faces crossed
the knee and stayed flat. Three rings at -0.05, 0, and +0.04 units from the knee, with the leg
rules for each new vertex, give a thigh, a round knee, and a shin, with the fold table of `main`.
The elephant has the same bake fault, and the crease at the back of the knee stays open.
