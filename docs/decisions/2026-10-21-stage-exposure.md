# Decisions of the exposure of the stage

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user sent a screenshot of the default view and said: "the scene seems to be
over-exposed? adjust the lighting / rendering so that it's more natural / cinematic." The user
chose variant B of the lineup, and "Keep, softer" for the shadows of the players. The report
[`2026-10-21-stage-exposure.md`](../research/2026-10-21-stage-exposure.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user chose B. The exposure of the AgX tone mapping of the stage is 0.7 (`STAGE_TONE` of `scene/renderer.ts`), so the lit fur and the lit floor move down from the shoulder of the curve. 0.8 alone with the old grade clipped 19.4% of the white fur. | 4.5 |
| The tone curve of the grade keeps a soft shoulder above 172 and ends at 252 (`GRADE.curve` of `scene/grade.ts`). The old curve undid the roll-off of AgX: it clipped 13.5% of the lit floor in red, which gave the flat orange-tan floor. | 4.5 |
| The pool of light is smaller: `radiusX` 0.45, `radiusZ` 0.36, `floor` 0.28, and `spotBoost` 0.85 (`LIGHT_POOL` of `scene/light-pool.ts`). The pool of 0.6 covered almost the full stage, so the floor at the edges kept 0.39 of the light of the pool. | 4.5 |
