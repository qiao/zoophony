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
| Stage S1 splits `models/biped.ts` into `trunk.ts`, `eyes.ts`, `arms.ts`, and `legs.ts`, with the shared values in `body-frame.ts`. `biped.ts` only makes the frame and calls the trunk, the tail, the arms, and the legs. A probe of each species with each instrument and support, and of 1,560 body variants, gives byte-identical mesh data, skeletons, body points, and shading | 4.4 |
| The eyes have their own module `eyes.ts`, as the ears and the snouts. The trunk agent owns it with `trunk.ts`, `head.ts`, `ears.ts`, `snouts.ts`, and `face-patterns.ts`. The limbs agent owns `arms.ts`, `legs.ts`, and `tails.ts` | 4.4 |
| `body-frame.ts` is the contract of the two tracks: the stance, `H`, the girth, `at()`, the shoulder joints, the clavicles, the hip joints, the tail base, and the shoulder overlap of D2 (`SHOULDER_JOINT`). Neither track changes a value of it alone, because the bind positions of the bones stay equal to `main` (plan 2.6). `arm-joints.test.ts` reads the overlap from it | 4.7 |
| A test of the layout keeps each music stand 0.05 m from each player in each demo, in place of a test of the toes alone. The footprint boxes do not name their bones | 4.5 |
| The head keeps its height of 1.0 H. The head of 1.15 H of spec D1 is out (user, 2026-10-07, D1 of `2026-10-06-cute-furry-spec.md`) | 4.5 |
| No fur for now: no fur shader, no tufts, and no shells. Stages FS and T of the spec drop out (user, 2026-10-07, D3 of the spec) | 4.5 |
| No blush on the faces (user, 2026-10-07, D4 of the spec) | 4.5 |
| The K. 315 soloist stands 1.75 m to the left of the podium center and 0.35 m to the front (1.8 m and 0.3 m before), so that it hides less than 10% of the first violin with the cute heads. The stage of K. 315 grows from 8.98 m to 9.03 m | 4.5 |
| The head keeps its center 1.8 H above the seat and its top 2.3 H above the seat. The drop of 0.06 H of the spec moves the head center and the mouth, and 28 tests of the poses, the holds, the legs, and the shots then fail. The torso top of stage A1 fills the space under the chin in place of the drop | 4.5 |
| `posedPart()` of `pose/test-clearance.ts` poses each corner with its two bones (`posedCorner()`), and `signedDistance()` measures the closed shells of a part: the triangles that share an edge in the bind pose. A welded part on two bones, such as the trunk grid or an arm tube with an elbow blend, is then one closed surface, and a point is inside when it is inside one shell. A test compares the posed corners with the skin of three.js on a blended corner | 9.3 |
| Stage F builds variant d7 of `research/2026-10-07-facet-look.md` on the blended skinned tubes. The body parts get the `fur` finish (crease 10°, 0° since the look track of 2026-10-07, `2026-10-07-look-track.md`). The noses, the inner ears, the teeth, the tusks, the antlers, the horn, the beak, and the pig nose disc keep `matte` (60°), as spec 3.4 of the cute bodies asks | 4.5 |
