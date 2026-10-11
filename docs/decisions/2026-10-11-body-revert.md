# Decisions of the second revert of the animal bodies

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-11, the user asked to "revert all models back to the program generated version on
10-06", and then gave the decisions of the first three rows. The agent of the revert decided the
other rows. The report [`2026-10-11-body-revert.md`](../research/2026-10-11-body-revert.md) gives
the method and the probe result. The user can reverse each decision. Then update the section
that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: each species has the parametric body of 2026-10-06 18:58 again, with its default skeleton and its colors of that day, as after the revert of 2026-10-09. This covers the rabbit and the bear, which had rigged bodies from GLB files, and the two foxes, which had a body built in code after `fox-views.png`. The base of the bodies is `561be141`, the last commit before the fox body | 4.3, 4.4, 4.5 |
| The user: the app loses the body code that no species uses: the fox body, the rigged bodies, and their skins. The tools stay, so that a later body can come back: the GLB files of `assets/models/`, `pnpm glb-init`, `pnpm rig-body`, the scripts of Blender, `pnpm sheet-check`, `pnpm pose-probe`, the sheet mattes, and the sheet pages of the views page | 4.4, 7.1 |
| The user: the newer props and pose features stay, for example the podium of `bear-views.png`, the conductor stand out of the podium, the thicker baton with the bent tip, the raised paws and the elbows of the conductor, and the violin hold of the rabbits on the left shoulder. Their values change only where the parametric bodies need it, so that the tests of the behavior stay green | 4.6, 5 |
| The red fox has the colors of 2026-10-06 again. This row replaces the color row of `2026-10-10-fox-body.md` | 4.5 |
| `pnpm body-probe` prints the rest joints and a mesh hash of each species on each support, and the skeleton of each player. Its compare mode proves that each body equals the base. The revert of 2026-10-09 did this check with two scripts outside the repository | 4.4 |
| The bear has the colors of 2026-10-06 again. This row replaces the color row of `2026-10-10-bear-body.md` | 4.5 |
| The places of the conductor scale by 1 / 1.6, the inverse of the scale of 2026-10-10 for the bear of `bear-views.png`: the beat point, the pivot of the baton, and the places of the left hand. Thus they keep their meters from the shoulder joints in the head heights of the parametric bear (0.38 × 1.35 = 0.513 m). The angles, the elbow directions, and the reach of the ready gesture stay. In the head heights of the old bear, the tip of the baton in the ready gesture was 7 mm below the point of beat 1 | 5.4 |
| The shoulder hold of the rabbits keeps its meters on the parametric rabbit: the play shift and the offset of the rest grip scale by 0.233 / 0.38 = 0.61, the head heights of the rigged and the parametric rabbit. The rest grip is on the knee again (0.85 of the thigh before), because the short thighs of the parametric rabbit put the knee in reach. With the old places or a grip at 0.7 to 0.9 of the thigh, the bow paw of the parametric rabbit turned 1,333° to 2,467° a second in the lift, above the limit of 1,000° | 5.3 |
| The check of the angles of the left hand in the ready gesture has a tolerance of 1e-5 rad. The skeleton holds 32-bit rotations, and the parametric bear lands 6.8e-7 rad from the angle | 9.3 |
| The tests that reach the rigged rabbit only through `SPECIES` go with the switch: the seat board test and the skin test of `models/rigged-body.test.ts`, the fitted seat test of `models/player.test.ts`, and the skin material tests of `scene/player-materials.test.ts`. The other tests of the rigged body take the rigged rabbit of `models/rigged/rabbit.ts` until the rigged body leaves the app | 9.3 |
