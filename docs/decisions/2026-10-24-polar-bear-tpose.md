# Decisions of the T-pose polar bear mesh

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user gave a new polar bear mesh and said: "mesh for polar bear: [...] use the
same eye size as the bear", then slept and asked for no questions. An earlier polar bear mesh of
that night had each upper arm fused to the trunk, and the user said: "I'll give you a new one".
The main session decided the rows below. The report
[`2026-10-24-polar-bear-tpose.md`](../research/2026-10-24-polar-bear-tpose.md) gives the measures
and the images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The polar bear pianist takes the T-pose mesh `polar-bear-tpose.glb` in place of the studio polar bear. The rig keeps each face of the mesh: no cut, no copy, no ring, and no split. This replaces the polar bear part of the first row of `2026-10-22-studio-bears.md`. | 4.3, 4.4 |
| The legs take the factor 1.6 that the user chose for the polar bear mesh of 2026-10-22 ("Longer legs, keep size"), so that the thighs show over the bench. | 4.4 |
| The thigh joint lies inside the haunch at y 0.28. At the crotch, the thigh was too short to sit level, and the seat rule pulled the rump down 44 cm. | 4.4 |
| armTop starts above the level arms of the T-pose (y 0.80). From y 0.68, it gave the top of each arm to the neck. | 4.4 |
| The eyes take `eyeSize` 0.805, the size of the bear, as the user asked. | 4.4 |
| The mesh keeps its 3,144 triangles, above the 3,000 faces of the studio polar bear. | 4.5 |
| Open: at rest, slivers show along the upper arms. Long thin faces cross each shoulder, and the level arm of the T-pose turns about 75° down. Corrective shapes and weight rules did not change them. The bent rest arms of `2026-10-24-polar-bear-seat.md` make them smaller. A ring at each shoulder needs the user. | 4.4, 9.3 |
