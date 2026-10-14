# Decisions of the smooth studio bodies

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the user sent a play frame of the violin section and said: "make the rabbit
smoother. should we use shader, update the mesh, or update the texture?" Then the user added
"also smoothen the bear", and chose "Both bears" when the manager asked about the polar bear
pianist. The manager of the session and the agent of the branch `rabbit-smooth` decided the other
rows. The report [`2026-10-14-rabbit-smooth.md`](../research/2026-10-14-rabbit-smooth.md) gives
the measures and the images. The user can reverse each decision. Then update the section that
holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: the rabbit violinist, the bear conductor, and the polar bear pianist get smoother bodies. The manager: the shading carries the change, the colors of the rabbit get the fix of the gaps, and the meshes stay as they are. A subdivision does not fit the triangle budget of 3,100, and a remesh runs the rig, the folds, and the sweeps again | 4.4, 4.5 |
| Each studio body has a crease angle of its own (`crease` of `ANIMALS` in `tools/studio-body.ts`, written into the module). A corner of the fur takes the mean normal of the fur faces at its vertex within the crease angle of its own face, weighted by the corner angle. The app makes the normals when it loads the body, so the first download gets no normal bytes (`studioNormals()` of `models/studio-normals.ts`) | 4.4, 4.5 |
| The angle of each body is the angle whose facet contrast is nearest to its reference crops: the median of the absolute band-pass of the luminance over its local mean, in boxes inside the fur, with the animal scaled to 300 px (`measure.py` of the research folder). The sum of the differences to the sheet and to `orchestra-latest.png` gives 15° for the bear (0.38) and 15° for the polar bear (0.74) | 4.4 |
| The manager: the rabbit takes 35°. The measure cannot choose the angle of the rabbit: its reference crops have more facet contrast (4.01% and 4.61%) than each app rabbit, the flat one too (3.28% and 2.64%), so that contrast comes from something other than the facets of the app. The user asked for a smoother rabbit. At 10°, the angle that the round first chose, the close views of main and the branch looked almost the same. At 35°, the crumpled look of the play frame goes (facet contrast 1.49% against 2.64% flat), and the edges of the ears and the chin stay sharp. 180° looks almost the same as 35°, with fewer edges. The bears keep their measure, because each bear reference lies inside the range of its renders | 4.4 |
| The corrective shapes of the arms turn the normals of the skin that they move: at a crease angle of 40°, 48 to 121 corners of each body turn by more than 10° at the full weight (`probe-morph-40.txt`). So the geometry adds the change of each normal as a morph normal | 4.4 |
| The gloss of the eyes and the nose keeps flat faces: a face of another finish keeps its own normal, and the fur does not count it. The instrument of a studio player keeps the crease normals of its finishes, as on each other player. Before, the copy of the material with flat shading made the violin of the rabbit flat too | 4.4, 4.5 |
| The scene keeps no flat path for a studio body: each body has a crease angle, and the copy of the material with flat shading went. A new animal of `pnpm rig-mesh` that is not in `ANIMALS` gets the crease angle 0 until a measure gives its angle. The copy of 2026-10-12 kept each face flat, because the GPU skin turned the three normals of a face by different blends, and 30 to 50 faces of the arms and the chest of the bear showed soft gradients. The smooth fur makes these blends a part of its look. This row replaces that row of [`2026-10-12-studio-bear.md`](2026-10-12-studio-bear.md) | 4.4 |
| The close views show no stair line of self shadow where the light grazes the fur, so the shadow bias of the key light stays | 4.5 |
| A fur face of a mesh rig that is not dark takes the mean of its texture samples that are not dark. The fur faces of the rabbit that are 10% or more darker than the cream fall from 136 to 55 of 3,064. The 55 faces lie on the paws and the toes of both sides, where the texture paints the finger and toe lines in a light brown (`dark-faces.txt`) | 4.4 |
