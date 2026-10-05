# MuseScore MIDI export of "D'un matin de printemps"

Score: Lili Boulanger, *D'un matin de printemps*, OpenScore Orchestra
("Score: CC0 1.0 Universal; Annotations: CC-By-SA"), file format 4.70.
Tool: MuseScore 4.7.5 (Homebrew cask `musescore` 4.7.5.260831071).
Date of the tests: 2026-10-04, macOS (Darwin 25.5.0, arm64).

Work folder: `scratchpad/musescore/`. The project folder
`/Users/xueqiaoxu/proj/orchestra` was not changed.

## Short answers

| Question | Answer |
|---|---|
| 1. CLI, headless | Yes. `"/Applications/MuseScore 4.app/Contents/MacOS/mscore" -o out.mid in.mscz` writes the file in about 4.5 s and opens no window. The exit code is not reliable: most runs end with 134 (a crash after the export is complete). Check the output file, not the exit code. |
| 2. Default export | SMF format 1, 44 tracks (one for each staff), 480 ticks per quarter note. 5 MIDI ports (83 FF 21 events, values 0 to 4) and 43 port/channel pairs with notes. Channel 10 holds only the 3 drum parts, but on 3 different ports. Articulations use separate MIDI channels. All 76 program changes are at tick 0. Duration 280.67 s (4:40.7) to the last event. |
| 3. Annotations | The annotations are the 87 Lyrics (`a`, `b`, `c`, `x`). They become 88 FF 05 lyric events. Staff text is not exported (no FF 01). Rehearsal marks become FF 06 markers. Removing all `<Lyrics>` elements changes only the FF 05 events (and one end-of-track tick). |
| 4. 16 channels with the CLI | The layout is stored in `<midiPort>` and `<midiChannel>` in each `<Channel>`. A script can set it and the export follows it. But articulation channels on the channel of their part give duplicate notes (2 or 3 times) and a wrong program, and MuseScore never writes a program change at an articulation switch. A port value of 128 or more removes all FF 21 events (signed char). The best CLI-only result fits in 16 channels but loses the articulation switches and cuts notes at shared keys. |
| 5. Alternative | Export with a "unique" layout (port = part, channel = articulation), then post-process the MIDI file. The script `remap_midi.py` makes a 16-channel file with no FF 21 events, program changes at articulation switches, 0 missed attacks, and 0 s of lost sound. |

Melodic channels needed: 15 (plus channel 10 for percussion). It fits, with no
free channel.

## 1. CLI export

### Command

The cask installs the app and a wrapper `/opt/homebrew/bin/mscore`. The
wrapper runs the binary in the app bundle:

```bash
"/Applications/MuseScore 4.app/Contents/MacOS/mscore" -o out.mid in.mscz
# same, through the Homebrew wrapper:
mscore -o out.mid in.mscz
```

The install did not ask for a password and needed no GUI step.

### Facts

- The export runs as a console application. The log shows
  `ConverterController::convertFile | in: ..., out: ...` and
  `ConsoleApp::finish`. No window opens.
- Time: about 4.5 s for this score (4 s CPU).
- The output is deterministic. Many exports of one file gave byte-identical
  MIDI files (MD5 `83b3af473da6165d7f7a4bc466f3e737` for the default export).
- **Exit code.** In 15 of 20 runs, the process ended with exit code 134 and
  this message:
  `libc++abi: terminating due to uncaught exception of type std::__1::system_error: mutex lock failed: Invalid argument`.
  The MuseScore log of the same run ends with `main | Goodbye!! code: 0`, and
  the MIDI file is complete and identical. The crash occurs in process teardown,
  after the export. A pipeline must check the output file (it exists, it parses,
  each track ends with FF 2F) and must not trust the exit code.
- `QT_QPA_PLATFORM=offscreen` does not work. The bundle has only the `cocoa`
  plugin: `qt.qpa.plugin: Could not find the Qt platform plugin "offscreen" in ""`.
  The run then writes no file. The plain command works from this terminal
  session. I did not test a session with no logged-in user (for example SSH
  with no window server).
- Side effects outside the work folder: MuseScore writes logs to
  `~/Library/Application Support/MuseScore/MuseScore4/logs/` and crash dumps to
  `.../logs/dumps/` (17 dump files after these tests, 7.6 MB in total). I did
  not delete them.
