# Decisions of the rebuilt arms of the rabbit and the cat

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user said: "note that there's significant twisting happening for the arms and
wrists. add loop edges and retopology and additional bones if needed to address them". The agent
of the branch decided the rows below, with the method of
[`rig-blender.md`](../agents/rig-blender.md). The report
[`2026-10-24-violin-arms.md`](../research/2026-10-24-violin-arms.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "add loop edges and retopology and additional bones if needed". The rule of no split is lifted for the arm and wrist twist of the rabbit and the cat only: new quad arm faces, 4 segments on each upper arm and forearm, and a helper at each elbow and wrist (`armSegments`). | 4.4 |
| The generic code of the arm segments comes from the branch `polar-bear-arms` (67c52927, e8a9f82b, cf822e7a, on `main` as 402431c7, c4a542e5, 6475b9d9). `tools/blender/violin_arms.py` replays the Blender session of each animal. | 4.4 |
| Rabbit: a tube of 15 rings of 16 from the shoulder line to the wrist (`rabbit-arms.glb`), 1.15 times longer (`step_shape()`), because a segment rig keeps `armFactor` 1. Blender weights hold the clavicles and the arms, and the rules the rest (`paintedLower`): Blender weights on the head moved the seated chin 7.6 cm down. | 4.4 |
| The replay bridges each pair of loops with the twist of the shortest edges, and beautifies the bridge triangles: with the first bridge, thin wrist faces folded 9 faces of the left arm (limit 8), and 7 now. | 4.4 |
| Cat: the upper arm joins the trunk down to the elbow, so the cut at the shoulder line found no closed loop. A cut at 0.8 of the upper arm folded 12 to 16 faces at each elbow (5 and 8 on `main`) with each gap, bridge twist, and pole. The cat keeps its arms. | 4.4 |
| The arm tools count the segments as arm bones (`tools/arm-segments.ts`). With no count, the gate gave a flat share of 1.00 and too few folds, and the standing check of the rabbit 25.7 mm (0.3 mm). | 9.3 |
| Open: the largest twist step between two arm bones falls from 83.7° to 42.1° (target 25°). The upper arms reach 22.8°, but the left paw asks for about 150°, so each forearm segment takes about 36°. The gate forearm twist is 80° on the left arm (51° on `main`), because the skin turns along the whole forearm. | 9.3 |
