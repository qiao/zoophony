# Decisions of the light color, the wood, and the haze

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user asked "compare the screenshot against the reference image and identify
the next steps", then "do 1-4": the light color, the wood, the floor shadows, and the haze.
Measures: [`2026-10-18-light-color.md`](../research/2026-10-18-light-color.md). The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "do 1-4". The side lights are `#ffe6d2` and the fill sky `#2c2c2e` (`SIDE_LIGHT`, `FILL`). The white fur went from a saturation of 0.47 to 0.32 against 0.30. | 4.5 |
| The key light keeps `#ffca98`. A whiter key light made the lit floor pale: a saturation of 0.36 against 0.54. | 4.5 |
| The grade has the vibrance 0.5 and half the highlight tint (`GRADE`), because the vibrance 0.9 gave the most saturation to the white fur. | 4.5 |
| The planks have less gloss (0.35) and lacquer (0.18) (`STAGE_FINISH`). Their color is in `2026-10-21-stage-exposure.md`. The lit floor had a saturation of 0.46 against 0.54, and the floor shadows a p5 of 56 against 63 (31 before). | 4.5 |
| The lip and the risers follow the plank color by the factor of each linear channel, so they stay a little lighter than the planks. | 4.5 |
| The chairs are `#c47c22` (`SCENE_COLORS`). Bright colors lose saturation in AgX, so they reach 0.53 against 0.65. | 4.5 |
| A moderate step to finer planks: 0.14 m by 0.9 m to 2.1 m (`PLANK_WIDTH`, `PLANK_LENGTH`). The boards of the reference are about 0.1 m by 0.5 m. A stage of 15 m has about 5,100 triangles. | 4.5 |
| The baked stage blurs the shadows of the players with 3 times the radius of the tier (`STAGE_SHADOW`). | 4.5 |
| The haze has 1.5 times its light (`ROOM_HAZE`), because 2 times lifted the whole hall (p50 21 against 12). The beam has the strength 4.8 (`BEAM_LOOK`). | 4.5 |
| The fade of the beam in Free mode stays 0.45 to 0.5 (`FREE_BEAM_FADE`), so a change from Cinematic to Free mode keeps the beam of a close camera. | 2.5, 4.5 |