- MIDI export settings in the binary: `io/midi/expandRepeats` and
  `io/midi/exportRPNs` (on by default). The CLI has `--unroll-repeats`. The
  CLI has no option for the channel layout, the lyrics, or CC 2.

## 2. The default export

File: `musescore/matin-default.mid` (558 965 bytes).

### Structure

```text
  .mscz score                         MIDI file (SMF format 1, 480 tpq)
  41 parts, 44 staves                 44 tracks, one for each staff
 +-----------------------+           +-----------------------------------+
 | Part "Piccolo"        |  staff 1  | T0  Piccolo + tempo, time sig,    |
 |                       | --------> |     key sig, markers (FF 06)      |
 | Part "Celesta"        |  staff 26 | T25 Celesta (setup + notes)       |
 |   (2 staves)          |  staff 27 | T26 Celesta (notes only)          |
 | ...                   |           | ...                               |
 +-----------------------+           +-----------------------------------+
```

- **Format and size:** SMF format 1, 44 tracks, division 480 ticks per quarter
  note. There is no separate conductor track. Track 0 (Piccolo) holds the tempo
  map (62 FF 51 events), the 7 time signatures, and the 14 markers.
- **Tracks:** one track for each staff, in score order. The score has 41 parts
  (not 42). Celesta, Harp, and the second Viola part (part 27) have 2 staves.
  Only the top staff of a part has the setup events (program, volume, pan).
- **Track names (FF 03)** are the part track names, not the long names. Many
  are equal: "Violin" is the name of 5 tracks (solo violin, Violin 1, Violin 2
  solo, Violin 2, hidden violin), "Violins" of 3, "Viola" of 3. **Track names
  cannot identify a section.** Use the track index: track *i* is staff *i*.
- **Hidden part:** the last part (short name `Vln.`, `<show>0</show>`) is
  exported (track 43). 776 of its 812 notes have `<play>0</play>`. In total 970
  notes in the score have `<play>0</play>`, and the export omits them.

### Ports, channels, and programs

The export writes FF 21 (MIDI port) events with the values 0 to 4. There are
43 port/channel pairs with notes, so the file needs more than 16 channels.

| Track | FF 03 name | Part (short name) | FF 21 | Setup: channel=program | Notes per channel |
|---|---|---|---|---|---|
| 0 | Piccolo | Picc | 0 | 1=72 | 1: 186 |
| 1 | Flute | Fl 1 | 0 | 2=73 | 2: 663 |
| 2 | Flute | Fl 2 | 1 | 2=73 | 2: 623 |
| 3 | Oboe | Ob 1 | 0 | 3=68 | 3: 560 |
| 4 | Oboe | Ob 2 | 2 | 15=68 | 15: 512 |
| 5 | English Horn | E Hn | 0 | 4=69 | 4: 276 |
| 6 | A Clarinet | Cl 1 | 0 | 5=71 | 5: 633 |
| 7 | Clarinet | Cl 2 | 4 | 8=71 | 8: 502 |
| 8 | Bass Clarinet | B Cl | 0 | 6=71 | 6: 180 |
| 9 | Bassoon | Bsn 1 | 0 | 7=70 | 7: 254 |
| 10 | Bassoon | Bsn 2 | 4 | 9=70 | 9: 143 |
| 11 | Bass Sarrusophone | B Sar | 0 | 8=67 | 8: 7 |
| 12 | Horn in F | F Hn 1 | 0 | 9=60 | 9: 185 |
| 13 | Horn in F | F Hn 2 | 2 | 16=60, 5=59 | 16: 126 |
| 14 | Horn in F | F Hn 3 | 0 | 11=60 | 11: 155 |
| 15 | Horn in F | F Hn 4 | 4 | 6=60, 7=59 | 6: 105 |
| 16 | C Trumpet | C Tpt 1 | 0 | 12=56, 13=59 | 12: 238 |
| 17 | Trumpet in C | C Tpt 2 | 4 | 12=56, 13=59 | 12: 244 |
| 18 | Trombone | Tbn 1 | 0 | 16=57 | 16: 34 |
| 19 | Trombone | Tbn 2 | 4 | 14=57, 15=59 | 14: 33 |
| 20 | Tenor Trombone | Tbn 3 | 1 | 1=57 | 1: 38 |
| 21 | Tuba (unspecified) | Tba | 4 | 11=58 | 11: 22 |
| 22 | Cymbal | Cym | 0 | 10=48 | 10: 353 |
| 23 | Tambourine | Tamb | 1 | 10=0 | 10: 103 |
| 24 | Triangle | Tri | 2 | 10=48 | 10: 251 |
| 25 | Celesta | Cel | 1 | 3=8 | 3: 216 |
| 26 | Celesta | Cel | 1 | (none, 2nd staff) | 3: 143 |
| 27 | Harp | Hrp | 1 | 4=46, 5=45, 6=11 | 4: 332 |
| 28 | Harp | Hrp | 1 | (none, 2nd staff) | 4: 185 |
| 29 | Violin | Vln Solo. | 1 | 7=40, 8=45, 9=44 | 7: 57 |
| 30 | Violin | Vln 1 | 1 | 11=40, 12=45, 13=44 | 11: 1369 |
| 31 | Violins | Vln. 1 div(2) | 1 | 14=48, 15=45, 16=44 | 14: 50 |
| 32 | Violins | Vln. 1 div(3) | 4 | 2=48, 3=45, 4=44 | 2: 1 |
| 33 | Violin | Vln. 2 Solo | 2 | 1=40, 2=45, 3=44 | 1: 33 |
| 34 | Violin | Vln 2 | 2 | 4=40, 5=45, 6=44 | 4: 2072, 5: 62 |
| 35 | Violins | Vln 2 div. | 2 | 7=48, 8=45, 9=44 | 7: 78 |
| 36 | Viola | Vla. | 2 | 11=41, 12=45, 13=44 | 11: 40 |
| 37 | Viola | Vla | 0 | 14=41, 15=45, 14=44 | 14: 1414 |
| 38 | Viola | Vla | 0 | (none, 2nd staff) | 14: 59 |
| 39 | Violoncello | Vc. Solo | 3 | 1=42, 2=45, 3=44 | 1: 60 |
| 40 | Violoncello | Vc | 3 | 4=42, 5=45, 6=44 | 4: 703 |
| 41 | Violoncello | Vcs div 2. | 3 | 7=42, 8=45, 9=44 | 7: 98 |
| 42 | Contrabass | Cb | 3 | 11=43, 12=32, 13=44 | 11: 213, 12: 30 |
| 43 | Violin | Vln. (hidden) | 3 | 14=40, 15=45, 16=44 | 14: 35 |

