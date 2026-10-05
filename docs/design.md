# Animal Orchestra: design

This document records the design of a WebGL MIDI player for orchestral music. Low-poly animals
play the music on a small stage. The design was confirmed on 2026-10-04, before the first line
of code.

The facts behind the decisions are in [`research/`](research/README.md). Section 10 lists the
details that are still open.

## 1. Goals and budgets

- The app is a static site on GitHub Pages. It has no server.
- Desktop browsers come first. Phones must play the music, with lower visual quality.
- The scene renders at 60 fps on a laptop with an integrated GPU.
- The first download is less than 1 MB after gzip. Section 7.2 defines what the check counts.
- The app loads the instrument samples after the first frame. It loads only the presets that the
  file uses.
- The code license is MIT.

The reference image of the user shows the target scene. The image is not in the repository.

- A square wooden stage with steps at the front stands in one warm spotlight, on a dark
  background.
- A bear conducts from a podium.
- Three gray rabbits and four foxes play violins. Three raccoons play clarinets. One elephant
  plays a cello. Two foxes play flutes.
- The players sit on yellow chairs behind black music stands.

## 2. Product

### 2.1 Input

- The user drops a `.mid` file on the page, or selects a file with a button.
- The user selects a demo from the demo list (section 8).
- Version 1 has no URL load and no live MIDI input. With a file, the app knows each note before
  it sounds, so an animal can move before the note. Live input does not permit this.

### 2.2 First screen

- At start, the app selects demo 1. Its orchestra sits on the stage in the rest pose
  (section 5.2). A large play button starts the music.
- The URL hash `#demo=<id>` opens a demo directly. A dropped file does not change the URL.
- The app starts to load the samples of demo 1 right after the first frame. Then the first click
  on play starts the music quickly.

### 2.3 Layout

The UI has the style of a video player. The theme is dark only, because the scene is dark.

```text
┌──────────────────────────────────────────────────────────┬──────────────┐
│ Title of the piece                                       │ Drawer:      │
│                                                          │  demos       │
│                    3D scene (canvas)                     │  seats       │
│                                                          │  settings    │
│                                                          │  credits     │
│ ┌──────────────────────────────────────────────────────┐ │              │
│ │ [>]  ------o-----------  1:23 / 5:16   1.0x   volume │ │              │
│ └──────────────────────────────────────────────────────┘ │              │
└──────────────────────────────────────────────────────────┴──────────────┘
```

- The bar at the bottom holds play and pause, the seek bar, the time, the speed, and the volume.
- While the music plays, the bar hides after 3 s with no pointer motion. It shows again on
  pointer motion, on a tap, and on keyboard focus.
- The drawer on the right holds the demo list, the seat list, the settings, and the credits. On
  phones, the drawer is a sheet at the bottom of the screen.
- The seat list is collapsed by default. Each row shows the section, the port, the channel, and
  the program, with a mute button and a solo button. Keyboard users and screen reader users need
  this list, because they cannot click an animal. Small animals are also hard to tap on a phone.
- A click on an animal opens its row in the seat list.
- The settings hold the quality tier (section 2.6) and the section size (section 3.8).
- Two more buttons: "Reset view" (section 2.5) and full screen.
- The UI uses the system font. There is no font file.

### 2.4 Play, load, and keyboard

- Play waits until the app has loaded and decoded all samples of the file. The app shows the load
  progress.
- The speed goes from 0.5x to 1.5x.
- Space plays and pauses. The left and right arrows seek 5 s. Home goes to the start. These keys
  do nothing while the focus is in a text field.
- The browser lets audio start only after a user gesture. Thus the app makes the AudioContext
  and loads the worklet before the first click, in the suspended state. The first click resumes
  the context.
- On iOS, the silent switch mutes Web Audio. The app sets
  `navigator.audioSession.type = 'playback'` when this API exists, so that phones play the music
  with the silent switch on.

### 2.5 Camera

- The camera is a perspective camera with a field of view of about 30 degrees. The default view
  has the angle of the reference image.
- Orbit controls rotate and zoom the view. The camera cannot go below the stage.
- "Reset view" frames the used seats.
- If the user prefers reduced motion, the orbit controls have no inertia.

### 2.6 Quality tiers and browser support

| Tier | Shadow map | Pixel ratio | MSAA |
|---|---|---|---|
| High | 2048, soft filter | up to 2 | on |
| Medium | 1024 | 1.5 | on |
| Low | 512 | 1 | on |

MSAA stays on in all tiers, because the flat faces show hard edges.

- At start, the app selects a tier from the device. A touch screen or a small screen gives the
  low tier.
- The app drops one tier if frames take more than 18 ms for 2 s. The automatic tier only goes
  down, never up, so the quality does not go down and up many times.
- The app measures the frame time only while the music plays and the tab is visible.
- A manual setting overrides the automatic tier.
- The app needs WebGL2. If WebGL2 is not available, the app shows a message. There is no WebGL1
  fallback.
- Supported browsers: the current and the previous major versions of Chrome, Firefox, and Safari
  (macOS and iOS), and Android Chrome.

### 2.7 Privacy

Version 1 has no analytics, no cookies, and no service worker.
