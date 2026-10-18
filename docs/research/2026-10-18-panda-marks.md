# The dark marks on the torso of the panda

Date 2026-10-18. Round `panda-marks`. Decisions:
[`2026-10-18-panda-marks.md`](../decisions/2026-10-18-panda-marks.md). The probes and their outputs
are in [`2026-10-18-panda-marks/`](2026-10-18-panda-marks/). Each command runs from the root of the
tree.

## 1. The question

The user said: "there's unexpected black marks on the torso. fix that". The question: which dark
marks does the torso of the panda trombonist show, what is the cause of each mark, and which marks
can a face color rule or a weight rule remove, with no move of a vertex (user rule of 2026-10-10)?

## 2. The measures

`marks-main.webp` numbers each dark mark of `main` in the gallery light, in the rest pose and in the
play pose, from the front, both three-quarter views, and both sides, and in a close shot of the
stage from the back left. `shots.ts` renders the gallery views (600 x 750 px, zoom 1.7), and
`pnpm close-views play <dir> --time 30 --camera -330,-20,15` the stage. `compose.py` writes the
images.

| Mark | Where | Faces of the module | Cause |
|---|---|---|---|
| 1 | black wedges under the right arm | 359, 485, 488, 493 | color: 39% to 46% dark samples |
| 2 | black notch under the left arm | 1943, 2620, 2621 | color: 36% to 46% dark samples |
| 3 | gray streaks under the right arm | 314, 315, 316, 482, 483 | shading of the stretched seam |
| 4 | gray streaks under the left arm | 1232, 1567, 1978, 1979 | shading of the stretched seam |
| 5 | dark band across the belly, play, front | none | cast shadow of the left arm |
| 6 | dark areas on the belly beside the arms | none | cast shadows of the arms and paws |

Three probes separate the causes. A temporary build with no received shadows on the studio body
removes marks 5 and 6 and keeps marks 1 to 4. A temporary build with flat shading keeps marks 1 to
4. The colors of the module give marks 1 and 2: the torso faces are black (Oklab lightness 0.14 to
0.19) or white (0.81 to 0.96), and only two faces have a gray color, 1936 and 1937 at the front of
the left armpit (0.71).

`marks.py` reads the arrays of the rig (`dump.sh`) and the posed meshes of the trombonist
(`posed.ts`: the rest sample and 40 play samples of three demos), and writes `marks-base.txt`:

| Face | Side | Dark samples | Main bone | Area rest | Area play | Turn rest | Upper arm of a corner |
|---:|---|---:|---|---:|---:|---:|---:|
| 359 | R | 46% | upper_arm_R | 1.62 | 1.51 | 39° | 0.72 |
| 485 | R | 46% | upper_arm_R | 1.60 | 1.49 | 34° | 0.73 |
| 488 | R | 46% | upper_arm_R | 1.62 | 1.51 | 34° | 0.73 |
| 493 | R | 39% | upper_arm_R | 1.80 | 1.68 | 28° | 0.73 |
| 1943 | L | 36% | upper_arm_L | 1.13 | 1.18 | 37° | 0.72 |
| 2620 | L | 46% | upper_arm_L | 1.21 | 1.25 | 38° | 0.71 |
| 2621 | L | 46% | upper_arm_L | 1.14 | 1.19 | 35° | 0.67 |
| 315 | R | 0% | upper_arm_R | 1.89 | 1.13 | 24° | 0.70 |
| 316 | R | 0% | spine | 0.82 | 0.47 | 48° | 0.49 |
| 1978 | L | 0% | spine | 1.19 | 1.21 | 36° | 0.58 |

The area is the posed area of the face against the bind area. A face takes black from the share
0.34 of dark texture samples (`eyeShare`), so that the small dark faces of an eye stay dark. The
whole body has 11 faces with 34% to 50% dark samples: the 7 faces of marks 1 and 2, and 4 faces of
the head, 2 of which `colors.patch` already makes light. On the trunk, these 7 faces gave the
lower border of the black band teeth, and the raised arms stretched the teeth to 1.6 to 1.8 times
their bind area.

The corners of marks 3 and 4 lie where the hanging arm of the source touches the trunk (x 0.175 to
0.184, y 0.46 to 0.48). Bone heat gives them 44% to 70% of the upper arm. In the rest pose, the
arm pulls them 8 to 16 cm forward and up, so the long white faces between them and the trunk turn
from the light.

The rule `colors.border` of the round (`rig-log.txt`) gives each dark face of the trunk box with
less than half dark samples the color of the nearest light fur face: the 7 faces of marks 1 and 2.
After the rule, three teeth stay on the trunk: face 1945 (57% dark samples) and the light faces 303
and 1937.

