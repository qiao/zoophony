# The trunk weights at the arm seam of the panda

Date 2026-10-18. Round `panda-seam`. Decisions:
[`2026-10-18-panda-marks.md`](../decisions/2026-10-18-panda-marks.md). The probes and their outputs
are in [`2026-10-18-panda-seam/`](2026-10-18-panda-seam/). Each command runs from the root of the
tree.

## 1. The question

The manager chose (2026-10-18): first trunk weights at the arm seam plus a fix of the folds of
faces 93 and 2115 (option b), then new vertices at the seam inside the budgets (option a). The
goal: a streak share of at most about 5% in the nine boxes of `streak-variants.webp` (16.4% on
`main`), with at most 5% of the play samples with a fold, and the rest and the lift at most 1%
above `main` (0% and 2.2%).

## 2. The measures

`seam-options.patch` holds the trial rules: `weights.armFrom` with a floor and the option
`armFromWeb`, and the cut `refine.seam`. `web-cuts.py` holds the cut `refine.web`. `variants.txt`
gives the config of each variant, `folds.txt` the folds and the most folded faces
(`pnpm fold-probe trombonist --glb <rig>`), and `streak-shares.txt` the shares
(`streaks.py` of `2026-10-18-panda-marks/streaks/`).

| Variant | Change | Streak share | Folds rest / play / lift |
|---|---|---:|---|
| `main` | none | 16.4% | 0% / 0% / 2.2% |
| `af` | trunk weights at the seam (`armFrom` 0.45 to 0.55) | 3.7% (section 4 of the marks report) | 100% / 100% / 100% |
| `w03`, `w05`, `w07` | `af`, and a cut of the 19 edges from the trunk to a forearm (+38 faces) | not measured | 100% / 100% / 100% |
| `k3`, `k5`, `k65` | `af`, with 30%, 50%, or 65% of the upper arm weight kept | not measured | 100% / 100% / 100% |
| `kw5`, `kw3` | `af`, but each corner of an edge to a forearm keeps its upper arm weight | 6.9% | 100% / 100% / 100% |
| `sp19`, `sp20` | `af`, with the arm split at 0.19 or 0.2 | not measured | 100% / 100% / 100% |
| `a3w1` | a cut of the 16 streak edges at 30% from the seam, trunk weights (+32 faces) | 20.1% | 100% / 100% / 100% |
| `a3w7` | the same cut, with 70% of the trunk weights | 21.4% | 0% / 0% / 2.2% |

`web.py` lists the faces 93 and 2115 and the edges from the trunk to a forearm. `seamcut.py`
counts the streak edges of `refine.seam`.

## 3. The result

No variant meets the goal. The cause is one set of vertices with two roles. Where the hanging
forearm of the source touches the belly, the mesh joins the forearm to the trunk with short faces
(edges of 0.02 u to 0.05 u in the source). Their trunk corners, such as 1286 and 1289 on the right,
are also the top corners of the streak faces. With these corners on the upper arm (`main`), the
streak faces turn from the light. With these corners on the trunk (`af`), the faces to the forearm
turn over, because the forearm crosses in front of the belly. A cut of those faces moves the fold
to the new faces (`w05`). Kept upper arm weight on these corners leaves the streaks of the right
side (`kw5`: 6.8% to 14.7% in the right boxes) and folds a face on the left in each sample. New
vertices on the streak faces (`a3w7`) keep the folds, but the short faces near the seam take the
turn and shade as dark as before. `seam-variants.webp` shows `main`, `kw5`, and `a3w7` in the views
of `streak-variants.webp`.

## 4. A gap between the forearms and the belly

On 2026-10-18 the user chose "Move vertices, open a gap (Recommended)". Round `panda-gap` tried a
rig step before the weights (`gap` in `gap/gap-options.patch`): each vertex of the free arm below
the elbow that shares an edge with a vertex outside the free arm moves away from the mean of those
neighbors. The step moves 13 vertices (7 on the left, 6 on the right, `gap/rig-log-gap.txt`), and
64 faces change their shape. `gap/folds.txt`, `gap/streak-shares.txt`, and `gap/variants.txt` give
the measures.

| Variant | Change | Streak share | Folds rest / play / lift |
|---|---|---:|---|
| `main` | none | 16.4% | 0% / 0% / 2.2% |
| `g2` | a gap of 0.0132 u (2.0 cm) | 16.4% | 0% / 100% / 77.4% |
| `g1af` | a gap of 0.0066 u (1.0 cm), and trunk weights at the seam | not measured | 100% / 100% / 100% |
| `g2af` | a gap of 2.0 cm, and trunk weights at the seam | 3.6% | 100% / 100% / 100% |
| `g1kw`, `g2kw` | the gaps, trunk weights, and the corners of the edges to a forearm on the arm | not measured | 100% / 100% / 100% |
| `g2afr` | `g2af`, and relax rules of `raise` on both sides | not measured | 100% / 100% / 100% |

The gap alone keeps the streaks, because the corners on the belly keep their upper arm weight. It
also folds face 1223 of the left arm, a thin face at a moved vertex. With the trunk weights, the
streaks go (`gap/gap-variants.webp`), but faces 93, 2116, 2119, 308, and 92 between the trunk and
the forearm turn over in each sample. A move of a vertex keeps the faces that join the forearm to
the belly. Only a cut of the mesh at the seam separates the two: new vertices for the faces of the
forearm, and new faces that close the forearm and the belly. That cut needs the choice of the user.
