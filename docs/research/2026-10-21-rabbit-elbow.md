# The flat sheet at the elbow of the rabbit

Date 2026-10-21. Round `rabbit-elbow`. Decisions: none, because the round stopped at the limit of
its fix variants. The probes and their outputs are in
[`2026-10-21-rabbit-elbow/`](2026-10-21-rabbit-elbow/). Each command runs from the root of the
tree. The TypeScript probe imports `../tools/`, so copy `elbow-look.ts` into `scratch/` first.

## 1. The question

The user said: "the rabbit's arm is deformed. Compare that with the original mesh". At the bent
elbow, the bow arm shows a flat sheet with a lit top, a dark underside, and a straight angled end.
It shows best from the back and at azimuth 150, at `tip`, `lift50`, and `crossing`. No measure of
the arm gate or of `pnpm arm-look` sees it. The round needs a measure of the elbow, the cause, and
a fix that keeps the arm gate and the folds.

## 2. The measures

`elbow-look.ts` poses the body over the samples of `pnpm fold-probe`. For each arm, it cuts rings
in the bind and follows their vertices: "above" at 0.85 of the upper arm, "mid" through the elbow
joint normal to the mean of the two bones, and "below" at 0.15 of the forearm. Each value is the
narrow axis of the ring over its wide axis. "Outer" is the distance from the elbow joint to the
skin, away from the bend, over the mean radius of the ring below. The rows give the play median,
right / left.

| Measure | red fox | `main` (51161830) | dome, share 1 (not merged) |
|---|---:|---:|---:|
| Above | 0.95 / 0.86 | 0.57 / 0.65 | 0.70 / 0.77 |
| Mid | 0.91 / 0.94 | 0.63 / 0.79 | 0.71 / 0.86 |
| Below | 0.72 / 0.82 | 0.72 / 0.71 | 0.82 / 0.74 |
| Outer | 0.82 / 1.03 | 0.73 / 0.82 | 0.97 / 1.13 |
| Bind above / mid, right | 0.94 / 0.92 | 0.56 / 0.62 | 0.72 / 0.72 |
| Source 0.85 / mid, right (`src_ratio.py`) | 0.90 / 0.90 | 0.57 / 0.70 | |
| Section (`pnpm arm-look`) | 0.93 / 0.74 | 0.74 / 0.82 | 0.72 / 0.81 |
| Arm gate flat p5, lift | | 0.60 / 0.63 | 0.60 / 0.63 |
| Folds, rest / play / lift | 100% / 5.0% / 21.0% | 0% / 0% / 5.8% | 0% / 0% / 4.8% |
| Arm gate (`--base 51161830`) | | | no `FAIL` |
| Triangles (budget 3,200) | | 3,125 | 3,145 |

The outputs: `elbow-main-rabbit.txt`, `elbow-main-fox.txt`, `elbow-d2a.txt`,
`source-sections.txt`, `arm-look-*.txt`, `arm-check-d2a.txt`, and `rig-check-*.txt`. The fox
values of the folds come from `2026-10-21-arm-form.md`.

```bash
node scratch/elbow-look.ts violinist [--glb <kept glb>] [--bind <obj>] [--dump '<label>' <obj>]
uv run --no-project --with numpy python -I docs/research/2026-10-21-rabbit-elbow/src_ratio.py \
  tools/mesh-rigs/rabbit.json <kept>.corners.json <obj>.arms.json R
```

## 3. The cause

The largest flat patch of each elbow in the play is the cap of the arm of the cut. On the right,
it is faces 92 and 93 of the module, in 4,451 of 4,454 play samples. On the left, it is faces
1052, 1053, 1082, and 1083. All six faces are in `caps` of `src/models/studio/rabbit.ts`.

In `rabbit-4.glb` and in its copy `rabbit-4-arms.glb`, the inner side of each hanging arm joins
the side of the trunk from the middle of the upper arm down past the elbow. No closed loop of the
arm holds the bone axis below the elbow joint (the stations of `elbow_round.py`). The cut
(`cut_seam()` of `tools/blender/rig_mesh.py`) removes 15 joining faces on the right. It closes the
arm with a flat polygon over the arm run [975, 981, 1073, 1019, 1068, 1006, 1007, 1015, 1003].
The run starts at vertex 1003, at 0.46 of the upper arm, and ends at vertex 1073, at 1.29. The cap
has no inner vertex. In the bind, it is one straight side of the arm section, about 9 cm wide, from
0.6 of the upper arm to the forearm (`sections-bind-caps.webp`). The narrow axis of that section is
nearly vertical. So the raised bow arm shows the broad outer side lit and the cap dark under it,
and the elbow ends in the straight edge of the cap (`caps-posed.webp`, the new faces in red).
Where the arm of the user is free, it is round: 0.81 to 0.92 at 0.15 of the forearm.

| Candidate | Proof | Verdict |
|---|---|---|
| (a) `armFactor` 1.63 | With 1.0: above 0.61, mid 0.65. The upper arm is 23.0 cm, the fox 24.8 cm | rejected |
| (b) elbow ring | With no right ring: collapse p50 0.52, and the outer ray misses the skin | rejected, the ring holds the elbow |
| (c) skin of the bend | Bind 0.56 / 0.62, play 0.57 / 0.63, collapse 0.96 | rejected |
| (d) rest shape, twist bone | Neither changes the bind, and the bind gives the play values | rejected |
| (e) flat source | The source is flat only where the arm joins the trunk | partly |
| The flat cap of the cut | Faces 92 and 93, the bind sections | the cause |

## 4. The variants

| Variant | Change | Result |
|---|---|---|
| v1 | Radial move of the free arm vertices near the elbow in a copy (`elbow_round.py`) | 96.3% of the play folds, the cut changes |
| v2 | v1 with the arm run pinned | above 0.59, mid 0.67 |
| d1 | A dome of the cap at the arm radius, with bone heat weights | 94.7% of the play folds, a rest shape fails |
| d2a | A dome of half a circle over each inner cap edge, with the mean weights of the edge (`dome.patch`) | the table above |
| d2b | d2a with the share 0.6 | above 0.67, mid 0.70, outer 0.72 |

d2a raises each measure and passes the gate. The images fail: from azimuth 150 the dome shows as a
jagged pattern of light and dark facets, and from the right side a lit, creased lump hangs under
the elbow (`pairs-tip.webp`). From the back, the end of the arm is still a straight angled cut. The
posed sections are boxes with a notch, and at 0.6 to 0.7 of the upper arm two segments cross
(`sections-dome.webp`). One row of new vertices over a strip of 9 cm cannot give a round side.
After five variants the sheet stays, so the round stopped (brief rule).

The pairs come from
`pnpm close-views violinist <dir> --lineup --glb <d2a glb> --base 51161830 --moments tip,lift50
--views back,150,right,front,left,35 --zoom 1.3`, and `pairs.py` crops a box of a third of the
width around the right elbow in each view.

## 5. The next step

The inner side of the arm needs its own round surface from the middle of the upper arm to the
forearm. A copy of the mesh can free each arm from the trunk there and close it with a round tube
of two or three rings, as `pig_arms.py` of `docs/research/2026-10-21-arm-form/` does for the pig.
Then the cut has no faces to remove below the tube. That change touches the cut rules that earlier
rounds tuned on the armpit: `cut.skinNormals`, `cut.bodyNormals`, and the pinned vertices 975 and
1003 of `rabbit_arms.py`. The budget leaves 75 triangles.
