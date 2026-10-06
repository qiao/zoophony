# Decisions of the step 5 motion

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent of the step 5 motion decided the details below. The user can reverse
each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| `AnimalPose.slideOffset` holds the move of the trombone slide, in the axes of the `instrument` bone, so that the trombone motion needs no change of the type | 4.6, 5.1 |
| `Transport` and `SeatAudibility` also give the state before the last change (`before`), so that a lift or a lowering of each player starts from its height at the change. Without it, a short pause makes the instruments jump down and come up again. The first rule kept the time of the change before, and it jumped after fast changes. The second rule kept one linear weight (`weightAtChange`), which forced one timing on both moves (review of step 5, F8, and user feedback of 2026-10-05) | 5.1, 5.2, 5.5 |
| The loudness of a gesture reads CC 7 and CC 11 from the synth events at the note start, with the General MIDI start values 100 and 127, and CC 121 resets CC 11 | 5.3 |
| `preparePoses(score, layout, seed)` calculates the data of a score one time, and `poseAt()` takes its plan and writes into a buffer. Design 5.1 first gave `poseAt()` the score, the layout, and the seed, which made each frame search the full score | 5.1 |
| The values of the beat layer (a sway of 2° in passages) and of the idle layer (breath, blinks, looks, ears, and tail) | 5.1 |
| The stroke rules of the bowed strings: chords and held notes make double stops, the string of a note, the stroke length, the phrase gap of 0.5 s, the lift, the tremolo rate, and the pluck | 5.3 |
| The bowed string players turn the right shoulder forward, slant the bow 20°, and lean the low strings forward, because the arms of the models do not reach the strings in the bind pose. The bow range is the part of the hair that the arm reaches | 5.3, 4.7 |
| The rest pose of the violin and the viola: the instrument turns down to the lap, and the left hand keeps the neck | 5.2 |
| The timing offset of a player is uniform in ±20 ms and its amplitude in 0.85 to 1.15. A note event is at the note start, and the motion before it ends there | 5.3, 9.7 |
