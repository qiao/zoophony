# Decisions of the cinematic light

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-17, the user asked: "implement the cinematic lighting, without subagents". The plan is
[`2026-10-17-cinematic-lighting.md`](../research/2026-10-17-cinematic-lighting.md). The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user chose "P0 to P2 only", approved the design changes D1 to D5 of the plan ("Approve all five"), and accepted the cost in each frame ("Accept, record them"). P3 and P4 wait in `TODO.md`, step 8. | 4.5, 9.7 |
| Each plank has its own roughness, gloss, and start of the grain, and a seam keeps 0.35 of the gloss. The shader finds a plank by its vertex color (`createStageMaterial()`). | 4.5 |
| The wood has the gloss factor 0.5 and a clearcoat of 0.3, in place of the factor 2.0 (`STAGE_FINISH`). A gloss has the color of the light, and the factor 2.0 made the lit floor pale: a saturation of 0.39 against 0.54 to 0.60. | 4.5 |
| The planks are `#5e351a` and the seams `#4e2811` (`STAGE_COLORS`). The diffuse light of the wood now gives most of the floor light, and `#3b2618` gave a lit floor that was too dark. | 4.5 |
