# Review of step 6: UI

Date: 2026-10-05. Reviewer: an independent review agent (design 9.8). The reviewer did not do
the work of step 6.

## Scope

- Step 6 work: `src/ui/`, `src/app/`, `src/main.ts`, `tools/keyboard-check.ts`,
  `tools/screenshots.ts`, `tools/smoke.ts`, `docs/reviews/step-6/`, and `docs/prototype/`. The
  log `f3d5e70..6d10bf6` holds 46 commits on these paths.
- The checks ran on `6d10bf6`. Later commits of other agents change only `score/` and `pose/`
  tests, `src/test-speed.ts`, and `tools/measure-targets.ts`.
- My scripts used a copy of the build, a Vite preview server and a Vite dev server of my own
  (ports 4319 to 4326), and headless Chromium of Playwright 1.63. Each script stopped its
  servers and its browser. My captures and scripts are in the scratch directory of the review
  session, outside the repository.

## Verdict

**CHANGES REQUESTED.**

The "Done when" of 9.5 holds. At 1440 × 900, each UI box of the app has the same position and
size as the prototype, to the pixel. At 390 × 844, the boxes agree, except the intended changes of
2.8. A keyboard alone reaches and uses each control at both sizes, and the focus ring shows on
each stop. The tests, the lint, the types, the format, the build, the size, the smoke test, and
the keyboard check pass.

Two defects stop the step:

1. While the bar hides during play, its controls still take taps. On a phone, the tap that
   should show the bar seeks the music or pauses it (B1).
2. A demo file that does not load gives no message. At start, the page shows an empty title and
   a play button that does nothing. On a selection, the URL hash names a demo that does not show
   (B2).

## Conditions

1. Fix B1, with a test that fails without the fix.
2. Fix B2. Give the failure a message and a retry, and do not leave the hash on a demo that did
   not load. Add the text to 2.8 and a row to section 10 if the text is new.
3. Then send the step to the review agent again. The non-blocking findings can wait, but record
   each one in `TODO.md` or reject it with a reason.

## Check results

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 114 files, 1,127 tests, 19.2 s |
| `pnpm format:check` | pass: 283 files |
| `pnpm build` | pass. The largest chunk (`renderer-*.js`) is 650.10 kB, 172.71 kB after gzip. The entry chunk is 34.34 kB, 12.13 kB after gzip. |
| `pnpm size` | pass: 234,830 B of 1,000,000 B. This agrees with 7.2. |
| `pnpm smoke` | pass. Song time 0.000 s before play, -0.939 s in the count-in, 3.044 s after 4 s. Turn of the bow arm after the downbeat: 0.192 rad. |
| `pnpm keyboard` | pass: 45 checks at both sizes, no console error. My run agrees with `docs/reviews/step-6/keyboard-check.md`. |
| Console during my runs | No error and no warning in the normal flows. The only errors come from B2. |
| Prose checks of AGENTS.md on `src/app/`, `src/ui/`, and the two tools | 0 em dashes, 0 banned words, 0 semicolon splices in comments. Each export of `app/` and `ui/` has TSDoc. |

## Prototype comparison

I opened `docs/prototype/ui.html` with `?state=` in the states "first", "playing", "error", and
"drop". I took the app in the same states, and in the states "loading", "settings", "credits",
and "no WebGL2". Each state has a capture at 1440 × 900 (scale 1) and at 390 × 844 (scale 2). I
examined each pair of images. A script also measured the box of each UI part in both pages.

### Boxes at 1440 × 900

| Part | Prototype | App |
|---|---|---|
| Title, h1 and composer | 16,16 187 × 18 (16 px), 16,36 (13 px) | the same |
| Bar | 12,832 1416 × 56 | the same |
| Bar controls (x and width) | play 21:40, time 65:34, seek 105:920, length 1031:34, speed 1069:70, mute 1143:40, volume 1189:96, reset 1291:40, full screen 1335:40, drawer 1379:40 | the same. The seek bar and the volume slider are 40 px high in place of 16 px (2.8: the sliders have the control size). |
| Drawer | 1088,12 340 × 808 | the same |
| Headings "Demos", "Seats", "Settings", "Credits" | y 37, 391, 1183, 1354 | the same |
| Demo rows | 314 × 49, from y 60 | the same |
| File button, hint | 160 × 40, 310 × 16 | the same |
| Seat row, toggle | 314 × 57, 32 × 32 | the same |
| Message | 460,760 520 × 56 | the same |
| First screen play button | 684,414 72 × 72 | 684,414 while the samples load, 684,422 when they are ready (N5) |

### Boxes at 390 × 844

| Part | Prototype | App |
|---|---|---|
| Title | y 104 | y 16. 2.8 makes this change. |
| Bar and its six controls | 8,780 374 × 56, controls 44 px | the same |
| Sheet | 8,262 374 × 506 | the same |
| Sheet content | first heading at y 293 | y 307. The handle band of the app is 24 px high, against 14 px of space in the prototype. This is a good change for touch. |
| Seat toggles | 44 × 44 | the same |
| Message | 73,653 244 × 107, over the seat rows | 8,687 374 × 73. 2.8 makes this change (the width of the bar). |

### Visible differences

| State | Difference | Severity |
|---|---|---|
| All | The canvas shows the stage of the app in place of the reference image. The layout of the scene is the work of steps 3 and 4. | none |
| All | The switch at the top center is only in the prototype (2.8). | none |
| Playing | The volume slider is at 100 in the app and at 80 in the prototype. 2.8 sets the start at 100. | none |
| Playing | The app opens the drawer with the seat list collapsed. 2.8 sets this. With the seat list expanded and the cellos muted, the drawer is the same as the prototype, with the same source lines. | none |
| Error | The app shows the first screen play button with no ring after a failed load. The prototype shows the state during play. Both are correct for their state. | none |
| Error | The text of the message wraps one word earlier, because the "Try again" button keeps its width (commit `7035604`). | none |
| Error, phone | The prototype message covers the seat rows and squeezes its text into 4 lines. The app message has the width of the bar (2.8). | none, an improvement |
| First screen | The play button moves down by 8 px when the load text clears (N5). | cosmetic |
| Phone | The handle band is 10 px higher than in the prototype. | cosmetic |
| No WebGL2 | The prototype has no such state. The app shows the exact text of 2.8 on `--panel` with a `--danger` bar. | none |
| Settings and credits | The prototype shows them only below the fold of the drawer. The app agrees with the prototype CSS: the "Playback" group shows only on a phone, at the top of the settings. | none |

