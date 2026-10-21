# The fill of the notch under the right armpit of the rabbit

Date 2026-10-21. Round `rabbit-notch`, base `205ac337`. Decisions:
[`2026-10-21-rabbit-armpit.md`](../decisions/2026-10-21-rabbit-armpit.md). The probes and their
outputs are in [`2026-10-21-rabbit-notch/`](2026-10-21-rabbit-notch/). Each command runs from the
root of the tree. The probes import `../tools/` and `../src/`, and read `scratch/`, so copy a probe
to `scratch/` before you run it. The round before is
[`2026-10-21-rabbit-armpit.md`](2026-10-21-rabbit-armpit.md).

## 1. The question

The soft normals of the round before removed the crack, but the manager still saw a dark notch
under the bow arm at the camera of the user (brahms-2 at 678.63 s, `--at rabbit --azimuth 120`).
The goal: a trunk surface under the raised arm with no pocket, by a small move of the notch
vertices in a copy of the mesh, with the folds and the arm gate of `205ac337`.

## 2. The measures

`slices.py` draws horizontal cuts of the source. At the heights 0.39 to 0.42 units, the side of
the trunk under the right arm bends in toward the arm in a V at the front and at the back of the
seam, and the run of the body (vertices 984 to 1025 of a weld at 1e-5) lies up to 0.017 units
inside the trunk line. `fair.py` fits a quadratic surface |x| = f(y, z) to the 28 trunk vertices
around the notch (residual 0.010 units), and moves the run and its ring of trunk neighbors out
along x onto it, at most 0.02 units and inside the plane of `armSplit` (`fair-R.txt`). A temporary
hook of `rig_mesh.py` applied each move file before the weld rules (`run-variant.sh`), so that each
variant took one rig check and one render.

| Variant | Moved vertices, largest | Play / lift / rest folds | Edges / dark, az 120 | Edges / dark, az 90 | Look |
|---|---|---:|---:|---:|---|
| `main` (`205ac337`) | none | 0.3% / 6.2% / 0% | 575 / 772 | 331 / 403 | dark notch |
| full move to the surface | 21, 2.4 cm | 0.3% / 6.5% / 0% | 461 / 400 | 302 / 173 | facets, dark pit |
| full move, cap 0.01 units | 21, 1.5 cm | 39.3% / 22.4% / 100% | | | the shapes fail |
| half of the full move (chosen) | 21, 1.2 cm | 0.2% / 6.2% / 0% | 505 / 475 | 223 / 85 | shallow hollow, small tip |
| half, and half of it one ring further | 33, 1.2 cm | 2.1% / 6.2% / 0% | 456 / 406 | 188 / 72 | as half |
| the run alone | 8, 2.4 cm | 0.2% / 6.2% / 0% | 650 / 1116 | 505 / 1045 | deeper notch |
| the top ends of the run out to 0.102 units | 2, 2.3 cm | 0.5% / 25.6% / 100% | 766 / 1235 | 645 / 774 | the rest shape fails |
| the top ends with a wider rest shape | 2, 2.3 cm | 0.5% / 25.6% / 100% | | | the rest shape fails |
| half on both sides | 45, 1.2 cm | 0.2% / 6.2% / 0% | 502 / 474 | 230 / 89 | light streak on the left |

The edges and the dark pixels follow `dark.py` of the round before: the rabbit pixels in the box
of the cut faces where the Oklab lightness changes by more than 0.03 for each pixel, and the rabbit
pixels below 0.8 of the median lightness of the box. `variant-measures.txt` gives the edges and the dark pixels in the boxes of the cut faces of
`main`, and `variants.webp` the crops. A move of a few corners changes the faces that the shape of
the right arm at rest relaxes, and that shape then turns faces of the caps over in each rest
sample (`pnpm fold-probe violinist --faces 6 --glb <file>`). The half move keeps each shape.

## 3. The result

The chosen moves went into a copy of the mesh in Blender through Blender MCP: 21 welded vertices,
54 corners of the file, out along x by at most 0.0082 units (1.2 cm in the app, 1.6 cm in the file).
The copy `assets/models/rabbit/rabbit-4-armpit.glb` gives the welded places of the hook within
1e-8, and the module of its rig equals the module of the hook. `rabbit-4.glb` stays.

Over the 17 boxes of 20 frames of brahms-2, the sharp edges fall from 4,773 to 3,890 and the dark
pixels from 6,226 to 3,593 (`frame-measures.txt`, `frames.py`). The left boxes keep their values.
`pnpm body-probe --base 205ac337` changes only the 5 rabbit bodies and the rabbit violin player,
and all 1,492 pose sets equal (`body-probe.txt`). `pnpm fold-probe violinist` gives 0.2% of the
play, 6.2% of the lift, and 0% of the rest (`fold-probe.txt`). `pnpm arm-check violinist --base
205ac337` passes (`arm-check-violinist.txt`): only the flat p5 of the right arm moves, from 0.65 to
0.64. `pnpm arm-check --all --base 205ac337` gives no `FAIL` (`arm-check-all.txt`).

In the frame of the user, the dark notch becomes a shallow hollow with a small sharp tip
(`user-view-pairs.webp`, `frame-pairs.webp`, `main` on the left). The role views and the standing
soloist keep their look (`role-pairs.webp`). The left armpit keeps its vertices, because the half
move there turned the dark line into a light streak (edges 99 to 160 at the azimuth -120).