Channels are 1-based. Programs are GM program numbers, 0-based.

### Channel 10 (percussion)

- Only the 3 drum parts use channel 10, but each on its own port: Cymbal
  port 0, Tambourine port 1, Triangle port 2.
- Keys: Cymbal 57 (Crash Cymbal 2, 306 notes) and 81 (Open Triangle, 47 notes);
  Tambourine 54 (103); Triangle 81 (251). Total 707 notes.
- Program changes on channel 10: 48 (Cymbal, Triangle) and 0 (Tambourine). In
  GeneralUser GS (`scratchpad/GeneralUserGS.sf3`), bank 128 preset 48 is
  "Orchestral" and preset 0 is "Standard 1".

### Articulation channels

The export uses **separate MIDI channels** for articulations. It writes **no
program changes** after tick 0.

- Each `<Channel>` of a part (for example `arco`, `pizzicato`, `tremolo`,
  `mute`, harp `staccato`, `flageoletti`) has its own port and channel. Each
  one gets a setup block at tick 0 with its program. All 76 program changes in
  the file are at tick 0.
- A note goes to the channel of the active articulation. The renderer emits
  only notes, controllers, and pitch bends (`exportmidi.cpp` lines 337 to
  356), so an articulation switch is a channel switch.
- **Only a text with a channel name switches the channel.**
  `Score::updateChannel()` (`score.cpp` line 6187) reads `channelName(voice)`
  of each StaffText or PlayTechAnnotation. The MuseScore 4 play technique marks
  ("pizz.", "arco") have no channel name, so the export ignores them. This score
  has 33 "pizz." marks and 34 "arco" marks of this kind, and only 2 StaffText
  items with `<channelSwitch voice="1" name="pizzicato"/>` (Violin 2 bar 113,
  Contrabass bar 68, voice 2 only).
- Result: about 499 notes stand in pizzicato passages, but only 92 notes go to a
  pizzicato channel (Violin 2: 62, Contrabass: 30). No "arco" switch exists, so
  voice 2 stays on the pizzicato channel up to the end. Some of the 92 notes are
  in passages that the score marks "arco" (Violin 2 bars 161 to 193, Contrabass
  bars 72 to 82).
