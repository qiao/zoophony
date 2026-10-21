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
| The rabbit keeps the notch geometry. A fill of the notch (`fill-trial.patch`) moved the trunk up to 4.4 cm and made a sharp dark tent under the arm. A shift of `weights.armBelow` folded 52% of the play samples. | 4.4 |
| The left armpit keeps the normals of its faces: there the rule put a light sliver under the violin arm (sharp edge pixels 86 to 235 at the azimuth -120). | 4.4 |
| A rim face takes the mean normal of the skin at its vertex with no crease angle (`studioNormals()`). As a cap, it left the corners of the caps of the body with no skin and flat. | 4.5 |
