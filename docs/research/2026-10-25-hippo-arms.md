# The rebuilt arms of the hippo bassist

Date 2026-10-25. Round `hippo-arms`. Decisions:
[`2026-10-25-hippo-arms.md`](../decisions/2026-10-25-hippo-arms.md). The probes and their outputs
are in [`2026-10-25-hippo-arms/`](2026-10-25-hippo-arms/). Each command runs from the root of the
tree. `main` is cf42d8bf.

## 1. The question

The hippo rig had the four old arm bones, a twist bone of the upper arm, three raise shapes, and
a cut of each armpit. The manager listed five open faults: a dark slit on the belly beside the
right arm at rest, play folds in 29.0% of the samples, light slivers at the front of the right
shoulder, a flat shoulder ring of the bow arm (0.68, goal 0.80), and the right forearm in the
body. The round rebuilds the arms with the method of `docs/agents/rig-blender.md`, in the live
Blender through MCP, and keeps the bow hold, the left hand on the neck, and the skin colors.

## 2. The route

The hanging upper arm of the hippo joins the trunk from the top of the shoulder down to about
y 0.45, near the elbow (y 0.487), and the inner side of the arm lies against the trunk in a deep
crease at |x| 0.173 to 0.199. So the session takes the seam cut and the side wall of the cat and
the fox (`tools/blender/hippo_arms.py`). `blender-cut.webp`, `blender-left.webp`, and
`blender-right.webp` show the cut and the finished arms in Blender.

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

`variants.txt` gives each rig check (`probes/check.sh`, `probes/folds.sh`). One face that folds
in each sample sets the share to 100%, so the faces of `pnpm fold-probe --faces` led each step:

- A degenerate quad of the right wall and a thin face at the top of the right arc folded in
  each sample: Triangulate before the clean of the cut, and `step_clean_seam()`.
- A vertex mixes the rule weights by its painted share of the lower bones. The anchor gave the
  inner left forearm a chest share, so it now stops at the upper arm (`anchor.rings`).
- With `armSplit` 0.207, the belly took the weights of the free arm. 0.26 lies out of the trunk.
- With `armBelow` 0.5 to 0.56, 87.5% of the play folded at the root of the right tube. Starts
  from 0.42 to 0.48 give 20.0% to 20.5%.
- Four Smooth rounds (ten spread the short arm over four segments), an elbow gap of 0.026, and
  the flip change keep the inner right elbow to 1,482 play samples (8,464 before the flip).
- A helper of 0.052 in the Blender bind folded 36.1% of the play, and 0.044 20.0%.

The rejected tries are in `variants.txt`. The bent left elbow showed a thin dark line from the
back, a band of turned normals with no dark face (`elbow-probes-back.webp`). The skin normals
within 0.09 units of each elbow remove it, and 0.07 does not (`elbow-normals-back.webp`).

## 4. The measures

| Fault | main | Tree | Output |
|---|---|---|---|
| Slit beside the right arm at rest | shows | gone | `pair-e20-right.webp`, `pair-e40-right.webp` |
| Play folds | 29.0% | 20.0% | `fold.txt` |
| Faces 114 to 116, 238 (slivers) | light slivers | replaced, no sliver | `pair-e20-az35.webp` |
| Bow arm shoulder ring flat share, play | 0.57 | 0.88 | `shape-main.txt`, `shape.txt` |
| Arm parts in the body | 0.0 cm | 0.0 cm | `depth.txt` |

The rest folds go from 0% to 100% of the 9 rest samples (5 faces), and the lift folds from 9.7%
to 19.0%. These faces turn over against the bind: the bind bends the thick elbows 62° and
crushes the inner right elbow and the trunk at the back of the right arm root. At rest the skin
takes the source form back, and the views show no fold there.

`pnpm arm-check bassist --base main` (`gate-bassist.txt`): the right flat share goes from 0.54
(FAIL on `main`) to 0.82, and the left from 0.65 to 0.81. The left paw twist stays 174 (FAIL on
`main` too, from the hold on the neck). The right twist at rest fails on the margin: 40 against
25, inside the limit 55, because the segments roll the hanging bow arm from 1/8 at the socket to
7/8 at the elbow, where the twist bone rolled the shoulder ring by 0.4. The right folds p95 go from
1 to 3 (limit 8). The grip turn and the paw twists equal `main`. `pnpm arm-check --all --base main`
is in `gate-all.txt`.

`pnpm pose-depth bassist --base main` (`depth.txt`, `depth-bones.txt`): into the contrabass, the
left forearm goes 2.1 cm (1.5 cm) in the play, 0.1% of the samples over 2.0 cm, and the right
upper arm 2.0 cm (0.9 cm) in the lowering, 0.4% over 2.0 cm. The share of the forearms over
1.5 cm in the play falls from 19.7% to 13.0%. The left paw on the neck goes at most 1.8 cm in
(1.5 cm), inside the contact of 2.0 cm that the user accepted on 2026-10-21, but over 1.5 cm in
39.9% of the play samples (0.9%) and 36.2% of the lift (2.9%). The note targets equal `main`
(`depth-main.txt`: `pnpm pose-depth bassist` on `main` f04b4e58, whose hippo equals cf42d8bf).

`pnpm body-probe --base main` (`body-probe.txt`): the 5 hippo bodies and the hippo player
change. Some pose sets of the conductor and the timpanist change too: the hippo footprint moves
by 1 mm, and the layout with it. `pnpm size --base main` (`size.txt`): 793,702 B, 4,233 B more
than `main`, for 502 more triangles, 20 more bones, and the skin normal faces of the elbows.
`pnpm frame` (`frame.txt`): the GPU frames take 7.92 ms at p50 and 8.10 ms at p95 (7.88 ms and
8.08 ms in `docs/research/2026-10-25-fox-arms/frame.txt`), and the frame target of design 9.7
fails, as on the recent bases.

## 5. The images

`pair-e20-<view>.webp` and `pair-e40-<view>.webp` give each moment from eight views, `main` above
the tree, at zoom 2. In `paws-left-3x.webp` and `paws-right-3x.webp`, the left paw closes on the
neck and the right paw holds the bow as on `main`. Open: from az-150, the back of the right arm
root shows past the trunk as a dark flat piece in the play (`arm-root-az-150.webp`), also with no
shadow. A smaller anchor makes it smaller, but folds 35.6% of the play. From az150, a light face
of the user texture shows under the right arm root, beside the shadow of the arm
(`light-face-az150.webp`, `light-face-probes.webp`).

## 6. The result

The hippo takes the rebuilt arms. The slit, the shoulder slivers, and the flat shoulder ring go,
and the play folds fall to 20.0%. Open: the rest and lift folds against the bind, the dark arm
root piece from az-150, the right twist margin, and two deeper contrabass samples.
