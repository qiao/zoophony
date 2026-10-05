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
| High | 2048, `PCFSoftShadowMap` | up to 2 | on |
| Medium | 1024, `PCFShadowMap` | 1.5 | on |
| Low | 512, `PCFShadowMap` | 1 | on |

MSAA stays on in all tiers, because the flat faces show hard edges.

- At start, the app selects a tier from the device. A touch screen or a small screen gives the
  low tier. A small screen has a viewport with a shorter side of less than 600 CSS pixels. All
  other devices start at the high tier.
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
  - The sound-only seat names only its programs: "Programs 80 and 81".
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
  /** The programs of the seat, in the order of first use. On a rhythm channel, the drum kits. */
  programs: number[];
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
  /** The time of the last note-off. The UI shows it rounded down to whole seconds. */
  durationSec: number;
  /** The sequence name (FF 03 in the first track), or '' if the file has none. */
  sequenceName: string;
  /** The rules of 3.8 decide this value. */
  orchestral: boolean;
  seats: Seat[];
  /** Sorted by startSec. */
  notes: PlayerNote[];
  beats: Beat[];
  /** Sorted by timeSec. */
  synthEvents: SynthEvent[];
  /** Presets that must load before play. Drum kits use bank 128. */
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

### 3.3 File rules

- A file that is not a valid Standard MIDI File, or a file of format 2: the app shows an error
  message and keeps the current piece.
- A file of more than 4 MB: the app refuses the file with a message.
- A file with no notes: the app shows an error message and keeps the current piece.
- SysEx messages: the app removes all of them before the synth and the visuals get the events.
  Thus a GS drum part SysEx cannot change the sound without a change to the visuals.
- A tempo event in any track applies to all tracks. Some format 1 files put tempo events outside
  track 0.
- A note with no note off ends at the end of its track.
- Two note ons on the same key and channel before a note off: the first note off ends the first
  note on. The synth uses the same rule.
- A note on with velocity 0 is a note off.
- A channel with no program change uses program 0 (Acoustic Grand Piano), the GM default.
- A file with no tempo or time signature events uses the MIDI defaults: 120 BPM in 4/4.

### 3.4 Ports and channels

- Each MIDI port is a group of 16 channels. The app does not merge ports.
- A port event (`FF 21`) sets the port of its track. A track with no port event uses port 0.
- The ports are ordered by port number. The synth channel is `portIndex * 16 + channel`.
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

- The sound-only seat holds all notes of the programs with no animal. It shows in the seat list
  as "Other sounds", so the user can mute and solo it. It has no players, so it never counts
  toward the cap of 3.8.
- Program 44 gives the technique `tremolo`. Programs 45 and 32 to 39 give `pizzicato`, because a
  bass guitar and a jazz bass are plucked, and MuseScore plays contrabass pizzicato with program
  32 (the Boulanger demo does this). All other programs give `normal`.
- Bank select chooses variation presets, because all presets ship. If a file asks for a bank that
  does not exist, the synth falls back to bank 0. The visuals use only the program.

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
  because each track uses one channel.
- **Merge rule for single players.** All channels that map to the piano, the harp, or the timpani
  form one seat with one player. The pianist plays low notes with the left hand and high notes
  with the right hand. A piece for two pianos thus shows one pianist. Such files are rare.
- The seats of a section are ordered by their first (port, channel) pair.

### 3.8 Players

The player count of a seat depends on its section and on the file.

| Seat | Players |
|---|---|
| Woodwinds, brass | One player for each simultaneous note (the max polyphony of the seat). |
| Piano, harp, timpani, mallets | One player plays all notes. |
| Channel 10 percussion | One player for each key group that the file uses (3.6). |
| Strings and choir, orchestral file | A base section size: violin 4, viola 3, cello 3, contrabass 2, choir 8. All players play the same note. A chord divides the players across the notes (divisi), highest note first. |
| Strings and choir, other file | One player for each simultaneous note. |

- A file is **orchestral** if one of these is true:
  - It has a woodwind, brass, or timpani seat.
  - It uses an ensemble program (44, 45, 48-51).
  - It uses program 43 (contrabass). Programs 32 to 39 (bass guitars) do not count, so a pop
    file with a bass guitar does not get full string sections.
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
- When a string seat has more notes than players, a player takes two notes (a double stop).
- In a chord, the highest note goes to player 0. Thus each player keeps a stable pitch range.

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
  contrabasses sit behind the cellos.