The UI matches the prototype at both sizes.

## Keyboard pass

I ran my own pass with the keyboard alone, at both sizes, on the build. For each Tab stop, the
script read the accessible name, the `:focus-visible` state, the computed outline, and the place
of the element on the screen and in the sheet.

| Item | Result |
|---|---|
| Tab order, first screen, drawer closed, 1440 × 900 | Play (first screen), Play, Seek, Speed, Mute, Volume, Reset view, Full screen, Open the drawer, then the browser. 9 stops. |
| Tab order, 390 × 844 | Play (first screen), Play, Seek, Mute, Open the drawer. 5 stops. |
| Tab order into the drawer | The 5 demo rows, "Select a MIDI file", "Expand the seat list", (on a phone: Speed, Volume, Reset view, Full screen), the 7 setting buttons, "Third-party licenses". With the seat list expanded, 32 toggle buttons follow the collapse button. |
| Order of 2.8 (title, bar, drawer) | Yes. The title has no control. The message buttons come after the bar and before the drawer. |
| Focus ring | Each of the 41 stops at 1440 × 900 and the 45 stops at 390 × 844 shows `solid 2px rgb(231, 180, 90)` with a 2 px offset. |
| Focus inside the sheet | 0 of 45 stops is under the sticky handle or under the bottom edge of the sheet. The browser scrolls the sheet to each stop. |
| Hidden bar | After 3.6 s of play with no pointer motion, the bar hides. Tab moves the focus to "Pause", and the bar shows again. |
| Escape | Escape in the drawer closes it and moves the focus to the drawer button. Escape in a message closes the message, keeps the drawer open, and moves the focus to the play button of the bar (the keyboard tool). |
| Focus trap | None. 2.8 describes a drawer with no modal state, so Tab leaves the drawer after the last control. This is correct. |
| Handle | Not in the Tab order, and `aria-hidden`. |
| Enter on the first screen play button | The music starts, but the focus goes to the page body (N1). |
| Focus on a seat toggle, then a new piece | The seat list makes new rows, and the focus goes to the page body (N6). |

A keyboard alone can reach and use each control.

## Accessibility

### Contrast (WCAG 2.2 AA)

The ratios use the tokens of 2.8. For the bar, the overlay `rgba(16, 13, 11, 0.72)` lies over the
color behind it. The blur makes the real value a mean of the colors behind the bar.

| Text or part | Ratio | AA |
|---|---|---|
| `--text` on `--panel` | 15.18 | pass |
| `--text-dim` on `--panel` | 8.07 | pass |
| `--text-dim` on the current demo row | 7.03 | pass |
| `--accent` (link, focus ring) on `--panel` | 9.74 | pass |
| `--accent` focus ring on the page edge `#0b0908` | 10.48 | pass |
| `--on-accent` on `--accent` (pressed toggle, first play icon) | 9.63 | pass |
| `--on-accent` on `--accent-strong` (hover) | 11.34 | pass |
| `--text` on the bar over the page edge | 16.03 | pass |
| `--text-dim` (times) on the bar over the page edge | 8.53 | pass |
| `--text-dim` on the bar over the stage top `#7a6359` | 6.54 | pass |
| `--text-dim` on the bar over the light disc `#e8dcc0`, the worst case | 4.02 | fail for 12 px text, only when the user turns the view so that the lit floor is behind the bar |
| Drop text on its overlay | 16.08 | pass |
| Name of a silent seat (`--text` at opacity 0.45) | 3.92 | fail (N3) |
| Source line of a silent seat (`--text-dim` at opacity 0.45) | 2.59 | fail (N3) |
| `--danger` bar on `--panel` (not text) | 6.26 | pass (3:1) |
| `--line` border on `--panel` (not text) | 1.29 | The toggle and segmented buttons show their text, so the border is not needed to find them. |

### Touch targets

With `hasTouch` (the media query `(pointer: coarse)` matches), 55 controls show at each size. All
are 44 px or more in both directions, except the link "Third-party licenses": 121.9 × 16 px
(N4). The drag handle band is 24 px high. It is no control for a screen reader, but a finger
uses it.

### Roles, names, and live regions

- 0 controls without a name. 40 toggle buttons have `aria-pressed`. The drawer button and the
  collapse button have `aria-expanded`.
- The canvas has `role="img"` and the label of 2.8. `html` has `lang="en"`.
- The seek bar gives `aria-valuetext` "0 seconds of 4 minutes 40 seconds" at the start.
- The polite live regions are the title, the load text, and the message box, as 2.8 says.
- The demo rows have the labels of `demoRowLabel()`, and the current row has
  `aria-current="true"`.

### Reduced motion

With `prefers-reduced-motion: reduce`, the transitions of the bar, the drawer, and the collapse
icon are `0s`. `StageScene` gets the preference at start for the orbit inertia (2.5).

## Behavior

I ran these checks on my dev server, with `window.zoophony` and an `AnalyserNode` that the page
connects to its output. Some checks also ran on the build.

