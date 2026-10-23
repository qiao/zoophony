# Decisions of the A-pose elephant

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-23, the user said: "replace the elephant model by the one at
@~/Downloads/Meshy_AI_elephant_apose_3k_tri_1023061408_texture.glb note that do not cut its arm
or create a dent in the arm", then asked "why are you remeshing while rigging?", then chose "No
split, original faces", then said "elephant and polar bear's eyes too big". The main session
decided the rows. The report
[`2026-10-22-elephant-apose.md`](../research/2026-10-22-elephant-apose.md) gives the measures.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "do not cut its arm or create a dent in the arm", and "No split, original faces". The rig takes `elephant-apose.glb` with its own faces: no cut, no crease rule, no split copy, and no ring. A copy with the long arm edges split at their middles had clean bends, and the user rejected it. | 4.4 |
| The skull top stays at 1.920 m, the height of the elephant of `main`. The shoulder landmark goes to 1.1616 m, and the arms keep the length of the mesh, 0.387 m. | 4.4 |
| The line rule takes the angle 170. At 150, 5 vertices of the long left arm faces took trunk and forearm or paw weights together, and the faces folded in each sample. | 4.4 |
| Two shapes of raised arms (`raise`), fitted with `pnpm raise-fit` on the upper arms. Shapes of bent elbows left more faces turned, and bind arms nearer to the A-pose folded more faces. | 4.4 |
| Open: the long arm faces show dark shards on the bent arms from the front and a slit under the left forearm from the back. Only a split of the faces removes them, and the user chose no split. | 4.4 |
| The user: "eyes too big". The elephant eyes take 0.6 of the pea eye size (`eyeSize` of `ANIMALS`), the middle of a lineup of 0.8, 0.6, and 0.45. The reference eyes are about 0.045 of the head height, and the pea eyes are 0.18. | 4.4 |