- The woodwinds sit in the middle. The brass, the timpani, and the percussion sit at the back.
- The harp sits at the back left. The choir stands on risers behind the orchestra.
- The piano stands at the front left of the conductor.

### 4.3 Species

All animals use one parametric biped body. Each species changes only its parameters.

```typescript
interface SpeciesParams {
  ears: 'long' | 'pointed' | 'round' | 'large-round' | 'floppy' | 'large-flap' | 'small' | 'none';
  snout: 'short' | 'long' | 'trunk' | 'flat-nose' | 'horn' | 'beak';
  tail: 'none' | 'puff' | 'bushy' | 'ringed' | 'thin' | 'flat';
  /** Height scale. 1.0 is the rabbit of the reference image. */
  size: number;
  colors: { fur: string; belly: string; accent: string };
  /** Face pattern, for example the raccoon mask. */
  facePattern: 'none' | 'mask' | 'eye-patches' | 'stripe';
}
```

| Section | Species | Section | Species |
|---|---|---|---|
| Violin, first seat | rabbit (reference) | Flute | fox, light tan (reference) |
| Violin, second seat | fox, red-orange with a white face (reference) | Oboe | mouse |
| Viola | cat | Clarinet | raccoon (reference) |
| Cello | elephant (reference) | Bassoon | beaver |
| Contrabass | hippo | Horn | dog |
| Harp | deer | Trumpet | monkey |
| Piano | panda | Trombone | pig |
| Timpani | badger | Tuba | rhino |
| Percussion | meerkat | Choir | penguin |
| Conductor | bear (reference) | | |

- The fox plays in two sections, as in the reference image. The two fox colors of the reference
  make the two sections look different.
- The penguins have black and white bodies, which look like choir robes.
- Further seats of a section alternate their species variants. For example, a third violin seat
  uses rabbits again, and a fourth uses red-orange foxes.

The shape parameters of each species (4.5 gives the size and the colors):

| Species | ears | snout | tail | facePattern |
|---|---|---|---|---|
| rabbit | long | short | puff | none |
| fox (both colors) | pointed | long | bushy | none |
| raccoon | round | short | ringed | mask |
| elephant | large-flap | trunk | thin | none |
| bear | round | short | puff | none |
| cat | pointed | short | thin | stripe |
| hippo | small | flat-nose | thin | none |
| deer | pointed | long | puff | none |
| panda | round | short | puff | eye-patches |
| mouse | large-round | short | thin | none |
| beaver | small | short | flat | none |
| dog | floppy | long | thin | none |
| monkey | round | short | thin | none |
| pig | pointed | flat-nose | thin | none |
| rhino | small | horn | thin | none |
| badger | small | long | puff | stripe |
| meerkat | small | long | thin | eye-patches |
| penguin | none | beak | none | none |

- `stripe` on the cat is three short forehead stripes in the accent color. On the badger, it is
  a white stripe from the nose over the head, between two black stripes.
- The belly color also colors the muzzle and the face, so the fox gets its white face from it.

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
each base color below is a little lighter than its darkest sample. Tune the light (not the base
colors) in step 3 until a screenshot of the default view looks like the reference.

One world unit is one meter.

**Scene colors**

| Item | Color | Note |
|---|---|---|
| Background, center | `#201c19` | The CSS of the page: `radial-gradient(ellipse at 50% 45%, #201c19, #0b0908 75%)`, behind a transparent canvas. |
| Background, edges | `#0b0908` | The gradient reaches this color at 75% and keeps it to the corners. |
| Floor | none | A plane under the stage that shows only the shadows (props table). The CSS gradient shows through it. |
| Spotlight | `#ffe9c7` | Warm white, about 3200 K. |
| Visible beam | `#e8dcc0` | Additive cone (below). |
| Stage top | `#7a5646` | Walnut planks. Plank lines `#5e4134`. |
| Stage sides and steps | `#3a2a22` | |
| Podium | `#9a7446` | A lighter wood box. |
| Chairs | `#cdb27a` | Pale yellow wood. |
| Music stands | `#1e1a16` | Sheet music `#ece6d6`. |

**Species colors**

