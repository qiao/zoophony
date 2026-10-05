# Zoophony: design

This document records the design of a WebGL MIDI player for orchestral music. Low-poly animals
play the music on a small stage. The design was confirmed on 2026-10-04, before the first line
of code.

The facts behind the decisions are in [`research/`](research/README.md). Section 10 lists the
decisions that the agent made after the design session, for the user to confirm.

## 1. Goals and budgets

- The app is a static site on GitHub Pages. It has no server.
- Desktop browsers come first. Phones must play the music, with lower visual quality.
- The scene renders at 60 fps on a laptop with an integrated GPU.
- The first download is less than 1 MB after gzip. Section 7.2 defines what the check counts.
- The app loads the instrument samples after the first frame. It loads only the presets that the
  file uses.
- The code license is MIT.

The reference image [`reference/orchestra.webp`](reference/orchestra.webp) shows the target scene.
The user owns the rights to it. Look at it before any visual work. Section 4.5 gives the values
that come from it.

- A square wooden stage with steps at the front stands in one warm spotlight, on a dark
  background.
- A bear conducts from a podium.
- Three gray rabbits and four foxes play violins (the cast has the white rabbits of
  `animals.webp`, 4.5). Three raccoons play clarinets (the cast has wolves there, 4.3). One
  elephant plays a cello (the cast has the panda there, and the elephant plays the timpani at
  the back, 4.3). Two foxes play flutes.
- The players sit on yellow chairs behind black music stands.

The reference image [`reference/animals.webp`](reference/animals.webp) (1024 × 1024 px) shows the
front, side, and back views of the animals: rabbits and foxes with a violin and with a clarinet,
the bear on the podium, a gray animal with a clarinet, and a gray animal with a cello. The user
added it on 2026-10-05 and asked for the same results. It sets the shapes, the proportions, and
the colors of the animals (4.3, 4.5). Where it differs from `orchestra.webp`, it wins.

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
- When the user selects a demo or drops a file, the app stops the current piece and loads the
  new one. The new piece starts when its samples are ready, because the selection is a clear
  wish to listen. Only the first screen waits for a click, because the browser needs a user
  gesture before it plays audio.
- The app starts to load the samples of demo 1 right after the first frame. Then the first click
  on play starts the music quickly.
- Until step 6 builds the demo list and the hash, the query `?demo=<id>` selects the demo, and the
  keys [ and ] show the previous and the next demo. These are temporary, for the review of step 4.

### 2.3 Layout

The UI has the style of a video player. The theme is dark only, because the scene is dark.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Title of the piece                                   ┌─────────────────┐ │
│ Composer                                             │ Drawer:         │ │
│                                                      │  demos          │ │
│                                                      │  seats          │ │
│                 3D scene (canvas)                    │  settings       │ │
│                                                      │  credits        │ │
│                                                      │                 │ │
│                                                      └─────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ [>] 1:23 ---o----------- 5:16  1.0x  vol --o-  [o] [ ] [|]           │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

- The bar at the bottom holds play and pause, the seek bar, the time, the speed, and the volume.
- While the music plays, the bar hides after 3 s with no pointer motion. It shows again on
  pointer motion, on a tap, and on keyboard focus.
- The drawer on the right holds the demo list, the seat list, the settings, and the credits. On
  phones, the drawer is a sheet above the bar (2.8).
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
- "Reset view" returns to the default view. The stage size follows the seats, so the default
  view always frames the used seats (4.5, camera).
- If the user prefers reduced motion, the orbit controls have no inertia.

### 2.6 Quality tiers and browser support

| Tier | Shadow map | Pixel ratio | MSAA |
|---|---|---|---|
| High | 2048, `PCFShadowMap` with radius 3 | up to 2 | on |
| Medium | 1024, `PCFShadowMap` with radius 1 | up to 1.5 | on |
| Low | 512, `PCFShadowMap` with radius 1 | 1 | on |

MSAA stays on in all tiers, because the flat faces show hard edges.

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
- A manual setting overrides the automatic tier.
- The app needs WebGL2. If WebGL2 is not available, the app shows a message. There is no WebGL1
  fallback.
- Supported browsers: the current and the previous major versions of Chrome, Firefox, and Safari
  (macOS and iOS), and Android Chrome.

### 2.7 Privacy

Version 1 has no analytics, no cookies, and no service worker.

### 2.8 UI spec

The static prototype [`prototype/ui.html`](prototype/ui.html) shows these values. The reference
image stands in for the 3D canvas, and a switch at the top selects the state. The screenshots
`prototype/ui-desktop-first.webp`, `prototype/ui-desktop-playing.webp`, and
`prototype/ui-phone-playing.webp` show the same page. Copy the tokens and the layout from the
prototype. The switch is part of the prototype only.

These parts of the prototype exist only in the prototype:

- The state switch at the top center.
- The open seat list in the state "Playing, drawer open", so that the screenshot shows it. The
  app starts with the seat list collapsed.
- The title position on a phone (104 px from the top), which only clears the switch. The app
  puts the title 16 px from the top.

**Tokens**

| Token | Value |
|---|---|
| `--bg-overlay` | `rgba(16, 13, 11, 0.72)`, with `backdrop-filter: blur(10px)` |
| `--panel` | `#17130f` |
| `--line` | `rgba(255, 240, 220, 0.10)` |
| `--text` | `#efe8dc` |
| `--text-dim` | `#b5aa99` |
| `--accent` | `#e7b45a` (the warm gold of the spotlight) |
| `--accent-strong` | `#f0c676` (hover) |
| `--danger` | `#e0796a` |
| Font | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Font sizes | 12 px for times (tabular numbers), 13 px for secondary text, 14 px body, 16 px title |
| Radius | 10 px for panels, 8 px for buttons |
| Control size | at least 40 px for the controls of the bar and the first screen; 32 px for the compact controls in the drawer and in messages (M, S, segmented buttons, close, collapse); at least 44 px for every control on a touch screen |
| Focus | a 2 px ring in `--accent`, with a 2 px offset |

**Components**

- Title, top left: the piece title (16 px) and the composer (13 px, dim).
- Bar, at the bottom: 56 px high, 12 px from the edges (8 px on a phone). From left to right:
  play or pause, the current time, the seek bar (it fills the free space), the duration, the
  speed menu (0.5x, 0.75x, 1.0x, 1.25x, 1.5x), mute, a volume slider of 96 px, "Reset view", full
  screen, and the drawer button. On a phone, the speed menu, the volume slider, "Reset view", and
  full screen move into a "Playback" group at the top of the settings.
- First screen: a round play button of 72 px in the middle of the stage, in `--accent` with a
  dark icon. While the samples load, a ring around the button shows the progress, and a label
  below it shows the load text.
- Drawer, on the right: 340 px wide, with the sections "Demos", "Seats", "Settings", and
  "Credits".
  - Demos: one row for each demo, with the title, the composer, and the length. The current demo
    has an accent bar on the left. Below the list: the button "Select a MIDI file" and the text
    "Or drop a MIDI file on the page."
  - Seats: collapsed by default. One row for each seat: a dot in the fur color of the species,
    the seat name, a source line, and two toggle buttons, "M" (mute) and "S" (solo). A silent
    seat shows dim text. The names and the source lines follow the seat text rules below.
  - Settings: "Section size" (Auto, One per part, Full) and "Quality" (Auto, High, Medium, Low)
    as segmented controls.
  - Credits: the source and the typesetter of the current demo, the SoundFont credit, and the link
    "Third-party licenses".
- On a screen narrower than 700 px, the drawer is a sheet above the bar, with a maximum height
  of 60% of the screen and a drag handle.
- Drop overlay: while a file is over the page, a dashed accent border and the text "Drop the
  MIDI file to play it." cover the page.
- Messages: at the bottom center, above the bar, on `--panel` with a 4 px bar on the left in
  `--danger`. A message closes after 6 s, or with its close button.
- Icons: inline SVG, 20 × 20, stroke width 1.75, round caps and joins, `currentColor`. The set:
  play, pause, volume, volume off, reset view, full screen, exit full screen, drawer, file, close,
  and collapse.

**Seat texts**

| Section | Name | Section | Name |
|---|---|---|---|
| violin | Violins | horn | Horns |
| viola | Violas | trumpet | Trumpets |
| cello | Cellos | trombone | Trombones |
| contrabass | Contrabasses | tuba | Tuba |
| harp | Harp | timpani | Timpani |
| piano | Piano | percussion | Percussion |
| flute | Flutes | choir | Choir |
| oboe | Oboes | sound-only | Other sounds |
| clarinet | Clarinets | | |
| bassoon | Bassoons | | |

- If a section has more than one seat, the name gets the number of the seat, from 1: "Violins 1",
  "Violins 2", "Choir 3".
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
| Load failure (with a "Try again" button) | The instruments did not load. Check the connection, then try again. |
| Load progress | Loading instruments: {done} of {total} |
| Drop overlay | Drop the MIDI file to play it. |

**Accessibility**

- Each control is a `button`, an `input type="range"`, or a `select`, with an `aria-label`.
- Each toggle button has `aria-pressed`. Each collapse button has `aria-expanded`.
- The seek bar has an `aria-valuetext`, for example "1 minute 23 seconds of 5 minutes 16 seconds".
- The canvas has `role="img"` and the `aria-label` "An orchestra of animals on a stage".
- A polite `aria-live` region announces the load progress, the messages, and the current demo.
- The focus order is the title, the bar, then the drawer.
- The bar stays visible while it has the focus, while the pointer is over it, and while the
  drawer is open.

## 3. From MIDI to seats

### 3.1 Pipeline

The diagram shows how a file becomes the notes that each animal plays.

```text
.mid file (bytes)
   │ midi/: parse
   v
MidiFile: tracks of events in ticks, with ports
   │ score/: file rules (3.3), tempo map from all tracks
   v
Channel events in seconds, with no SysEx
   │ score/: program map (3.5), channel 10 map (3.6)
   v
Notes with a section ───> Seats (3.7)
   │ score/: player allocation (3.8)
   v
Score: seats, player notes, beats, synth events, presets
   │                                  │
   v                                  v
pose/: poses for the scene       audio/: the worklet plays the synth events
```

The sound and the visuals come from the same `Score`. Thus they follow the same rules.

### 3.2 Data model

```typescript
type SectionId =
  | 'violin' | 'viola' | 'cello' | 'contrabass' | 'harp' | 'piano'
  | 'flute' | 'oboe' | 'clarinet' | 'bassoon'
  | 'horn' | 'trumpet' | 'trombone' | 'tuba'
  | 'timpani' | 'percussion' | 'choir'
  /** Notes of programs with no animal (3.5). This seat has no players. */
  | 'sound-only';

type Technique = 'normal' | 'pizzicato' | 'tremolo';

/** One group of animals of one section (3.7). */
interface Seat {
  section: SectionId;
  /** The (port, channel) pairs that feed this seat. A merge (3.7) gives more than one pair. */
  sources: { port: number; channel: number }[];
  /** 0 for the first seat of its section. Selects the species variant (4.3). */
  indexInSection: number;
  /** 1 to the cap of the section (3.8). 0 for the sound-only seat. */
  playerCount: number;
  /** The melodic programs of the seat, in the order of first use. */
  programs: number[];
  /**
   * The drum kits of the rhythm sources of the seat (3.6), in the order of first use. A timpani
   * seat with program 47 on channel 7 and kit 48 on channel 10 has programs [47] and kits [48].
   */
  kits: number[];
}

/** One note after the app gives it to one player. */
interface PlayerNote {
  seatIndex: number;
  /** 0 is the principal player of the seat. */
  player: number;
  /** MIDI key, 0 to 127. */
  pitch: number;
  /** 1 to 127. */
  velocity: number;
  /** Seconds, after the tempo map. */
  startSec: number;
  /** Seconds, at key release. The sustain pedal does not change this value. */
  endSec: number;
  technique: Technique;
  /**
   * `port * 16 + channel` of the note on (3.4). A merged seat has notes of more than one channel,
   * and the size of a gesture reads the controllers of this channel (5.3).
   */
  synthChannel: number;
}

/** One conducted beat (5.4). */
interface Beat {
  timeSec: number;
  /** 0 is the downbeat of the bar. */
  indexInBar: number;
  /** The number of conducted beats in this bar. */
  beatsInBar: number;
  /** The pattern of the baton. 'generic' is one down-up motion for each beat, larger on the downbeat. */
  pattern: 1 | 2 | 3 | 4 | 6 | 'generic';
}

/** One event for the synth, in song seconds. There is no SysEx. */
interface SynthEvent {
  timeSec: number;
  /** portIndex * 16 + channel (3.4). */
  channel: number;
  /** High nibble of the MIDI status byte. */
  kind: 0x80 | 0x90 | 0xa0 | 0xb0 | 0xc0 | 0xd0 | 0xe0;
  data1: number;
  data2: number;
  /** The seat of a note event (sound-only notes too), or -1 for an event of a full channel. */
  seatIndex: number;
}

interface Score {
  /**
   * The time of the last note-off. The UI shows `Math.floor(durationSec + 0.001)` seconds, so
   * that a rounding error in a tempo event of the file cannot remove a second.
   */
  durationSec: number;
  /**
   * The sequence name (FF 03 in the first track). It is '' if the file has none, if the name has
   * no letter, or if it is a generic name (8.2).
   */
  sequenceName: string;
  /** The rules of 3.8 decide this value. */
  orchestral: boolean;
  /** Ordered by the order of `SectionId`, then by the first (port, channel). */
  seats: Seat[];
  /** Sorted by startSec. */
  notes: PlayerNote[];
  beats: Beat[];
  /** Sorted by timeSec. */
  synthEvents: SynthEvent[];
  /**
   * Presets that must load before play: the presets of the notes, in the order of first use. A
   * melodic preset has the bank of its channel at its program change. Drum kits use bank 128.
   */
  presets: { bank: number; program: number; drumKit: boolean }[];
}
```

The diagram shows how the types refer to each other.

```text
┌──────────────┐ 1      * ┌──────────────────┐
│    Score     │<>───────>│       Seat       │
└──────┬───────┘          └────────┬─────────┘
       │ *                         ^
       ├──────> PlayerNote ────────┤ seatIndex
       │ *                         │
       └──────> SynthEvent ────────┘ seatIndex (-1 for an event of a full channel)
```

The app builds the score with one function of `score/score.ts`. The app needs only this
function and the types of `score/types.ts`. A change of the setting "Section size" builds the
score again.

```typescript
type FileError = 'not-midi' | 'format-2' | 'too-large' | 'no-notes';

type ScoreResult = { ok: true; score: Score } | { ok: false; error: FileError };

function buildScore(bytes: Uint8Array, sectionSize: 'auto' | 'one-per-part' | 'full'): ScoreResult;
```

### 3.3 File rules

- A file that is not a valid Standard MIDI File, or a file of format 2: the app shows an error
  message and keeps the current piece.
- A file of more than 4 MB (4,000,000 bytes): the app refuses the file with a message.
- A file with SMPTE time division (a negative division in the MThd chunk) is not a valid file
  for the app. Music files use ticks for each quarter note.
- A file with more than 100,000 conducted beats (5.4) is not a valid file for the app. That is
  about 14 hours in 4/4 at 120 BPM. Without this limit, one note off with a delta of 2^28 ticks
  gives a song of 4,660 hours, and its beat list fills the memory. The limit counts beats, so it
  also holds for a very fast tempo. The app shows the message of a file that is not valid.
- The text of a name event (`FF 03`) is UTF-8. Text that is not valid UTF-8 is Latin-1, read with
  the `windows-1252` decoder of the WHATWG Encoding standard. In a browser, the bytes 0x80 to
  0x9F thus give printable characters, such as the euro sign for 0x80. Node 24 decodes these
  bytes as Latin-1 control characters. The name has no NUL characters and no space at its start
  or end.
- A file with no notes: the app shows an error message and keeps the current piece.
- SysEx messages: the app removes all of them before the synth and the visuals get the events.
  Thus a GS drum part SysEx cannot change the sound without a change to the visuals.
- A tempo event in any track applies to all tracks. Some format 1 files put tempo events outside
  track 0. A time signature event in any track also applies to all tracks. Of two such events at
  the same tick, the event of the later track applies.
- A note with no note off ends at the end of its track.
- Two note ons on the same key and channel before a note off: the first note off ends the first
  note on. The synth uses the same rule.
- The pairs of note ons and note offs come from all tracks of a port, because the synth pairs
  them on each channel. The end of a track adds a note off for each open note of the track.
  That note off ends the oldest open note on its key, as in the synth. In the rare case that
  another track already ended a note early in this way, the note ends at the end of the last
  track.
- A note off with no open note has no effect on the synth, so `score/` drops it.
- A note on with velocity 0 is a note off.
- A channel with no program change uses program 0 (Acoustic Grand Piano), the GM default.
- A file with no tempo or time signature events uses the MIDI defaults: 120 BPM in 4/4.

### 3.4 Ports and channels

- Each MIDI port is a group of 16 channels. The app does not merge ports.
- A port event (`FF 21`) sets the port of its track. A track with no port event uses port 0.
  If a track has more than one port event, the first one sets the port of all events of the
  track.
- The ports are ordered by port number. The synth channel is `portIndex * 16 + channel`.
- Only the tracks with channel events give ports. A control track with a port event and no
  channel events adds no port.
- The port of a seat source (3.2) and of the seat text (2.8) is the port index. Thus the first
  port of each file is port 0.
- Channel 10 (index 9) of each port is a rhythm channel.

### 3.5 Program map

| GM programs | Instruments | Section |
|---|---|---|
| 0-7, 8, 16-23 | Pianos, celesta, organs | piano |
| 9-15, 112-119 | Mallets, bells, percussive | percussion |
| 24-31, 46, 104-108 | Guitars, harp, plucked ethnic | harp |
| 32-39, 43 | Basses, contrabass | contrabass |
| 40, 110 | Violin, fiddle | violin |
| 41 | Viola | viola |
| 42 | Cello | cello |
| 44, 45 | Tremolo, pizzicato | the earlier section of the channel; if none, the next later section of the channel; if none, divided by pitch |
| 48-51, 88-95 | String ensembles, synth pads | divided by pitch across the string sections |
| 47 | Timpani | timpani |
| 52-54 | Choir, voices | choir |
| 56, 59 | Trumpet, muted trumpet | trumpet |
| 57 | Trombone | trombone |
| 58 | Tuba | tuba |
| 60 | French horn | horn |
| 61-63 | Brass sections | divided by pitch across the brass sections |
| 64-67, 71 | Saxophones, clarinet | clarinet |
| 68, 69, 109, 111 | Oboe, English horn, bagpipe, shanai | oboe |
| 70 | Bassoon | bassoon |
| 72-79 | Piccolo, flute, other pipes | flute |
| 55, 80-87, 96-103, 120-127 | Orchestra hit, synth leads, effects | `sound-only`: one seat with no animal |

- "Divided by pitch" uses fixed pitch bands. Each boundary is the lowest note of the higher
  instrument. Keys are MIDI numbers (60 is middle C).

  | Programs | Bands |
  |---|---|
  | String ensembles, tremolo, pizzicato (44, 45, 48-51, 88-95) | contrabass ≤ 35, cello 36-47, viola 48-54, violin ≥ 55 |
  | Brass sections (61-63) | tuba ≤ 39, trombone 40-52, horn 53-64, trumpet ≥ 65 |

- For a note of 44 or 45, "the earlier section of the channel" is the section of the last earlier
  note of another program on the same (port, channel). "The next later section" is the section of
  the next later such note. If that note divides by pitch, the note of 44 or 45 also divides by
  pitch, with the string bands.
- The sound-only seat holds all notes of the programs with no animal. It shows in the seat list
  as "Other sounds", so the user can mute and solo it. It has no players, so it never counts
  toward the cap of 3.8.
- Program 44 gives the technique `tremolo`. Programs 45 and 32 to 39 give `pizzicato`, because a
  bass guitar and a jazz bass are plucked, and MuseScore plays contrabass pizzicato with program
  32 (the Boulanger demo does this). All other programs give `normal`.
- Bank select chooses variation presets, because all presets ship. If a file asks for a bank that
  does not exist, the synth falls back to bank 0. The visuals use only the program.
- A bank select (CC 0, the bank MSB) takes effect at the next program change of its channel, as
  in spessasynth_core. `score/` does not use the bank LSB (CC 32), because the GS banks use only
  the MSB.

### 3.6 Channel 10

The GM1 drum map has no timpani. Timpani is melodic program 47. The GS and GM2 Orchestra kit
(kit 48) adds timpani on keys 41 to 53. Key 49 is a crash cymbal in GM1, but timpani C sharp in
the Orchestra kit. Thus the visual map must follow the kit that the synth plays.

- The app follows the GS and GM2 rules: a program change on a rhythm channel selects the drum
  kit.
