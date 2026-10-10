# Decisions of the look track

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user wrote that the polygons of the animals do not look good, and sent
`lowpoly-animals.png` and `orchestra-latest.png` (design 1). The plan
[`research/2026-10-07-animal-anatomy-plan.md`](../research/2026-10-07-animal-anatomy-plan.md)
found the faults and recommended variant p8 in stages: L1 (cut color borders) and L2 (flat fur,
decision D2 of the plan).
The look track agent decided the rows below with gallery close views and the default view during
play. The user can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The fur has the crease 0° (stage L2), and the jitter of the fur normals (`FUR_JITTER`, 0.02 H) is gone with its code and its tests. The reference shows clean flat facets with crisp edges. The crease of 10° with the jitter made the faces mottled, with changes of the shade and no form behind them. The golf ball look of the flat shading of 2026-10-06 came from the small equal facets of the grid of 16 sides. On the grid of 12 sides, the play view shows crisp facets, and the back of the conductor keeps a facet size of 0.25 H (main 0.25 H, reference bear 0.28 H) | 4.5 |
| This reverses the crease of 10° and the jitter of the fur in `2026-10-06-fur-shading.md` and of stage F in `2026-10-06-skinned-bodies.md`. Their rows now point to this file | 4.5 |