| Species | Size | Fur | Belly and face | Accent |
|---|---|---|---|---|
| rabbit | 1.0 | `#a8a090` | `#c8c1b4` | inner ears `#c9a898` |
| fox, violins | 1.0 | `#c47a45` | `#ead8bb` | feet `#4a2c1c` |
| fox, flutes | 1.0 | `#c9a273` | `#e6d3b5` | ears and feet `#9a7148` |
| raccoon | 0.9 | `#7a7168` | `#d8d2c8` (face rims) | mask and tail rings `#2a2622` |
| elephant | 1.35 | `#a8a198` | `#b9b2a8` | inner ears `#b9a39a` |
| bear (conductor) | 1.35 | `#6e4b33` | `#9a7656` | |
| cat | 0.95 | `#8d9298` | `#e2ddd4` | stripes `#5f646a` |
| hippo | 1.35 | `#8f7d83` | `#b8a3a6` | |
| deer | 1.1 | `#a8774c` | `#e5d3b8` | |
| panda | 1.2 | `#e9e5dc` | `#e9e5dc` | patches `#24211e` |
| mouse | 0.75 | `#9a8b7e` | `#c9bcae` | inner ears `#d6a59a` |
| beaver | 0.95 | `#6a4630` | `#8c6a52` | tail `#3e2e26` |
| dog | 1.05 | `#c9b08a` | `#e6d8c0` | ears `#7a5638` |
| monkey | 0.95 | `#8a5a3a` | `#d9b892` | |
| pig | 1.05 | `#d99a8e` | `#e6b2a8` | snout `#c98276` |
| rhino | 1.35 | `#8e8a84` | `#a6a29b` | horn `#cfc6b5` |
| badger | 0.95 | `#7d7a76` | `#e6e1d8` | face stripes `#24211e` |
| meerkat | 0.85 | `#b99a6e` | `#d8c3a0` | eye patches `#4a3828` |
| penguin | 0.9 | `#1f1d1c` | `#ece8e0` | beak and feet `#d98a3a` |

All species have eyes `#15110e` and a nose `#2a1d15`, unless the table gives a different accent.

**Instrument colors**

| Instrument | Colors |
|---|---|
| Violin, viola | wood `#9c5a43`, fingerboard `#1b1714`, bow stick `#3b2a20`, bow hair `#e8e2d4` |
| Cello, contrabass | wood `#a8643e`, the same fingerboard and bow |
| Flute, piccolo | metal `#c9c6bf` |
| Clarinet | `#d6d1c6` with rings `#3a3530`, as in the reference |
| Oboe | `#2a2522` with metal keys `#c9c6bf` |
| Bassoon | `#7a4a2e` |
| Horn, trumpet, trombone, tuba | metal `#c9a14a` |
| Timpani | metal kettles `#b0703f`, heads `#efe9dc` |
| Drums | shells `#8a2f2a`, heads `#efe9dc` |
| Cymbals, triangle | metal `#c9a14a`, metal `#c9c6bf` |
| Piano | case `#15120f`, white keys `#f2eee6`, black keys `#15120f` |
| Harp | frame `#b07a45`, strings `#e8e2d4` |
| Baton | `#ece6d6` |
| Choir folder | `#2a2522` |

**Materials**

- Each mesh uses `MeshStandardMaterial` with `flatShading: true` and vertex colors.
- The matte group has roughness 0.85 and metalness 0.
- The metal group has roughness 0.4 and metalness 0.3. The scene has no environment map, so a
  higher metalness makes metal look black.
- Each player mesh has at most these two groups, so it costs one or two draw calls.

**Light and render**

- One `SpotLight` above the stage center at a height of `1.2 × S`, where `S` is the stage side.
  It aims at the stage center. Angle 32°, so the cone radius at the stage is `0.75 × S` and the
  cone covers the corners. Penumbra 0.6. It is the only light that casts shadows. The shadow
  map size and filter follow the tier (2.6).
- One `HemisphereLight` as fill: sky `#3a3530`, ground `#0e0c0a`, intensity 0.3.
- The visible beam is an open cone mesh from the light to the circle of radius `0.75 × S`. It
  uses additive blending, no depth write, and no shadows. Its opacity goes from 0.12 at the top
  to 0 at the stage.
