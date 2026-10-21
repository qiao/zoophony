# Decisions of the clips of the pirates file

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "1. the polar bear's are often clipping / overlapping 2. the
percussion badger's drums are clipping. reproduce via
~/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid". The agent of the branch `pirates-clip`
decided these rows while the user was awake but asked no questions, with the measures of
[`research/2026-10-21-pirates-clip.md`](../research/2026-10-21-pirates-clip.md). The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the polar bear's are often clipping / overlapping". The two paws of the pianist went up to 4.7 cm into each other. The middles of their keys now stay 24 semitones apart (`apart` of `HANDS_HOLDS`, `splitHands()`). | 5.3 |
| `apart` is 24 semitones. At 22, the paws went up to 1.1 cm into each other. At 25 and more, the right paw turned more than 15° further from its accepted grip than on `main` (`pnpm arm-check pianist`). | 5.3 |
| The other paw makes way with a note of loudness 0 at the start of the chord, and both moves fit in the time since the last note of either paw (`HandNote.since`). With moves of their own lengths, a paw came in before the other paw left. | 5.3 |
| A chord wider than one octave splits only when its two parts are 24 semitones apart. Else one paw plays it, because the paw of the polar bear covers about 20 cm of keys. | 5.3 |
| The user: "the percussion badger's drums are clipping". The steel drum part (program 114) plays on the xylophone. A part outside the bars moves by octaves until its highest key is in the top octave (`xylophoneShift()`): 51% of the strikes within 5 mm, against 0% at the middle. | 5.3 |
| On the xylophone, a repeat on one bar stays in one hand (`PercussionHold.gap`, 1 cm), and a hand waits at its rest target before its first strike. A gap of 14 cm or more removed the touches, but put the runs of the test score in one hand, and the left arm failed the arm gate. | 5.3 |
| The left xylophone mallet strikes 3 cm nearer than the middle of a bar, the right one 3 cm farther (`offsetL`, `offsetR`). A rest direction of 0 also kept the heads apart, but turned the grip 36° from the accepted grip. | 5.3 |
| The file of the user stays out of the repository, because its music is under copyright. The probes read it from `~/Downloads`. | 8.1 |
| `pnpm clip-probe` gives a clip when more than 1% of the samples are over the limit: 1.5 cm of depth (the `CONTACT` of the sweep), 1 cm under the floor, or a cross of a thin part. A shorter cross in a fast move does not show (`tools/clip-probe.ts`). | 9.3 |
