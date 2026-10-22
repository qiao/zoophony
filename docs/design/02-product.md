# 2. Product

## 2.1 Input

- The user drops a `.mid` file on the page, or selects a file with a button. A file of another
  type still goes through the file rules of 3.3. A drop of several files plays the first one. The
  drop overlay shows only for a drag of files.
- The user selects a demo from the demo list (section 8).
- Version 1 has no URL load and no live MIDI input. With a file, the app knows each note before
  it sounds, so an animal can move before the note.

## 2.2 First screen

- At start, the app selects the default demo: demo 1 of the list, the Boulanger demo (8.2),
  because the user wants a positive and cheerful default (2026-10-05). Its orchestra sits on the
  stage in the rest pose (5.2), and a large play button starts the music. The app loads its
  samples right after the first frame, so the first click starts the music quickly.
- The URL hash `#demo=<id>` opens a demo directly (`fileFromHash()` in `app/demos.ts`). A
  selection in the demo list writes the hash with `history.replaceState()`, so a reload opens the
  demo again. A dropped file does not change the URL.
- Only the first screen waits for a click, because the browser needs a user gesture before it
  plays audio. A piece that the user selects later starts when its samples are ready, because the
  selection is a clear wish to listen.
- A click on play while the samples load starts the piece when they are ready. Both play buttons
  then show "Pause", and a second click cancels the wait (`playAction()` in
  `app/play-control.ts`). A click that waits resumes the suspended `AudioContext` at once, because
  Safari can refuse a resume outside a user gesture (6.8).
- A demo file that does not load keeps the current piece and shows the message of 2.8 with "Try
  again", which selects the demo again (`noPieceStatus()`).

## 2.3 Layout

The UI has the style of a video player. The theme is dark only, because the scene is dark.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Logo (paw, Zoophony)                                 ┌─────────────────┐ │
│ Title of the piece                                   │ Drawer:         │ │
│ Composer                                             │                 │ │
│                                                      │  demos          │ │
│                                                      │  seats          │ │
│                 3D scene (canvas)                    │  settings       │ │
│                                                      │  credits        │ │
│                                                      │                 │ │
│                                                      └─────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ [>] 1:23 ---o----------- 5:16  1.0×  vol --o-  [c] [o] [ ] [|]       │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

- The bar at the bottom holds play and pause, the seek bar, the times, the speed, the volume, and
  the buttons "Automatic camera", "Reset view" (2.5), full screen, and the drawer. While the music
  plays, the bar and the pointer hide after 3 s with no pointer motion. While the bar hides, its
  controls ignore the pointer, so the first tap on the bar only shows it.
- The drawer on the right has three tabs: "Pieces" (the demo list and the file button), "Seats"
  (the seat list), and "Settings" (the settings and the link "Credits"). On a phone, the drawer
  is a sheet above the bar.
