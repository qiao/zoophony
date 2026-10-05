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
| 44, 45 | Tremolo, pizzicato | the section that the channel used before; if none, divided by pitch |
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
  (port, channel) pairs that map to the same section, these pairs form one seat. Reason: MuseScore
  puts each articulation of a part (arco, pizzicato, tremolo, mute) on its own channel. Format 0
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
stage size follows the player count. Thus a string quartet looks like a small group, not four
animals far apart on a large stage.

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