- Tone mapping is ACES Filmic with exposure 1.0. The output color space is sRGB.
- Tune the spotlight intensity in step 3, so that the stage center has the brightness of the
  reference.

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

The head height `H` is the unit. For the rabbit, `H` is 0.30 m. Each species multiplies `H` by its
size.

| Part | Size in H |
|---|---|
| Head | 1.0 tall, 0.9 wide |
| Torso | 1.3 tall. A pear shape: 1.0 wide at the hips, 0.75 at the shoulders. |
| Upper arm, forearm, hand | 0.6, 0.55, 0.25 (a mitten: one block for all fingers) |
| Thigh, shin, foot | 0.6, 0.6, 0.35 |
| Seated height | 2.6 from the seat to the top of the head |
| Eyes | Two black spheres of 0.08, wide apart. No mouth, except the choir jaw (4.7). |
| Ears | long 1.1 tall, pointed 0.45, round 0.3, large-round 0.45, floppy 0.5 long (hangs down), large-flap 0.9 wide, small 0.2 |
| Snouts | short 0.25, long 0.45, trunk 1.4 (3 bones), flat-nose 0.2 wide, horn 0.4, beak 0.3 |
| Tails | puff 0.2 (a ball, 1 bone), bushy 0.9, ringed 0.8, thin 0.7, flat 0.5 (2 bones) |

**Facets and triangle budgets**

- A head is an icosphere with detail 1. A limb is a cylinder with 6 radial segments. A torso is a
  lathe with 8 segments.
- A body has at most 1,200 triangles. An instrument has at most 500, except the piano (1,500) and
  the harp (800). A chair has at most 120 and a stand at most 80.
- The full scene with 60 players has at most 150,000 triangles.
- A Vitest test in `models/` checks these budgets.

**Props and stage**

| Item | Values |
|---|---|
| Chair | Seat height 0.45, seat 0.42 × 0.40, back top 0.95, two horizontal back slats, four legs |
| Music stand | Tripod base, post, desk 0.50 × 0.35 at a height of 1.05, tilted 30° to the player, a white sheet |
| Podium | A box of 0.9 × 0.9 × 0.25 |
| Conductor stand | On the podium, in front of the conductor: a desk of 0.60 × 0.45 at a height of 1.10, with an open score |
| Stage | A square slab of side `S`, 0.40 thick (stage origin, below). Planks are 0.20 wide and run from the front to the back. |
| Steps | Three steps (rise 0.133, tread 0.30, width 1.0) at the front edge, 0.4 m to the left of the podium center, as in the reference |
| Choir risers | Up to three levels, each 0.25 high and 0.8 deep (seat geometry, below) |
| Floor | A `ShadowMaterial` plane of `3 × S` at the bottom of the stage (y = -0.40), opacity 0.5. It shows only the shadows of the stage and the steps. |

**Stage origin**

The world origin is the stage center, on the top of the stage. The axes are the right-handed
axes of Three.js: +x points to the right as the audience sees it, +y points up, and +z points to
the audience (the front).

1. Place the seats in arcs around the podium center (seat geometry, below), and place the piano.
2. Calculate the half width `L`: the largest `|x|` of a seat, a riser, or the piano, plus 0.5 m
   for the chair and 1.2 m of margin.
3. Calculate the depth `D`: 1.6 m from the front edge to the podium center, plus the largest
   distance behind the podium (along -z) of a seat or a riser, plus 0.5 m for the chair and
   1.2 m of margin.
4. The stage side is `S = max(7, 2 × L, D)`. The front edge stays 1.6 m in front of the podium
   center, so any extra depth goes to the back.
5. Move all items so that the stage center is the origin. The podium center is then at
   `(0, 0, S / 2 - 1.6)`.

**Seat geometry**

The seats stand in arcs around the podium center. All players face the podium, except the
pianist. An angle of 0° points from the podium to the back (-z). Negative angles are on the left.
A seat at the angle `a` and the radius `r` is at `podium + (r × sin a, 0, -r × cos a)`.

- A seated player uses 0.95 m of arc. A choir singer uses 0.60 m. String players share one stand
  for each two players. Woodwind and brass players have one stand each.
- Each row is centered on 0° and spans at most 160°. Its sections follow the order of the table,
  from left to right.
