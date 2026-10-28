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