| Item | Result |
|---|---|
| Load flow | The samples of the default demo are ready 2.3 s after the page load. The first screen shows until the first play. |
| Count-in | The song time goes -0.89, -0.74, ... -0.12, 0.03 s in steps of 150 ms after the click. `T` is about 1 s, as in 9.7. |
| Play during the load | A click on the first play button sets the bar to "Pause". A second click sets "Play" (cancel). A third click sets "Pause". When the samples are ready, the music starts. |
| Demo switch | The title changes at once, the first screen shows while the samples load, and then the demo plays. The hash is `#demo=beethoven-5`, and the history length does not change. |
| Selection of the current demo | During play, nothing changes. When paused, the demo plays. |
| Three fast switches | The last demo shows and plays, with no error. |
| File messages | The texts of 2.8, exact: not valid, format 2, no notes, larger than 4 MB. A file of 4,000,000 zero bytes is "not valid", so the 4 MB limit is exclusive, as 3.3 says. Each refusal keeps the current title. |
| Several files | The first file plays. A bad first file gives the message and keeps the current piece. |
| Dropped file | The title is the file name with no extension, the second line the file name. The credit line hides, "Demo sources" lists all five demos, and no demo row is current. The hash does not change. |
| Message timeout | The message closes 6 s after it shows. |
| Mute | After a mute of the cellos, the bow arm of the first cello player goes to the rest rotation (0, 0, 0.001, 1) and stays there. The violins keep their motion (step 0.095). |
| All seats muted | The peak RMS of the output falls from 0.023 to 0.00001. |
| Solo | With the flutes soloed, the rows of the 15 other seats are dim, the violins rest, and the flutes sound. |
| Click on an animal | A click on the celesta player opens the drawer and the seat list, and marks the row "Piano" with the accent bar. The focus stays on the page. A click on the conductor and on the empty floor does nothing. A drag of 10 px opens nothing. |
| Section size | "Full" gives 42 players and "One per part" 44, from the polyphony (3.8). The music, the song time, and the play state stay. |
| Quality | With the device scale 2, the canvas is 2880, 2160, and 1440 px wide for "High", "Medium", and "Low". |
| Automatic tier | With a CPU throttle of 30 times, the tier drops from medium to low after 2.2 s. "Auto" stays pressed. A section size change can also drop it (N2). |
| URL hash | `#demo=grieg-ase` opens Grieg. `#demo=nope` and `#demo=` give the default demo. On the build, `#demo=perf-60` also gives the default demo. `#foo=bar&demo=mozart-k488` opens Mozart. A hash change during play stops the music and shows the new demo on the first screen. |
| Song end and replay | From 3 s before the end, the transport pauses at 280.67 s, and the button shows "Play". A click restarts at 0 with the count-in (-0.75 s after 0.3 s, 1.25 s after 2.3 s). |
| WebGL2 check | With no `webgl2` context, the full-page message shows the exact text of 2.8, the canvas hides, and the app does not start. |
| iOS audio session | `playWithSilentSwitch()` runs in `#startAudio()` before `new WorkletPlayer()`, and the `WorkletPlayer` constructor makes the `AudioContext` (`src/audio/player.ts:125`). The order agrees with 2.4. A person must check an iPhone. |
| Demo switches and memory | Over 3 rounds of 5 switches: the JS heap after GC is 21.5, 22.8, 23.1, and 23.1 MB. The listeners stay at 26 on `window`, 1 on `document`, and 9 on the canvas. The DOM stays at 230 nodes. The live WebGL objects stay at 108 buffers, 50 textures, 7 programs, 43 vertex arrays, and 4 framebuffers. No leak. |

## Code review

| Item | Result |
|---|---|
| No UI framework | Yes. The UI uses DOM calls in `src/ui/` and one stylesheet. |
| Pure rules in `app/` | Yes. Only `app.ts` uses the DOM, the clock, and `history`. The 17 rule files read no clock and touch no DOM, and each has a Vitest test file. |
| Tests | The tests check the rules of 2.2, 2.4, 2.8, 3.3, and 6.6 with exact texts and values. I did not break code to see the tests fail, because I edit only this file. |
| File sizes | The `ui/` files have 16 to 276 lines, and `ui.css` 601. The rule files of `app/` have 32 to 218 lines. `app.ts` has 875 lines (N7). |
| TSDoc and prose | Each export has TSDoc. The comments and the UI texts follow STE. |
| Old code of steps 4 and 5 | Gone. No temporary play button, no keys [ and ], and no `?demo=` in `src/main.ts`. `demoFromQuery()` of `app/demos.ts` stays for the spike page (7.1). |
| Listeners | `App`, `Bar`, `Ui`, and `DropOverlay` add their `window` listeners one time, at start. A new piece adds none (see the memory row above). |
| Three.js objects | `StageScene.show()` frees the old scene after the new one compiles. The WebGL counts above show no leak. |

## Findings

### B1. A tap on the hidden bar acts on a control that the user cannot see (high, blocking)

`src/ui/ui.css:188` hides the bar during play with `opacity: 0` and a move of 8 px. The bar keeps
`pointer-events: auto`, so its controls still take pointer input. On a touch screen, no pointer
motion comes before a tap. The tap that the user makes to show the bar (2.3) thus also acts on
the control under the finger.

```text
 finger                  window listener          hidden bar (opacity 0)
   │ tap at the bottom         │                          │
   │──── pointerdown ─────────>│ #activeAt = now          │
   │──── pointerdown/up/click ─┼─────────────────────────>│ seek input or Pause button
   │                           │ next frame: bar shows    │ the music jumps or stops
   v                           v                          v
```

Evidence: at 390 × 844 with touch, 5 s after play, one tap at 80% of the hidden seek bar moved
the time from 0:03 to 3:56. At 1440 × 900 with touch, one tap moved it from 3.9 s to 197.6 s,
and one tap on the hidden pause button paused the music.

Requested change: while the bar hides, give it `pointer-events: none`, so that the first tap
only shows it. Keep the controls in the focus order for the keyboard. Add a Playwright check to
`tools/keyboard-check.ts` or `tools/smoke.ts` that taps the hidden seek bar and expects no seek.

### B2. A demo file that does not load gives no message (medium, blocking)