- Row `n` has the radius `r(n) = max(r(n - 1) + 1.2, width(n) / 2.79)`, where `width(n)` is the
  arc length that its players need and 2.79 is 160° in radians. `r(-1)` is 1.2, so row 0 has a
  radius of at least 2.4. Thus a full row moves back until it fits into 160°.
- The choir stands on risers behind the last instrumental row. Riser level `k` has the radius
  `r + 0.8 × k` and the height `0.25 × (k + 1)`, where `r` is 1.2 m more than the radius of the
  last instrumental row. The singers fill level 0 up to 160°, then level 1, then level 2. If
  three levels are not enough, all levels get more radius until the singers fit.
- A row with no players drops out, and the rows behind it move forward.

| Row | Sections, from left to right |
|---|---|
| 0 | violins (first seat), violas |
| 1 | violins (second and later seats), cellos |
| 2 | flutes, oboes, clarinets, bassoons, contrabasses |
| 3 | harp, percussion, timpani, horns, trumpets, trombones, tuba |
| 4 | choir, on the risers |

The piano stands outside the arcs. Its center is 2.0 m to the left of the podium center and
0.8 m toward the front. Its long axis runs along x, with the keyboard at the left end. The
pianist sits on the bench to the left of the keyboard and faces +x, so the conductor is on the
right side of the pianist, as in a concerto. The pianist turns the head to the conductor for
cues.

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
| oboe | thin dark tube with a small bell | in front of the mouth, 30° down | chair |
| clarinet | light tube with dark rings and a bell | in front of the mouth, 25° down | chair |
| bassoon | tall wooden tube with a bocal | diagonal across the body | chair |
| horn | coiled tube with a bell | in the lap, right hand in the bell | chair |
| trumpet | tube with a forward bell | horizontal, forward | chair |
| trombone | tube with a slide and a bell | forward; the slide moves with the pitch | chair |
| tuba | large tube with an upward bell | in the lap | chair |
| timpani | two to four kettles, by the pitch range of the file | two mallets | stands |
| percussion | bass drum on a stand, snare on a stand, a pair of cymbals, a triangle, a tambourine, and a xylophone for the mallet programs | two mallets, or the instrument in the hands | stands |
| choir | a music folder | both hands | stands on the risers |
| conductor | baton | right hand | stands on the podium |

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

## 5. Animation

### 5.1 Pose function

The pose of each animal is a **pure function** of its inputs. The app keeps no state that events
change. Thus seek, pause, and speed changes are always correct, and the animation cannot drift
from the audio.

```typescript
/** The play state. It changes only on play, pause, and stop. */
interface Transport {
  playing: boolean;
  /** Wall clock seconds of the last play, pause, or stop. */
  changedAtWall: number;
}

/** The mute and solo result of one seat (6.6). */
interface SeatAudibility {
  audible: boolean;
  /** Wall clock seconds of the last change. */
  changedAtWall: number;
}

/** The pose of one animal for one frame. */
interface AnimalPose {
  /** One quaternion (x, y, z, w) for each bone, in the order of `BoneName` (4.7). */
  rotations: Float32Array;
  /** The offset of the root bone, for the sway. */
  rootOffset: readonly [number, number, number];
  /** 0 is open eyes, 1 is closed eyes. The eye bones scale on y by `1 - blink`. */
  blink: number;
}

/** The poses of the scene for one frame. */
interface ScenePose {
  /** One entry for each player, in the order of the seats, then of the players in a seat. */
  players: AnimalPose[];
  conductor: AnimalPose;
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
  }[];
  stands: readonly { position: Vec3; facing: number }[];
  risers: readonly { level: number; radius: number; height: number }[];
}

/** Pure. Calculates the positions of 4.5 for a score. */
declare function layoutScene(score: Score): SceneLayout;

/** Pure. Calculates the poses of all players and of the conductor. */
declare function poseAt(
  score: Score,
  layout: SceneLayout,
  songTime: number,
  wallTime: number,
  transport: Transport,
  /** One entry for each seat of `score.seats`. */
  audibility: readonly SeatAudibility[],
  seed: number,
): ScenePose;
```

`poseAt()` also calculates the IK targets of 4.7 and solves the arms, so the scene only copies
the rotations to the bones. The IK targets, the looks at the conductor, and the cues use the
positions of `layout`. The app calls `layoutScene()` one time for each `Score`.

