# Decisions of the entry shots

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked: "the automatic camera should focus on the player that just started
playing their section". The entry shots agent measured the plans of the six demos, changed the
shot planner, and decided the details below. The user can reverse each row. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The measure of the request: an entry event is the first note of one or more seats after a rest of two full bars and 4 s, with a passage after it, within a quarter of a bar of each other. The plan cuts to the event when the first cut from a quarter of a bar before it, at most one bar after it, shows an entering seat. `shots/entry-cuts.test.ts` reads the notes with its own code and needs 50% of the events of the six demos. Main had 23 of 95 (24%), and the entry shots have 53 of 95 (56%) | 5.6 |
| An entry of the camera needs a rest of 4 s, as well as two full bars. Two bars of the Boulanger demo last 2.5 s, and it had 125 entries in 280 s, one in each 2.2 s. The entering seat also plays a passage: its notes cover 0.3 of the 8 s after the entry. A single stroke of the triangle was an entry before | 5.6 |
| A cut from a quarter of a bar before an entry to one bar after it is a cut at the entry. The cuts stay on the downbeats and the middle beats (N5). With a cut on the beat of each entry, 10 cuts of the Boulanger demo fell on other beats, above the 10% of the cut test | 5.6 |
| A cut at an entry gets +5, less 0.5 for each bar after the start of the entry (was +1.5 within a quarter of a bar). The first entry after the shortest length ends the shot: the wanted end moves to the entry, and the planner scores the cut points in its reach first | 5.6 |
| The Boulanger demo has an entry every 4.5 s, so its plan has 42 shots in place of 31, with a median of 5.8 s (9.8 s). The shortest length of 4 s stays, and it is the largest reason of the misses: 15 entries come less than 4 s after the cut at another entry. The other demos keep their medians, from 8.2 s to 9.6 s | 5.6 |
| The candidates have a rank before their scores: a wide view that cannot wait (N6), then the solo shot of a soloist that enters, then each other candidate of an entering seat, then the others. A wide view that is only due (45 s) waits for the next cut with no entry. Thus the gap of N6 stays at most 60 s | 5.6 |
| A soloist is the soloist of the score (3.8), or a seat with one player that carries the lead. In a test file with loud strings that enter with a piano soloist, the solo shot of the first violins or of the cellos won the cut in 2 of 5 plans before | 5.6 |
| Each candidate of an entering seat gets the band up to 40° and a full search. With all bands for each such candidate, 13 of 82 section and solo shots of the demos (16%) looked down at more than 40°, above the 15% of N4. Now 10 of 82 do (12%) | 5.6 |
| Rule 2 stays at an entry. An exception for the solo shot of an entering seat gave 3 more cuts at an entry of 95, but two shots of the violins came in a row in the Boulanger demo | 5.6 |
| A seat that rests at the cut and enters later in the window is no subject of the cut. A test file had a solo shot of a silent pianist 4 s before its entry, and rule 1 then cut away from it at its entry | 5.6 |
| A part shot of a choir seat has the subject of its section group for the rule of no repeat of a framing (N7). With the entry shots, a section shot of the choir started 2.6° from the camera of its part shot | 5.6 |
| Not taken: a hold of the previous shot when no shot of an entering seat has a clear camera. It gave the Boulanger demo 38 shots in place of 42, but 1 to 2 cuts at an entry fewer, and only 3% of the time back | 5.6 |