`App.select()` (`src/app/app.ts:462-476`) awaits `fetchStageFile()`. A failed fetch rejects, and
the callers pass the error to `reportError` (`src/main.ts:85`, `src/main.ts:90`,
`src/app/app.ts:291`). The app shows no message, and the console shows an uncaught error.

- At start: my route aborted `demos/boulanger-matin.mid`. After 6 s, the title was empty, the
  first screen showed a play button with no ring and no text, and `data-samples` stayed
  `loading`. A click on play does nothing, because `#piece` is `null`. The page has no way back
  except a reload.
- On a selection: `onSelectDemo` writes `#demo=beethoven-5` with `history.replaceState()`
  before the fetch (`src/app/app.ts:290`). After the failure, Boulanger still shows, and the
  hash names Beethoven. A reload then opens Beethoven, which the user did not hear.

Requested change: catch the failure in `select()`. Show a message with "Try again" that selects
the demo again, for example the load failure text of 2.8 or a new text in 2.8. Write the hash
only after the demo shows, or put the old hash back after a failure. At start, keep the first
screen usable: a click on play or "Try again" fetches the file again. Add a test of the rule, and
a Playwright check with a route that aborts the demo file.

### N1. The focus goes to the page body after a play on the first screen (low, non-blocking)

`src/ui/first-screen.ts:79` hides the first screen when the piece plays. When its play button
had the focus, the focus goes to the page body. A keyboard user must press Tab to come back to
the bar. Space and the arrows still work on the page, so nothing is lost. The message box
already moves the focus in the same case (`focusAfterClose`).

Requested change: when the first screen hides with the focus in it, move the focus to the play
button of the bar.

### N2. A section size change during play drops the automatic tier (medium, non-blocking)

`#setSectionSize()` (`src/app/app.ts:393`) builds the new scene in one frame. My frame log shows
gaps of 350, 383, and 567 ms around the change, against a median of 16.7 ms. At 60 Hz, one gap
of about 165 ms or more makes the mean of a 2 s window more than 18 ms. `followFrame()`
(`src/app/settings.ts`, called from `src/app/app.ts:634`) then drops one tier for the rest of the
session. In my settings run, the canvas went from 2880 px to 2160 px with no throttle, after two
section size changes. Design 2.6 says "One slow frame thus does not drop the tier", and this case
disagrees. The times come from headless Chromium, so a person should measure them in Chrome.

Requested change: start a new window after a scene build (`StageScene.show()`), or skip one frame
that is longer than, for example, 100 ms. Add a test of `followFrame()` with one long frame.

### N3. The text of a silent seat has too little contrast (low, non-blocking, design)

`src/ui/ui.css:369` sets `opacity: 0.45` on the name of a silent seat. The name gets 3.92:1 and
the source line 2.59:1 on `--panel`. AA asks for 4.5:1. The prototype has the same value, so a
fix changes 2.8 and the prototype.

Requested change: use opacity 0.70, which gives 4.54:1 for the source line and more for the
name. Or show the silent state with a mark in place of dim text.

### N4. The link "Third-party licenses" is 16 px high on a touch screen (low, non-blocking)

`src/ui/ui.css:440` styles the link as inline text. On a touch screen, it is 121.9 × 16 px, and
2.8 asks for 44 px for each control. The prototype has the same link.

Requested change: give `.credits a` a minimum height of the control size on a touch screen, for
example with `display: inline-flex; align-items: center; min-height: var(--target)`.

### N5. The first screen play button moves down by 8 px at the end of the load (cosmetic, non-blocking)

`src/ui/ui.css:163` hides the empty load text with `visibility: hidden`, but the box shrinks from
26 px to 10 px. The grid of the first screen is centered, so the play button moves from y 414 to
y 422 when the load ends.

Requested change: give `.first-screen .status` a fixed height, or keep a text in it.

### N6. A new piece moves the focus out of the seat list (low, non-blocking)

`SeatList.show()` (`src/ui/seat-list.ts:105`) replaces the rows. When a toggle button had the
focus, for example during a hash change, the focus goes to the page body.

Requested change: when the old list held the focus, move it to the collapse button.

### N7. `app.ts` holds 875 lines (low, non-blocking)

`App` holds the load flow, the transport, the seats, the settings, the keys, the click on an
animal, the messages, and the audio start. The rules are in pure modules, so this is not a
correctness risk. A later change can move the seat flags and the settings into small classes
next to `App`.

### N8. The automatic tier reads the frame interval (info, design)

`followFrame()` measures the time between two frames. A browser that limits the frame rate to
30 fps (for example the energy saver of Chrome, or the low power mode of iOS) gives 33 ms, and
the tier goes down to low in 4 s, also when the GPU is idle. Design 2.6 chose this rule. The user
can decide to measure the work of the frame in place of the interval.

## Unverified

### U1. Escape in the open speed menu

On a phone, the speed menu is in the sheet. When its native list is open, Escape can close the
sheet as well as the list, because `#pressKey()` closes the drawer on each Escape. Headless
Chromium opens no native list. To check: in Chrome on a desktop at a width below 700 px, open
the sheet, open the speed menu with Space, and press Escape. The sheet must stay open.

### U2. An audio context that the system stops

When I closed the `AudioContext` during play, `onError` did not run. The bar kept "Pause", and
the song time stayed at 0.96 s. A real browser does not close the context, but iOS can suspend
it, for example for a phone call. To check: on an iPhone, play a demo, take a call, and end it.
The app must show "Play" or the message of an audio failure.

## What I checked and found correct

- Each text of 2.8: the message table, the drop text, the load text, the labels of the bar, the
  drawer, the seat list, and the settings, and the credits.
- The volume rules: 0 to 100, start at 100, a move ends the mute (the keyboard tool).
- The seek bar: whole seconds, disabled before the samples are ready, a seek on the first screen
  holds for the first play (277 s, then a play from there).
