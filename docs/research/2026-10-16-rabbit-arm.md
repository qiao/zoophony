# The right arm of the seated rabbit in the rest

Date 2026-10-16. Branch `rabbit-arm` on `main` at `1c2b2d2b`. The decisions are in
[`2026-10-16-rabbit-arm.md`](../decisions/2026-10-16-rabbit-arm.md). The probes, the logs, and the
images are in [`2026-10-16-rabbit-arm/`](2026-10-16-rabbit-arm/).

## The words of the user

On 2026-10-16 at 22:05, the user said: "the rabbit's arm is deformed in rest pose", with a
screenshot of a seated rabbit of `main` in the rest, from the front right. In the screenshot, the
right upper arm goes out and back toward the chair back, the elbow sticks out behind the body, and
the forearm comes forward to the paw at the right hip. The arm looks like a bent wing. The
reference of the rest is the image of the seated violinist of
[`2026-10-16-bow-rest.md`](2026-10-16-bow-rest.md): both elbows hang near the sides, and the right
hand holds the frog of the upright bow on the right thigh.

## Measures

`pnpm hold-fit violinist --base 56704f33` compares the branch with its first commit, which changes
only the tools of `main` (`hold-fit-rabbit.txt`, all sets on `FIT_DEMOS`). A compare with
`--base main` stops in `checkFormat()`, because the tool of `main` writes the format version 6.

| Measure | Main | Branch | Goal | Log |
|---|---|---|---|---|
| Right elbow above the shoulder joint | -3.7 cm | -19.2 cm | below 0 | `hold-fit-rabbit.txt` |
| Right elbow behind the back of the trunk | -9.2 cm | -21.8 cm | 5 cm | `hold-fit-rabbit.txt` |
| Right elbow out from the side of the trunk | 19.0 cm | 4.6 cm | 8 cm | `hold-fit-rabbit.txt` |
| Right upper arm from the vertical | 81° | 33° | 35° | `hold-fit-rabbit.txt` |
| Folded faces in one rest sample (right arm) | 22 (20) | 7 (4) | right arm 2 | `fold-probe.txt` |
| Rest, play, and lift folds (share of the samples) | 100%, 0.7%, 25.8% | 100%, 0.7%, 25.8% | main + 1 point | `fold-probe.txt` |
| Bow tilt from the vertical | 7° | 7° | 15° | `hold-fit-rabbit.txt` |
| Frog end above the right side of the top of the lap | 0.1 cm | not over it | 3 cm | `hold-fit-rabbit.txt` |
| Frog end above the top of the right knee, and to the skin of the leg | none | 6.0 cm, 18.7 cm | none | `rest-final.txt`, `trunk-side-branch.txt` |
| Bow in the body and in the arms in the rest | 0.1 cm, 0.0 cm | 0.0 cm, 0.0 cm | 0.5 cm | `hold-fit-rabbit.txt` |
| Bow in the body at each 1 cm, lift, rest, and lowering | | at most 0.1 cm | 0.5 cm | `bow-path-branch.txt` |
| Lift depth | 2.2 cm | 2.2 cm | main + 0.5 cm | `hold-fit-rabbit.txt` |
| Rest depth | 2.1 cm | 2.1 cm | main + 0.5 cm | `hold-fit-rabbit.txt` |
| Lower depth | 2.9 cm | 2.3 cm | main + 0.5 cm | `hold-fit-rabbit.txt` |
| Violin in the body in the rest | 1.8 cm | 1.9 cm | 1 cm | `hold-fit-rabbit.txt` |

The compare of the depths in `hold-fit-rabbit.txt` marks two depths `GROWS`: the upper arms in the
body in the rest, 0.2 cm to 0.4 cm, and the forearms in the body while the arms lower, 1.9 cm to
2.3 cm. The upper arms in the body while the arms lower fall from 2.9 cm to 1.1 cm, and the bow from
0.9 cm to 0.0 cm. The play depths do not change.

`pnpm fold-probe violinist --base main --faces 8` (`fold-probe.txt`): the faces 224, 225, 372, and
374 of the right upper arm, at the front of the right armpit, fold in each rest sample of both
trees. The faces 96, 230, and 281 of `main` fold no more. Face 581 of the spine, at the right side of
the belly under the arm, folds in each rest sample of the branch.

