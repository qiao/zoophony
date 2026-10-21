# Decisions of the step 6 credits, messages, keys, and phone layout

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent of the credits, the messages, the keyboard, the URL hash, and the phone
layout of step 6 decided the details below. The user can reverse each one. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The credits show the credit line of the current demo first, as the prototype, and then the sources of the other demos under "Demo sources". The link to the license file opens a new tab | 2.8, 7.3, 8.1 |
| A seek to the song start during play has the start point `Number.MIN_VALUE`, so that the conductor shows no ready gesture | 6.5 |
| The keys of 2.4 leave each key that the control with the focus uses to that control, Space does not repeat, and a key action shows the bar | 2.4 |
| Escape closes the drawer and gives the focus of the drawer to the drawer button | 2.4 |
| The title is the polite live region of the current piece | 2.8 |
| A selection in the demo list writes the URL hash with `history.replaceState()`, and a change of the hash in the address bar shows its demo on the first screen | 2.2 |
| A drag of the handle of the sheet down by more than a quarter of its height or 80 px closes the sheet. The handle stays at the top, and a screen reader skips it | 2.8 |
| On a phone, the bar moves four controls into the "Playback" group, so that the page has one control of each kind | 2.8 |
| A row of the demo list has the `aria-label` "{title}, {composer}, {spoken length}" | 2.8 |
| An audio failure after the load (the `onError` function of the `Player`, 6.8) gets the message "An error stopped the music. Try again." with the "Try again" button. 2.8 had no text for it (review of step 1, F2) | 2.8, 6.8 |
| A message stays while the pointer is over it or it holds the focus, and closes 6 s after the user leaves it. Escape closes it. A new piece closes it | 2.8 |
