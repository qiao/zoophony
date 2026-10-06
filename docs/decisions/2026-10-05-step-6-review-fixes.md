# Decisions of the fixes of the step 6 review

The Section column names a section of [`design.md`](../design.md).

On 2026-10-05, the agent of the fixes of the step 6 review decided the details below. The user
can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| When the first screen hides with the keyboard focus in it, the play button of the bar gets the focus, as after a message (review of step 6, N1) | 2.8 |
| A new piece gives the focus of a seat row to the collapse button of the seat list (review of step 6, N6) | 2.8 |
| The text of a silent seat has the opacity 0.8 in place of 0.45, for 4.5:1 on the panel, the hover row, and the marked row. The value 0.70 of the review gives 3.87:1 on the hover row (review of step 6, N3) | 2.8 |
| The automatic tier leaves out the shortest and the longest 5% of the intervals of a window, and a build of the scene during play starts a new window (review of step 6, N2) | 2.6 |
| A window of a steady 30 fps (each other interval from 26.7 ms to 40 ms) does not drop the tier, so that a browser limit of 30 fps in a power-saving mode keeps the tier. The tier keeps the time between frames as its measure, because the work time of a frame does not hold the GPU time (review of step 6, N8) | 2.6 |
| A demo file that does not load gets the message "The demo did not load. Check the connection." with "Try again", which selects the demo again. The hash changes only after the file loads. At start, the title names the demo, and the play buttons also select it again (review of step 6, B2) | 2.2, 2.8 |
