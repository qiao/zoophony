# Decisions of the studio polar bear in the app

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-12, the user decided: "replace the polar bear pianist by the polar bear model from the
lowpoly studio folder". The agent of the branch `studio-polar-bear` decided the other rows. The
report [`2026-10-12-studio-polar-bear.md`](../research/2026-10-12-studio-polar-bear.md) gives the
measures and the images. The user can reverse each decision. Then update the section that holds
it, and remove its row.

| Decision | Section |
|---|---|
| The route is the route of the studio bear (`2026-10-12-studio-bear.md`): the app drives the body bones of the studio with a retarget of the pose of the player on each frame | 4.4 |
| `pnpm studio-body` gives the weights of the four digits of each paw (`finger1` to `finger4`) to the one `fingers` bone of the paw, with a bind pose at the middle of the digits, so that the digits curl together. A press of each digit on its own key needs four finger bones in the player and stays open | 4.4 |
| `pnpm studio-body` drops the bench, the piano, and the keys of the GLB file, as it drops the baton | 4.4 |
| A seated studio body drops until the lowest point of its skin is on the floor. The scene of the studio puts the field of the soles on its floor, and the skin is 0.011 units outside the field, so the feet went 2 cm into the stage, and the checks of the feet of the seated players failed | 4.4 |
| A seated studio body moves forward so that the front edge of the bench of the studio is at the front edge of the piano bench of the app. `StudioBody.floor` is the point under the body, 0.167 m in front of the bench center for the polar bear | 4.4, 4.5 |
| The player of a seated studio body has the seated legs of the studio, so its bind mesh is seated, as the bind mesh of each seated parametric player is. The footprints, the tests, and the hanging arms read this mesh. The leg corrective shapes of the studio (`legs_straight_*`) stay out, because the pianist never stands | 4.4 |
| A chord past the reach of the nearer hand goes to the other hand (`reach` of `HANDS_HOLDS`): the left paw plays up to B♭4 and the right paw down to C4. The harp has no limit. With no limit, the right paw followed a melody of the Bach demo far into the left half of the keyboard, out of its reach, and the test of the pose timing found no strike at the note start. A chord wider than one octave splits at its largest interval that keeps each part in the reach of its paw: at the largest interval, the left paw got 11 chords past B♭4 in `boulanger-matin.mid`, such as G4 to A♭5 at 115.9 s, and its palm stopped 0.7 to 2.3 cm short of the keys (review of the branch) | 5.3 |
| `pnpm close-views <role> <dir>` replaces `pnpm conductor-views <dir>`, with the roles `conductor` and `pianist`, and the gallery takes the queries `x` and `z` for the line around which a close view turns | 7.1 |
| The checks that the studio polar bear fails because they were tuned on the parametric bodies went or changed: the face of the polar bear and its row of the shape table of 4.3, the reach of each key from A0 to C8 with C3 for the right hand and C5 for the left hand (now each key in the reach of each hand), the palm on the closed shell of the thigh (now the paw near the lap of a studio body), and the bench of 0.45 m for the polar bear. The ear type `low-round` and the snout type `roman` went with them | 4.3, 9.3 |
