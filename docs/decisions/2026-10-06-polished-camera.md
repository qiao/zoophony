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
