# Decisions of the elephant arm bake

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26 the user said: "there's black area under the bear's armpit". The round `fifth-bears`
found the cause, a flatten before the bake, and the same fault in the arm rebuild of the elephant
(the open item of [`2026-10-26-fifth-review-bears.md`](2026-10-26-fifth-review-bears.md)). The
round `fifth-elephant` worked in its own worktree. The measures are in
[`2026-10-27-elephant-bake.md`](../research/2026-10-27-elephant-bake.md). The user can reverse
each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The arm rebuild of the elephant bakes the skin before the flatten, as the bear does (`STEPS` of `tools/blender/elephant_arms.py`): the flatten moved the tube 0.009 units into the source arm, out of reach of the bake rays, and 30 faces of the inner upper arms took black texels. | 4.4 |
| The palette of the rig stays at 48 colors (`colors.palette` of `tools/mesh-rigs/elephant.json`): the black faces held entries of the palette, so each face color now moves a little (median 0.004 of the sRGB range). The positions, the normals, the joints, and the weights of each corner stay. | 4.4 |
| The 7 dark faces that stay keep their colors: they are gray (about 0.25), and the mesh of the user has 10 such faces at the armpits and the tail (`dark-user.txt`). | 4.4 |
