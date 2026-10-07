# Step 6: keyboard check

`pnpm keyboard` (`tools/keyboard-check.ts`) made this check on 2026-10-05 in headless Chromium
of Playwright 1.63, on the build of commit `a842985`, with the "Automatic camera" toggle and the
key C of design 2.4 and 2.5. It uses the keyboard alone: it moves the focus with Tab and
Shift+Tab, and it operates each control with Space, Enter, the arrows, Home, End, Escape, and C.
The check passed at both sizes of design 9.5, with no console error. After the demo list of the
user decision of 2026-10-05 (design 8.2), the check ran again on the build of commit `65a87ed`,
and it passed.

After the review of step 6, the tool also checks these items (`docs/reviews/step-6.md`):

- On a phone with touch, a tap on the hidden bar only shows it (B1), and each control that shows
  in the bar and in the open drawer is 44 px or more (N4).
- A demo file that does not load gives the message with "Try again", at start and on a
  selection, and the URL hash changes only after the file loads (B2).
- The focus goes to the play button of the bar after a play on the first screen (N1), and to the
  collapse button of the seat list after a new piece (N6).
- The play button of the first screen stays in place when the load ends (N5).

After the re-review of step 6, the tool also checks these items:

- Each tap on the hidden bar holds the finger down for 20, 60, and 120 ms, with the CDP touch
  events. The tap only shows the bar, and the next tap reaches the control (R1).
- Each credit link is 44 × 44 px or more on a phone with touch, and each credit paragraph keeps
  its line height (R2).
- After a mouse click on Pause and Play, the bar hides after 4 s. After a Tab to Pause, it stays
  (R3).
- After a failed selection and a failed load of the samples, "Try again" loads the samples of the
  current demo (R4).

After the second re-review of step 6, the tool also checks that each row of the box of each
credit link gets the link on a phone with touch (S1).

After the fixes of the UI and app flow findings of the UX audit
(`docs/audits/2026-10-05-ux-design.md`), the check ran again on 2026-10-06 on the build of commit
`55cdb84` (after the rebase onto the sound fixes and the camera and stage fixes), and it passed.
The table below is from that run. The tool also checks these items:

- The close button is the first stop of the focus in the drawer. Enter on it closes the drawer,
  and the drawer button gets the focus (DR3).
- On a phone, a selection of a demo closes the sheet, and the drawer button gets the focus. A
  desktop keeps the drawer open (PH1). The check opens the sheet again after each selection.
- The button "Select a piece" is the second stop of the focus on the first screen. Enter opens the
  drawer at the demo list, with the focus on the row of the current demo (FI2).
- A control with the keyboard focus shows its tooltip, for example "Mute (M)", and Escape hides
  the tooltip and keeps the focus (CT1).
- The keys M and F toggle the mute button and the full screen (CT1).

After the fixes of the UI findings of the second UX audit
(`docs/audits/2026-10-06-ux-design-2.md`), the check ran again on 2026-10-06 on the build of
commit `7b83d6a`, after the rebase onto the layout, score, and choir fixes, and it passed. The
table below is from that run. The changes of the check:

- The tooltips "Volume" and "Speed" show on a keyboard focus on the volume slider and the speed
  menu of the bar (N17).
- The check of the seat toggles solos the oboes of K. 315. The K. 315 flute is the soloist, and
  its row is now "Flute soloist" (N20).

After the polished UI of the mockup (`docs/decisions/2026-10-06-polished-ui.md`), the check ran
again on 2026-10-06 on the build of commit `729fdb4`, and it passed. The table below is from that
run. The changes of the check:

- At 1440 × 900, the drawer opens at start with the seat list expanded, and Escape closes it. A
  phone starts with the closed drawer. The next checks start from the closed drawer.
- The focus order into the drawer goes to the file button, which now comes after the seat list.
- The check of the seat list collapses the expanded list first, then expands it.