- The full screen button: label "Exit full screen" in full screen (the keyboard tool).
- The phone layout: the four controls of the bar move into "Playback" and back
  (`Bar.placePlayback()`), and the page has one control of each kind.
- The drop overlay shows only for a drag of files, and hides after the drop.
- The credits: the current demo first, the SoundFont credit, the link in a new tab with
  `rel="noopener"`, and the other demos under "Demo sources".

## Status

Date: 2026-10-05. The agent of the fixes of the step 6 review wrote this section. The commits
are `ec26a24..30bad29` on `main`. All checks of the review pass on `11e8104`: `pnpm lint`,
`pnpm typecheck`, `pnpm test` (1,135 tests), `pnpm format:check`, `pnpm build`, `pnpm size`
(235,187 B), `pnpm smoke`, and `pnpm keyboard` (53 checks, 0 failures).

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| B1 | fixed | `ec26a24`, `ecb56d9` | Nothing. The controls of the hidden bar ignore the pointer, and the bar takes the tap. The keyboard check taps the hidden seek bar and the hidden pause button on a phone with touch. |
| B2 | fixed | `72ff0ed` | Nothing. The new text "The demo did not load. Check the connection, then try again." has a row in 2.8 and in section 10. The keyboard check aborts the demo files at start and on a selection. |
| N1 | fixed | `ebdfd47` | Nothing. A keyboard play on the first screen gives the focus to the play button of the bar. A focus from a pointer goes to the page, so that the bar still hides. |
| N2 | fixed | `895317a`, `c251701` | The tier no longer drops. The build of the scene still stops the frames for 183 to 233 ms in headless Chromium, against 317 to 500 ms before. The layout takes 99 to 137 ms of it. |
| N3 | fixed | `6828022` | Nothing. The opacity is 0.8, because 0.70 gives 3.87:1 on the hover row. Design 2.8, the prototype, and its desktop screenshot changed. |
| N4 | fixed | `8c26ad2` | Nothing. Each of the 55 controls that show on a phone with touch is 44 px or more. |
| N5 | fixed | `ffb8374` | Nothing. The button stays at y 414 at 1440 × 900, as in the prototype. |
| N6 | fixed | `5892148` | Nothing. The collapse button of the seat list gets the focus. |
| N7 | open | `86ef44c` | The split of `app.ts` (now 937 lines) is a task of step 6 that can wait until the work on the audio chain and the camera in `app.ts` is merged. |
| N8 | fixed | `c251701` | The tier keeps the time between frames, because the work time of a frame does not hold the GPU time. A window of a steady 30 fps does not drop the tier (2.6, section 10). A GPU that keeps a steady 30 fps thus also keeps its tier. |
| U1 | open | `ee07770` | No code change: the code closes the drawer on each Escape that reaches the page. A person checks it in the manual release test (step 7 of `TODO.md`). |
| U2 | open | `ee07770` | No code change: the app has no `statechange` listener, and Pause, then Play, resumes a suspended context. A person checks a phone call on an iPhone in the manual release test. |

The records `11e8104` (the first download in 7.2), `6a69287` (the keyboard check), and `30bad29`
(the screenshots that changed) belong to these fixes. The step goes to the review agent again
(design 9.8).

## Re-review (2026-10-05)

Reviewer: an independent review agent (design 9.8). I did not do the work of step 6 or of its
fixes. I read the findings, the Status section, and the commits `ec26a24..8c05f79`. I also read
the later commits on `main` that touch the UI: the room and the mix (`d15c7e4`, the credit of
the hall reverb), the conductor cues (`cb7ad62`), and the notes on the Handel removal
(`2dbf0c7`).

All checks and browser runs used `2122a9a`. During the review, `main` moved to `1dc516e`. That
range changes the credits again (`6de3a00`, one "Source" link for each SoundFont source). I did
not run the checks on it. I read its code only.

My scripts used a copy of the build on a static server of my own (port 4341), and headless
Chromium of Playwright 1.63 with ANGLE Metal (61 frames per second) and with SwiftShader (2 to
8 frames per second). I stopped the server and each browser. The scripts and the captures are
in the scratch directory of the session, `step6-rereview/`.

### Verdict

**CHANGES REQUESTED.**

The B2 fix is correct, and N1, N2, N3, N5, N6, and N8 are fixed. Two problems stop the step:

1. B1 is fixed only for a tap of zero length. A real tap on the hidden bar still acts on the
   control under the finger (R1).
2. `pnpm keyboard` fails. The new "Source" link of the hall credit is 42.6 px wide on a touch
   screen, and 2.8 asks for 44 px (R2, a regression of N4).

### Conditions

1. Fix R1. Add a check that taps with a real length: `touchStart`, a wait of 100 ms, then
   `touchEnd`, at 60 frames per second. The check must fail on `2122a9a`.
2. Fix R2, so that `pnpm keyboard` passes on `main` with all the credit links of `1dc516e`.
3. Then send the step to the review agent again. R3 to R5 can wait, but record each one in
   `TODO.md` or reject it with a reason.

### Check results

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 117 files, 1,173 tests |
| `pnpm test:perf` | pass: 3 files, 5 tests |
| `pnpm format:check` | pass: 295 files |
| `pnpm build` | pass. `renderer-*.js` is 655.34 kB, 174.80 kB after gzip. The entry chunk is 36.18 kB, 12.89 kB after gzip. |
| `pnpm size` | pass: 238,442 B of 1,000,000 B. This agrees with the sum in 7.2 (235,187 B, then about 0.8, 0.4, and 1.7 KB). |
| `pnpm smoke` | pass. Song time 0.000 s, -0.951 s in the count-in, 3.049 s after 4 s. Turn of the bow arm: 0.192 rad. |
| `pnpm keyboard` | **fail**: 52 of 53 checks pass. "390 × 844, touch, Touch size of each control" fails with "Source 42.6 × 44.0" (R2). |

### Findings

