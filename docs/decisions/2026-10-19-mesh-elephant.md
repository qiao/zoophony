# Decisions of the elephant mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user said: "use the elephant model at
@~/Downloads/Meshy_AI_elephant_remeshed_3k__1019060649_texture.glb" and "do not ask me any
questions". So the agent chose each option by the rules of its brief, which follow the choices
of the user for the cat, the dog, the panda, and the hippo. The report
[`2026-10-19-elephant-mesh.md`](../research/2026-10-19-elephant-mesh.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quotes above: the timpani elephant gets the mesh as a studio body (`tools/mesh-rigs/elephant.json`, `SPECIES.elephant`), with the pea eyes of the app. The face looks friendly from the front and at 60°, so no face rule changes it. | 4.3, 4.4 |
| The size of the reference images: the reference elephant stands 1.15 to 1.29 times as high as the hippos of its row. The skull top stands at 1.920 m, 1.22 times the 1.570 m of the hippo and the red fox (`ANIMALS`). | 4.4 |
| The arms and the legs keep the mesh (factor 1). Arms of 0.93 of the trunk need the factor 1.7, above the stop of 1.6 of the brief, so the kettles and the hold move to the arms. | 4.4, 4.6 |
| The trunk and the tips of the tusks follow the head only (`noseFront`), and the head measures leave the trunk out (`headFloor`), so H is 0.598 m. The large ears follow the head. | 4.4 |
| Each plain face takes the hue and the chroma of `SPECIES_COLORS.elephant` with its own lightness (`colors.tone`). The cream tusks and nails keep their colors. The thin tail is a ball on one bone, and the crease angle is 35°. | 4.4, 4.5 |
| The kettles leave a gap of 0.12 m at the front of the player for the trunk (`TIMPANI.front`). The trunk keeps 9.1 cm or more from the kettles. | 4.6, 5.3 |
| Each hand strikes only the kettles on its side of the trunk (`sides`), so a roll stays in one hand: the other hand missed by up to 42 cm across the trunk. | 5.3 |
| The sweep accepts 3 cm of the upper arms in the body, because the upper arm of the mesh lies on the side of the body, and 3 cm of the mallets in the kettles, because the middle of the ball lies on the head at a strike (`TIMPANIST_SWEEP`). | 5.2, 9.3 |
| Open: the arm seam shades dark lines on the front of the body. The folds of the arms are in `2026-10-19-elephant-arms.md`. | 4.4, 9.3 |
