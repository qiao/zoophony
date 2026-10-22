# Decisions of the elbow of the rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "the rabbit's arm is deformed. Compare that with the original
mesh". The round `rabbit-elbow` of 2026-10-21 found the cause, the flat cap of the arm cut at each
elbow. The user slept and took no questions, so the manager chose the recommended option of that
report. The report [`2026-10-22-rabbit-elbow.md`](../research/2026-10-22-rabbit-elbow.md) gives
the measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the rabbit's arm is deformed. Compare that with the original mesh". The manager (user asleep, recommended option): remodel the inner side of each arm in a copy of the mesh, as the pig tubes do. | 4.4 |
| The rig reads `rabbit-4-elbows.glb`: the joining faces of each arm go, and a round patch of 14 new vertices closes the arm (`rabbit_elbows.py` of the research folder). The hole of the trunk stays open for the cut. | 4.4 |
| The patch lies inside the plane `armSplit`, so the free arm takes each island that only free arm vertices surround (`weights.armIslands`, `arm_islands()`). The cut closes an open trunk hole (`open_loop()`). | 4.4 |
| The patch pushes to a circle fitted to the arm, times 0.85, from 0.55 to 0.85 of the upper arm. The right arm run moves with it, except 1003 and 975: vertex 1015 lay 1.5 cm from the bone axis and made a valley (variant e7). | 4.4 |
| The section of `pnpm arm-look` of the right upper arm falls from 0.74 to 0.60 (limit 0.44). No variant with a round elbow kept 0.74. It stays an open item in `TODO.md`. | 4.4 |
| "Upper arms in body" of `pnpm pose-depth` grows from 0 to 5.9 cm in the lowering: the patch goes into the side of the trunk. The red fox has 3.3 cm. It stays an open item in `TODO.md`. | 4.4 |
