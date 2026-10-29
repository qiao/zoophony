# 3. From MIDI to seats

## 3.1 Pipeline

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

## 3.2 Data model

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
  /**
   * The seat at the front left of the conductor (3.8, 4.2): the piano seat, else the seat that
   * is clearly the soloist. `null` if no seat is the soloist.
   */
  soloist: number | null;
  /**
   * The choir seat of the vocal soloists, such as the four soloists of the Ode to Joy (3.8).
   * They stand in front of the choir (4.5). `null` if no seat passes the rule.
   */
  vocalSoloists: number | null;
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

## 3.3 File rules

- A file that is not a valid Standard MIDI File, or a file of format 2: the app shows an error
  message and keeps the current piece.
- A file of more than 4 MB (4,000,000 bytes): the app refuses the file with a message. It
  refuses the file before it reads the file into the memory.
- A file that the page cannot read, for example a dropped folder: the app shows the message of a
  file that is not valid (`readScoreFile()` in `app/file-rules.ts`).
- A refused file also keeps a demo that still loads. A selection of a demo while the page reads a
  file replaces the file.
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

## 3.4 Ports and channels

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

## 3.5 Program map

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

## 3.6 Channel 10

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

## 3.7 Seats

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

## 3.8 Players

The player count of a seat depends on its section and on the file.

| Seat | Players |
|---|---|
| Woodwinds, brass | One player for each simultaneous note (the max polyphony of the seat). |
| Piano, harp, timpani, mallets | One player plays all notes. |
| Channel 10 percussion | One player for each key group that the file uses (3.6), at most 4, in this order: bass drum, snare drum, cymbals, small percussion. |
| Strings and choir, orchestral file | A base section size: violin 4, viola 3, cello 3, contrabass 2, choir 8. All players play the same note. A chord divides the players across the notes (divisi), highest note first. The soloist (below) has one player. |
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

**Soloist.** The user decided on 2026-10-06 that a seat that is clearly the soloist sits at the
front left of the conductor, as in a real concerto (UX audit 2026-10-05, AM3). In K. 315, the
solo flute sat in the woodwind row behind a stand. `Score.soloist` holds the seat.
`findSoloist()` in `score/soloist.ts` finds it with the player counts of the size rule, before
the removal above 60 players. The soloist then gets one player:

- A **piano seat** with players is the soloist: a seat of the piano section with a program of
  a piano, 0 to 5 (the acoustic and the electric pianos). A piano with an orchestra has the
  layout of a piano concerto (4.2). The harpsichord (6), the clavinet (7), the celesta (8), and
  the organs (16 to 23) also go to the piano section, but in an orchestra they play color or
  continuo. Such a keyboard is the soloist only by the test below, as in a harpsichord concerto.
  Else it sits in the orchestra, at the left of the harp (4.2). Until the second UX audit
  (2026-10-06, N1), each piano seat was the soloist. Then the case of the celesta of the
  Boulanger demo and of the harpsichord of the Bach demo stood in front of the first violins,
  and covered 30% to 45% of their solo shots. Neither one passes the test: the celesta sounds
  in 0.14 of the piece, and the harpsichord is above the orchestra in 0.00 of its time.
- Else a **candidate** is a seat of a section that can carry a solo (not the timpani, the
  percussion, or the choir), with at least three other seats with players, and one of these:
  - The size rule gives it one player, and no other seat of its section has players. A seat of
    several string desks or of 8 singers is thus no soloist by this clause.
  - It is a **solo line** beside the seats of its section: one voice (one player for each
    simultaneous note gives one player), on channels that feed no other seat. A string ensemble
    divided by pitch thus gives no solo line. The first violins of a string quartet and of a
    string orchestra are also such lines, so a solo line must also be **exposed**: in 0.75 of
    its sounding time or more, no other seat of its section sounds, or its velocity is at least
    1.2 times their highest velocity. The second UX audit (2026-10-06, N10) found a solo violin
    on its own channel, at the velocity 112 above a string ensemble, that played as 4 rabbits.
- The rule reads the notes on a grid of 0.1 s, from the first note of the piece to its end. A
  candidate is **clearly the soloist** when all of these are true:
  - It sounds in 0.5 of the piece or more.
  - In 0.78 of its sounding time or more, it is above the orchestra: its highest key is above
    each key of the other pitched seats, or its velocity is at least 1.2 times the highest
    velocity of the other seats. Thus a low soloist, such as a bassoon, can lead by loudness.
  - In 0.6 of its sounding time or more, two or more other seats sound with it: the orchestra
    accompanies it.
- Exactly one candidate must pass. Two candidates that pass, as in a double concerto, give no
  soloist.
- The share "above the orchestra" is high enough that a concertino of several equal soloists,
  as in Brandenburg Concerto 2, gives no single soloist. Thus the first violin desk stays clear
  in all section sizes, and the K. 315 flute stays the soloist.
- With the three section sizes, the demos give: K. 315 the flute (it sounds in 0.79 of the
  piece, above the orchestra in 0.91 of its time, and with the orchestra in 0.91), and the other
  thirteen demos no soloist. The violin concertino of the second audit (`score/test-audit-files.ts`)
  gives its solo violin, with one player, and the violins of the string ensemble keep 4 players.
  With "One per part", the first violins of Bach have one player and lead in 0.53 of their time,
  and the two other violin seats play as loud as they do. No other candidate of a demo passes.
  The K. 315 flute plays softer than the strings in the file, so the register alone finds it.

**Vocal soloists.** A choral work has solo singers beside the choir, such as the soprano, the
alto, the tenor, and the bass of the Ode to Joy. Until 2026-10-06, the Beethoven 9 demo had them
on their own channel. Until the second UX audit (2026-10-06, N8), that channel sang as 8
penguins in the row of the choir, and the baritone recitative showed a row of identical
penguins. The excerpt of the demo changed on 2026-10-06 (8.2) and has no soloists, so no demo
has vocal soloists. The rule stays for a file of the user.
`findVocalSoloists()` in `score/vocal-soloists.ts` finds them with the player counts of the
size rule, on a grid of 0.1 s:

- A candidate is a choir seat with at most four voices, beside another choir seat with players.
- It sings with no other choir seat in 0.75 of its sounding time or more.
- One voice sings alone in 0.3 of its sounding time or more, as in a recitative.
- Exactly one candidate must pass. `Score.vocalSoloists` holds it. Its seat gets one singer for
  each voice, as with "One per part", and the singers stand in front of the choir (4.5).
- In the Beethoven 9 demo until 2026-10-06, the channel of the soloists sang alone in 0.99 of
  its time, and one voice in 0.57. The channel of the choir sang alone in 0.98 of its time, but
  one voice in only 0.04. The four voices of the choir test file (`models/test-choir.ts`) always
  sing together. `vocalSoloistsFile()` of `score/test-vocal-soloists.ts` is now the test input
  of the rule.
