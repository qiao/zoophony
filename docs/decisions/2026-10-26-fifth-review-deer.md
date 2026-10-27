# Decisions of the deer arms of the fifth review

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user said: "the deer's upper arm are missing pieces (have dent)", and "note
that the previous decision files may be incorrect". The user slept, so the agent of the round
`fifth-deer` decided the rows. The report
[`2026-10-26-fifth-deer.md`](../research/2026-10-26-fifth-deer.md) gives the measures. The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the deer's upper arm are missing pieces (have dent)". The deer rig reads a copy with the seam cut and the side wall of the cat, quad tube arms 1.25 times longer, Blender weights, and arm segments (`tools/blender/deer_arms.py`, `deer-arms.glb`). The patches and the cut of 2026-10-22 go. | 4.4 |
| A cap plane at 0.2 of the upper arm, turned 30° toward the trunk, keeps the round top of the shoulder on the trunk (`seam.cap` of `DEER`). With the seam plane alone, the hole took the shoulder top, and bridge faces turned into the arm. | 4.4 |
| The tube has one ring between the socket and its first ring (`seam.rings`). The chest anchor is 0.2 within 0.03 units, the radius of the arm (`anchor`): with 0.4 within 0.06, the outer upper arm took 0.24 of the chest. | 4.4 |
| Six faces in the crease of the left socket and one thin face under the right armpit take the mean painted weights of their corners (`weights.rigidPainted`). They folded in each sample of the harpist. | 4.4 |
| The faces within 0.08 units of each shoulder joint take the skin normals (`rootNormals`). The crease angle split the normals at the back of the left arm root into dark slits. | 4.4 |
