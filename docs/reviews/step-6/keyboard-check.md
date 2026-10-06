# Step 6: keyboard check

`pnpm keyboard` (`tools/keyboard-check.ts`) made this check on 2026-10-05 in headless Chromium
of Playwright 1.63, on the build of commit `90ac331`. It uses the keyboard
alone: it moves the focus with Tab and Shift+Tab, and it operates each control with Space, Enter,
the arrows, Home, End, and Escape. The check passed at both sizes of design 9.5, with no console
error.

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

After the second re-review of step 6, the tool also checks this item:

- On a phone with touch, `elementFromPoint` hits the link on each row of the box of each credit
  link (S1).

Limits of the check:

- On macOS, the arrow keys open the native menu of the speed `select`. Headless Chromium does
  not show that menu, so the check uses the type-ahead of the closed menu ("0", then "1"). A
  person must check the arrows in the open menu in a browser with a window.
- "Reset view" shows only that the key works with no error. The check does not measure the
  camera.
- The check reads the DOM and the accessible names. It does not use a screen reader.

| Size | Control | Keys | Result | Check |
|---|---|---|---|---|
| 1440 × 900 | Play (first screen) | Tab x1, Enter | first stop of Tab: true; play starts: true; focus on "Pause" | pass |
| 1440 × 900 | Play and pause (bar) | Tab x0, Space, Enter | Space pauses: true; Enter plays: true | pass |
| 1440 × 900 | Seek | Tab, Right x3, Home, End, Home | 0 s, Right x3 3 s, Home 0 s, End 280 of 280 s | pass |
| 1440 × 900 | Speed | Tab, 0, 1 (type-ahead) | 1x, 0 gives 0.5x, 1 gives 1x | pass |
| 1440 × 900 | Volume | Tab, Left x2, Home, End | 100 to 98, Home 0 (mute shows true), End 100 | pass |
| 1440 × 900 | Reset view | Tab, Enter | the view resets, no error | pass |
| 1440 × 900 | Full screen | Tab, Enter | full screen: true, label "Exit full screen" | pass |
| 1440 × 900 | Mute | Tab, Space, Enter | aria-pressed true, then false | pass |
| 1440 × 900 | Keys of the page (focus on the page) | Space x2, Right x2, Left, Home | Space: "Pause" to "Play" to "Pause"; 5 s, Right x2 15 s, Left 10 s, Home 0 s | pass |
| 1440 × 900 | Drawer button and Escape | Tab x4, Enter, Tab, Escape | opens: true; Escape closes: true; focus back on "Open the drawer" | pass |
| 1440 × 900 | Focus order into the drawer | Space on the drawer button, Tab x9 | D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds > Symphony No. 5, mvt 1, Ludwig van Beethoven, 5 minutes 16 seconds > Åse's Death, Edvard Grieg, 3 minutes 36 seconds > Piano Concerto No. 23, mvt 2, Wolfgang Amadeus Mozart, 7 minutes 1 second > Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds > Select a MIDI file > Expand the seat list > Auto > One per part | pass |
| 1440 × 900 | Demo row "Andante in C, K. 315" | Shift+Tab to the row, Enter | loads the demo, hash #demo=mozart-k315, starts when ready: true | pass |
| 1440 × 900 | Select a MIDI file (a file that is not MIDI) | Tab, Enter, select the file | message "This file is not a valid MIDI file." | pass |
| 1440 × 900 | Escape in the message | Shift+Tab to the close button, Escape | closes: true; the drawer stays open: true; focus on "Pause" | pass |
| 1440 × 900 | Close the message | Shift+Tab to the button, Enter | closes: true; focus on "Pause" | pass |
| 1440 × 900 | Select a MIDI file (a valid file) | Tab, Space, select the file | plays the file "one-note" | pass |
| 1440 × 900 | Expand the seat list | Tab, Enter | aria-expanded true, 7 seat rows | pass |
| 1440 × 900 | Seat toggles M and S | Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Flutes), Shift+Tab, Enter | mute true (row dim: true), solo true, mute again false | pass |
| 1440 × 900 | Focus on a seat toggle, then a new piece | Shift+Tab to Mute Cellos, a new hash | focus on "Collapse the seat list" | pass |
| 1440 × 900 | Settings: Section size and Quality | Tab, Enter (One per part), Tab, Space (Low) | section size "One per part", quality "Low" | pass |
| 1440 × 900 | Third-party licenses | Tab, Enter | opens /third-party-licenses.txt in a new tab | pass |
| 1440 × 900 | Console |  | no errors | pass |
| 1440 × 900 | Try again (failed load) | Tab x9, Enter | message "The instruments did not load. Check the connection, then try again."; the samples load and the piece plays: true | pass |
| 390 × 844 | Play (first screen) | Tab x1, Enter | first stop of Tab: true; play starts: true; focus on "Pause" | pass |
| 390 × 844 | Play and pause (bar) | Tab x0, Space, Enter | Space pauses: true; Enter plays: true | pass |
| 390 × 844 | Seek | Tab, Right x3, Home, End, Home | 0 s, Right x3 3 s, Home 0 s, End 280 of 280 s | pass |
| 390 × 844 | Mute | Tab, Space, Enter | aria-pressed true, then false | pass |
| 390 × 844 | Keys of the page (focus on the page) | Space x2, Right x2, Left, Home | Space: "Pause" to "Play" to "Pause"; 1 s, Right x2 12 s, Left 7 s, Home 0 s | pass |
| 390 × 844 | Drawer button and Escape | Tab x1, Enter, Tab, Escape | opens: true; Escape closes: true; focus back on "Open the drawer" | pass |
| 390 × 844 | Focus order into the drawer | Space on the drawer button, Tab x9 | D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds > Symphony No. 5, mvt 1, Ludwig van Beethoven, 5 minutes 16 seconds > Åse's Death, Edvard Grieg, 3 minutes 36 seconds > Piano Concerto No. 23, mvt 2, Wolfgang Amadeus Mozart, 7 minutes 1 second > Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds > Select a MIDI file > Expand the seat list > Speed > Volume | pass |
| 390 × 844 | Demo row "Andante in C, K. 315" | Shift+Tab to the row, Enter | loads the demo, hash #demo=mozart-k315, starts when ready: true | pass |
| 390 × 844 | Select a MIDI file (a file that is not MIDI) | Tab, Enter, select the file | message "This file is not a valid MIDI file." | pass |
| 390 × 844 | Escape in the message | Shift+Tab to the close button, Escape | closes: true; the drawer stays open: true; focus on "Pause" | pass |
| 390 × 844 | Close the message | Shift+Tab to the button, Enter | closes: true; focus on "Pause" | pass |
| 390 × 844 | Select a MIDI file (a valid file) | Tab, Space, select the file | plays the file "one-note" | pass |
| 390 × 844 | Expand the seat list | Tab, Enter | aria-expanded true, 7 seat rows | pass |
| 390 × 844 | Seat toggles M and S | Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Flutes), Shift+Tab, Enter | mute true (row dim: true), solo true, mute again false | pass |
| 390 × 844 | Focus on a seat toggle, then a new piece | Shift+Tab to Mute Cellos, a new hash | focus on "Collapse the seat list" | pass |
| 390 × 844 | Speed (Playback group) | Tab, 0, 1 (type-ahead) | 1x, 0 gives 0.5x, 1 gives 1x | pass |
| 390 × 844 | Volume (Playback group) | Tab, Left x2, Home, End | 100 to 98, Home 0 (mute shows true), End 100 | pass |
| 390 × 844 | Reset view (Playback group) | Tab, Enter | the view resets, no error | pass |
| 390 × 844 | Full screen (Playback group) | Tab, Enter | full screen: true, label "Exit full screen" | pass |
| 390 × 844 | Settings: Section size and Quality | Tab, Enter (One per part), Tab, Space (Low) | section size "One per part", quality "Low" | pass |
| 390 × 844 | Third-party licenses | Tab, Enter | opens /third-party-licenses.txt in a new tab | pass |
| 390 × 844 | Drag handle | Tab | not in the focus order: true | pass |
| 390 × 844 | Console |  | no errors | pass |
| 390 × 844 | Try again (failed load) | Tab x5, Enter | message "The instruments did not load. Check the connection, then try again."; the samples load and the piece plays: true | pass |
| 390 × 844, touch | Tap on the hidden seek bar (20 ms) | touch at 80% of the seek bar for 20 ms | 1 s to 2 s; the bar shows: true | pass |
| 390 × 844, touch | Tap on the hidden pause button (20 ms) | touch on the pause button for 20 ms, two times | label "Pause"; the bar shows: true; the next tap gives "Play" | pass |
| 390 × 844, touch | Tap on the hidden seek bar (60 ms) | touch at 80% of the seek bar for 60 ms | 8 s to 8 s; the bar shows: true | pass |
| 390 × 844, touch | Tap on the hidden pause button (60 ms) | touch on the pause button for 60 ms, two times | label "Pause"; the bar shows: true; the next tap gives "Play" | pass |
| 390 × 844, touch | Tap on the hidden seek bar (120 ms) | touch at 80% of the seek bar for 120 ms | 14 s to 15 s; the bar shows: true | pass |
| 390 × 844, touch | Tap on the hidden pause button (120 ms) | touch on the pause button for 120 ms, two times | label "Pause"; the bar shows: true; the next tap gives "Play" | pass |
| 390 × 844, touch | Touch size of each control | tap on the drawer button, tap on the collapse button | all 60 controls are 44 px or more | pass |
| 390 × 844, touch | Line height of the credits with links |  | each paragraph keeps its line height | pass |
| 390 × 844, touch | Hit target of each credit link |  | all 6 links get each row of their box | pass |
| 1440 × 900 | Mouse focus in the bar | click on Pause, click on Play, 4 s with no motion | focus on "Pause"; the bar hides: true | pass |
| 1440 × 900 | Keyboard focus in the bar | Tab x9 to Pause, 4 s with no motion | the bar shows: true | pass |
| 1440 × 900 | Demo file that does not load (start) | Tab x9 to Try again, Enter | message "The demo did not load. Check the connection, then try again."; retry true; title "D'un matin de printemps"; first play true; hash ""; Try again plays the demo: true | pass |
| 1440 × 900 | Demo file that does not load (selection) | Enter on the Beethoven row, Shift+Tab to Try again, Enter | message "The demo did not load. Check the connection, then try again."; retry true; title "D'un matin de printemps"; first play false; hash "#demo=boulanger-matin"; after Try again, hash "#demo=beethoven-5" | pass |
| 1440 × 900 | Try again after a failed selection and a failed load | select Beethoven (fails), the samples fail, click Try again | first message "The demo did not load. Check the connection, then try again."; Try again loads "boulanger-matin" | pass |
| 1440 × 900 | Play button of the first screen |  | top 414 px while the samples load, 414 px when they are ready | pass |