- Kit 48 (Orchestra) uses this map:

  | Keys | Player |
  |---|---|
  | 41-53 | timpanist (section `timpani`) |
  | 35, 36 | bass drum |
  | 38, 40 | snare drum |
  | 57, 59 | cymbals |
  | all other keys | small percussion |

- All other kits use the GM1 map:

  | Keys | Player |
  |---|---|
  | 41, 43, 45, 47, 48, 50 (toms) | timpanist (section `timpani`) |
  | 35, 36 | bass drum |
  | 37, 38, 40 | snare drum |
  | 49, 51, 52, 55, 57, 59, and the hi-hats 42, 44, 46 | cymbals |
  | 80, 81 (triangle), 54 (tambourine), and all other keys | small percussion |

- Melodic program 47 on any channel also goes to the timpanist.
- GM2 rhythm on channel 11 and GS SysEx drum parts are not supported. These channels play as
  melodic channels.

### 3.7 Seats

A **seat** is one group of animals of one section. The seat key is (port, channel, section).

- A program change inside a section keeps the same players and changes only the technique. For
  example, a switch from 40 (violin) to 45 (pizzicato) keeps the same violinists.
- A program change to a different section makes a new seat. The old seat rests.
- One channel can feed several seats. A string ensemble program divided by pitch gives one seat
  for each string section.
- **Merge rule for articulation channels.** In a format 1 file, if one track has notes on several
  (port, channel) pairs that map to the same section, these pairs form one seat. MuseScore puts
  each articulation of a part (arco, pizzicato, tremolo, mute) on its own channel, so this rule
  keeps one part in one seat. Format 0
  files do not change, because one track holds all channels. LilyPond files do not change,
  because each track uses one channel. This rule does not merge a rhythm channel with a melodic
  channel. Their percussion seats get players in different ways (3.8).
- **Merge rule for single players.** All channels that map to the piano, the harp, or the timpani
  form one seat with one player. The pianist plays low notes with the left hand and high notes
  with the right hand. A piece for two pianos thus shows one pianist. Such files are rare.
- The seats of a section are ordered by their first (port, channel) pair.
- **More than 60 seats.** Each seat with players has at least one player, and the scene has at
  most 60 players (3.8). If more than 60 seats have players, the seat with the fewest notes moves
  its notes to the sound-only seat, again and again, until 60 such seats remain. Of two seats with
  the same note count, the later seat in the seat order moves. The synth events stay the same, so
  the sound does not change.

### 3.8 Players

The player count of a seat depends on its section and on the file.

| Seat | Players |
|---|---|
| Woodwinds, brass | One player for each simultaneous note (the max polyphony of the seat). |
| Piano, harp, timpani, mallets | One player plays all notes. |
| Channel 10 percussion | One player for each key group that the file uses (3.6), at most 4, in this order: bass drum, snare drum, cymbals, small percussion. |
| Strings and choir, orchestral file | A base section size: violin 4, viola 3, cello 3, contrabass 2, choir 8. All players play the same note. A chord divides the players across the notes (divisi), highest note first. |
| Strings and choir, other file | One player for each simultaneous note. |

- A file is **orchestral** if one of these is true:
  - It has a woodwind or brass seat, or a timpani seat with program 47 or kit 48. The toms of a
    GM1 kit go to the timpanist (3.6), but they do not make a file orchestral, because many pop
    files use them.
  - It uses an ensemble program (44, 45, 48-51).
  - It uses program 43 (contrabass). Programs 32 to 39 (bass guitars) do not count, so a pop
    file with a bass guitar does not get full string sections.
- A file uses a program when a note of a melodic channel plays with it. The kit 48 of a rhythm
  channel is not the program 48. `Score.orchestral` is the result of this rule. The setting
  "Section size" does not change it.
- The setting "Section size" has three values. "Auto" uses the rule above. "One per part" uses
  one player for each simultaneous note. "Full" uses the base sizes. The demo list can set the
  value for each demo.
- Caps for each seat: violin 6, viola 4, cello 4, contrabass 3, each woodwind 3, horn 4,
  trumpet 3, trombone 3, tuba 1, choir 8. The total is a maximum of 60 players. The conductor is
  not a player, so the scene has at most 61 animals.
- If the seats need more than 60 players, the app removes players in this order until the total
  is 60: first one player from the largest string or choir seat, again and again, down to the
  size that "One per part" gives; then one player from the largest other seat. A seat always
  keeps at least one player.
- "The largest other seat" is the largest seat outside the strings and the choir. When each of
  these seats has one player, the largest seat of any section loses a player. Of two seats with
  the same player count, the later seat in the seat order loses the player.
- A percussion seat with fewer players than key groups gives the remaining key groups to its last
  player.
- When a seat has more notes than players, a player takes two notes. In a string seat, this is
  a double stop. A woodwind or brass seat also gets more notes than players at its cap, or after
  the removal above 60 players. For example, a flute seat (cap 3) holds the notes 72 and 70 at
  the start of the chord 60, 64, 67. Then the notes 60 and 67 both go to player 2. A wind
  player cannot play two notes, so step 5 decides what the pose shows (`TODO.md`).
- In a chord, the highest note goes to player 0. Thus each player keeps a stable pitch range.
- Two notes of a seat are simultaneous when the earlier note ends more than 50 ms after the start
  of the later note. A shorter overlap is a legato or a grace note, and one player plays it. For
  example, two grace notes of the K. 315 flute part overlap a long note by 37 ms.
- A **chord** is a group of notes of a seat that start together. Notes with the same start are
  one chord. A later note joins the chord if it starts at most 50 ms after the first note of the
  chord, and each note of the chord ends more than 50 ms after its start. Thus a rolled or
  humanized chord gets the same players as a chord with equal starts. A grace note 30 ms before
  a long note does not join, because it ends at the start of the long note.
- An earlier note that sounds at the start of the first note of a chord counts for all notes of
  the chord. For example, an earlier note ends 70 ms after the start of the first note of a
  two-note rolled chord, and 30 ms after the start of the second note. The three notes need
  three players. Each chord gets one order and one division of the players for its notes and
  these earlier notes. Thus two notes of a chord share a player only when the chord and the
  earlier notes that sound with it have more notes than players. For example, a viola seat of 3
  players holds the notes 72 and 70 at the start of the chord 60, 64, 67. The notes 64 and 67
  both go to player 1.
- With one player for each simultaneous note, a new note takes the player of its rank among the
  notes that sound, highest first. If an earlier note still holds that player, the new note takes
  the nearest free player. Of two free players at the same distance, it takes the player of the
  higher pitch range.
- Divisi: if the players do not divide evenly, each higher note gets one more player. With more
  notes than players, the players take the notes in pitch order, highest first. For example, 3
  cellos with 5 notes play 2, 2, and 1 notes. A note that starts while an earlier note still
  sounds gets the players of its rank, and these players also hold the earlier note.

## 4. Stage, cast, and look

### 4.1 Look

- Faceted low-poly shapes with flat shading, low polygon counts, and matte colors from the
  reference image.
- One warm spotlight from above, with soft shadows, so that the faceted scene keeps the look of a
  toy model.
- A dark background.
- A square wooden stage with steps at the front, yellow chairs, and black music stands.
- The bear conductor stands on a podium at the front center.

### 4.2 Layout

The sections go into arcs in the standard order, with no gaps between the used sections. The
stage size follows the player count. Thus a string quartet sits close together on a small stage.

The diagram shows the standard order from above.

```text
                       back of the stage
┌──────────────────────────────────────────────────────────────┐
│                      choir (on risers)                       │
│  harp        percussion      timpani        brass            │
│                woodwinds (middle rows)          contrabasses │
│       violins (second seat)                   cellos         │
│  violins (first seat)                     violas             │
│             piano      [bear on the podium]                  │
└──────────────────────────────────────────────────────────────┘
               front of the stage, with the steps
```

- The violins sit at the front left. The violas and the cellos sit at the front right. The
  contrabasses sit behind the cellos. The rows spread to the side edges, as the rabbits and the
  flutes of the reference image do (4.5, seat geometry).
- The woodwinds sit in the middle. The brass, the timpani, and the percussion sit at the back.
- The harp sits at the back left. The choir stands on risers behind the orchestra.
- The piano stands at the front left of the conductor.
- Larger species sit farther back, so that a big animal hides no smaller animal. The user asked
  for this on 2026-10-05. The section map of 4.3 follows the rule, and the rows keep the
  standard order. The rows keep the cellos in row 1, because only a species of the size 1.2 or
  more reaches the full bow hair of the cello (4.5, 5.3), and the cellos in row 2 made the stages
  of the Beethoven and Boulanger demos 1.5 m and 2.2 m larger. Thus the panda (1.2), the
  smallest species that reaches it, plays the cello.

### 4.3 Species

All animals use one parametric biped body. Each species changes only its parameters.

```typescript
interface SpeciesParams {
  ears: 'long' | 'pointed' | 'round' | 'large-round' | 'floppy' | 'large-flap' | 'small'
    | 'side-round' | 'antlered' | 'none';
  snout: 'short' | 'long' | 'pointed' | 'buck-teeth' | 'trunk' | 'flat-nose' | 'horn' | 'beak';
  tail: 'none' | 'puff' | 'bushy' | 'thin' | 'flat';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  size: number;
  /** The width of the torso and the thickness of the limbs. Default 1.0. The meerkat has 0.75,
   * and the bear 1.15. */
  girth?: number;
  colors: { fur: string; belly: string; accent: string };
  /** The parts that get the accent color (4.5). */
  accentParts: readonly AccentPart[];
  /** Face pattern, for example the eye patches of the panda. */
  facePattern: 'none' | 'eye-patches' | 'eye-patch' | 'stripe' | 'forehead-stripes'
    | 'face-disc';
}
```

| Section | Species | Section | Species |
|---|---|---|---|
| Violin, first seat | rabbit (reference) | Flute | fox, light tan (reference) |
| Violin, second seat | fox, red-orange with a white face (reference) | Oboe | mouse |
| Viola | cat | Clarinet | wolf (`animals.webp`) |
| Cello | panda | Bassoon | beaver |
| Contrabass | hippo | Horn | dog |
| Harp | deer | Trumpet | monkey |
| Piano | meerkat | Trombone | pig |
| Timpani | elephant | Tuba | rhino |
| Percussion | badger | Choir | penguin |
| Conductor | bear (reference) | | |

- The fox plays in two sections, as in the reference image. The two fox colors of the reference
  make the two sections look different.
  `SpeciesId` names them `fox-red` and `fox-tan`.
- The penguins have black and white bodies, which look like choir robes.
- Larger species, farther back (4.2, user decision of 2026-10-05). The front row and the piano
  have species of the size 1.0 or less: the rabbit, the cat, and the meerkat. The large species
  of the size 1.3 or more play at the back: the elephant plays the timpani in row 3, the rhino
  the tuba in row 3, and the hippo the contrabass at the right end of row 2. The elephant of
  `orchestra.webp` played a cello in row 1, where it hid the bassoons behind it. The panda plays
  the cello in row 1, because a smaller species does not reach the full bow hair. The badger
  plays the percussion in row 3. The bear conducts from the podium.
- The wolves play the clarinets. The user decided this on 2026-10-05: the gray animal with a
  clarinet of `animals.webp` is a wolf. It has gray fur, a white face and chest, pointed ears,
  and a bushy tail. The raccoons of `orchestra.webp` left the cast, with the face pattern `mask`
  and the tail `ringed`, so the cast keeps 18 species.
- Further seats of a section alternate their species variants. For example, a third violin seat
  uses rabbits again, and a fourth uses red-orange foxes.

The shape parameters of each species (4.5 gives the size and the colors):

| Species | ears | snout | tail | facePattern |
|---|---|---|---|---|
| rabbit | long | short | puff | none |
| fox (both colors) | pointed | long | bushy | none |
| wolf | pointed | long | bushy | none |
| elephant | large-flap | trunk | thin | none |
| bear | round | short | puff | none |
| cat | pointed | short | thin | forehead-stripes |
| hippo | small | flat-nose | thin | none |
| deer | antlered | long | puff | none |
| panda | round | short | puff | eye-patches |
| mouse | large-round | pointed | thin | none |
| beaver | small | buck-teeth | flat | none |
| dog | floppy | long | thin | eye-patch |
| monkey | side-round | short | thin | face-disc |
| pig | pointed | flat-nose | thin | none |
| rhino | small | horn | thin | none |
| badger | small | long | puff | stripe |
| meerkat | small | pointed | thin | eye-patches |
| penguin | none | beak | none | none |

- `forehead-stripes` (the cat) are two thin short stripes on the forehead in the accent color,
  0.03 H wide and 0.28 H apart. The first three stripes of 0.05 H looked like a grille (review
  of step 4, the weak species).
  `stripe` (the badger) is a white stripe from the nose over the head, between two black stripes
  over the eyes.
- `eye-patches` (the panda and the meerkat) are two ovals around the eyes, with their lower ends
  out. `eye-patch` (the dog) is one round patch of 0.3 H around the left eye, which the default
  camera sees. The cream dog with brown floppy ears and the patch does not look like the tan
  meerkat and the tan fox, as the first tan dog did (review of step 4, the weak species).
  `face-disc` (the monkey) is a large face of the belly color around the eyes.
- `antlered` (the deer) is two ears that point out to the sides, and two antlers of the belly
  color on the head. `side-round` (the monkey) is two round ears at the sides of the head, at the
  height of the eyes. With pointed ears, the deer looked like the fox, and with round ears on the
  top of the head, the monkey looked like the bear.
- The belly color also colors the muzzle and the lower face: the cheeks, the jaw, and the face up
  to the eyes. Thus the fox and the wolf get their white cheeks from it, as in `animals.webp`. The
  forehead and the back of the head keep the fur color, and so does the top of a long muzzle.

### 4.4 Models

- Code builds all animals and all instruments from low-poly shapes. There are no model files and
  no texture files.
- Each player is one `SkinnedMesh`. The generator merges the body, the instrument, and the bow
  into one mesh. Each vertex follows exactly one bone, so each part is rigid and its flat faces
  stay flat.
- This gives one or two draw calls for each player (4.5, materials), plus the shadow pass. One
  `Mesh` for each part would give about 25 draw calls for each animal, which is too many for an
  integrated GPU.
- The static props (the stage, the chairs, the stands, and the podium) merge into a few meshes.

### 4.5 Visual values

The colors come from samples of the reference image. The image shows lit and shaded colors, so
each base color below is a little lighter than its darkest sample. Tune the light first, until a
screenshot of the default view looks like the reference. Change a base color only when a
measurement shows that no light value can match the reference.

The review of step 3 made one such change. The darkest areas of the reference are the most
saturated (0.46 to 0.49), so the dark sample `#7a5646` gave the stage top too much saturation. No
light color and no tone mapping brought the lit top below 0.44, against 0.25 to 0.34 in the
reference. The stage top `#7a6359` with the spotlight `#fff6ec` gives 0.38 to 0.40.

One world unit is one meter.

**Scene colors**

| Item | Color | Note |
|---|---|---|
| Background, center | `#201c19` | The CSS of the page: `radial-gradient(ellipse at 50% 45%, #201c19, #0b0908 75%)`, behind a transparent canvas. |
| Background, edges | `#0b0908` | The gradient reaches this color at 75% and keeps it to the corners. |
| Floor | none | A plane under the stage that shows only the shadows (props table). The CSS gradient shows through it. An additive disc adds the light on the floor (light and render). |
| Spotlight | `#fff6ec` | A little warm. The first color `#ffe9c7` (about 3200 K) moved each desaturated base color to yellow. |
| Visible beam | `#e8dcc0` | Additive cone (below). |
| Stage top | `#7a6359` | Walnut planks. Plank lines `#5e4b42`, with the ratio of line to top of the first colors `#7a5646` and `#5e4134`. The step treads have this color too, as in the reference. |
| Stage sides and step rises | `#3a2a22` | |
| Podium | `#9a7446` | A lighter wood box. |
| Chairs | `#cdb27a` | Pale yellow wood. |
| Music stands | `#1e1a16` | Sheet music `#ece6d6`. |

**Species colors**

| Species | Size | Fur | Belly and face | Accent |
|---|---|---|---|---|
| rabbit | 1.0 | `#ece6dc` | `#f4f0ea` | inner ears `#e9a7a5` |
| fox, violins | 1.0 | `#f0934c` | `#f6eee0` | feet and socks `#4a3324` |
| fox, flutes | 1.0 | `#c9a273` | `#e6d3b5` | ears and feet `#9a7148` |
| wolf | 0.95 | `#bab2aa` | `#f0ece4` | inner ears `#8a807a` |
| elephant | 1.35 | `#a8a198` | `#b9b2a8` | inner ears `#b9a39a` |
| bear (conductor) | 1.35 | `#5a3c32` | `#634438` | muzzle `#b98a66` |
| cat | 0.95 | `#8d9298` | `#e2ddd4` | stripes `#5f646a` |
| hippo | 1.35 | `#8f7d83` | `#b8a3a6` | nose and inner ears `#6f5f66` |
| deer | 1.1 | `#a8774c` | `#e5d3b8` | nose and feet `#3a2a20` |
| panda | 1.2 | `#e9e5dc` | `#e9e5dc` | patches `#24211e` |
| mouse | 0.75 | `#9a8b7e` | `#c9bcae` | inner ears `#d6a59a` |
| beaver | 0.95 | `#6a4630` | `#8c6a52` | tail `#3e2e26` |
| dog | 1.05 | `#e6dfd1` | `#f3eee4` | ears and eye patch `#8a5a36` |
| monkey | 0.95 | `#8a5a3a` | `#d9b892` | hands and feet `#5a3a26` |
| pig | 1.05 | `#d99a8e` | `#e6b2a8` | snout `#c98276` |
| rhino | 1.35 | `#8e8a84` | `#a6a29b` | horn `#cfc6b5` |
| badger | 0.95 | `#7d7a76` | `#e6e1d8` | face stripes `#24211e` |
| meerkat | 0.85 | `#b99a6e` | `#d8c3a0` | eye patches and ears `#2a1f17` |
| penguin | 0.9 | `#1f1d1c` | `#ece8e0` | beak and feet `#d98a3a` |

All species have eyes `#15110e` and a nose `#2a1d15`, unless their accent parts include the nose.
The front teeth of the beaver are `#f1ead9`.
The inside of an ear has the belly color, unless the accent parts include the inner ears or the
ears.

The accent color goes to these parts. The face pattern of 4.3 is also in the accent color, except
the middle stripe of `stripe` (the badger) and `face-disc` (the monkey), which have the belly
color. The antlers of the deer also have the belly color.

```typescript
type AccentPart = 'inner-ears' | 'ears' | 'nose' | 'snout' | 'horn' | 'beak' | 'hands' | 'feet'
  | 'tail' | 'face-pattern';
```

| Species | Accent parts | Species | Accent parts |
|---|---|---|---|
| rabbit | inner-ears | cat | face-pattern |
| fox, violins | feet | hippo | nose, inner-ears |
| fox, flutes | ears, feet | deer | nose, feet |
| wolf | inner-ears | panda | face-pattern, ears, hands, feet |
| elephant | inner-ears | mouse | inner-ears |
| bear | snout | beaver | tail |
| dog | ears, face-pattern | monkey | hands, feet |
| pig | snout | rhino | horn |
| badger | face-pattern | meerkat | face-pattern, ears |
| penguin | beak, feet | | |

**Instrument colors**

| Instrument | Colors |
|---|---|
| Violin, viola | wood `#9c5a43`, fingerboard `#1b1714`, bow stick `#3b2a20`, bow hair `#e8e2d4`, strings `#9a9080` (one strip of 0.008 m at the model size, so that the strings show no light bar) |
| Cello, contrabass | wood `#a8643e`, the same fingerboard and bow |
| Flute, piccolo | metal `#c9c6bf` |
| Clarinet | `#d6d1c6` with rings `#3a3530`, as in the reference |
| Oboe | `#2a2522` with metal keys `#c9c6bf` |
| Bassoon | `#7a4a2e`, with a metal bocal `#c9c6bf` |
| Horn, trumpet, trombone, tuba | metal `#c9a14a` |
| Timpani | metal kettles `#b0703f`, heads `#efe9dc` |
| Drums | shells `#8a2f2a`, heads `#efe9dc` |
| Stands of the drums and the tambourine, cymbal straps | `#1e1a16`, the color of the music stands |
| Tambourine | shell `#8a2f2a`, head `#efe9dc`, jingles `#c9c6bf` |
| Xylophone | bars `#b07a45`, frame `#3a2a22` |
| Mallets, sticks, and beaters | sticks `#cdb27a`. Felt balls of the timpani mallets and of the bass drum beater `#efe9dc`, balls of the xylophone mallets `#8a2f2a`, and the triangle beater `#c9c6bf` |
| Cymbals, triangle | metal `#c9a14a`, metal `#c9c6bf` |
| Piano | case `#15120f`, white keys `#f2eee6`, black keys `#15120f` |
| Harp | frame `#b07a45`, strings `#e8e2d4` |
| Baton | `#ece6d6` |
| Choir folder | `#2a2522`, with pages `#ece6d6` (the sheet music) |

