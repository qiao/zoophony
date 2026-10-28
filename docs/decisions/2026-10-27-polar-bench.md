# Decisions of the bench of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the user looked at the polar bear pianist from its left side and asked: "should
the polar bear's seat be taller for it to be more natural?" The manager answered yes. Of three
variants with the bench top at 0.30 m, 0.34 m, and 0.38 m, the user chose "0.38", and for the
size the user chose "keep": the seated size of `main`, with the head top at 1.50 m in the play.
The report [`2026-10-27-polar-bench.md`](../research/2026-10-27-polar-bench.md) gives the
measures and the images. The rows replace the seat, bench, size, and pose rows that they name.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "0.38". The bench top is 0.38 m, at 0.28 of the seated head top, as on `polar-bear-views.png`. The thighs lie level on the bench, the shins stand vertical, and the feet stand flat on the floor (`studio.legTurns`). This replaces the bench rows of `2026-10-14-polar-bench.md`, `2026-10-24-pianist-pose.md`, and `2026-10-27-polar-legs-rebuild.md`. | 1, 4.4 |
| The shins take their own factor 3.208 (`shinFactor`), and the thighs keep the leg factor 1.6. The knee keeps its form. This replaces the factor row of `2026-10-22-polar-legs.md`. | 4.4 |
| The user: "keep". The scale is 0.88 of the scale before (1.4389 m for each unit): with the hold before the round, the head top stays at 1.50 m in the play. This replaces the size row of `2026-10-24-polar-bear-seat.md`. | 1, 4.4 |
| With the level thighs, 2 faces of the hips turned over in the seated bind. 12 rounds of the groin crease and 8 rounds of the haunch smoothing turn none over (`crease.rounds`, `sit.smooth`). | 4.4 |
| Conflict: the brief measured the bear against keys of 0.70 m. The keys of the app stand at 0.81 m (`PIANO_SCALE`), so the round scaled the reference by the head top of the bear. | 1 |
| The bench fits the body (`benchFitOf()`): its back edge is 2 cm behind the haunch, and its front edge lies under the level thighs until their underside goes 1 cm below the seat top. The haunch sets the seat top. On `main`, the bench lay 8 cm behind the haunch, and the thighs did not touch it. | 4.4, 4.5 |
| The bench has the form of the reference bench: a padded seat with round top edges, an apron, and four tapered legs with brass feet, in shares of the seat height (`PIANO_BENCH`, `buildPianoBench()`). | 1, 4.5 |
