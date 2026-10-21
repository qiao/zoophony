# The arms of the rabbit against the source mesh

Date 2026-10-21. Round `rabbit-arm`, base `008612b3`. Decisions:
[`2026-10-21-rabbit-armpit.md`](../decisions/2026-10-21-rabbit-armpit.md). The probes and their
outputs are in [`2026-10-21-rabbit-arm/`](2026-10-21-rabbit-arm/). Each command runs from the
root of the tree. The probes read `scratch/`, so copy a probe to `scratch/` before you run it.
The rounds before are [`2026-10-21-rabbit-armpit.md`](2026-10-21-rabbit-armpit.md) and
[`2026-10-21-rabbit-notch.md`](2026-10-21-rabbit-notch.md).

## 1. The question

The user said: "the arm for the rabbit is still problematic. check the original model at
~/Downloads/Meshy_AI_rabbit_remesh_3k_1021175632_texture.glb". That file has the SHA-256 of
`assets/models/rabbit/rabbit-4.glb`, so the source is right and the rig or the app makes the
defects. The manager saw dark zigzag lines and black wedges along the seam between the arm and the
trunk in the role views, and pinched shoulders. The goal: find each place where the app departs
from the source, find the cause of the dark lines, and fix what the rig can fix.

## 2. The places where the app departs from the source

`source/` holds 8 Blender renders of `rabbit-4.glb` at its own pose (workbench light, no cast
shadow): the arms hang about 35° out, and the shoulders slope smoothly into the arms.
`lineup.webp` puts each beside the role view of `main`, of the round, and of `main` with no
shadow on the rabbit (a temporary `receiveShadow = false` of `src/scene/player.ts`).

| Place | In the app | Effect |
|---|---|---|
| Arm length | `armFactor` 1.63 for the reach of the violin | longer arms than the source |
| Bind arms | `studio.bindArms`, about 45° out | none in the bind (Blender view of the rig file) |
| Cut of 2026-10-20 | the arm is apart from the trunk below 0.44 units | a narrow crease between the arm and the trunk |
| Caps and rim | `cut.bodyNormals` "R" on `main` | a black spike at the left seam (lift50-left) |
| Notch edit | 21 trunk vertices out, at most 1.2 cm | a shallow hollow under the bow arm |
| Weights at the shoulder | `clavicleFrom`, `armTop`, `shoulderHead`, `armSplit` | the middle ring of the upper arm keeps 0.62 to 0.81 of its narrow axis |
| Roll of the upper arm | no twist bone on `main` | the right upper arm rolls 49° (p95) |
| Light | hard key light, shadows on the players | black wedges and stair steps along the seam |

A render with the cut faces in pure colors (a temporary patch of `src/scene/player.ts`) shows that
the black wedges of lift50-left, frog-right, and rest-right are on skin faces of the trunk and the
arm, outside the faces of the cut. The render with no shadow on the rabbit removes them, except a black
spike at the seam of the left cut, whose caps and rim kept their own normals.

## 3. The measures

`seam-faces.ts` lists 159 faces: the faces of both cuts and each face that shares a vertex with
them. A render with these faces in magenta and the rest in gray, with no light (`close-seam`),
gives the mask of the seam in each of the 28 role views (7 moments, 4 views, both arms).
`seammetric.py` counts the black pixels (Oklab lightness below 0.3) and the sharp edges (a change
above 0.05 for each pixel) in the mask grown by 4 px (`seam-variants.txt`, `seam-final.txt`).

| Variant | Black px | Sharp edges | Note |
|---|---:|---:|---|
| `main` | 44,879 | 42,734 | |
| no shadow on the rabbit (light test) | 21,336 | 33,346 | the wedges and the steps go |
| shadow normal bias 0.3 times (light test) | 49,362 | 42,908 | thinner wedges, the steps stay |
| `cut.bodyNormals` "LR" | 44,340 | 42,663 | the left spike goes |
| crease 45° | 44,339 | 41,784 | |
| "LR" and crease 45° | 43,765 | 41,832 | |
| "LR" and `upperTwist` 0.4 | 44,641 | 43,908 | |
| "LR" and `upperTwist` 0.5 (chosen) | 43,914 | 43,836 | |

The normals and the twist bone move the seam counts by at most 2.5%. The shadow of the arm on the
trunk holds about half of the black pixels of the seam. Its edges have the steps of the shadow map,
which covers the whole stage. A smaller normal bias does not remove the steps. The light is the
same for each species, and the user chose dark shade sides (`FILL.players`), so this round keeps
the light and leaves the choice to the user.

`pnpm arm-shape violinist --step 1 --glb <file>` gives the roll and the rings
(`arm-shape-*.txt`):

| Variant | Right twist p50 / p95 | Right flat p5, play / lift | Play folds |
|---|---:|---:|---:|
| `main` | 35° / 48° | 0.68 / 0.64 | 0.2% |
| "LR" and `upperTwist` 0.4 | 20° / 28° | 0.66 / 0.61 | 0.0% |
| "LR" and `upperTwist` 0.5 (chosen) | 20° / 28° | 0.68 / 0.62 | 0.0% |

## 4. The result

The rabbit takes `cut.bodyNormals` "LR" and a twist bone of each upper arm with half of the roll.
The black spike at the left seam goes (`left-seam-pair.webp`), and the role views keep their look
otherwise (`role-pairs.webp`, `main` on the left).

- `pnpm arm-check violinist --base 008612b3` passes (`arm-check-violinist.txt`): the right twist
  p95 falls from 49 to 28, and the right flat p5 from 0.64 to 0.62. `pnpm arm-check --all --base
  008612b3` gives no `FAIL` (`arm-check-all.txt`).
- `pnpm fold-probe violinist`: 0% of the play (0.2% before), 6.2% of the lift, 0% of the rest
  (`fold-probe.txt`).
- `pnpm body-probe --base 008612b3` changes only the 5 rabbit bodies and the rabbit violin player,
  and all 1,492 pose sets equal (`body-probe.txt`).
- `pnpm pose-depth violinist --base 008612b3` keeps each depth within 0.1 cm
  (`pose-depth-base.txt`). For the standing soloist, the violin in the body grows from 1.8 to
  2.3 cm in the lift and to 2.2 cm in the lowering, a pair with no limit
  (`pose-depth-soloist-base.txt`). The standing views keep their look.

The shadows of the arms and the flat rings of the upper arms stay open. The rig cannot remove the
shadows, and a fix of the rings needs a new bind arm or a new shape.