**Materials**

- Each mesh uses `MeshStandardMaterial` with `flatShading: true` and vertex colors.
- The matte group has roughness 0.85 and metalness 0.
- The metal group has roughness 0.4 and metalness 0.3. The scene has no environment map, so a
  higher metalness makes metal look black.
- Each player mesh has at most these two groups, so it costs one or two draw calls.

**Light and render**

- One `SpotLight` above the stage center at a height of `1.2 × S`, where `S` is the stage side.
  It aims at the stage center. Angle 45°, penumbra 0.5. three.js dims the cone from
  `angle × (1 - penumbra)` to `angle`, so the full light reaches 22.5° from the axis. The stage
  corners are at 30.5°, where they get about 0.8 of the full light. With the first values (36°
  and 0.6), the corners got 0.26 of it and showed a value of 0.19 to 0.27 against 0.39 to 0.50
  in the reference. It is the only light that casts shadows. The shadow map size and filter
  follow the tier (2.6).
- The spotlight intensity is `2.2 × (1.2 × S)²` candela, so the stage center gets 2.2 lux on
  each stage size. Then the stage center has the brightness of the reference (step 3).
- One `HemisphereLight` as fill: sky `#3a3530`, ground `#4a3a30`, intensity 12. three.js uses
  physical light units, and the first value 0.3 left the stage sides and the front of the
  animals black. The ground color approximates the light that the lit stage reflects up. It
  lights the stage sides and the faces of the animals that point away from the spotlight.
- The visible beam is an open cone mesh from the light to the circle of radius `0.75 × S`. It
  uses additive blending, no depth write, and no shadows. Its opacity goes from 1.0 near the
  light to 0 at the stage. It fades in over the first tenth below the light, and it fades at its
  outline, so that it has soft edges. With the first value 0.12, the beam was almost invisible.
- The light on the floor is an additive disc 1 mm above the floor (y = -0.399), with the radius
  `1.0 × S` and the color `#e8dcc0` of the beam. Its opacity is 0.13 up to `0.5 × S` from the
  stage center, and it goes to 0 at `1.0 × S`. It writes no depth and casts no shadow. The stage
  hides its middle, and the CSS gradient stays visible far from the stage. In the reference, the
  floor below the steps has a value of 0.19 to 0.21, and the shadow-only floor gave 0.11. With
  the disc, demo 1 gives 0.19 to 0.20 there. The first value 0.10 gave 0.17 to 0.18.
- Tone mapping is ACES Filmic with exposure 1.0. The output color space is sRGB.

**Camera**

- Perspective, vertical field of view 30°, near 0.1. The far plane is the current camera
  distance plus `3 × S`. Update it when the distance changes, so that a full zoom-out still
  shows the stage.
- The default view has an elevation of 28° and an azimuth of 30° to the right of the audience
  axis. Thus the camera is in front of the stage and to the right, and it sees the back of the
  conductor, as in the reference. The target is the stage center, on the top of the stage. With
  the axes of the stage origin (below), the camera is at
  `target + d × (sin 30° × cos 28°, sin 28°, cos 30° × cos 28°)`, where `d` is the distance.
- The default distance is `3.3 × S` when the viewport is as wide as it is tall, or wider. When
  the viewport is taller than wide, multiply the distance by its height divided by its width.
- These values come from a fit of a perspective camera to the three visible top corners of the
  stage in the reference image (1024 × 1024 px): left (114, 560), near (664, 750), and right
  (914.5, 474). The fit fixes the vertical field of view at 30° and the principal point at the
  image center. Its free values are the elevation, the azimuth, the distance, and a target offset
  on the stage. The best fit has an error of 6.7 px (RMS), with the target 0.05 × S to the left
  of the stage center. With the target at the stage center, the error is about 24 px. Use the
  stage center.
- `camera.setViewOffset` moves the image up by half the bar height (34 px), so that the stage is
  in the middle of the area above the bar.
- The orbit limits: elevation 10° to 80°, distance 0.5 to 2 times the default.

**Body proportions**

The head height `H` is the unit. For the rabbit, `H` is 0.38 m. Each species multiplies `H` by its
size (species colors, above), so all species keep their size relative to the rabbit. For example,
the bear has `H` = 1.35 × 0.38 = 0.513 m. The first value 0.30 m made the animals 1.27 times too
small relative to the chairs and the podium of the reference image (review of step 3).

| Part | Size in H |
|---|---|
| Head | The sculpted head of `animals.webp`: 1.0 tall and 1.26 wide at the cheeks, below the eyes. It is a loft of six rings (`models/head.ts`): a narrow crown (0.5 wide), the forehead, the eyes, the cheeks, the jaw, and a point at the chin. Each ring has a corner at the front, so that the faces meet in a ridge from the forehead to the chin. The forehead slopes forward to the cheeks (0.16 to 0.54 in front of the head center), and the back of the head is deepest at the cheeks (0.52), so the side view is a wedge that points forward. The first head (an icosphere 0.9 wide) was narrower than the torso, and the heads looked small. |
| Torso | 1.35 tall. A faceted pear: 1.32 wide at the hips, 0.84 at the shoulders, and 0.85 of the half width deep at the back. The belly bulges forward between 0.1 and 0.6 of the height, to 1.2 of the half width. Each ring has a corner at the front, so that the chest has a ridge, as in `animals.webp`. Its top is under the chin. The first torso (1.3 tall and 1.0 wide) with a long neck made the animals look thin, and the torso of 1.45 tall and 1.12 wide of the first round of the animal views looked tall and thin beside `animals.webp`. |
| Neck | 0.6 wide, from 1.15 to 1.6 above the seat. The torso and the head hide almost all of it. |
| Upper arm, forearm, hand | 0.7, 0.65, 0.25 (a mitten: one block for all fingers). The arms are 0.40 to 0.30 wide, and the shoulder joints are 0.52 from the middle, 0.98 above the seat. The shoulder joint is 1.43 from the middle of the palm: 0.62 of the seated height. In the reference image, it is 0.55 to 0.62. The first arms (0.6 and 0.55, 0.51 of the seated height) did not reach the bow hair of the viola, the cello, and the contrabass, and 7 of the 11 other instruments (review of step 4, the reach of the arms). |
| Thigh, shin, foot | 0.68, from the knee to the floor, 0.72. The thick thigh (0.76 to 0.62 wide) lies flat on the seat, the knee is a faceted ball of 0.64, it bends at 90° and reaches past the front edge of the chair, and the shin (0.54 to 0.40 wide) goes straight down. The foot is a wedge 0.48 wide and 0.72 long, 0.26 high at the heel and 0.14 at the toes, flat on the floor. Its heel reaches 0.22 behind the ankle, so that the toes end 1.23 in front of the hip. With the toes 0.05 m further forward or turned out 10°, the feet touched the legs of the shared music stands, and the stages grew by up to 0.4 m. With accent feet, the lower 0.45 of the shin also has the accent color, as the dark socks of the fox. The first thin legs (0.34 and 0.26 wide) looked like stilts. The chair sets the length of the shin, because the feet rest on the floor as in the reference image. A seated hip is 0.3 above the seat and 0.32 from the middle, and the ankle is 0.1 above the floor, so the shin is the seat height plus 0.2 H: 1.12 H on a chair of 0.35 m at `H` 0.38 m. The first shin of 0.6 H left the feet 0.25 m above the floor. |
| Seated height | 2.3 from the seat to the top of the head. With the chair of 0.35 m (0.92 H), the head is 0.30 of the height of the seated rabbit, as in `animals.webp` (0.30 for the rabbit and 0.31 for the fox). The first value 2.6 put the heads on long necks, and 2.4 with the chair of 0.40 m gave 0.29. |
| Eyes | Two black upright ovals of about 0.07 × 0.15, half in the head surface, on the faces between the front and the sides (`EYE_DIRECTION`), so that the side view shows them too, as in `animals.webp`. No mouth, except the choir jaw (4.7). |
| Ears | long 1.25 tall, pointed 0.55, round 0.3, large-round 0.7 (set high on the head and out to the sides, so that the mouse does not look like the bear), floppy 0.5 long (hangs down), large-flap 0.9 wide, small 0.2, side-round 0.32, antlered 0.45 (pointing out to the sides) with antlers of 0.45. The large-flap ear points back and out at 32° from the middle plane of the head. Thus an elephant is 0.88 m wide at the ears, and two elephants on neighbor seats (0.95 m of arc) keep apart (review of step 3, F12). The long and the pointed ears are flat plates with a sharp outline, as in `animals.webp`: the long ear is a leaf 0.4 wide, and the pointed ear a triangle 0.42 wide at its base. An inner plate of 0.66 of the size lies on the front face. Each plate leans back 10°, and its front face turns out 30°, so that the side view shows the inner ear. |
| Snouts | short (a small muzzle low on the face, with the nose on its top), long 0.3 in front of the cheeks, pointed, with the nose on its tip and the fur color on its top, pointed 0.2 (a thin cone with a small nose at its tip, for the mouse and the meerkat), buck-teeth (the short muzzle, a little wider, with two front teeth of 0.1 × 0.2 H in `#f1ead9` below it, for the beaver), trunk 1.4 (3 bones, from 0.3 below the head center, with a tip that curls up), flat-nose 0.4 wide and 0.3 tall, horn 0.4, beak 0.2 in front of the cheeks. The tip of the trunk is the nose, so the trunk has no nose ball. The flat nose is a disc with two nostrils in the nose color. With the first width of 0.2, the disc was a small button, and the hippo looked like the pig. The horn stands on a large muzzle, and it is 0.26 wide at its base. The beak has an upper half on `head` and a lower half on `jaw`, so that the choir opens it (4.7). |
| Tails | puff 0.42 (a faceted ball, 1 bone), bushy 1.1, thin 0.7, flat 0.5 (2 bones). A tail of two bones leaves the body at the seat, goes back through the open back under the top rail of the chair, and hangs down. The puff sits low on the back, so that it shows at the seat in the back view, as in `animals.webp`. The bushy tail is a brush 0.54 wide, and the last 0.45 of its second bone has the belly color. It leaves the body 0.3 behind the axis of the torso, goes down and back, and hangs to 0.12 m above the floor, less steeply on a standing player. With 0.03 m, or with a tail of 1.4 that left the body at the back of the hips, the stands of the clarinets of the reference composition touched the tails of the foxes, and `S` became 6.71 to 6.76 m. The flat tail is a stalk and a paddle of 0.45 H wide. With 0.3 H, the chair hid it. |

A player that stands (the timpani, the percussion, the choir, and the conductor, 4.6) has short
straight legs. The base of its torso is 0.77 H above the floor, its thigh is 0.45 H, and the shin
reaches from the knee to the ankle at 0.1 H, so its feet rest on the floor. Its legs (the hip
height) are 30% of its height, and the bear is 1.63 m tall. In the reference image, the legs of
the bear are about 25% of its height. The first rule (the legs of a chair, straight down) made
them 41%, and the bear was 2.02 m tall (review of step 4, F3).

The `girth` of a species scales the width and the depth of the torso, the thickness of the arms
and the legs, and the distance of the shoulders and the hips from the middle. The head, the hands,
and the feet keep their sizes. The meerkat has the girth 0.75, so it looks thin and upright, and
it does not look like the dog (review of step 4, the weak species). The bear has the girth 1.15,
so it is the chunky pear of `animals.webp`. With 1.25, it was wider than the bear of the image.

On a chair, the body moves forward on the seat until it is 0.01 m in front of the back posts and
the top rail. The tail does not count, because it goes through the open back. The torso goes
through the back otherwise. Below the rail, the back is open, so the rabbit and most species
need no move. The move is 0.071 m at the size 1.35 and 0.114 m for the bear with its girth of 1.15.
A floor instrument, such as the cello, moves with the body.

**Facets and triangle budgets**

- A head is a loft of six rings with 8 corners (96 triangles). A limb is a faceted tube of 6
  sides (36 triangles): its middle ring turns by half a side and bulges to 1.1 of the mean
  radius, so the limb has triangle facets, as in `animals.webp`. A torso is a loft with 8 corners. The left half of a loft is the mirror image
  of its right half, facet by facet.
- A body has at most 1,200 triangles. An instrument has at most 500, except the piano (1,500) and
  the harp (800). A chair or the piano bench has at most 120, and a stand at most 80.
- The full scene with 60 players has at most 150,000 triangles.
- A Vitest test in `models/` checks these budgets.

**Props and stage**

| Item | Values |
|---|---|
| Chair | Seat height 0.35, seat 0.42 × 0.40, back top 0.85, four legs. The back is two posts and one wide top rail of 0.10, and it is open below the rail, as on the chairs of `animals.webp`. In that image the seat is 0.77 to 1.07 H high (mean 0.91 H), and the chair of 0.45 m was 1.18 H: the legs of the animals looked long. 0.35 m is 0.92 H. The thighs lie flat on the seat, and the feet rest on the floor |
| Stool | For the harp: a seat of 0.36 × 0.36 at 0.35, the height of a chair seat, four legs, no back |
| High stool | For the contrabass: a seat of 0.36 × 0.36 at 0.70, four legs, a foot ring at 0.35, no back. The feet rest on the ring, so the shin keeps the length that it has on a chair |
| Music stand | Tripod base, post, desk 0.50 × 0.35 at a height of 1.05, tilted 30° to the player, a white sheet |
| Podium | A box of 0.9 × 0.9 × 0.25 |
| Conductor stand | On the podium, in front of the conductor: a desk of 0.60 × 0.45 at a height of 1.10 above the podium top, with an open score. The post stands 0.35 m in front of the podium center (toward -z). The desk leans back 30°, as on a music stand. |
| Stage | A square slab of side `S`, 0.40 thick (stage origin, below). Planks are 0.20 wide and run from the front to the back, with a line of 0.012 between two planks. |
| Steps | Three treads below the stage top (rise 0.10, tread 0.30, width 1.0) at the front edge, 0.4 m to the left of the podium center, as in the reference. The front edge of the stage is the fourth rise. |
| Choir risers | Up to three levels, each 0.25 high and 0.8 deep (seat geometry, below). Each level is an arc block from the stage top to its height. The tops have the color of the stage top and the sides the color of the stage sides, as on the steps |
| Floor | A `ShadowMaterial` plane of `3 × S` at the bottom of the stage (y = -0.40), opacity 0.5. It shows only the shadows of the stage and the steps. The light on the floor is a separate disc (light and render). The floor writes no depth. With a depth write, the disc 1 mm above it failed the depth test in streaks in far views (review of step 4, F4). |

**Stage origin**

The world origin is the stage center, on the top of the stage. The axes are the right-handed
axes of Three.js: +x points to the right as the audience sees it, +y points up, and +z points to
the audience (the front).

1. Place the seats in arcs around the podium center (seat geometry, below), and place the piano.
2. Calculate the half width `L`: the largest `|x|` of a seat, plus 0.5 m for the chair and 0.3 m
   of margin. `L` is also at least the largest `|x|` of a footprint box (seat geometry, below),
   plus 0.3 m. The footprints hold the risers, the piano, and the wide instruments.
3. Calculate the front distance `F` from the front edge to the podium center: 1.0 m. With a
   piano, `F` is also at least the distance from the podium center to the front of the piano
   case, plus 0.3 m, so that the front edge stays 0.3 m in front of the piano case.
4. Calculate the depth `D`: `F`, plus the largest distance behind the podium (along -z) of a
   seat, plus 0.5 m for the chair and 0.3 m of margin. The footprint boxes count as in step 2.
5. The stage side is `S = max(5, 2 × L, D)`. The front edge stays `F` in front of the podium
   center, so any extra depth goes to the back.
6. Spread the instrumental rows inside the stage (seat geometry, below). `S` does not change.
7. Move all items so that the stage center is the origin. The podium center is then at
   `(0, 0, S / 2 - F)`.

The first values (`F` 1.6 m, a margin of 1.2 m, and `S` at least 7) left the stage of the
reference composition 1.2 times too large (review of step 3). The seat arc and the row step
stay, because they match the reference.

The composition of the reference image (section 1) gives `S = 6.6`: row 2 holds five players at
the radius 4.8, so `D = 1.0 + 4.8 + 0.5 + 0.3 = 6.6`, and `2 × L` is 5.3. A test of
`layoutScene()` pins this value. The app shows the layout of the selected demo, with all its
players, and the conductor on the podium.

The music stand of a string player stands 0.65 m in front of the row, between its seat and the
next seat on the right, because two string players share one stand. At 0.65 m, the back leg of a
stand keeps 0.1 m from the chair back of the row in front. At the first value 0.75 m, the gap was
0.015 m (review of step 3).

**Seat geometry**

The seats stand in arcs around the podium center. All players face the podium, except the
pianist. An angle of 0° points from the podium to the back (-z). Negative angles are on the left.
A seat at the angle `a` and the radius `r` is at `podium + (r × sin a, 0, -r × cos a)`.

- A seated player uses at least 0.95 m of arc, and a choir singer 0.60 m. The arc between two
  neighbors grows in steps of 0.02 m until their footprints keep 0.05 m apart, with their own
  stands and the stand between them. Thus the timpani (1.82 m wide) and the cellos with their
  shared stands get more arc.
- String players share one stand for each two players of a seat: the players 0 and 1, then 2
  and 3. The stand stands 0.65 m in front of the row, between the two seats. The last player of
  a seat with an odd count has its stand where a partner would share it, to its right.
- Woodwind and brass players have one stand each, in front of the player, 0.65 m from the row or
  further. The stand moves forward in steps of 0.02 m until it keeps 0.05 m from the player and
  its instrument. Thus the stand of a trombone stands in front of the slide.
- Row 0 holds the first violins to the left of 0° and the violas to the right, and each side
  spans at most 80°. Thus no player of row 0 sits behind the conductor, and the first violins sit
  at the front left (4.2), as the rabbits of the reference image. The other rows are centered on
  0° and span at most 160°. The sections of a row follow the order of the table, from left to
  right. These spans set the radius of a packed row. After the stage size, the spread (below)
  lets a row reach ±90°.
- Row `n` has the radius `r(n) = max(r(n - 1) + 1.2, width(n) / 2.79)`, where `width(n)` is the
  arc length that its players need and 2.79 is 160° in radians. In row 0, `width(n)` is two times
  the wider side. `r(-1)` is 1.2, so row 0 has a radius of at least 2.4. Thus a full row moves
  back until it fits into 160°. Then the row moves back in steps of 0.02 m until its footprints
  keep 0.05 m from the items in front: the rows in front, the piano, the podium, the conductor
  stand, and the conductor.
- The choir stands on risers behind the last instrumental row. Riser level `k` has the radius
  `r + 0.8 × k` and the height `0.25 × (k + 1)`, where `r` is 1.2 m more than the radius of the
  last instrumental row. The singers fill the levels evenly, and the lower levels get the extra
  singers. The layout tries one, two, and three levels, and keeps the count that gives the
  smallest stage side. Fewer levels win a tie. Thus the 32 singers of the Handel demo stand on
  three levels (11, 11, and 10), and `S` is 10.94 m. With level 0 filled first, `S` was 15.44 m
  (review of step 3, F13). If a level needs more than 160°, or if the risers touch the orchestra,
  all levels move back. Each level spans the angle of the widest level of singers.
- A row with no players drops out, and the rows behind it move forward.
- After the stage size, each instrumental row spreads inside the stage, from the front (stage
  origin, step 6). The packed rows end at ±43° to ±74°, so the front corners of the stage stayed
  empty: the near corner of the default view was 0.29 to 0.48 S from the nearest seat, against
  0.10 S in the reference image. The left side and the right side of a row each get a factor
  `k`. Each arc between two neighbors on that side, and the arc from 0° to the innermost seat,
  grows to `k` times its packed length, but to at most 1.6 m. An arc that is already longer
  stays, for example the 1.85 m of two contrabasses with their shared stand. With no seat at 0°,
  the innermost arc of a centered row grows to at most 0.8 m, because the innermost seat of the
  other side shares the 1.6 m. In row 0, the innermost arc is the gap of the conductor, and it
  has no limit. Thus row 0 keeps the first violins left of 0° and the violas right of it.
- `k` is the largest value, in steps of 0.02 down from 1.6 / 0.95, that keeps these limits:
  each seat stays within ±90°, each footprint box keeps 0.3 m from the side edges, the front
  edge, and the back edge, and each footprint keeps 0.05 m from the items of the other rows,
  the piano, the podium, and the conductor. The spread only makes the arcs of a row longer, so
  the items of one row stay apart. A check of the pairs of one row never acted in the test
  layouts or in 3,600 random layouts, so the layout has no such check, and the overlap test
  checks all pairs (review of step 4, P2). The left side spreads first. The choir and its risers keep their places.
  In the reference image, the seats reach ±90°, and two neighbors are 1.1 to 1.7 m apart.
