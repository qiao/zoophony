# The rebuilt arms of the hippo bassist

Date 2026-10-25. Round `hippo-arms`. Decisions:
[`2026-10-25-hippo-arms.md`](../decisions/2026-10-25-hippo-arms.md). The probes and their outputs
are in [`2026-10-25-hippo-arms/`](2026-10-25-hippo-arms/). Each command runs from the root of the
tree. `main` is e9a1a31c.

## 1. The question

The hippo rig had the four old arm bones, a twist bone of the upper arm, three raise shapes, and
a cut of each armpit. The manager listed five open faults: a dark slit on the belly beside the
right arm at rest, play folds in 29.0% of the samples, light slivers at the front of the right
shoulder, a flat shoulder ring of the bow arm, and the right forearm in the body. The round
rebuilds the arms with the method of `docs/agents/rig-blender.md`, in the live Blender through
MCP, and keeps the bow hold, the left hand on the neck, and the skin colors. The review of the
first state asked to remove a dark flap of the right arm root from az-150, the rest folds, the
right twist margin, and the deeper left paw.

## 2. The route

The hanging upper arm of the hippo joins the trunk from the top of the shoulder down to about
y 0.45, near the elbow (y 0.487), and the inner side of the arm lies against the trunk in a deep
crease at |x| 0.173 to 0.199. So the session takes the seam cut and the side wall of the cat and
the fox (`tools/blender/hippo_arms.py`). `blender-cut.webp`, `blender-left.webp`, and
`blender-right.webp` show the cut and the arms in Blender.

| Step | Try | Result |
|---|---|---|
| Seam plane | \|x\| 0.205, then 0.19 | flaps of the inner arm stay on the trunk |
| Seam plane | \|x\| 0.172 at y 0.5, lean 0.15 | the crease goes with the arm (chosen) |
| Forearm | reach 0.05, then 0.075 | flaps on the paw, then the belly goes too |
| Belly | second plane `seam.under` at \|x\| 0.2, lean 0.5 | the belly stays, no pinch of the hole |
| Hole | thin ears of the belly top | Delete Faces on ears below 30° (`step_trim()`) |
| Bake | rays of 0.017 units | black patches on the shoulders; 0.08 fills them |
| UVs | Collapse Edges moved UVs across islands | light stripes; `step_torn_uv()` mends them |

The arms are 1.5 times longer from the socket, as `armFactor` 1.5 made them before, so the reach
stays 0.5391 m. A headless run of the script gives `hippo-arms.glb` and `hippo-weights.json` byte
for byte, as the live session wrote them, and the replay of the fox still gives its bytes.

## 3. The weights

`variants.txt` gives each rig check (`probes/check.sh`, `probes/folds.sh`), and
`probes/faceweights.ts` the weights of named module faces. One face that folds in each sample
sets the share to 100%, so the faces of `pnpm fold-probe --faces` led each step:

- A degenerate quad of the right wall and a thin face at the top of the right arc folded in
  each sample: Triangulate before the clean of the cut, and `step_clean_seam()`.
- A vertex mixes the rule weights by its painted share of the lower bones. The anchor gave the
  inner left forearm a chest share, so it now stops at the upper arm (`anchor.rings`).
- The flap: the back corners of the first ring of the right tube hung 0.6 to 0.8 on the spine
  and spine1, from the Smooth of the paint, so they stayed with the trunk while the bow arm
  turned forward. `step_tube_trunk()` takes these bones off the arm vertices. Shares of 0.2 and
  0.4 and a removal on the round part only folded more or kept the depth.
- With `armSplit` 0.207, the belly took the weights of the free arm. 0.26 lies out of the trunk.
  With the arm vertices off the trunk, `armBelow` from 0.42 to 0.52 lets the socket follow the
  first ring (0.46 to 0.54 and 0.40 to 0.50 folded each play sample, 0.44 to 0.52 32.3%).
- The flip of thin bind faces with corners above 130° turns the crushed faces of the inner right
  elbow: the play folds fall from 20.6% to 9.6% (150°), and 120° gives 9.7%.
- The paws took a mean wrist helper share of 0.26 (`probes/wristshare.ts`). `step_wrist()` takes
  it off the paws and the hand off the rings before the wrist. With no wrist helper on the
  forearm rings, a left forearm face folded in nearly each sample.
- The bent left elbow showed a thin dark line from the back, a band of turned normals with no
  dark face (`elbow-probes-back.webp`). Skin normals within 0.09 units of each elbow remove it,
  and 0.07 does not (`elbow-normals-back.webp`).

