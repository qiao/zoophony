# Decisions of the rig of the rabbit mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-13, the user gave the mesh `assets/models/rabbit/rabbit-4.glb` and said: "replace the
rabbit by using the model at @~/Downloads/rabbit-4.glb. Note that you need to rig it yourself."
The manager of the session and the agent of the branch `rabbit-mesh` decided the other rows. The
report [`2026-10-13-rabbit-mesh.md`](../research/2026-10-13-rabbit-mesh.md) gives the measures
and the images. No species uses the rig yet: the next round swaps the body and changes design
4.4. The user can reverse each decision. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The user: the rabbit gets longer arms and keeps the violin of 0.28 m. The manager offered "Longer arms, 28 cm violin" with the text "The rig makes the upper arm and the forearm about 1.25x longer, so that the reach is 0.377 m, as the current rabbit. The violin stays 0.28 m. This changes your mesh at the arms only." The rig keeps the reach of 0.377 m. On the measured joints, that reach needs a factor of 1.445: the shoulder joint is at 0.475 u, lower than the estimate of 0.525 u, so the scale is larger and the arm from the shoulder joint is shorter (0.270 m). The paw keeps its size | 4.4, 4.6 |
| The manager: the rig goes into the GLB format of a studio body (route 3). The app keeps its retarget, its corrective shapes, its sweeps, and its probes, with no new body code. `AnimalSettings.glb` of `tools/studio-body.ts` names the GLB file of a body that the studio does not build | 4.4 |
| The manager: each face has one color, from the base color texture. The app gets no texture, so the body keeps the flat look of the studio bodies, and the first download gets no image | 4.4, 4.5 |
| The manager: the source file goes into git as the user gave it (12.2 MB), as the files of route 1 did | 4.4 |
| The manager: the bind pose is seated, with the arms of the bind pose of the studio rabbit. The legs take the inverse of the world turns of the studio rabbit from its bind pose to its clip `reference`. The corrective shapes give the source back when the body stands with the arms of the source | 4.4 |
| `pnpm rig-mesh` writes the GLB file with the code of `tools/blender/rig_mesh.py`, and not with the glTF exporter of Blender. The bytes then depend only on the config and the source, and the script writes each field that `pnpm studio-body` reads | 4.4 |
| The joints of the rabbit are measured on cuts of the mesh (`docs/research/2026-10-13-rabbit-mesh/sections.py`). The shoulder joint lies on the middle line of the free arm, 0.03 u inside its root, and it sets the scale of the app: 1.2232 m for each unit | 4.4 |
| The weights come from bone heat, then from rules. Beyond the plane \|x\| = 0.106, only the free arm follows the arm bones, because bone heat gave up to 0.31 of the forearm weight to the side of the trunk. The haunch follows the hips, so the seated knee stays low. Above y 0.565, the eyes, the nose, and the whiskers follow the head only. Each ear follows its ear bone, and the tail ball the tail | 4.4 |
| Each eye becomes a gloss shell 0.002 u out of the surface, on the eye bone of the export. The faces under it take the mean fur color of the faces around the eye. The nose faces become gloss on the middle plane | 4.4, 5.1 |
| The faces that the seated bind turns over against the source relax toward their neighbors (10 faces of the haunch). The corrective shapes come from the cleaned bind mesh, so the standing body still gives the source back within 0.235 mm in the app | 4.4 |
| The chair of the GLB file has the footprint of the chair of the studio rabbit, from z 0 to -0.13 u, and its seat top is the lowest point of the seated body over it, with no shin and no foot (0.122 u). The back of this chair goes through the haunch. The app reads only its box, and its own chair keeps a gap behind the trunk | 4.4, 4.5 |
| Open for the app round: the rig has 3,126 triangles, 26 above the budget of 3,100 of a studio body, because of the 61 faces of the eye shells. The round keeps the face and the whiskers | 4.5 |
