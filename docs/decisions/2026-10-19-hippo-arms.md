# Decisions of the twisted arms of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "the arms for hippo and elephant seem twisted and deformed", with a
screenshot of the app from a camera at the right side of the stage. The user had asked for no
questions on the hippo, so the rounds `arms-hippo` and `arms-hippo2` chose. Another round fixes
the elephant. The report [`2026-10-19-hippo-arms.md`](../research/2026-10-19-hippo-arms.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the bow arm of the hippo is a flat band with dark wedges on the shoulder and a dark slit under the arm. The round makes the arms round in the play, the lift, and the rest (report 2). | 4.4, 5.3 |
| The left elbow points out and forward, a little down (`poleL` of `HIPPO_HOLD`): the left upper arm turns 28° from the bind (80° before). The right elbow follows `2026-10-19-arm-skin.md`. | 5.3 |
| Rejected: a ring at the left wrist (3,205 triangles), a raised pizzicato elbow (11 other faces fold), and rigid weights on face 116 (the folds move to the neck). | 4.4, 5.3 |
| Accepted: four pairs of `pnpm pose-depth bassist` go 0.6 cm to 0.9 cm deeper, and the right paw 2.2 cm deeper into the contrabass in the lowering (report 4). | 5.3, 9.3 |
| Round 2: the arm weights fade into the neck from 0.625 to 0.7 source units (`armTop`). Face 116 folds in no sample (13.7% before), and other fades fail a relax (report 5). | 4.4 |
| Rejected: 35 pizzicato holds and a shape of the pizzicato pose (the folds move or stay), and the elbow shape with all arm turns (chest faces 463, 336, and 337 fold). | 4.4, 5.3 |
