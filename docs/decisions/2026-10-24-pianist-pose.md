# Decisions of the pose of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user looked at the polar bear pianist after its arm rebuild and said: "make
sure the pose more professional. you can also adjust the height of seat and size of the piano if
needed". In the round, the user said: "the polar bear's paws are not touching the keys". The
round asked no questions. The report
[`2026-10-24-pianist-pose.md`](../research/2026-10-24-pianist-pose.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The pose follows a professional pianist with a source for each fact, in the living reference `docs/reference/piano-technique.md`. | 5.3 |
| The user: "size of the piano". The piano is 1.16 times a real piano (`PIANO_SCALE`), so that the keys reach the forearms of the long trunk on short legs. At 1.12, the forearms sloped 8° down. This replaces the keys at 0.70 m of `2026-10-14-polar-bench.md`. | 4.6, 5.3 |
| The user: "height of seat". The bench stays at the seat of the rig: a lower bench puts the knees above the hips, and a higher bench needs a new seated bind. | 4.4, 5.3 |
| The spine leans 14° in place of 28°, and the shoulders turn down 6° in the play (`lean`, `shoulderDrop` of `HANDS_HOLDS.piano`). | 5.3 |
| The user: "paws are not touching the keys". The palm stands 0.03 m in front of the keys, and the claw tips lie on the key tops at each strike (`palmL`, `palmR`). | 5.3 |
| The keys stand 1.16 H in front of the floor point (`PIANO_FRONT_H`), so that the elbows bend about 103°. This replaces the keys at 1.55 H of `2026-10-24-polar-bear-seat.md`. | 4.6, 5.3 |
| The elbows point out, a little down, and back, (±1, -0.8, 0.4): elbows that point down put the upper arms 11 cm into the round trunk (`poleL`, `poleR`). | 5.3 |
| The trunk leans to the side toward the keys of the two paws, 60° for each meter of the mean side offset, up to 10° (`sideLeanOf()`). Up to 16°, the far right forearm rose 12° to the paw. | 5.3 |
| The larger piano moves the other players of the demos with a piano by up to 0.39 m. Their bodies and pose code stay. | 4.2 |
| Conflict: design 1 measures the bear against keys of 0.70 m in `polar-bear-views.png`. The newest words of the user win, so the keys of the app stand at 0.81 m. | 1, 4.6 |
| Open: from the front, the larger lid hides the bear. At the far keys, the outer upper arm stands up to 47° out. No foot moves to the damper pedal. | 5.3, 9.3 |
