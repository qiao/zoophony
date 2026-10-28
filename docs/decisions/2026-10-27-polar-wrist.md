# Decisions of the wrist of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the user said: "there's a crease around the bear's wrist", with an image of a paw
of the polar bear pianist on the keys from above. The user slept, and the manager ran the round
`sixth-polar-wrist` on 2026-10-28. The report
[`2026-10-27-polar-wrist.md`](../research/2026-10-27-polar-wrist.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "there's a crease around the bear's wrist". The cause is the wrist band of the arm copy of 2026-10-24: 46 thin faces, 2 mm wide on the palm side, whose sharp edges split the normals in the bind. | 4.4 |
| The wrist cut of the copy stands parallel to the last ring of the tube, 0.25 of the paw from the joint (`cut_planes()` of `tools/blender/polar_bear_arms.py`), as on the hippo. | 4.4 |
| The thin faces at each wrist cut loop and bridge collapse at 12° (`clean_wrist_cut()`, `clean_wrist_bridge()`). Smooth Vertices, 4 rounds of 0.5, evens the band, and a Shrinkwrap puts it back on the arm (`smooth_wrists()`, `retopo_snap_wrists()`). | 4.4 |
| The arm faces from 0.03 units before each wrist joint to 0.025 units past it take the skin normals (`rootNormals.wrist` of `tools/mesh-rigs/polar-bear.json`). The claws keep their facets. | 4.4 |
| Rejected: the cut shares 0.10 and 0.15, the old cut with the clean, the cut with no clean, and the skin normals alone, each with hard lines. The smooth with no snap gave the wrist a waist. | 4.4 |
