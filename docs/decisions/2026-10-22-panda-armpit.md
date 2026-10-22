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
| The rhino keeps its rig. A round patch of the inner side of each arm in a copy of the mesh is the candidate fix of the flat forearm (`arm_patch.py` of the report folder), with `cut.low` for the open edges of its tail. | 4.4 |
