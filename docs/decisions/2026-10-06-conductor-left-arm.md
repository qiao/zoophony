# Decisions of the conductor stand and the left arm of the conductor

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user reported that the bear clipped with the sheet music of the conductor
stand, and asked for more motion of its left arm. The conductor agent decided the details below.
The user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The conductor stand stands on the stage, 0.6 m in front of the podium center, on a base of radius 0.12 just in front of the podium. On the podium at 0.35 m, the belly of the bear (0.36 m) went through the desk | 4.5 |
| In the lift and in the lowering of the arms, the baton turns toward (0.8, -0.6, 0) by `sin(π × weight)`, so that its tip leaves the desk at the side | 5.4 |
| The level of a beat is the root of the sum of the squares of the loudness of its notes, as a part of the 95th percentile of the song, at most 1. The level at a beat is the mean of 1 s around it, and the trend the mean of the 2 s after it minus the mean of the 2 s before it | 5.4 |
| The mirror has a weight from the level 0.7 to 0.9, and the swell and the fade from the trend 0.06 to 0.2, each with a smoothstep. A weight changes by at most 1.5 in 1 s from beat to beat | 5.4 |
| A held chord starts at the last notes before a gap of 1.2 s with no new note, when the sound goes on for 1.2 s. The palm rises in 0.4 s and goes back in 0.5 s. A cut-off closes the fingers to 80° in the last 0.25 s of the sound. A held chord that starts at the end of the last one makes it longer | 5.4 |
| The places of the left hand, in `H` from the left shoulder joint (outward, up, forward): quiet 0.2, 0.15, 0.8 with a curl of 25°; mirror 0.1, 0.25, 1.0 with 15°; swell 0.15, 0.75, 0.8; fade 0.45, -0.1, 0.7; hold 0.05, 0.3, 1.15, each with 5° | 5.4 |
| The mirror moves the left wrist by 0.6 of the motion of the tip of the baton, mirrored from the right to the left | 5.4 |
| The places of the left hand turn with the upper body only to the left. In a turn of 27° to the right, the lowered hand of a fade went into the desk | 5.4 |
| A cue of the left hand points no further right than the front of the upper body. At 20° to the right, the forearm went through the muzzle of the turned head | 5.4 |
| In the bow at the song end, the left arm comes down to the side in the 0.7 s of the bend, and stays down | 5.4 |
