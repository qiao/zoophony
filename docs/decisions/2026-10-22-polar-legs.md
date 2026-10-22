# Decisions of the legs of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the seated polar bear pianist still read almost as standing, because its short
legs gave a bench of 0.153 m and the round belly hid the lap
([`2026-10-22-polar-seat.md`](../research/2026-10-22-polar-seat.md)). The user chose longer legs
with the size kept. The user then slept, so the agent of the round `polar-legs` chose the other
rows by the measures and the user rules. The report
[`2026-10-22-polar-legs.md`](../research/2026-10-22-polar-legs.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user chose "Longer legs, keep size (Recommended)" (2026-10-22): the thighs and the shins about 1.6 times as long, the feet at their size, and the bear at its size, so that the bench is higher and the lap shows (`legFactor` of `tools/mesh-rigs/polar-bear.json`). | 4.4 |
| Size: the bear keeps 1.929 m for each unit, the scale at which the skull top of the mesh stands 1.923 m high, as on the studio polar bear. The landmark is the standing shoulder joints after the leg rise: 0.729 u, 1.406241 m (`app.shoulders`, `ANIMALS`). | 4.4 |
| Factor 1.6: 1.4 gave a bench of 0.230 m with the knees 3 cm behind the belly at rest, and 1.8 a bench of 0.307 m with 52% of the play samples folded and 9% of the notes missed. 1.6 gives 0.269 m with the knees in front of the belly (`legFactor`). | 4.4 |
| `H` stays 0.453 m, and the seated head top rises from 1.729 m to 1.857 m (+7.4%), because the haunch sits 0.116 m higher. A head top within 2% would make `H` 7% smaller, against the choice of the user. | 4.4 |
| Bench: the front edge stays at the hip joints, so the bench keeps 0.39 m of depth, and the thighs reach past it, as a pianist sits on the front of the bench. A front edge 1 cm behind the calves lowered the seat 4 mm and changed no fold (`chair.front`). | 4.4, 4.5 |
| Hold: the keys 1.5 H + 0.05 m in front of the floor point, a lean of 28°, the palm 0.12 m in front of the keys and 0.12 m above them, and the elbows out (`PIANO_FRONT_H`, `HANDS_HOLDS.piano`). The rest paws lie on the thighs at 0.7 of their length, 0.2 H up and 0.6 H forward. | 4.6, 5.3 |
| Open: no hold on the 1.6 legs passes the whole arm gate. The round keeps the hold that reaches each note within the limits (move twist 53°, base 42°), and the manager chooses it, the variant g4, or a new base (`docs/research/2026-10-22-polar-legs.md`). | 5.3, 9.3 |
