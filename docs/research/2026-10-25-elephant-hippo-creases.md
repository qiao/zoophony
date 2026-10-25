# The creases of the elephant timpanist and the hippo bassist

Date 2026-10-25. Round `elephant-hippo-creases`. Decisions:
[`2026-10-25-elephant-hippo-creases.md`](../decisions/2026-10-25-elephant-hippo-creases.md). The
probes and their outputs are in
[`2026-10-25-elephant-hippo-creases/`](2026-10-25-elephant-hippo-creases/). Each command runs
from the root of the tree. "main" is `08c16704`. The frame compare ran on `bbcbec18`, before the fox round.

## 1. The question

The manager gave three faults: the elephant upper arms go 3.4 cm into the belly near the elbow,
short light and dark creases show at each inner elbow of the elephant from the front, and a dark
crease shows under the left arm of the hippo bassist. For each crease, the round first proves
the cause: a split of the smooth normals (shading) or folded faces.

## 2. The cause of the creases

The app makes the smooth normals one time from the bind mesh, with the crease angle 35 of
`ANIMALS`, and then moves them with the bones (`studioNormals()`). A crease that the bind splits
stays split in each pose.

```text
 bind mesh --crease 35--> corner normals --skin matrices--> posed normals --> light
   elbow bent 62° in the bind: the faces of the inner elbow meet at more than 35°
   --> each face keeps its own normal --> a light or dark band on the bent arm
```

Four probes decide it:

- `--probe colors` of `pnpm close-views`: no dark face at the elbows of the elephant or under the
  arm of the hippo (`hippo-probes-left.webp`).
- `--probe noshadow`: the elbow creases and the hard edge under the hippo arm stay with no shadow
  (`elbow-noshadow.webp`, `hippo-probes-left.webp`).
- `pnpm fold-probe <role> --faces 12` (`fold-timpanist-main.txt`, `fold-bassist-main.txt`): no
  folded face lies at an elephant elbow. The folds lie at the clavicles and the left paw. The
  left arm of the hippo folds only face 763 of the chest, in 0.9% of the play samples.
- `probes/normal-split.ts` (`normal-split.txt`, run by `probes/normal-split.sh`): the faces near a
  joint whose corner normal differs from the whole skin normal by more than 10°.

| Body, joint, radius | Faces | Split faces, main | Largest split, main | Split faces, tree |
|---|---:|---:|---:|---:|
| elephant, L elbow, 0.14 m | 289 | 112 | 49.2° | 19 |
| elephant, R elbow, 0.14 m | 293 | 95 | 54.0° | 13 |
| hippo, L shoulder, 0.2 m | 116 | 80 | 138.5° | 16 |
| hippo, R shoulder, 0.2 m | 107 | 75 | 164.5° | 18 |

The bind bends each elephant elbow 62° (the angle of the upper arm and the forearm in `heads` of
`src/models/studio/elephant.ts`). Both creases are shading.

## 3. The normals

`root_rim()` of `tools/blender/rig_mesh.py` takes the new radius `rootNormals.elbow` around the
head of each forearm. Each variant: `pnpm rig-mesh <animal> --check --set rootNormals=@<file>
--keep <dir>`, then `pnpm close-views <role> <dir> --glb <file>`.

| Body | Radius u | Rim faces | Result in the 2x cells |
|---|---:|---:|---|
| elephant, elbow | 0.055 | 125 | light slivers stay at both inner elbows |
| elephant, elbow | 0.06 | 241 | fewer slivers |
| **elephant, elbow** | **0.07** | **497** | smooth inner elbows, the facets of the arms stay |
| elephant, elbow | 0.08 | 687 | as 0.07, with fewer facets on the forearms |
| hippo, shoulder | 0.07 | 34 | a hard edge stays under the forearm |
| hippo, shoulder | 0.085 | 81 | a soft edge |
| **hippo, shoulder** | **0.1** | **145** | a soft edge, the facets stay |
| hippo, shoulder | 0.14, 0.18 | 251, 385 | the arms and the shoulders lose facets at ±35° |

Images: `elbow-normals.webp` (the normals probe, main and 0.07), `elbow-radii-*.webp`,
`hippo-radii-left.webp`, `hippo-radii-views.webp`, and `hippo-noshadow-radii.webp`. On the hippo,
each radius changes the hard dark band under the arm into a soft dark patch at the inner elbow.
The patch also shows with no shadow, so the smooth normals of the skin there point down and away
from the light.

## 4. The elbows of the timpani

`probes/pd-poles.sh` (`pd-poles.txt`, all four demos) and `probes/pd-poles2.sh` (`pd-poles2.txt`,
`beethoven-1`) sweep the elbow poles of `PERCUSSION_HOLDS.timpani`. The pole turns the elbow
around the line from the shoulder to the wrist, so the wrist, the mallet target, and the strike
direction stay.

| Pole x, y, z | Upper arms in body cm | Forearms in body cm | Mallets in kettles cm |
|---|---:|---:|---:|
| 0.45, -1, 0.2 (main) | 3.4 | 1.5 | 1.6 |
| 0.6, -1, 0.2 | 3.1 | 1.0 | 1.8 |
| **0.8, -1, 0.2** | **2.9** | **0.6** | **2.0** |
| 1, -1, 0.2 | 2.9 | 0.4 | 2.1 |
| 0.8, -1, -0.3 (beethoven-1) | 2.7 | 0.4 | 2.1 |
| 1.2, -1, 0.2 (beethoven-1) | 2.7 | 0.4 | 2.1 |