A trial weight rule (`arm-from.py`) faded the upper arm weight of the trunk side below the
armpit, so that the corners of marks 3 and 4 stay on the trunk:

| Variant | Rest folds | Play folds | Lift folds |
|---|---:|---:|---:|
| `colors.border` only | 0% | 0% | 2.2% |
| with `armFrom` 0.45 to 0.55 | 100% | 100% | 100% |
| with `armFrom` 0.46 to 0.52 | 100% | 100% | 100% |
| with `armFrom` 0.44 to 0.60 | 100% | 100% | 100% |

The stretch moves into the long faces from the trunk to the forearm, such as faces 93 and 2115,
which then fold (`arm-from.txt`).

The checks of the round:

| Measure | `3ef40f48` | Round |
|---|---|---|
| Folds, play / lift / rest | 0% / 2.2% / 0% | 0% / 2.2% / 0% |
| Deepest contact | paws in trombone 0.5 cm | paws in trombone 0.5 cm |
| Faces of `colors.border` | none | 7 (3 L, 4 R) |
| Triangles | 3146 | 3146 |
| Packed mesh after gzip | 29,718 B | 29,716 B |
| Shadow band, belly box of the front view | 18.0% | 18.2% |

`fold-probe-base.txt`, `fold-probe-round.txt`, `pose-depth.txt` (`--gaps --base 3ef40f48`),
`rig-mesh-check.txt`, and `band.txt` give the measures. `pnpm body-probe --base 3ef40f48` changes
only the colors of the five panda bodies and of the trombone player (`body-probe.txt`). The rigs of
the fox, the rabbit, the cat, and the dog keep their bytes (`bytes.txt`).

## 3. The result

Marks 1 and 2 are gone (`before-after.webp`). The border of the band under the arms is now a
straight line, and the black fur of the shoulder band, the arms, and the legs keeps the places of
the texture. Marks 5 and 6 are true shadows, and they stay. Marks 3 and 4 stay: no face color
changes a shading, and the weight rule that keeps their corners on the trunk folds faces in each
sample. A fix needs new vertices at the seam or a corrective shape of the side of the trunk.

## 4. The gray streaks and a corrective shape

Round `panda-streaks` tried a corrective shape of the side of the trunk for marks 3 and 4, with no
move of a vertex of the bind mesh. The probes and their outputs are in
[`2026-10-18-panda-marks/streaks/`](2026-10-18-panda-marks/streaks/). `streaks.py` measures the
share of the pixels with an Oklab lightness from 0.3 to 0.62 in a box on each side of the belly,
in nine renders of `shots.ts` (`streak-shares.txt`). The trial options of a rule of `raise`
(`trunkSide`, `pull`, and `spread`) are in `raise-options.patch`, the rule of each variant in
`variants.txt`, and the folds in `folds.txt`.

| Variant | Left boxes | Right boxes | Folds rest / play / lift | Look |
|---|---:|---:|---|---|
| `main` | 15.6% | 17.4% | 0% / 0% / 2.2% | streaks |
| left shape, relax of the arm (`l09_2`) | 2.6% | 17.4% | not measured | black band of the left side gone |
| left shape, relax of the trunk side (`tc`) | 17.2% | 17.4% | not measured | no change |
| left shape, pull to the trunk skin (`q10`) | 17.3% | 17.4% | not measured | no change |
| left shape, pull of the back seam (`f10`) | 21.3% | 17.4% | not measured | a new black wedge |
| left shape, spread of the arm offset (`s24f0`) | 10.4% | 17.4% | 66.7% / 1.6% / 16.1% | smaller streaks, white slivers |
| seam weights on the trunk (`armfrom`) | 4.4% | 2.9% | 100% / 100% / 100% | streaks gone |

The shape `q10` puts the seam corners near their places under the trunk weights, and the streaks
stay. The weights of `armfrom` put the same corners there, and the streaks go. Thus the streaks
come from the normals of the seam corners: the app skins each normal with the weights of its
corner, and a corrective shape only adds a move in the bind pose. A smooth group is not in the
format: each matte face takes the smooth normal of the crease angle of the body
(`studioNormals()` of `src/models/studio-normals.ts`), and a flat normal also follows the weights
of its corners. With the relax rules of `raise` on both sides, the faces 93 and 2115 from the trunk
to the forearm of `armfrom` still fold in each sample (`c1`). `streak-variants.webp` shows `main`,
`s24f0`, and `armfrom` in the views of `before-after.webp`.
