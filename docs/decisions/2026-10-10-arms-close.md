# Decisions of the arms close to the body

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-10, the user approved a change of the poses: the arms of the players move in against
the body and the instruments, as in the reference images, and the poses that the old gap of
0.01 H forced go back. The agent of the arms decided the other rows. The report
[`2026-10-10-arms-close.md`](../research/2026-10-10-arms-close.md) gives the measures and the
images. The user can reverse each decision. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| The user: the arms of the players hang close to the sides of the body, the elbows stay near the torso, and the players hold their instruments close, as in `orchestra-latest.png`, `orchestra-side.png`, `lowpoly-animals.png`, and `animals.webp`. An arm can touch the body up to `ARM_CONTACT_DEPTH`, and it does not have to touch | 5.2, 5.3 |
| The left elbow of the violin and the viola points down and forward while the player plays, (-0.5, -1, -1), and down and a little back at rest, (0, -1, 0.5). The left elbow of the cello and the contrabass points down, out, and a little forward while the player plays, (-0.6, -1, -0.2), and down and a little in at rest, (0.3, -1, 0). The left upper arm now stands 20° (violin) and 39° (cello) out from the side in play, 45° and 70° before. Straight down or in, the folded left arm of the violin went 0.08 H to 0.17 H into the haunch | 5.3 |
| The right elbows of the bowed strings keep their directions. In play, the bow arm of the violin already touches the chest, and a lower elbow went 0.03 H to 0.12 H into it. At rest, an elbow nearer to the side put the upper arm or the forearm 0.06 H to 0.19 H into the haunch and the thigh, also with the bow grip higher or nearer to the hip | 5.3 |
| While the flute plays, its right end turns 15° down and 30° back (30° down and 20° back before), the left elbow points (-1, 0.5, -1), and the right elbow points down, (1, -1, -0.5). At 10° down, the left upper arm went 0.03 H into the chest of the tan fox. The left elbows of the oboe and the clarinet point (-1, -1, -1), and the right elbow of the bassoon (0.5, -1, -0.5), in play and at rest. The rest right elbows of the flute, the oboe, and the clarinet point down. This row replaces the flute row of `2026-10-09-body-revert.md` | 5.3 |
| The brass elbows point down. The right elbow of the horn points (0.5, -1, -0.5) in play, 25° out from the side (48° before). The trumpet points its elbows (-0.5, -1, -1) and (1, -1, -1), the trombone (-0.5, -1, -1) and (0.5, -1, -0.5), and the tuba (±1, -1, -1). At rest, the elbows of the horn, the trumpet, the trombone, and the right elbow of the tuba point down. The horn keeps its turn of 12° and 12° (4.6): the turn holds the bell out of the right thigh, and the arms do not move it | 4.6, 5.3 |
| In the rest pose, the elbows of the pianist point (±0.5, -1, -0.5), and the elbows of the harp player (-0.5, -1, -0.5) and (0.3, -1, 0.3). The palms keep their rest places. The elbows of the polar bear stand 31° out from the side (58° before). The playing elbows of the piano and the harp do not change: in the default demo, their arms already go up to 0.32 H into the trunk and 0.17 H into the thighs, with no test of the play clearance. The piano keeps the other values of the piano row of `2026-10-09-body-revert.md`: the elbows (±1, -0.6, 0.4) in play, and the palms at rest 0.7 of the way to the knee and 0.25 H out, with the fingers to the front. This row replaces that row | 5.3 |
