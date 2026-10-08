# Decisions of the camera bugs

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user reported two bugs of the camera. On the first screen, a scroll with the
mouse made "the angle strange": the camera stood close and high over a corner of the stage, and
looked steeply down. During play, a deep zoom made "everything blurry". The camera bugs agent
found the causes in headless Chromium and decided the details below. The user can reverse each
row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| While the first screen shows, the zoom is off. A wheel or a pinch on the stage does not move the camera, keeps the mode, and shows no note. A drag still turns the view and changes to Free. The frame of the first screen shrinks with the camera until the stage is clear of the play button, so a zoom moved the camera into the stage and shrank the frame: at 1000 × 486, 21 wheel steps of 100 px took it from 0.92 to 0.18 of the window, an effective field of view of about 113°. The other choices were a zoom along the view line with a fixed frame (the stage then grows over the play button) and a frame from the default view (the same overlap) | 2.5 |
| The near orbit limit of Free mode keeps the camera 1 m outside the box of the stage and the players, in the direction of the camera (`orbitMinDistance()`). The limit of 2 m from the stage center put the camera among the players and in the head of the conductor. A fixed limit of the largest exit distance (about 7.3 m in Boulanger) would also stop a top view 7 m above the stage top. The box limit lets a top view come to 1 m above the highest head | 2.5, 4.5 |
| A shot camera inside the box moves out of it in the 0.4 s move of the orbit target after a change to Free mode, so the change does not jump. In that move, the near limit stays 2 m | 2.5, 4.5 |
| Free mode focuses on the first thing on the view axis: the column of a player (radius 0.3 m), the stage top, or else the orbit target. A focus on the orbit target, 0.25 m below the stage center, kept the floor sharp and blurred the players in the middle of the frame. A focus on a plane at the mean head height blurred the floor of a top view between the stands | 4.5 |
| The focus of Free mode moves to a new distance with a time constant of 80 ms, at once with reduced motion. Without it, the focus jumps by several meters when a drag moves the middle of the frame from a player to the floor behind it | 4.5 |

Measures in headless Chromium with ANGLE on Metal, at 1440 × 900 when a row gives no other size, with the default demo (Boulanger,
`S = 11.28`, highest point of the players 1.87 m). "Before" is `main` at `d8e4989`. The local
contrast is the root mean square of the difference between neighbor blocks of 4 × 4 pixels in a
box of 288 × 216 px in the middle of the frame. The low tier has no depth of field.

| Case | Before | After |
|---|---|---|
| Wheel on the first screen, 1440 × 900, 5 steps | frame 0.838 to 0.723, Free mode, note | frame 0.838, Cinematic mode, no note |
| Wheel on the first screen, 1000 × 486, 21 steps | frame 0.915 to 0.176, middle 284 px higher | frame 0.915 |
| Free mode, 40 wheel steps from the default view | camera 2.7 m from the target, floor in the middle | camera 7.3 m from the target, 1 m in front of the stage edge |
| The same, local contrast of the middle (end-to-end test) | 2.2, 0.69 of the low tier | 12.1, 0.96 of the low tier |
| Cinematic mode at 13 s, 10 wheel steps, the same contrast | 0.93 of the low tier | 1.00 of the low tier |