After the credits dialog and the link to GitHub
(`docs/decisions/2026-10-07-credits-modal.md`), the check ran again on 2026-10-07 on the build of
commit `5539c3f`, and it passed. The table below is from that run. The changes of the check:

- The link "Credits" at the end of the drawer opens the credits dialog, and the close button in
  it gets the focus. "Third-party licenses" in the dialog opens the license file in a new tab.
  M and C do nothing while the dialog is open. Escape and the close button close only the
  dialog, and the link gets the focus again.
- On a phone with touch, the check opens the dialog before it measures the credit links. Each
  control of the dialog is 44 px or more.
- The link to GitHub is the first stop of Tab, and Enter opens the repository in a new tab. The
  check answers the request to GitHub itself, so it needs no network. On a phone with touch, a
  square of 44 px around the mark hits the link.
- The play button of the first screen is now one Tab after the link to GitHub, and "Select a
  piece" is the third stop of Tab.

Limits of the check:

- On macOS, the arrow keys open the native menu of the speed `select`. Headless Chromium does
  not show that menu, so the check uses the type-ahead of the closed menu ("0", then "1"). A
  person must check the arrows in the open menu in a browser with a window.
- "Reset view" shows that the key works and that the automatic camera turns off. The check does
  not measure the camera. The smoke test (`pnpm smoke`) checks the camera in Cinematic mode and
  the change to Free mode.
- The check reads the DOM and the accessible names. It does not use a screen reader.

