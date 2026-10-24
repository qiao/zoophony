# Decisions of the T-pose bear mesh

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-23, the user gave a new bear mesh and said: "also use the new bear model [...] note
that this is a T-pose". The main session decided the rows below. The report
[`2026-10-23-bear-tpose.md`](../research/2026-10-23-bear-tpose.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "also use the new bear model". The bear conductor takes the T-pose mesh `bear-tpose.glb` in place of the studio bear. This replaces the bear part of the first row of `2026-10-22-studio-bears.md`. | 4.3, 4.4 |
| The rig keeps each face of the mesh: no cut, no copy, no ring, and no split. The free arms of the T-pose need no cut. | 4.4 |
| The bear keeps the size of the studio bear (shoulder joints at 1.0 m) and the arms of the mesh (0.396 m, no stretch). | 4.4 |
| The bear mesh keeps its 3,142 triangles, above the 3,000 faces of the studio bears: the mesh of the user stays as it is. | 4.5 |
| The elbow lies at x 0.31, past three long faces under each upper arm. At x 0.29, they stretched 0.51 (limit 0.35). | 4.4 |
| The palm of the source faces down and forward. With the palm down, the paws twisted 113° and 105°. Now 53° and 47°. | 4.4 |
| The bear keeps the crease 40°, the blend 0.05, `eyeNormal` 0.5, and `eyeSize` 1.15 of the user. `eyeShift` goes, because it moved the eyes of the studio head. This removes the eye place row of `2026-10-20-bear-eyes.md`. | 4.4, 4.5 |
| Open: at rest, the arms stand out about 35° around the wide belly. Some long facets show on the bent upper arms. | 4.4, 5.4 |
| The arm gate against `main` says FAIL only where the smooth studio bear had better values. Each value is in its limit. | 9.3 |
