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
| A color border of the trunk grid cuts the triangles along the zero line of a field (`splitByField()`), so that it is a straight line on each face. The belly stripe, the shoulder band of the panda, the lower face, the nape, and the cap of the beagle use it. With one color for each triangle (`splitByCentroid()`), each border was a sawtooth line of about 6 teeth on each cheek of the fox | 4.3 |
| A cut within 0.01 of an edge from a corner moves onto the corner, so that the cuts make no sliver triangles. A cut across the middle plane splits around its middle (5 triangles in place of 3), because no split of a quad into two triangles is its own mirror image | 4.5 |
| The upper border of the lower face is level under the eyes, in front of a plane 0.45 H in front of the head center, and drops by 0.3 H for each H behind that plane. The plane of the plan, which rose by 0.3 H for each H to the front through the head center, put the belly color between the eyes and 0.16 H above them on the front of the fox, the rabbit, and the penguin | 4.3 |
| The nape is behind a plane 0.2 H behind the head center (value of the plan), in place of the faces that turn to the back | 4.3 |
| A corner of a cut between two rings of two bones (the top ring of the torso on `chest` and the neck ring on `neck`) blends the two bones by its height. A rigid corner on the bone of the nearer ring would leave the face between the rings in a pose of the neck | 4.7 |
| Only a species with accent arms (the panda) cuts the shoulder band. The other species keep the triangles of their backs | 4.3 |
| The blaze of the cap is 0.26 H wide, as design 4.3 states (half width 0.13 H, 0.18 H before as a limit for the centroids). The head splits at the middle plane first, because the field of the blaze has two borders on a triangle across that plane. The lower edge of the cap follows the border of the lower face, 0.14 H below it | 4.3 |
| The cuts add 140 to 194 triangles to a body. The largest body is the panda with 2,164 triangles (1,976 on `main`, budget 2,600), and the scene of `perf-60.mid` has 143,016 (133,656 on `main`, budget 200,000, and below the earlier budget of 168,500) | 4.5 |
| With the crease of 10° and the jitter of the fur normals, a cut shows as a faint line inside a face, because the jitter moves the new corner off the plane of the face (plan, variant p9). Stage L2 removed the jitter, and the flat fur shows no line | 4.5 |
| The fur has the crease 0° (stage L2), and the jitter of the fur normals (`FUR_JITTER`, 0.02 H) is gone with its code and its tests. The reference shows clean flat facets with crisp edges. The crease of 10° with the jitter made the faces mottled, with changes of the shade and no form behind them. The golf ball look of the flat shading of 2026-10-06 came from the small equal facets of the grid of 16 sides. On the grid of 12 sides, the play view shows crisp facets, and the back of the conductor keeps a facet size of 0.25 H (main 0.25 H, reference bear 0.28 H) | 4.5 |
| This reverses the crease of 10° and the jitter of the fur in `2026-10-06-fur-shading.md` and of stage F in `2026-10-06-skinned-bodies.md`. Their rows now point to this file | 4.5 |
