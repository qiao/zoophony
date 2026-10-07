# Decisions of the skinned bodies

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user approved option B of
[`research/2026-10-06-skinned-bodies-plan.md`](../research/2026-10-06-skinned-bodies-plan.md):
one welded mesh for each body, with smooth skin weights at the joints. The user decided D1 and
D2 of section 5 of the plan. The agent of stage S0 (the skin data) decided the other rows. The
agents of the later stages add their rows to this file. The user can reverse each row. Then
update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Each stage of the plan merges into the local `main`. The user decides when to push it, and thus when GitHub Pages deploys the stages (user, D1) | 9.2 |
| If the shoulder spike (stage S) fails, the shoulder uses the simple overlap: the arm overlaps the torso, and only its top rings blend from `shoulder` to `upperArm` (user, D2) | 4.7 |
| The second bone has a weight of at most 0.5, so the main bone (`MeshData.bones`) is the bone with the larger weight. The footprints, the chair clearance, the occlusion, the silhouettes, and the budgets keep one bone for each corner, with no change of their code | 4.7 |
| A rigid corner stores its main bone as its second bone, with the weight 0. The skin of the GPU is then `(bone, bone)` with the weights `(1, 0)`, and the posed position stays the same | 4.7 |
| A skin rule reads the bind position of a corner after the placement of its part, in the model axes. Thus a rule compares a corner directly with the bind positions of the bones (`Skeleton.positions`), which use the same axes | 4.7 |
| The baked occlusion keys its discs and its bone table by the main bone. A corner with two bones has one position, so the weld and the crease normals need no change | 4.5 |
| The posing helper of the tests is `posedCorner()` in the new file `pose/test-skin.ts`. A test in `scene/player.test.ts` compares it with `SkinnedMesh.getVertexPosition()` of three.js in three poses, within 1e-6 m | 4.7 |
