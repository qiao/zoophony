# The gap under the right armpit of the rabbit

Date 2026-10-21. Round `rabbit-armpit`, base `570bf431`. Decisions:
[`2026-10-21-rabbit-armpit.md`](../decisions/2026-10-21-rabbit-armpit.md). The probes and their
outputs are in [`2026-10-21-rabbit-armpit/`](2026-10-21-rabbit-armpit/). Each command runs from
the root of the tree. The probes import `../tools/` and `../src/`, so copy a probe to `scratch/`
before you run it.

## 1. The question

The user said: "fix the rabbit's armpit deformation. it looks like it's missing a piece"
(`rabbit-armpit-user.png`). The screenshot shows the raised right arm of a rabbit violinist from
the back right, with a jagged gap under it. The goal: no gap that reads as a missing piece, with
the form of the body, the limbs, the hold, and the arm gate of `570bf431`.

## 2. The cause

`pnpm arm-check violinist --views <dir> --views-all` gave the camera of the user: brahms-2 at
678.63 s, `--at rabbit --azimuth 120`. `id-raster.ts` draws the face index of each pixel of that
frame (with the 34 px shift of the bar, `VIEW_OFFSET_Y`), and a render with the cut faces in pure
colors named the faces of the gap (`faces-678-az120.txt`):

```text
             upper arm (raised)
   trunk  ____________________
        255 \   356   / 226 |  356, 226: the quad at the top of the cut
             \_______/      |            (arm corners 73, 72; body corners 151, 126)
   359 ______/  357 421     |  357, 415, 419, 420, 421, 572: the caps of the body
   (rim, faces down)        |  358, 359, 559, 560: the rim of the notch
```

- The cut of 2026-10-20 removes the faces between the hanging arm and the trunk below 0.44 units,
  and closes both holes. The side of the trunk of the source curls in where it joins the arm, so
  the caps of the body lie in a notch.
- The raised bow arm stretches the quad 356 from 41.8 to 54.0 cm² into a sheet that faces down
  (normal y -0.77). Vertex 126 at its body end lies 21 mm inside its neighbors in the pose and 0 mm
  in the bind (`dents-678.txt`).
- The rim faces 358, 359, 559, and 560 face down in the bind already. Face 359 grows from 3.0 to
  6.5 cm², and its normal turns 46° from its neighbor 360 in the pose (87° in the bind), past
  the crease angle of 35°.
- With their own normals, the quad, the caps, and the rim shade dark and flat: the jagged gap. No
  face turns over (`fold-main.txt`), so `pnpm fold-probe` does not see it.

The 2-edge open loop under the right armpit (`open-edges.txt`) is a flap face that no frame shows
(0 px in 20 frames). The module of `5ddf5b62`, before the cut, has such a pair too.

## 3. The measures

`variant.sh` rigs a variant with `pnpm rig-mesh --check --keep`, swaps it into the tree, and
renders the frame of the user. `render-set.sh` renders brahms-2 at 4 times and 5 azimuths.
`dark.py --edges` counts the sharp edges in a box around the cut faces of a side: the rabbit
pixels where the Oklab lightness changes by more than 0.03 for each pixel. `groove.ts` gives the
largest growth of a concave angle over the bind and the deepest dent, over the play at 1 s steps.

| Variant | Play / lift folds | Sharp edges, user frame (az 120) | Sharp edges, az 90 | Left, az -120 | Look |
|---|---:|---:|---:|---:|---|
| `main` | 0.3% / 6.2% | 889 | 533 | 86 | jagged dark gap |
| skin normals on the caps of the body, both sides | 0.3% / 6.2% | 592 | 360 | 235 | soft hollow, dark crack at the rim |
| caps and rim, both sides | 0.3% / 6.2% | 554 | 314 | 235 | soft hollow, light sliver on the left |
| caps and rim, right side (chosen) | 0.3% / 6.2% | 578 | 314 | 91 | soft hollow, left as `main` |
| fill of the notch, run only | 0.1% / 4.8% | | | | sharp dark tent, a back face shows from below |
| fill, run and 1 ring | 0.0% / 5.5% | | | | sharp dark tent |
| `weights.armBelow` 0.38 to 0.44 | 52.1% / 31.1% | | | | the shapes fail to relax |

Over all 17 boxes of the 20 frames, the sharp edges go from 5,222 (`main`) to 4,625
(`edge-pixels.txt`). The dark share rises a little, from 10.1% to 10.8% (`dark-pixels.txt`),
because a soft shadow takes more pixels than a crack. The fill (`fill-trial.patch`) moved the
trunk up to 0.0303 units (4.4 cm), and the dents of the right side fell from -25.7 to -6.0 mm
(p5, `groove-R-*.txt`), but the quad and the rim then formed a sharp ridge
(`variants.webp`). A rim face as a cap left the corners of the caps of the body with no skin
face, so those corners kept their own normals and the caps showed as a light plate.

The rule changes only the normals: `pnpm body-probe --base 570bf431` gives "mesh differs
(normals)" for the 5 rabbit bodies and the rabbit violin player, and all 1,492 pose sets equal
(`body-probe.txt`). The arm gate keeps each value (`arm-check-violinist.txt`), and
`pnpm arm-check --all --base 570bf431` gives no `FAIL` (`arm-check-all.txt`).

| Role | Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | paw swing p95 | paw jumps | stretch p95 | grip turn p50 | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| violinist | L | 1 (1) | 14 (14) | 79 (79) | 0.63 (0.63) | 167 (167) | 35 (35) | 0.0% (0.0%) | 0.15 (0.15) | 4 (4) | PASS |
| violinist | R | 0 (0) | 49 (49) | 42 (42) | 0.65 (0.65) | 108 (108) | 59 (59) | 0.0% (0.0%) | 0.08 (0.08) | 10 (10) | PASS |

## 4. The result

`cut.bodyNormals` of `tools/mesh-rigs/rabbit.json` takes the right side. There the 8 new faces of
the cut and the 25 rim faces take the normals of the skin (`cut_rim()` of
`tools/blender/rig_mesh.py`, `StudioBody.rim`, `studioNormals()`). In the frame of the user, the
jagged gap becomes a soft hollow (`user-view-pairs.webp`, `main` on the left). The other frames
are in `frame-pairs.webp`, and the role views with the standing soloist in `role-pairs.webp`.
The left side keeps the normals of its faces. A soft hollow and a short dark wedge stay under the
bow arm, because the geometry of the notch stays.
