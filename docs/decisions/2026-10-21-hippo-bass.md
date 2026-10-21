# Decisions of the contrabass in the body of the hippo

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "the hippo is clipping with the contrabass", with a screenshot. The
body of the contrabass lay inside the belly and the left arm, and the left forearm went into the
contrabass. The round `hippo-bass` moves the contrabass out of the belly and gives the instrument
in the body a limit in the sweep. The report
[`2026-10-21-hippo-bass.md`](../research/2026-10-21-hippo-bass.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The sweep limits a held instrument in the body to 2 cm (`INSTRUMENT_CONTACT`, `SweepPart.limit`): a real bassist touches the lower belly with the contrabass, and the contrabass does not go in. The row of no limit of `2026-10-19-hippo-retro.md` goes. | 9.3 |