- Thus the strings reach the side edges, as in the reference image. The near corner is 0.215 to
  0.305 S from the nearest seat for the six demos, and 0.154 S for `perf-60.mid`. A row that sets
  the width (`2 × L`) cannot spread, so the back corners of the width-bound demos stay empty.
  A rectangular stage would remove them, and 4.1 keeps the square stage (review of step 4, F1).

```typescript
/** The limits of the spread of a row. */
interface SpreadLimits {
  /** The largest angle of a seat from 0°, in radians: 90°. */
  readonly maxAngle: number;
  /** The largest arc between two neighbors of a row, in meters: 1.6. */
  readonly maxArc: number;
}
```

The **footprint** of a player is one box for the parts of each bone in each band of 0.2 m of
height, in the bind pose, and the box of its seat. Thus the ears of the elephant, a tilted
cello, and the kettles of the timpani each have their own boxes. A music stand has a box for each
leg, the post, and the desk. A riser level has a box for each part of 5° of its arc. The overlap
test of `models/` places the footprints of all items of each demo layout, with each section
size, and of the 60 players of `perf-60.mid` (9.5). No two items touch, and each item is on the
stage.

| Row | Sections, from left to right |
|---|---|
| 0 | violins (first seat), violas |
| 1 | violins (second and later seats), cellos |
| 2 | flutes, oboes, clarinets, bassoons, contrabasses |
| 3 | harp, percussion, timpani, horns, trumpets, trombones, tuba |
| 4 | choir, on the risers |

The piano stands outside the arcs. Its center (the center of the box around the case and the
open lid) is 2.0 m to the left of the podium center and 0.8 m toward the front. Its long axis
runs along x, with the keyboard at the left end. The pianist sits on the bench to the left of
the keyboard and faces +x, toward the conductor, as in a concerto. The conductor is ahead of the
pianist and a little to the left, and the audience sees the right side of the pianist. The lid
opens to the right of the pianist, to the audience. The pianist turns the head to the conductor
for cues.

### 4.6 Model inventory

| Section | Instrument model | How the player holds it | Seat |
|---|---|---|---|
| violin | violin and bow | under the chin on the left shoulder, bow in the right hand | chair |
| viola | the violin model at 1.15 scale | as the violin | chair |
| cello | cello and bow | between the knees, end pin on the floor | chair |
| contrabass | the cello model at 1.6 scale | at the left side, bow in the right hand | high stool |
| harp | concert harp | between the knees, both hands on the strings | stool |
| piano | grand piano (also for the celesta and the organs) | both hands on the keys | bench |
| flute | silver tube (also for the piccolo and other pipes) | horizontal, to the right | chair |
| oboe | thin dark tube with a small bell | in front of the mouth, 30° forward from the vertical | chair |
| clarinet | light tube with dark rings and a bell | in front of the mouth, 25° forward from the vertical | chair |
| bassoon | tall wooden tube with a bocal | diagonal across the body | chair |
| horn | coiled tube with a bell | in the lap, right hand in the bell | chair |
| trumpet | tube with a forward bell | horizontal, forward | chair |
| trombone | tube with a slide and a bell | forward; the slide moves with the pitch | chair |
| tuba | large tube with an upward bell | in the lap | chair |
| timpani | two to four kettles, by the pitch range of the file | two mallets | stands |
| percussion, bass drum player | bass drum on a stand | one beater | stands |
| percussion, snare drum player | snare drum on a stand | two sticks | stands |
| percussion, cymbals player | a pair of crash cymbals | one cymbal in each hand | stands |
| percussion, small percussion player | a triangle and a tambourine | the triangle and its beater for keys 80, 81, and all other keys; the tambourine for key 54 | stands |
| percussion, mallet seat (programs 9-15, 112-119) | xylophone | two mallets | stands |
| choir | a music folder | both hands | stands on the risers |
| conductor | baton | right hand | stands on the podium |

`castScore(score)` of `models/cast.ts` gives each player its species (4.3) and its instrument.
A drum player gets the instrument of the first key group that it plays, in the order of 3.8. The
key group of a note uses the first drum kit of its seat. The kettle count of the timpani comes
from the highest note of the timpani seat.

```typescript
/** The species and the instrument of one player. */
interface PlayerCast {
  /** The index of the seat in `Score.seats`. */
  seatIndex: number;
  /** 0 is the principal player of the seat. */
  player: number;
  species: SpeciesId;
  instrument: InstrumentId;
  /** The kettle count of the timpani. The other instruments ignore it. */
  kettles: 2 | 3 | 4;
}

/** Pure. One entry for each player, in the order of `ScenePose.players` (5.1). */
declare function castScore(score: Score): PlayerCast[];
```

The violin is 0.51 m long, with a body of 0.305 × 0.171 m. The bow is 0.57 m long. The values fit
the animals of the reference image.

- The violin and the bow keep the first model sizes of step 3 (violin 0.40 m, bow 0.45 m), which
  fit a rabbit with `H` 0.30 m. The builder scales them by the head height of the rabbit divided
  by 0.30: 1.27 at `H` 0.38 m. The table below gives the other instruments in meters at `H`
  0.38 m. A later change of `H` must scale them by the new `H` divided by 0.38. The chairs, the
  stands, the podium, and the steps keep their sizes in meters.
- The player holds the violin under the chin. Its tail end is 0.1 H to the left of the head
  center, 0.6 H below it, and 0.3 H in front of it. The violin points 70° to the left of the
  front and 8° down. Its top plate turns 50° from up to the front, so the audience sees it.
- The bow plays 0.14 m from the tail end, between the bridge and the fingerboard.

**Sizes and holds**

The hold gives the place of each piece in the bind pose of 4.7. An offset in `H` uses the head
height of the player. The model axes of 4.7 apply: the player faces -z, and its left is -x.

| Instrument | Size in meters | Hold in the bind pose |
|---|---|---|
| Violin | 0.51 long, body 0.305 × 0.171. Bow 0.57. | Under the chin (above). The bow lies in the hanging right hand, 0.07 H in front of the palm. It points to the left with the hair down. |
| Viola | The violin at 1.15 scale: 0.59 long. The violin bow. | As the violin. |
| Cello | 1.20 from the tail end to the scroll, body 0.72 × 0.41. End pin 0.20. Bow 0.63. | The end pin stands 0.42 H + 0.44 m in front of the seat center. The cello leans back 25° to the chest, with its top plate to the front. The bow as on the violin. |
| Contrabass | The cello at 1.6 scale: 1.92 to the scroll, end pin 0.32. The cello bow. | At the left side: the end pin stands 0.2 H + 0.25 m to the left and 0.5 H + 0.35 m in front of the seat center. The axis leans along (0.18, 1, 0.22), back and to the right, to the player. The top plate faces (0.35, 0, -1), the front and a little to the right. |
| Harp | 1.40 tall and 0.76 deep. 24 strings show the 47 strings of a concert harp, C1 to G7. | Between the knees: the base stands 0.15 H to the right of the seat center and 0.53 m in front of it. The harp leans back 12° to the right shoulder. The left hand plays from the left side of the strings, and the right hand from the right side. |
| Piano | A case of 1.40 × 2.0 from the front of the keys. The rim is 0.62 to 0.95 high, and the tops of the white keys are at 0.70. The 52 white keys fill 1.24. The lid opens 35° to the right of the player. | The front of the keys is 0.55 H + 0.05 m in front of the seat center. |
| Piano bench | A seat of 0.75 × 0.35 at 0.45, the first seat height of a chair. The white keys at 0.70 fit it, so the bench keeps it. | A static prop under the pianist, as a chair. |
| Choir folder | Two covers of 0.20 × 0.27, open 150°, with pages in the sheet music color. | In both hands, 1.0 H below the head center and 0.75 H in front of it. It leans back 35°, so that the pages face the eyes. |
| Flute | 0.57 long. | The hole of the lip plate is at the mouth. The flute points to the right, 10° to the front and 8° down. |
| Oboe | 0.55 long, with a small bell and metal keys. | The tip of the reed is at the mouth. The oboe hangs to the front, 30° from the vertical. |
| Clarinet | 0.57 long, with the dark mouthpiece, dark rings, and a bell. | The tip of the mouthpiece is at the mouth. The clarinet hangs to the front, 25° from the vertical, as in the reference image. |
| Bassoon | 1.15 long, with the boot, the wing joint, and the metal bocal. | The tip of the reed is at the mouth. The bassoon leans 35° to the left across the body, with the boot at the right hip. Its tube passes the left side of the head. |
| Horn | A coil 0.26 wide that leans back 20°, and a bell 0.26 wide. 0.59 from the mouthpiece to the bottom of the bell. | The mouthpiece is at the mouth. The coil stands low in front of the right side of the chest, with its middle 0.10 m in front of the mouth, and the bell opens to the right and to the back, near the right thigh. The right palm is in the bell, and the left palm is on the valves. With the coil middle 0.24 m in front of the mouth, the left palm was out of reach of the arm (1.16 of 97% of the reach, review of step 4). |
| Trumpet | 0.41 long, with three valves and a bell 0.10 wide. | The mouthpiece is at the mouth. The trumpet points forward and 5° down. |
| Trombone | 0.95 long when closed, with a bell 0.18 wide. The slide moves 0.55 from the first position to the seventh. | The mouthpiece is at the mouth. The slide points forward and 15° down, with the bell at its left. The slide is a second piece on the `slide` bone, and the right palm holds its brace. |
| Tuba | 0.95 tall, with a bell 0.42 wide that opens up. | The mouthpiece is at the mouth, 0.72 m above the bottom bow. The body stands in the lap, and the bell is at the left of the head. |
| Timpani | Two to four kettles, the largest first, with heads 0.57, 0.52, 0.46, and 0.41 wide at 0.72. These are 0.7 of the real 32, 29, 26, and 23 inch kettles. The kettles play D2 to A2, F2 to C3, B♭2 to F3, and D3 to A3. Two kettles when the highest timpani note is C3 or lower, three up to F3, else four. Four kettles fill 1.82 × 0.96. Mallets 0.30 with felt balls. | The kettles stand in an arc of radius 0.72 around the player, the largest at the left, with 0.06 between their corners. A mallet in each hand. |
| Bass drum | 0.70 wide and 0.32 deep, on a frame, with its top at 0.87. A beater of 0.32. | At the front left of the player, with its middle at (-0.22, 0.52, -0.42). Its right head turns 30° from the right side to the player. The beater is in the right hand. |
| Snare drum | 0.30 wide and 0.13 deep on a tripod, with the top head at 0.62. Sticks of 0.30. | 0.33 in front of the player. A stick in each hand. |
| Cymbals | Two crash cymbals 0.40 wide, each with a strap. | One cymbal in each hand, with the inner faces to each other. The model has no instrument piece. In the bind pose, the strap is 0.12 m above the palm, so that the rim stays above the floor. With the strap at the palm, the rim of the meerkat cut 0.08 m into the floor (review of step 4, P1). |
| Small percussion | A triangle with sides of 0.17, and a metal beater of 0.15. A tambourine 0.22 wide on a tripod, at 0.75. | The triangle hangs from the left hand, and the beater is in the right hand. In the bind pose, the triangle points forward from the hand, as a mallet does, because it hung 0.08 m into the floor. The tambourine stands at the front right of the player and leans 30° to the player. The right hand strikes it for key 54. |
| Xylophone | 30 bars from C5 to F7 at 0.72, on a frame with four legs. The natural bars are in the front row, 0.04 apart, and 0.30 to 0.17 long. The sharp bars are in the back row, 0.02 higher. 0.78 wide. Mallets of 0.30. | In front of the player, with the front edge of the bars 0.30 away. A mallet in each hand. |
| Baton | 0.40 long with the handle. | In the right hand. |

In the bind pose, each mallet, stick, beater, the triangle, and the baton lies in the hanging
hand, 0.07 H in front of the palm, and points forward. No vertex of a player model is below the
floor: a test checks each species with each instrument.

**Instrument data**

`models/instruments/` builds each instrument as pure data with no scene-graph object of Three.js
(7.1).
`buildInstrument(id)` gives an `InstrumentModel`:

```typescript
interface InstrumentModel {
  id: InstrumentId;
  /** The parent of the `instrument` bone: `chest` or `root` (4.7). */
  parent: 'chest' | 'root';
  /** The rigid pieces. The main piece is first. */
  pieces: readonly InstrumentPiece[];
  /** The palms, the mouth, and the chin, as points on the pieces. `null` if not used. */
  grips: { palmL: PiecePoint | null; palmR: PiecePoint | null; mouth: PiecePoint | null; chin: PiecePoint | null };
  /** The points and lines that the arms and the mallets aim at in step 5. */
  targets: readonly PlayTarget[];
  /** The size of the box around the main piece, in meters. */
  size: Vec3;
}

interface InstrumentPiece {
  /** One bone of 4.7: `instrument`, `slide`, `bow`, `malletL`, `malletR`, or `baton`. */
  bone: InstrumentBone;
  /** Corner lists with a color and a material group, in the piece axes, in meters. */
  parts: readonly InstrumentPart[];
  /** The place of the piece in the bind pose. */
  hold: {
    anchor: 'floor' | 'head' | 'mouth' | 'palmL' | 'palmR' | 'instrument';
    /** The offset from the anchor in head heights, then in meters. */
    offsetH: Vec3;
    offset: Vec3;
    rotation: Quat;
  };
}
```

- Each piece is rigid and follows one bone (4.4). The origin of the piece axes is the bind
  position of its bone. Thus step 5 turns a mallet around the palm, and a bow around its grip.
- `holdInstrument(model, body)` places the pieces on the points of one body: the head center,
  the mouth, the two palms, and the floor under the middle of the body. The anchor `instrument` puts a piece in
  the axes of the instrument piece, for the trombone slide. `attachInstrument()` also adds the
  parts to the mesh of the player and gives the bind position of each bone. Thus one function
  attaches each instrument to each species.
- A target is a point or a line on a piece, with the unit normal of its surface. A line that
  follows the pitch, such as the piano keys, also gives the MIDI keys at its two ends.
- The white keys of the piano and the natural bars of the xylophone are evenly spaced, so a
  pitch is not linear along their lines. `pianoKeyPosition(key)` and `xylophoneBarPosition(key)`
  give the point of each key and of each bar.
- The 24 strings of the harp show the 47 strings of a concert harp evenly. A pedal raises a
  string by a semitone, so a sharp plays on the string of the natural below it.
  `harpStringPosition(key)` gives the middle of the string of a key.
- `buildInstrument('timpani', kettles)` builds the largest kettles. `kettleCount(highestKey)`
  gives their number from the highest timpani note of the file.
- The trombone slide moves along its axis. A bone rotation cannot move it, so the pose has a
  move of the `slide` bone, `AnimalPose.slideOffset` (5.1), in addition to the rotations. The
  move follows the target `slide`.

### 4.7 Rig

Each player has one skeleton. A vertex follows exactly one bone (4.4).

```typescript
type BoneName =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  /** Opens for the choir. */
  | 'jaw'
  /** Scale on Y for blinks. */
  | 'eyeL' | 'eyeR'
  | 'earL' | 'earR'
  /** Only if the species has a tail. */
  | 'tail1' | 'tail2'
  /** Only for the elephant. */
  | 'trunk1' | 'trunk2' | 'trunk3'
  | 'shoulderL' | 'upperArmL' | 'forearmL' | 'handL' | 'fingersL'
  | 'shoulderR' | 'upperArmR' | 'forearmR' | 'handR' | 'fingersR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR'
  /** Parent: `chest` for the violin and viola, `root` for floor instruments, `chest` for winds and brass. */
  | 'instrument'
  /** Children of `handR` or `handL`, as the instrument needs. */
  | 'bow' | 'malletL' | 'malletR' | 'baton'
  /** Child of `instrument`, for the trombone. */
  | 'slide';
```

- The arms use analytic two-bone IK (upper arm and forearm). `poseAt()` calculates the hand
  targets on the instrument: the bow frog, the fingerboard position of the pitch, the keys, the
  mallet heads, and the piano keys.
- `fingersL` and `fingersR` curl as one block. On a wind instrument, they move on each note.
- The legs keep a seated or standing pose. The idle motion moves only the spine, the head, the
  ears, the eyes, and the tail.
- The conductor uses the same rig, with the baton in the right hand.
- The torso splits at the height of the `chest` bone. The lower part follows `spine`. The upper
  part follows `chest`, as the shoulders, the arms, and a violin do, so that a rotation of
  `chest` moves them together.
- Each skeleton has all bones of the list, so a bone has the same index in each player. A bone
  with no part, such as the trunk of a rabbit, moves nothing.
- In the bind pose, no bone has a rotation. The body sits on its seat: the thighs point forward,
  the shins hang down, and the arms hang down beside the body. The instrument is in its playing
  place on its bone, and the bow lies in the hanging right hand.
- Step 3 shows a static playing pose of the violin. The bow hair lies on the strings 0.18 m from
  the right hand, across the strings with its tip up. The left palm is under the neck. A
  two-bone solution places each arm, with the left elbow down and the right elbow down and out.
  `poseAt()` of step 5 replaces this pose.

## 5. Animation

### 5.1 Pose function

The pose of each animal is a **pure function** of its inputs. The app keeps no state that events
change. Thus seek, pause, and speed changes are always correct, and the animation cannot drift
from the audio.

```typescript
/** The play state. It changes only on play, pause, and stop. */
interface Transport {
  playing: boolean;
  /** Wall clock seconds of the last play, pause, or stop. `null` before the first play. */
  changedAtWall: number | null;
  /** Wall clock seconds of the change before the last one. `null` if there was none. */
  previousChangeAtWall: number | null;
}

/** The mute and solo result of one seat (6.6). */
interface SeatAudibility {
  audible: boolean;
  /** Wall clock seconds of the last change. */
  changedAtWall: number;
  /** Wall clock seconds of the change before the last one. `null` if there was none. */
  previousChangeAtWall: number | null;
}

/** The pose of one animal for one frame. */
interface AnimalPose {
  /** One quaternion (x, y, z, w) for each bone, in the order of `BoneName` (4.7). */
  rotations: Float32Array;
  /** The offset of the root bone, for the sway. */
  rootOffset: readonly [number, number, number];
  /**
   * The move of the `slide` bone from its bind place, in the axes of the `instrument` bone. It is
   * (0, 0, 0) for each instrument except the trombone (4.6). The scene adds it to the bind
   * position of the bone.
   */
  slideOffset: readonly [number, number, number];
  /** 0 is open eyes, 1 is closed eyes. The eye bones scale on y by `1 - blink`. */
  blink: number;
}

/** The poses of the scene for one frame. */
interface ScenePose {
  /** One entry for each player, in the order of the seats, then of the players in a seat. */
  players: AnimalPose[];
  conductor: AnimalPose;
}

/** A `ScenePose` with writable poses. `poseAt()` writes each frame into it. */
interface ScenePoseBuffer extends ScenePose {}

/** The data of one `Score` that each frame needs. `preparePoses()` makes it. */
interface PosePlan {
  /** The bind skeleton, the seeded values, and the note data of each player. */
  players: readonly PlayerPlan[];
  conductor: PlayerPlan;
  /** The times of `Score.beats`. */
  beats: Float64Array;
}

type Vec3 = readonly [number, number, number];

/** The positions of the scene for one `Score`. `models/` calculates it with `layoutScene()`. */
interface SceneLayout {
  /** The stage side `S`, in meters (4.5). */
  stageSide: number;
  podium: Vec3;
  /** One entry for each player, in the order of `ScenePose.players`. */
  players: readonly {
    position: Vec3;
    /** Radians around y. 0 faces -z (the back). */
    facing: number;
    support: 'chair' | 'stool' | 'high-stool' | 'bench' | 'stand' | 'riser';
    /** The species and the instrument of the player, from `castScore()` (4.6). */
    cast: PlayerCast;
  }[];
  stands: readonly { position: Vec3; facing: number }[];
  /** Each level is an arc centered on 0°, from `-halfAngle` to `halfAngle` (radians). */
  risers: readonly { level: number; radius: number; height: number; halfAngle: number }[];
}

/** Pure. Calculates the positions of 4.5 for a score. */
declare function layoutScene(score: Score): SceneLayout;

/**
 * Pure. Calculates the data of a score that each frame needs: the bind skeletons, the bow
 * strokes, the passages, the seeded offsets, and the looks at the conductor.
 */
declare function preparePoses(score: Score, layout: SceneLayout, seed: number): PosePlan;

/** Pure. Calculates the poses of all players and of the conductor. */
declare function poseAt(
  plan: PosePlan,
  songTime: number,
  wallTime: number,
  transport: Transport,
  /** One entry for each seat of `score.seats`. A missing entry sounds. */
  audibility: readonly SeatAudibility[],
  /** The poses to write in place, from `createScenePose(plan)`. A new buffer by default. */
  out?: ScenePoseBuffer,
): ScenePose;
```

