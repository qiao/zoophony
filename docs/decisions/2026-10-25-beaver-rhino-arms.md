# Decisions of the arm roots of the beaver bassoonist and the rhino tubist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the beaver bassoonist and the rhino tubist of `main` showed large black slots or
wedges under both arms, from the left and the right, in the play and at rest. On 2026-10-24, the
user allowed loop edges, retopology, and extra bones for the arm and wrist twist ("add loop edges
and retopology and additional bones if needed to address them"). The manager asked for the arm
rebuild of `docs/agents/rig-blender.md` on both bodies. The round built and measured both rebuilds,
found the cause of the slots in the normals, and ships a rule of the normals. The report
[`2026-10-25-beaver-rhino-arms.md`](../research/2026-10-25-beaver-rhino-arms.md) gives the
measures and the images. The user can reverse each decision. Then update its section, and remove
its row.

| Decision | Section |
|---|---|
| The slots are a split of the smooth normals: the seated bind turns the hanging arm up, and the faces of the arm root meet at more than the crease angle 35°. The colors probe shows no dark face there. | 4.4, 4.5 |
| The skin faces within `rootNormals.radius` of each shoulder joint take the normals of the skin with no crease angle, as the rim of a cut (`root_rim()` of `tools/blender/rig_mesh.py`). The rhino takes 0.12 units, the beaver 0.2. | 4.4 |
| A crease angle of 70° for the whole rhino also removed the wedge, but it smoothed the facets of the trunk and the head. The rule changes only the arm roots. | 4.5 |
| The rhino keeps the faces and the weights of its mesh. Its rebuilt arms (`probes/rhino_arms.py` of the report) put the upper arms 3.5 cm into the belly (2.0 on `main`), and the right tuba paw grasped in 0% of the play samples (97%). | 4.4 |
| The beaver keeps its faces, cut, and shape. Its upper arm joins the trunk down to 0.9 of its length, and the rebuild of the method of the cat (`probes/beaver_arms.py`) folded 15 faces of each arm in the arm gate (limit 8, `main` 2 and 4). | 4.4 |
| The beaver takes 0.2 units: with 0.14, the crease at the front of the right arm root stayed darker, and with 0.26, the arms lost their facets in the front view. | 4.4 |
| The rhino takes 0.12 units: on the rebuilt arms, 0.08 left the wedge under the left arm. | 4.4 |
| Open: a soft dark crease stays at the front of the right arm root of the beaver from the right side at the elevation 20. | 4.4 |
| Open: the twist steps of both bodies stay those of `main`, 64.5° on the rhino forearm and 64.8° on the beaver upper arm (target 25°). The rebuilt rhino arms gave 34.5°. | 9.3 |