## 4. The rest elbow

The segments roll the hanging upper arm from 1/8 at the socket to 7/8 at the elbow, where the
twist bone of `main` rolled the shoulder ring by 0.4. So the same rest roll gave a skin twist of
41 (25 on `main`). `poles-gate.txt` (`probes/poles2.sh`) and `poles-depth.txt`
(`probes/poledepth.sh`) give the rest poles of the right elbow:

| `restPoleR` | Twist at rest | Right forearm in body at rest |
|---|---:|---:|
| (1, -1, 0), before | 41 | 0.0 cm |
| (0.6, -1, 0), chosen | 29 | 0.0 cm |
| (0.5, -1, 0.3) | 30 | 0.0 cm |
| (0.3, -1, 0.3) | 25 | 1.6 cm |
| (0.3, -1, 0) | 24 | 4.8 cm |

## 5. The measures

| Fault | main | Tree | Output |
|---|---|---|---|
| Slit beside the right arm at rest | shows | gone | `pair-e20-right.webp`, `pair-e40-right.webp` |
| Play, lift, rest folds | 29.0%, 9.7%, 0% | 9.7%, 0.0%, 0% | `fold.txt` |
| Faces 114 to 116, 238 (slivers) | light slivers | replaced, no sliver | `pair-e20-az35.webp` |
| Bow arm shoulder ring flat share, play | 0.57 | 0.97 | `shape-main.txt`, `shape.txt` |
| Right forearm in the body | 0.0 cm | 0.0 cm | `depth.txt` |
| Dark flap at the right arm root, az-150 | none | none | `arm-root-az-150.webp` |

`pnpm arm-check bassist --base main` (`gate-bassist.txt`): the right arm passes with a twist of
29 (25), 0 folds (1), and a flat share of 0.84 (0.54, a FAIL on `main`). The left paw twist
stays 174, open as on `main`. The grip turn equals `main`. `gate-all.txt` changes no other role.

`pnpm pose-depth bassist --base main` (`depth.txt`, `depth-bones.txt`, `depth-main.txt` for the
shares of `main`): into the contrabass, the left paw passes 1.5 cm in 27.0% of the play (0.9%),
at most 1.7 cm, inside the 2.0 cm that the user accepted, and the left forearm in 1.6% (19.7%):
the wrist skin counts as paw now. The left forearm goes 2.1 cm in, in 0.1% of the play, and the
right upper arm 2.0 cm in 0.4% of the lowering. The sweep also gives the right upper arm root
4.1 cm to 6.1 cm in the body (0.0 cm): the flat inner side of the tube lies on the seam plane, up
to 0.028 units behind the side wall, and now counts as upper arm. The same depth shows at rest,
and no image shows a clip. The note targets equal `main`.

`pnpm body-probe --base main` (`body-probe.txt`): only the hippo bodies and the hippo player
change, and some pose sets of the conductor and the timpanist with the 1 mm move of the hippo
footprint. `pnpm size --base main` (`size.txt`): 4,029 B more than `main`. `pnpm frame`
(`frame.txt`, first state, the same triangles and bones): the GPU frames take 7.92 ms at p50 and
8.10 ms at p95 (7.88 ms and 8.08 ms in `docs/research/2026-10-25-fox-arms/frame.txt`).

## 6. The images

`pair-e20-<view>.webp` and `pair-e40-<view>.webp` give each moment from eight views, `main` above
the tree, at zoom 2 (`pnpm close-views bassist <dir> --views front,back,left,right,35,-35,150,-150
--zoom 2 --elevation <e> --base main`, then `probes/pairs.py`). `probes/rows.py` and
`probes/probecrop.py` make the crops. `arm-root-az-150.webp` shows the right arm root from
az-150 at both heights with no flap. In `paws-left-3x.webp` and `paws-right-3x.webp`, the left
paw closes on the neck and the right paw holds the bow as on `main`. A light face of the user
texture shows under the right arm root from az150 (`light-face-az150.webp`), and the probes show
a lighter face color with smooth normals (`light-face-probes.webp`).

## 7. The result

The hippo takes the rebuilt arms. The slit, the shoulder slivers, the flat shoulder ring, and the
flap go, the play folds fall to 9.7%, and the rest and the lift fold in no sample. Open: the
depth of the arm root behind the side wall in the sweep, the share of the left paw at the neck,
and the light texture face.
