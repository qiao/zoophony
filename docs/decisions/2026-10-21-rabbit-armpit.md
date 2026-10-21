# Decisions of the armpit of the rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user sent a close screenshot of the rabbit violinist and said: "fix the
rabbit's armpit deformation. it looks like it's missing a piece". The user slept and took no
questions, so the agent made each choice. The report
[`2026-10-21-rabbit-armpit.md`](../research/2026-10-21-rabbit-armpit.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "fix the rabbit's armpit deformation. it looks like it's missing a piece". The cut faces and the rim of the notch under the right armpit take the normals of the skin (`cut.bodyNormals` of `tools/mesh-rigs/rabbit.json`, `StudioBody.rim`). | 4.4 |
| The gap is shading: the quad at the top of the cut faces down, and the rim faces turn 46° to 87° from the skin. No vertex, weight, or shape changes, so each pose and arm measure stays (`body-probe.txt`). | 4.4 |
| The manager, after the merge: a dark notch still showed. The rig reads `rabbit-4-armpit.glb`, a Blender copy of the mesh: 21 trunk vertices of the right notch move out, at most 1.2 cm (`fair.py` of `2026-10-21-rabbit-notch/`). | 4.4 |
| Each vertex moves half of the way to a surface fitted around the notch. The full move made facets and a pit, a fill a tent, a move of the top ends folded each rest sample, and `armBelow` 52% of the play. | 4.4 |
| The user: "the arm for the rabbit is still problematic". The left cut also takes the normals of the skin (`cut.bodyNormals` "LR"): its own normals showed a black spike at the seam under the bent violin arm. The left vertices stay. | 4.4 |
| Each upper arm of the rabbit gets a twist bone with half of the roll (`upperTwist`). The right upper arm rolls 28° in place of 49° (p95, limit 55°), and no play sample folds (0.2% before). | 4.4 |
| The rig keeps the shadows: about half of the black pixels of the seam are the shadow of the arm (`seam-variants.txt` of `2026-10-21-rabbit-arm/`). A change of the light is open for the user. | 4.5 |
| A rim face takes the mean normal of the skin at its vertex with no crease angle (`studioNormals()`). As a cap, it left the corners of the caps of the body with no skin and flat. | 4.5 |
