# The polar bear leg rebuild

Date 2026-10-27. Round `sixth-wolf-knee`, part C. Decisions:
[`2026-10-27-polar-legs-rebuild.md`](../decisions/2026-10-27-polar-legs-rebuild.md). The probes and
their outputs are in [`2026-10-27-polar-legs-rebuild/`](2026-10-27-polar-legs-rebuild/). Each
command runs from the root of the tree. "Main" is `826fe151`, with the polar bear of `876ba389`.
"Front" is the knee front round of part B of this round (section 8 of
[`2026-10-27-wolf-knee.md`](2026-10-27-wolf-knee.md)).

## 1. The question

The user said: "the bear's knee is still much bulkier than expected. it's not anatomically
correct". Long faces of the user mesh ran from the underside of the haunch to the heel, so the
seated leg was a wedge with no hollow behind the knee (section 11 of the report of part B). The
target: a thigh that tapers to the knee, a knee no deeper than about the source knee (0.15 to
0.17 units), a hollow behind the knee, a round knee front, and no new fold.

## 2. The method

`tools/blender/polar_bear_legs.py` replays the session in headless Blender:

1. Import `polar-bear-arms.glb`, Merge by Distance.
2. Bisect each leg at the haunch line (0.195 units on the thigh, just below the crotch at 0.205,
   where each leg is a closed column) and at the ankle (0.1 units on the shin, above the foot).
   Delete the faces between the cuts: 95 and 96 faces.
3. Model a tube of 10 rings of 20 vertices, each ring at a right angle to its bone, the axis
   turning from the thigh to the shin near the knee. The end rings stand 0.015 units from the
   cuts. Shrinkwrap it onto a hidden copy of the old leg, and Bridge Edge Loops to the haunch and
   the foot. Collapse the thin faces at the loops (16 and 33 edges).
4. UV, bake the fur color (Cycles, Selected to Active) before any other change, transfer the
   custom normals, and put the leg image beside the arm image in the strip of the atlas.
5. Write `polar-bear-limbs.glb` and the weights file: the kept vertices keep their weights, the
   529 new vertices take the automatic weights of Blender. Two runs give the same bytes.

The tube is built before the leg factor 1.6. `segment_stretch()` of `tools/blender/rig_mesh.py`
moves each point only along its bone, so the rings keep their right angles and stand 0.012
units apart in the bind. A stretch in Blender would move the joints of the config, the knee and
haunch heights, and the landmark of the shoulders.

In the rig, the new leg vertices take the rule weights (`paintedLower`, the knee ramp 0.12 to
0.2), so that each ring takes one share of the knee bend. Three new rules of
`tools/blender/rig_mesh.py` complete it: the dual quaternion blend of the knees in the seated
bind (`bind.knee`), the bone heat of the old mesh for the kept vertices (`heatSource`), and one
mean of the weights of two thin faces of the right hip front (`weights.rigid`). The knee rings,
the leg flips, and the rounding of the knee front go.

## 3. The form of the leg

`probes/leg_rays.py` casts rays from the bone line in the bend plane (`leg-measures.txt`). Units
of the rig: width × depth, left leg.

| Cut | Source (legs × 1.6) | Main | Front | Round |
|---|---|---|---|---|
| Thigh 0.5 | 0.161 × 0.183 | 0.149 × 0.170 | 0.150 × 0.170 | 0.152 × 0.146 |
| Thigh 0.7 | 0.148 × 0.173 | 0.130 × 0.197 | 0.137 × 0.199 | 0.142 × 0.142 |
| Knee (bisector) | 0.131 × 0.148 | 0.104 × 0.199 | 0.122 × 0.209 | 0.126 × 0.141 |
| Shin 0.5 | 0.118 × 0.125 | 0.111 × over 0.2 | 0.112 × over 0.2 | 0.113 × 0.110 |
| Shin 0.8 | 0.115 × 0.118 | 0.111 × 0.160 | 0.111 × 0.159 | 0.108 × 0.108 |
| Knee front over the round of the leg | 0.90 | 0.76 | 0.91 | 0.98 |
| Back of the knee from the joint | 0.081 | 0.152 | 0.152 | 0.069 |

The right leg gives the same values within 0.006. The side cuts (`side-leg.webp`,
`probes/side_leg.py`) show the level underside of the thigh, the hollow behind the knee, and the
round knee front. The thigh tapers in width (0.152 to 0.126), but its depth stays near 0.14.

## 4. The tries

`probes/variants.sh` runs each variant from the final config (`variants.txt`). Hard edges turn
more than 40° within 0.2 units of the knee (`probes/zone_turns.py`, inner side), back edges
behind it (`probes/hard_edges.py`), left / right.

