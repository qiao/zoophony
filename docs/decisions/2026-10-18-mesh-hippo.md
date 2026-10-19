# Decisions of the hippo mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user said: "use the hippo model at
@~/Downloads/Meshy_AI_Hippo_Remeshed_3K_Tri_1019030207_texture.glb" and "use your recommended
settings instead of asking me questions". So the manager of the session chose each option, as the
recommended options of the cat, dog, and panda rounds. The report
[`2026-10-18-hippo-mesh.md`](../research/2026-10-18-hippo-mesh.md) gives the measures. The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quotes above: the contrabass hippos get the mesh as a studio body (`tools/mesh-rigs/hippo.json`, `SPECIES.hippo`), with the pea eyes of the app. | 4.3, 4.4 |
| The skull top stands at 1.570 m, the head height of the red fox that the user chose three times: 1.600907 m for each unit, H 0.505 m (`ANIMALS`). | 4.4 |
| The arm factor 1.5 gives arms of 0.94 of the trunk, as the red fox and the dog. The legs keep the mesh, because the feet hang from the stool. | 4.4 |
| A smaller contrabass (`bassScale` 0.8) and a stool of 0.37 m (`HIGH_STOOL`, 0.7 m before) put the bow above the round belly with the end pin on the floor, in place of longer arms, which the user refused on the dog. | 4.5, 4.6 |
| The contrabass leans 38° to the left of the head with its top plate forward (`HIPPO_HOLD`). The left paw reaches the whole fingerboard, and the bow paw the whole hair. | 5.3 |
| The trunk leans 15°, the right shoulder turns 45°, the string planes are 12° apart, and the right elbow points out and forward, so that the paw and the bow keep out of the belly. | 5.3 |
| At rest, the bow hangs from the right paw beside the belly (`HANGING_BOW`), because the knee is under the belly. | 5.2 |
| The rig has no gloss nose: the export took the two gloss nostrils as eyes (`noseBox`). The nose tip is the front of the muzzle. | 4.4 |
| Each plain face takes the hue and the chroma of `SPECIES_COLORS.hippo` with its own lightness (`colors.tone`), as the user chose the reference white of the panda. | 4.5 |
| The small tail is a ball on one bone, the ears follow the head, and the crease angle is 35°. The hippo does not stand as a soloist. | 4.4 |
| The role `bassist` is in `SWEEP_ROLES`, `FOLD_ROLES`, and `ROLE_VIEWS`. The closed body has 3 open loops (`HIPPO_BODY_LOOPS`). | 9.3 |
| The export gives the soles of a body that sits high (`StudioBody.footHeight`), so that the foot ring of the stool is at the soles. | 4.4 |
| The first download grows by 29,447 B to 533,896 B (`pnpm size --base main`). | 7.2 |
| Open: the skin folds in each sample, up to 28 faces: the left paw, which turns up to 161° on the neck, the chest under the chin with the turn of the right clavicle, and the front of the right shoulder (`fold-probe-bassist.txt`). | 4.4, 9.3 |
| Open: the thick arms go into the body in the play: the right paw up to 9.1 cm, the right forearm 6.5 cm, and the left forearm 3.8 cm into the contrabass (`pose-depth-bassist.txt`). A stroke of `boulanger-matin` at 95.22 s misses its target: a pizzicato follows before its middle. | 5.3, 9.3 |
