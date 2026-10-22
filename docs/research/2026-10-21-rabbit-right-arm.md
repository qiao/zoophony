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
