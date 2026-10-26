# Decisions of the reach and the sway of the xylophone badger

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager asked for a side move of the badger xylophonist behind its notes, as a
real player moves (`docs/reference/percussion-technique.md` 9), and for the pitch of the mallets
between strikes. The round `xylophone-sway` found the cause of the misses and measured each
change. The report [`2026-10-25-xylophone-sway.md`](../research/2026-10-25-xylophone-sway.md)
gives the measures. The user can reverse each decision. Then update its section, and remove its
row.

| Decision | Section |
|---|---|
| Cause: at each strike the wrist was at its full reach (0.237 m), and the head stopped short of the bar mostly along the forward direction. A side move alone kept the median miss of the left paw on the pirates part at 38 mm, with no strike within 5 mm. | 5.3 |
| The spine leans 0.2 rad (11°) forward over the bars while the badger plays (`PercussionHold.lean`). A lean of 0.14 rad reached 62% of the left strikes of the pirates part, and 0.2 rad 91%. | 5.3 |
| The body moves behind the notes (`PercussionHold.side`, `pose/side-move.ts`): the spine up to 10° toward the mean place of the notes, eased in the 0.6 s before each note. `2026-10-25-xylophone-reach.md` keeps the hips in place, and `2026-10-25-percussion-rest.md` makes the lean 12°. | 5.3 |
| Balance: the center of mass stays at least 9.6 cm inside the edge of the bind soles in each play sample (`main` 7.2 cm), because the forward lean moves it over the middle of the soles. | 5.3 |
| Xylophone pitch 0.5 rad (`MalletAcross.pitch`): the heads keep at least 2.5 cm apart (`main` 0.9 cm), about 13 cm above the bars. The pitches 0.7 and 0.9 grew the paw swing p95 from 27° to 44° and 54°. | 5.3 |
| Manager review: the side lean tilted the head up to 13°. The neck and the head turn back by the side lean, and the look turns around the world vertical over the leaned spine (`BodyAngles.roll`, `upright`). The eye line stays within 4.5° (`main` 4.9°). | 5.3 |
