# Smooth studio bodies (2026-10-14)

On 2026-10-14, the user asked for a smoother rabbit violinist, then for smoother bears: the bear
conductor and the polar bear pianist. This report gives the measures behind the decisions of
[`2026-10-14-rabbit-smooth.md`](../decisions/2026-10-14-rabbit-smooth.md). The probes are in the
folder [`2026-10-14-rabbit-smooth/`](2026-10-14-rabbit-smooth/).

## The cause

The manager measured the rabbit mesh before the round (probes `normals.py` and `colors.py` of the
brief, copied into the folder, run with numpy):

- The app drew each studio body with flat shading. The angle between two neighbor faces of the
  rabbit mesh is 6.7° (p25), 15.0° (p50), 31.1° (p75), and 62.9° (p90) over 4,568 inner edges.
  Under the one hard spotlight, the many small angles gave a crumpled look of bright and dark
  triangles.
- The normals of the source file lie 6.5° (p50) from the normals of their faces, so the source is
  almost flat too. They are no target.
- 136 of the 3,064 fur faces were 10% to 40% darker than the cream, because the samples of a face
  at the edge of a texture island took the black gaps between the islands.
- The mesh has 3,100 triangles, the budget of a studio body. A subdivision does not fit.

## The method

`studioNormals()` of `src/models/studio-normals.ts` gives each corner of the fur the mean normal
of the fur faces at its vertex within the crease angle of its own face, weighted by the corner
angle. Each body takes its angle from `crease` of `ANIMALS` in `tools/studio-body.ts`.

The facet contrast of a crop is the median of the absolute band-pass of the luminance over its
local mean, in percent. The band-pass is the blur of 1 px less the blur of 6 px, after a scale
that makes the animal 300 px high. The pixels are boxes inside the fur of the torso, the back, and
the legs, with a color rule that drops the props and the eyes (`measure.py`). An RMS in place of
the median followed the shadow edges under the arms, and it did not change with the angle.

The renders come from a Vite dev server of the branch on port 4293. `set-crease.sh <angle|flat>`
puts a temporary crease angle into the three modules. Then `crease-shots.ts` writes the sheet page
of each body (`views.html?sheet=<id>`, at the size and the scale of its sheet) and the play frame
of `boulanger-matin` at 2880 × 1800, 3.5 s after a seek to 30 s:

```bash
docs/research/2026-10-14-rabbit-smooth/set-crease.sh 15
node docs/research/2026-10-14-rabbit-smooth/crease-shots.ts http://localhost:4293/ scratch/crease 15
uv run --no-project --with pillow --with numpy --with scipy python -I \
    docs/research/2026-10-14-rabbit-smooth/measure.py scratch/crease out flat 10 15 20 35 50 65 180
```

The crop sheets show the boxes on each reference crop and on each render
(`crops-rabbit.webp`, `crops-bear.webp`, and `crops-polar.webp`). The sheet references are
`rabbit-views.png`, `bear-views.png`, and `polar-bear-views.png`. The scene reference is
`orchestra-latest.png`: the rabbits of the violin section at the left, the bear conductor from the
back, and the polar bear at the piano.

## The crease angle tables

The full table with the pixel counts is `crease-table.txt`. The last column is the sum of the
differences to the two references.

Rabbit violinist (reference: sheet 4.01%, scene 4.61%):

| Angle | Sheet page | Play frame | Sum of differences |
|---|---|---|---|
| flat | 3.28 | 2.64 | 2.70 |
| 10° | 3.16 | 2.07 | 3.38 |
| 15° | 3.10 | 1.99 | 3.53 |
| 20° | 3.02 | 1.75 | 3.85 |
| 35° | 2.93 | 1.49 | 4.20 |
| 50° | 2.77 | 1.53 | 4.31 |
| 180° | 2.58 | 1.59 | 4.45 |

Bear conductor (reference: sheet 2.05%, scene 2.73%):

| Angle | Sheet page | Play frame | Sum of differences |
|---|---|---|---|
| flat | 2.81 | 4.01 | 2.03 |
| 10° | 2.24 | 3.12 | 0.57 |
| 15° | 1.85 | 2.55 | 0.38 |
| 20° | 1.48 | 2.37 | 0.93 |
| 35° | 1.10 | 1.67 | 2.02 |
| 50° | 1.09 | 1.58 | 2.12 |
| 180° | 1.09 | 1.61 | 2.09 |

Polar bear pianist (reference: sheet 1.21%, scene 2.27%):

| Angle | Sheet page | Play frame | Sum of differences |
|---|---|---|---|
| flat | 2.69 | 3.28 | 2.50 |
| 10° | 2.13 | 2.56 | 1.22 |
| 15° | 1.87 | 2.34 | 0.74 |
| 20° | 1.58 | 1.68 | 0.96 |
| 35° | 1.21 | 0.99 | 1.28 |
| 50° | 1.04 | 0.96 | 1.47 |
| 180° | 1.06 | 0.94 | 1.47 |

The bears take 15°. The reference rabbits have more facet contrast than the flat app rabbit,
because their facets are larger (about 1,150 triangles in `rabbit-views.png`) and the light of the
image model shows each one. The flat look is nearest to them. The user asked for a smoother rabbit,
so it takes 10°, the smooth angle nearest to the references.

## The corrective shapes

`probe-morph.ts` compares the smooth normals of the bind mesh with the smooth normals of the mesh
moved by each arm corrective shape at its full weight, at a crease angle of 40°
(`probe-morph-40.txt`). Each shape moves the skin of a shoulder by 2.1 to 7.1 cm, and turns 48 to
121 corners of a body by more than 10°, at most 39° to 119°. The geometry adds the changes as
morph normals, so a hanging arm does not keep the light of the raised bind arm.

## The shadow terminator

`pnpm close-views conductor`, `pianist`, and `violinist` on main and on the branch
(`close-*-main-branch.webp`, main above the branch, and `conductor-side-main-branch.webp`) show
the self shadow under the arms and at the backs of the legs on both. The smooth normals add no
stair line where the light grazes the fur, so the shadow bias stays.

## The values that stay

`pnpm body-probe --base main` (`body-probe-base-main.txt`) names only the bodies of the rabbit
and its player: their colors changed. The bodies of the bear and the polar bear stay equal,
because the probe reads no normals, and each of the 1,492 pose sets stays equal.
`pnpm rig-mesh rabbit --check` (`rig-mesh-check.txt`) keeps 3,100 triangles, the standing body
within 0.234 mm of the source, and the folds of `pnpm fold-probe violinist` of main: 688 of 17,788
play samples, 112 of 434 lift samples, and 7 faces in each rest sample.

## The colors of the rabbit

`colors-main-branch.txt` gives `colors.py` on the rig of main and on the new rig.
The fur faces that are 10% or more darker than the cream fall from 136 to 55: 125 to 48 at 10% to
20%, and 11 to 7 at 20% to 40%. The mean sRGB color of the bright fur stays (0.96, 0.89, 0.80),
and its spread falls from 0.036 to 0.056 to 0.029 to 0.053. The gloss faces keep their colors.
`dark-faces.py` lists the 55 faces (`dark-faces.txt`): 33 on the paws of the bind arms and 22 on
the toes, on both sides. The texture paints the finger and the toe lines there in a light brown.
