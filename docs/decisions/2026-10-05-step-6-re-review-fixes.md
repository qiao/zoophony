# Decisions of the fixes of the step 6 re-review

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent of the fixes of the step 6 re-review decided the details below. The user
can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The tap that shows the hidden bar keeps its controls inert until its click, or 0.5 s after the finger lifts with no click (a long press or a drag). Its click on the bar stops in the capture phase (re-review of step 6, R1) | 2.3 |
| On a touch screen, each credit link has a minimum width and height of 44 px, with negative vertical margins of half the difference to one line. The box of a link thus covers part of the lines above and below it, and `position: relative` paints the link over the next paragraph (re-review of step 6, R2, and second re-review, S1) | 2.8 |
| Only a keyboard focus in the bar (`:focus-visible`) keeps the bar visible during play. A focus from a click or a tap does not (re-review of step 6, R3) | 2.8 |
| A window of a steady 50 fps (each other interval from 16 ms to 24 ms) does not drop the tier, as a steady 30 fps. The app does not measure the refresh rate of the display (re-review of step 6, R5) | 2.6 |
