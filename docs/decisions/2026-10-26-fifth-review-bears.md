# Decisions of the fifth review of the bears

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent issues with images: "there's black area under the bear's armpit" and
"the polar bear's knees are more bulky than it should be". The user also said that the earlier
decision files can be wrong. The round `fifth-bears` worked in its own worktree. The measures are
in [`2026-10-26-fifth-bears.md`](../research/2026-10-26-fifth-bears.md). The user can reverse each
decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "there's black area under the bear's armpit". The arm rebuild of the bear bakes the fur before the flatten (`STEPS` of `tools/blender/bear_arms.py`): the flatten moved the tube up to 0.015 units into the source arm, out of reach of the bake rays, and 65 faces took black texels. | 4.4 |
| The light stays: in the gallery light, the arm of the bear casts a black shadow on the trunk below the armpit. The probe with no shadow shows the fur there. The scene light is an open decision of the user. | 4.1 |
| The user: "the polar bear's knees are more bulky than it should be". Three rings cut the long faces of each knee (`refine.rings` of `tools/mesh-rigs/polar-bear.json`): a face from the crotch to the ankle stayed one flat plane in the seated bind, a block with hard ridges. | 4.4 |
| A new vertex of a leg ring takes the knee and haunch rules at its height (`ring_leg_weights()` of `tools/blender/rig_mesh.py`). With the mean weights of its edge, a vertex between the haunch and the calf had no thigh weight, and the slab under the thigh stayed. | 4.4 |
| The rings stand at the knee plane, 0.05 units above it, and 0.04 below it, with the radius 0.25, and each cut keeps 0.2 of its edge at each end. With the radius 0.17, the slab stayed. With 0.04 above, or 0.1 at the ends, a face between the thighs folded in the play. | 4.4 |
| The knee and haunch bands of the fourth review stay: six other bands and two seats with the thighs or the shins 10° down kept the slab. A face of the right shin folds in 0.6% of the samples. | 4.4 |
| The bench top rises 6 mm to 0.232 m, the lowest point of the seated body over the seat. The packed mesh grows by 3,491 B after gzip, with 4,656 triangles. | 7.2 |
