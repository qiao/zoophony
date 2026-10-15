# Decisions of the fixes of the red fox and the rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the manager of the session listed the faults of the red fox and the rabbit on
`main`, and the user said: "fix them after this round". During the round, the user also said:
"the rabbit's arm is deformed", with a screenshot of a seated rabbit violinist from the back. The
manager and the agent of the branch `fox-rabbit-fix` decided the other rows. The report
[`2026-10-14-fox-rabbit-fix.md`](../research/2026-10-14-fox-rabbit-fix.md) gives the measures and
the images. The user can reverse each decision. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| The user: "the rabbit's arm is deformed", with a screenshot of a seated rabbit violinist from the back and a little to its right, with the violin down and the bow low. In the rest pose of `main`, the right paw held the bow at the hip, and the long right arm stood out to the side with the elbow bent. Nine faces of the side of the trunk below the right armpit, with 0.64 to 0.76 of the weight of the right upper arm, turned over in each rest sample and in 29.0% of the lift (faces 224, 225, 386, 412, and others of `pnpm fold-probe violinist --faces 12`). The same faces turned over before the shorter arms of 2026-10-14 (`pnpm fold-probe violinist --base 5b3e9ee1`). Each elbow and grip that keeps the paw near the thigh folds them, and the corrective shape of the arm does not change the count (`rest-fit-rabbit-*.txt`, `rest-pose.ts`). The right paw now holds the bow 0.5 H out from the right thigh, 0.5 H above it, and 0.6 H forward (`restBow.lap` of `SHOULDER_HOLD` in `pose/bowed-rig.ts`, 0.25 H out, 0.06 H up, and 0.1 H forward before), so that the arm hangs down and forward, nearly straight. No face folds at rest, the lift folds in 16.1% of the samples, and the deepest point of the lowering is 1.8 cm (the left paw in the violin, 2.7 cm before for the right upper arm in the body) | 5.2, 5.3 |
