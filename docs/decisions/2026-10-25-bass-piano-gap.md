# Decisions of the gap between the contrabass and the piano

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager found one clip of `pnpm clip-probe` on main: in `bach-bwv1050`, the
hippo contrabass (player 15) touched the curved side of the polar bear harpsichord in 89.9% of the
samples. The target is a bassist near the case of a continuo group, with a clear gap of at least
5 cm through the whole song. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| Cause: the layout kept the footprints 0.057 m apart, but a footprint is the bind pose. In play, the bow arm of the standing hippo reaches out of its bind footprint toward the tail of the case, which lies along row 2 and turns back toward row 4. | 4.5 |
| A player in a row behind a piano case keeps `PIANO_REACH_GAP` (0.15 m) from the case, in the fit and in the spread of the rows (`rowClear()` of `models/layout-scene.ts`). The players in front of the case face away from it and keep 0.05 m. | 4.5 |
| With 0.15 m, the nearest part of the hippo keeps 14.2 cm from the case through the whole song, with the count-in, the lift, the rest, and the lowering. With 0.10 m, it kept 8.2 cm. A probe of the mesh distance at steps of 0.5 s measured both. | 4.5 |
| Only `bach-bwv1048` and `bach-bwv1050` change: their contrabass rows move back by 0.10 m and 0.18 m from the podium. The stage of `bach-bwv1050` grows from 9.09 m to 9.28 m. The other 13 files keep their layouts. | 4.5 |