| Finding | Verdict | Evidence |
|---|---|---|
| B1 | **not fixed** | A tap of 100 ms at 61 frames per second on the hidden seek bar moved the time from 0:01 to 3:56, 3 of 3 times. The keyboard check passes only because Playwright sends `touchStart` and `touchEnd` at the same time (R1). |
| B2 | fixed | At both sizes, with all demo files aborted: the message "The demo did not load. Check the connection, then try again." with "Try again", the title "D'un matin de printemps" and "Lili Boulanger", the first screen play button, and the hash "". A click on the first play button while the route fails shows the message again, with no page error. After the route opens, the play button of the bar loads and plays the demo. A failed selection of Beethoven keeps Boulanger, its play state, and its hash. "Try again" then plays Beethoven and writes `#demo=beethoven-5`. One stale state stays (R4). |
| N1 | fixed | The keyboard check: Enter on the first play button gives the focus to "Pause" at both sizes. |
| N2 | fixed | A build of the scene starts a new window (`src/app/app.ts:412`). The trimmed mean drops 5% of the intervals at each end. The decision is sound: the tier still drops for slow frames, and the unit tests pin the 567 ms gap. |
| N3 | fixed | The computed opacity is 0.8. The decision is sound for contrast: 0.70 fails on the hover row, and 0.8 keeps 4.5:1 on the three backgrounds. With the flutes soloed, the 7 silent rows look almost as bright as the flute row (my capture `seats-solo-1440x900.png`). Only the pressed "S" shows the solo. The user can decide to add a second cue for a silent row. |
| N4 | **regressed** | The license link is 121.9 × 44 px. The hall credit of `d15c7e4` added the links "Source" (42.6 × 44 px) and "CC BY 4.0" (61.5 × 44 px). "Source" is too narrow (R2). |
| N5 | fixed | The keyboard check: the button top is 414 px while the samples load and 414 px when they are ready. |
| N6 | fixed | The keyboard check: after a new hash, the focus is on "Collapse the seat list". |
| N7 | open, accepted | `app.ts` has 956 lines on `1dc516e`. The rules stay in pure modules, so the wait in `TODO.md` is acceptable. |
| N8 | fixed | The decision is acceptable, with one risk. A 60 Hz display shows a GPU that needs 17 to 33 ms for each frame at a steady 30 fps too. The tier then stays, although a lower tier could give 60 fps. 2.6 records this cost, and 30 fps is the floor of 9.7. The phone check of step 7 must look at it. |
| U1, U2 | open, accepted | Both are steps of the manual release test in `TODO.md`. |

### The UI after the later commits

- The demo list has the five demos of 8.2 in this order: Boulanger, Beethoven, Grieg, Mozart
  K. 488, Mozart K. 315. No Handel row. The credits list the four other demos under "Demo
  sources".
- The credits show the current demo, the SoundFont credit, the hall credit with "Source" and
  "CC BY 4.0", and "Third-party licenses", in the order of 2.8. Each link has
  `target="_blank"` and `rel="noopener"`.
- My captures: `credits-1440x900.png`, `credits-390x844.png`, `error-start-1440x900.png`,
  `error-start-390x844.png`, `error-selection-1440x900.png`, and `error-selection-390x844.png`.
  The message has the box of 2.8 at both sizes. On the phone, the message lies over the sheet,
  above the bar.
- The prototype has no hall credit. 2.8 gives the text, so this is no defect. Add the line to
  `docs/prototype/ui.html` when the prototype changes next.

### New problems

#### R1. A real tap on the hidden bar still acts on the control (high, blocking)

`src/ui/ui.css:199` gives the controls of the hidden bar `pointer-events: none`. The window
listener of `pointerdown` (`src/app/app.ts:337-341`) sets the activity time. The next frame
(`src/app/app.ts:732`) removes `is-hidden`, about 16 ms later. A finger stays down for 50 to
150 ms. Chromium finds the target of the click at the end of the tap, so the click and the
range input reach the control.

```text
 finger          window (pointerdown)     frame loop             control
   │ touch start        │                      │                      │
   │───────────────────>│ #activeAt = now      │                      │
   │                    │                      │ is-hidden removed    │
   │                    │                      │ (about 16 ms)        │
   │ touch end (100 ms) │                      │                      │
   │──────────────────────── click, hit test now ───────────────────>│ pause or seek
   v                    v                      v                      v
```

Evidence, ANGLE Metal at 61 frames per second, CDP `touchStart`, a wait, then `touchEnd`:

| Target | Size | Hold 0 ms (two calls) | 20 ms | 60 ms | 120 ms |
|---|---|---|---|---|---|
| Hidden pause button | 390 × 844 | paused 3/3 | 3/3 | 3/3 | 3/3 |
| Hidden drawer button | 390 × 844 | opened 3/3 | 3/3 | 3/3 | 3/3 |
| Hidden pause button | 1440 × 900 | paused 3/3 | 3/3 | 3/3 | 3/3 |
| Hidden drawer button | 1440 × 900 | opened 3/3 | 3/3 | 3/3 | 3/3 |
| Hidden seek bar at 80%, 100 ms | 390 × 844 | 0:01 to 3:56, 3/3 | | | |

`page.touchscreen.tap()` acted 0 of 3 times, because it sends both events in one `Promise.all`
with no time between them. Thus `checkHiddenBarTap()` (`tools/keyboard-check.ts:675`) passes
with the defect.

Requested change: keep the controls inert for the whole pointer sequence that started on the
hidden bar. For example, record at `pointerdown` that the bar was hidden, keep
`pointer-events: none` until the `pointerup` or `pointercancel` of that pointer and the click
that follows it, and only then show the controls. Change the check to dispatch `touchStart`,
wait 100 ms, and dispatch `touchEnd`.

#### R2. The "Source" link is narrower than 44 px on a touch screen (low, blocking because `pnpm keyboard` fails)

