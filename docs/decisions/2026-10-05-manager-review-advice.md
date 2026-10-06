# Decisions of the manager on the advice of a review

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the manager decided the details below on the advice of a review agent. The user
can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| `Seat.kits` holds the drum kits of the rhythm sources, and `Seat.programs` holds only melodic programs | 3.2 |
| The toms of a GM1 kit do not make a file orchestral: a timpani seat counts only with program 47 or kit 48 | 3.8 |
| Above 60 seats with players, the seats with the fewest notes move their notes to the sound-only seat, and a tie moves the later seat | 3.7, 2.8 |
| A note that starts at most 50 ms after the first note of a chord joins it, if each note of the chord ends more than 50 ms after its start. Notes with the same start are always one chord | 3.8 |
| The reference scale of the step 3 review (question A): the head height `H` of the rabbit is 0.38 m, the instruments are 1.27 times larger (violin 0.51 m, bow 0.57 m), the front distance is 1.0 m (with a piano, also 0.3 m in front of the piano case), the edge margin is 0.3 m, and the smallest stage side is 5 m. Thus the reference composition has `S = 6.6`. The professional seating later made it 8.12 m (4.5) | 4.5, 4.6 |
| The light and the stage color of the step 3 review (question B): spotlight angle 45° with penumbra 0.5, spotlight color `#fff6ec`, fill ground `#4a3a30`, and stage top `#7a6359` with plank lines `#5e4b42`. A base color changes only when no light value matches the reference | 4.5 |
| The light on the floor: an additive disc of radius `S` in `#e8dcc0`, opacity 0.13 up to `0.5 × S` and 0 at `S`, 1 mm above the floor (review of step 3, "No light on the floor") | 4.5 |
| The shadow floor writes no depth, so that the light on the floor shows no streaks in far views (review of step 4, F4) | 4.5 |
| A standing player has short straight legs: the torso base 0.75 H above the floor and a thigh of 0.42 H, so its legs are 28% of its height and the bear is 1.67 m tall (review of step 4, F3). It replaces the legs of a chair, straight down, of the step 4 layout agent | 4.5 |
| The spread of the rows after the stage size: each side of a row grows its arcs by one factor, up to 1.6 m between neighbors and ±90°, with all footprint and edge checks. `S` does not change (review of step 4, F1) | 4.2, 4.5 |
| The weak species of the step 4 review get clear marks: the mouse, the beaver, the meerkat, the dog, and the cat. The first table gives their new values | 4.3, 4.5 |
| The gap in front of a gallery row is at least the height of the tallest model of the next row / tan 35°, and the gallery pianist faces +x (review of step 4, F2) | 7.1 |
| Longer arms: upper arm 0.7 H (was 0.6) and forearm 0.65 H (was 0.55), so that the shoulder is 1.43 H from the palm, 0.60 of the seated height. The bow slant of 20° and the leans of 15° and 20° stay, and the shoulder turns of the bowed strings become violin 10° (was 40°), viola 30° (50°), cello 10° (30°), and contrabass 30° (50°). Option (c) of the review of step 4, "the reach of the arms". The fix of F2 of the review of step 5 later changed the leans to 10° and 5° and the cello turn to 30° | 4.5, 5.3 |
| An earlier note that sounds at the first note of a chord counts for all notes of the chord, and each chord gets one division of the players (review of step 2, R1 and R2). The rule of `7bd561d` tested each note of a chord at its own start, and gave 2 players in the N3 case (review of step 2, N3) | 3.8 |
| The choir shows each sung note from the default view: the jaw opens 35° (was 18°), and the neck and the head lift 15° with it. A beak point of the front row of the removed Handel demo moves about 4 px at 1440 × 900 (review of step 5, F6) | 5.3 |