`poseAt()` also calculates the IK targets of 4.7 and solves the arms, so the scene only copies
the rotations to the bones. The IK targets, the looks at the conductor, and the cues use the
positions of `layout`. The app calls `layoutScene()` and `preparePoses()` one time for each
`Score`. Then each frame only looks up the song time in sorted lists, and writes into one buffer.
Thus the poses of 60 players take much less than the 4 ms of the main thread (9.7).

The pose has three layers:

| Layer | Clock | Motion |
|---|---|---|
| Note | song time | Bow strokes, fingers, breath, mallets, hands (5.3) |
| Beat | song time | A small sway with the beat, and the conductor (5.4) |
| Idle | wall clock time | Breath, eye blinks, looks at the conductor |

The idle layer uses the wall clock time, so the animals stay alive while the music stops.

- **Motion families.** Each instrument has a motion family: `bowed`, `woodwind`, `brass`,
  `keyboard`, `harp`, `percussion`, `choir`, or `conductor`. Each family has its own note layer.
  A family with no note layer keeps the rest pose with the beat layer and the idle layer.
- **Beat layer.** A player sways the spine to the side, to one side on one beat and to the other
  side on the next beat: 2° for a gesture size of 1. It sways only in a passage: notes with rests
  shorter than 0.3 s. The sway starts 0.3 s before a passage and ends 1 s after it. The gesture
  size of a passage is `(0.6 + 0.6 × loudness) × amplitude`, with the highest loudness of its
  notes (5.3).
- **Idle layer.** Each animal breathes with a seeded period of 3.2 to 4.4 s: the spine turns
  0.6° and the chest 1°. It blinks once in each window of 4 s, at a seeded time, for 0.16 s.
  45% of the windows of 9 s hold a look at the conductor of 2.4 s, with turns of 0.4 s. The neck
  turns 40% of the look and the head 60%, at most 1.2 rad to the side and 0.5 rad up or down.
  40% of the windows of 6 s hold an ear twitch of 0.3 s and 12°. The tail sways 8° and 12° in
  5.5 s. A seeded time in a window of the wall clock needs no state.

### 5.2 Rest pose

- Before the first play, the players are in the rest pose. A real orchestra also lifts the
  instruments only when the music starts.
- 3 s after a pause or a stop, the players lower their instruments in 0.6 s.
- While `transport.changedAtWall` is `null`, the players stay in the rest pose.
- When play starts, the players lift their instruments in 0.3 s. The audio does not wait.
- A lift or a lowering starts from the height of the instruments at the change. Thus a play
  within 3 s of a pause keeps the instruments up. `transport.previousChangeAtWall` gives the time
  of the change before, and the pose function calculates the height at the change from it. It
  supposes that the instruments were up before a pause, and that they were down before the
  lift of a play.
- The rest pose comes from `transport`, so the pose function still keeps no state.

### 5.3 Instrument motion

- Bowed strings: the bow changes direction on each note. The bow speed comes from the note
  length. The left hand moves along the neck with the pitch.
- Pizzicato plucks the string. Tremolo makes short fast strokes.
- **Bowed strings in detail** (`pose/strokes.ts`, `pose/bowed.ts`):
  - Notes of a player that start within 50 ms of each other form one stroke, as a chord of 3.8.
    A note that still sounds at a new stroke joins it. Two pitches in a stroke are a double
    stop: the high note takes its string, the low note the string below, and the bow lies
    between the two strings.
  - A note takes the highest open string at or below its pitch. The open strings are G3 D4 A4 E5
    (violin), C3 G3 D4 A4 (viola), C2 G2 D3 A3 (cello), and E1 A1 D2 G2 (contrabass). The left
    palm moves along the target `fingerboard` with the string length: one octave is half of the
    string, and the end of the fingerboard is 20 semitones above the open string. The bow turns
    9° around the strings for each string (7° on the contrabass), to the bass side for a low
    string.
  - A stroke starts at its full speed and slows to a stop at its end, so the turn of the bow at
    the next note is sharp. Its length is `0.1 + 0.4 × duration` of the bow range, from 0.06 to
    0.8, times the gesture size. A rest of at least 0.5 s ends a phrase: the next stroke is a
    down-bow from 12% of the bow range, and the bow moves there in the rest.
  - In a rest, the bow lifts up to 0.03 m (fully after 0.4 s of rest) in at most 0.1 s, and lands
    in at most 0.15 s before the next note. The left hand and the string of the bow move to the
    next note in the last 0.1 s before it.
  - Tremolo strokes run at 7 cycles a second with an amplitude of 0.02 m times the gesture size.
    Pizzicato keeps the bow in the hand with its tip up. The right palm is 0.035 m above the
    strings and flicks 0.012 m across them in 0.06 s at the note start. Between two plucks, the
    finger goes back and rests on the string for up to 0.04 s. The change between the bow and
    pizzicato happens from 0.3 s to 0.05 s before the note.
  - The arms of the animals are a little short for their instruments (4.5). In the playing
    pose, the right shoulder bone turns forward (10° violin and cello, 30° viola and
    contrabass), the bow slants 20° from square in the plane of the strings with the frog to the
    right shoulder, and the cello and the contrabass players lean forward 15° and 20°. The bow
    range is the part of the hair that the arm reaches on all strings with 97% of its length.
    With the arms of 4.5, it is the full hair from 0.03 m after the frog to 0.03 m before the
    tip, on each of the four instruments. The first arms needed turns of 40°, 50°, 30°, and 50°,
    and still reached only 87% to 92% of the hair of the viola, the cello, and the contrabass.
  - The pizzicato hand plucks above the strings at 90% of the way from the end of the
    fingerboard to the bow contact on the violin and the viola, and at 30% on the cello and the
    contrabass.
  - In the rest pose, the violin and the viola turn down to the lap, with the scroll down and
    forward. The left hand keeps the neck, and the bow arm hangs. The cello and the contrabass
    stay on the floor.
- Woodwinds: the player breathes in before a phrase. The fingers move on each note.
- Brass: the player breathes in before a phrase. The trombone slide follows the pitch.
- **Woodwinds and brass in detail** (`pose/wind-notes.ts`, `pose/winds.ts`):
  - A wind instrument plays one note, but a seat at its cap can give one player two notes at a
    time (3.8). The player shows the last note that started. Of the notes that start within
    50 ms of each other (a chord), it shows the highest. Thus the tuba (cap 1) shows the top
    note of a chord, and a held note gives way to a new note.
  - The mouthpiece stays at the mouth while the player plays: the head and the instrument both
    follow the chest, and the look at the conductor does not turn the head. The palms stay on
    their grips, and the two-bone IK places each arm. The hand points from the shoulder to the
    grip. The elbows point down and out.
  - A rest of at least 0.5 s ends a phrase. The player breathes in during the 0.4 s before a
    phrase: the spine leans back by up to 3° times the amplitude of the player. It breathes out
    over the phrase, in at least 1 s.
  - The fingers follow the pitch, and they arrive at the note start after a move of at most
    60 ms. A woodwind player closes the holes with both hands: a low note of an octave closes
    both hands, and up the octave the right hand opens first, then the left hand. Thus each
    pitch class has its own hands. A brass player presses the valves with one hand (the left
    hand on the horn, the right hand on the trumpet and the tuba): none on a partial of the
    tube, and 1 to 3 valves for 1 to 6 semitones below it. The fundamentals are F2 (horn), B♭2
    (trumpet), B♭1 (trombone), and B♭0 (tuba). An open finger curls 15°, a closed finger 50°,
    and a hand that only holds the instrument 35°.
  - The trombone slide takes the position of the pitch: 1 on a partial of B♭1, and 1 more for
    each semitone below it, up to 7. It moves in at most 0.1 s, and arrives at the note start.
    No probable arm reaches the seventh position: the brace is 1.86 times the reach of the arm
    there (review of step 4). Thus the positions map evenly into the part of the travel that the
    right arm reaches with 97% of its length: position `p` moves the slide `(p - 1) / 6` of
    that part. For the pig, it is 0.13 m of the 0.55 m. The bodies of `animals.webp` put the
    mouth of the pig 0.03 m farther in front of the shoulder, so the part was 0.16 m before.
  - The right shoulder bone turns forward 20° on the oboe and the clarinet and 45° on the
    trombone, so that the right arm reaches the low hands of the oboe and the clarinet, and the
    slide. The long snout of the wolf puts the clarinet far in front of the chest. The horn coil
    stands near the player (4.6). With the arms of 4.5, each palm grip is then in reach with 97%
    of the arm length.
  - In the rest pose, the head lifts 12° off the mouthpiece, and the instrument turns down
    around the mouthpiece: the right end of the flute 45°, the trumpet 50°, and the trombone
    45°. The other winds keep their place, and the horn and the tuba stay in the lap. A pose
    has no move of the instrument bone, so the mouthpiece stays under the mouth. The palms keep
    their grips, the fingers relax to the hold curl, and the slide closes.
- Mallets and percussion: the mallet lifts before the note and strikes at the note start.
- Piano: the hands move to the key position. The left hand plays low notes and the right hand
  plays high notes.
- **Piano and harp in detail** (`pose/hand-notes.ts`, `pose/hands.ts`):
  - The notes of a player that start within 50 ms of each other form a chord. A chord wider than
    one octave splits at its largest interval: the left hand plays the notes below it, and the
    right hand the notes above it. Of two equal intervals, the one nearer to the middle of the
    chord splits it. A chord within one octave goes to the nearer hand, so that a melody stays in
    one hand. At the same distance, a chord from middle C up goes to the right hand. The hands
    start at C3 and C5.
  - A hand plays a chord at the middle of its lowest and its highest key. The piano keys do not
    move, because they are not separate meshes.
  - The piano palm faces down, 0.04 m above the keys and over the front edge of a white key. Over
    a black key, it is 0.06 m further in. The fingers curl 30°, down onto the keys. A hand moves
    to its next keys in at most 0.15 s and in at most 0.6 of the time from its last note. It
    lifts up to 0.03 m times the gesture size in the move, strikes the keys at the note start,
    and stays on them until its next move.
  - The harp palm is 0.03 m from the strings, at the middle of the string of its note: the left
    hand on the left side of the strings, and the right hand on the right side. The palm faces
    the strings. A hand moves to its next string in at most 0.15 s, and rests on it for up to
    0.04 s (at most 0.2 of the time from its last note). At the note start, it plucks: in up to
    0.08 s (at most 0.3 of the time to its next note), the palm pulls 0.025 m away from the
    strings times the gesture size, and the fingers curl from 15° to 60°. The hand comes back to
    the strings in the move to its next note.
  - The meerkat reaches the piano keys from G1 to D7, and the white key F1, with 97% of the arm
    length. For a key outside this range, the hand stops short of it at 97% of the reach, so that
    the elbow keeps its bend. The harp player leans forward 8°. Without the lean, the left palm
    on the lowest string needs 1.01 of 97% of the arm length. With it, it needs 0.965.
  - In the rest pose, the arms of the pianist and of the harp player hang, and the harp player
    sits up.
- Choir: the beak or mouth opens with each note, and the singer sways.
- The motion starts 100 to 400 ms before the note, by the action. This is possible because the
  app reads the full file first.
- Each player has a small seeded offset in timing (about 20 ms) and in amplitude. Thus players
  that play in unison do not move as copies. The timing offset is from -20 ms to 20 ms, and the
  amplitude from 0.85 to 1.15, both uniform from mulberry32 with the seed of the player. The
  note layer and the beat layer of a player run at the song time minus its offset.
- Each note event happens at the note start: a bow stroke starts, or a finger plucks. The motion
  before it (the landing of the bow, the retake, the shift of the hand, and the return of the
  finger) ends at the note start.
- The loudness for the size of a gesture is the velocity, multiplied by CC 7 (volume) and CC 11
  (expression), each as a part of 127. The controllers have their values at the start of the
  note, on the synth channel of the note. Before the first change, CC 7 is 100 and CC 11 is 127,
  as in General MIDI. CC 121 (reset all controllers) sets CC 11 back to 127. `pose/` reads the
  controllers from `Score.synthEvents`, so the sound and the gestures use the same events.
- Version 1 has no extra effects, for example no music-note particles and no light on the
  soloist.

### 5.4 Conductor

- The bear uses real beat patterns. The patterns come from the time signature events and the
  tempo map. The beat tempo is the count of beat units (the denominator of the time signature)
  for each minute. A MIDI tempo counts quarter notes, so the eighth tempo is two times the
  quarter tempo.

  | Time signature | Pattern |
  |---|---|
  | 2/x, 3/x | 1 (one beat in a bar) if the beat tempo is 168 or more, else 2 or 3 |
  | 4/x | 4 |
  | 6/8 | 2 (dotted beats) if the eighth tempo is 150 or more, else 6 |
  | 9/8, 12/8 | 3 or 4 (dotted beats) |
  | 6/4 | 2 if the quarter tempo is 150 or more, else 6 |
  | all others, for example 5/4 and 7/8 | `generic`: one down-up motion for each beat unit, larger on the downbeat |

  For example, demo 1 (2/4 at 192) uses pattern 1, and demo 3 (6/8 at an eighth tempo of 84)
  uses pattern 6.
- The first bar starts at tick 0. Each time signature event starts a new bar, also inside a bar.
  The tempo at the downbeat of a bar selects the pattern of the bar, so a tempo change can change
  the pattern at the next bar. The tempo is rounded to 0.01 BPM before the comparison, because a
  file stores whole microseconds: 168 BPM reads as 167.99997.
- The beats end before the last note-off (`Score.durationSec`).
- The size of the gestures follows the loudness of all notes.
- The left hand cues a section just before it plays again after a long rest. A long rest is at
  least two bars.
- If a file has no time signature or tempo events, the MIDI defaults apply: 4/4 at 120 BPM.

### 5.5 Silent seats

A muted seat, or a seat that a solo makes silent, rests: its instruments go down, and only the
idle motion continues. Thus what the user sees agrees with what the user hears. The instruments
go down in 0.6 s after the change, and come up in 0.3 s when the seat sounds again. The pose
function reads the change time from `SeatAudibility`. As in 5.2, a change starts from the height
of the instruments at the change, from `previousChangeAtWall`. A seat with no change sounds.

## 6. Audio

### 6.1 Engine

The app uses its own AudioWorklet processor. The processor bundles `spessasynth_core` and
`stb-vorbis` (both Apache-2.0). The app does not use `spessasynth_lib`.

- pnpm overrides pin `spessasynth_core` and `stb-vorbis` to exact versions.
- spessasynth_core contains the full synth, with reverb, chorus, and delay. The lib is only a thin
  wrapper around it.

The research rejected these options ([`research/audio-engines.md`](research/audio-engines.md),
[`research/audio-scheduling.md`](research/audio-scheduling.md)):

| Option | Reason for rejection |
|---|---|
| WebAudioFont | GPL-3.0, which conflicts with an MIT app. |
| gleitz sound sets | No loop points (each note is 3.1 s long), and the licenses conflict. |
| Tone.js Sampler | No loop point for each sample. |
| js-synthesizer | LGPL, 904 KB for SF3 support, and no mute API. |
| spessasynth_lib with our scheduler on the main thread | Queued events cannot be cancelled, so seek, pause, and mute act late, and a seek can play old notes. Safari aligns hidden-tab timers to 1 s. |
| spessasynth_lib with its sequencer | Seek does not restart held notes, and pause restarts all of them. A pause loses the pedal state. The main-thread clock can be wrong by up to 50 ms. |

### 6.2 SoundFont

- The SoundFont is GeneralUser GS 2.0.3 as SF3 (8.4 MB). The repository holds one copy at
  `assets/soundfont/GeneralUserGS.sf3`, with no Git LFS. `assets/soundfont/README.md` gives its
  source commit and its SHA-256.
- Its license permits use in software and permits our own copy. It asks us not to link to the
  download files of the author, so the site serves its own copy.
- A build script splits the SF3 into one file for each preset, at `sf/<bank>/<program>.sf3`. Drum
  kits use bank 128. The split keeps the Ogg data and the loop points.
- A usual orchestral file loads 1 to 3 MB of preset files.
- The credits panel names GeneralUser GS and links to its license (7.3).

- The split script also writes `sf/index.json`: one entry for each preset, with its bank, its
  program, its drum kit flag, its file, and its size. The app reads this index to find a preset,
  or its fallback in bank 0, before it fetches a file. The fallback of a drum kit is kit 0
  (bank 128, program 0). The `file` field is a path from the site root, such as `sf/0/40.sf3`.
- `tools/split-soundfont.ts` writes the files into `public/sf/`, which Git ignores. `pnpm dev`
  and `pnpm build` run it first (0.3 s). Thus the dev server serves the files, and the build
  copies them into `dist/sf/`.
- Each melodic preset keeps its bank MSB, so the GS variation banks also get files. The
  GeneralUser GS bank also holds the 13 drum kits at bank MSB 120 (XG and GM2). The split skips
  them, because the score asks for each drum kit in bank 128. The output has 274 files, 36 MB.

### 6.3 Load flow

The research measured the sample decode: it happens at the first note of each sample, on the
audio thread. One decode takes 0.64 ms (median) to 3.78 ms (max), but one audio block has only
2.67 ms. Thus the app decodes all samples before play.

```text
the file loads (demo 1: right after the first frame)
   │
   v
main thread: parse the file -> Score -> list of presets
   │ fetch each preset file that the synth does not have: sf/<bank>/<program>.sf3
   v
Web Worker: spessasynth_core converts each SF3 file to a PCM SF2 (no cache)
   │ transfer the PCM buffers (transferable objects, no copy)
   v
AudioWorklet: add the new banks (each add resets the synth) ── kept for the session
   │
   v
play is enabled
```

- The Worker works while the AudioContext is still suspended. Thus demo 1 is ready before the
  first click.
- The synth keeps each bank for the session, and the Worker keeps no copy. The `Player` asks the
  Worker only for the presets that the synth does not have. Thus a switch between demos that
  share presets does not fetch or decode them again, and each preset is in memory one time.
  After a failure, the new engine loads all presets of the next score again (6.8).
- A load that a later load replaces during its decode sends no banks to the synth. Thus the
  later load asks the Worker for the shared presets again, and they decode two times. The result
  is correct, and only the load time increases.
- The synth removes no bank during a session. Thus the PCM of a session has an upper limit of
  147.4 MB, when the session uses all 274 preset files. The melodic presets of bank 0 give
  52.6 MB of it. The memory target of 9.7 is for each demo.
- Each bank add resets the synth. Thus all banks load before play starts, and play waits for the
  load (2.4).
- Cost: core loads two times (in the Worker and in the worklet). This adds about 100 KB after the
  first frame.
- Cost: the PCM data uses 4 to 5 times more memory than the SF3 data, about 7 MB for a usual
  piece.
- Cost: the banks of all pieces of a session stay in the synth. After the six demos, the synth
  holds 20 presets in 12.2 MB of PCM (`audio/pcm-memory.test.ts`).

### 6.4 Block scheduler

The processor holds the full event list of the `Score`. It runs the scheduler inside each audio
block, so there is no queue to cancel and no timer.

```text
Main thread                           AudioWorklet thread (our processor)
┌──────────────────────────┐          ┌───────────────────────────────────┐
│ score/ -> synthEvents    │  one     │ event list (typed arrays)         │
│ (typed arrays, seat ids) │  time    │                                   │
│                          │─────────>│ each 128-frame block:             │
│ Player: play, pause,     │ commands │  1. apply transport commands      │
│ seek, rate, seat audible │─────────>│  2. send the events that are due  │
│                          │          │     (skip notes of silent seats)  │
│ now(): from the anchor   │ anchors  │  3. spessasynth_core renders      │
│ and the clock (6.7)      │<─────────│  4. post an anchor after a change │
└──────────────────────────┘          └───────────────────────────────────┘
```

In each 128-frame block (2.7 ms at 48 kHz), the processor does these steps:

1. Apply the transport commands: play, pause, seek, rate, volume, and seat audible flags.
2. Send the events that are due in this block to spessasynth_core. Skip the note ons of silent
   seats.
3. Render the block with spessasynth_core.
4. After a transport change, post a clock anchor (6.7). Also post one each second.

- The event selection for a block is a pure function. Vitest tests it.
- spessasynth_core also runs in Node, so tests can render audio offline.
- The processor makes all synth channels (`portCount * 16`) before the first event, and then
  resets the synth so that channel 10 of each port is a drum channel. An event for a channel that
  does not exist would stop the processor for good.