`src/ui/ui.css:614-618` gives `.credits a` only a minimum height. The "Source" link of the hall
credit (`src/ui/credits.ts:31-35`, from `d15c7e4`) is 42.6 × 44 px. On `1dc516e`, each
SoundFont source adds one more "Source" link of the same width (`6de3a00`). The 44 px line box
in the middle of the paragraph also opens a large gap above the last line of the hall
credit on the phone (`credits-390x844.png`).

Requested change: add `min-width: var(--target)` and `justify-content: center` to the rule, or
put the links of each credit on a line of their own. Then run `pnpm keyboard` on `main`.

#### R3. A pointer focus keeps the bar on screen for the whole piece (medium, non-blocking)

`Bar.focused` (`src/ui/bar.ts:220-222`) is true for any focus in the bar, but its TSDoc says
"keyboard focus". Chromium gives the focus to a button on a click or a tap. After a click on
Play in the bar, or a tap on a bar control on Android, the bar stays visible during play until
the user clicks elsewhere. Evidence: at 1440 × 900, a mouse click on Pause and then Play, the
pointer moved to the stage, and 5 s with no motion: the bar shows, and "Pause" has the focus.
At 390 × 844 with touch, the same after two taps and 6 s. This code is older than the review of
step 6, and the first review did not test it.

Requested change: count only a keyboard focus, for example `:focus-visible` inside the bar, as
`FirstScreen.update()` does for N1. Add a check that clicks Play in the bar and expects the bar
to hide after 3 s.

#### R4. "Try again" of a later failure loads an old failed demo (low, non-blocking)

`#fail()` (`src/app/app.ts:843`) does not clear `#failedFile`, and `onRetry`
(`src/app/app.ts:321`) tests `#failedFile` first. Scenario that I ran: the samples of
Boulanger load slowly, a selection of Beethoven fails, and then the samples of Boulanger fail.
The message "The instruments did not load. Check the connection, then try again." shows. Its
"Try again" loads and plays Beethoven in place of the samples of Boulanger. A play failure
later in the piece has the same path. A selection of the current demo after a failed selection
also keeps `#failedFile`.

Requested change: clear `#failedFile` in `#fail()`, and when the user selects the current demo.
Add a test of the rule.

#### R5. A display at 50 Hz drops the automatic tier to low (info, design)

`slowWindow()` (`src/app/settings.ts:84`) treats only intervals near 33.3 ms as a frame limit. A
display at 50 Hz gives 20 ms, more than `SLOW_FRAME_SEC` (18 ms). The tier thus drops to low in
about 4 s on an idle GPU. Some monitors and TVs run at 50 Hz. The user can decide if 2.6 covers
this case.

## Status of the re-review

Date: 2026-10-05. The agent of the fixes of the step 6 re-review wrote this section. The commits
are `9344280..042d12e` on `main`. All checks pass on `cbca4d3`, and `042d12e` changes only
`docs/design.md`:

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 122 files, 1,223 tests |
| `pnpm test:perf` | pass: 3 files, 5 tests |
| `pnpm format:check` | pass: 306 files |
| `pnpm build` | pass. The entry chunk is 37.08 kB, 13.15 kB after gzip. `renderer-*.js` is 656.76 kB, 175.31 kB after gzip. |
| `pnpm size` | pass: 239,480 B of 1,000,000 B. `19daea8` gave 239,266 B (7.2). |
| `pnpm smoke` | pass. Song time 0.000 s, -1.556 s in the count-in, 2.444 s after 4 s. Turn of the bow arm: 0.192 rad. |
| `pnpm keyboard` | pass: 61 checks, 0 failures (`step-6/keyboard-check.md`) |

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| R1 | fixed | `9344280` | Nothing. A press on the hidden bar keeps its controls inert until the click of that tap, or 0.5 s after the finger lifts with no click (2.3, section 10). The keyboard check taps the hidden seek bar and the hidden pause button with holds of 20, 60, and 120 ms through `Input.dispatchTouchEvent`. All 6 taps failed before the fix and pass now. The next tap on the shown bar pauses. |
| R2 | fixed | `1acaa42` | Nothing. Each credit link is 44 × 44 px or more on touch ("Source" is 44.0 × 44.0 px). Negative vertical margins keep the line height of each credit paragraph. A new check compares each paragraph with plain inline links: it failed before the fix (60 px in place of 32 px) and passes now. The box of a link covers part of the lines above and below it (section 10). |
| R3 | fixed | `3b4017f` | Nothing. `Bar.focused` counts only a control that matches `:focus-visible`. The new check clicks Pause and Play with the mouse and expects the bar to hide after 4 s. It failed before the fix. A Tab to Pause still keeps the bar. |
| R4 | fixed | `eae009b` | Nothing. A failure of the audio of the current piece clears `#failedFile`. A selection of the current demo clears it and its message. The new check runs the case of the reviewer: before the fix, "Try again" loaded `beethoven-5`, and now it loads the samples of `boulanger-matin`. |
| R5 | fixed | `f61bd87` | A window of a steady 50 fps (16 ms to 24 ms) keeps the tier, as a steady 30 fps does (2.6, section 10). The app does not measure the refresh rate of the display. A GPU that keeps a steady 42 to 62 fps on a display with a variable refresh rate thus also keeps its tier. Two new unit tests failed on the old code. |
| N3 (solo cue) | open | `cbca4d3` | No change. `TODO.md` asks the user if a silent row needs a second cue. |

The record `042d12e` (the first download in 7.2) belongs to these fixes. The step goes to the
review agent again (design 9.8).

## Second re-review (2026-10-05)

Reviewer: an independent review agent (design 9.8). I did not do the work of step 6 or of its
fixes. I read this file, the fix commits `9344280..042d12e`, and the record `11b939d`. All
checks and browser runs used `11b939d` on `main`.

My scripts used a copy of the build on a static server of my own (ports 4351 to 4353), and
headless Chromium of Playwright 1.63 with ANGLE Metal at 60.9 frames per second. The taps are
CDP `Input.dispatchTouchEvent` calls: `touchStart`, a wait of the hold time, then `touchEnd`. I
stopped the server and each browser. The scripts are in `/tmp/rr2/`, outside the repository.

