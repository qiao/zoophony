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
| Rabbit: a tube of 15 rings of 16 from the shoulder line to the wrist (`rabbit-arms.glb`). The arms are 1.15 times longer in Blender (`step_shape()`), because a segment rig does not stretch them (`armFactor` 1). Blender weights hold the clavicles and the arms, and the rules the rest (`paintedLower`): with Blender weights on the head, the seated chin went 7.6 cm lower. | 4.4 |
| The arm tools count the segments as arm bones (`tools/arm-segments.ts`). With no count, the gate gave a flat share of 1.00 and too few folds, and the standing check of the rabbit 25.7 mm (0.3 mm). | 9.3 |
| Open: the forearm twist of the gate (rings at 0.5 and 0.85 of the forearm) is 82° on the rabbit left arm (51° on `main`), because the skin now turns along the whole forearm. Per 0.1 of the forearm, the largest step falls from 30° to 22°. The left paw still asks for about 150° of twist. | 9.3 |
