# Decisions of the natural lift

The Section column names a section of [`design.md`](../design.md).

On 2026-10-05, the user asked for a bit of randomness in the times at which the animals lift and
lower their instruments. Then the user found the motion still too synchronized and too fast, and
asked for a more natural motion (5.2). The agent of the natural lift decided the details below. The
user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Each player has a seeded lift of 0.6 to 0.9 s and a seeded lowering of 1.0 to 1.6 s, each with its own delay and a curve `smoothstep(x ** skew)` with the skew 0.8 to 1.25. Renders of the default demo (GIFs of 6 s at 720 × 450) showed a gradual wave through the orchestra at these values | 5.2 |
| The ripple of a seat: the principal first, then each later player closes 0.3 to 0.5 of the ripple that remains, toward 0.45 s. The delay of a seat is 0 to 0.1 s for the lift of the winds, 0.05 to 0.2 s for the lift of the other seats, and 0 to 0.25 s for each lowering | 5.2 |
| No anticipation and no settle past the playing pose. A weight above 1 moves the IK targets past the playing pose, and a weight below 0 past the rest pose | 5.2 |
| `Transport.before` and `SeatAudibility.before` replace `weightAtChange`, so that each move of each player starts from its own height at the change. `changeTransport()` and `changeAudibility()` cut the older states when all players stood still at the change | 5.1, 5.2, 5.5 |
| The ready pause of the count-in is 1.2 s, so that the slowest lift (1.55 s) fits in the count-in of the Boulanger demo at the speed 1. A shorter count-in in wall time scales all lifts by one factor (`Transport.leadSec`, `liftScale()`). The lifts end 0.05 s before the first sound | 5.2, 5.4 |
| On a resume after the lowering, the lifts fit in one preparatory beat, so they are fast: 0.14 to 0.21 s in the Boulanger demo at the speed 1. A ready pause on such a resume would give them their time, but it changes the count-in and the conductor (5.4) | 5.2, 5.4 |
| The conductor does not vary: a lift of 0.3 s and a lowering of 0.6 s with no delay, scaled only when the count-in is shorter than 0.35 s of wall time | 5.2, 5.4 |
