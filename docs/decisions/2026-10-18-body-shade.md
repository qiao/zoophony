# Decisions of the shade on the bodies

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user said: "currently there's no shadow on the animals. They look plain,
over-exposed, low-contrast. Fix that". Measures:
[`2026-10-18-body-shade.md`](../research/2026-10-18-body-shade.md). The user can reverse each
decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "there's no shadow on the animals". The side lights gave most of the light on the fronts, and the cone of 28° from 0.7 S also lit the near section from the other side. Each light now stands at 1.4 S with a cone of 14° (`SIDE_LIGHT`). | 4.5 |
| The side lights cast the shadows of the players on the players. The stage takes only the key shadow (`addBakeToLights()`), because its floor shadows are already too dark. The maps have 1024 texels (high tier), 512 (medium), and none (low) (`sideShadowMapSize`). | 2.6, 4.5 |
| The players and the props take only a part of the fill and of the diffuse light of the environment (`FILL.players`). The stage takes all of it, so its shadows keep their tone. | 4.5 |
