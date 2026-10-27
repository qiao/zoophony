# Decisions of the deer and dog seams

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "the bear has deformed meshes under the arm", then "the panda and
rhino's arms also got deformed", then "note that many animals are having this issue now". The
agent of the round `deer-dog-seams` decided the rows. The report
[`2026-10-22-deer-dog-seams.md`](../research/2026-10-22-deer-dog-seams.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row. The rows of the
deer went on 2026-10-27, because the deer has rebuilt arms with no cut
([`2026-10-26-fifth-review-deer.md`](2026-10-26-fifth-review-deer.md)).

| Decision | Section |
|---|---|
| `tail_weights()` keeps the share of a vertex with no face, which the fins of a cut can leave (`tools/blender/rig_mesh.py`). | 4.4 |
