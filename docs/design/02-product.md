# 2. Product

## 2.1 Input

- The user drops a `.mid` file on the page, or selects a file with a button.
- The file dialog offers the files `.mid` and `.midi` and the media types of MIDI first. A file of
  another type still goes through the file rules of 3.3. A drop of several files plays the first
  one. The drop overlay shows only for a drag of files, so that a drag of a text or a link does
  not show it.
- The user selects a demo from the demo list (section 8).
- Version 1 has no URL load and no live MIDI input. With a file, the app knows each note before
  it sounds, so an animal can move before the note. Live input does not permit this.

## 2.2 First screen

- At start, the app selects the default demo: demo 1 of the list, the Boulanger demo (8.2). Its
  orchestra sits on the stage in the rest pose (section 5.2). A large play button starts the
  music.
- The user decided on 2026-10-05 that the default music is more positive and cheerful. Thus
  Boulanger, "D'un matin de printemps", replaced Beethoven's Symphony No. 5 as the default. It
  is bright and lively, and it shows the full orchestra, the percussion, the harp, and the
  celesta.
- The URL hash `#demo=<id>` opens a demo directly. A dropped file does not change the URL.
- When the user selects a demo or drops a file, the app stops the current piece and loads the
  new one. The new piece starts when its samples are ready, because the selection is a clear
  wish to listen. Only the first screen waits for a click, because the browser needs a user
  gesture before it plays audio.
- The app starts to load the samples of the default demo right after the first frame. Then the
  first click on play starts the music quickly.
- A selection in the demo list writes the hash of its demo with `history.replaceState()`, after
  the file of the demo loads. A reload thus opens the demo again, and the history gets no
  entry. A change of the hash in the address bar shows its demo on the first screen, because it
  is no user gesture. A missing or unknown id gives the default demo (`fileFromHash()` in
  `app/demos.ts`). The keys [ and ] of the review of step 4 are gone, because the demo list
  replaces them.
- The first screen shows until the first play of the piece. A piece that the user selects shows
  it while its samples load, and then starts.
- A click on play while the samples load starts the piece when they are ready. The play buttons
  of the first screen and of the bar follow the same rule (`playAction()` in
  `app/play-control.ts`): both then show "Pause", and a second click on either one cancels the
  wait (audit 2026-10-05-ux-design, LD1). A click before the first piece shows waits for it in
  the same way. A selection of the current demo does not load it again: it only plays the demo
  when the demo does not play and does not wait.
- A click that waits for the samples, and a selection, resume the suspended `AudioContext` at
  once. Safari can reject a resume outside a user gesture, and the play comes later, after the
  load (6.8).
- A demo file that does not load keeps the current piece and the hash, and shows the message of
  2.8 with "Try again". "Try again" selects the demo again, as a row of the demo list does. At
  start, with no piece, the title names the demo, and the play buttons of the first screen and
  the bar also select it again (`noPieceStatus()` in `app/play-control.ts`). A later failure of
  the audio of the current piece, or a selection of the current demo, forgets the failed demo.
  "Try again" then retries the audio of the current piece (re-review of step 6, R4).

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

- The bar at the bottom holds play and pause, the seek bar, the time, the speed, and the volume.
- While the music plays, the bar hides after 3 s with no pointer motion, and the pointer over the
  stage hides with it (audit 2026-10-05-ux-design, CT3). It shows again on pointer motion, on a
  tap, and on keyboard focus. While the bar hides, its controls ignore the
  pointer, so the first tap on the bar only shows it (review of step 6, B1). The controls stay
  inert until the click of that tap, or 0.5 s after the finger lifts with no click. The browser
  finds the target of a tap at its end, and the bar shows about 16 ms after the touch starts
  (re-review of step 6, R1).
- The drawer on the right holds the demo list, the seat list, the settings, and the credits. On
  phones, the drawer is a sheet above the bar (2.8). A wide window opens it at start (2.8).
- The seat list is collapsed by default, except in the wide layout of 2.8. Each row shows the
  section and the animals, with a mute button and a solo button. The row of the animal that the
  user clicked also shows the port, the channel, and the program (2.8). Keyboard users and
  screen reader users need this list, because they cannot click an animal. Small animals are also hard to tap on a phone.
- A click on an animal opens its row in the seat list. The click opens the drawer and the seat
  list, marks the row with an accent bar on the left, and scrolls the drawer to the row. The
  mark moves to the next row that opens. The stage stays in place on a desktop, so that a click
  on the next animal hits it (2.8). A pointer motion of more than 4 CSS pixels between the
  press and the release is a drag of the view, and opens no row (`app/pick.ts`). The drag also
  turns off the automatic camera (2.5). A click on the conductor or on the stage does nothing.
- The click test casts a ray through the posed triangles of each player and its instrument
  (`scene/pick.ts`). Each player has the bounding sphere of its bind pose plus 0.5 m, which holds
  each pose, so that only the players in the path of the ray test their triangles.
- The settings hold the quality tier (section 2.6) and the section size (section 3.8).
- Three more buttons: the "Automatic camera" toggle and "Reset view" (section 2.5), and full
  screen. The user asked for the automatic camera on 2026-10-05 (2.5).
- The UI uses the system font. The piece title uses a serif of the system (2.8). There is no
  font file, so the first download does not grow and no request goes to a font server.

## 2.4 Play, load, and keyboard

- Play waits until the app has loaded and decoded all samples of the file. The app shows the load
  progress.
- The speed goes from 0.5× to 1.5×.
- Space plays and pauses. The left and right arrows seek 5 s. Home goes to the start. These keys
  do nothing while the focus is in a text field.
- The keys also do nothing with Ctrl, Alt, or Meta, and when the control with the focus uses
  the key itself: Space on a button or the speed menu, and the arrows and Home on a slider or
  the speed menu. A held Space does not repeat. A key action shows the bar, as a pointer motion
  does (`keyAction()` in `app/keys.ts`).
