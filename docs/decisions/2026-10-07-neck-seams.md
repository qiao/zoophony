# Decisions of the neck seams

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the review of `main` against `mockup.png` ranked the dark seams at the nape and
the chin as gap 6 (`docs/reviews/2026-10-07-mockup-match.md`). The user had reported strange
necks before. The neck seams agent measured the cause of each seam with renders of the default
view, with one factor turned off at a time, first on `1d3bc71` (camera at 34°), then on
`7ca3f80`. The user can reverse each row. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The seams come from the normals (measures on `1d3bc71`). The faces of the trunk grid from the top ring of the torso to the jaw ring point down by up to 56°, because the head is wider than the neck ring. With the down part of all fur normals removed, the nape of the conductor went from a luma of 17 to 32 and the rabbit collar from 97 to 161. With no baked occlusion, the nape stayed at 17 and the collar went to 103. The jitter of the fur normals changed the nape by 2 | 4.5 |
| At each vertex of the neck band (the triangles with a corner on `neck`), `shadeMesh()` turns each normal that points down to the horizontal. The other parts keep their normals, so the round parts keep their dark lower halves | 4.5 |
| The occlusion leaves at least 0.6 of the light on the neck band. The head left 0.4 on the throat, the floor of the other folds. The knees and the hips keep the floor of 0.4 | 4.5 |
| The geometry of the neck stays. A back of the top ring of the torso at 0.41 H (0.32 H before) removed the faces under the nape that pointed down by 39° to 43°, but the band below it then pointed down by 13°, and a dark band moved to the top of the back. A neck ring 0.88 H wide and 0.48 H deep at the front (0.72 H and 0.4 H) gave a darker throat in the close views. A wider jaw ring made the nape darker | 4.4, 4.5 |
| The dark lens on the lower back of the head of the conductor stays (luma 28 against 37 on the back). It is the back of the head, which faces away from the key light and gets the side lights at a low angle. It is a part of the head and of the light, outside the neck band | 4.5 |
| The bear keeps the short muzzle. With the `round` muzzle, the left hand stays free in each demo, but the head goes into the conductor stand in the bow at the song end of each of the six demos (gap 0 m, limit 0.02 m) | 4.3 |

Samples of the default view during play (`#demo=boulanger-matin`, seek to 6 s and pause, 1440 ×
900 at a device scale of 2) on `7ca3f80`, as the mean luma (0.2126 R + 0.7152 G + 0.0722 B of
the sRGB values) of a box of pixels:

| Box | `main` | Branch |
|---|---|---|
| Nape of the conductor, under the head | 17 | 31 |
| Back of the conductor | 37 | 37 |
| Darkest 5% of the nape zone | 11 | 20 |
| Collar under the chin of a rabbit | 92 | 123 |
| Chest of the same rabbit | 160 | 162 |
