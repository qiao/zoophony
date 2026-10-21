# Decisions of the joyful Ode to Joy

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user asked: "find another version of ode to joy that's more traditional and
joyful". The demo agent decided the details below, with the measures of
[`research/2026-10-06-joyful-ode.md`](../research/2026-10-06-joyful-ode.md). The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The Ode to Joy demo is bars 543 to 590 and 851 to 940 of the same OpenScore finale (CC0), one after the other: the full choir with the theme from 0 s, then the Prestissimo coda. It is 2:38 long, the choir sings in 82% of the time, and the loudness range is 3.1 LU. No Mutopia or Wikimedia Commons file with a permitted license has the full orchestra and the choir | 8.2, 8.4 |
| The demo keeps the hash id `beethoven-9`, the title "Symphony No. 9, Op. 125: Ode to Joy", and the cover of the rising sun. The credit line names the new bars | 2.8, 8.2 |
| The first part ends after bar 590, with the D major chords after the last word of the choir. Bars 591 to 594 turn to G major for the Andante maestoso, and a cut after bar 594 ended on a G major fermata | 8.4 |
| The runner-up keeps the four soloists: bars 241 to 296 before the two parts (4:07). It starts with the baritone at about -35 LUFS for 20 s and is longer than 4 minutes, so the choice is the excerpt with no soloists | 8.2 |
| No demo has vocal soloists now. The rule of 3.8 stays for a file of the user. `vocalSoloistsFile()` of `score/test-vocal-soloists.ts` replaces the demo as the input of the soloist tests of `score/` and `models/` | 3.8, 4.5 |
| `cut_midi.py` takes more than one tick range. Each later range starts with its own tempo, programs, and controllers at the join. One range gives the same file as before | 8.4 |
| The shot test of a turn of 20° (N7) needs 2 repeated subjects in the Ode to Joy demo, and 4 in the other demos, because its plan shows only two subjects a second time. The test of the first voice at the first cut had only the old excerpt as input, so it leaves the tests. No test file found a case where the rule changes the plan | 5.6 |
