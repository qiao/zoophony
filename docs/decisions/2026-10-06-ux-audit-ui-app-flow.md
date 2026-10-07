# Decisions of the UI and app flow findings of the UX audit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the agent of the UI and app flow findings of the UX audit
([`audits/2026-10-05-ux-design.md`](../audits/2026-10-05-ux-design.md)) decided the details below.
The user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| While the piece waits for its samples, the second line of the load text is "The music starts after the load.", and the ring turns once in 1.6 s (LD1) | 2.2, 2.8 |
| A selection of a demo or of an accepted file closes the sheet of a phone, a refused file keeps it, and the drawer of a wider screen stays open (PH1) | 2.8 |
| The load ring follows the bytes of the preset files, and the load text counts the files. Before the first byte, 15% of the ring turns once in 2.4 s. The load texts "Loading" and "Loading instruments" come before the count (LD2) | 2.8, 6.8 |
| `index.html` holds a static load state with the title "Zoophony", which `main.ts` removes (LD2) | 2.8 |
| The key M toggles the mute button and the key F the full screen, with the rules of the key C (CT1) | 2.4 |
| The tooltips: 400 ms after a hover or a keyboard focus, none for touch, the key in parentheses, and a first Escape that only hides the tooltip (CT1) | 2.8 |
| The center of the large play button is at 72% of the height (70% on a phone), and at least 230 px (240 px) above the bottom (FI3) | 2.8 |
| A note of 3 s with an accent bar after a drag, a pinch, or a wheel turns off the automatic camera, a second text for a touch screen, and no note that replaces a failure (CT2) | 2.5, 2.8 |
| A seat of the section "piano" takes the name of its first program: Piano, Harpsichord, Clavinet, Celesta, Organ, Accordion, or Harmonica (DR2) | 2.8 |
| Each seat row has the animal line "{count} {species}" ("No animal" for the sound-only seat), and the source line moves to a third line of 12 px (DR1) | 2.8 |
| The drawer slides 16 px and fades in 200 ms (no transition with reduced motion), and a close button at its top right, beside the first heading, gives the focus to the drawer button (DR3) | 2.8 |
| A touch screen (`(pointer: coarse)`) does not show the drop hint (PH2) | 2.8 |
| In the "Playback" group of a phone, the labels "Speed" and "Volume" stand on the left of their controls, and the two buttons show their names (PH3) | 2.8 |
| While the drawer is open, the canvas moves 176 px to the left (on a phone, up by 30% of the height less 20 px), in place of a view offset of the camera (PH4) | 2.8 |
| A dropped file with no usable sequence name has an empty second line of the title (LE3) | 8.2 |
| The page title "{title}, {composer} · Zoophony", the description, the SVG icon, and the Open Graph data of `index.html`. The Open Graph image waits for the deployed URL (CP1) | 2.8 |
| A shade `rgba(11, 9, 8, 0.8)` behind the title, in place of a title that hides with the bar (VD1). `2026-10-07-title-shade.md` gives its shape and its level | 2.8 |
| Before a scene build after the first piece, the canvas fades out in 150 ms, and it fades in two frames after the build (PF1) | 2.8 |
| The failure texts of a demo file and of the instruments end with "Check the connection.", because the button "Try again" stands next to them (LE4) | 2.8 |
| The speed menu writes the speeds with the sign "×" and no trailing zero: 0.5×, 0.75×, 1×, 1.25×, 1.5× (CP3) | 2.4, 2.8 |
| One pattern for each demo title, "{work}, {catalogue number}: {movement}", and the same title in the demo list (CP2) | 8.2 |
| The development pages stay in the build for the screenshot script, with `noindex` and no link to them (CP4) | 7.1 |
| The full-page message of a browser with no WebGL2 has the name "Zoophony" and the line "An orchestra of animals plays your MIDI file." above it (LE5) | 2.8 |
| The bar of a phone does not show the duration, so that the seek bar is about 40 px longer (PH5) | 2.8 |
| The buttons "Auto" of the settings name the value that they select now, and a dim help line explains each setting (DR4) | 2.8 |
| The pointer over the stage hides with the bar, buttons change in 120 ms and have a pressed state, and the focus ring of a slider has the button radius (CT3) | 2.3, 2.8 |