The deepest corners lie on the inner side of the right upper arm at 0.71 of its length
(`pnpm pose-depth timpanist --where upperArmR beethoven-8-4:565.34`). No pole brings them below
2.7 cm. In the arm gate against main (`probes/gate-poles.sh`, `gate-poles.txt`), the upper arm
twist p95 grows from 18° and 20° to 22° and 24° at 0.6 and to 26° and 29° at 0.8 (limit 55),
and both pass. At 1.0, and at 0.8 with the elbows forward (z 0), the twist fails the margin
against main. So 0.8 is the farthest pole that passes. The back views show no
gap between the arms and the trunk at 0.8 (`poles-back.webp`, `poles-front.webp`).

`probes/grip-poles.sh` (`mallets.txt`, the probe `grip.ts` of `2026-10-19-elephant-grip/`) gives
the mallet angles. At a strike, each mallet keeps its pitch and its turn of main (-21° to -26°).
Between strikes, a mallet turns at most 10° in the top view and 4° in pitch (the left mallet of
`beethoven-1`). More strikes land within 5 mm: 49 and 41 against 28 and 27.

## 5. The measures

`pnpm arm-check timpanist bassist --base main` (`gate.txt`, main in brackets):

| Role | Arm | Folds | Twist | Forearm twist | Flat | Paw twist | Grip turn | Move turn | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| timpanist | L | 4 (3) | 26 (18) | 8 (9) | 0.82 (0.83) | 18 (20) | 4 (7) | 82 (63) | PASS |
| timpanist | R | 3 (2) | 29 (20) | 5 (5) | 0.78 (0.76) | 9 (10) | 0 (4) | 147 (8) | PASS |
| bassist | L | 0 (0) | 18 (18) | 58 (58) | 0.65 (0.65) | 174 (174) | 5 (5) | 50 (50) | OPEN |
| bassist | R | 1 (1) | 25 (25) | 24 (24) | 0.54 (0.54) | 70 (70) | 5 (5) | 1450 (1450) | OPEN |

The OPEN values of the bassist equal main. The right flat share of the elephant goes from 0.76 to
0.78.

`pnpm pose-depth timpanist --base main` (`pose-depth-timpanist.txt`, cm, main in brackets):

| Pair | Play | Lift | Rest | Lowering |
|---|---|---|---|---|
| Upper arms in the body | 2.9 (3.4) | 2.9 (3.3) | 2.9 (3.3) | 2.9 (3.3) |
| Forearms in the body | 0.6 (1.5) | 0.6 (1.4) | 0.6 (1.4) | 0.6 (1.4) |
| Mallets in the kettles | 2.0 (1.6) | 0.5 (0.0) | | |

`pnpm pose-depth bassist --base main` (`pose-depth-bassist.txt`): each pair equals main.

The twist steps (`node docs/research/2026-10-24-violin-arms/twist-steps.ts timpanist 0.25`,
`twist-timpanist.txt`, `twist-timpanist-main.txt`): the largest step between two neighbor arm
bones is 16.3° on the left upper arm (11.7°) and 14.7° on the right (10.4°), below the goal 25°.
The hold of the hippo does not change, so its steps stay those of main.

`pnpm body-probe --base main` (`body-probe.txt`): only the 5 elephant bodies, the 5 hippo bodies,
and their two players change, in their normals, and only the 16 pose sets of the timpanist change.

`pnpm size --base main` (`size.txt`): 787,629 B, 1,439 B more than main, for the two lists of rim
faces. The limit is 1,000,000 B.

`pnpm frame-compare main HEAD --runs 1` (`frame.txt`, ms, one run of each item under
`tools/measure-lock.sh`):

| Item | Main thread p50 / p95 | GPU p50 / p95 | Frame rate with no cap |
|---|---|---|---|
| main | 3.89 / 5.10 | 7.83 / 8.02 | 132.5 fps |
| branch | 3.92 / 5.16 | 7.83 / 8.03 | 132.7 fps |

The rule adds no bone and no draw. Both items fail the frame target of design 9.7, as on main.
The frozen shots change only in the normals of the two bodies and the elbows of the timpanist
(at most 0.02% of the pixels by more than 16).

## 6. The images

`timpanist-views.webp`, `bassist-views.webp`, and their `-main` grids give each moment from the
front, each side, the back, and ±35° at the zoom 2. The `-e40` grids give the elevation 40 with
az150 and az-150. `crop-timpanist-front.webp` and `crop-bassist-left.webp` are 2x crop pairs. The
paws hold the mallets and the bow as on main, and no prop floats or goes into the skin.

## 7. The open faults

- The elephant upper arms go 2.9 cm into the belly (1.8 cm before the arm tubes). The hold cannot
  go below 2.7 cm. The elbow helper turns the inner upper arm into the belly
  (`docs/agents/rig-blender.md`, "A thick arm").
- A soft dark patch stays at the inner left elbow of the hippo from the left side, also with no
  shadow. The round did not find which faces give it. The split faces near the hippo elbows
  stay (`normal-split.txt`).
- A short light sliver stays at the inner root of the right elephant arm, near the tusk.
- The right flat share of the elephant is 0.78 (main 0.76, the arm gate before the tubes 0.87).
