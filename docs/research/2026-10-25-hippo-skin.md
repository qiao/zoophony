# The skin of the hippo bassist

Date 2026-10-25. Round `hippo-skin`. Decisions:
[`2026-10-25-hippo-skin.md`](../decisions/2026-10-25-hippo-skin.md). The probes and their outputs
are in [`2026-10-25-hippo-skin/`](2026-10-25-hippo-skin/). Each command runs from the root of the
tree. "main" is `55c4cc17`.

## 1. The question

The manager listed five skin faults of the hippo bassist: a soft dark patch under the left arm
from the left side, also with no shadow, light slivers at the right shoulder, play folds, a slit
on the belly beside the right arm at rest, and a crease line over the right shoulder at the frog.
The round finds the faces of each fault, proves its cause, and fixes the cause where a fix keeps
the arm gate and the depths of main.

## 2. The faces and the causes

`probes/marks.patch` (with `probes/marks.ts`) is a scratch patch of `src/gallery/probe.ts`: the
probe `colors` draws the face index of each face as a color, and `probes/faceat.py` reads the
faces in a box of a close view. `probes/normprobe.ts` gives, for each face, the angle between its
flat posed normal and the normal that the app gives each corner (the bind normal moved by the
skin of its vertex). `probes/shapecrease.ts` gives the crease between face pairs over the play
samples, with each corrective shape on and off.

| Fault | Faces | Cause |
|---|---|---|
| Left patch | 776, 777 (trunk under the left armpit) | Shading: the rim of `rootNormals` gave these trunk faces the mean normal of the turned arm root at corner 441 (arm weight 0.44), 113° from the face at rest |
| Black wedge under the bow arm, from the right | 270 (trunk under the right armpit) | Shading: notch vertex 25 has skin faces that point in opposite directions, and its rim normal turned 108° from face 270 |
| Crease over the right shoulder | edge of 288 and 289 | Geometry from the shape `arm_raise_R`: its relax moves vertex 177 3.6 cm to turn back face 479. With the shape off, the crease is 4.0° (39.3° with it) |
| Slit at rest, from the right | 258, 259 | Geometry of the source: the inner side of the hanging arm lies inside the plane `armSplit`, so the rig keeps it on the trunk, and the hanging rest arm closes it into a V |
| Play folds | 258, 442, 561 (23.2%, 21.6%, 7.9% of the play samples) | The 50° shoulder turn of the bow arm squeezes the chest front. With 40°, they fold in 0.9% or less |
| Slivers | 114, 115, 116, 238 | The same squeeze of the shoulder front. A bow turn of 40° keeps their creases |
| Pizzicato folds | 54, 55, 97, 98 (4.7%) | The paw turns about 134° to 145° on the forearm in pizzicato |

The fold share of main is 28.6% of the play samples. It was 9.5% in
`docs/research/2026-10-19-arm-skin.md`, before the holds of 2026-10-21 and 2026-10-24 moved the
bow arm.

## 3. The fixes

| Change | Faces | main | Branch |
|---|---|---:|---:|
| `rootNormals.armShare` 0.3 | 776 / 777 corner turn, rest | 113° / 102° | 17° / 14° |
| `rootNormals.turn` 60 | 270 corner turn, play 21.09 s | 108° | 21° |
| `spread` of `arm_raise_R` (vertex 177, 1 ring, 4 rounds) | crease 288:289, mean | 39.3° | 5.2° |

Outputs: `normals-main.txt`, `normals-branch.txt` (`node probes/normprobe.ts bassist beethoven-9
rest 21.09 -- <faces>`), `creases-main.txt`, `creases-branch.txt` (`node probes/shapecrease.ts
[--glb <main rig>] beethoven-9 bach-bwv1048 -- <pairs>`). Each variant ran with
`pnpm rig-mesh hippo --check --set <change> --keep <dir>` and `pnpm close-views bassist <dir>
--glb <file>`. `variants/` holds the tables of each rig check:

