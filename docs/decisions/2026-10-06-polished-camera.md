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
