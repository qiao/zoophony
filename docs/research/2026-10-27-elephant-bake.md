# The elephant arm bake

Date 2026-10-27. Round `fifth-elephant`. Decisions:
[`2026-10-27-elephant-bake.md`](../decisions/2026-10-27-elephant-bake.md). The probes and their
outputs are in [`2026-10-27-elephant-bake/`](2026-10-27-elephant-bake/). Each command runs from the
root of the tree. The base is `main` at `4ce616c7`.

## 1. The question

The round `fifth-bears` found black texels on the inner upper arms of the elephant
(`dark-elephant.txt` of `2026-10-26-fifth-bears/`). `tools/blender/elephant_arms.py` moved each
inner upper arm 0.009 units toward its axis (`step_flatten()`) before the bake, whose rays start
0.006 units out of the tube. The goal is the flatten after the bake, as on the bear, with no other
change of the arm form. The count of the black faces and a compare of each triangle corner decide.

## 2. The measures

### The dark faces

`dark_faces.py` (the probe of `fifth-bears`) lists the faces that the color rule of the rig makes
dark, outside the eye box. A face is black when each channel of its color is below 0.05, else
gray:

```bash
Blender -b --factory-startup --python docs/research/2026-10-27-elephant-bake/dark_faces.py -- tools/mesh-rigs/elephant.json
awk 'NR>1 { split($0, a, "color \\["); split(a[2], c, /[],]/); m = c[1]; if (c[2] > m) m = c[2];
  if (c[3] > m) m = c[3]; if (m < 0.05) b++; else g++ } END { print b+0, g+0 }' <output>
```

| Source | Dark faces | Black | Gray | Output |
|---|---:|---:|---:|---|
| `elephant-apose.glb` of the user | 10 | 0 | 10 | `dark-user.txt` |
| `elephant-arms.glb` of `main` | 37 | 30 | 7 | `dark-base.txt` |
| `elephant-arms.glb` of the round | 7 | 0 | 7 | `dark-round.txt` |

The 30 black faces lie on the inner side of both upper arms, at y 0.53 to 0.56 of the studio, with
their UVs in the baked strip of the atlas. The 7 gray faces are the same faces on `main` and in
the round: 6 at the armpits and 1 at the tail, with the color of the skin of the user (about
0.25). The mesh of the user has 10 such gray faces, and no black face.

### The arm form

The new order is `step_bake`, then `step_flatten`, then `step_normals` (`STEPS`). The flatten
selects the same 8 vertices (`replay-main.txt`, `replay-round.txt`: the output of each step of
`Blender -b --factory-startup -P tools/blender/elephant_arms.py -- <out dir>`). Two runs of the
script give the same bytes:
`elephant-arms.glb` SHA-256 `406e181e…200a2`, and `elephant-weights.json` keeps the bytes of
`main` (`c8b807d6…cf78`). `compare_glb.py` compares each triangle corner of two GLB files:

| Compare | Positions | Normals | UVs | Colors | Joints, weights | Output |
|---|---|---|---|---|---|---|
| `elephant-arms.glb`, `main` and round | 11,688 of 11,688 same | 11,688 same | 8,934 same, the others move at most 0.0029 | | | `compare-arms.txt` |
| `elephant.rig.glb`, `main` and round | 11,688 same | | | 21 same: median change 0.0044, p95 0.026, 102 corners over 0.1 | 11,688 same | `compare-rig.txt` |

The UV unwrap of the arm faces now sees the tube before the flatten, so a few UVs move a little,
and the baked image changes only in the strip of the arm. The rig quantizes the face colors to a
palette of 48 colors (`palette()` of `tools/blender/rig_mesh.py`). The black faces held entries of
the palette, so each face color now moves a little. The 102 corners over 0.1 are the corners of
the black faces, which take the skin color (0.241, 0.217, 0.185).

### The images

`pnpm close-views timpanist <dir> --moments left,between,up,right,rest,lift50,lower50 --views
front,back,left,right,150,-150 --elevation 20 --base main --sheet --box 0.05,0.2,0.9,0.55 --scale
2`, and again with `--elevation 40`, give a sheet for each view, with `main` above the round. In
each lit cell, base and round differ only on the outlines, by about one pixel, with no change of a
surface at the arms. The black faces lie against the trunk, so the gallery light shows them
little. The colors probe (`--probe colors,noshadow`, moments `left,up,rest,lift50`, elevation 40)
shows them from the front: black slivers at the inner root of each upper arm on `main`, and the
gray skin in the round (`armpit-probes.webp`: colors, no shadow, and lit, `main` on top). The wide
black bands beside the belly in the lit views show on `main` and in the round, and they go with no
shadow: they are shadows of the arms in the gallery light, as on the bear.

`pnpm close-views play <dir> --demo beethoven-9 --time 10 --time 30 --at elephant --azimuth 0
--azimuth 150 --azimuth -150 --base main` shows the stage light. At the camera height 20°, the
players in front of the timpani hide the arm roots at az ±150. `--elevation 50 --zoom 1.6` shows
them (`stage-back.webp`: az150 and az-150, 10 s and 30 s, `main` on top). No view shows a black
patch, a dent, or a new seam. From the front, `main` shows a small dark notch at the inner root of
each arm, and the round shows less dark there (`stage-front.webp`, 10 s at 20°, `main` on the
left).
Other players change their outlines by about one pixel too, so the play renders have a small
jitter.

### The gates

| Gate | `main` | Round |
|---|---|---|
| `pnpm arm-check timpanist --base main` | | `PASS` on both arms, each value as on `main` (`arm-check.txt`) |
| `pnpm body-probe --base main` | | only the colors of the elephant change, the joints and all 1,492 pose sets stay (`body-probe.txt`) |
| `pnpm size --base main` | 810,333 B | 810,432 B, +99 B (`size.txt`) |

## 3. The result

The flatten now comes after the bake. No face of the elephant is black (30 on `main`), and each
triangle corner keeps its position, normal, joints, and weights. The face colors move a little,
because the palette of the rig spreads again over the skin. The lit gallery views show no change of
the form. The black bands beside the belly in the gallery light are shadows, an open decision of
the user on the scene light (`2026-10-26-fifth-review-bears.md`).
