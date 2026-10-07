# Decisions of the fur shading

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user sent close screenshots of the animals and wrote that their polygons all
looked bad. The diagnosis: the material had flat shading, and the small equal facets of the
polished cast made each round part look like a golf ball under the spotlight. The fur had one
flat material, so the shapes merged into a gray mass in the dark hall. The user approved the
shading part of the fix first: crease normals, a soft edge of the fur, and a baked occlusion.
The shading agent decided the details below with screenshots of the back view of the orchestra,
of the conductor shots, and of the animal views. The user can reverse each row. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The shared material shades with crease normals in place of flat shading. The low-poly look stays in the outlines and in the hard edges of boxes, plates, and soles | 4.1, 4.5 |
| The crease angle is 60° for each finish. A crease of 35° kept a hard line around the crown of each head, where the faces turn by up to 53°. No finish keeps flat facets: the instruments, the chairs, and the stands look better round, and their boxes keep their edges at 90° | 4.5 |
| The weld of the normals joins the corners of two bones at one point, so that the seam of the torso between `spine` and `chest` stays smooth. A weld for each bone showed a hard line across the back of each animal | 4.5 |
| The stage keeps flat shading in its own material, because its planks are flat boxes | 4.5 |
| The occlusion is baked one time for each model into the vertex colors, from discs of the mesh triangles within 0.12 m. It needs no ray test: each vertex reads the discs of the 5 × 5 × 5 grid cells around it | 4.5 |
| The bones of the body shade each other. An arm and a piece in a hand shade only their parent and their children, because a raised arm leaves the torso, and the occlusion of the bind pose would stay there as a dark stripe | 4.5 |
| The props and the stage get no occlusion. Their folds are small, and the grid of the full stage costs time | 4.5 |
| The edge light of the fur multiplies the diffuse light near the outline in the shader of the shared material. It adds no light and no texture read. `MeshPhysicalMaterial` with sheen costs more on each pixel, and its sheen map cannot share the finish texel | 4.5 |
| Only the `matte` finish of a skinned mesh gets the sheen. The finish holds fur, cloth, and raw wood, so the matte parts of the instruments get it too. A separate `fur` finish needs a change of each body part file, which is later work | 4.5 |
