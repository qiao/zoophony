# Decisions of the deer and dog seams

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "the bear has deformed meshes under the arm", then "the panda and
rhino's arms also got deformed", then "note that many animals are having this issue now". The
agent of the round `deer-dog-seams` decided the rows. The report
[`2026-10-22-deer-dog-seams.md`](../research/2026-10-22-deer-dog-seams.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "note that many animals are having this issue now". The deer rig reads a copy with the faces that join each arm to the trunk removed and a round patch on each inner arm (`deer-arms.glb`, `arm_patch.py` of the research folder), and cuts the trunk hole. | 4.4 |
| The deer cut ends at 0.575, above the shoulder joint and the top of the back notch. At 0.56, the left shard face 980 stayed. | 4.4 |
| The deer takes the patch, because the cut alone left a flat dark arm cap behind the raised right arm at az150. A patch step of 0.02 put the rig over 3,200 triangles. | 4.4 |
| The deer patch sliver at the front top of the right arm root takes the mean weights of its corners (`weights.rigid`). It folded in each sample. | 4.4 |
| The `FAIL` of the right twist of the harpist (p95 55°, base 40°) stays open with crops. The free root turns with the bone, so the step from the chest grows, and the twist along the upper arm falls from 17° to 6° (`tools/arm-shape.ts`). | 4.4 |
| The deer upper arms go 4.9 cm into the body in the play (base 3.2 cm), because the body caps close the notches. No crop shows it, so the round keeps it as an open item. | 4.4 |
| `tail_weights()` keeps the share of a vertex with no face, which the fins of a cut can leave (`tools/blender/rig_mesh.py`). | 4.4 |
| Manager: the gate accepts the twist p95 of 55° of the right arm of the harpist (40° before). The cut shoulder ring turns with the bone, so the first step from the chest grows, and the twist along the upper arm falls from 17° to 6°. The crops at the worst sample show no twisted skin. | 9.3 |
