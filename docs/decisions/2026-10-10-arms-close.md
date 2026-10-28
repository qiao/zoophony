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
| A standing player hangs its arms out to the side by the smallest angle at which they touch the torso and the legs of its mesh, with a gap of 0 (0.03 H before) and a forward swing of 20° (8° before). The arms of the percussion players, the conductor, and the standing soloists stand 27° out from the side (35° before). The upper arms touch the trunk 0.01 H to 0.02 H away. This row replaces the hanging row of `2026-10-09-body-revert.md` | 5.2 |
| The elbows of the snare drum point (±0.6, -1, 0.3), and of the xylophone (±0.8, -1, 0.3). The cymbals keep (±1, -1, 0.3): the arms of the cymbals go 0.07 H into the trunk, and elbows nearer to the body made them deeper. The timpani elbows follow `2026-10-19-mesh-elephant.md` | 5.3 |
| The elbows of the singers point (±0.7, -1, 0.1), and the upper arms touch the sides of the body: 31° out from the side, 49° before. The elbows (±0.6, -1, 0.2) went 0.02 H into the torso, at the limit, and the chest of a singer turns 6° in a phrase | 5.3 |