- The seat list has a row for each seat, with a mute button and a solo button. A click on an
  animal does nothing (user, 2026-10-20: "do not support clicking on animals to highlight it in
  seats tab"). A pointer motion of more than 4 CSS pixels is a drag of the view (`app/pick.ts`).
- The settings hold the quality tier (2.6) and the section size (3.8).
- The UI uses the system fonts. There is no font file, so the first download does not grow and no
  request goes to a font server.

## 2.4 Play, load, and keyboard

- Play waits until the app has loaded and decoded all samples of the file. The app shows the load
  progress. The speed goes from 0.5× to 1.5×.
- Space plays and pauses. The left and right arrows seek 5 s. Home goes to the start. C toggles
  the automatic camera, M the mute, and F the full screen. Escape closes the drawer, a message, or
  the credits dialog. The keys do nothing in a text field, with Ctrl, Alt, or Meta, while the
  credits dialog is open, and when the focused control uses the key itself (`keyAction()` in
  `app/keys.ts`).
- A solo moves the spotlight (user, 2026-10-07): the key light, its pool, and the visible beam move
  to the soloed players, and back when no seat is soloed. The solo flags alone give the light, so
  a seek, a pause, and a mute keep it (4.5, 6.6).
- A click on play starts a count-in of the conductor before the music: from the song start, a
  ready gesture and one preparatory beat, and after a pause, one preparatory beat (user,
  2026-10-05, 5.4, 6.5).
- The app makes the `AudioContext` and loads the worklet before the first click, in the suspended
  state, and the first click resumes it. On iOS, `playWithSilentSwitch()` of
  `app/audio-session.ts` sets `navigator.audioSession.type = 'playback'`, so that the silent switch
  does not mute the music.

## 2.5 Camera

The user asked on 2026-10-05: "Add a feature where the user can toggle the camera position. By
default, we use a cinematic camera orchestration that automatically switches between different
camera positions with automatic panning / zooming." Thus the camera has two modes.
[`research/cinematic-camera.md`](../research/cinematic-camera.md) holds the plan, and
`app/camera-mode.ts` holds the rules of the mode.

```text
             page load
                 │
    prefers-reduced-motion? ──yes──────────────┐
                 │ no                          v
                 v                      +-------------+
          +-------------+   drag > 4 px,|    FREE     |
          |  CINEMATIC  |   wheel, pinch| orbit       |
          | cameraAt()  |──────────────>| from the    |
          |             |               | current     |
          |             |<──────────────| camera      |
          +-------------+  "Automatic   +-------------+
                 │          camera", C         ^
                 │                             │
                 └──── "Reset view" ───────────┘ (Free, default view)
```

- The default view has the angle of view of `orchestra-latest.png` (1). It frames the used seats,
  with the podium at the bottom middle and the back row at the top, in the free area beside the
  open drawer. A portrait viewport gets a lower and nearer view (4.5, camera).
- **Cinematic** is the default mode. Each frame takes the camera from `cameraAt()`: the shots of
  5.6 cut between the conductor, the sides of the stage, the sections, the soloists, and wide
  views. When a section or a soloist enters after a rest, the next cut goes to it (user,
  2026-10-07). The first shot starts from the default view, so the click on play makes no cut.
- **Free** is the orbit camera. It starts from the last frame of Cinematic, so the view does not
  jump, and then it turns around the stage. The camera cannot go below the stage, and a zoom stops
  outside the box of the stage and the players (4.5).
- A drag, a pinch, or a wheel on the stage changes to Free at once and shows a note (2.8), so that
  the user knows how to get the film back (`turnsOffQuietly()`). The toggle, the key C, and "Reset
  view" show no note. While the first screen shows, the zoom is off (`movesCamera()`), because a
  wheel there is often an attempt to scroll the page.
- "Reset view" shows the default view in Free mode, so the full stage with no cuts is one click.
- With reduced motion, the default mode is Free with no inertia, each Cinematic shot holds its
  first camera, each transition is a hard cut, and the light effects stand still (4.5).
- A new piece and a new section size keep the mode and make new shots. The automatic camera does
  not follow a soloed seat in version 1, because the shots come one time from the score. No
  setting stores the mode.

## 2.6 Quality tiers and browser support

The tiers are High, Medium, and Low. `TIER_SETTINGS` of `scene/quality.ts` gives the shadow
maps, the pixel ratio, the bloom, the samples of the depth of field and of the haze, and the dust
motes of each tier. The low tier has no bloom, no depth of field, no dust motes, and no shadows of
the side lights (4.5). Each tier keeps MSAA, because the hard edges of the low-poly parts show
steps, and the final pass of the post effects (4.5).

- At start, a touch screen (`(pointer: coarse)`) or a small screen gives the low tier, and all
  other devices start at the high tier.
- The app drops one tier if the frames take more than 18 ms for 2 s. The automatic tier only goes
  down, so the quality does not go down and up many times. The app measures only while the music
  plays, the tab is visible, and the setting is "Auto", with a trimmed mean that ignores a few slow
  frames (`followFrame()` in `app/settings.ts`).
- A steady 30 fps or 50 fps does not drop the tier (`CAPPED_FRAME_SECS`), because energy saver
  modes and 50 Hz displays cap the rate, and a lower tier does not make these frames faster. A
  window at such a rate permits the same share of missed frames as a window at 60 Hz: its trimmed
  mean can be up to 1.08 times the capped interval (`slowWindow()`).
- A manual setting overrides the automatic tier.
- The app needs WebGL2, with no WebGL1 fallback (`supportsWebgl2()` of `app/webgl.ts`). With no
  WebGL2, the full-page message of 2.8 replaces the stage and the UI.
- Supported browsers: the current and the previous major versions of Chrome, Firefox, and Safari
  (macOS and iOS), and Android Chrome.

## 2.7 Privacy

Version 1 has no analytics, no cookies, and no service worker.

The link to the repository on GitHub (2.8) is a plain link. The page loads nothing from GitHub,
and the link sends no referrer (`rel="noopener noreferrer"`).

## 2.8 UI spec

The static prototype [`prototype/ui.html`](../prototype/ui.html) and its screenshots in
`prototype/` show the tokens and the layout, and `reference/mockup.png` is the target of the look.
The state switch at the top of the prototype exists only in the prototype. The CSS of the app is
in `ui/ui.css`.

**Tokens**

| Token | Value |
|---|---|
| `--bg-overlay` | `rgba(16, 13, 11, 0.72)`, with `backdrop-filter: blur(10px)` |
| `--panel` | `#17130f` |
| `--panel-glass` | `rgba(21, 18, 16, 0.96)`, with `backdrop-filter: blur(16px)` (the floating panel of the drawer) |
| `--line-faint` | `rgba(255, 240, 220, 0.06)` (the line between two rows of a list, and the hover of a seat row) |
| `--line` | `rgba(255, 240, 220, 0.10)` |
| `--text` | `#efe8dc` |
| `--text-dim` | `#b5aa99` |
| `--accent` | `#e7b45a` (the warm gold of the spotlight) |
| `--accent-strong` | `#f0c676` (hover) |
| `--danger` | `#e0796a` |
| `--title-shade` | `rgba(11, 9, 8, 0.8)` (the shade behind each title line at the level 1) |
| `--github-mark` | `#c8c8c8` (the neutral gray of the GitHub mark, as the logo rules of GitHub ask) |
| `--track` | `rgba(255, 240, 220, 0.2)` (the track of a slider, where it is not filled) |
| Font | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-serif` | `"Palatino Linotype", Palatino, "Book Antiqua", "Iowan Old Style", Georgia, "Noto Serif", serif` (the piece title) |
| Font sizes | 12 px for times (tabular numbers), 13 px for secondary text, 14 px body. The piece title is `clamp(24px, 2.5vw, 36px)` (32 px at 1280 px), and the composer `clamp(13px, 1.15vw, 16px)` |
| Radius | 10 px for panels, 12 px for the floating panel of the drawer and for the bar, 8 px for buttons |
| Control size | at least 40 px for the controls of the bar and the first screen; 32 px for the compact controls in the drawer, in messages, and in dialogs (tabs, M, S, segmented buttons, close, the link "Credits"); at least 44 px for every control on a touch screen |
| Focus | a 2 px ring in `--accent`, with a 2 px offset, and the button radius on a slider |
| Button states | the hover and the color change in 120 ms (none with reduced motion), and a pressed button gets `rgba(255, 240, 220, 0.18)`. The large play button gets `--accent-strong` and the scale 0.96 while pressed |

**Components**

The modules of `ui/` and `app/` hold the sizes, the places, and the motions. Each motion of the UI
is instant with reduced motion. Each text keeps the contrast 4.5:1 of WCAG AA over the scene
(`ui/contrast.test.ts`).

- Title, top left: the logo of the mockup (a gold paw and "Zoophony", user, 2026-10-06), the
  piece title, and the composer. The GitHub mark after the logo links to
  <https://github.com/qiao/zoophony> (`REPOSITORY_URL`, user, 2026-10-07). It is gray, because the
  logo rules of GitHub permit only white, black, or gray. Each line of the title has its own soft
  shade, whose level comes from the lightest part of the frame behind the line
  (`app/backdrop-probe.ts`, `shadeLevel()` in `ui/title-shade.ts`). Thus the dark hall of the
  default view shows no shade, as in the mockup.
- Bar: the controls of 2.3 in the look of the mockup. "Automatic camera" is pressed in Cinematic
  mode. At the song end, play becomes "Play again" and plays from the start (6.5). The seek bar
  seeks only when the samples are ready, and it shows the seek point until the listener hears it
  (`app/seek.ts`). The volume gain is the square of the position (6.8). The drawer button has the
  label "Open the drawer" or "Close the drawer", and the full screen button "Full screen" or "Exit
  full screen".
- First screen: a round play button below the front edge of the stage, so that it does not cover
  the orchestra. While it shows, the frame of the camera shrinks until the stage is clear of it.
  After the first play, the frame grows back as a short push-in (`clearFirstScreen()` in
  `shots/frame.ts`). A ring shows the load progress of the bytes, and the load text counts the
  files (6.8, `loadText()`). While the piece waits for its samples, the button shows "Pause"
  (`firstScreenView()` in `app/play-control.ts`).
  - Until the first play of the session, an intro line names the app, and the button "Select a
    piece" opens the demo list. ASD-STE100 has no verb "choose", so the buttons say "Select".
  - `index.html` holds the same load state as static HTML, so a slow network shows it at once.
- Drawer: a floating panel in `--panel-glass` with the tabs "Pieces", "Seats", and "Settings" at
  the top, beside the close button (`Drawer.addTab()`). Only the panel of the current tab shows.
  The drawer itself does not scroll and does not bounce (`overscroll-behavior: none`). The panel
  of the current tab scrolls below the tabs, with the bounce at its ends, and in the tab "Pieces"
  only the demo list scrolls (user, 2026-10-21). In each panel, the text starts 10 px in from the
  row, under the text of the tabs, and the last control of a row ends 10 px in from its right
  side, as the length of a demo row does. The current tab has `--text` and a line in
  `--accent` at its foot. The arrow keys, Home, and End move between the tabs, as the tabs
  pattern of WAI-ARIA says, and they do not seek. It is nearly opaque, so that its dim text keeps
  4.5:1 over white fur.
  While it is open, the camera moves its frame to the middle of the free area with
  `setViewOffset()`, and the canvas does not move (`stageCover()` in `app/stage-cover.ts`). A
  wide window opens the drawer at start at the tab "Pieces" (`isWideLayout()`).
  - Demos: a row for each demo with the title, the composer, and the length, and no cover. The
    row of the current demo has a level meter that the song time alone gives (`meterLevels()` in
    `app/meter.ts`), so it stops in a pause and follows a seek. The meter shows only after the
    piece starts, so a piece that waits at its start, as after a load, shows no meter (user,
    2026-10-21). Each row keeps a column of the
    width of the meter, so that the text does not move when the meter comes into a row.
  - The button "Open a MIDI file" stays below the demo list, with a folder icon and the dim
    second line "From this device, or drop it on the page", which also describes the button. A
    touch screen cannot drop a file, so its second line is "From this device" (user, 2026-10-20:
    "it's not obvious to users that they can select a local file").
  - Seats: a row for each seat with a dot in the fur color of the species, the seat name, the
    animal line, and the toggle buttons "M" and "S" with the labels "Mute {name}" and "Solo
    {name}". Only a screen reader reads the source line of each row.
  - The dot shows only while its seat plays (user, 2026-10-22). It grows from 0.4 of its size to
    its full size, and it gets a soft glow in its color. The dot comes on at a note-on and fades
    out in 0.3 s after the last note, so short notes do not make it flicker. The song time alone
    gives its level (`seatLevels()` in `app/meter.ts`), so it follows a seek and a pause. A
    silent seat shows no dot. The dot shows only after the piece starts, as the meter does, and
    it goes off at the end, where the song time stops at the last note-off. A
    dark fur gets a lighter glow that keeps 3:1 on the row (`ringColor()` in `app/seat-text.ts`).
    The dot keeps its layout space when it does not show. With reduced motion, it is on or off
    with no fade.
  - Settings: "Section size" (Auto, One per part, Full) and "Quality" (Auto, High, Medium, Low).
    The button "Auto" names its current value, such as "Auto (Full)". `SETTING_HELP` of
    `app/settings.ts` gives the help line of each control. A change of the section size changes
    only the player counts, so the music, the song time, and the flags stay.
  - Credits: the link "Credits" at the end of the tab "Settings" (user, 2026-10-07: "hide credits
    behind a link, which when clicked would popup a modal"; user, 2026-10-20: "move credit to
    settings") opens a native `<dialog>` with `showModal()` (`ui/modal-dialog.ts`). The dialog
    has the layout of the end credits of a film (user, 2026-10-21: "make the credit modal have a
    layout like a movie credit screen"), with all text on the center axis. A title card shows the
    name of the author (user, 2026-10-21: "add myself to the top"). The groups "Now playing" (the
    current demo, 8.2), "Sounds" (the SoundFont credits, 6.2, and the hall reverb credit, 6.8),
    and "Other pieces" (7.3, 8.1) follow. Each row of "Sounds" has the source left of the axis and
    its credit right of it, and a phone puts the two parts on the axis. An end card holds the
    copyright line and the link "Third-party licenses" (`ui/credits.ts`, `creditTexts()` in
    `app/credits.ts`). Each link opens in a new tab, so that the music does not stop.
- Phone, narrower than 700 px: the drawer is a sheet above the bar with a drag handle
  (`sheetCloses()` in `app/phone-layout.ts`), and a selection closes the sheet. The speed, the
  volume, "Reset view", and full screen move into the "Playback" group of the settings
  (`Bar.placePlayback()`), and the bar shows no duration.
- Messages: at the bottom center above the bar, with a bar in `--danger`. A message closes after
  6 s, with "Close the message", or with Escape, and it stays while it has the pointer or the
  focus (`followMessage()` in `app/messages.ts`). A new message replaces the old one. On the first
  screen, a message stays clear of "Select a piece", the way out of a failure. A note has a bar in
  `--accent` and a time of 3 s, and it never replaces a failure with "Try again" (`addNote()`).
- Build cover: a new piece or a new section size stops the frames for a build, so the canvas fades
  out before it and in after the first render (`Ui.coverStage()`, `Ui.uncoverStage()`).
- Page title: "{title}, {composer} · Zoophony" for a demo, and "{title} · Zoophony" for a file of
  the user (`pageTitle()` in `app/page-title.ts`). `index.html` has a description, the paw icon,
  and the Open Graph tags. An Open Graph image waits for the first deploy (`TODO.md`, step 7).
- Tooltips name the action and its key (2.4): "Play (Space)", "Pause (Space)", or "Play again
  (Space)", "Seek (← →, Home)", "Mute (M)", "Automatic camera (C)", "Full screen (F)" or "Exit full
  screen (F)", and "Speed", "Volume", "Reset view", and "Open the drawer" with no key. The buttons
  "M" and "S" show their labels, and the link to GitHub shows "Zoophony on GitHub". A tooltip
  follows WCAG 1.4.13, shows for a mouse, a pen, or a keyboard focus, and never for a touch. A
  screen reader skips it, because `aria-label` and `aria-keyshortcuts` give the name and the key
  (`ui/tooltip.ts`, `app/tooltips.ts`).
- Icons: inline SVG, 20 × 20, stroke width 1.75, round caps and joins, `currentColor`, in the
  shapes of the mockup (`ui/icons.ts`).

**Seat texts**

| Section | Name | One player | Section | Name | One player |
|---|---|---|---|---|---|
| violin | Violins | Violin | horn | Horns | Horn |
| viola | Violas | Viola | trumpet | Trumpets | Trumpet |
| cello | Cellos | Cello | trombone | Trombones | Trombone |
| contrabass | Contrabasses | Contrabass | tuba | Tuba | Tuba |
| harp | Harp | Harp | timpani | Timpani | Timpani |
| piano | Piano (see below) | Piano | percussion | Percussion | Percussion |
| flute | Flutes | Flute | choir | Choir | Voice |
| oboe | Oboes | Oboe | sound-only | Other sounds | Other sounds |
| clarinet | Clarinets | Clarinet | | | |
| bassoon | Bassoons | Bassoon | | | |

`app/seat-text.ts` makes the texts.

- A seat with one player takes the name in the column "One player". The soloist (3.8) that does
  not sit at a keyboard adds "soloist", for example "Flute soloist", because "Solo flute" would
  make the solo button read "Solo Solo flute". A chamber group of 4.2 names no soloist.
- A seat of the section "piano" takes the name of its first program (`keyboardName()`): programs 0
  to 5 "Piano", 6 "Harpsichord", 7 "Clavinet", 8 "Celesta", 16 to 20 "Organ", 21 and 23
  "Accordion", and 22 "Harmonica". The piano model stays.
- If more than one seat of a section has a name, the name gets the number of the seat in that
  section, from 1: "Violins 1", "Violin 2", "Choir 3". The soloist gets no number, and the other
  seats of its section do not count it.
- The animal line gives the number of players and their species: "5 rabbits", "1 deer", "8 red
  foxes". The sound-only seat shows "No animal". The species names are rabbit, red fox, tan fox,
  wolf, elephant, bear, cat, hippo, deer, panda, mouse (mice), beaver, dog, monkey, pig, rhino,
  badger, penguin, and polar bear.
- The source line names the ports (from 0), the channels (1 to 16), and the programs (from 0) of
  the seat.
  - One source: "Port 0, channel 8, program 40".
  - Several channels on one port: "Port 0, channels 4 and 5, program 0".
  - Several ports: "Port 0 channel 4, port 1 channel 2, program 40".
  - Several programs, in the order of first use: "Port 0, channel 12, programs 40 and 45".
  - A rhythm channel names the kit: "Port 0, channel 10, kit 48".
  - A melodic source and a rhythm source, for example a timpani seat: "Port 0, channels 7 and 10,
    program 47, kit 48".
  - The sound-only seat names only its programs and kits (3.7): "Programs 80 and 81".
- A list of three or more items uses commas and "and": "channels 1, 2, and 9".

**Message texts**

| Case | Text |
|---|---|
| Not a valid MIDI file | This file is not a valid MIDI file. |
| Format 2 | This MIDI file uses format 2. The player supports format 0 and format 1 only. |
| More than 4 MB | This file is larger than 4 MB. Select a smaller file. |
| No notes | This MIDI file has no notes. |
| No WebGL2 (a full-page message) | This browser cannot show the orchestra, because it does not support WebGL2. Use a current version of Chrome, Firefox, or Safari. |
| Above the full-page message: the name (24 px) and one line about the app (16 px, dim) | Zoophony / An orchestra of animals plays your MIDI file. |
| Demo file failure (with a "Try again" button) | The demo did not load. Check the connection. |
| Load failure (with a "Try again" button) | The instruments did not load. Check the connection. |
| Audio failure after the load, for example during play (with a "Try again" button) | An error stopped the music. Try again. |
| Load progress before the file of the first piece shows | Loading |
| Load progress before the list of the preset files is known | Loading instruments |
| Load progress | Loading instruments: {done} of {total} |
| Load progress after 10 s of load, when the sizes are known (megabytes of 1,000,000 bytes, one decimal) | Loading instruments: {done} of {total} ({arrived} of {sum} MB) |
| Second line of the load text while the piece waits for its samples | The music starts after the load. |
| Drop overlay | Drop the MIDI file to play it. |
| Note after a drag, a pinch, or a wheel turns off the automatic camera (with a keyboard) | The automatic camera is off. Press C to turn it on. |
| The same note on a touch screen (`(pointer: coarse)`) | The automatic camera is off. Tap the camera button to turn it on. |
| First screen, until the first play of the session | Zoophony: an orchestra of animals plays your MIDI file. |
| First screen, the button that opens the demo list | Select a piece |

**Accessibility**

- Each control is a `button`, an `input type="range"`, or a `select`, with an `aria-label`. A row
  of the demo list has the label of its title, its composer, and its spoken length
  (`demoRowLabel()` in `app/demos.ts`).
- Each toggle button has `aria-pressed`. Each tab has `role="tab"` and `aria-selected`, and its
  panel has `role="tabpanel"`.
- The seek bar has an `aria-valuetext`, for example "1 minute 23 seconds of 5 minutes 16 seconds".
- The canvas has `role="img"` and the `aria-label` "An orchestra of animals on a stage".
- Polite `aria-live` regions announce the load progress, the messages, and the title of each new
  piece.
- The focus order is the title, the bar, then the drawer.
- When the play button of the first screen or a message with the focus goes away, the play button
  of the bar gets the focus. When a row of the seat list with the focus goes away, the tab "Seats"
  gets it.
- The bar stays visible while a control of the bar has the keyboard focus (`:focus-visible`),
  while the pointer is over it, and while the drawer is open.
