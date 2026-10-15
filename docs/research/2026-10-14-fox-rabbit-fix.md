# The fixes of the red fox and the rabbit (2026-10-14)

This report gives the measures and the probes of the branch `fox-rabbit-fix`. The decisions are in
[`2026-10-14-fox-rabbit-fix.md`](../decisions/2026-10-14-fox-rabbit-fix.md). The probes, the logs,
and the images are in [`2026-10-14-fox-rabbit-fix/`](2026-10-14-fox-rabbit-fix/).

## The requests

On 2026-10-14, the manager listed the faults of the red fox and the rabbit on `main`, and the user
said: "fix them after this round". During the round, the user also said: "the rabbit's arm is
deformed", with a screenshot of a seated rabbit violinist from the back.

## The right arm of the rabbit at rest

`rest-fit.ts` sweeps the rest, the lift, and the lowering of the rabbit on the demos of
`FIT_DEMOS` with hold changes in memory, and counts the folds of the rest, the lift, and the play
on all 14 demos (`STEP=4` or `STEP=8` s for the play). A fold is a face whose posed normal is more
than 90° from its bind normal (`pnpm fold-probe`).

On `main`, the right paw held the bow at the hip (`restBow.lap` along 0.8, offset (0.25, 0.06,
-0.1) H), and the long right arm stood out to the side. Nine faces of the side of the trunk below
the right armpit, with 0.64 to 0.76 of the weight of the right upper arm, turned over in each rest
sample (`fold-violinist-base-5b3e9ee1.txt`, the same faces before the shorter arms). The weight of
the arm corrective shape does not change the count (`rest-pose-rabbit-main.txt`: 15 folded faces
with the weight 0 and 1).

| Grip (along, then the offset in H) | Right elbow | Rest folds | Lift folds | Deepest lowering | Log |
|---|---|---:|---:|---|---|
| 0.8, (0.25, 0.06, -0.1) (`main`) | (1, -0.9, -0.5) | 100% | 29.0% | 2.7 cm, right upper arm in the body | `rest-fit-rabbit-1.txt` |
| 0.8, (0.25, 0.06, -0.1) | (0.5, -1, 0) | 100% | 29.0% | 4.9 cm, right forearm in the body | `rest-fit-rabbit-1.txt` |
| 1.0, (0.25, 0.35, -0.1) | (1, -0.5, -1) | 100% | 29.0% | 3.8 cm, right upper arm | `rest-fit-rabbit-2.txt` |
| 1.0, (0.45, 0.5, -0.4) | (1, -0.9, -0.5) | 100% | 29.0% | 2.4 cm, right upper arm | `rest-fit-rabbit-3.txt` |
| 0.8, (0.5, 0.5, -0.6) (chosen) | (1, -0.9, -0.5) | 0.0% | 16.1% | 1.8 cm, left paw in the violin | `rest-fit-rabbit-4.txt` |
| 0.8, (0.7, 0.5, -0.6) | (1, -0.9, -0.5) | 0.0% | 12.9% | 1.8 cm, left paw in the violin | `rest-fit-rabbit-4.txt` |

Each grip that keeps the paw within 0.45 H of the thigh folds the faces in each rest sample. The
chosen grip is the nearest grip with no fold at rest: the paw holds the bow out and forward over the
right knee, and the arm hangs nearly straight (`rest-pose-rabbit-branch.txt`: no folded face at
rest).