### Verdict

**APPROVED.**

R1 to R5 are fixed. B1 is now fixed for real taps of 20 to 300 ms, for long presses, and for
drags. All checks pass. Two new problems (S1, S2) are low and do not stop the step. Record each
one in `TODO.md`, or reject it with a reason.

### Check results

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 122 files, 1,223 tests |
| `pnpm test:perf` | pass: 3 files, 5 tests |
| `pnpm format:check` | pass: 306 files |
| `pnpm build` | pass. The entry chunk is 37.08 kB, 13.15 kB after gzip. `renderer-*.js` is 656.76 kB, 175.31 kB after gzip. |
| `pnpm size` | pass: 239,480 B of 1,000,000 B. This agrees with 7.2. |
| `pnpm smoke` | pass. Song time 0.000 s, -1.539 s in the count-in, 2.411 s after 4 s. Turn of the bow arm: 0.182 rad. |
| `pnpm keyboard` | pass: 61 checks, 0 failures |

### Findings

| Item | Verdict | Evidence |
|---|---|---|
| R1 | fixed | 390 × 844, touch, during play. Holds of 20, 60, 120, and 300 ms on the hidden pause button, the hidden seek bar at 80%, and the hidden drawer button, 2 times each: 24 of 24 first taps only showed the bar. The next tap, 250 ms later, paused, seeked to 3:56, or opened the drawer, 24 of 24. At 1440 × 900 with touch, a hold of 120 ms on the three controls also only showed the bar. |
| R1, long press | fixed | Holds of 800 ms and 1,500 ms on the hidden pause button and the hidden seek bar did not pause or seek. A tap 200 ms after the lift paused. |
| R1, drag | fixed | Drags of 10 px, of 10 px with 3 px down, and of 120 px that start on the hidden seek bar did not seek. The next tap paused. |
| R1, double tap | fixed | A double tap with a gap of 60 ms on the visible pause button gave Pause, Play, Pause. The guard does not block it. On the hidden bar, the same double tap showed the bar and then paused. No page error in the phone runs. |
| R2 | fixed, with S1 | On a phone with touch, the 6 credit links are 44 × 44 px or more ("Source" 44.0 × 44.0, "CC BY 4.0" 61.5 × 44.0, "Third-party licenses" 121.9 × 44.0). The link boxes do not overlap. Each paragraph has the height that plain inline links give (32, 48, 32, 96, 16 px). My capture shows no gap. |
| R3 | fixed | 1440 × 900: after a mouse click on Pause and Play, on the seek bar, on the volume slider, on Mute, or on the speed menu, the bar hid after 4.5 s with no motion. No bar control matched `:focus-visible`. A Tab to Pause kept the bar, also after Space two times. On the phone, two taps on Pause kept the focus on "Pause", and the bar hid after 6 s. |
| R4 | fixed | The case of the first re-review, on my own routes: slow samples, a failed selection of Beethoven (hash stays ""), then failed samples. "Try again" loaded the samples of `boulanger-matin` and played it, with no demo file request. A selection of the current demo after a failed selection closed the message and played Boulanger. |
| R5 | fixed, with S2 | I ran `followFrame()` on intervals for 60 s. A steady 50 fps with a jitter of 1 ms or 3 ms keeps "high". A GPU on a display with a variable refresh rate keeps its tier at 22 ms and drops it at 25 ms. |
| R5, cost | acceptable | The band keeps a tier only at 41.7 to 62.5 fps. That is above the floor of 30 fps of 9.7, and it costs less than the band of 30 fps that 2.6 already accepts. A fixed display at 60 Hz or 120 Hz gives no interval in the band other than 16.7 ms, so it does not change there. |
| N3 (solo cue) | open, accepted | `TODO.md` asks the user. |

### New problems

#### S1. The next paragraph covers the bottom 11 px of three "Source" links (low, non-blocking)

`src/ui/ui.css:618-625` gives each credit link a 44 × 44 px box with negative vertical margins.
The paragraph that comes after a link paints later, so it wins the hit test in the lower part of
the box. For the three SoundFont "Source" links, the bottom 11 px of 44 px hit the next
paragraph (`elementFromPoint`, each row of the box). The touch area is thus 44 × 33 px. A tap
there hits text and does nothing, so the risk is a missed tap only. The keyboard check measures
only the box.

Requested change: add `position: relative` to the rule. With it, my script found the link in
all 44 rows of each of the 6 links. Section 10 then can say that the link covers the lines.

#### S2. A display at 50 Hz drops the tier after 5 missed frames in one window (low, non-blocking, design)

`slowWindow()` (`src/app/settings.ts:96-98`) needs every kept interval inside the band. At
50 Hz, a window of 2 s has about 95 intervals, and the trim removes 4 at each end. Five frames
of 40 ms in one window thus make it slow, because the mean (20 ms) is above 18 ms. At 60 Hz,
the mean keeps a margin, and a window needs 13 missed frames. My simulation with 1% missed
frames at random drops one tier in 16% of the minutes, and with 2% in 88%.

Requested change: let a few kept intervals lie outside the band, for example at a multiple of
the cap. Or record this cost in 2.6. A person can measure the rate of missed frames on a 50 Hz
display in the manual release test.

### Unverified

#### U3. The guard of R1 on iOS Safari

The guard ends at the click of the tap. iOS Safari can send no click for a tap on an element
with no click listener. The bar has no click listener, only the window. Then the guard ends
0.5 s after the lift. A tap during the guard reaches the bar, and its `pointerup` starts the
0.5 s again. So fast taps within 0.5 s of each other do not reach the controls.

To check: on an iPhone, play a demo and wait until the bar hides. Tap the pause button, and tap
it again 0.3 s later. The music must pause on the second tap. Then tap Play four times at 0.4 s
intervals. The play state must change each time.
