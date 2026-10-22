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
| The user, quote above: the end pin stands 6 cm further forward and 5 cm further right, and the contrabass leans 5° less back, so its back touches the belly: at most 1.9 cm in (14.8 cm before) (`HIPPO_HOLD.playShift`, `playTurn`). | 5.3 |
| The left shoulder turns 25° forward, also in the rest (`BowedHold.reachL`, 0 for each other hold): the left paw reaches 0.02 to 0.93 of the fingerboard. With 35°, the left arm skin went flat (0.49 in the arm gate, 0.69 before). | 5.3 |
| The string planes are 6° apart (12° before), and the bow plays no hair within 0.25 m of the frog (`frogHair`): 0.25 m to 0.415 m of the hair (0.045 m before). The user can see the shorter strokes, so this is a variant for the user. | 5.3 |
| At the tip, the right elbow points further down (`poleTipR`). In the rest, the left elbow points out and a little down (`restPoleL`), and the bow via moves 0.3 H up: the arm gate has no `FAIL`. | 5.2, 5.3 |
| Rejected: a forward move alone (13 cm) left 4 cm of the hair. A smaller contrabass (0.6, 0.7), a deeper trunk lean (16°, 20°), turns, and rolls did not keep both reaches without a shoulder turn. A roll of 20° put the left forearm into the neck (`rigid-scan.txt`). | 5.3 |
| Open: in the pizzicato of `boulanger-matin` and `brahms-2`, the straight bow arm crosses the right rim of the upper bout (7.7 cm, 5.3 cm before). In the high positions, the left forearm crosses the upper bout (7.0 cm). The left wrist on the neck goes up to 1.8 cm in. | 5.3, 9.3 |
| Open: over the limit of 2 cm on `5d20f635` are the hornist (4.5 cm), the violinist and the tubist (2.9 cm), and the violist (2.4 cm) (`roles/summary.txt`, `TODO.md`). The merge gate runs no sweep, so only `pnpm pose-depth` and the paused tests show a new clip. | 9.3 |
