# Decisions of the twisted arms of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "the arms for hippo and elephant seem twisted and deformed", with a
screenshot of the app from a camera at the right side of the stage. The user had asked for no
questions on the hippo, so the round `arms-hippo` chose. Another round fixes the elephant. The
report [`2026-10-19-hippo-arms.md`](../research/2026-10-19-hippo-arms.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the bow arm of the hippo is a flat band with dark wedges on the shoulder and a dark slit under the arm. The round makes the arms round in the play, the lift, and the rest (report 2). | 4.4, 5.3 |
| Both armpits take the cut of the panda and the beaver below 0.54 source units (`cut` of `tools/mesh-rigs/hippo.json`): the thin faces of the right armpit fold in no play sample. At 0.50 and 0.52, face 462 folds in each sample. | 4.4 |
| Both elbows point out and forward, the right elbow level, also in pizzicato, and the left elbow a little down (`poleL`, `poleR`, `poleTipR`, `polePizzicato` of `HIPPO_HOLD`): the upper arms turn 96° and 28° from the bind (107° and 80° before). | 5.3 |
| A third shape of `raise` relaxes face 517 at the back of the right shoulder, which folds in each play sample with the level elbow (`raise` R of the new hold). | 4.4 |
| A fourth shape of `raise` bends the left wrist (`bone` hand): the paw turns about 163° on the forearm on the neck, and the wrist faces folded in each sample. No elbow pole changes that turn. | 4.4 |
| `weights.rigid` takes faces 1498 of the left wrist, 51 of the right paw, and 463 of the right shoulder: the rest folds go, and the play samples with a fold fall from 100% to 30.0%. | 4.4 |
| Rejected: a ring at the left wrist (3,205 triangles), a raised pizzicato elbow (11 other faces fold), and rigid weights on faces 116 and 52 (the folds move to the neck and to face 51). | 4.4, 5.3 |
| Accepted: five pairs of `pnpm pose-depth bassist` go 0.6 cm to 0.9 cm deeper, and the right paw 2.2 cm deeper into the contrabass in the lowering (report 4). | 5.3, 9.3 |
| Open: 30.0% of the play samples and 28.7% of the lift samples fold, most at face 116 of the back of the right shoulder (13.7%) and face 52 of the right paw (11.6%). A dark slot stays at the front of the right armpit. | 4.4, 9.3 |
| Open: `pnpm pose-depth --base` fails, because the probe of the commit has no git for the time file of the sweep (`timesFile()` of `tools/pose-depth.ts`). | 9.3 |