- The key C toggles the automatic camera (2.5), as the "Automatic camera" button does. It does
  nothing in a text field and with Ctrl, Alt, or Meta, and a held C does not repeat. No control
  of the page uses the key C, so it also acts while a button, a slider, or the speed menu has the
  focus.
- The key M toggles the mute button, and the key F toggles the full screen, with the rules of
  the key C. F does nothing when the browser has no full screen for the page. The tooltips of
  the bar name the keys (2.8, audit 2026-10-05-ux-design, CT1).
- Escape closes the drawer. When the drawer held the focus, the drawer button gets it. Escape
  in a message closes the message (2.8).
- A click on play does not start the music at once. The conductor first gives a count-in: from
  the song start, a ready gesture and one preparatory beat, and after a pause, one preparatory
  beat. Then the music plays (user decision of 2026-10-05, 5.4, 6.5).
- The browser lets audio start only after a user gesture. Thus the app makes the AudioContext
  and loads the worklet before the first click, in the suspended state. The first click resumes
  the context.
- On iOS, the silent switch mutes Web Audio. The app sets
  `navigator.audioSession.type = 'playback'` when this API exists, so that phones play the music
  with the silent switch on. `playWithSilentSwitch()` in `app/audio-session.ts` sets it before
  the `Player` makes its `AudioContext`.

## 2.5 Camera

The user asked on 2026-10-05: "Add a feature where the user can toggle the camera position. By
default, we use a cinematic camera orchestration that automatically switches between different
camera positions with automatic panning / zooming." Thus the camera has two modes.
[`research/cinematic-camera.md`](../research/cinematic-camera.md) holds the research and the plan.

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

- The camera is a perspective camera. The default view has a field of view of 30 degrees and the
  angle of view 01 of `scene.png` (1): from the front, 28° down, and near, so that the
  orchestra fills the free area left of the open drawer (the landscape rule of 4.5). The stage
  size follows the seats, so the default view always frames the used seats (4.5, camera). A
  portrait viewport gets a lower and nearer default view that shows the full stage (the
  portrait rule of 4.5).
- **Cinematic** is the default mode. Each frame takes the camera from `cameraAt()`: the shots of
  5.6 cut between the conductor, the two sides of the stage, the sections, the soloists, and
  wide views, with slow moves in each shot. The framings follow the nine views of `scene.png`
  (1). Before the first play, the camera is the default view, so the first screen does not
  change. The first shot of each piece starts from that view, so the click on Play makes no cut.
- **Free** is the orbit camera: the orbit controls rotate and zoom the view. The camera cannot go
  below the stage. A change from Cinematic keeps the position, the target, and the field of view
  of the last frame, so the view does not jump. When the target of the last shot is 1 m or more
  from the stage center, it then moves to the stage center in 0.4 s with a smoothstep, at once
  with reduced motion. The camera turns to the moving target, so the orbit turns around the
  stage. A drag in a close shot turned the view around the head of the bear, 4 m away, and the
  camera looked lost (UX audit 2026-10-05, SC6). In the same move, the camera moves out on the
  ray from the stage center through it, to at least 0.6 of the distance of the default view.
  After a drag in a close shot, the camera stayed 4 m from the stage center among the stands,
  and a second drag showed the backs of the stands (UX audit 2026-10-06, N19). The beam fades in with the distance
  (4.5). The field of view stays until
  "Reset view".
- The beam fades when the camera comes near the stage, in both modes (4.5, 5.6).
- A pointer motion of more than 4 CSS pixels between the press and the release is a drag (2.3). A
  drag, a pinch, or a wheel on the stage changes to Free at once, and the orbit controls continue
  the same drag. A click of 4 px or less opens the seat row, and the mode stays.
- When a drag, a pinch, or a wheel turns off Cinematic mode, the page shows a note for 3 s
  (2.8), so that the user knows how to get the film back (`turnsOffQuietly()` in
  `app/camera-mode.ts`, audit 2026-10-05-ux-design, CT2). The toggle, the key C, and "Reset
  view" show no note, because the user asked for the change.
- "Reset view" changes to Free and shows the default view with the field of view of 30 degrees.
  A user who wants the full stage with no cuts thus has one click.
- The "Automatic camera" toggle and the key C switch the mode (2.4). A change to Cinematic cuts to
  the shot of the current song time at the next frame.
- If the user prefers reduced motion, the default mode is Free, and the orbit controls have no
  inertia. If the user turns on Cinematic, each shot holds its first camera (no move in a shot),
  and each transition is a hard cut.
- With reduced motion, the light effects also stand still: the noise of the haze does not
  drift, the dust motes do not move or twinkle, and the film grain keeps one pattern (4.5).
- A new piece keeps the mode. Cinematic uses the shots of the new score. Free shows the default
  view of the new stage. A change of "Section size" makes new shots, and Cinematic continues at
  the current song time.
- The automatic camera does not follow a soloed seat in version 1. The shots come one time from
  the score, and a solo would need new shots (choice C of the report).
- No setting stores the mode. A reload starts in the default mode.
- `app/camera-mode.ts` holds the rules of the mode.

## 2.6 Quality tiers and browser support

| Tier | Shadow map | Pixel ratio | MSAA | Bloom levels | Blur samples | Haze samples | Dust motes |
|---|---|---|---|---|---|---|---|
| High | 2048, `PCFShadowMap` with radius 3 | up to 2 | on | 6 | 32 | 4 | 140 |
| Medium | 1024, `PCFShadowMap` with radius 1 | up to 1.5 | on | 5 | 16 | 3 | 70 |
| Low | 512, `PCFShadowMap` with radius 1 | 1 | on | 0 | 0 | 2 | 0 |

MSAA stays on in all tiers, because the outlines and the hard edges of the low-poly parts show steps. The target of the scene has
the MSAA, and the canvas has none (4.5, post effects). A GPU with no target of floats renders the
scene to the canvas with no post effects. A small WebGL2 context reads the extensions before the
renderer exists, so that the canvas of such a GPU gets the MSAA (`probeTargetFormat()` in
`scene/renderer.ts`, review of step 8, L1).

