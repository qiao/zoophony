# Decisions of the fixes of the step 5 review

The Section column names a section of [`design.md`](../design.md).

On 2026-10-05, the agent of the fixes of the step 5 review decided the details below. The user
can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The cello leans 25° to the left and the contrabass 15° to the left, and both turn their top plates to the right, so that the neck passes the left of the head as in `animals.webp`. The cello and the contrabass lean forward 10° and 5° (were 15° and 20°), and the cello turns the right shoulder 30° (was 10°). Two cellos now need 1.67 m of arc and two contrabasses 2.17 m (were 1.85 m). The stage sides grow: Beethoven 10.05 m (was 9.82 m), Boulanger 11.80 m (was 11.68 m), Grieg 7.34 m (was 7.0 m), and `perf-60.mid` 14.70 m (was 14.67 m). The professional seating changed them again, and 4.5 gives the current sides | 4.5, 4.6, 5.3 |
| A closed eye keeps the y scale 0.05, because the scale 0 makes the bone matrix singular. `applyPose()` of `scene/` sets the scale (review of step 5, F3) | 5.1 |
| The harp turns 38° around the vertical, so that its neck passes the right side of the face of the deer (0.034 m). The left palm then needs at most 0.997 of 97% of the arm length on the highest strings (review of step 5, U1) | 4.6, 5.3 |
