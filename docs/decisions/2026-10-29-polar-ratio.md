# Decisions of the part ratios of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-29, the user sent an image of the pianist from its left back, and asked for the body
size and the part ratios of the original mesh, with a free choice of the bench and the piano.
Later, the user asked for a calm trunk at about 12 s of `bach-bwv1050`. The report
[`2026-10-29-polar-ratio.md`](../research/2026-10-29-polar-ratio.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user asked for the ratios of the mesh. The thighs and the shins keep the length of the mesh (`legFactor` 1.0). With 1.3, the head, the trunk, and the arms had 0.94 of their share of the standing height. This replaces the factor row of `2026-10-28-polar-bench2.md`. | 4.4 |
| The body keeps 1.5828 m for each unit (`app.shoulders`, `height` of `ANIMALS`), because only the leg length differed from the mesh. The seated head top is 1.46 m in the play. This replaces the size row of `2026-10-28-polar-bench2.md`. | 1, 4.4 |
| The thighs slope 25° down on a bench of 0.200 m (`studio.legTurns`, `chair.front`). 35° put the rump 2.9 cm over the bench, and 15° gave a bench of 0.169 m. This replaces the bench row of `2026-10-28-polar-bench2.md`. | 1, 4.4 |
| The calf fair goes (`kneeCrease`): on the short shin of the mesh, it made the seated shin 0.85 as deep as the shin of the mesh. This replaces the fair row of `2026-10-28-polar-legs.md`. | 4.4 |
| The two thin faces of the right groin take one mean (`weights.rigid`): with the short pedal leg, they folded in each play sample. | 4.4 |
| The piano is 1.16 times a real piano (`PIANO_SCALE`), with the keys at 0.81 m: the elbows stand 6.2 and 3.6 cm above the keys, and the forearms are level. This replaces the scale row of `2026-10-28-polar-bench2.md`. | 1, 4.6, 5.3 |
| The keys stay 1.0 H in front of the floor point (`PIANO_FRONT_H`). At 0.9 H, the haunch stays on the pad, but the left shoulder folds 3 more faces, a fail of the arm gate. This replaces the keys row of `2026-10-28-polar-legs.md`. | 4.6, 5.3 |
| At rest, the paws lie 0.8 H and 0.87 H in front of the lap point and 0.08 H and 0.21 H above it, with the elbows (±1, −0.8, 0.2) (`restL`, `restR`). At 0.6 H, the shoulders folded 4 and 3 more faces. This replaces the rest row of `2026-10-28-polar-legs.md`. | 5.3 |
| The smaller piano moves rows of the four demos with a piano: violins up to 0.30 m in `boulanger-matin`, and each player up to 0.13 m in the other three (`layout.txt` of the report). This replaces the layout row of `2026-10-28-polar-legs.md`. | 4.2 |
| Conflict: design 1 puts the bench top at 0.28 of the seated head top, as `polar-bear-views.png` does. The newest request of the user wins: the legs of the mesh give 0.14. This replaces the conflict row of `2026-10-28-polar-legs.md`. | 1 |
| The user asked for natural motion at about 12 s of `bach-bwv1050`. The side lean takes the mean of the palms over 0.3 s around the song time (`SIDE_LEAN_WINDOW`, `sideLeanAt()`). There, the head moves at most 0.5 m/s (2.6 m/s before). | 5.3 |
| A wider window lets the trunk lag behind the paws: at 0.35 s, the upper arms went 8.8 cm into the belly in the lowering (8.5 cm on the base). A window ahead of the song time made it worse. | 5.3 |
