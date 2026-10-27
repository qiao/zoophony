# Decisions of the polar bear shins and the deer armpit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user said: "the polar bear's knees are more bulky than it should be", and "the
deer's upper arm are missing pieces (have dent)". The round `fifth-legs` worked on the two faults
that the rounds `fifth-bears` and `fifth-deer` left open, while the user slept. The report
[`2026-10-27-legs-armpit.md`](../research/2026-10-27-legs-armpit.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the polar bear's knees are more bulky than it should be". A bad diagonal of a leg within 0.15 units of the knee flips before the rings when the bind gets smoother (`refine.legFlip`, `leg_flips()`): a long diagonal across the knee front folded 99° into a groove. | 4.4 |
| A smoothing rounds the crease at the back of each knee, whose corner faces turned more than 40°. Its weight falls with the distance from the seam, to 0 at 0.105 units, in 12 rounds (`kneeCrease.reach`, `seam_relax()`): with 2 rings of neighbors, long calf faces tilted into light wedges. | 4.4 |
| Two more back rings cut the calf 0.12 and 0.16 units below the knee plane (`refine.rings` of `polar-bear.json`), so that the smoothing fades over short faces. Without them, 10 and 6 calf edges stayed hard. | 4.4 |
| The knee smoothing keeps the share of the hips (`knee_relax()`). The crotch of the short leg lies near the knee, and a move of its thin faces folded one in each play sample. | 4.4 |