The pose has three layers:

| Layer | Clock | Motion |
|---|---|---|
| Note | song time | Bow strokes, fingers, breath, mallets, hands (5.3) |
| Beat | song time | A small sway with the beat, and the conductor (5.4) |
| Idle | wall clock time | Breath, eye blinks, looks at the conductor |

The idle layer uses the wall clock time, so the animals stay alive while the music stops.

### 5.2 Rest pose

- Before the first play, the players are in the rest pose. A real orchestra also lifts the
  instruments only when the music starts.
- If the music stops for more than 3 s, the players lower their instruments.
- When play starts, the players lift their instruments in 0.3 s. The audio does not wait.
- The rest pose comes from `transport`, so the pose function still keeps no state.

### 5.3 Instrument motion

- Bowed strings: the bow changes direction on each note. The bow speed comes from the note
  length. The left hand moves along the neck with the pitch.
- Pizzicato plucks the string. Tremolo makes short fast strokes.
- Woodwinds: the player breathes in before a phrase. The fingers move on each note.
- Brass: the player breathes in before a phrase. The trombone slide follows the pitch.
- Mallets and percussion: the mallet lifts before the note and strikes at the note start.
- Piano: the hands move to the key position. The left hand plays low notes and the right hand
  plays high notes.
- Choir: the beak or mouth opens with each note, and the singer sways.
- The motion starts 100 to 400 ms before the note, by the action. This is possible because the
  app reads the full file first.
- Each player has a small seeded offset in timing (about 20 ms) and in amplitude. Thus players
  that play in unison do not move as copies.
- The loudness for the size of a gesture is the velocity, multiplied by CC 7 (volume) and CC 11
  (expression).
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
- The size of the gestures follows the loudness of all notes.
- The left hand cues a section just before it plays again after a long rest. A long rest is at
  least two bars.
- If a file has no time signature or tempo events, the MIDI defaults apply: 4/4 at 120 BPM.

### 5.5 Silent seats

A muted seat, or a seat that a solo makes silent, rests: its instruments go down, and only the
idle motion continues. Thus what the user sees agrees with what the user hears. The instruments
go down in 0.6 s after the change, and come up in 0.3 s when the seat sounds again. The pose
function reads the change time from `SeatAudibility`.

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
  or its fallback in bank 0, before it fetches a file.

### 6.3 Load flow

The research measured the sample decode: it happens at the first note of each sample, on the
audio thread. One decode takes 0.64 ms (median) to 3.78 ms (max), but one audio block has only
2.67 ms. Thus the app decodes all samples before play.

```text
the file loads (demo 1: right after the first frame)
   │
   v
main thread: parse the file -> Score -> list of presets
   │ fetch each preset file: sf/<bank>/<program>.sf3
   v
Web Worker: spessasynth_core converts each SF3 file to a PCM SF2 ── cache for the session
   │ transfer the PCM buffers (transferable objects, no copy)
   v
AudioWorklet: add all banks (each add resets the synth)
   │
   v
play is enabled
```

- The Worker works while the AudioContext is still suspended. Thus demo 1 is ready before the
  first click.
- The cache keeps the decoded presets for the session. A switch between demos that share presets
  does not decode them again.
- Each bank add resets the synth. Thus all banks load before play starts, and play waits for the
  load (2.4).
- Cost: core loads two times (in the Worker and in the worklet). This adds about 100 KB after the
  first frame.
- Cost: the PCM data uses 4 to 5 times more memory than the SF3 data, about 7 MB for a usual
  piece.

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

### 6.5 Seek, pause, resume, and unmute

- At a seek, the processor restores the program, the bank, the controllers, and the pitch bend at
  the seek point.
- A held note is a note that starts before the seek point and continues after it.
  - The processor starts held notes again for instruments with a long sound: bowed strings,
    woodwinds, brass, choir, and organ.
  - It does not start held notes again for instruments with a sound that decays: piano, harp,
    pizzicato, mallets, and percussion.
