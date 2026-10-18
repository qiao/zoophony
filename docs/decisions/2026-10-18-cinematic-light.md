# Decisions of the cinematic light

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-17, the user asked: "implement the cinematic lighting, without subagents". The plan is
[`2026-10-17-cinematic-lighting.md`](../research/2026-10-17-cinematic-lighting.md). The measures
are in [`2026-10-18-cinematic-light.md`](../research/2026-10-18-cinematic-light.md),
[`2026-10-18-captured-environment.md`](../research/2026-10-18-captured-environment.md), and
[`2026-10-18-shot-light-lens-haze.md`](../research/2026-10-18-shot-light-lens-haze.md). The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user chose "P0 to P2 only", approved D1 to D5 of the plan, and accepted the frame cost ("Accept, record them"). Then the user said "do it" for P3 and "yes" for P4. | 4.5, 9.7 |
| Each plank has its own roughness, gloss, and start of the grain, found by its vertex color, and a seam keeps 0.35 of the gloss (`createStageMaterial()`). | 4.5 |
| The wood has the gloss factor 0.5 and a clearcoat of 0.3 (`STAGE_FINISH`). A gloss has the color of the light, and the factor 2.0 made the lit floor pale (saturation 0.39 against 0.54 to 0.60). | 4.5 |
| The planks are `#5e351a` and the seams `#4e2811` (`STAGE_COLORS`), because the wood now gives most of the floor light, and `#3b2618` was too dark. | 4.5 |
| The grade is a 33³ table of `gradeColor()` with no lift of the highlights. The lift made the middle tones milky and the floor yellow (hue 35° against 28°). The exposure stays 0.8. | 4.5 |
| D1: the bake of the props and the stage (`bakeStage()`), with a key light 2 m wide and the sky within 0.6 m. The players lose the shadows of the props on their bodies. | 4.5 |
| The user: "the shadow under the bear conductor has unexpected gap". The baked stage takes no normal bias (`uShadowLift`), which moved each point 6.5 cm up before the shadow test. | 4.5 |
| A point of the stage with no texel of its own surface is under an overhang (no key light, half the sky) or on a side, which reads the bake 4 cm in front of it (`stageBakeAt()`). | 4.5 |
| The baked stage blurs the shadows of the players with 2 times the radius of the tier and 20 samples (`STAGE_SHADOW`), near the edge of the bake (7 cm to 20 cm). | 4.5 |
| P3: each layout captures its environment 1.2 m above the pool center, with no players, props, or beam, at the intensity 1 (`CAPTURE`). The bounce term waits: the back of the conductor reached 50 against 52. | 4.5 |
| The diffusion is 0.015 (`POST_LOOK`). The upsample of the bloom adds its 6 levels, so 0.2 lifted the black point of the stage from 27 to 48. | 4.5 |
| The chromatic shift is left out. At 0.4 px, it showed no visible change, and it cost 2 more reads of the scene for each pixel. | 4.5 |
| D5: the room haze starts at the camera target, with 0.13 for each stage side (`ROOM_HAZE`). The hall above the stage reached a median of 14 against 12, and the black point of the stage stayed. | 4.5 |
| D4: a close shot adds a key of 1.5 lux, a kicker of 2.5 lux, 0.15 stops, and the vignette 0.6 (`SHOT_LOOK`). The values of the plan brought the white fur of a solo shot near clipping. | 4.5, 5.6 |
| Free mode fades the close light from 0.25 to 0.40 of the default distance (`FREE_LIGHT_FADE`), and a side shot gets half (`SHOT_LIGHT`). The fade of the beam lit the camera `orchestra` (0.43), which shows the whole stage. | 4.5, 5.6 |
