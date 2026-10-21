# Decisions of the back-row lights

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user sent a screenshot of the default view and said: "the back rows of the stage
are too dark. Should we add more lighting from front to back". The manager recommended a second
pair of cross lights, and the user said "do it". Measures:
[`2026-10-18-back-light.md`](../research/2026-10-18-back-light.md). The user can reverse each
decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "do it". Two warm spotlights at the front corners cross the stage and light the fronts of the back rows and the choir of the far section (`BACK_ROW_LIGHT`). They have the color of the side lights and cast no shadow. | 4.5 |
| The lights stand 1.0 S high and aim at the back edge at chest height, with a cone of 10°. The start values (1.7 S high, 14°) gave the first row 48% to 63% more light, and the floor behind the back row 80% more. | 4.5 |
| The gallery has no back-row lights (`LightOptions`), so the close views of the models keep their light. | 4.5, 7.1 |
| The pool on the players and the props reaches 1.2 S behind its center, and the stage keeps `radiusZ` (`LIGHT_POOL.reachBack`). The round pool kept about 0.5 of each light on the back rows, so the back-row lights needed 4.13 lux and lit the floor behind them 1.8 times as much. | 4.5 |
| The pool of a solo is round on the players too (`soloAim()`), so the back rows outside the pool step back with all lights. | 2.4, 4.5 |