- The same rule applies when play continues after a pause and when a seat is unmuted.
- A speed change takes effect at the next block.

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
- With Bluetooth headphones, the latency is often more than 100 ms. Thus the correct clock is
  necessary for the sync of the animation.

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
| `score/` | Apply the rules of section 3, and build the `Score`. | yes | first download |
| `pose/` | `poseAt()` (5.1). | yes | first download |
| `models/` | Species parameters, the mesh generator, and `layoutScene()`. It gives geometry data and positions. | yes | first download |
| `scene/` | Three.js: stage, lights, camera, quality tiers, poses applied to bones. | no | first download |
| `audio/` | The `Player`, the Worker, and the worklet processor. | no (the block scheduler is pure) | lazy |
| `app/`, `ui/` | Load flow, transport, seat list, URL hash, settings. | no | first download |
| `tools/` | Build scripts: SF3 split, demo changes, size check, license file. | no | build only |

A second entry, `gallery.html`, shows each species with each instrument. It has a time slider and
a test note list, so that a person can examine the models and the motion with no MIDI file. The
gallery is deployed. It is a separate entry, so it does not add to the first download of the
player.

### 7.2 First download

The size check sums the gzip sizes of these files:

- `index.html`.
- The CSS.
- The entry JS chunk, with all its static imports.
- The demo 1 MIDI file (14 KB after gzip).

The check does not count the audio chunk, the Worker, the worklet, the SF3 files, `gallery.html`
and its chunks, and the other demo files. The app loads the other demos when the user selects
them.

- The limit is 1 MB. CI fails above the limit and prints the size on each run.
- The estimate is about 250 KB: about 150 KB for Three.js, 80 KB for our code, and the demo file.
  Nobody has measured these values yet.

### 7.3 Third-party licenses

The build writes a third-party license file for Three.js (MIT), spessasynth_core (Apache-2.0),
stb-vorbis (Apache-2.0), and GeneralUser GS. The credits panel links to it, and also lists the
source of each demo (8.1).

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

- The length is `durationSec` (the last note-off), rounded down to whole seconds.
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

For a dropped file, the title is `Score.sequenceName` if it has a letter, else the file name with
no extension. The second line shows the file name. A dropped file has no credit line.

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
- `docs/research/scripts/musescore/`: the pipeline scripts (Python, standard library only).
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

The steps put the largest risks first. Each step has its work, a "done" criterion, and a status.
A step is done only when its criterion is true. A step with a review is done only after the user
approves it (9.8). Update the status in the commit that finishes the step.

| Step | Status |
|---|---|
| 0. Project skeleton | not started |
| 1. Audio spike | not started |
| 2. MIDI and score | not started |
| 3. Scene and one player | not started |
| 4. Models and gallery | not started |
| 5. Motion | not started |
| 6. UI | not started |
| 7. Demo build, tests, and deploy | not started |

**Step 0. Project skeleton**

- Work: Vite, TypeScript with the compiler options of `AGENTS.md`, Vitest, Oxlint, oxfmt, the size
  check, the third-party license file, and the CI workflow. `.oxlintrc.json`, `.oxfmtrc.json`, and
  the anti-slop plugin are already in the repository. Install the current version of `oxlint`
  and the same version of `@oxlint/plugins` as development dependencies.
- Done when: a clean clone runs `pnpm install`, then `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm format:check`, `pnpm build`, and `pnpm size` with no error. CI runs the same commands.
  `pnpm dev` shows an empty page with the background gradient of 4.5.

**Step 1. Audio spike**

- Work: the worklet with spessasynth_core, the Worker decode, the SF3 split, and demo 1 in a bare
  page. The spike checks these items:
  - Vite can bundle the worklet and the Worker.
  - There is no dropout at the first note of a sample after the Worker decode.
  - The clock (6.7) in Chrome, Firefox, and Safari.
  - A suspended AudioContext delivers messages to the worklet. If it does not, the banks go to
    the worklet at the first click.
  - The behavior in Safari and in a hidden tab.
- Done when: the spike page plays demo 1 to the end in Chrome, Firefox, and Safari on the
  development Mac with no dropout. The targets of step 1 in 9.7 pass. A new report in
  `docs/research/` gives the result of each check, or the reason for each miss.
- Review: the user reads the report.

**Step 2. MIDI and score**

- Work: `midi/` and `score/`, and the script that applies `demos/patches.json` (8.3). The demo
  tests need the changed files.
- Done when: each rule of section 3 has at least one Vitest test that fails without the rule. The
  demo tests of 8.5 pass for all six demos. The score target of 9.7 passes.

**Step 3. Scene and one player**