- No note uses a mute, tremolo, harp staccato, or harp flageoletti channel.
  ("sourd." is plain staff text.)

### Defects and risks in the default export

1. **Wrong program for Viola part 27.** The score maps its tremolo channel to
   port 2, channel 14. The exporter writes every FF 21 event of a track with the
   port of the first channel of the part (`track.setOutPort(part->midiPort())`,
   `exportmidi.cpp` line 244). So the tremolo setup lands on port 0, channel 14,
   which is the arco channel. Program 44 (Tremolo Strings) follows program 41
   at tick 0. **1471 of 1473 notes of this part play as Tremolo Strings.**
2. **FF 21 order.** In each track, the FF 21 event comes after the setup events
   of the first channel (same tick, later in the file). A player that applies
   FF 21 strictly in file order sends that first setup block to its default
   port.
3. **Players that ignore FF 21.** Tracks on different ports then share
   channels, and the last program at tick 0 wins. For example, channel 1 then
   plays Piccolo, Trombone 3, the Violin 2 solo, and the Cello solo all with
   program 42 (Cello).
4. **Restrike note-offs.** When two staves or voices play one key, MuseScore
   writes "on, off, on" at one tick (656 zero-length notes). It also writes a
   restrike note-off on every articulation channel of the part (1211 note-offs
   with no open note). These are harmless while each articulation has its own
   channel. They cut notes when channels are shared.

### Controllers and other events

| Event | Count | Notes |
|---|---|---|
| CC 2 (breath) | 146 288 | MuseScore "single note dynamics": the dynamic level after almost every note-on and during hairpins. The default controller is `CTRL_BREATH` (`compatmidirender.cpp` line 54). |
| CC 7, CC 10, CC 91, CC 93 | 1 per setup block | Volume 100 for most parts (some 82 to 92). Pan differs for some parts. Reverb and chorus 0. |
| CC 100, CC 101, CC 6 | 73 blocks | RPN 0: pitch bend range 12 semitones, then RPN null. From `io/midi/exportRPNs`. |
| CC 121 | 76 | Reset all controllers, at tick 0. |
| CC 64 | 2 | Harp. |
| Pitch bend | 0 | |
| Note-off | as note-on with velocity 0 | |
| FF 59 key signature | 49 | One or more in each track. |

### Tempo map and duration

- 62 tempo events (FF 51), from 90 to 144 quarter notes per minute. The first
  tempo is 144.
- 7 time signatures: 3/4 at tick 0, then changes between 4/4 and 3/4 from tick
  80 640.
- **Duration from the tempo map: 280.67 s (4:40.7) to the last event** (tick
  298 801), and 281.31 s to the end of the last measure (tick 299 520, the sum
  of the 207 measures). The tempo map includes the fermata pauses (MuseScore
  writes the tempo map "with pauses").
- The score has no repeats, voltas, or jumps, so `--unroll-repeats` has no
  effect here.

## 3. Annotations in the MIDI file

### What the annotations are

- The CC-BY-SA annotations are the **87 `<Lyrics>` elements**. Each is one
  letter: `a` (66), `c` (18), `b` (2), `x` (1). The score does not say what the
  letters mean.
- The 218 `<StaffText>` items are normal score directions ("à 2" 42 times,
  "1O", "Div.", "Solo", "sourd.", "pizz.", "[Play lower line unless there's a
  Tpt 3]", and so on). They are not the annotations. 2 of them carry a
  `<channelSwitch>` and control playback.

### How they appear in the MIDI file

| Score element | MIDI event | Count | Where |
|---|---|---|---|
| Lyrics | FF 05 lyric | 88 | In the track of the staff, at the tick of the chord. MuseScore adds a space ("a "). The lyric of the 2-staff Viola part goes into both of its tracks (87 Lyrics, 88 events). Source: `exportmidi.cpp` lines 362 to 395. |
| Rehearsal mark | FF 06 marker | 14 | Track 0 only, text "1" to "14". |
| Staff text, system text, expression, play technique | none | 0 | No FF 01 text events in the file. |
| Tempo text | FF 51 tempo | 62 | Only the tempo value. |
| Title, composer, copyright | none | 0 | No FF 02, no FF 01. |

### Test: export with no lyrics

1. `strip_lyrics.py` removes every `<Lyrics>...</Lyrics>` block from each
   `.mscx` in the `.mscz` (87 in the main score, 83 in the part scores). It keeps
   all other bytes and checks that the XML stays well-formed.
