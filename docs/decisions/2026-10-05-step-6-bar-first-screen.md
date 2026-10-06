# Decisions of the step 6 bar, first screen, and demo list

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent of the bar, the first screen, and the demo list of step 6 decided the
details below. The user can reverse each one. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| A click on play while the samples load starts the piece when they are ready. The bar then shows "Pause", and a second click cancels the wait | 2.2, 2.4 |
| A click that waits for the samples, and a selection of a demo, resume the suspended `AudioContext` at once, because Safari can reject a resume outside a user gesture | 2.2, 6.8 |
| The first screen shows until the first play of each piece, so a selected piece shows the load ring and the load text while its samples load | 2.2, 2.8 |
| A selection of the current demo does not load it again. It only plays the demo when the demo does not play and does not wait | 2.2 |
| The volume slider goes from 0 to 100 and starts at 100, the gain is the square of the position, and a move of the slider ends the mute | 2.8, 6.4 |
| The seek bar moves in whole seconds and cannot seek before the samples are ready. Until the heard song time comes within 0.25 s of a seek point, the bar shows the seek point and a play starts from it | 2.8, 6.5 |
| A seek during play makes the seek point the start point of the transport | 5.2, 6.5 |
| The labels "Open the drawer" and "Exit full screen", and no full screen button without `document.fullscreenEnabled` | 2.8 |