| Size | Control | Keys | Result | Check |
|---|---|---|---|---|
| 1440 × 900 | Drawer at start | Escape | open: true; seat list expanded: true; Escape closes: true | pass |
| 1440 × 900 | Link to GitHub | Tab x1, Enter | opens https://github.com/qiao/zoophony in a new tab; focus stays on "Zoophony on GitHub" | pass |
| 1440 × 900 | Play (first screen) | Tab x1, Enter | first stop of Tab: true; play starts: true; focus on "Pause" | pass |
| 1440 × 900 | Play and pause (bar) | Tab x0, Space, Enter | Space pauses: true; Enter plays: true | pass |
| 1440 × 900 | Seek | Tab, Right x3, Home, End, Home | 0 s, Right x3 3 s, Home 0 s, End 280 of 280 s | pass |
| 1440 × 900 | Speed | Tab, 0, 1 (type-ahead) | 1×, 0 gives 0.5×, 1 gives 1× | pass |
| 1440 × 900 | Volume | Tab, Left x2, Home, End | 100 to 98, Home 0 (mute shows true), End 100 | pass |
| 1440 × 900 | Reset view | Tab, Enter | the view resets, the automatic camera is off | pass |
| 1440 × 900 | Full screen | Tab, Enter | full screen: true, label "Exit full screen" | pass |
| 1440 × 900 | Mute | Tab, Space, Enter | aria-pressed true, then false | pass |
| 1440 × 900 | Tooltip of a control with the focus | Tab to Mute, wait 0.6 s, Escape | tooltip "Mute (M)"; Escape hides it: true; focus stays on "Mute" | pass |
| 1440 × 900 | Tooltips of the speed menu and the volume slider | Tab to Volume, wait 0.6 s, Shift+Tab to Speed, wait 0.6 s | tooltips "Volume" and "Speed" | pass |
| 1440 × 900 | Automatic camera | Tab, Space, Enter | aria-pressed false, then true, then false | pass |
| 1440 × 900 | Key C (focus on the page) | c, C | automatic camera false, then true, then false | pass |
| 1440 × 900 | Keys M and F (focus on the page) | m, M, f, F | mute true, then false; full screen true, then false | pass |
| 1440 × 900 | Keys of the page (focus on the page) | Space x2, Right x2, Left, Home | Space: "Pause" to "Play" to "Pause"; 7 s, Right x2 17 s, Left 13 s, Home 0 s | pass |
| 1440 × 900 | Drawer button and Escape | Tab x3, Enter, Tab, Escape | opens: true; Escape closes: true; focus back on "Open the drawer" | pass |
| 1440 × 900 | Focus order into the drawer | Space on the drawer button, Tab x41 | Close the drawer > D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds > Symphony No. 9, Op. 125: Ode to Joy, Ludwig van Beethoven, 2 minutes 38 seconds > Eine kleine Nachtmusik, K. 525: I, Wolfgang Amadeus Mozart, 4 minutes 8 seconds > Brandenburg Concerto No. 3, BWV 1048: I, Johann Sebastian Bach, 5 minutes 27 seconds > Symphony No. 8, Op. 93: II, Ludwig van Beethoven, 3 minutes 40 seconds > Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds > Collapse the seat list > Mute Violins 1 > (31 more) > Select a MIDI file | pass |
| 1440 × 900 | Close the drawer (button) | Shift+Tab x40, Enter | closes: true; focus on "Open the drawer" | pass |
| 1440 × 900 | Demo row "Andante in C, K. 315" | Tab to the row, Enter | loads the demo, hash #demo=mozart-k315, starts when ready: true; the drawer closes: false; focus on "Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds" | pass |
| 1440 × 900 | Select a MIDI file (a file that is not MIDI) | Tab, Enter, select the file | message "This file is not a valid MIDI file." | pass |
| 1440 × 900 | Escape in the message | Shift+Tab to the close button, Escape | closes: true; the drawer stays open: true; focus on "Pause" | pass |
| 1440 × 900 | Close the message | Shift+Tab to the button, Enter | closes: true; focus on "Pause" | pass |
| 1440 × 900 | Select a MIDI file (a valid file) | Tab, Space, select the file | plays the file "one-note" | pass |
| 1440 × 900 | Expand the seat list | Tab, Enter (collapse), Enter | aria-expanded false, then true, 7 seat rows | pass |
| 1440 × 900 | Seat toggles M and S | Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Oboes), Shift+Tab, Enter | mute true (row dim: true), solo true, mute again false | pass |
| 1440 × 900 | Focus on a seat toggle, then a new piece | Shift+Tab to Mute Cellos, a new hash | focus on "Collapse the seat list" | pass |
| 1440 × 900 | Settings: Section size and Quality | Tab, Enter (One per part), Tab, Space (Low) | section size "One per part", quality "Low" | pass |
| 1440 × 900 | Credits link | Tab x1, Enter | aria-haspopup dialog; the dialog opens: true; focus on "Close the credits" | pass |
| 1440 × 900 | Third-party licenses (in the credits dialog) | Tab, Enter | opens /third-party-licenses.txt in a new tab | pass |
| 1440 × 900 | Escape in the credits dialog | M, C, Escape | M and C do nothing: true; the dialog closes: true; the drawer stays open: true; focus on "Credits" | pass |
| 1440 × 900 | Close the credits (button) | Enter on the link, Enter on the close button | the dialog closes: true; focus on "Credits" | pass |
| 1440 × 900 | Console |  | no errors | pass |
| 1440 × 900 | Try again (failed load) | Tab x12, Enter | message "The instruments did not load. Check the connection."; the samples load and the piece plays: true | pass |
| 390 × 844 | Drawer at start | Escape | open: false; seat list expanded: false; Escape closes: true | pass |
| 390 × 844 | Link to GitHub | Tab x1, Enter | opens https://github.com/qiao/zoophony in a new tab; focus stays on "Zoophony on GitHub" | pass |
| 390 × 844 | Play (first screen) | Tab x1, Enter | first stop of Tab: true; play starts: true; focus on "Pause" | pass |
| 390 × 844 | Play and pause (bar) | Tab x0, Space, Enter | Space pauses: true; Enter plays: true | pass |
| 390 × 844 | Seek | Tab, Right x3, Home, End, Home | 0 s, Right x3 3 s, Home 0 s, End 280 of 280 s | pass |
| 390 × 844 | Mute | Tab, Space, Enter | aria-pressed true, then false | pass |
| 390 × 844 | Tooltip of a control with the focus | Tab to Mute, wait 0.6 s, Escape | tooltip "Mute (M)"; Escape hides it: true; focus stays on "Mute" | pass |
| 390 × 844 | Automatic camera | Tab, Space, Enter | aria-pressed true, then false, then true | pass |
| 390 × 844 | Key C (focus on the page) | c, C | automatic camera true, then false, then true | pass |
| 390 × 844 | Keys M and F (focus on the page) | m, M, f, F | mute true, then false; full screen true, then false | pass |
| 390 × 844 | Keys of the page (focus on the page) | Space x2, Right x2, Left, Home | Space: "Pause" to "Play" to "Pause"; 2 s, Right x2 13 s, Left 8 s, Home 0 s | pass |
| 390 × 844 | Drawer button and Escape | Tab x1, Enter, Tab, Escape | opens: true; Escape closes: true; focus back on "Open the drawer" | pass |
| 390 × 844 | Focus order into the drawer | Space on the drawer button, Tab x9 | Close the drawer > D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds > Symphony No. 9, Op. 125: Ode to Joy, Ludwig van Beethoven, 2 minutes 38 seconds > Eine kleine Nachtmusik, K. 525: I, Wolfgang Amadeus Mozart, 4 minutes 8 seconds > Brandenburg Concerto No. 3, BWV 1048: I, Johann Sebastian Bach, 5 minutes 27 seconds > Symphony No. 8, Op. 93: II, Ludwig van Beethoven, 3 minutes 40 seconds > Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds > Expand the seat list > Select a MIDI file | pass |
| 390 × 844 | Close the drawer (button) | Shift+Tab x8, Enter | closes: true; focus on "Open the drawer" | pass |
| 390 × 844 | Demo row "Andante in C, K. 315" | Tab to the row, Enter | loads the demo, hash #demo=mozart-k315, starts when ready: true; the drawer closes: true; focus on "Open the drawer" | pass |
| 390 × 844 | Select a MIDI file (a file that is not MIDI) | Tab, Enter, select the file | message "This file is not a valid MIDI file." | pass |
| 390 × 844 | Escape in the message | Shift+Tab to the close button, Escape | closes: true; the drawer stays open: true; focus on "Pause" | pass |
| 390 × 844 | Close the message | Shift+Tab to the button, Enter | closes: true; focus on "Pause" | pass |
| 390 × 844 | Select a MIDI file (a valid file) | Tab, Space, select the file | plays the file "one-note" | pass |
| 390 × 844 | Expand the seat list | Tab, Enter | aria-expanded false, then true, 7 seat rows | pass |
| 390 × 844 | Seat toggles M and S | Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Oboes), Shift+Tab, Enter | mute true (row dim: true), solo true, mute again false | pass |
| 390 × 844 | Focus on a seat toggle, then a new piece | Shift+Tab to Mute Cellos, a new hash | focus on "Collapse the seat list" | pass |
| 390 × 844 | Speed (Playback group) | Tab, 0, 1 (type-ahead) | 1×, 0 gives 0.5×, 1 gives 1× | pass |
| 390 × 844 | Volume (Playback group) | Tab, Left x2, Home, End | 100 to 98, Home 0 (mute shows true), End 100 | pass |
| 390 × 844 | Reset view (Playback group) | Tab, Enter | the view resets, the automatic camera is off | pass |
| 390 × 844 | Full screen (Playback group) | Tab, Enter | full screen: true, label "Exit full screen" | pass |
| 390 × 844 | Settings: Section size and Quality | Tab, Enter (One per part), Tab, Space (Low) | section size "One per part", quality "Low" | pass |
| 390 × 844 | Credits link | Tab x1, Enter | aria-haspopup dialog; the dialog opens: true; focus on "Close the credits" | pass |
| 390 × 844 | Third-party licenses (in the credits dialog) | Tab, Enter | opens /third-party-licenses.txt in a new tab | pass |
| 390 × 844 | Escape in the credits dialog | M, C, Escape | M and C do nothing: true; the dialog closes: true; the drawer stays open: true; focus on "Credits" | pass |
| 390 × 844 | Close the credits (button) | Enter on the link, Enter on the close button | the dialog closes: true; focus on "Credits" | pass |
| 390 × 844 | Drag handle | Tab | not in the focus order: true | pass |
| 390 × 844 | Console |  | no errors | pass |
| 390 × 844 | Try again (failed load) | Tab x8, Enter | message "The instruments did not load. Check the connection."; the samples load and the piece plays: true | pass |
| 390 × 844, touch | Tap on the hidden seek bar (20 ms) | touch at 80% of the seek bar for 20 ms | 1 s to 2 s; the bar shows: true | pass |
| 390 × 844, touch | Tap on the hidden pause button (20 ms) | touch on the pause button for 20 ms, two times | label "Pause"; the bar shows: true; the next tap gives "Play" | pass |
| 390 × 844, touch | Tap on the hidden seek bar (60 ms) | touch at 80% of the seek bar for 60 ms | 8 s to 8 s; the bar shows: true | pass |
| 390 × 844, touch | Tap on the hidden pause button (60 ms) | touch on the pause button for 60 ms, two times | label "Pause"; the bar shows: true; the next tap gives "Play" | pass |
| 390 × 844, touch | Tap on the hidden seek bar (120 ms) | touch at 80% of the seek bar for 120 ms | 15 s to 15 s; the bar shows: true | pass |
| 390 × 844, touch | Tap on the hidden pause button (120 ms) | touch on the pause button for 120 ms, two times | label "Pause"; the bar shows: true; the next tap gives "Play" | pass |
| 390 × 844, touch | Touch size of each control | tap on the drawer button, tap on the collapse button | all 58 controls are 44 px or more | pass |
| 390 × 844, touch | Hit area of the link to GitHub |  | a square of 44 px around the mark hits the link | pass |
| 390 × 844, touch | Touch size of each control of the credits dialog | tap on the link "Credits" | all 7 controls are 44 px or more | pass |
| 390 × 844, touch | Line height of the credits with links |  | each paragraph keeps its line height | pass |
| 390 × 844, touch | Hit target of each credit link |  | all 6 links get each row of their box | pass |
| 1440 × 900 | Mouse focus in the bar | click on Pause, click on Play, 4 s with no motion | focus on "Pause"; the bar hides: true | pass |
| 1440 × 900 | Keyboard focus in the bar | Tab x11 to Pause, 4 s with no motion | the bar shows: true | pass |
| 1440 × 900 | Demo file that does not load (start) | Tab x12 to Try again, Enter | message "The demo did not load. Check the connection."; retry true; title "D'un matin de printemps"; first play true; hash ""; Try again plays the demo: true | pass |
| 1440 × 900 | Demo file that does not load (selection) | Enter on the Ode to Joy row, Shift+Tab to Try again, Enter | message "The demo did not load. Check the connection."; retry true; title "D'un matin de printemps"; first play false; hash "#demo=boulanger-matin"; after Try again, hash "#demo=beethoven-9" | pass |
| 1440 × 900 | Try again after a failed selection and a failed load | select the Ode to Joy (fails), the samples fail, click Try again | first message "The demo did not load. Check the connection."; Try again loads "boulanger-matin" | pass |
| 1440 × 900 | Play button of the first screen |  | top 612 px while the samples load, 612 px when they are ready | pass |
| 1440 × 900 | Select a piece (first screen) | Tab x3, Enter | the drawer opens: true; focus on "D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds" | pass |
