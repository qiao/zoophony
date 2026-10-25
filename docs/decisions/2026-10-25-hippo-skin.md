# Decisions of the skin of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager asked for a hippo bassist with no visible skin fault from each side:
the soft dark patch at the inner left elbow, the light slivers of the right shoulder, the play
folds, the slit on the belly beside the right arm at rest, and the crease line over the right
shoulder at the frog. The round first proved the cause of each fault. The report
[`2026-10-25-hippo-skin.md`](../research/2026-10-25-hippo-skin.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The left patch is shading: the rim gave the big trunk faces 776 and 777 the mean normal of the turned arm root at a shared corner, 113° from the face at rest. The rim keeps only faces that the clavicle and the arm move (`rootNormals.armShare` 0.3). | 4.4 |
| The black wedge under the bow arm is the same shading at the notch vertex 25: the rim normal of trunk face 270 turned 108° from it. A rim face whose corner turns more than 60° keeps the crease normals (`rootNormals.turn`). With 45°, the left elbow creased. | 4.4 |
| The crease line over the right shoulder comes from the shape `arm_raise_R`: its relax moves vertex 177 3.6 cm to turn back face 479, and the shape weighs 0.68 in the play. The move spreads over one ring (`spread` of `raise`): 39° to 5°. | 4.4 |
| The play folds of faces 258, 442, and 561 come from the 50° shoulder turn of the bow arm (`HIPPO_HOLD.reach`). With 40° in the bow, 6.6% of the play samples folded, but the bow arm went straight in 11.7%, and the paw turned 3,045°/s in a lowering. The hold keeps 50°. | 5.3 |
| Refits of `arm_raise_R`, rigid faces, a Laplacian of the clavicle weights, and a fill of the notch each moved the folds to other faces or folded more samples. | 4.4 |
| Open: the slit at rest beside the right arm is the source form: the inner side of the hanging arm lies inside the plane of `armSplit`, so the rig keeps it on the trunk. A rebuild of the arm with a seam cut and a side wall, as the fox, can fix it. | 4.4 |
| Open: faces 115 and 116 at the front of the right shoulder crease 53° (47° on main), and the pizzicato paw folds the right wrist. | 4.4, 5.3 |