- Each tier keeps the final pass of the post effects: the tone mapping, the color grade, the
  vignette, and the grain cost one sample for each pixel. The low tier drops the bloom, the depth
  of field, and the dust motes. The blur samples are the samples of the depth of field. The haze
  samples are the samples of the visible beam along each view ray (4.5).
- On the development Mac (Apple M1 Max, Chrome, 1440 × 900 at the device scale 2, `perf-60.mid`),
  the high tier took 4.9 to 5.3 ms of GPU time for 95% of the frames on 2026-10-06, against 2.5
  ms with no post effects, no hall, and the first lights. The post effects with MSAA cost about
  1 ms, the beam 0.55 ms, the extra lights about 1 ms, and the hall 0.15 ms. The machine had a
  load of 6 to 60 from other agents. The depth pass of the beam (4.5) added about 0.4 ms on
  2026-10-06. The scene polish of 2026-10-07 (the key light from behind, the lamp
  glows, the gloss of the floor, and the haze cone) gave a GPU p95 of 8.61 to 8.64 ms against
  8.55 to 10.28 ms for the code before it, in turn in one session at a load of 165 to 340. The
  difference is within the noise of that load.

- three.js r186 has no `PCFSoftShadowMap`. Its `PCFShadowMap` blurs the shadow edge by the
  radius of the shadow, so the high tier gets its soft shadows from a radius of 3 texels.
- The pixel ratio of a tier is never more than the `devicePixelRatio` of the display. A browser
  zoom or a move to another display changes `devicePixelRatio`. A media query on the current
  resolution reports the change, and the canvas then gets the new pixel ratio.

- At start, the app selects a tier from the device. A touch screen or a small screen gives the
  low tier. A small screen has a viewport with a shorter side of less than 600 CSS pixels. All
  other devices start at the high tier.
- The touch signal is the media query `(pointer: coarse)`: the primary pointer is a finger, as on
  a phone or a tablet. A laptop with a touch screen has a touchpad or a mouse as its primary
  pointer, so it starts at the high tier. `navigator.maxTouchPoints` is larger than 0 on such a
  laptop, so the app does not use it.
- The app drops one tier if frames take more than 18 ms for 2 s. The automatic tier only goes
  down, never up, so the quality does not go down and up many times.
- The app measures the frame time only while the music plays and the tab is visible.
- The measure is the mean time between two frames in a window of 2 s, without the shortest 5%
  and the longest 5% of the intervals. A few slow frames, for example a garbage collection, thus
  do not drop the tier. A frame that does not measure ends the window, so that a pause or a
  hidden tab does not count. After a drop, a new window starts (`followFrame()` in
  `app/settings.ts`).
- A build of the scene in a frame, for example after a change of the section size during play,
  starts a new window. The build stopped the frames for 350 to 567 ms in headless Chromium, and
  dropped the tier (review of step 6, N2).
- A window whose other intervals all lie between 26.7 ms and 40 ms, a steady 30 fps, does not
  drop the tier (`slowWindow()`). Chrome in its energy saver mode and iOS in its low power mode
  limit the frame rate to 30 fps, and a lower tier does not make the frames faster (review of
  step 6, N8). The work time of a frame in JavaScript is no better measure, because it does not
  hold the GPU time, and the tiers change mostly the GPU work. Thus a GPU that keeps a steady
  30 fps also keeps its tier. 30 fps is the floor of the phone check of 9.7.
- A window whose other intervals all lie between 16 ms and 24 ms, a steady 50 fps, does not drop
  the tier either. Some monitors and TVs refresh at 50 Hz, and their frames take 20 ms with an
  idle GPU (re-review of step 6, R5). The two steady rates are `CAPPED_FRAME_SECS` of
  `app/settings.ts`, each within 20%. A window must keep one of them for all its other intervals.
  Thus a GPU that keeps a steady 42 to 62 fps on a display with a variable refresh rate also
  keeps its tier.
- A manual setting overrides the automatic tier. The app measures only while the setting is
  "Auto". A new tier changes the pixel ratio of the canvas and the shadow map of the spotlight at
  once (`StageScene.setTier()`).
- The app needs WebGL2. If WebGL2 is not available, the app shows a message. There is no WebGL1
  fallback. `supportsWebgl2()` of `app/webgl.ts` makes a WebGL2 context on a canvas of its own
  and frees it. A renderer that cannot make its context also gives the message. The full-page
  message of 2.8 then replaces the stage and the UI, and the app does not start.
- Supported browsers: the current and the previous major versions of Chrome, Firefox, and Safari
  (macOS and iOS), and Android Chrome.

## 2.7 Privacy

Version 1 has no analytics, no cookies, and no service worker.

## 2.8 UI spec

The static prototype [`prototype/ui.html`](../prototype/ui.html) shows these values. The reference
image stands in for the 3D canvas, and a switch at the top selects the state. The screenshots
`prototype/ui-desktop-first.webp`, `prototype/ui-desktop-playing.webp`, and
`prototype/ui-phone-playing.webp` show the same page. Copy the tokens and the layout from the
prototype. The switch is part of the prototype only. The screenshots show the demo list before
the user decision of 2026-10-05 (8.2), and the page shows the current list.

These parts of the prototype exist only in the prototype:

- The state switch at the top center.
- The open seat list in the state "Playing, drawer open", so that the screenshot shows it. The
  app starts with the seat list collapsed, except in the wide layout.
