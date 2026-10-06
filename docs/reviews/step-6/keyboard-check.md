# Step 6: keyboard check

`pnpm keyboard` (`tools/keyboard-check.ts`) made this check on 2026-10-05 in headless Chromium
of Playwright 1.63, on the build of commit `b1c05b1`. It uses the keyboard
alone: it moves the focus with Tab and Shift+Tab, and it operates each control with Space, Enter,
the arrows, Home, End, and Escape. The check passed at both sizes of design 9.5, with no console
error.

Limits of the check:

- On macOS, the arrow keys open the native menu of the speed `select`. Headless Chromium does
  not show that menu, so the check uses the type-ahead of the closed menu ("0", then "1"). A
  person must check the arrows in the open menu in a browser with a window.
- "Reset view" shows only that the key works with no error. The check does not measure the
  camera.
- The check reads the DOM and the accessible names. It does not use a screen reader.

| Size | Control | Keys | Result | Check |
|---|---|---|---|---|
| 1440 × 900 | Play (first screen) | Tab x1, Enter | first stop of Tab: true; play starts: true | pass |
| 1440 × 900 | Play and pause (bar) | Tab x1, Space, Enter | Space pauses: true; Enter plays: true | pass |
| 1440 × 900 | Seek | Tab, Right x3, Home, End, Home | 1 s, Right x3 4 s, Home 0 s, End 280 of 280 s | pass |
| 1440 × 900 | Speed | Tab, 0, 1 (type-ahead) | 1x, 0 gives 0.5x, 1 gives 1x | pass |
| 1440 × 900 | Volume | Tab, Left x2, Home, End | 100 to 98, Home 0 (mute shows true), End 100 | pass |
| 1440 × 900 | Reset view | Tab, Enter | the view resets, no error | pass |
| 1440 × 900 | Full screen | Tab, Enter | full screen: true, label "Exit full screen" | pass |
| 1440 × 900 | Mute | Tab, Space, Enter | aria-pressed true, then false | pass |
| 1440 × 900 | Keys of the page (focus on the page) | Space x2, Right x2, Left, Home | Space: "Pause" to "Play" to "Pause"; 5 s, Right x2 15 s, Left 10 s, Home 0 s | pass |
| 1440 × 900 | Drawer button and Escape | Tab x4, Enter, Tab, Escape | opens: true; Escape closes: true; focus back on "Open the drawer" | pass |
| 1440 × 900 | Focus order into the drawer | Space on the drawer button, Tab x9 | D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds > Symphony No. 5, mvt 1, Ludwig van Beethoven, 5 minutes 16 seconds > Åse's Death, Edvard Grieg, 3 minutes 36 seconds > Piano Concerto No. 23, mvt 2, Wolfgang Amadeus Mozart, 7 minutes 1 second > Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds > Hallelujah, George Frideric Handel, 3 minutes 8 seconds > Select a MIDI file > Expand the seat list > Auto | pass |
| 1440 × 900 | Demo row "Hallelujah" | Shift+Tab to the row, Enter | loads the demo, hash #demo=handel-hallelujah, starts when ready: true | pass |
| 1440 × 900 | Select a MIDI file (a file that is not MIDI) | Tab, Enter, select the file | message "This file is not a valid MIDI file." | pass |
| 1440 × 900 | Escape in the message | Shift+Tab to the close button, Escape | closes: true; the drawer stays open: true; focus on "Pause" | pass |
| 1440 × 900 | Close the message | Shift+Tab to the button, Enter | closes: true; focus on "Pause" | pass |
| 1440 × 900 | Select a MIDI file (a valid file) | Tab, Space, select the file | plays the file "one-note" | pass |
| 1440 × 900 | Expand the seat list | Tab, Enter | aria-expanded true, 12 seat rows | pass |
| 1440 × 900 | Seat toggles M and S | Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Choir 1), Shift+Tab, Enter | mute true (row dim: true), solo true, mute again false | pass |
| 1440 × 900 | Settings: Section size and Quality | Tab, Enter (One per part), Tab, Space (Low) | section size "One per part", quality "Low" | pass |
| 1440 × 900 | Third-party licenses | Tab, Enter | opens /third-party-licenses.txt in a new tab | pass |
| 1440 × 900 | Console |  | no errors | pass |
| 1440 × 900 | Try again (failed load) | Tab x9, Enter | message "The instruments did not load. Check the connection, then try again."; the samples load and the piece plays: true | pass |
| 390 × 844 | Play (first screen) | Tab x1, Enter | first stop of Tab: true; play starts: true | pass |
| 390 × 844 | Play and pause (bar) | Tab x1, Space, Enter | Space pauses: true; Enter plays: true | pass |
| 390 × 844 | Seek | Tab, Right x3, Home, End, Home | 1 s, Right x3 4 s, Home 0 s, End 280 of 280 s | pass |
| 390 × 844 | Mute | Tab, Space, Enter | aria-pressed true, then false | pass |
| 390 × 844 | Keys of the page (focus on the page) | Space x2, Right x2, Left, Home | Space: "Pause" to "Play" to "Pause"; 1 s, Right x2 12 s, Left 7 s, Home 0 s | pass |
| 390 × 844 | Drawer button and Escape | Tab x1, Enter, Tab, Escape | opens: true; Escape closes: true; focus back on "Open the drawer" | pass |
| 390 × 844 | Focus order into the drawer | Space on the drawer button, Tab x9 | D'un matin de printemps, Lili Boulanger, 4 minutes 40 seconds > Symphony No. 5, mvt 1, Ludwig van Beethoven, 5 minutes 16 seconds > Åse's Death, Edvard Grieg, 3 minutes 36 seconds > Piano Concerto No. 23, mvt 2, Wolfgang Amadeus Mozart, 7 minutes 1 second > Andante in C, K. 315, Wolfgang Amadeus Mozart, 4 minutes 15 seconds > Hallelujah, George Frideric Handel, 3 minutes 8 seconds > Select a MIDI file > Expand the seat list > Speed | pass |
| 390 × 844 | Demo row "Hallelujah" | Shift+Tab to the row, Enter | loads the demo, hash #demo=handel-hallelujah, starts when ready: true | pass |
| 390 × 844 | Select a MIDI file (a file that is not MIDI) | Tab, Enter, select the file | message "This file is not a valid MIDI file." | pass |
| 390 × 844 | Escape in the message | Shift+Tab to the close button, Escape | closes: true; the drawer stays open: true; focus on "Pause" | pass |
| 390 × 844 | Close the message | Shift+Tab to the button, Enter | closes: true; focus on "Pause" | pass |
| 390 × 844 | Select a MIDI file (a valid file) | Tab, Space, select the file | plays the file "one-note" | pass |
| 390 × 844 | Expand the seat list | Tab, Enter | aria-expanded true, 12 seat rows | pass |
| 390 × 844 | Seat toggles M and S | Tab, Space (Mute Cellos), Tab, Enter x2 (Solo Choir 1), Shift+Tab, Enter | mute true (row dim: true), solo true, mute again false | pass |
| 390 × 844 | Speed (Playback group) | Tab, 0, 1 (type-ahead) | 1x, 0 gives 0.5x, 1 gives 1x | pass |
| 390 × 844 | Volume (Playback group) | Tab, Left x2, Home, End | 100 to 98, Home 0 (mute shows true), End 100 | pass |
| 390 × 844 | Reset view (Playback group) | Tab, Enter | the view resets, no error | pass |
| 390 × 844 | Full screen (Playback group) | Tab, Enter | full screen: true, label "Exit full screen" | pass |
| 390 × 844 | Settings: Section size and Quality | Tab, Enter (One per part), Tab, Space (Low) | section size "One per part", quality "Low" | pass |
| 390 × 844 | Third-party licenses | Tab, Enter | opens /third-party-licenses.txt in a new tab | pass |
| 390 × 844 | Drag handle | Tab | not in the focus order: true | pass |
| 390 × 844 | Console |  | no errors | pass |
| 390 × 844 | Try again (failed load) | Tab x5, Enter | message "The instruments did not load. Check the connection, then try again."; the samples load and the piece plays: true | pass |