- Hidden tabs have no effect on the sound, because the processor uses no timers.
- In WebKit, the AudioWorklet thread has no real-time priority, and the real-time render thread
  waits for it in each block. On an idle Mac, Playwright WebKit lost about 0.8 s over demo 1,
  and an empty processor also lost time. One busy process on the Mac removed the loss
  ([`research/webkit-audio.md`](research/webkit-audio.md)). The cause is outside the app code.
- The `AudioContext` uses `latencyHint: 'interactive'`. WebKit ignores the hint, and a larger
  buffer adds latency in Chrome, where the first sound target (9.7) has a margin of 13 ms.
- The main thread packs the synth events into a `SynthEventTable`: one typed array for each
  field of `SynthEvent` (`Float64Array` times, `Uint16Array` channels, `Uint8Array` kinds and
  data bytes, `Int16Array` seats). It transfers the buffers to the processor with no copy.
- The `Score` has no port count. The processor makes `(floor(c / 16) + 1) * 16` channels, where
  `c` is the highest channel of the synth events.
- An event is due in the block that holds its song time, and it sounds from the start of that
  block. Thus a note sounds up to one block early, and never late. The Node test
  `audio/clock-render.test.ts` checks this rule at the rates 0.5, 1, and 1.5, and after a seek.
  The block of the first sound starts 0.96 to 127.68 frames before the note time. The test
  compares the block start, because the first sample of a voice can be exactly 0.
- The volume sets the master gain of spessasynth_core (the system parameter `gain`).
- A render error makes the processor silent for good. `process()` catches the error, posts an
  `error` message to the `Player`, and outputs silence in each later block. A throw from
  `process()` would stop the processor for good.
- `SynthEngine` (`audio/engine.ts`) holds spessasynth_core and the block scheduler with no Web
  Audio code, so the Node tests render it offline. The processor is a thin layer around it.

### 6.5 Seek, pause, resume, and unmute

- At a seek, the processor restores the program, the bank, the controllers, and the pitch bend at
  the seek point.
- A held note is a note that starts before the seek point and continues after it.
  - The processor starts held notes again for instruments with a long sound: bowed strings
    (also the fiddle), woodwinds (also the bagpipe and the shanai), brass, choir, organ, and the
    synth leads and pads.
  - It does not start held notes again for instruments with a sound that decays: piano, harp,
    guitars, pizzicato, mallets, percussion, and the synth effects.
- The same rule applies when play continues after a pause and when a seat is unmuted.
- A speed change takes effect at the next block.
- When the song plays to its end, the transport pauses at the song length. A play at the song
  length starts the song again from 0, with the chase of a seek.
- A seek releases all notes, resets the synth, and sends the chase: the program changes, bank
  select, data entry, RPN, NRPN, and CC 121 in their order, then the last value of each other
  controller, the pitch bend, and the channel pressure of each channel.
- The programs with a long sound are GM 16 to 23, 40 to 44, 48 to 54, 56 to 95, and 109 to
  111. A rhythm channel never starts held notes again. `sustainsAfterSeek()` in
  `score/program-map.ts` holds this program list, next to the program map. The block scheduler
  imports it, because both modules are pure.
- A held note that does not start again keeps its note off in the event list. The synth pairs
  note offs first in, first out, so the processor skips that note off. Else it would end a later
  note on the same key.

### 6.6 Mute and solo

- Mute and solo work for each seat, also when seats share a channel.
- The user can solo several seats at the same time.
- A seat sounds if it is not muted and one of these is true: no seat is soloed, or this seat is
  soloed.
- When a seat becomes silent, the processor sends note offs for its held notes at once.
- Mute and solo stay the same after a seek. They reset when a new file loads.

### 6.7 Clock

`Player.now()` gives the song time of the sound that the listener hears now.

- The processor posts a `ClockAnchor` when a transport change takes effect, and one time each
  second.
- `now()` uses the anchor and `AudioContext.getOutputTimestamp()`. By the spec,
  `getOutputTimestamp().contextTime` is the frame that the output device plays now, so it already
  includes the output latency. Do not subtract the latency from this value again.
- The spike (9.5) compares this value with `currentTime - outputLatency` (or `baseLatency` if
  `outputLatency` is 0) in Chrome, Firefox, and Safari. If `getOutputTimestamp()` does not include
  the latency in a browser, the app uses the second value in that browser.
- The spike measured the two methods on 2026-10-04
  ([`research/audio-spike.md`](research/audio-spike.md)). In Chrome 154, they agree within 2 ms.
  In Firefox 150, the timestamp method is 23 ms later, which is the output latency. Gecko
  calculates `contextTime` as `currentTime - outputLatency` and moves `performanceTime` back by
  the same latency, so the extrapolation to now gives `currentTime`.
- `now()` therefore uses the second value when the timestamp method is later than it by more
  than half of the output latency (`chooseHeardTime()` in `audio/clock.ts`). This rule finds the
  browser from the values, with no check of the browser name.
- With Bluetooth headphones, the latency is often more than 100 ms. Thus the correct clock is
  necessary for the sync of the animation.
- The `Player` keeps each anchor that can still be in effect (`addAnchor()` in
  `audio/clock.ts`). The heard time is never more than 1 s before the newest anchor, because
  1 s is more than the largest output latency. Thus the `Player` removes an anchor when a later
  anchor has a context time at or before the newest anchor minus 1 s. A drag of the seek bar
  can put many anchors in the latency window, and the anchor in effect stays in the list.

### 6.8 Interfaces

```typescript
interface Player {
  /** Loads the engine on the first call, then the presets of the score. */
  load(score: Score, onProgress: (done: number, total: number) => void): Promise<void>;
  play(): void;
  pause(): void;
  seek(songSec: number): void;
  setRate(rate: number): void;
  setVolume(gain: number): void;
  /** The app calculates this value from the mute and solo rules (6.6). */
  setSeatAudible(seatIndex: number, audible: boolean): void;
  /** Song seconds of the sound that the listener hears now (6.7). Smooth between blocks. */
  now(): number;
}

/** The processor sends this when a transport change takes effect, and one time each second. */
interface ClockAnchor {
  /** AudioContext seconds at the start of the block where the change took effect. */
  contextTime: number;
  /** Song seconds at that block start. */
  songTime: number;
  /** Playback rate. 0 while paused. */
  rate: number;
}
```

- `load()` takes a `PlayerScore`: `Pick<Score, 'durationSec' | 'synthEvents' | 'presets'>`.
  The app passes its `Score`.
- `WorkletPlayer` implements the interface. It also gives the values that the spike page shows:
  `context`, `anchors`, `renderStats`, and `pcmBytes`. The spike page calculates the two heard
  times of 6.7 from `context` with the functions of `audio/clock.ts`.
- `now()` uses `getOutputTimestamp()` while its `contextTime` is above 0. Before the context
  runs, it uses the second method of 6.7. It also uses the second method when the timestamp
  has no output latency (6.7).
- `now()` uses the last anchor at or before the heard context time. Thus after a seek, the old
  anchor stays in effect until the listener hears the block of the seek.
- The `WorkletPlayer` keeps the last rate and the last volume, and sends them after each score.
  Thus a saved volume that the app sets before the first load takes effect. A play, a pause, or
  a seek before `load()` resolves has no effect on the new score.
- These failures end the engine: a failed start (the fetch of `sf/index.json` or
  `addModule()`), an `error` or `messageerror` event of the Worker, a `processorerror` event,
  and an `error` message of the processor (6.4). The `Player` disconnects the node, ends the
  Worker, and stops the clock at its song time. Commands do nothing until the next load.
- The next `load()` after a failure starts a new engine, so the "Try again" button of 2.8 can
  succeed. A pending load rejects with the error. If no load is pending, the `WorkletPlayer`
  gives the error to the `onError` function of its constructor:
  `new WorkletPlayer(baseUrl, onError)`.
- `play()` resumes the context. Safari and iOS can reject the resume outside a user gesture. The
  `WorkletPlayer` gives a rejected resume to `onError`.
- A later `load()` replaces a pending `load()`, because a new selection stops the current piece
  (2.2). The promise of the earlier load rejects at once with a `LoadReplacedError`, and the app
  ignores this error. The earlier load sends nothing more to the processor, and its progress
  function gets no more calls.
- The processor answers each `banks` message with one `ready` message, in order. The `Player`
  keeps a queue of the pending `ready` replies. Thus a load resolves only after its own banks are
  in the synth.

## 7. Architecture

### 7.1 Modules

The stack is Three.js, TypeScript, and Vite, with pnpm. There is no UI framework, because the UI
is small. The audio module is behind the small `Player` interface (6.8), so a change inside it
does not change the other modules.

```text
first download                                lazy, after the first frame
┌────────┐    ┌─────────┐    ┌────────┐       ┌─────────────────────────────┐
│ midi/  │───>│ score/  │───>│ pose/  │       │ audio/: Player              │
│ (pure) │    │ (pure)  │    │ (pure) │       │ Worker: SF3 to PCM SF2      │
└────────┘    └────┬────┘    └───┬────┘       │ worklet: spessasynth_core   │
                   │             │            │ and the block scheduler     │
                   │             v            └──────────────┬──────────────┘
                   │         ┌────────┐                      │
                   │         │ scene/ │<── models/ (pure)    │ Player
                   │         └───┬────┘                      │
                   │             │                           │
                   v             v                           v
              ┌──────────────────────────────────────────────────────┐
              │ app/ and ui/: load flow, transport, seat list, hash  │
              └──────────────────────────────────────────────────────┘
```

| Module | Job | Pure | Loads |
|---|---|---|---|
| `midi/` | Parse the bytes of a Standard MIDI File into tracks of events in ticks. | yes | first download |
| `score/` | Apply the rules of section 3, and build the `Score` with `buildScore()` (3.2). | yes | first download |
| `pose/` | `poseAt()` (5.1). | yes | first download |
| `models/` | Species parameters, the mesh generator, and `layoutScene()`. It gives geometry data and positions. | yes | first download |
| `scene/` | Three.js: stage, lights, camera, quality tiers, poses applied to bones. | no | first download |
| `audio/` | The `Player`, the Worker, and the worklet processor. | no (the block scheduler is pure) | lazy |
| `app/`, `ui/` | Load flow, transport, seat list, URL hash, settings. | no | first download |
| `tools/` | Build scripts: SF3 split, demo changes, size check, license file. | no | build only |

A pure module gets all inputs as arguments, reads no clock, uses only seeded randomness, and
touches no DOM. It can use the math classes of Three.js: `Vector3`, `Quaternion`, `Matrix4`, and
the other classes of `three/src/math/`. These classes are plain JavaScript with no DOM. They run
in Node, and Three.js is already in the first download. A pure module uses no scene-graph object
of Three.js: no `Object3D`, `Mesh`, `Bone`, `SkinnedMesh`, geometry, material, or renderer. The
data that a pure module returns stays plain: typed arrays, tuples, or plain objects. Thus a test
can compare it, and `poseAt()` stays stateless (5.1). The user made this decision on 2026-10-05.

A second entry, `gallery.html`, shows each species with the instrument of its section, and each
instrument alone. It has a time slider and
a test note list, so that a person can examine the models and the motion with no MIDI file. The
gallery is deployed. It is a separate entry, so it does not add to the first download of the
player.

- The query `?page=species` shows each species with each instrument of its section, on its
  seat, and then the bear with the baton. The query `?page=instruments` shows each instrument
  alone. Its pieces keep their places in the hands of the first species of the section, and the
  instrument rests on the floor.
- The models stand in rows, and the camera looks down at them at 35°. A model hides the floor
  behind it for its height / tan 35°, so the gap in front of a row is at least the height of the
  tallest model of the next row / tan 35°, and at least 0.8 m. With a fixed gap of 0.8 m, the
  bear hid the badger and the timpani hid the bases of the oboe and the clarinet. The pianist
  faces +x, as on the stage, so that the camera sees it beside the piano. Facing the camera, the
  piano lid hid it (review of step 4, F2).
- A label under each model of the species page has two lines: the species and the instrument.
  The gap in front of a row also holds 0.5 m of floor for the labels of the row behind it. With
  labels of one line and no such floor, two labels of the last row touched (review of step 4,
  P4).
- Each line of the test note list holds a start and a length in seconds, and a key, for example
  `1.5 0.5 C5`. Until `poseAt()` of step 5 exists, the violins and the violas show the violin
  pose of step 3 while a note sounds, and all other models show the bind pose.
- The gallery renders at the high tier with the shadow radius 1. In a close view, the radius 3
  shows the noise of `PCFShadowMap` as a fine grid on each lit face, and the radius 1 halves it
  (review of step 3, F11). At the default distance of the stage, the grid is smaller than a
  pixel.

A third entry, `views.html`, shows the animals as `docs/reference/animals.webp` does, so that a
person can put the two images side by side. It is 1024 × 1024 px, with the three rows, the
places, and the labels of the reference: the rabbit with a violin and with a clarinet, the red
fox with a violin and with a clarinet and a music stand, then the wolf with a clarinet, the bear
on the podium with the conductor stand, and the panda with a cello. Each model shows its
front, its right side, and its back. The camera is orthographic and looks down at 8°. Each model
fills the height of its row, as in the reference.

- The page has its own studio light: a key light `#fff8f0` of 3.4 from the front, above, and a
  little to the left, a fill light of 1.3 (sky `#ffffff`, ground `#3a3632`), a rim light of 1.5
  from behind, and the neutral tone mapping. The light of the stage center made the colors about
  13% darker than in `animals.webp`, and ACES Filmic moved the orange of the fox to yellow. The
  stage keeps its own light.
- The bowed strings show the pose of `poseAt()` (5.1) at 0.4 of their first note in the Beethoven
  demo, with the head to the front. The hands of a wind player hold the grips of the instrument
  with bent elbows, until the winds of step 5 give their pose. The bear raises the baton beside
  its head.
- The music stand of the fox with a clarinet stands 0.7 m in front of the seat at 0.45 of its
  height, under the instrument, as in the reference. The podium of the bear turns, so that the
  conductor stand is at the left side of the bear. The stage keeps the stand of 4.5 in front of
  the bear.

`pnpm screenshots` saves the page as `animals-views.webp`.

The entry `spike.html` is the audio spike of step 1 (9.5). It builds the `Score` of the changed
demo 1 (8.3) with `buildScore()`, plays it with the `Player`, and shows the values of the step 1 checks as text with stable element ids. `window.spike` holds
the same values and the functions `play()`, `pause()`, and `seek()`, for automation. It is a
separate entry, so it does not add to the first download.

### 7.2 First download

The size check sums the gzip sizes of these files:

- `index.html`.
- The CSS.
- The entry JS chunk, with all its static imports.
- The demo 1 MIDI file (14 KB after gzip).

The check does not count the audio chunk, the Worker, the worklet, the SF3 files, `gallery.html`
and its chunks, and the other demo files. The app loads the other demos when the user selects
them.

- The limit is 1 MB (1,000,000 bytes). CI fails above the limit and prints the size on each run.
- `pnpm size` runs `tools/size.ts` after the build. The script finds the static imports of the
  entry chunk in the Vite manifest, and gzips each file with the default level of Node zlib.
  It also counts each script and stylesheet that `index.html` loads. With several entries,
  Vite puts its module preload polyfill into a shared chunk that the manifest entry does not
  import.
- The site holds demo 1 at `demos/beethoven-5.mid`. The build writes it to
  `dist/demos/beethoven-5.mid` (8.3), and the check counts that file. With no such file, the
  check counts `demos/src/beethoven-5.mid`.
- The estimate is about 250 KB: about 150 KB for Three.js, 80 KB for our code, and the demo file.
  Nobody has measured these values yet.

### 7.3 Third-party licenses

The build writes a third-party license file for Three.js (MIT), spessasynth_core (Apache-2.0),
stb-vorbis (Apache-2.0), and GeneralUser GS. The credits panel links to it, and also lists the
source of each demo (8.1).

`pnpm build` runs `tools/licenses.ts` after the Vite build. The script writes
`dist/third-party-licenses.txt` from the license file of each installed package of this list,
and from `assets/soundfont/LICENSE.txt`. It fails when a package in `dependencies` is not in
the list, and when a package of the list is not installed.

## 8. Demos

### 8.1 License rules

- The composition must be in the public domain.
- The MIDI file or the score must also have its own clear license: public domain, CC0, or CC BY
  with a credit line in the app. A MIDI sequence of a public domain composition can still belong
  to the person who made the sequence.
- A score on musescore.com is "all rights reserved" unless its page shows a different license.
- The Mutopia Project has pieces with public domain, CC BY, and CC BY-SA licenses. Use only the
  public domain and CC BY pieces.
- OpenScore scores are CC0, but their annotations are CC BY-SA and are stored as lyrics. Remove
  the lyrics before the repository gets the file.
- The credits panel lists the source of each demo, also when the license does not require a
  credit.

The candidates and their licenses are in [`research/midi-sources.md`](research/midi-sources.md).

### 8.2 List

| # | Hash id | Piece | Source | License | Length | What it shows |
|---|---|---|---|---|---|---|
| 1 | `beethoven-5` | Beethoven, Symphony 5, mvt 1 | Mutopia 941 | public domain | 5:16 | Full orchestra, horns, trumpets, timpani |
| 2 | `grieg-ase` | Grieg, Åse's Death | Mutopia 247 | public domain | 3:36 | String orchestra |
| 3 | `mozart-k488` | Mozart, Piano Concerto 23, mvt 2 | Mutopia 2229 | public domain | 7:01 | Piano, woodwinds, horns, pizzicato |
| 4 | `mozart-k315` | Mozart, Andante K. 315 | Mutopia 344 | public domain | 4:15 | Solo flute |
| 5 | `handel-hallelujah` | Handel, Hallelujah | Mutopia 459 | public domain | 3:08 | Choir, trumpets, timpani |
| 6 | `boulanger-matin` | Boulanger, D'un matin de printemps | OpenScore | CC0 | 4:40 | Percussion, harp, celesta, trombones, tuba |

- The length is `durationSec` (the last note-off), shown as `Math.floor(durationSec + 0.001)`
  seconds. For example, K. 315 ends at 254.9998 s, because the file rounds a tempo of 46 to
  1,304,347 µs for each quarter note. It shows as 4:15.
- The rule for the length was 2 to 5 minutes. Rows 1 and 3 are accepted exceptions.
- Demo 1 is the first screen (2.2). All demos use the section size "Auto".

**Texts**

| Hash id | Title | Title in the demo list | Composer | Credit line |
|---|---|---|---|---|
| `beethoven-5` | Symphony No. 5, first movement | Symphony No. 5, mvt 1 | Ludwig van Beethoven | Score: Mutopia Project, piece 941, public domain. Typeset by Stelios Samelis, adapted by Johannes Heinecke. |
| `grieg-ase` | Peer Gynt Suite No. 1: Åse's Death | Åse's Death | Edvard Grieg | Score: Mutopia Project, piece 247, public domain. Typeset by Deborah Lowrey. |
| `mozart-k488` | Piano Concerto No. 23, second movement | Piano Concerto No. 23, mvt 2 | Wolfgang Amadeus Mozart | Score: Mutopia Project, piece 2229, public domain. Typeset by William Chargin. |
| `mozart-k315` | Andante in C for flute and orchestra | Andante in C, K. 315 | Wolfgang Amadeus Mozart | Score: Mutopia Project, piece 344, public domain. Typeset by Maurizio Tomasi. |
| `handel-hallelujah` | Messiah: Hallelujah | Hallelujah | George Frideric Handel | Score: Mutopia Project, piece 459, public domain. Typeset by Joshua Koo. |
| `boulanger-matin` | D'un matin de printemps | D'un matin de printemps | Lili Boulanger | Score: OpenScore Orchestra, CC0. MIDI file made with MuseScore 4. |

For a dropped file, the title is `Score.sequenceName` if it is not ''. Else the title is the
file name with no extension. `score/` gives '' for a name with no letter and for a generic name
(`titleSequenceName()` in `score/sequence-name.ts`). The generic names, in any case, are
"control track" (LilyPond writes it), "conductor" (MuseScore writes it), "untitled",
"sequence", and "track" with a number, with or without one space before the number. The first
track of each demo has a generic name. The second line shows the file name. A dropped file has
no credit line.

**Expected sections**

| Hash id | Sections (the number of seats, if more than one) |
|---|---|
| `beethoven-5` | flute, oboe, clarinet, bassoon, horn, trumpet, timpani, violin (2), viola, cello, contrabass |
| `grieg-ase` | violin (2), viola, cello, contrabass |
| `mozart-k488` | flute, clarinet, bassoon, horn, piano, violin (2), viola, cello |
| `mozart-k315` | flute, oboe, horn, violin (2), viola, cello |
| `handel-hallelujah` | oboe, bassoon, trumpet, timpani, violin (2), viola, cello, choir (4) |
| `boulanger-matin` | flute, oboe, clarinet, bassoon, horn, trumpet, trombone, tuba, piano (the celesta), percussion, harp, violin (2), viola, cello, contrabass |