2. Export: `matin-nolyrics.mid`.
3. Compare (`midicmp.py`): the only differences are the 88 FF 05 events and
   the end-of-track tick of track 38 (it moved from 292 321 to 135 361, because
   the last event of that track was a lyric). All notes, controllers, tempo
   events, and markers are identical. The file end (tick 298 802) is the same.

### Reliable ways to remove the annotations

- **In the MIDI file (simplest):** delete all FF 05 events. The test shows that
  the lyrics have no other effect on the export. A track end can move to an
  earlier tick, which does not change the music.
- **In the score, before export:** remove the `<Lyrics>` elements with a text
  edit (`strip_lyrics.py`). Do not remove StaffText items. They are score
  directions, and 2 of them switch the playback channel. If you also want to
  remove the rehearsal marks, delete the FF 06 events.

## 4. Channel layout in the score XML

### Where the layout is stored

Each `<Channel>` of a part stores its port and channel. Both are 0-based.

```xml
<Part id="27">
  <Instrument id="viola">
    <Channel name="arco">
      <program value="41"/>
      <midiPort>0</midiPort>
      <midiChannel>13</midiChannel>   <!-- MIDI channel 14 -->
    </Channel>
    <Channel name="pizzicato"> ... <midiPort>0</midiPort> <midiChannel>14</midiChannel> </Channel>
    <Channel name="tremolo">   ... <midiPort>2</midiPort> <midiChannel>13</midiChannel> </Channel>
  </Instrument>
</Part>
```

- The `.mscz` also has `audiosettings.json` (MuseScore 4 mixer: volume, pan,
  mute, solo, sound source). It has no port or channel.
- On save, MuseScore writes `midiPort` and `midiChannel` only when the mapping
  is not "simple" (`exportMidiMapping()`, `masterscore.h` line 153). A custom
  layout is not simple, so it stays in the file.

### How MuseScore uses the values

```text
 .mscx <Channel>                MasterScore                 ExportMidi::write
 midiPort / midiChannel   -->   m_midiMapping[i]      -->   for each staff (track):
 (read with no check:           port: signed char             FF 21 = port of channel 0
  TRead::read(InstrChannel)     channel: signed char          for each Channel k of part:
  -> addMidiMapping())          (only -1 is filled in)          setup block on channel(k)
                                                                write every event whose
                                                                (port, channel) == (k's)
```

- The reader passes the file values to `addMidiMapping()` with no check
  (`tread_read460.cpp` lines 1148 to 1165). `updateMidiMapping()` fills in only
  a missing value (-1). Duplicate port/channel pairs are allowed.
- The port is a `signed char` (`masterscore.h` lines 63 and 73). A file value
  of 128 becomes -128. The exporter writes FF 21 only for a port from 0 to 127
  (`exportmidi.cpp` line 288), so **ports 128 to 254 remove all FF 21 events.**
- For each articulation channel *k* of a part, the exporter writes every event
  whose (port, channel) equals the pair of *k* (`exportmidi.cpp` line 333).
  **If two articulation channels of one part have the same pair, each note is
  written once for each of them.**

**Answer: yes, a script can set the layout, and the export follows it.** The
scripts are `remap_score.py` (layout) and `add_switches.py` (articulation
switches).

### The parts and the solo violin

| Part index | Short name | In part score (excerpt) | Finding |
|---|---|---|---|
| 27 | Vln Solo. | 11_Violin_I | Separate solo part ("Solo" bar 65, notes in bars 66 to 125). It belongs to the first violins. Mapped to Violin 1. |
| 31 | Vln. 2 Solo | 12_Violin_II | Separate solo part of the second violins. Mapped to Violin 2. |
| 34 | Vla. | 13_Viola | Solo viola part. Mapped to the violas. |
| 36 | Vc. Solo | 14_Violoncello | Solo cello part. Mapped to the cellos. |
| 40 | Vln. (hidden) | none | Hidden part. 776 of 812 notes do not play. The 36 notes that play are a high line in bars 131 to 138. Its silent notes match both Violin 1 (352) and Violin 2 (292). Mapped to Violin 1 (the default rule). |

So the score has 2 solo violin parts, one in each violin section. Both are
separate parts. I mapped each to its own section, which keeps Violin 1 and
Violin 2 apart.

### The channel map