`pnpm body-probe --base main` (`body-probe.txt`): the 95 bodies and the 23 players do not change,
and 189 of 1,492 pose sets change. Each changed set is a rest, lift, or lowering set of a seated
rabbit with a violin. `pnpm hold-fit fox-violinist --sets lift,rest,lower --base 56704f33`
(`hold-fit-fox.txt`) gives the same values on both trees.

## The fit

- The right elbow columns of `pnpm hold-fit` measure the trunk at the height of the elbow by the
  triangles of the hips, the spine, and the chest, each moved by its main bone alone
  (`armRest()` of `tools/lap-rest.ts`). The skin of the rabbit gives the side under the armpit a
  part of the weight of the upper arm. In the rest of `main`, the raised arm dragged the posed skin
  of the trunk out to 26.1 cm from the middle at the height of the elbow, and the trunk of the main
  bones reaches 14.4 cm (`trunk-side.ts`, `trunk-side-main.txt`).
- On `main`, the right `hand` bone was 25.2 cm from the shoulder joint, and the arm is 47.0 cm
  long (`trunk-side-main.txt`). So the bent arm put the elbow far out, wherever the pole of the
  elbow pointed.
- The belly of the rabbit is widest below the elbow: 21.6 cm out from the middle and 26.4 cm to the
  front at the height 0.40 m (`trunk-side-branch.txt`). A hanging upper arm goes out around it,
  about 30° from the vertical, and the paw does not reach the top of the right thigh without the
  forearm in the belly.
- `rest-scan.ts` poses one rest sample for each variant of the hold, and rebuilds only the bowed
  rig of the rabbit, so a variant takes about 0.05 s. `variants.py` writes five sets of 240 to
  2,500 variants of the right pole and the grip, and `summary.py` sums up each log
  (`scan-*.txt`).
- Each hold with the forearm forward and down to the knee that meets the elbow goals folds at least
  4 faces of the right arm (`scan-low.txt`, `scan-knee.txt`, `scan-round.txt`, `scan-side.txt`).
  The arm corrective shape of the rig reaches its full weight at the arm of the pose of the sheet,
  43.3° from the vertical (`trunk-side-main.txt`), and these arms hang lower.
- The holds with at most 2 faces lift the forearm and put the paw at the height of the chest, or
  hang the whole arm straight down at the side (`scan-wide.txt`). The straight arm folds 1 or 2
  faces in the rest, but its forearm goes 8.3 cm to 12.4 cm into the body in the lift and the
  lowering (`hold-fit-straight.txt`). It also stands out from the side as a stiff line
  (`zoom-branch-straight.webp`).
- The chosen grip is at the outer side of the right knee, with round values: 0.55 H out from the top
  of the knee, 0.3 H above it, and 0.3 H forward, with the right elbow down and back, (0.3, -1, 1).
  The forearm comes forward and down to the knee, as the forearm of the violinist. A grip 0.15 H
  lower put the upper arm 36° from the vertical in one sample of the fit, and the forearms 3.4 cm
  into the body while the arms lower (`hold-fit-candidates.txt`).
- The zoomed views of `zoom-shot.ts` from the front, the front right, and the right side show no
  fold at the armpit (`zoom-branch-straight.webp`).

## Images

- `rest-front35-beside.webp`: the screenshot of the user, the rabbit of `main`, and the rabbit of
  the branch in the rest, from the front right (`pnpm close-views species`, view `front35`).
- `close-views-species.webp`: `pnpm close-views species rabbit,fox-red <dir> --moment rest --views
  front,front35,side,left --base main`. The red fox does not change.
- `close-views-violinist.webp`: `pnpm close-views violinist <dir> --base main`. Only the rest row
  changes.
- `zoom-branch-straight.webp`: the zoomed branch above the straight arm of `hold-fit-straight.txt`.

## Open problems

- 4 faces of the right armpit fold in each rest sample (goal 2). A change of the arm corrective
  shape of the rig, or a corrective shape for the hanging arm of the seated rest, can remove them.
- The frog end is not over the top of the lap. It hangs 6.0 cm above the top of the right knee, at
  its outer side.
- As on `main`, the violin goes 1.9 cm into the body in the rest (goal 1 cm), and the forearms of
  the lift and the lowering are deeper than the limit of the sweep (1.5 cm).