### 8.3 Changes to the files

Some Mutopia files have wrong programs. The app repairs them at build time:

- Demo 1: the horn track (5) and the trumpet track (6) use program 69 (English horn). They
  change to 60 and 56.
- Demo 5: the four choir tracks (9 to 12) use woodwind programs. They change to 52 (Choir Aahs).

Each change names a track by its index. A change by program cannot work here: the Hallelujah file
has a real oboe and a real bassoon, and its choir tracks also use the oboe and bassoon programs.

- `demos/src/` holds the input files. The five Mutopia files are unchanged downloads.
- `demos/patches.json` holds the changes. `demos/README.md` gives the reason for each one, the
  sources, the licenses, the typesetters, and the SHA-256 of each file.
- A build script writes the changed files. A Vitest test checks the programs in each result.
- `tools/patch-demos.ts` checks the SHA-256 of each file in `demos/src/` against
  `demos/README.md`. Then it applies the changes, and writes all six files into `public/demos/`,
  which Git ignores. `pnpm dev` and `pnpm build` run it first. Thus the site holds each demo at
  `demos/<file>`, as 7.2 gives for demo 1.
- The demo tests (8.5) apply the same changes in memory, so they do not need a build.

```typescript
interface DemoPatch {
  /** File name in demos/src/. */
  file: string;
  /** Sets the program of all program changes in one track. The index starts at 0. */
  setProgram: { track: number; program: number }[];
}
```

### 8.4 The Boulanger file

The default MuseScore export of this score is not usable:

- It ignores the "pizz." and "arco" marks. Only 92 of about 499 pizzicato notes play pizzicato.
- One viola part plays 1471 of its 1473 notes as Tremolo Strings.
- Each solo and divisi staff is a separate part. With the port rule, each becomes a seat with a
  base section size, which gives about 72 players. The cap is 60.
- It writes the CC BY-SA annotations as lyric events.

A pipeline makes a 16-channel file instead
([`research/musescore-export.md`](research/musescore-export.md)):

```text
score with the lyrics removed (CC0 only)
   │ remap_score.py unique    each part on its own port, articulation k on channel k
   v
   │ add_switches.py          channel switches at the "pizz." and "arco" marks
   v
   │ mscore -o out.mid        MuseScore 4 CLI (the pipeline checks the output file)
   v
   │ remap_midi.py            one channel for each section group, program changes at switches
   v
the 16-channel demo file
```

- One channel for each section group: Violin 1 with its divisi and solo parts, Violin 2 with its
  parts, and so on. The divisi staves thus become one seat with divisi (3.8), as a real section
  does. There are 15 melodic channels, and channel 10 has the Orchestral kit (kit 48).
- Each part uses the program of its group. For example, the piccolo plays as a flute and the
  English horn plays as an oboe.
- The check of the result: 12,139 note attacks, 0 missed, and 0 s of lost sound. 15 notes have
  the wrong program. Unisons between parts become one note. CC 2 is removed, and the velocity
  keeps the dynamics.
- The MuseScore CLI crashes after it writes the file in most runs (exit code 134). Thus the
  pipeline checks the output file and ignores the exit code.

The repository holds these files:

- `demos/boulanger/matin-nolyrics.mscz`: the score with all lyrics removed (CC0 only).
- `tools/musescore/`: the pipeline scripts (Python, standard library only), with the fix of
  `remap_midi.py` that `demos/README.md` describes. The copies in
  `docs/research/scripts/musescore/` are the record of the first version.
- `demos/src/boulanger-matin.mid`: the result.

`demos/README.md` gives the pipeline as commands. A run from the committed score gives a
byte-identical file. CI does not run MuseScore.

### 8.5 Demo tests

A Vitest test builds the `Score` of each demo, after the changes of 8.3, and checks three
things:

- The demo has no more than 60 players.
- The sections and the seat counts are exactly those of the table "Expected sections" (8.2).
- No seat comes from a wrong program: there is no seat in another section, and no sound-only
  seat.

## 9. Process

### 9.1 Repository

- Git, with the branch `main`. Each step of the work has many fine-grained commits.
- The code license is MIT.
- The user creates the empty GitHub repository `zoophony` (or installs `gh`) before the first deploy. Until
  then, all commits stay local.

### 9.2 CI

GitHub Actions runs these checks:

| Check | Blocks a merge |
|---|---|
| Type check | yes |
| Oxlint, with `.oxlintrc.json` and the anti-slop plugin in `tools/oxlint/anti-slop/` | yes |
| oxfmt format check | yes |
| Vitest | yes |
| Size check (7.2) | yes |
| Playwright in Chromium | yes |
| Playwright in WebKit and Firefox | no, until the runs are stable |

Headless WebKit and Firefox on Linux have weak support for WebGL2 and for audio output. Thus their
runs do not block a merge.

A push to `main` builds with pnpm and deploys to GitHub Pages. Vite uses the repository name
(`zoophony`) as its base path.

### 9.3 Tests

- Vitest tests the pure modules: `midi/`, `score/`, `pose/`, `models/`, and the block scheduler.
  The tests cover all rules of section 3.
- Node tests render audio offline with spessasynth_core.
- The demo tests of 8.3 and 8.5.
- The Playwright smoke test does these steps:
  1. Load the page.
  2. Play demo 1 for 3 seconds, with the autoplay policy turned off.
  3. Make sure that the song time increases, that the canvas is not empty, and that the console
     shows no errors.

### 9.4 Manual test before each release

- Real Safari on macOS.
- Real Safari on iOS, also with the silent switch on (2.4).
- Android Chrome.

The author of spessasynth does not test on Safari, so this manual test is necessary.

### 9.5 Order of work

The steps put the largest risks first. Each step has its work and a "done" criterion. A step is
done only when its criterion is true. A step with a review is done only after the review agent
approves it (9.8). [`../TODO.md`](../TODO.md) splits each step into tasks, and it holds the status of the
work.

**Step 0. Project skeleton**

- Work: Vite, TypeScript with the compiler options of `AGENTS.md`, Vitest, Oxlint, oxfmt, the size
  check, the third-party license file, and the CI workflow. `.oxlintrc.json`, `.oxfmtrc.json`, and
  the anti-slop plugin are already in the repository. Install these development dependencies:
  the current version of `oxlint`, the same version of `@oxlint/plugins`, and the current
  version of `oxlint-tsgolint`, which the type-aware rules need.
- `pnpm lint` runs `oxlint --type-aware .`. `pnpm format` and `pnpm format:check` run oxfmt on
  explicit paths: `src`, the root config files, and the TypeScript files of `tools/` outside
  `tools/oxlint/`. The anti-slop plugin keeps its own style (tabs and double quotes), so oxfmt
  does not format it.
- Done when: a clean clone runs `pnpm install`, then `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm format:check`, `pnpm build`, and `pnpm size` with no error. CI runs the same commands.
  `pnpm dev` shows an empty page with the background gradient of 4.5.

**Step 1. Audio spike**

- Work: the worklet with spessasynth_core, the Worker decode, the SF3 split, and demo 1 in a bare
  page. The spike may use the MIDI parser of spessasynth_core to make the events of demo 1.
  Step 2 replaces it with `midi/` and `score/`, and then measures the targets for each demo. The
  spike checks these items:
  - Vite can bundle the worklet and the Worker.
  - There is no dropout at the first note of a sample after the Worker decode.
  - The clock (6.7) in Chrome, Firefox, and Safari.
  - A suspended AudioContext delivers messages to the worklet. If it does not, the banks go to
    the worklet at the first click.
  - The behavior in Safari and in a hidden tab.
- Done when: the spike page plays demo 1 to the end in Chrome, Firefox, and Safari on the
  development Mac with no dropout. The targets of step 1 in 9.7 pass. A new report in
  `docs/research/` gives the result of each check, or the reason for each miss.
- Review: the review agent reads the report.

**Step 2. MIDI and score**

- Work: `midi/` and `score/`, and the script that applies `demos/patches.json` (8.3). The demo
  tests need the changed files.
- Done when: each rule of section 3 has at least one Vitest test that fails without the rule. The
  demo tests of 8.5 pass for all six demos. The step 2 targets of 9.7 pass: the score build, the
  audio render, and the memory.

**Step 3. Scene and one player**

- Work: the stage, the light, the beam, the camera, and one rabbit with a violin. The bow moves
  in sync with the first violins of demo 1.
- Done when: a screenshot of the default view at 1440 × 900 has the same composition as the
  reference: the stage as a diamond shape, the beam from above, the dark background, and the
  view from behind the conductor. The clock target of 9.7 passes.
- Review: the review agent compares the screenshot with the reference.

**Step 4. Models and gallery**

- Work: `models/` for all species and instruments of 4.3, 4.5, and 4.6, the gallery page, and
  the scene layout: the stage origin, the stage size, the seat geometry, the risers, and the
  default view for a `Score` (4.5).
- Done when: the gallery shows each species with the instrument of its section. The triangle
  budget test passes. The scene of each demo has its seats and stage size from 4.5, with no
  overlap of chairs.
- Review: the review agent examines screenshots of the gallery.

**Step 5. Motion**

- Work: `pose/` for all instrument families, the idle motion, the rest pose, and the conductor.
  Also the app wiring that the review needs: load a demo, build the `Score`, build the scene,
  and play the audio with the poses in sync. A temporary play button is enough until step 6.
  Also a script in `tools/` that writes `perf-60.mid`, which the frame target of 9.7 uses. It
  has 60 s of notes on these seats, with 60 players in total: violins 1 (6), violins 2 (6),
  violas (4), cellos (4), contrabasses (3), flutes (3), oboes (3), clarinets (3), bassoons (3),
  horns (4), trumpets (3), trombones (3), tuba (1), timpani (1), percussion (4, one for each key
  group), harp (1), piano (1), and choir (7). Each seat plays chords with as many notes as its
  players, and the test uses the section size "One per part".
- Done when: the Vitest tests of `pose/` pass, and the pose and frame targets of 9.7 pass.
- Review: the review agent examines a screen recording of demo 1 and of the Boulanger demo.

**Step 6. UI**

- Work: the transport bar, the drawer, the seat list, the demo list, the settings, the credits,
  the quality tiers, "Reset view", the drop of a file, the URL hash, and the messages of 2.8.
- Done when: the UI matches [`prototype/ui.html`](prototype/ui.html) at 1440 × 900 and at
  390 × 844. A keyboard alone can reach and use each control.
- Review: the review agent examines screenshots at both sizes.

**Step 7. Demo build, tests, and deploy**

- Work: the demo build (the changed files of step 2 go into the site), the Playwright tests, and
  the Pages workflow. The third-party license file comes from step 0 and grows with each new
  dependency.
- Done when: CI passes on `main`, with Playwright in Chromium. After the user creates the GitHub
  repository, the site deploys and plays demo 1.

### 9.6 Docs

All docs, comments, commit messages, and UI text use ASD-STE100 Simplified Technical English. The
project `AGENTS.md` holds the short rules for coding agents and links to this document.

### 9.7 Targets

The development Mac is an Apple M1 Max with Chrome. The research timings also come from this
machine.

| Target | Value | How to measure | Step |
|---|---|---|---|
| First download | less than 1 MB after gzip | the size check (7.2) in CI | 0 |
| Score build | at most 100 ms for the largest demo on the development Mac | a timed Vitest test | 2 |
| Clock | `Player.now()` within 20 ms of the audible time | Node: an offline render shows each note on within one block (2.7 ms) of its scheduled time. Browser: the spike compares the two clock methods of 6.7. | 1, 3 |
| Pose timing | each note event of `poseAt()` within 5 ms of the note time in the `Score`, before the seeded offset | Vitest | 5 |
| Seeded offset | at most ±20 ms for each player | Vitest | 5 |
| Audio render | at most 1.3 ms for each 128-frame block (half of the budget) for each demo | Node: an offline render of each demo with the block scheduler and spessasynth_core, timed for each block (`node tools/measure-targets.ts`) | 2 |
| Frame time | high tier, `perf-60.mid` (60 players), development Mac: GPU time and main-thread time each at most 4 ms for 95% of the frames over 10 s | Chrome DevTools performance trace | 5 |
| Load | the presets of demo 1 load and decode in at most 2 s on a 50 Mbit/s connection | DevTools network throttle | 1 |
| First sound | at most 300 ms from the click on play to the first sound, when demo 1 is ready | `performance.now()` at the click, against the first clock anchor plus the output latency | 1 |
| Memory | at most 100 MB of decoded samples for each demo | the `Player` reports the PCM size of the banks of the synth (`pcmBytes`). Node: `audio/pcm-memory.test.ts` converts the presets of each demo as the Worker does | 2 |

The step 2 results are in [`research/step-2-targets.md`](research/step-2-targets.md).

The pose tests of step 5 (`pose/pose-timing.test.ts`) sample the pose every 0.5 ms around each
note. Each note event of the bowed strings falls on the sample of its note time plus the seeded
offset, in a test file and in the first 10 s of the Beethoven demo. `pose/pose-speed.test.ts`
times `poseAt()` on the development Mac: 0.37 ms for the 60 players of `perf-60.mid`, and 0.47 ms
for 60 bowed string players (2026-10-05). The test also times a fixed reference work of float
math, 2.64 ms on that Mac, in turn with the poses. It takes the least time of each over 60 short
rounds, because load only adds time. It fails when the ratio of the pose time to the reference
time is more than 2 times its value on the development Mac. Thus the limits stay below 1 ms on
that Mac, a pose that is 3 times slower fails, and a loaded or a slower machine passes.

The frame target leaves a margin of about 4 times for an integrated GPU of the Intel Iris Xe class.
The manual release test (9.4) checks a real phone at the low tier: demo 1 must play at 30 fps or
more.

### 9.8 Reviews

The user decided this process on 2026-10-04. A review agent is an independent agent that did not
do the work of the step. It reviews the step against this design. A step with a review ends with
these actions:

1. Commit the work of the step.
2. Take the screenshots with Playwright at 1440 × 900 and at 390 × 844. `pnpm screenshots
   <dir>` takes them (`tools/screenshots.ts`). For a motion step, also record a GIF of 10 s.
3. Give the files to the review agent, and name the targets of the step with their results.
4. Make each change that the review agent requests as a commit in the same step. Then send the
   step to the review agent again.

When the review agent approves the step, start the next step. Do not wait for the user. After the
last step, the user examines all steps together, with the screenshots and the GIFs of each review.

## 10. Decisions to confirm

No open detail remains. On 2026-10-04, after the design session, the agent decided the details
below, so that a fresh agent can build with no guess. The user did not review them one by one.
The user can change any of them. Then update the section that holds it.

| Decision | Section |
|---|---|
| The pitch bands of "divided by pitch" | 3.5 |
| Programs 32 to 39 give the pizzicato technique | 3.5 |
| A channel that starts with pizzicato takes its next later section | 3.5 |
| A sound-only seat, "Other sounds", for notes with no animal | 3.5, 2.8 |
| The conductor is not counted in the cap of 60 | 3.8 |
| The order in which players go when a file needs more than 60 | 3.8 |
| The species of a third or later seat of a section | 4.3 |
| The shape parameters of each species, with the new types `large-round`, `floppy`, and `puff` | 4.3 |
| All colors, proportions, budgets, prop sizes, and the model inventory | 4.5, 4.6 |
| The camera: elevation 28°, azimuth 30°, distance `3.3 × S` (fit to the reference) | 4.5 |
| The stage origin, the stage size, the row radius rule, and the choir risers | 4.5 |
| The light scales with the stage size | 4.5 |
| The steps 0.4 m to the left of the podium, the floor, and the conductor stand | 4.5 |
| The bone list and the IK rule | 4.7 |
| The pose types and the audibility input of `poseAt()` | 5.1 |
| The conductor pattern for each time signature, with its tempo thresholds | 5.4 |
| The rest and lift times of a silent seat (0.6 s and 0.3 s) | 5.5 |
| The UI tokens, the control sizes, the seat texts, and the message texts | 2.8 |
| The "small screen" signal and the start tier of each device | 2.6 |
| The demo titles, composers, credit lines, and expected sections | 8.2 |
| The targets and their numbers (for example the clock within 20 ms, the first sound within 300 ms) | 9.7 |
| Right-handed axes: +z points to the audience | 4.5 |
| A shadow-only floor and no fog, so that the CSS gradient shows | 4.5 |
| The pianist faces +x, toward the conductor, who is ahead and a little to the left | 4.5 |
| The accent color and the accent parts of each species | 4.5 |
| The seat order: `SectionId` order, then the first (port, channel) | 3.2 |
| The percussion players: order, cap, and instruments | 3.8, 4.6 |
| Generic sequence names that a dropped file ignores | 8.2 |
| A selected demo or a dropped file starts when its samples are ready | 2.2 |
| The 60 seats of `perf-60.mid` | 9.5 |
| `oxlint-tsgolint`, the type-aware lint, and the explicit oxfmt paths | 9.5 |
| The size limit of 1,000,000 bytes, and demo 1 at `demos/beethoven-5.mid` in the site | 7.2 |
| The license file `third-party-licenses.txt`, and the build failure for an unlisted dependency | 7.3 |
| The SF3 split output in `public/sf/`, the GS variation banks, and no file for the bank 120 drum kits | 6.2 |
| Drum kit 0 as the fallback of a drum kit with no file | 6.2 |
| The `SynthEventTable` layout, and the port count from the highest synth channel | 6.4 |
| The chase of a seek, and the GM programs that start held notes again | 6.5 |
| The `PlayerScore` type of `load()`, and the spike values of `WorkletPlayer` | 6.8 |
| The rule that finds a timestamp with no output latency: later than the second method by more than half of the output latency | 6.7 |
| The `latencyHint: 'interactive'` of the `AudioContext` | 6.4 |
| An event sounds from the start of the block that holds its time: up to one block early | 6.4 |
| The volume sets the master gain of spessasynth_core | 6.4 |
| A render error makes the processor silent for good, and it reports the error | 6.4 |
| A play at the song end starts the song again from 0 | 6.5 |
| The anchor window of 1 s, in place of a count of anchors | 6.7 |
| The `Player` keeps the last rate and volume for the next score. Play, pause, and seek before a load resolves have no effect | 6.8 |
| A failure ends the engine, and the next load starts a new one. The `onError` function of the `WorkletPlayer` gets a failure that no pending load reports | 6.8 |
| A rejected `resume()` goes to `onError` | 6.8 |
| A later `load()` replaces a pending one, which rejects with a `LoadReplacedError` | 6.8 |
| A file with SMPTE time division is not valid | 3.3 |
| The text encoding of a name event: UTF-8, else Latin-1 read as windows-1252 (WHATWG) | 3.3 |
| The first port event of a track sets the port of the full track | 3.4 |
| 4 MB is 4,000,000 bytes, as in the size limit of 7.2 | 3.3 |
| A time signature in any track applies to all tracks, and the later track wins at the same tick | 3.3 |
| The note off at the end of a track ends the oldest open note on its key, and `score/` drops a note off with no open note | 3.3 |
| Only tracks with channel events give ports, and a seat names the port index | 3.4 |
| A bank select takes effect at the next program change, and `score/` ignores the bank LSB | 3.5 |
| The section of a note of 44 or 45 comes from the nearest note of another program on its channel. After an ensemble program, the string bands divide it | 3.5 |
| The merge rule for articulation channels does not merge a rhythm channel with a mallet channel | 3.7 |
| Notes that overlap by at most 50 ms are not simultaneous, so one player plays a legato or a grace note | 3.8 |
| A new note takes the player of its pitch rank, or the nearest free player, the higher one at the same distance. The rule of divisi with an uneven division | 3.8 |
| A program counts for the orchestral rule only on a melodic channel, and `Score.orchestral` ignores the setting | 3.8 |
| Above 60 players: "the largest other seat" excludes the strings and the choir, a tie removes from the later seat, and a smaller percussion seat gives the remaining key groups to its last player | 3.8 |
| The tempo at the downbeat selects the pattern of a bar, a time signature starts a new bar, and the beats end before the last note-off | 5.4 |
| Step 3 starts before the Safari check of step 1 with its audio-free tasks only. The bow sync and the clock target wait for the Safari check (manager, 2026-10-05) | 9.5 |
| Three step treads of rise 0.10 below the stage top, as in the reference image, in place of three rises of 0.133 | 4.5 |
| The conductor stand: its post 0.35 m in front of the podium center, the desk height above the podium top, and a tilt of 30°. The plank lines are 0.012 m wide | 4.5 |
| The soft shadows of the high tier: `PCFShadowMap` with radius 3, because three.js r186 has no `PCFSoftShadowMap`. The pixel ratio of a tier is never more than `devicePixelRatio` | 2.6 |
| A shared music stand stands 0.65 m in front of the row, between two seats, 0.1 m from the chair back of the row in front, and the `facing` of a stand is the facing of its players | 4.5, 5.1 |
| Each skeleton has all bones of 4.7. The bind pose is seated, with the arms down and no bone rotation | 4.7 |
| The sizes of the violin and the bow, and the hold of the violin under the chin | 4.6 |
| The static violin pose of step 3: the bow 0.14 m from the hand, its tip up, and the elbow directions | 4.7 |
| The step treads have the color of the stage top, as in the reference image | 4.5 |
| The light of the step 3 tune: 2.2 lux at the stage center, fill intensity 12, and beam opacity 1.0 with soft edges | 4.5 |
| The touch signal of the start tier is `(pointer: coarse)`, so a laptop with a touch screen starts at the high tier (review of step 3, F9) | 2.6 |
| The pixel ratio follows each change of `devicePixelRatio`, from a media query on the resolution (review of step 3, F8) | 2.6 |
| The violin strings are one strip of 0.008 m in `#9a9080` (review of step 3, F5) | 4.5 |
| The torso splits at the `chest` bone: the lower part follows `spine`, and the upper part follows `chest` (review of step 3, F6) | 4.7 |
| The seated shin reaches from the knee to the floor (seat height plus 0.12 H), so that the feet rest on the floor (review of step 3, F2) | 4.5 |
| The inside of an ear has the belly color, unless the accent parts include the inner ears or the ears | 4.5 |
| The large-flap ear points back and out at 32°, so that the elephant is 0.88 m wide and fits the seat arc of 0.95 m (review of step 3, F12) | 4.5 |
| The trunk has no nose ball, the flat nose has two nostrils, and the beak has a lower half on `jaw` | 4.5 |
| The flat nose is 0.4 H wide and 0.3 H tall, in place of 0.2 H wide | 4.5 |
| The path of a tail of two bones under the chair back | 4.5 |
| The face pattern `forehead-stripes` of the cat, so that `stripe` names only the stripe of the badger | 4.3 |
| The seated body of step 4: the head top 2.4 H above the seat (in place of 2.6), a torso 1.45 H tall, and a neck that the torso and the head hide. The agent of the animal views changed the widths and the legs (below) | 4.5 |
| The ear types `antlered` (the deer) and `side-round` (the monkey), and the face pattern `face-disc` (the monkey) | 4.3 |
| The trunk starts 0.3 H below the head center and curls up. The horn is 0.26 H wide at its base | 4.5 |
| The ids of the two fox colors: `fox-red` (second violins) and `fox-tan` (flutes). `SPECIES` holds 19 entries for the 18 species | 4.3 |
| The mouse has a pointed snout of 0.3 H and large round ears of 0.7 H, set high and out to the sides (review of step 4, the weak species) | 4.3, 4.5 |
| The beaver has the snout `buck-teeth`: two front teeth in `#f1ead9` below the muzzle. Its flat tail is 0.45 H wide (review of step 4, the weak species) | 4.3, 4.5 |
| The meerkat has the girth 0.75 (a new optional parameter of `SpeciesParams`), the pointed snout, and eye patches and ears in `#2a1f17` in place of `#4a3828` (review of step 4, the weak species) | 4.3, 4.5 |
| The dog has a cream coat `#e6dfd1` with belly `#f3eee4`, and its floppy ears and the new face pattern `eye-patch` (one patch around the left eye) are `#8a5a36` (review of step 4, the weak species) | 4.3, 4.5 |
| The cat has two forehead stripes of 0.03 H in place of three of 0.05 H (review of step 4, the weak species) | 4.3 |
| A wind player shows one note: the last note that started, and the highest note of a chord (notes within 50 ms) (second re-review of step 2, P1) | 5.3 |

