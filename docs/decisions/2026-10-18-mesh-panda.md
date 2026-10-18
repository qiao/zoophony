# Decisions of the panda mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user said: "use the panda model at
@~/Downloads/Meshy_AI_Panda_Remeshed_3K_Tri_1018153119_texture.glb". After the mid-report of the
first phase, the user chose the four options of the first row. The agent of the branch
`panda-mesh` decided the other rows. The report
[`2026-10-18-panda-mesh.md`](../research/2026-10-18-panda-mesh.md) gives the measures, the probes,
and the images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "Fox head height (Recommended)", "1.5x, as the fox (Recommended)", "1.5x, as fox and dog (Recommended)", and "Pea eyes of the app (Recommended)". The trombones get the mesh as a studio body, with the arm factor 1.497 and the leg factor 1.5 (`tools/mesh-rigs/panda.json`, `SPECIES.panda`). | 4.4 |
| The skull top stands at 1.570 m, the head top of the red fox, with no ear: 1.515445 m for each unit (`ANIMALS` of `tools/studio-body.ts`). | 4.4 |
| The eye box holds only the eye in its black patch, and no dark face near it takes the fur color, so the patches stay black around the pea eyes (`colors.eyeBox`, `eyeShell.darkReach`). | 4.4 |
| The seat ends behind the short thighs, under the round haunch, and the sit drops it at most 0.03 u, so no sheet hangs behind the seat (`chair`, `sit`). | 4.4 |
| The round tail is a ball on one bone, the ears follow the head, the crease angle is 35°, and the panda stands as the trombone soloist (`weights.tailBall`, `earBase`, `ANIMALS`). | 4.4 |
| The slide turns 20° right and 25° down around the mouthpiece, the least turn that keeps the trombone out of the body, and the arm reaches 0.155 m of the travel (`PANDA_TROMBONE` of `src/pose/winds.ts`). | 5.3 |
| The slide reach takes the playing turn of the hold and the turned head (`slideReachOf()`). The slide check asks for more than 0.15 m (`src/pose/winds.test.ts`, user rule of 2026-10-10). | 5.3 |
| Two raise rules relax the right shoulder on the slide and at rest (`raise`). | 4.4 |
| The rest of `main` stays: the trombone stands upright at the right side, so it needs no leg rest (`LEG_RESTS`). | 5.2 |
