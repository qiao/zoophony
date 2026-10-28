# Decisions of the arm creases of the foxes and the rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user said: "seeing visible crease on fox and rabbit's arm. these were not there
before this round", then: "it may be existing fault. anyways, fix them". The images showed a notch
in the lit right forearm of the red fox and a vertical slit with a sharp corner at the right arm
root of the rabbit. The round `sixth-fox-rabbit-crease` fixed both. The report
[`2026-10-28-fox-rabbit-crease.md`](../research/2026-10-28-fox-rabbit-crease.md) gives the
measures and the images. The user can reverse each decision. Then update its section, and remove
its row.

| Decision | Section |
|---|---|
| The user: "it may be existing fault". Both creases split the smooth normals of the seated bind: the fox elbows since their rebuilt arms (2026-10-25), the rabbit arm roots in each rig since 2026-10-23. The bind round did not change them. The front key light shows them. | 4.4 |
| The fox faces within 0.07 units of each elbow joint take the skin normals (`rootNormals.elbow` of `tools/mesh-rigs/fox.json`). The red fox and the tan fox share it. With 0.06, an edge of the right inner elbow kept a jump of 60° in the play. | 4.4 |
| The rabbit faces within 0.12 units of each shoulder joint and 0.06 units of each elbow joint take the skin normals (`rootNormals` of `tools/mesh-rigs/rabbit.json`). With 0.08 and 0.10, hard edges of 18 cm and 3 cm stayed at the arm roots. | 4.4 |
| A rabbit face stays in that rim only with at least 0.3 of clavicle and arm weight (`rootNormals.armShare`), as on the hippo, so that the chest and the back keep their facets. | 4.4 |
| The form stays: the fix changes only the normals, so the holds, the folds, the depths, and the arm gate keep the values of `main`. | 4.4 |
