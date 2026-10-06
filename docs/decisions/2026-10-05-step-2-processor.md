# Decisions of the step 2 processor tasks

The Section column names a section of [`design.md`](../design.md).

On 2026-10-05, the agent of the step 2 processor tasks decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The processor pairs each note off with its note on and keeps a flag for each note on that sounds, in place of a count of note offs to skip for each key | 6.5 |
| When all seats with notes on a channel are silent, the processor stops all notes of that channel, so that a sustain pedal does not keep them | 6.6 |
| When a silent note is newer than an audible note on the same key of one channel, the processor ends both and starts the audible note again | 6.6 |
| A seat flag before `load()` resolves has no effect on the new score, as for play, pause, and seek | 6.6, 6.8 |
| Each `ClockAnchor` carries the load number of its score, so that the `Player` can ignore the anchors of an older score | 6.7, 6.8 |
| The warm-up plays one note of each preset (the first one of the score) for 30 blocks and its release for 15 blocks, then the first 8 blocks of the song. In a test of the Handel demo (removed on 2026-10-05), one note for each key of each preset gave a similar result and took two to three times as long | 6.4 |