| Variant | Play folds | Result in the images |
|---|---:|---|
| `armShare` 0.2 | 28.6% | a part of the left patch stays |
| `armShare` 0.3, 0.4 | 28.6% | no patch with no shadow |
| `turn` 45 | 28.6% | a hard crease at the inner left elbow |
| `turn` 60 | 28.6% | the right wedge goes |
| `turn` 90 | 28.6% | the right wedge stays |
| `spread` 1 ring, 4 rounds | 29.0% | no crease line, face 479 folds in 2.7% (1.7%) |
| `spread` 2 rings, 6 rounds | 29.9% | no crease line, the lift folds 12.2% (6.5%) |

The edge of 289 and 480 creases 106.9° (72.8° on main), but face 480 lies under face 289 in each
view (the face marks), and the back views at the elevation 40 lose the shard of main
(`pair-back-e40.webp`).

## 4. The tries that did not ship

- A bow turn of 40° with 50° in pizzicato (a scratch field `BowedHold.reachPizzicato`, and
  `pnpm fold-probe bassist --set 'contrabass@hippo.reach=0.6981'`): 6.6% play folds and each depth
  of main (`variants/pose-depth-reach.txt`), but the right elbow bent less than 2° in 11.7% of
  the play samples (0% at 50°, a scratch trace of the elbow angle), and the right paw turned
  3,045°/s at 0.26 s of a
  lowering of `beethoven-1` (limit 3,000, `pnpm arm-check bassist --demo beethoven-1`).
  With 42° and 45°: 14.8% and 20.5% folds.
- A refit of `arm_raise_R` (`pnpm raise-fit bassist --faces 258,442,561 --side R`), in place of
  the rule or as a fourth rule, with the fades 15° to 45° and `below` -0.4 to 0.5: 42.8% to 100%
  play folds. The clavicle of the rule at 45°: 81.4% at the bow turn of 50°.
- Rigid faces 441, 479, and groups of 479, 288, 289, and 480: the folds moved to faces 564, 304,
  245, or 288.
- A scratch copy of the rig GLB with the shares of the clavicle, the chest, the neck, and the
  spine smoothed over the right chest front (`probes/glbsmooth2.py`): faces 442, 561, and
  258 stopped, and faces 242, 125, 303, 268, and 269 folded in each play sample.
- `weights.armBelow` 0.52 to 0.57, 0.54 to 0.58, and 0.5 to 0.58: 100%, 37.9%, and 100%.
- `weights.armCrease`: the cut of the seam failed (a vertex with two loop edges).
- A hull fill of the notch under the right arm in a copy of the mesh (`tools/blender/arm_root.py
  probes/notch-edit.json`, 6 vertices up to 1.55 cm, `variants/rig18.txt`): the slit got a
  little smaller, and 31.7% of the play samples folded.

## 5. The measures

| Measure | main | Branch | Output |
|---|---:|---:|---|
| Play, lift, and rest folds | 28.6%, 6.5%, 0% | 29.0%, 9.7%, 0% | `fold-main.txt`, `fold-branch.txt` |
| Rim faces | 145 | 59 | `rig-check.txt` |
| Crease 115:116 mean | 47.0° | 53.0° | `creases-*.txt` |
| First download | 788,752 B | 788,569 B | `size.txt` |

`pnpm arm-check bassist --base main` (`gate-bassist.txt`): each value of both arms equals main.
The L paw twist (174°) and the R flat share (0.54) stay over their limits, as on main.
`pnpm arm-check --all --base main` is in `gate-all.txt`. `pnpm pose-depth bassist --base main`
(`pose-depth.txt`): each pair equals main. `pnpm body-probe --base main` (`body-probe.txt`): only
the 5 hippo bodies and the hippo player change, in the normals and the corrective shapes, and all
1,492 pose sets stay equal.

## 6. The images

`pair-left-rest-noshadow.webp` and `pair-left-frog-noshadow.webp`: the left patch with no shadow
goes. With the shadow, the arm casts its shadow on the belly below it. `pair-right-frog.webp` and
`pair-right-tip.webp`: the crease line and the black wedge go. `pair-right-rest.webp`: the slit
stays. `bassist-views.webp` and `bassist-views-main.webp` give each moment from each side and
±35° at the zoom 1.2, and `audit-bassist-e20.webp` and `audit-bassist-e40.webp` the audit sheets
of `pnpm close-views audit` with main above the branch. The paws keep the bow and the neck as on
main.
