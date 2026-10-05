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
  | 'timpani' | 'percussion' | 'choir';

type Technique = 'normal' | 'pizzicato' | 'tremolo';

/** One group of animals of one section (3.7). */
interface Seat {
  section: SectionId;
  /** The (port, channel) pairs that feed this seat. A merge (3.7) gives more than one pair. */
  sources: { port: number; channel: number }[];
  /** 0 for the first seat of its section. Selects the species variant (4.3). */
  indexInSection: number;
  /** 1 to the cap of the section (3.8). */
  playerCount: number;
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
  /** Compound meters use dotted beats, so 6/8 gives 2. */
  beatsInBar: 2 | 3 | 4 | 6;
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
  /** The seat of a note event, or -1 for an event that applies to the full channel. */
  seatIndex: number;
}

interface Score {
  durationSec: number;
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
| 44, 45 | Tremolo, pizzicato | the previous section of the channel, or divided by pitch if there is none |
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
| 55, 80-87, 96-103, 120-127 | Orchestra hit, synth leads, effects | sound only, no animal |

- "Divided by pitch" uses fixed pitch bands. For example, a low note of a string ensemble goes to
  a contrabass player, and a high note goes to a violinist. Section 10 lists the bands as open.
- Programs 44 and 45 give the technique `tremolo` and `pizzicato`. All other programs give
  `normal`.
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
  trumpet 3, trombone 3, tuba 1, choir 8. The total is a maximum of 60 players.
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
  ears: 'long' | 'pointed' | 'round' | 'large-flap' | 'small' | 'none';
  snout: 'short' | 'long' | 'trunk' | 'flat-nose' | 'horn' | 'beak';
  tail: 'none' | 'bushy' | 'ringed' | 'thin' | 'flat';
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
- The penguins have black and white bodies, which look like choir robes. They use `ears: 'none'`
  and `snout: 'beak'`.

### 4.4 Models

- Code builds all animals and all instruments from low-poly shapes. There are no model files and
  no texture files.
- Each player is one `SkinnedMesh`. The generator merges the body, the instrument, and the bow
  into one mesh. Each vertex follows exactly one bone, so each part is rigid and its flat faces
  stay flat.
- This gives about one draw call for each player, plus one for the shadow pass. One `Mesh` for
  each part would give about 25 draw calls for each animal, which is too many for an integrated
  GPU.
- The static props (the stage, the chairs, the stands, and the podium) merge into a few meshes.

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

/**
 * Pure. Returns the bone rotations of all players and of the conductor.
 * The shape of ScenePose comes in step 3 of the work order (9.5).
 */
declare function poseAt(
  score: Score,
  songTime: number,
  wallTime: number,
  transport: Transport,
  seed: number,
): ScenePose;
```

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

- The bear uses real beat patterns for 2, 3, 4, and 6 beats in a bar. The patterns come from the
  time signature events and the tempo map.
- Fast compound meters (6/8, 9/8, 12/8) use dotted beats: 2, 3, or 4 beats in a bar.
- The size of the gestures follows the loudness of all notes.
- The left hand cues a section just before it plays again after a long rest. A long rest is at
  least two bars.
- If a file has no time signature or tempo events, the MIDI defaults apply: 4/4 at 120 BPM.

### 5.5 Silent seats

A muted seat, or a seat that a solo makes silent, rests: its instruments go down, and only the
idle motion continues. Thus what the user sees agrees with what the user hears.

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

- The SoundFont is GeneralUser GS 2.0.3 as SF3 (8.4 MB). The repository holds one copy in
  `assets/`, with no Git LFS.
- Its license permits use in software and permits our own copy. It asks us not to link to the
  download files of the author, so the site serves its own copy.
- A build script splits the SF3 into one file for each preset, at `sf/<bank>/<program>.sf3`. Drum
  kits use bank 128. The split keeps the Ogg data and the loop points.
- A usual orchestral file loads 1 to 3 MB of preset files.
- The credits panel names GeneralUser GS and links to its license (7.3).

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
| `models/` | Species parameters and the mesh generator. It gives geometry data. | yes | first download |
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
| 2 | `grieg-ase` | Grieg, Åse's Death | Mutopia 247 | public domain | 3:31 | String orchestra |
| 3 | `mozart-k488` | Mozart, Piano Concerto 23, mvt 2 | Mutopia 2229 | public domain | 7:00 | Piano, woodwinds, horns, pizzicato |
| 4 | `mozart-k315` | Mozart, Andante K. 315 | Mutopia 344 | public domain | 4:14 | Solo flute |
| 5 | `handel-hallelujah` | Handel, Hallelujah | Mutopia 459 | public domain | 3:06 | Choir, trumpets, timpani |
| 6 | `boulanger-matin` | Boulanger, D'un matin de printemps | OpenScore | CC0 | 4:41 | Percussion, harp, celesta, trombones, tuba |

- The rule for the length was 2 to 5 minutes. Rows 1 and 3 are accepted exceptions.
- Demo 1 is the first screen (2.2).

### 8.3 Changes to the files

Some Mutopia files have wrong programs. The app repairs them at build time:

- Demo 1: the horn and trumpet tracks use program 69 (English horn). The horn tracks change to 60
  and the trumpet tracks change to 56.
- Demo 5: the four choir tracks use woodwind programs. They change to 52 (Choir Aahs).

Each change names a track by its index. A change by program cannot work here: the Hallelujah file
has a real oboe and a real bassoon, and its choir tracks also use the oboe and bassoon programs.

- `demos/src/` holds the original files.
- `demos/patches.json` holds the changes.
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

The repository gets these files in step 7 of the work order:

- The score with the lyrics removed (CC0 only).
- The pipeline scripts in `tools/musescore/` (Python, standard library only), with a README. The
  research copies are in `research/scripts/musescore/`.
- The result file in `demos/src/`.

CI does not run MuseScore.

### 8.5 Demo tests

A Vitest test builds the `Score` of each demo and checks three things:

- The demo has no more than 60 players.
- The expected sections are present.
- No seat comes from a wrong program.

## 9. Process

### 9.1 Repository

- Git, with the branch `main`. Each step of the work has many fine-grained commits.
- The code license is MIT.
- The user creates the empty GitHub repository (or installs `gh`) before the first deploy. Until
  then, all commits stay local.

### 9.2 CI

GitHub Actions runs these checks:

| Check | Blocks a merge |
|---|---|
| Type check | yes |
| Oxlint, with the setup of the `install-anti-slop` skill and the rules of `AGENTS.md` | yes |
| oxfmt format check | yes |
| Vitest | yes |
| Size check (7.2) | yes |
| Playwright in Chromium | yes |
| Playwright in WebKit and Firefox | no, until the runs are stable |

Headless WebKit and Firefox on Linux have weak support for WebGL2 and for audio output. Thus their
runs do not block a merge.

A push to `main` builds with pnpm and deploys to GitHub Pages. Vite uses the repository name
(`orchestra`) as its base path.

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

The steps put the largest risks first.

0. Project skeleton: Vite, TypeScript with the compiler options of `AGENTS.md`, Vitest, Oxlint,
   oxfmt, the size check, and the CI workflow.
1. Audio spike: the worklet with spessasynth_core, the Worker decode, the SF3 split, and one demo
   in a bare page. The spike checks these items:
   - Vite can bundle the worklet and the Worker.
   - There is no dropout at the first note of a sample after the Worker decode.
   - The clock (6.7) in Chrome, Firefox, and Safari.
   - A suspended AudioContext delivers messages to the worklet. If it does not, the banks go to
     the worklet at the first click.
   - The behavior in Safari.
   - The behavior in a hidden tab.
2. `midi/` and `score/`, with Vitest tests for all rules of section 3.
3. Scene: the stage, the lights, the camera, and one rabbit with a violin. Its bow moves in sync
   with the audio.
4. `models/`: all species and instruments, and the gallery page.
5. `pose/`: all instrument families, the idle motion, the rest pose, and the conductor.
6. UI: transport, seat list, demo list, credits, settings, and quality tiers.
7. Demos with the file changes and the Boulanger file. Then the Playwright tests and the Pages
   workflow.

### 9.6 Docs

All docs, comments, commit messages, and UI text use ASD-STE100 Simplified Technical English. The
project `AGENTS.md` holds the short rules for coding agents and links to this document.

## 10. Open details

These details were not decided in the design session. Each has a proposal. Decide each one in the
step that needs it.

| Detail | Step | Proposal |
|---|---|---|
| The pitch bands for "divided by pitch" (3.5) | 2 | Use the usual ranges of the instruments, with the boundaries at the lowest note of the higher instrument. |
| Conductor patterns for other meters, for example 5/4, 7/8, and fast 3/8 (5.4) | 5 | 5/4 and 7/8 use 2 + 3 or 2 + 2 + 3 groups. Fast 3/8 uses one beat in a bar. |
| The species of a third or later violin seat (4.3) | 4 | Rabbits and foxes alternate. |
| The conductor and the cap of 60 (3.8) | 2 | The cap counts players only, so the conductor is extra. |
| What to remove when a file needs more than 60 players (3.8) | 2 | Lower the string and choir sizes first, down to one player for each part. |
| The "small screen" signal for the start tier (2.6) | 6 | The shorter side of the viewport is less than 600 CSS pixels. |
| The shape of `ScenePose` (5.1) | 3 | One rotation for each bone, in typed arrays. |