On 2026-10-05, the manager decided the details below on the advice of a review agent. The user
can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| `Seat.kits` holds the drum kits of the rhythm sources, and `Seat.programs` holds only melodic programs | 3.2 |
| The toms of a GM1 kit do not make a file orchestral: a timpani seat counts only with program 47 or kit 48 | 3.8 |
| Above 60 seats with players, the seats with the fewest notes move their notes to the sound-only seat, and a tie moves the later seat | 3.7, 2.8 |
| A note that starts at most 50 ms after the first note of a chord joins it, if each note of the chord ends more than 50 ms after its start. Notes with the same start are always one chord | 3.8 |
| The reference scale of the step 3 review (question A): the head height `H` of the rabbit is 0.38 m, the instruments are 1.27 times larger (violin 0.51 m, bow 0.57 m), the front distance is 1.0 m (with a piano, also 0.3 m in front of the piano case), the edge margin is 0.3 m, and the smallest stage side is 5 m. Thus the reference composition has `S = 6.6` | 4.5, 4.6 |
| The light and the stage color of the step 3 review (question B): spotlight angle 45° with penumbra 0.5, spotlight color `#fff6ec`, fill ground `#4a3a30`, and stage top `#7a6359` with plank lines `#5e4b42`. A base color changes only when no light value matches the reference | 4.5 |
| The light on the floor: an additive disc of radius `S` in `#e8dcc0`, opacity 0.13 up to `0.5 × S` and 0 at `S`, 1 mm above the floor (review of step 3, "No light on the floor") | 4.5 |
| The shadow floor writes no depth, so that the light on the floor shows no streaks in far views (review of step 4, F4) | 4.5 |
| A standing player has short straight legs: the torso base 0.75 H above the floor and a thigh of 0.42 H, so its legs are 28% of its height and the bear is 1.67 m tall (review of step 4, F3). It replaces the legs of a chair, straight down, of the step 4 layout agent | 4.5 |
| The spread of the rows after the stage size: each side of a row grows its arcs by one factor, up to 1.6 m between neighbors and ±90°, with all footprint and edge checks. `S` does not change (review of step 4, F1) | 4.2, 4.5 |
| The weak species of the step 4 review get clear marks: the mouse, the beaver, the meerkat, the dog, and the cat. The first table gives their new values | 4.3, 4.5 |
| The gap in front of a gallery row is at least the height of the tallest model of the next row / tan 35°, and the gallery pianist faces +x (review of step 4, F2) | 7.1 |
| Longer arms: upper arm 0.7 H (was 0.6) and forearm 0.65 H (was 0.55), so that the shoulder is 1.43 H from the palm, 0.60 of the seated height. The bow slant of 20° and the leans of 15° and 20° stay, and the shoulder turns of the bowed strings become violin 10° (was 40°), viola 30° (50°), cello 10° (30°), and contrabass 30° (50°). Option (c) of the review of step 4, "the reach of the arms" | 4.5, 5.3 |
| An earlier note that sounds at the first note of a chord counts for all notes of the chord, and each chord gets one division of the players (review of step 2, R1 and R2). The rule of `7bd561d` tested each note of a chord at its own start, and gave 2 players in the N3 case (review of step 2, N3) | 3.8 |

On 2026-10-05, the agent of step 2 decided the details below. The user can reverse each one.
Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The demo script checks the SHA-256 of `demos/README.md`, and writes all six demos into `public/demos/` before `pnpm dev` and `pnpm build` | 8.3 |
| `score/` applies the generic name rule, so `Score.sequenceName` is '' for a name with no letter or a generic name. "Track" with a number permits one space before the number | 3.2, 8.2 |
| A file with more than 100,000 conducted beats is not valid (`not-midi`, with the current message), so that a far note off cannot fill the memory | 3.3 |
| The bagpipe (109), the fiddle (110), the shanai (111), the synth leads (80 to 87), and the synth pads (88 to 95) also start held notes again. The synth effects (96 to 103) do not | 6.5 |
| The decode Worker keeps no cache. The synth keeps each bank for the session, and the `Player` asks the Worker only for the presets that the synth does not have | 6.3 |
| A load that a later load replaces during its decode sends no banks, so the shared presets decode two times (review of step 2, R3) | 6.3 |
| The PCM of a session has no limit below the 147.4 MB of all 274 preset files, because the synth removes no bank (review of step 2, R4) | 6.3 |

On 2026-10-05, the agent of the step 4 instruments decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The instrument data of `models/instruments/`: rigid pieces on the bones of 4.7, holds on the points of the body, grips, and targets for step 5 | 4.6 |
| The cello is 1.20 m to the scroll with an end pin of 0.20 m, because the cello of the reference image reaches the eyes of the elephant. It leans back 25° between the knees | 4.6 |
| The contrabass stands at the left side of the player, and leans back and to the right | 4.6 |
| The viola uses the violin bow. The cello and the contrabass share one bow of 0.63 m | 4.6 |
| The harp is 1.40 m tall with 24 strings, and it leans back 12° to the right shoulder of the player | 4.6 |
| The grand piano: a case of 1.40 × 2.0 m, the white keys at 0.70 m, and the lid open 35° to the right of the player. The bench is 0.75 × 0.35 m at 0.45 m, with the budget of a chair | 4.5, 4.6 |
| The choir folder has pages in the sheet music color `#ece6d6`, and the singer holds it open in front of the chest | 4.5, 4.6 |
| The woodwinds are 0.85 of their real length, as the violin: flute 0.57 m, oboe 0.55 m, clarinet 0.57 m, and bassoon 1.15 m | 4.6 |
| The angles of the oboe (30°) and of the clarinet (25°) are from the vertical, because the clarinets of the reference image hang nearly straight down | 4.6 |
| The bassoon leans 35° to the left with the boot at the right hip, its tube passes the left side of the head, and its bocal is metal `#c9c6bf` | 4.5, 4.6 |
| The horn, the trumpet, and the trombone are 0.85 of their real size. The tuba is 0.95 m tall, so that it stands in the lap of the rhino and reaches its mouth | 4.6 |
| The horn coil stands in front of the right side of the chest, and its bell opens to the right and to the back. The tuba bell is at the left of the head | 4.6 |
| The trombone slide is a piece on the `slide` bone with a travel of 0.55 m. A rotation cannot move it, so a pose of 5.1 also has `slideOffset`, the move of the slide bone in the axes of the `instrument` bone | 4.6, 5.1 |
| The timpani kettles are 0.7 of their real size, with the key ranges of the 32, 29, 26, and 23 inch kettles. The kettle count comes from the highest timpani note: two up to C3, three up to F3, else four | 4.6 |
| The places of the bass drum, the snare drum, and the xylophone (30 bars, C5 to F7) in front of the standing player | 4.6 |
| The small percussion player: the triangle hangs from the left hand, and the tambourine stands on a tripod at the front right | 4.6 |
| The cymbals hang on the bones `malletL` and `malletR`, and the triangle on `malletL` | 4.6, 4.7 |
| The colors of the stands, the tambourine, the xylophone, and the mallets | 4.5 |

On 2026-10-05, the agent of the step 4 layout decided the details below. The user can reverse
each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The stool of the harp (0.40 m, the chair seat) and the high stool of the contrabass (0.70 m, a foot ring at 0.30 m), both 0.36 × 0.36 m with no back | 4.5 |
| The cast of a drum player: the instrument of its first key group, with the first drum kit of its seat | 4.6 |
| On a chair, the body moves forward until it is 0.01 m in front of the chair back, and its floor instrument moves with it | 4.5, 4.6 |
| The risers are arc blocks with the colors of the stage top and the stage sides | 4.5 |
| Row 0 holds the first violins to the left of 0° and the violas to the right. The other rows stay centered on 0° (review of step 3, the rabbit behind the podium) | 4.2, 4.5 |
| The footprint of a player: one box for each bone in each band of 0.2 m of height, and the box of its seat. The overlap test checks the footprints | 4.5 |
| The arc between two neighbors grows until their footprints and stands keep 0.05 m apart (review of step 3, F12) | 4.5 |
| A row moves back until its footprints keep 0.05 m from the items in front | 4.5 |
| A wind stand moves forward until it is clear of its player, and a string player with no partner has its stand to its right | 4.5 |
| The singers fill the riser levels evenly, and the count of levels that gives the smallest stage wins (review of step 3, F13) | 4.5 |
| The half width `L` and the depth `D` also count each footprint box plus 0.3 m | 4.5 |
| The text of the pianist facing: the conductor is ahead and a little to the left, and the lid opens to the audience. The first text put the conductor on the right side | 4.5 |

On 2026-10-05, the agent of the step 4 scene and gallery decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The two gallery pages (`?page=species` and `?page=instruments`), the test note format, and the violin pose for a sounding note until step 5 | 7.1 |
| The temporary query `?demo=<id>` and the keys [ and ] select the demo of the scene until step 6 | 2.2 |
| The gallery renders with the shadow radius 1, because the radius 3 shows the noise of `PCFShadowMap` in close views (review of step 3, F11) | 7.1, 2.6 |

On 2026-10-05, the agent of the step 5 motion decided the details below. The user can reverse
each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| `AnimalPose.slideOffset` holds the move of the trombone slide, in the axes of the `instrument` bone, so that the trombone motion needs no change of the type | 4.6, 5.1 |
| `Transport` and `SeatAudibility` also give `previousChangeAtWall`, so that a lift or a lowering starts from the height of the instruments at the change. Without it, a short pause makes the instruments jump down and come up again | 5.1, 5.2, 5.5 |
| The loudness of a gesture reads CC 7 and CC 11 from the synth events at the note start, with the General MIDI start values 100 and 127, and CC 121 resets CC 11 | 5.3 |
| `preparePoses(score, layout, seed)` calculates the data of a score one time, and `poseAt()` takes its plan and writes into a buffer. Design 5.1 first gave `poseAt()` the score, the layout, and the seed, which made each frame search the full score | 5.1 |
| The values of the beat layer (a sway of 2° in passages) and of the idle layer (breath, blinks, looks, ears, and tail) | 5.1 |
| The stroke rules of the bowed strings: chords and held notes make double stops, the string of a note, the stroke length, the phrase gap of 0.5 s, the lift, the tremolo rate, and the pluck | 5.3 |
| The bowed string players turn the right shoulder forward, slant the bow 20°, and lean the low strings forward, because the arms of the models do not reach the strings in the bind pose. The bow range is the part of the hair that the arm reaches | 5.3, 4.7 |
| The rest pose of the violin and the viola: the instrument turns down to the lap, and the left hand keeps the neck | 5.2 |
| The timing offset of a player is uniform in ±20 ms and its amplitude in 0.85 to 1.15. A note event is at the note start, and the motion before it ends there | 5.3, 9.7 |

On 2026-10-05, the agent of the step 5 winds and brass decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| In the bind pose, the strap of each cymbal is 0.12 m above the palm, and the triangle points forward from the left hand, so that no vertex is below the floor (review of step 4, P1) | 4.6 |
| The motion of the winds: the breath in of 0.4 s before a phrase (a rest of 0.5 s), the lean of 3°, the finger curls for the holes and the valves, the move times of 60 ms (fingers) and 0.1 s (slide), and the elbows down and out | 5.3 |
| The trombone slide positions map evenly into the travel that the right arm reaches (0.13 m of 0.55 m for the pig, 0.16 m before the bodies of `animals.webp`), because no probable arm reaches the seventh position | 5.3 |
| The right shoulder turns forward 20° on the oboe and 45° on the trombone. The clarinet also turns it 20°, because the long snout of the wolf puts the clarinet 0.15 m farther forward than the snout of the raccoon (agent of the animal views) | 5.3 |
| The rest pose of the winds: the head lifts 12° off the mouthpiece, the flute, the trumpet, and the trombone turn down around the mouthpiece, and the palms keep their grips. A pose has no move of the instrument bone | 5.2, 5.3 |
| The horn coil is 0.10 m in front of the mouth (was 0.24 m), so that the left hand reaches the valves. The stage of `perf-60.mid` becomes 14.68 m (was 14.69 m) | 4.6 |
| The gallery labels of the species have two lines, and the gap in front of a gallery row holds 0.5 m more for the labels (review of step 4, P4) | 7.1 |

On 2026-10-05, the agent that applied the audit of the pose code decided the detail below. The
user can reverse it. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Each player note carries the synth channel of its note on. Two channels of a merged seat can play the same key at the same time, and each note then reads the controllers of its own channel for the gesture size | 3.2, 5.3 |

On 2026-10-05, after the user added `docs/reference/animals.webp`, the agent of the animal views
decided the details below. Where the new image differs from `orchestra.webp` or from the design,
the agent followed the new image, because the user gave it last and asked for the same results.
The user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The views page `views.html`: the rows, the places, and the labels of `animals.webp`, an orthographic camera 8° above the floor, the studio light, the poses, and the places of the stands (7.1) | 7.1 |
| The sculpted head: a loft of six rings, 1.0 H tall and 1.26 H wide at the cheeks, with a ridge at the front and a side view that is a wedge. It replaces the icosphere of 0.9 H | 4.5 |
| The lower face (the cheeks, the jaw, and the face up to the eyes) has the belly color. The forehead, the back of the head, and the top of a long muzzle keep the fur color | 4.3 |
| The eyes are upright ovals of about 0.07 × 0.15 H on the faces between the front and the sides. They replace the spheres of 0.08 H | 4.5 |
| The torso is a faceted pear 1.35 H tall (was 1.45 H) and 1.32 H wide (was 1.2 H), with a ridge at the chest and the belly forward. The head top is 2.3 H above the seat (was 2.4 H). The arms are 0.40 to 0.30 H wide | 4.5 |
| The seated legs: the hip 0.3 H above the seat and 0.32 H from the middle, a thigh of 0.68 H that is 0.76 H wide, a knee ball, a shin 0.54 H wide, and a wedge foot of 0.48 × 0.72 H with its heel 0.22 H behind the ankle. Accent feet also color the lower 0.45 of the shin | 4.5 |
| The limbs are faceted tubes with a turned middle ring, in place of plain cylinders | 4.5 |
| A standing body: the torso base 0.77 H above the floor (was 0.75 H) and a thigh of 0.45 H (was 0.42 H). The bear is 1.63 m tall, with legs of 30% | 4.5 |
| The long and the pointed ears are flat plates of 1.25 H and 0.55 H (were 1.1 H and 0.45 H), with the inner plate on the front face, turned out 30° | 4.5 |
| The long snout is pointed and 0.3 H in front of the cheeks, with the fur color on its top. The short muzzle is smaller and lower. The pointed snout and the beak are 0.2 H in front of the cheeks | 4.5 |
| The puff tail is 0.42 H (was 0.2 H) and low on the back. The bushy tail is 1.1 H (was 0.9 H) and 0.54 H wide, with a tip of the belly color, and it hangs to 0.12 m above the floor | 4.5 |
| The chair: a seat of 0.35 m (was 0.45 m), a back top of 0.85 m (was 0.95 m), and one wide top rail of 0.10 m with an open back in place of two slats. The harp stool follows the chair seat, the foot ring of the high stool is 0.35 m, and the piano bench stays at 0.45 m | 4.5 |
| The colors of `animals.webp`: the white rabbit with pink inner ears, the brighter orange fox with white cheeks and dark socks, the light gray wolf, and the darker red-brown bear with a tan muzzle. The bear has the accent part `snout` and the girth 1.15 | 4.3, 4.5 |
| The other 13 species keep their colors, and they get the new head, torso, limbs, feet, ears, snouts, and tails, so that the cast stays one style | 4.5 |
| The new bodies change the stage sides a little: Beethoven 9.82 m (was 9.83 m), Grieg 7.0 m with the pandas of the cellos (was 7.12 m), Handel 10.94 m (was 10.96 m), and `perf-60.mid` 14.69 m (was 14.68 m). The reference composition keeps 6.6 m | 4.5 |

On 2026-10-05, the agent that made each commit of the animal views pass the checks decided the
detail below. The user can reverse it. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| `pose/pose-speed.test.ts` compares the pose time with a reference work in the same run, and takes the least time of 60 short rounds. The absolute limit of 1 ms failed when the development Mac was under load | 9.7 |

On 2026-10-05, the agent of the step 5 piano, harp, and choir decided the details below. The user
can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The 24 strings of the harp show its 47 strings evenly, and a sharp plays on the string of the natural below it | 4.6 |
| The two hands of the piano and the harp: a chord wider than one octave splits at its largest interval, a chord within one octave goes to the nearer hand, and the hands start at C3 and C5 | 5.3 |
| The piano palm 0.04 m above the front edge of the keys, the move of 0.15 s (at most 0.6 of the gap), the lift of 0.03 m, the strike at the note start, and the curl of 30° | 5.3 |
| A hand stops short of a key out of reach at 97% of the arm length. The meerkat does not reach A0 to F♯1 and D♯7 to C8 | 5.3, 4.7 |
| The harp pluck: the rest of 0.04 s on the string, the pull of 0.025 m in 0.08 s, the curls of 15° and 60°, and the lean of 8° that the bass strings need | 5.3 |
| The rest pose of the pianist and of the harp player: the arms hang | 5.2, 5.3 |