- The title position on a phone (104 px from the top), which only clears the switch. The app
  puts the title 16 px from the top.

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
| `--track` | `rgba(255, 240, 220, 0.2)` (the track of a slider, where it is not filled) |
| Font | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-serif` | `"Palatino Linotype", Palatino, "Book Antiqua", "Iowan Old Style", Georgia, "Noto Serif", serif` (the piece title) |
| Font sizes | 12 px for times (tabular numbers), 13 px for secondary text, 14 px body. The piece title is `clamp(24px, 2.5vw, 36px)` (32 px at 1280 px), and the composer `clamp(13px, 1.15vw, 16px)` |
| Radius | 10 px for panels, 12 px for the floating panel of the drawer and for the bar, 8 px for buttons |
| Control size | at least 40 px for the controls of the bar and the first screen; 32 px for the compact controls in the drawer and in messages (M, S, segmented buttons, close, collapse); at least 44 px for every control on a touch screen |
| Focus | a 2 px ring in `--accent`, with a 2 px offset, and the button radius on a slider |
| Button states | the hover and the color change in 120 ms (none with reduced motion), and a pressed button gets `rgba(255, 240, 220, 0.18)`. The large play button gets `--accent-strong` and the scale 0.96 while pressed |

**Components**

- Title, top left, 14 px from the top (12 px on a phone) and `clamp(16px, 2.8vw, 40px)` from the
  left: the logo, the piece title in `--font-serif` with the weight 400, and below it the
  composer in the system font and `--text`, as `reference/mockup.png` shows.
  - The logo of the mockup: a gold paw print (four toes and one pad, `PAW_MARKUP` in
    `ui/icons.ts`) of 20 px and the name "Zoophony" in the system font, 17 px, the weight 500.
    The user asked for it on 2026-10-06. The name has the gold of the mockup (`--accent-strong`):
    its letters measure about (250, 222, 130) in `mockup.png`. The logo is plain content, no link
    and no control, so it takes no focus. A gap of 30 px below it puts the top of the piece title
    at about 72 px, as in the mockup. A phone keeps it small: a paw of 16 px, a name of 15 px,
    and a gap of 12 px. The load state of `index.html` holds the same logo at the same place, so
    the first paint does not jump. The rest of the navigation bar of the mockup (the menu, the
    search, and the profile) is out of scope. A long title wraps, with lines of
  about the same length (`text-wrap: balance`), and the box is at most 720 px wide.
  - The shade: each line (the logo, the piece title, and the composer) is as wide as its text,
    and has its own shade in `--title-shade` behind it. The shade keeps 4.5:1 for the text over
    white fur in a close shot (audit 2026-10-05-ux-design, VD1). It is a pill that reaches 24 px
    above and below the line and 40 px to its sides, with a blur of 8 px. Thus it has no
    straight edge over a light floor (audit 2026-10-06-ux-design-2, N21), and it is opaque over
    the text and a margin of 4 px.
  - The level: the app reads the frame behind each line every 0.15 s (`app/backdrop-probe.ts`).
    The read goes into a pixel buffer with a fence, so it does not stop the frame. The lightest
    block of 6 × 6 px behind a line gives the level of its shade, from 0 to 1, which multiplies
    the alpha of `--title-shade` (`shadeLevel()` in `ui/title-shade.ts`). The level puts the
    backdrop at most at the relative luminance 0.125 behind the title and the composer, and
    0.085 behind the gold logo. A shade comes in at once and goes out in 0.8 s.
    `ui/contrast.test.ts` checks 4.5:1 for each line over each gray and each scene color, and
    `e2e/title-shade.e2e.ts` measures it in the pixels behind each line.
  - Over the dark hall of the default view, the logo and the composer have no shade, as in the
    mockup. The beam shows next to the title. With no WebGL2 context, or after an error of a
    read, each line has the full shade.
  - Until 2026-10-07, one shade of the alpha 0.8 lay behind the whole title: an ellipse from the
    window corner, about 880 × 370 px at 1440 × 900. It hid the top of the beam and the back
    left of the stage in the default view.
- Bar, at the bottom: 56 px high, 12 px from the edges (8 px on a phone). From left to right:
  play or pause, the current time, the seek bar (it fills the free space), the duration, the
  speed menu (0.5×, 0.75×, 1.0×, 1.25×, 1.5×, with at least one decimal as the pill "1.0x" of
  the mockup, and with the sign of the multiplication, audit
  2026-10-05-ux-design, CP3), mute, a volume slider of 128 px, "Automatic
  camera", "Reset view", full screen, and the drawer button. On a phone, the speed menu, the
  volume slider, "Reset view", and full screen move into a "Playback" group at the top of the
  settings. "Automatic camera" stays in the bar (choice A of the camera report), so the seek bar
  gets about 44 px less.
  - The look follows `reference/mockup.png`: the bar has the radius 12 px. The play button is a
    circle of 44 px with a gold ring of 1.75 px and the icon in `--accent` (a filled triangle,
    or two thick bars for pause). The times are 13 px in `--text`. The speed menu is a pill
    with the speed in its middle and no arrow. The thumbs of the sliders have a soft gold glow.
    On a screen of 700 px or more, the controls stand apart in groups: the play button, the
    seek bar with its times, the speed, the volume, and the four buttons at the right.
  - "Automatic camera" is a toggle button with `aria-pressed` and the label "Automatic camera"
    (2.5, user decision of 2026-10-05). It is pressed in Cinematic mode. Its icon "camera" (a
    camera with a round lens, as in `reference/mockup.png`) is in `--accent` while it is pressed.
  - At the song end, after a play, the play button has the label "Play again" and the icon
    "replay". A click plays the piece again from the start (6.5, `atSongEnd()` in
    `app/play-control.ts`, audit 2026-10-05-ux-design, AM2).
  - Before the file of the first piece arrives, the length is not known, so the bar shows no
    times and no seek bar. They keep their places, so that the bar does not move (audit
    2026-10-06-ux-design-2, N15).
  - The seek bar moves in whole seconds, and it cannot seek until the samples are ready. A seek
    during play ends the count-in (6.5). Until the listener hears a seek, the bar shows the seek
    point, and a play starts from it (`app/seek.ts`).
  - The volume slider goes from 0 to 100 and starts at 100. The volume gain of the output chain
    is the square of the position (6.8). Mute is a toggle button with `aria-pressed`. It keeps the position of
    the slider, and a move of the slider ends the mute.
  - The drawer button has the label "Open the drawer" or "Close the drawer", with
    `aria-expanded`. The full screen button has the label "Full screen" or "Exit full screen".
    It does not show when the browser has no full screen for the page (`fullscreenEnabled`).
- First screen: a round play button of 72 px below the front edge of the stage, in `--accent`
  with a dark icon. The center of the button is at 72% of the height (70% on a phone), and at
  least 230 px (240 px on a phone) above the bottom, so that the texts below it stay clear of
  the bar. The button must not cover the orchestra (audit 2026-10-05-ux-design, FI3). The
  nearer default view of step 8 brought the front edge of the stage to 77% of the height, under
  the button (review of step 8, H1). Thus, while the play button shows, the frame of the camera
  (4.5) shrinks toward the top of the orchestra until the front edge of the stage stands 12 px
  above the load ring. The camera does not move. At 1440 × 900 with the drawer open, the frame
  shrinks to about 0.74 to 0.77. After the first play, the frame grows back to the default view
  in about 0.4 s, at once with reduced motion, as a short push-in in the count-in
  (`clearFirstScreen()` in `shots/frame.ts`). While the samples load, a ring around the button shows the progress, and a label
  below it shows the load text. While the piece waits for its samples (2.2), the button shows
  the pause icon and the label "Pause", the ring turns (no turn with reduced motion), and the
  load text gets the second line "The music starts after the load." (`firstScreenView()` in
  `app/play-control.ts`).
  - On a short and wide screen (a height below 800 px and an aspect of at least 7:5), the stage
    fills the height, and this column does not fit below it. The first screen then stands at the
    right of the stage: from `50% + 0.37 × height + 24 px` to 24 px from the right edge, in the
    middle between the title and the bar. The place came from the default view before step 8,
    where the stage was about 0.74 of the height wide. Now the frame shrinks toward the left
    edge of the stage until the stage ends 12 px left of the load ring. A message
    then stands above the bar at its left (audit 2026-10-06-ux-design-2, N14). Beside the open
    drawer, the first screen fills the gap between the stage and the drawer with no intro,
    because the drawer holds the demo list. A gap narrower than 100 px shows no first screen,
    and the play button of the bar stays. The intro line keeps lines of about the same length
    (`text-wrap: balance`).
  - The ring follows the bytes of the preset files, and the load text counts the files (6.8).
    Until the bytes pass 15% of the sum, 15% of the ring turns once in 2.4 s (no turn with
    reduced motion), so that the ring does not jump back when the first byte arrives (audit
    2026-10-06-ux-design-2, N16). Before the file of the first piece shows, the load text is
    "Loading". Before the list of the preset files is known, it is "Loading instruments" (audit
    2026-10-05-ux-design, LD2). After 10 s of load, the count also gives the megabytes that
    arrived and their sum, so that a slow network shows how much remains (`loadText()` in
    `app/play-control.ts`, audit 2026-10-06-ux-design-2, N22).
  - Until the first play of the session, a line below the load text names the app and tells
    what it does: "Zoophony: an orchestra of animals plays your MIDI file." The name is in
    `--text` and weight 600, and the rest is 13 px in `--text-dim`. Below it, the text button
    "Select a piece" in `--accent` opens the drawer at the demo list, and the row of the current
    demo gets the focus (`Ui.openDemoList()`). The first screen of a later piece has neither
    (audit 2026-10-05-ux-design, FI2). The demo list holds the button "Select a MIDI file", so
    the visitor finds the own file there. ASD-STE100 has no verb "choose", so the button says
    "Select", as "Select a MIDI file" does.
  - `index.html` holds the same load state as static HTML: the logo, the turning part
    of the ring, and "Loading". It uses the classes of `ui/ui.css`. The head of `index.html`
    links `style.css` and `ui/ui.css`, so they load before the first paint, also on the dev
    server, and `main.ts` removes the load state. Thus a slow network shows a load state at once.
    An import of the style sheets in the script showed a white page with a black disc for a
    moment at each reload of the dev server. Before the
    first piece, the title names the demo at once, before its file arrives.
- Drawer, on the right: a floating panel 340 px wide, as in `reference/mockup.png`, in
  `--panel-glass`, with a border in `--line`, the radius 12 px, and a soft shadow. It has the
  sections "Demos", "Seats", "Settings", and "Credits". The headings are 16 px in `--text`, with
  the weight 500. The panel is nearly opaque, so that the text of a silent seat keeps 4.5:1 also
  over white fur behind it (`ui/contrast.test.ts`). A compact close button "Close the drawer"
  with the icon "close" sits at the top right, beside the first heading (below the handle on a
  phone). It scrolls with the drawer, so
  that it never covers a line of text. It gives the focus to the drawer button, as Escape does. The drawer slides 16 px from the right
  (the sheet 16 px from below) and fades in 200 ms when it opens and closes. With reduced
  motion, it opens and closes at once (audit 2026-10-05-ux-design, DR3).
  - While the drawer is open, the stage and the first screen move 176 px to the left, half the
    width of the drawer and its gap, so that the stage is in the middle of the free area. Above
    the sheet of a phone, the stage moves up by 30% of the height less 20 px, so that it shows
    between the title and the sheet. The moves take about 200 ms (none with reduced motion). The
    canvas does not move: it fills the window, and the camera moves its frame with
    `setViewOffset()` (the frame of 4.5, `stageCover()` in `app/stage-cover.ts`). Thus the scene
    continues under the drawer and the bar, as in `reference/mockup.png`. Until the review of
    step 8, the canvas moved. It was transparent before the post effects of step 8, so the page
    background filled the gap (audit 2026-10-05-ux-design, PH4). The post effects made it
    opaque, and a hard edge showed at x = 1264 below the drawer and behind the bar (review of
    step 8, M3). A drawer that a click on an animal opens keeps the stage and the first screen
    in place, so that the next click hits the animal under the pointer (2.3,
    `Drawer.openFromStage()`, audit 2026-10-06-ux-design-2, N18). On a phone, the stage still
    moves up above the sheet. A later open with the drawer button or "Select a piece" moves the
    stage. The projection of the camera holds the frame, so a click still hits the animal under
    the pointer.
  - Wide layout: a window at least 1200 px wide, with an aspect of at least 3:2, opens the
    drawer at start with the seat list expanded, as `reference/mockup.png` shows
    (`isWideLayout()` in `app/wide-layout.ts`). Beside the drawer, the stage keeps a free area
    that is wider than it is high. The bar stays during play while the drawer is open (2.3), so
    the bar of a wide window hides only after the user closes the drawer. A narrower window and
    a phone start with the drawer closed and the seat list collapsed. The load state of
    `index.html` stands beside the drawer in the wide layout, so that it does not jump when the
    script runs.
  - Demos: one row for each demo, with the title (13 px), the composer (12 px, dim), and the
    length, as in `reference/mockup.png`. A line in `--line-faint` separates two rows. The
    current demo has a light row (`rgba(255, 240, 220, 0.07)`) and a gold bar of 3 px at its
    left, out of the row. A cover of 40 × 30 px with round corners stands at the left of each
    row. The demos have no pictures of their own, so the project draws each cover as inline
    SVG: a warm gradient and a simple motif of the piece (`COVERS` in `ui/covers.ts`). The
    Boulanger demo has a branch with blossoms in the morning sun, the Ode to Joy a rising sun,
    the Nachtmusik a full moon, the Brandenburg concerto three gold arches, the Allegretto of
    the Symphony No. 8 a metronome, and the Andante for the flute water lilies. They need no
    image file and no license of another author.
  - The row of the current demo has a level meter between the title and the length: nine gold
    bars of 2 px, 14 px high (`ui/demo-list.ts`). The bars follow the notes of the score at the
    song time, from the low keys at the left to the high keys at the right
    (`meterTrack()` and `meterLevels()` in `app/meter.ts`). Each bar takes the keys of a band
    of 8 keys from key 28, with the velocity of each note, a decay to 55% while the key is held,
    and a fall to 0 in 0.3 s after the release. A note adds 40% of its level to the bars
    beside its bar, and a soft limit keeps each level below 1. The track has 20 frames for each
    second, and only the first player of a seat counts, so the section size does not change it.
    The song time alone gives the levels, so the meter stops during a pause and follows a seek.
    At the level 0, a bar keeps 15% of its height. With reduced motion, the bars stand still in
    the shape of the mockup.
  - Below the seat list, as in `reference/mockup.png`: the button "Select a MIDI file", as wide
    as the drawer, with the icon "file" in `--accent`, the text, and the icon "chevron" at the
    right, in a border of `rgba(231, 180, 90, 0.35)`. It sticks to the bottom of the drawer
    while the rows above it scroll, and it scrolls up with the settings and the credits. Its
    tooltip says "Or drop a MIDI file on the page." A touch screen (`(pointer: coarse)`) shows
    no tooltip, because it cannot drop a file (audit 2026-10-05-ux-design, PH2). The mockup
    shows no line of text below the button.
  - Seats: collapsed by default, except in the wide layout. One row for each seat, as in
    `reference/mockup.png`: a dot of 13 px in the fur color of the species, the seat name
    (13 px), the animal line (12 px, dim), a source line (12 px, dim), and two toggle buttons,
    "M" (mute) and "S" (solo). A line in `--line-faint` separates two rows. The animal line
    names the players, so that the row links to the stage (audit 2026-10-05-ux-design, DR1).
    The rows of the mockup have no source line, so it shows only in the row of the animal that
    the user clicked (2.3). A screen reader reads it in each row. The buttons "M" and "S" show
    a square of 24 × 22 px with the radius 5 px in the middle of a target of the compact size,
    and the focus ring goes around the square. A pressed button fills the square with
    `--accent`. The squares stand 12 px apart, and the targets do not overlap. A silent
    seat shows dim text: the name and the source line have the opacity 0.8. Thus they keep the
    contrast 4.5:1 of WCAG AA on the panel, on the hover row, and on the marked row
    (`ui/contrast.test.ts`). The names and the source lines follow the seat text rules below.
    The sound-only seat has no animal, so its dot is a ring in `--text-dim` with no fill. The
    collapse button in the heading shows the icon "sliders" of the mockup, in `--text-dim`. It
    has the label "Collapse the seat list" or "Expand the seat list", and the toggle buttons
    have the labels "Mute {name}" and "Solo {name}". The heading "Demos" has no sliders icon,
    because no action of the demo list fits it, and the close button of the drawer stands in
    its place.
  - Settings: "Section size" (Auto, One per part, Full) and "Quality" (Auto, High, Medium, Low)
    as segmented controls. The button "Auto" names the value that it selects now: "Auto (Full)"
    or "Auto (One per part)" from `Score.orchestral` of the current piece (3.8), and "Auto
    (High)" with the automatic tier (2.6). Below each control, a dim line of 12 px explains it
    (`autoLabels()` and `SETTING_HELP` in `app/settings.ts`, audit 2026-10-05-ux-design, DR4):
    "The number of animals in the strings and the choir. Auto gives full sections to an
    orchestral file." and "A lower quality makes the motion smoother on a slow device. Auto
    lowers the quality when the frames are slow."
    A change of the section size builds the score of the current piece again. The section size
    changes only the player counts (`score/demos.test.ts`), so the `Player` keeps its score: the
    music, the song time, the play state, and the mute and solo flags stay. The layout and the
    camera take the new stage, as for a new piece. The setting also applies to the next pieces.
  - Credits: the credit line of the current demo (8.2), the SoundFont credit, the credit of the
    hall reverb (6.8), and the link "Third-party licenses". The SoundFont credit has one line for
    each entry of `SOUNDFONT_CREDITS` (`audio/soundfont-info.ts`, 6.2): "Sounds: {name} by
    {author} ({license})." and the link "Source" (`SOUND_CREDITS` in `app/credits.ts`). The
    entries are GeneralUser GS 2.0.3, VSCO 2: Community Edition, and the Versilian Community
    Sample Library. The credit of the hall reverb is the line of `HALL_CREDIT`
    (`audio/hall-credit.ts`), then the links "Source" and "CC BY 4.0"
    (`HALL_REVERB_CREDIT` in `app/credits.ts`). Each link opens in a new tab, so that the music
    does not stop. On a touch screen, each link is at least 44 × 44 px, as each control (review
    of step 6, N4). Negative vertical margins keep the line height of its paragraph, so that a
    link opens no gap above its line (re-review of step 6, R2). Each link paints over the next
    paragraph, so that a tap on each row of its box hits the link (second re-review of step 6,
    S1). Below them,
    under the label "Demo sources", each other demo shows its title and its
    credit line. Thus the credits list the source of each demo (7.3, 8.1). A file of the user has
    no credit line (`creditTexts()` in `app/credits.ts`).
- On a screen narrower than 700 px, the drawer is a sheet above the bar, with a maximum height
  of 60% of the screen and a drag handle. The handle stays at the top of the sheet while the
  sheet scrolls. A drag of the handle down by more than a quarter of the sheet height, or by
  more than 80 px, closes the sheet. A shorter drag puts it back (`sheetCloses()` in
  `app/phone-layout.ts`). A screen reader skips the handle, because the drawer button and
  Escape also close the sheet.
- A selection of a demo or of a file that the rules of 3.3 accept closes the sheet, so that the
  new piece shows (audit 2026-10-05-ux-design, PH1). A refused file keeps the sheet open, so
  that the user can select another file. When the sheet held the focus, the drawer button gets
  it. The drawer of a wider screen stays open after a selection, so that the user can compare
  pieces, and the stage stays in view beside it.
- On a phone, the bar moves its speed menu, volume slider, "Reset view", and full screen into
  the "Playback" group of the settings, and back on a wider screen (`Bar.placePlayback()`). In
  the group, each control has a visible label: "Speed" and "Volume" on the left of the menu and
  the slider, and "Reset view" and "Full screen" (or "Exit full screen") as the text of the
  buttons beside their icons (audit 2026-10-05-ux-design, PH3).
  "Automatic camera" stays in the bar. The
  page has one control of each kind, so the two places never differ.
- On a phone, the bar does not show the duration, so that the seek bar gets about 40 px more
  (about 120 px in place of 75 px at 390 px). The seek bar names the duration to a screen reader
  (`aria-valuetext`), and the demo list shows the length (audit 2026-10-05-ux-design, PH5).
- The sliders and the speed menu have the control size: 40 px high, 44 px on a touch screen.
- The sliders look the same in Chromium, WebKit, and Firefox (audit 2026-10-06-ux-design-2,
  N13): a track of 4 px with round ends in `--track`, the filled part up to the center of the
  thumb in `--accent`, and a round thumb of 14 px in `--accent`. A hover or a drag gives the
  thumb `--accent-strong` and makes it 1.2 times larger. The thumb of the seek bar is in
  `--text-dim` while the seek bar cannot seek. The thumb has a soft glow in `--accent`. The
  focus ring is the ring of the tokens. The speed menu has no arrows of the browser: it is a
  pill with the speed in its middle, as in the mockup, with a border of
  `rgba(255, 240, 220, 0.16)`, and a hover gives it the background `--line`. The tooltip
  "Speed" names it.
- Drop overlay: while a file is over the page, a dashed accent border and the text "Drop the
  MIDI file to play it." cover the page.
- Messages: at the bottom center, above the bar, on `--panel` with a 4 px bar on the left in
  `--danger`. A message closes after 6 s, or with its close button "Close the message", or with
  the Escape key in it. While the pointer is over it or it holds the focus, it stays, and it
  closes 6 s after the user leaves it (`followMessage()` in `app/messages.ts`). A new message
  replaces the old one, and a new piece closes the message of the old piece. When a message
  with the focus closes, the play button of the bar gets the focus. A message shows above the
  drawer. On a phone, it has the width of the bar, so that it is not under the sheet.
- While the first screen shows, a message sits 12 px above the load ring of the large play
  button, so that it does not cover "Select a piece", the way out of a failure. Beside the open
  drawer of a desktop, it moves left with the first screen (audit 2026-10-06-ux-design-2, N12).
  The open sheet of a phone covers the first screen, so a message then keeps its place above
  the bar.
- Notes: a message with a bar in `--accent` in place of `--danger`, no button but the close
  button, and a time of 3 s (`noteMessage()` in `app/messages.ts`). A note replaces a note or the
  refusal of a file, but not a failure with "Try again" (`addNote()`).
- Build cover (audit 2026-10-05-ux-design, PF1): a new piece after the first one, and a change
  of the section size, build the layout and the plans in one task, which stops the frames for
  133 to 150 ms. Before the build, the canvas fades to the page background in 150 ms
  (`Ui.coverStage()`), and it fades in again two frames after the build, so that the first
  render of the new scene also happens behind the cover (`Ui.uncoverStage()`). With reduced
  motion, the canvas hides and shows at once. A selection thus starts about 170 ms later.
- Page title and metadata (audit 2026-10-05-ux-design, CP1): the title of the page names the
  current piece, "{title}, {composer} · Zoophony" for a demo and "{title} · Zoophony" for a file
  of the user (`pageTitle()` in `app/page-title.ts`). `index.html` has the title "Zoophony", a
  description, the icon `public/favicon.svg` (the gold paw of the logo on `--panel`), and
  the Open Graph title, description, and type. An Open Graph image needs the absolute URL of
  the site, so it waits for the first deploy (`TODO.md`, step 7).
- Tooltips (audit 2026-10-05-ux-design, CT1): a box above a control, with 12 px text on
  `--panel`, a border in `--line`, and a radius of 6 px. It names the action and its key (2.4):
  "Play (Space)", "Pause (Space)", or "Play again (Space)", "Seek (← →, Home)", "Mute (M)", "Automatic camera (C)",
  "Full screen (F)" or "Exit full screen (F)", and "Speed", "Volume", "Reset view", and "Open
  the drawer" with no key (audit 2026-10-06-ux-design-2, N17). The buttons "M" and "S" of the seat rows show their labels, for example "Mute Violins 1".
  The file button shows "Or drop a MIDI file on the page."
  The tooltip shows 400 ms after a mouse or a pen comes over the control, or after a keyboard
  focus (`:focus-visible`). A touch gives no tooltip. Escape hides it and does nothing more, the
  pointer can move onto it, and it stays until the pointer or the focus leaves (WCAG 1.4.13).
  A screen reader skips it, because the control has the name in its `aria-label` and the key in
  its `aria-keyshortcuts` (`ui/tooltip.ts`, `app/tooltips.ts`). The drop hint of the file button
  is no name, so a visually hidden copy of it describes the button (`aria-describedby`). A touch
  screen has no such description, because it cannot drop a file (review of step 8, L2).
- Icons: inline SVG, 20 × 20, stroke width 1.75, round caps and joins, `currentColor`. The set:
  play, pause, replay, volume, volume off, camera, reset view, full screen (four arrows to the
  corners), exit full screen (four arrows from the corners), drawer (three lines), file, close,
  chevron, and sliders (three lines with knobs). The shapes follow
  `reference/mockup.png`.

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

- A seat with one player takes the name in the column "One player", for example "Flute". The
  soloist (`Score.soloist`, 3.8) that does not sit at a keyboard is that name and "soloist",
  for example "Flute soloist" (`seatNames()` in `app/seat-text.ts`, audit
  2026-10-06-ux-design-2, N20). The audit proposed "Solo flute", but the solo button of the row
  would then read "Solo Solo flute". A change of the section size can change the names. A
  chamber group of 4.2 names no soloist, because the soloist rule does not apply to it
  (`seatRows()`).

- A seat of the section "piano" takes the name of its first program (`keyboardName()` in
  `app/seat-text.ts`, audit 2026-10-05-ux-design, DR2): programs 0 to 5 "Piano", 6
  "Harpsichord", 7 "Clavinet", 8 "Celesta", 16 to 20 "Organ", 21 and 23 "Accordion", and 22
  "Harmonica". Thus the Boulanger demo shows "Celesta" and the Bach demo "Harpsichord". The
  piano model stays.
- If more than one seat of a section has a name, the name gets the number of the seat in that
  section, from 1: "Violins 1", "Violin 2", "Choir 3". The soloist gets no number, and the
  other seats of its section do not count it.
- The animal line gives the number of players of the seat and their species (`animalText()` in
  `app/seat-text.ts`): "5 rabbits", "1 deer", "8 red foxes". The sound-only seat shows "No
  animal". The species names are rabbit, red fox, tan fox, wolf, elephant, bear, cat, hippo,
  deer, panda, mouse (mice), beaver, dog, monkey, pig, rhino, badger, meerkat, penguin, and
  polar bear. A change of the section size changes the numbers.
- The source line names the ports, the channels, and the programs of the seat. The UI shows
  channels as 1 to 16, ports from 0, and programs from 0.
  - One source: "Port 0, channel 8, program 40".
  - Several channels on one port: "Port 0, channels 4 and 5, program 0".
  - Several ports: "Port 0 channel 4, port 1 channel 2, program 40".
  - Several programs, in the order of first use: "Port 0, channel 12, programs 40 and 45".
  - A rhythm channel names the kit: "Port 0, channel 10, kit 48".
  - A seat with a melodic source and a rhythm source names both, for example a timpani seat:
    "Port 0, channels 7 and 10, program 47, kit 48".
  - The sound-only seat names only its programs and kits: "Programs 80 and 81". It can have
    kits after a rhythm seat moves into it (3.7).
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

- Each control is a `button`, an `input type="range"`, or a `select`, with an `aria-label`.
  A row of the demo list has the label of its title, its composer, and its spoken length, for
  example "Symphony No. 8, Op. 93: II, Ludwig van Beethoven, 3 minutes 40 seconds"
  (`demoRowLabel()` in `app/demos.ts`). The texts of the row alone read with no pause between them.
- Each toggle button has `aria-pressed`. Each collapse button has `aria-expanded`.
- The seek bar has an `aria-valuetext`, for example "1 minute 23 seconds of 5 minutes 16 seconds".
- The canvas has `role="img"` and the `aria-label` "An orchestra of animals on a stage".
- A polite `aria-live` region announces the load progress, the messages, and the current demo.
  The load text of the first screen, the box of the messages, and the title are such regions.
  The title thus announces each new piece, also a file of the user.
- A click on an animal opens its seat row and keeps the focus where it is, because a pointer
  made the click (2.3). A keyboard user reaches the row in the seat list.
- The focus order is the title, the bar, then the drawer.
- When the first screen hides with the keyboard focus on its play button, the play button of the
  bar gets the focus. A focus from a pointer goes to the page, so that the bar can hide during
  play (review of step 6, N1).
- A new piece replaces the rows of the seat list. When a row held the focus, the collapse button
  of the seat list gets it (review of step 6, N6).
- The bar stays visible while it has the keyboard focus, while the pointer is over it, and while
  the drawer is open. The keyboard focus is a control of the bar that matches `:focus-visible`.
  A click or a tap also gives a button the focus, but that focus does not keep the bar, so that
  the bar hides during play after a click on Play (re-review of step 6, R3).
