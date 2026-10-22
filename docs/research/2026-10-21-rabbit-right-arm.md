# The right upper arm of the rabbit

Date 2026-10-21. Round `arm-form-3`. Decisions:
[`2026-10-21-arm-form.md`](../decisions/2026-10-21-arm-form.md). The probes and their outputs are
in [`2026-10-21-arm-form/round3/`](2026-10-21-arm-form/round3/), and the edit script is
`rabbit_arms.py` of [`2026-10-21-arm-form/`](2026-10-21-arm-form/). Each command runs from the
root of the tree.

## 1. The question

The user chose "Merge, then right arm". The right (bow) upper arm of the rabbit had a section of
0.60 (0.93 on the red fox, goal 0.74 or more), because a move of the arm run of the right cut
turned over the caps of the body in each rest sample (`2026-10-21-arm-form.md`, section 5). The
fix must give the round arm with no new rest fold.

## 2. The measures

| Measure (play p50, R) | fox | `main` | round |
|---|---:|---:|---:|
| Section (`pnpm arm-look`) | 0.93 | 0.60 | 0.78 |
| Crease share (`pnpm arm-look`) | 7.3% | 6.5% | 7.4% |
| Flat p5 (`pnpm arm-check`) | 0.56 | 0.60 | 0.67 |
| Folds, rest / play / lift (`pnpm fold-probe`) | 100% / 5.0% / 21.0% | 0% / 0% / 5.8% | 0% / 0% / 5.8% |

`rabbit-variants.txt` gives each variant of the edit and of the fades. The other outputs are
`arm-check-all.txt` of `pnpm arm-check --all --base 0bd2e24a` (no `FAIL`), `body-probe.txt` of
`pnpm body-probe --base 0bd2e24a` (only the rabbit bodies and the rabbit violinist change),
`arm-look-all.txt`, and `fold-violinist.txt`. The images come from `pnpm close-views violinist
<dir> --lineup --with fox-violinist --views front,back,left,right,35,-35 --crop 2 --zoom 1.5
--base 0bd2e24a`, and the 3x crops from `--views front,right --crop 3 --box 0.2,0.4,0.6,0.35`.

## 3. The result

The cause is the place of one vertex. The move of the right arm run lifts vertex 1003 from 0.431
to 0.442 u, above the cut top 0.44 u. The cut then keeps one face between the arm and the trunk,
and the relax of the corrective shapes turns over the caps of the body. The weights of the trunk
are not the cause: a level move of the run kept the cut, but folded the play.

`rabbit_arms.py` now pins vertex 1003 only. Then face 224 at the back of the armpit folded at the
start of the lift in 42 samples. The rest shape now fades from 20° to 40° and the play shape from
15° to 40°, which leaves 14 such samples, each of which also folds at the left wrist.

From the right side at the frog, a dark band shows under the right upper arm
(`rabbit-armpit-frog-3x.webp`). The rest views do not change much.

## 4. Round arm-form-4: the dark band

The manager found the dark band under the right upper arm at the frog, from the right side, a
fail of the four views. The outputs are in
[`2026-10-21-arm-form/round4/`](2026-10-21-arm-form/round4/), and `band-measures.txt` gives the
tables.

**Cause.** The band is no cast shadow. With no shadows on the players, the band pixels are 740 on
`main` and 5,839 in round 3 (`no-shadows-frog-right.webp`). The fades of `main` give 5,826, so the
weight of the rest shape in the play is not the cause. The cap normals and the smooth normals are
not the cause: with `cut.skinNormals` false the count stays 5,826. The cause is one face of the
cap at the top of the right cut, between vertices 1003, 1020, and 975. The move of vertex 975 at
the front top of the arm run turns that face down under the raised arm. In the play, the area
near the right arm that faces the right side with a shading normal down is 15.0% (9.9% on `main`,
8.7% on the red fox), and that face alone is 53 cm² of it (`shade-probe.ts`).

**Fix.** Vertex 975 keeps its place too, and the factor of the right arm is 0.3, so the section is
0.74. The rest shape then relaxed the cap at the elbow, and `pnpm arm-check` gave a stretch p95 of
0.24 (0.06 on `main`). It now relaxes the faces below the cosine 0.3 (0.5 before), which gives
0.07. The band pixels are 2,625 with no shadows and 7,428 with shadows (8,246 on `main`), and the
area that faces down is 11.4%.

| Measure (play p50, R) | fox | `main` | round 3 | round 4 |
|---|---:|---:|---:|---:|
| Section | 0.93 | 0.60 | 0.78 | 0.74 |
| Crease share | 7.3% | 6.5% | 7.4% | 6.3% |
| Folds, rest / play / lift | 100% / 5.0% / 21.0% | 0% / 0% / 5.8% | 0% / 0% / 5.8% | 0% / 0% / 5.8% |

The lift fold of face 224 is gone: only the two faces of the left wrist fold in the lift.
`pnpm arm-check --all --base 78f2df0d` gives no `FAIL`, and `pnpm body-probe --base 78f2df0d`
changes only the rabbit bodies and the rabbit violinist.
