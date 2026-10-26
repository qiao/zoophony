# Decisions of the rebuilt arms of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user allowed loop edges, retopology, and extra bones for the arm and wrist
twist ("add loop edges and retopology and additional bones if needed to address them"). The
manager asked to rebuild the hippo arms with a seam cut, a side wall, and arm segments, as the fox
got, then to remove the dark flap of the arm root, the rest folds, the twist margin, and the
deeper left paw of the first round. The report
[`2026-10-25-hippo-arms.md`](../research/2026-10-25-hippo-arms.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The hippo gets quad arm tubes in a copy of its mesh (`hippo-arms.glb`, `tools/blender/hippo_arms.py`), with a seam cut at the crease of the arm, a side wall, and arms 1.5 times longer, as the rig made them before. They replace the twist bone, the raise shapes, and the armpit cut. | 4.4 |
| A second plane keeps the round belly under the thick forearm on the trunk (`seam.under`). The thin ears of the hole go, and the cut quads take Triangulate before the clean. With the seam plane at \|x\| 0.205 or 0.19, flaps of the inner arm stayed on the trunk. | 4.4 |
| The arm vertices hang on no hips, spine, or spine1 (`step_tube_trunk()`): the back of the first ring took 0.6 to 0.8 of them, stayed with the trunk, and the bow arm root swung out behind it as a dark flap from az-150. | 4.4 |
| The rule weights serve only the trunk and the socket: `armSplit` lies out of the trunk, and `armBelow` ramps from 0.42 to 0.52 (0.46 to 0.54 folded each play sample). The weights take 4 Smooth rounds, the anchor reaches only the upper arm rings, and the helper is 0.044. | 4.4 |
| The flip of thin bind faces takes corners above 130°, a move of 0.004 units, and normals within 90° (`refine.flip`). The play folds fall from 29.0% to 9.7%, the lift folds from 9.7% to 0.0%, and no rest sample folds. | 4.4 |
| The paws hang on no wrist helper, and only the last ring on the hand (`step_wrist()`, `handRings`): the left paw passed 1.5 cm in the neck in 39.9% of the play, now 27.0%. | 4.4 |
| The faces within 0.09 units of each elbow take the skin normals (`rootNormals.elbow`): the bent left elbow showed a thin dark line from the back. 0.07 kept it. The bake rays reach 0.08 units (`bake`). | 4.4 |
| The right elbow at rest points down and a little out (`HIPPO_HOLD.restPoleR`): the right twist of the arm gate falls from 41 to 29 (25 on `main`). Poles further in gave 25 to 30, but put the forearm 1.6 cm to 4.8 cm into the belly. | 5.2, 9.3 |
| Rejected: less elbow bend in the bind, shoulder rings, a higher armpit line, a turned seam plane, a larger or no anchor, the trunk share kept on the flat inner side, and no wrist helper on the forearm. Each folded more or kept a fault. | 4.4 |
| Open: the sweep gives the right upper arm root 4.1 cm to 6.1 cm in the body (0.0 cm on `main`): the flat inner side of the tube lies behind the side wall by design, and now counts as upper arm. The images show no clip. | 9.3 |
| Open: into the contrabass, the left paw passes 1.5 cm in 27.0% of the play (0.9%), at most 1.7 cm, while the left forearm passes it in 1.6% (19.7%). A light face of the texture shows under the right arm from az150. | 5.3, 9.3 |
