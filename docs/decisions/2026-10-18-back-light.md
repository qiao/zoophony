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
| The pool on the players and the props reaches 1.2 S behind its center, and the stage keeps 0.42 S (`LIGHT_POOL.reachBack`). With the round pool, the back rows kept about 0.5 of each light, and the back-row lights needed 4.13 lux in place of 2.25, with 1.8 times the light on the floor behind the back row. | 4.5 |
| The pool of a solo is round on the players too (`soloAim()`), so the back rows outside the pool step back with all lights. | 2.4, 4.5 |
