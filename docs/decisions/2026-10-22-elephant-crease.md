# Decisions of the elephant arm crease

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said about the elephant arms: "same issue for elephant", then "this seems
to be an issue with how the models are rigged. e.g. elephant.glb is good but elephant.rig.glb is
problematic. it's armpit is missing", then "stop all subagents. just focus on elephant for now".
The main session decided the rows. The report
[`2026-10-22-elephant-crease.md`](../research/2026-10-22-elephant-crease.md) gives the measures.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "elephant.glb is good but elephant.rig.glb is problematic. it's armpit is missing". The fix changes the rig and keeps the source mesh: the rule `weights.armCrease` frees each upper arm at the crease where it meets the trunk (`crease_side()` of `tools/blender/rig_mesh.py`). | 4.4 |
| The crease is each concave edge sharper than 25° between the heights 0.44 u and 0.62 u, farther than 0.1 u from the middle plane and within 0.13 u of the arm chain. The fit drops each edge farther than 0.01 u from the plane: 2 of 15 edges on the right, none on the left. | 4.4 |
| A vertex below 0.64 u, the top of the cut, and 0.005 u out of the plane lies in the free arm. Below 0.58 u the cut of the right side failed, and below 0.61 u the right clavicle folded in each sample. A margin of -0.005 u folded the left upper arm. | 4.4 |