```typescript
export interface ChannelGroup {
  /** Group name, also the output track name */
  name: string;
  /** MIDI channel, 1-based (10 = percussion) */
  channel: number;
  /** GM program (0-based) for articulation 0 of all parts in the group */
  program: number;
  /** Part indexes in score order (0-based, 41 parts) */
  parts: number[];
}
```

| Ch | Group | Program | Parts (index: short name) |
|---|---|---|---|
| 1 | Flutes | 73 Flute | 0 Picc, 1 Fl 1, 2 Fl 2 |
| 2 | Oboes | 68 Oboe | 3 Ob 1, 4 Ob 2, 5 E Hn |
| 3 | Clarinets | 71 Clarinet | 6 Cl 1, 7 Cl 2, 8 B Cl |
| 4 | Bassoons | 70 Bassoon | 9 Bsn 1, 10 Bsn 2, 11 B Sar |
| 5 | Horns | 60 French Horn | 12 to 15 F Hn 1 to 4 |
| 6 | Trumpets | 56 Trumpet | 16 C Tpt 1, 17 C Tpt 2 |
| 7 | Trombones | 57 Trombone | 18 Tbn 1, 19 Tbn 2, 20 Tbn 3 |
| 8 | Tuba | 58 Tuba | 21 Tba |
| 9 | Celesta | 8 Celesta | 25 Cel |
| 10 | Percussion | 48 (kit) | 22 Cym, 23 Tamb, 24 Tri |
| 11 | Harp | 46 Harp | 26 Hrp |
| 12 | Violin 1 | 40 Violin | 27 Vln Solo., 28 Vln 1, 29 Vln. 1 div(2), 30 Vln. 1 div(3), 40 Vln. (hidden) |
| 13 | Violin 2 | 40 Violin | 31 Vln. 2 Solo, 32 Vln 2, 33 Vln 2 div. |
| 14 | Violas | 41 Viola | 34 Vla., 35 Vla |
| 15 | Cellos | 42 Cello | 36 Vc. Solo, 37 Vc, 38 Vcs div 2. |
| 16 | Contrabass | 43 Contrabass | 39 Cb |

Each articulation channel of a part goes to the channel of the part.

**Count:** 15 melodic channels and channel 10. This fits exactly, with no free
channel. The request did not say how to merge the brass, so each brass
instrument has its own channel. To free a channel, you can put the tuba with the
trombones (22 tuba notes) or the celesta with the harp.

### Test A: "naive" layout (all port 0, articulations on the part channel)

`remap_score.py naive`, export `matin-naive.mid`:

- 16 channels, channel 10 has only drums. **83 FF 21 events remain (all 0).**
- **Duplicate notes:** 28 204 note-ons instead of 13 676. Each string note is
  written 3 times, horn 2 and 4, trumpets, and trombone 2 notes 2 times, harp
  notes 3 times.
- **Wrong programs:** the setup blocks of all articulation channels land on the
  shared channel at tick 0, and the last one wins. 9688 of 12 139 attacks play a
  wrong program: all strings play 44 (Tremolo Strings), horns and trumpets 59
  (Muted Trumpet), harp 11 (Vibraphone), oboes 69 (English Horn), bassoons 67.
- No program change at an articulation switch.

### Test B: "port trick" layout (ports 128+k, one program per group)

`remap_score.py porttrick` sets the main channel of each part to port 128 and
articulation *k* to port 128+*k* (same MIDI channel). It also sets every
program of a group to the group program. Export: `matin-porttrick.mid`.

- 16 channels, **no FF 21 events**, channel 10 has only drums.
- 13 676 notes, the same as the default. No duplicates from articulation
  channels, because the ports differ.
- One program for each channel, all at tick 0. **The articulation switches are
  lost:** the 92 pizzicato notes play with the arco program (Violin 2: 62,
  Contrabass: 30). MuseScore cannot write a program change at a switch.
- **Notes cut on shared keys:** 1537 same-tick duplicate attacks (unisons, for
  example "à 2"). In a synth that ends all voices of a key on note-off, notes of
  one part end at the note-off of another part: 157 s of sound lost in total
  (sum over all keys).

### Comparison

Measured with `validate.py` against the intended result (attacks are distinct
tick and key pairs on each channel; the synth model ends all voices of a key on
note-off).

