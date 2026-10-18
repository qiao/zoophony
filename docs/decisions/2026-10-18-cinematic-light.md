# Decisions of the cinematic light

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-17, the user asked: "implement the cinematic lighting, without subagents". The plan is
[`2026-10-17-cinematic-lighting.md`](../research/2026-10-17-cinematic-lighting.md), and the
measures are in [`2026-10-18-cinematic-light.md`](../research/2026-10-18-cinematic-light.md). The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user chose "P0 to P2 only", approved the design changes D1 to D5 of the plan ("Approve all five"), and accepted the cost in each frame ("Accept, record them"). P3 and P4 wait in `TODO.md`, step 8. | 4.5, 9.7 |
| Each plank has its own roughness, gloss, and start of the grain, and a seam keeps 0.35 of the gloss. The shader finds a plank by its vertex color (`createStageMaterial()`). | 4.5 |
| The wood has the gloss factor 0.5 and a clearcoat of 0.3, in place of the factor 2.0 (`STAGE_FINISH`). A gloss has the color of the light, and the factor 2.0 made the lit floor pale: a saturation of 0.39 against 0.54 to 0.60. | 4.5 |
| The planks are `#5e351a` and the seams `#4e2811` (`STAGE_COLORS`). The diffuse light of the wood now gives most of the floor light, and `#3b2618` gave a lit floor that was too dark. | 4.5 |
| The grade is a 33³ lookup table of `gradeColor()`, with no lift of the highlights. The lift made the middle tones milky and the lit floor yellow (hue 35° against 28°). The exposure stays 0.8, because more exposure makes AgX take more saturation from the lit wood. | 4.5 |
| The user approved D1: a bake of the props and the stage on the stage top (`bakeStage()`), with a key light 2 m wide and the sky within 0.6 m. They cast no shadow in the map, so the players lose the shadows of the props on their bodies. | 4.5 |
| The user: "the shadow under the bear conductor has unexpected gap". The baked stage takes no normal bias of the key shadow (`uShadowLift`). The bias moved each point 6.5 cm up, so the feet cast no shadow near their soles. | 4.5 |
| A point of the stage with no texel of its own surface is under an overhang (no key light, half the sky) or on a side, which reads the bake 4 cm in front of it (`stageBakeAt()`). | 4.5 |
| The baked stage blurs the shadows of the players with 2 times the radius of the tier and 20 samples (`STAGE_SHADOW`): 15.6 cm on the high tier, against 7 cm to 20 cm for the bake. The players keep the radius and the 12 samples of the tier. | 4.5 |