- Work: the stage, the light, the beam, the camera, and one rabbit with a violin. The bow moves
  in sync with the first violins of demo 1.
- Done when: a screenshot of the default view at 1440 × 900 has the same composition as the
  reference: the stage as a diamond shape, the beam from above, the dark background, and the
  view from behind the conductor. The clock target of 9.7 passes.
- Review: the user compares the screenshot with the reference.

**Step 4. Models and gallery**

- Work: `models/` for all species and instruments of 4.3, 4.5, and 4.6, the gallery page, and
  the scene layout: the stage origin, the stage size, the seat geometry, the risers, and the
  default view for a `Score` (4.5).
- Done when: the gallery shows each species with the instrument of its section. The triangle
  budget test passes. The scene of each demo has its seats and stage size from 4.5, with no
  overlap of chairs.
- Review: the user examines screenshots of the gallery.

**Step 5. Motion**

- Work: `pose/` for all instrument families, the idle motion, the rest pose, and the conductor.
  Also the app wiring that the review needs: load a demo, build the `Score`, build the scene,
  and play the audio with the poses in sync. A temporary play button is enough until step 6.
  Also a script in `tools/` that writes `perf-60.mid`: 60 s of notes that give all sections at
  their caps, 60 players in total. The frame target of 9.7 uses this file.
- Done when: the Vitest tests of `pose/` pass, and the pose and frame targets of 9.7 pass.
- Review: the user examines a screen recording of demo 1 and of the Boulanger demo.

**Step 6. UI**

- Work: the transport bar, the drawer, the seat list, the demo list, the settings, the credits,
  the quality tiers, "Reset view", the drop of a file, the URL hash, and the messages of 2.8.
- Done when: the UI matches [`prototype/ui.html`](prototype/ui.html) at 1440 × 900 and at
  390 × 844. A keyboard alone can reach and use each control.
- Review: the user examines screenshots at both sizes.

**Step 7. Demo build, tests, and deploy**

- Work: the demo build (the changed files of step 2 go into the site), the third-party license
  file, the Playwright tests, and the Pages workflow.
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
| Audio render | at most 1.3 ms for each 128-frame block (half of the budget) for each demo | Node: an offline render of each demo with the block scheduler and spessasynth_core, timed for each block | 1 |
| Frame time | high tier, `perf-60.mid` (60 players), development Mac: GPU time and main-thread time each at most 4 ms for 95% of the frames over 10 s | Chrome DevTools performance trace | 5 |
| Load | the presets of demo 1 load and decode in at most 2 s on a 50 Mbit/s connection | DevTools network throttle | 1 |
| First sound | at most 300 ms from the click on play to the first sound, when demo 1 is ready | `performance.now()` at the click, against the first clock anchor plus the output latency | 1 |
| Memory | at most 100 MB of decoded samples for each demo | the Worker reports the PCM size | 1 |

The frame target leaves a margin of about 4 times for an integrated GPU of the Intel Iris Xe class.
The manual release test (9.4) checks a real phone at the low tier: demo 1 must play at 30 fps or
more.

### 9.8 Reviews

A step with a review ends with these actions:

1. Commit the work of the step.
2. Take the screenshots with Playwright at 1440 × 900 and at 390 × 844. For a motion step, also
   record a GIF of 10 s.
3. Show the files to the user, and name the targets of the step with their results.
4. Wait for the approval of the user. Make each requested change as a commit in the same step.

Start the next step only after the approval.

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
| The light and the fog scale with the stage size | 4.5 |
| The steps 0.4 m to the left of the podium, the floor, and the conductor stand | 4.5 |
| The bone list and the IK rule | 4.7 |
| The pose types and the audibility input of `poseAt()` | 5.1 |
| The conductor pattern for each time signature, with its tempo thresholds | 5.4 |
| The rest and lift times of a silent seat (0.6 s and 0.3 s) | 5.5 |
| The UI tokens, the control sizes, the seat texts, and the message texts | 2.8 |
| The "small screen" signal and the start tier of each device | 2.6 |
| The demo titles, composers, credit lines, and expected sections | 8.2 |
| The targets and their numbers (for example the clock within 20 ms, the first sound within 300 ms) | 9.7 |
| A review by the user after steps 1, 3, 4, 5, and 6 | 9.5, 9.8 |
