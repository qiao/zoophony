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
| The pool of light is smaller: `radiusX` 0.45, `radiusZ` 0.36, and `floor` 0.28 (`LIGHT_POOL` of `scene/light-pool.ts`). The pool of 0.6 covered almost the full stage, so the floor at the edges kept 0.39 of the light of the pool. | 4.5 |
| The planks and their seams are 0.85 of their color in linear values (`STAGE_COLORS` of `models/props.ts`). The lit floor in the pool then has a luma of 153 against 184, and the white fur stands 1.45 times as bright as the floor. | 4.5 |
| The beam is a little stronger: `BEAM_LOOK.strength` 5.6 in place of 4.8 (`scene/beam.ts`), because the lower exposure dims it too, and the beam shows the source of the pool. | 4.5 |
| The floor takes less fill: `FILL.intensity` 3.5 in place of 5, and `FILL.players` 0.857 in place of 0.6 (`scene/lights.ts`). The players keep the fill of 3.0, so their shade sides stay dark. | 4.5 |
| The user chose "Keep, softer": the side lights keep the shadows of the players on the players, with the blur radius 5 on the high tier in place of 3 (`TIER_SETTINGS` of `scene/quality.ts`). The seam of the rabbit has 8% fewer black pixels, and the steps go. | 4.5 |
| The gallery keeps the shadow radius of the high tier (`src/gallery/main.ts`), so the role views show the shadows of the stage. The radius 1 showed the zigzag steps of the map on the rabbit, and the filter of 12 samples has no noise grid. | 7.1 |
