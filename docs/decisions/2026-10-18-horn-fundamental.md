# Decisions of the fundamental of the horn

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user asked whether the motion of the pandas is professionally accurate. The
round `horn-fundamental` corrects the fundamental of the horn, which the round `slide-notes`
found. The round `horn-partials` gives the horn the partials of the single F horn chart. The
reference [`wind-technique.md`](../reference/wind-technique.md) (2.2) gives the facts and the
sources. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "is the pandas' motion professionally accurate?", then "Research, then fix (Recommended)". The round `slide-notes` found that the horn has the fundamental F2, but a tube of 3.7 m has its second partial at F2 | 5.3 |
| The horn has the fundamental F1 (MIDI 29), written C2, from three sources that agree. The demo notes of the horn up to the written C5 take the valves of the single F horn chart (`BRASS_FUNDAMENTALS.horn`) | 5.3 |
| The manager chose option A (2026-10-18): the horn has its own list, the open notes of the single F horn chart, with only the 10th, 12th, and 16th partials above the written C5 (`HORN_PARTIALS`). The fundamental selects the list (`semitonesBelowPartial()`) | 5.3 |
