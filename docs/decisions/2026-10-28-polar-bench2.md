# Decisions of the taller bench of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user said: "can the polar bear's bench be taller so that it's leg is more
natural? note that you can update the size of the polar bear if needed as long as it looks
natural." The report [`2026-10-28-polar-bench2.md`](../research/2026-10-28-polar-bench2.md) gives
the measures and the images. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| The thighs and the shins take the leg factor 1.3 (`legFactor`), so the shin keeps 0.67 of the thigh. This replaces the factor row of `2026-10-28-polar-legs.md`. | 4.4 |
| The thighs slope 25° down, the shins stand vertical, and the feet stand flat (`studio.legTurns`): the seat of design 5.2. The bench top is 0.255 m. This replaces the bench row of `2026-10-28-polar-legs.md`. | 1, 4.4 |
| The body is 1.1 times the scale of `2026-10-27-polar-bench.md`: 1.5828 m for each unit, with the head top at 1.53 m in the play. This replaces the size row of `2026-10-28-polar-legs.md`. | 1, 4.4 |
| The piano is 1.22 times a real piano (`PIANO_SCALE`), with the keys at 0.85 m: the elbows stand 8.4 and 5.6 cm above the keys, and the forearms slope 5° down. The hold of `main` stays. This replaces the scale row of `2026-10-28-polar-legs.md`. | 1, 4.6, 5.3 |