| Variant | Knee width × depth | Front | Hard inner | Back edges | Seat top u |
|---|---|---|---|---|---|
| Final | 0.126 × 0.141 | 0.98 | 16 / 8 | 5 / 1 | 0.3238 |
| Linear knee blend | 0.124 × 0.120 | 0.83 | 19 / 10 | 7 / 6 | 0.3247 |
| No crease smoothing | 0.131 × 0.155 | 0.99 | 43 / 45 | 27 / 34 | 0.3238 |
| Crease smoothing of 12 rounds | 0.115 × 0.139 | 0.98 | 13 / 6 | 4 / 0 | 0.3238 |
| No calf fair | 0.126 × 0.144 | 0.98 | 23 / 10 | 12 / 4 | 0.3238 |
| Rounding of the knee front | 0.127 × 0.142 | 0.99 | 16 / 8 | 5 / 1 | 0.3238 |
| Bone heat of the new mesh | 0.126 × 0.141 | 0.98 | 14 / 9 | 5 / 1 | 0.3208 |
| Automatic weights of Blender on the legs | 0.125 × 0.149 | 0.81 | 10 / 2 | 0 / 0 | 0.3198 |

Main has 8 / 1 hard inner edges, 12 / 4 hard edges on the knee front, 0 / 0 back edges, and
8 / 8 back faces that face into the crease. Of the 16 inner edges of the round, 5 are the crease
line behind the knee, 3 the haunch faces of main, 4 the crease of the instep, and 4 the cut loop
of the haunch line at the crotch. No edge passes through the skin (`probes/crossings.py`). Before the final tube,
ramps of the knee rule from 0.09 to 0.21 and from 0.07 to 0.23 bent the whole thigh tube and
filled the corner behind the knee, and a cut 0.0075 units from the first ring turned four bridge
faces over at the back of the right haunch.

## 5. The gates

| Gate | Result | Output |
|---|---|---|
| `pnpm fold-probe pianist --base main` | rest, play, lift: 34, 32, 34, as on main, no new face. No leg or hips face folds in any sample | `fold-pianist.txt`, `fold-pianist-faces.txt` |
| `pnpm arm-check pianist --base main` | each value of main, no `FAIL` (`OPEN` for the folds p95 19 and 15, as on main) | `arm-check-pianist.txt` |
| `pnpm body-probe --base main` | only the mesh of the five polar bear bodies (chair, stool, high stool, bench, stand) changes, beside the wolf poses of part A. The joints and the piano poses stay | `body-probe.txt` |
| `pnpm pose-depth pianist --base main` | each value of main, no `GROWS`, each note target within 5 mm | `pose-depth-pianist.txt` |
| `pnpm size --base main` | 825,527 B, +2,434 B, under the limit of 1 MB | `size.txt` |

The bench top goes 2 mm down to 0.230 m. With the bone heat of the new mesh, the crotch weights
moved by up to 0.23 and the bench went 7 mm down.

## 6. The images

`main` is above the round in each image.

- `user-angle.webp`: the angle of the image of the user, `close-views play --at polar-bear
  --azimuth -75 --elevation 3 --zoom 1.4 --time 30`, at the play and at rest (`--pause`).
- `close.webp`: L-60 and L-30 of `knee-cams.json` of `2026-10-27-legs-armpit/` with the L-60
  of part B, the angles of the earlier images of the user, at the play and at rest.
- `side-e10.webp`, `side-e20.webp`: `--at polar-bear --azimuth -90 --azimuth 90 --zoom 1.6`.
- `knee-low-8.webp`, `knee-low-60.webp`: the ten knee cameras at 8 s and 60 s.
- `strip-L-60.webp`: L-60 from 8 s to 15.5 s.
- `legs-e20-<view>.webp`, `legs-e40-<view>.webp`: `pnpm close-views pianist --sheet --moments
  chord,between,far-left,far-right,rest --views front,left,right,back,150,-150,-35,35 --box
  0.1,0.5,0.8,0.5 --scale 2`.
- `source-rig.webp`: the source of main and of the round with the legs 1.6 times longer, and the
  seated binds (`probes/render_npz.py`, Workbench).

## 7. The result

The quad tube removes the wedge: the seated thigh has a level underside, the knee bends with a
hollow behind it, and the dual quaternion blend keeps the knee front round at the radius of the
leg. The knee is 0.141 units deep on its bisector, against 0.148 in the source and 0.199 on main,
with the folds, the arm gate, the poses, and the clearance of main. Open: the depth of the
seated thigh tapers less than the source, the crease of the instep has 4 hard edges, and the cut
loop at the crotch 4.
