# Decisions of the stable shot planner

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the polished cast moved the player footprint boxes by 1 to 2 cm, and the shot
planner changed its plans much more than that. Two tests got temporary bounds (row of the
temporary bounds in [`2026-10-06-polished-cast.md`](2026-10-06-polished-cast.md), now removed).
The planner agent found the causes, made the planner stable, and restored both bounds. It
decided the details below. The user can reverse each one. Then update the section that holds it,
and remove its row.

| Decision | Section |
|---|---|
| Each decision of the plan takes its numbers from a hash of the seed, the time of the cut (or of the start of the shot), and the name of the decision. One generator for the full plan let one changed camera search change all later shots: 30 of 31 shots of the Boulanger demo | 5.6 |
| The best candidate at its entry gets a full search: each place of the 6° grid within 75° of the front, with the seeded arc and then the other arc. The horn of the horn test file had 14 clear solo cameras of 336 at its entry, and the search reached only one. It cleared a head at the frame edge by 0.002 of the half frame width, and a move of 1 cm took it away. The full search makes the Boulanger plan about 13 ms (was 12.2 ms) | 5.6, 9.7 |
| The other framings of an entry come right after the best candidate, before the other candidates: each candidate that shows a seat that enters with it. They keep the usual bands, so the share of high cameras stays low | 5.6 |
| A cut that repeats the length of the previous shot loses 1.0 (was 0.4): more than the phrase bonus of 0.5, and less than the entry bonus of 1.5. With 0.4, 68 of 180 plans (6 demos, 30 seeds) had more than 15% equal neighbor lengths, and 3 of 180 with 1.0. The bound of the test goes back to 15% | 5.6 |
| A shot that holds on when no subject fits chooses its new cut within its own longest length. Before, it took the cut of a new shot and failed when that cut came later, so a conductor shot could follow a conductor shot | 5.6 |
| A margin on the camera tests was not added. A camera that passes with a margin can fail by the same small move at the margin, so a margin only moves the edge where a choice flips. The fix acts on the spread of a flip: the seeded numbers of each decision, and more framings of an entry | 5.6 |
| The stability tests move each player by 2 cm in a seeded direction, 4 sets. The demos must keep 90% of their cuts and 75% of their shots, all demos together (now 97% and 83%, main had 78% and 63%). One changed choice can still shift the later cuts of one demo, for example in 6 of 20 moves of the Bach demo, so no demo has its own bound | 5.6 |
