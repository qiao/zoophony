# Decisions of the camera of the polished look

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user added the polished reference images `mockup.png` and `scene.png` (1) and
asked for a result that is as close to them as possible. The camera agent of that work decided
the details below. The user can reverse each one. Then update the section that holds it, and
remove its row.

| Decision | Section |
|---|---|
| The default view has the azimuth 0° and keeps the elevation 28°, as view 01 of `scene.png`. The listener of the pan of 6.1 follows it | 4.5, 6.1 |
| The landscape rule: the default view stands at `0.56 × max(1, 1.6 / aspect)` of the default distance, at most 1. At 1440 × 900 with the drawer open, the players fill 0.07 to 0.92 of the free area, as 0.10 to 0.97 in `mockup.png`. The target stays at the stage center | 4.5 |
| The default distance stays the unit of the planner, the high shots, and the beam fade, so that the close shots keep their limit of 0.44 | 4.5, 5.6 |
| The wide variants are the default view, two views from 24° to each side at 24° with the zoom 1.1, and a frontal view at 20°. The push-in of a wide shot and the pull-out of the last shot use 0.92 | 5.6 |
| The beam fade of Free mode ends at 0.5 of the default distance (was 0.55), so that the nearest wide camera (0.52) keeps the full beam | 4.5 |
| The high shot is view 09 of `scene.png`: from the front with a seeded azimuth of up to 12°, 40° to 44° high with a rise of 4°, at 0.75 of the default distance at each aspect. The old high shot looked down at 58° to 62° from 0.6 | 5.6 |
| The conductor shots show the bear only from behind, as views 02 and 05 of `scene.png`. The close view replaces the view of the face from the orchestra side: its target is 0.3 m below the middle of the head, with a sphere of 1.1 m, 10° high, from the audience side | 5.6 |
| The view over the shoulder looks at a target `0.4 × S` in front of the head of the bear, 1.0 m high, with a sphere of `0.3 × S`, 22° high, and a field of view of 30°. Its line turns at most 20° from the line to the back of the stage. All players are its subject players in the foreground rule, because the orchestra is its subject | 5.6 |
| The side views of `scene.png` (03 and 04) are a new kind of shot, `side`. It shows the seats of one side that play or enter, from 50° to that side, 14° high, with a sphere of `0.27 × S` around a target 1.0 m high and at least `0.15 × S` from the middle line. The camera stays within 30° of the front of the side. The beam has the factor of a close shot | 5.6 |
| The score of a side view is 0.4 + 2 × the share of its seats, plus 0.8 at an entry and 0.6 with the piano (the piano focus of view 03). It needs 3 or more seats on the stage, 2 or more seats of the side in the window, and three other shots since the last side view | 5.6 |
| A cut that gives the shot the length of the previous shot loses 0.4, so that the cuts of a steady tempo do not fall on a grid | 5.6 |
| The section and solo shots start lower, at `14 + 8 × back` and `12 + 10 × back` (were `18 + 10 × back` and `14 + 12 × back`), as the close shots 06 to 08 of `scene.png`. The lower values `12 + 8 × back` and `10 + 10 × back` lost the shot of the horn entry of a test file, and a solo field of view of 28° failed the foreground and the first voice tests, so the fields of view stay at 30° and 24° | 5.6 |
