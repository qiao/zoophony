# Decisions of the rebuilt arms of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user allowed loop edges, retopology, and extra bones for the arm and wrist
twist ("add loop edges and retopology and additional bones if needed to address them"). The
manager asked to rebuild the hippo arms with a seam cut, a side wall, and arm segments, as the fox
got, against the slit at rest, the play folds, the shoulder slivers, the flat shoulder ring, and
the forearm depth. The report [`2026-10-25-hippo-arms.md`](../research/2026-10-25-hippo-arms.md)
gives the measures and the images. The user can reverse each decision. Then update its section,
and remove its row.

| Decision | Section |
|---|---|
| The hippo gets quad arm tubes in a copy of its mesh (`hippo-arms.glb`, `tools/blender/hippo_arms.py`), with a seam cut at the crease of the arm, a side wall, and arms 1.5 times longer, as the rig made them before. They replace the twist bone, the raise shapes, and the armpit cut. | 4.4 |
| A second plane keeps the round belly under the thick forearm on the trunk (`seam.under`). The thin ears of the hole go, and the cut quads take Triangulate before the clean. With the seam plane at \|x\| 0.205 or 0.19, flaps of the inner arm stayed on the trunk. | 4.4 |
| The rule weights serve only the trunk and the socket: `armSplit` lies out of the trunk, and `armBelow` ramps from 0.46 to 0.54 (0.5 to 0.56 folded 87.5% of the play). The weights take 4 Smooth rounds, and the helper is 0.044 (0.052 folded 36.1%). | 4.4 |
| The anchor gives its chest share only to the rings of the upper arm (`anchor.rings`): the short forearm also lay within its reach and folded. The bake rays reach 0.08 units (`bake`): with 0.017, black patches stayed on the shoulders. | 4.4 |
| The flip of thin bind faces takes a move of 0.004 units and normals within 90° (`refine.flip`): the inner right elbow folded in 8,464 play samples, now 1,482. The play folds fall from 29.0% to 20.0%. | 4.4 |
| The faces within 0.09 units of each elbow take the skin normals (`rootNormals.elbow`): the bent left elbow showed a thin dark line from the back, with no dark face and no fold. 0.07 kept it. | 4.4 |
| Rejected: less elbow bend in the bind, shoulder rings, a higher armpit line, a seam plane turned out at the back, a larger or no anchor, and no trunk weights on the first rings. Each folded more or kept the fault. | 4.4 |
| The right twist of the arm gate at rest is 40 (25 on `main`, limit 55): the segments roll the hanging bow arm from 1/8 at the socket to 7/8 at the elbow. The right flat share goes from 0.54 to 0.82. The manager decides. | 9.3 |
| Open: each rest sample folds 5 faces against the bind, and the lift 19.0% (9.7% on `main`): the bind crushes the inner right elbow and the trunk behind the right arm root. | 4.4, 9.3 |
| Open: from az-150, the back of the right arm root shows past the trunk as a dark flat piece in the play. A light face of the texture shows under the right arm from az150. | 4.4 |
| Open: into the contrabass, the left forearm goes 2.1 cm in 0.1% of the play (1.5 cm), the right upper arm 2.0 cm in 0.4% of the lowering (0.9 cm), and the left paw over 1.5 cm in 39.9% of the play (0.9%), at most 1.8 cm. | 5.3, 9.3 |
