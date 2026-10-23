# Decisions of the A-pose rhino

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-23, the user said: "replace the model for rhino and rabbit and also don't split the
arm", with the file `Meshy_AI_rhino_apose_3k_triang_1023071843_texture.glb`. Earlier the same
night, the user chose "No split, original faces" for the elephant. The user slept and asked for no
questions, so the main session decided the rows. The report
[`2026-10-23-rhino-apose.md`](../research/2026-10-23-rhino-apose.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The rig takes `rhino-apose.glb` with its own faces: no copy with new arms, no cut, and no split. The rules of the tube arms (`armFree`, `armIslands`, `armOwn`, `armBelow`) go, and the free arm is the part beyond the plane `armSplit` 0.17. | 4.4 |
| Size: the skull top takes the head top of the parametric rhino, 1.462 m, as before: 1.5474 m for each unit, and the shoulder landmark at 0.912976 m. | 4.4 |
| Arms: the arms keep the mesh (factor 1), 0.374 m from the shoulder joint to the palm. The palms reach the tuba grips with 3 mm to 47 mm to spare. | 4.4, 4.6 |
| The line rule takes the angle 170, as for the A-pose elephant. | 4.4 |
| The accepted grip of the tubist takes the new play median (left -129°, right -148°), because the paw frame of the new body turns the old median by 16° to 19°. The crops show each paw on its tube. | 9.8 |
| The upper arms go 1.8 cm into the body (16.0 cm before) and the tuba 3.8 cm into the belly (2.9 cm before). The sweep body has 12 open loops (`RHINO_BODY_LOOPS`). | 9.3 |
