# Decisions of the fifth review of the bears

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent issues with images: "there's black area under the bear's armpit" and
"the polar bear's knees are more bulky than it should be". The user also said that the earlier
decision files can be wrong. The round `fifth-bears` worked in its own worktree. The measures are
in [`2026-10-26-fifth-bears.md`](../research/2026-10-26-fifth-bears.md) and, for the stripes at the
back of the knees, in [`knee-stripes.md`](../research/2026-10-26-fifth-bears/knee-stripes.md). The
user can reverse each decision. Then update its section, and remove its row. The rows of the knee
rings went to [`2026-10-27-polar-legs-rebuild.md`](2026-10-27-polar-legs-rebuild.md).

| Decision | Section |
|---|---|
| The user: "there's black area under the bear's armpit". The arm rebuild of the bear bakes the fur before the flatten (`STEPS` of `tools/blender/bear_arms.py`): the flatten moved the tube up to 0.015 units into the source arm, out of reach of the bake rays, and 65 faces took black texels. | 4.4 |
| The light stays: in the gallery light, the arm of the bear casts a black shadow on the trunk below the armpit. The probe with no shadow shows the fur there. The scene light is an open decision of the user. | 4.1 |
| The knee and haunch bands of the fourth review stay: six other bands and two seats with the thighs or the shins 10° down kept the slab. No face of the legs folds in the play. | 4.4 |
| The bench top rises 6 mm to 0.232 m, the lowest point of the seated body over the seat. The packed mesh grows by 2,081 B after gzip, with 4,442 triangles. | 7.2 |