| File | FF 21 | Attacks missed | Extra attacks | Wrong program | Lost sound | Extra sound |
|---|---|---|---|---|---|---|
| `matin-naive.mid` (CLI only) | 83 | 0 | 16 065 | 9688 | 123.6 s | 0 s |
| `matin-porttrick.mid` (CLI only) | 0 | 0 | 1537 | 92 | 157.3 s | 0 s |
| `matin-16ch.mid` (post-processed, see 5) | 0 | 0 | 0 | 15 | 0 s | 0 s |

The values for the first two rows use the articulation data of the default
export (92 pizzicato notes). The last row uses the export with the added
switches (499 pizzicato notes).

## 5. Recommended method: post-process the MIDI file

The CLI cannot write a correct 16-channel file, because the program changes for
articulation switches and the merge of same-key notes must happen after the
export. A post-processing step can do both.

```text
 matin.mscz
     |  remap_score.py unique      port = part index, channel = articulation k,
     v                             drums on channel 10
 matin-unique.mscz
     |  add_switches.py            <channelSwitch> on "pizz." and "arco" marks
     v
 matin-unique-sw.mscz
     |  mscore -o matin-unique-sw.mid matin-unique-sw.mscz   (check the file, not the exit code)
     v
 matin-unique-sw.mid               (track i = staff i; channel k = articulation k)
     |  remap_midi.py --programs group
     v
 matin-16ch.mid                    17 tracks: conductor + 1 track per channel
```

### Why the "unique" layout

In the default export, two articulations of one part can have the same MIDI
channel number on different ports (Viola part 27: arco 0/14 and tremolo 2/14).
Then a post-processor cannot tell them apart. In the unique layout, each part
has its own port and articulation *k* has channel *k*, so (track, channel) gives
(part, articulation) with no doubt. The track index gives the staff, and the
score gives the part of each staff. The track names do not help (see 2).

### What `remap_midi.py` does

1. It pairs each note-on with its note-off in the same source (track, channel,
   key). It drops the 656 to 661 zero-length restrike notes and the 1211 to
   1245 note-offs with no open note.
2. It moves each note to the channel of its group. The program of the note is
   the group program, or the program of its articulation channel (pizzicato 45,
   contrabass pizzicato 32).
3. For each channel, at each tick, it writes note-offs first, then
   controllers, then each note-on. Before a note-on, it writes a program change
   only if the program must change.
4. A note-off goes out only when the last note on that key ends (reference
   count). A second note-on on the same key at the same tick is dropped
   (unison). So no part can cut a note of another part.
5. It drops FF 21, FF 05, the source program changes, CC 121, the RPN blocks
   (the file has no pitch bends), and CC 2. It keeps CC 64. It writes one CC 7,
   CC 10, CC 91, and CC 93 for each channel, from the first part of the group.
6. Track 0 gets the tempo map, the time signatures, the first key signature,
   and the markers.

### Result: `matin-16ch.mid`

- SMF format 1, 17 tracks (conductor + 16 channel tracks), 480 tpq, 280.67 s.
- No FF 21 and no FF 05 events. Channel 10 has only keys 54, 57, and 81.
- Program changes on the string channels (the first one included): Violin 1:
  12, Violin 2: 36, Violas: 28, Cellos: 65, Contrabass: 18 (switches to and from
  programs 45 and 32). Each other channel has one program change, before its
  first note.
- `validate.py`: 12 139 attacks, 0 missed, 0 extra, 0 s lost, 0 s extra.
  15 notes have a wrong program: at these ticks, an arco note and a pizzicato
  note of two parts start on the same key on the same channel, and only one
  note-on remains.
- Unisons merged (same key, same tick, same channel): 359 flutes, 196 oboes,
  123 horns, 65 trumpets, 54 clarinets, 39 bassoons, and a few in the strings.
  A unison now sounds as one voice, not two.

### Limits and choices

- **One program for each group.** Piccolo, English horn, bass clarinet, bass
  sarrusophone, and the divisi parts with program 48 use the group program. The
  option `--programs part` keeps the program of each part
  (`matin-16ch-partprog.mid`). This needs more program changes (flutes 189,
  oboes 399) and gives 233 conflicts at same-tick unisons, with 0 s lost. The
  method works only if the synth fixes the preset of a voice at note-on (as SF2
  synths do).
- **CC 2 is dropped** (`--keep-cc2` keeps it). On a shared channel, the CC 2
  values of different parts conflict. The note-on velocity still carries the
  dynamic level.
