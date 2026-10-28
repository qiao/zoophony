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
| The bench fits the body (`benchFitOf()`): its back edge is 2 cm behind the haunch, and its front edge lies under the level thighs until their underside goes 1 cm below the seat top. The haunch sets the seat top. On `main`, the bench lay 8 cm behind the haunch, and the thighs did not touch it. | 4.4, 4.5 |
| The bench has the form of the reference bench: a padded seat with round top edges, an apron, and four tapered legs with brass feet, in shares of the seat height (`PIANO_BENCH`, `buildPianoBench()`). | 1, 4.5 |
