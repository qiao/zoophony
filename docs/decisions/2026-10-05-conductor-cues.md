# Decisions of the conductor cues

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the user asked for a more realistic conductor that cues each section before it
plays (5.4). The agent of the cues decided the details below. The user can reverse each one.
Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| An entry: the first note of a seat, a rest of the seat of one bar (from 1.2 s to 3 s), or a general rest of 0.75 beats | 5.4 |
| A moment holds the entries within 0.1 s. Its cue goes to the motion family with the highest priority: the loudness, plus the exposure, plus 0.25 for a first entry, plus 0.5 in a tutti. A tutti has at least 3 seats and half of the seats with players | 5.4 |
| No cue in dense music: 75% of at least 3 other seats cover 80% of the two bars before the moment | 5.4 |
| 1.5 s between the landings of two cues, and the cue with the higher priority stays | 5.4 |
| The first entries of the song get the downbeat of the count-in. A strong entry (a tutti, or a loudness of 0.6) or a section more than 45° to the right gets the baton on a beat (within 5 ms), with an arc 1.6 times as high. The other entries get the left hand | 5.4 |
| The turn to the middle of the players, 1.1 m above their places: the upper body 40% (at most 30°), the head the rest (at most 50°), and the head 25° down to 15° up. The beat plane turns with the upper body | 5.4 |
| The times: a preparation of one beat (0.3 s to 0.8 s), a turn of 0.6 s before it, the eyes 0.6 s on the section and 0.6 s back. The left hand rises in 0.5 s to 15° above the cue point at 0.75 of the reach, comes down in the preparation along a quarter cosine, stays 0.3 s, and comes down in 0.6 s, at most 20° to the right of the upper body | 5.4 |
| Two cues that overlap mix by their weights. A cue has the highest audible weight of its seats | 5.4, 5.5 |