- **Percussion:** one program change 48 on channel 10 (the "Orchestral" kit in
  GeneralUser GS). The tambourine part had program 0. In the GM percussion map,
  keys 54, 57, and 81 are Tambourine, Crash Cymbal 2, and Open Triangle. I did
  not check these keys in the "Orchestral" kit. If the app needs the GM keys,
  write program 0 or no program change on channel 10.
- **The articulation fix needs the score edit** (`add_switches.py`). Without
  it, the export puts only 92 notes on pizzicato channels, and some of them are
  wrong (see 2).
- **Without any score edit:** you can post-process `matin-default.mid` with the
  track index and the score's `midiPort`/`midiChannel` values. But Viola part 27
  is ambiguous (arco and tremolo both on channel 14), and the pizzicato marks
  stay ignored.

### Data model of a source note in the post-processor

```typescript
export interface SourceNote {
  /** Track index in the MuseScore export (= staff index, 0-based) */
  track: number;
  /** Articulation index k (= channel in the unique layout; 0 for drums) */
  articulation: number;
  /** Start and end in ticks (480 per quarter note); end > start */
  onTick: number;
  offTick: number;
  key: number;
  velocity: number;
  /** GM program that the note must sound with */
  program: number;
}
```

## Files

All files are in `scratchpad/musescore/`.

| File | Content |
|---|---|
| `matin.mscz` | Copy of the input score. |
| `matin-default.mid` | Default CLI export (questions 1 and 2). |
| `matin-nolyrics.mscz`, `matin-nolyrics.mid` | Score with no Lyrics, and its export (question 3). |
| `matin-naive.mscz`, `matin-naive.mid` | Test A. |
| `matin-porttrick.mscz`, `matin-porttrick.mid` | Test B. |
| `matin-unique.mscz`, `matin-unique.mid` | Unique layout, no switch fix. |
| `matin-unique-sw.mscz`, `matin-unique-sw.mid` | Unique layout with the switch fix. |
| `matin-16ch.mid` | Final 16-channel file (group programs). |
| `matin-16ch-partprog.mid` | Final file with part programs. |
| `export-*.log` | Output of each CLI run. |
| `smfdump.py` | SMF dump: ports, channels, programs, meta events per track. |
| `channels.py` | Port and channel of each `<Channel>` in a score. |
| `strip_lyrics.py` | Removes `<Lyrics>` from a `.mscz`. |
| `midicmp.py` | Event compare of two MIDI files. |
| `remap_score.py` | Sets the layout in a score copy (`naive`, `porttrick`, `unique`). Holds the group map. |
| `add_switches.py` | Adds `<channelSwitch>` to "pizz." and "arco" marks. |
| `remap_midi.py` | Post-processor to 16 channels. |
| `validate.py`, `overlaps.py` | Checks: attacks, programs, lost and extra sound, same-key overlaps. |
| `mssrc/` | MuseScore 4.7.5 source files used as evidence. |

## Sources

MuseScore source at tag `v4.7.5`
(`https://github.com/musescore/MuseScore/tree/v4.7.5`), copies in
`musescore/mssrc/`:

- `src/importexport/midi/internal/midiexport/exportmidi.cpp`: track per staff
  (line 222), FF 21 from the part port (lines 244, 287 to 295), setup block per
  channel (lines 252 to 285), event filter by port and channel (line 333),
  restrike note-off (line 305), lyrics and markers (lines 362 to 420).
- `src/engraving/rw/read460/tread.cpp`: `TRead::read(InstrChannel*)` reads
  `midiPort` and `midiChannel` and calls `addMidiMapping()` (lines 1148 to
  1165); `readProperties(StaffTextBase*)` reads `channelSwitch` (line 725);
  `TRead::read(PlayTechAnnotation*)` uses the same properties.
- `src/engraving/dom/midimapping.cpp`: `updateMidiMapping()` (line 259),
  `doUpdateMidiMapping()` (line 288), `addMidiMapping()` (line 346).
- `src/engraving/dom/masterscore.h`: `signed char m_port` (line 73),
  `exportMidiMapping()` (line 153).
- `src/engraving/dom/score.cpp`: `Score::updateChannel()` (line 6187).
- `src/engraving/compat/midi/compatmidirender.cpp`: default CC for single note
  dynamics is `CTRL_BREATH` (line 54).
- `src/engraving/rw/write/twrite.cpp`: writes `midiPort` and `midiChannel` only
  when `exportMidiMapping()` is true (line 2068).
