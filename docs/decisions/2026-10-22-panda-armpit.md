# Decisions of the arm seams of the panda and the rhino

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "the panda and rhino's arms also got deformed". The agent of the
round `panda-armpit` decided the rows. The report
[`2026-10-22-panda-armpit.md`](../research/2026-10-22-panda-armpit.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the panda and rhino's arms also got deformed". The panda free arm takes the back lips of each notch at the arm root, and the cut removes its fins (`weights.armFree.root`, `cut.fins` of `tools/mesh-rigs/panda.json`). | 4.4 |
| The front lips stay on the trunk, because in the free arm the arm caps took their white and a white tag showed under the elbow (`armFree.root.depths`). | 4.4 |
| Two shapes of the right arm fit the lift folds of the back lips and of the shoulder front, so the panda keeps 0% folds (`raise` of `panda.json`, the limit of 4 shapes). | 4.4 |
| Manager: the gate accepts the flat p5 of the panda lift, 0.69 and 0.71 (0.80 and 0.84 before, limit 0.55). The flap and the jagged faces are gone in the crop pairs of each moment, and no crop shows a flat arm. | 9.3 |
