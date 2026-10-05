# Review of step 2: MIDI and score (partial)

Date: 2026-10-05. Reviewer: the independent review agent of design 9.8. The reviewer did not do
the work of this step.

Scope: the 45 commits from `e7b9ade` to `7f1551c` (`git log 631dee2..7f1551c`). The review
covers `src/midi/`, `src/score/`, `tools/patch-demos.ts`, `tools/measure-targets.ts`,
`src/audio/pcm-memory.test.ts`, the step 2 changes in `src/audio/` and `src/spike/`, and the
report [`../research/step-2-targets.md`](../research/step-2-targets.md).

The review does not cover three tasks of step 2. They change the audio processor, and they wait
for the Safari check of step 1 (review of step 1, conditions 3 and 4):

- the `setSeatAudible()` rules of the processor (design 6.5, 6.6),
- the anchor `{ songTime: 0, rate: 0 }` of `loadScore()` (review of step 1, F3),
- the warm-up of the voice code (spike report, section 8, item 2).

## 1. Verdict

**CHANGES REQUESTED** for the reviewed scope.

The code of `midi/` and `score/` agrees with design section 3. The demo tests of 8.5 pass for
all six demos. The score target and the memory target pass. Two findings block the approval:

- **B1.** Five rules of section 3 have no test that fails without the rule. The "Done when" of
  step 2 asks for such a test for each rule.
- **B2.** A valid file of 37 bytes makes `buildScore()` run out of memory.

Both fixes are small. Section 4 gives the requested changes. Send the step to the review agent
again after the fixes (design 9.8, action 4).

## 2. Conditions for the final approval of step 2

The final approval of step 2 needs all of these:

1. B1 and B2 are fixed, and a review agent approves the fixes.
2. The two Safari tasks of step 1 are closed (review of step 1, conditions 2 and 4).
3. The three processor tasks above are done after the Safari result. A review agent approves
   them. Each rule of 6.5 and 6.6 that they add has a test that fails without the rule.
4. The user decides the wording of the audio render target (TODO, step 2). The render then
   passes that target. Section 6 gives the recommendation of the reviewer.
5. The warm-up task removes the cold blocks at the first note of each preset, also in the middle
   of a song (N2).
6. The seek chase task (TODO, step 2) makes the first seek of a session fit in one block. It is
   a processor change, so it also waits for the Safari result.
7. The Worker cache task (review of step 1, F5) is done. This task changes the decode Worker or
   only the docs. It does not change the processor, so it can be done now.

## 3. Check results

### 3.1 Commands

All commands ran on the development Mac at commit `7f1551c`, from a clean working tree.

| Command | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm lint` | Pass, no diagnostics |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass: 27 files, 320 tests |
| `pnpm format:check` | Pass: 66 files |
| `pnpm build` | Pass: 274 preset files (35,923,610 B), 6 demo files in `public/demos/`, `processor-*.js` 345,910 B (the same as in step 1) |
| `pnpm size` | Pass: 14,699 B of 1,000,000 B |

The reviewer also ran `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm format:check` on each
of the 45 commits in a separate worktree. All 45 commits pass all four checks.

### 3.2 Demo tests of design 8.5

The demo tests pass for each demo and each section size. The reviewer also printed the seats of
each demo after `demos/patches.json`, and compared them with the tables of 8.2.

| Demo | Seats (8.2 order) | Length | Players: auto, one per part, full | Conductor pattern |
|---|---|---|---|---|
| `beethoven-5` | flute, oboe, clarinet, bassoon, horn, trumpet, timpani, violin (2), viola, cello, contrabass | 316.5625 s, 5:16 | 29, 26, 29 | 1 |
| `grieg-ase` | violin (2), viola, cello, contrabass | 216.0000 s, 3:36 | 16, 10, 16 | 4 |
| `mozart-k488` | flute, clarinet, bassoon, horn, piano, violin (2), viola, cello | 421.0713 s, 7:01 | 22, 13, 22 | 6 |
| `mozart-k315` | flute, oboe, horn, violin (2), viola, cello | 254.9998 s, 4:15 | 19, 15, 19 | 2 |
| `handel-hallelujah` | oboe, bassoon, trumpet, timpani, violin (2), viola, cello, choir (4) | 188.0000 s, 3:08 | 51, 13, 51 | 4 |
| `boulanger-matin` | flute, oboe, clarinet, bassoon, horn, trumpet, trombone, tuba, piano, percussion, harp, violin (2), viola, cello, contrabass | 280.6672 s, 4:40 | 42, 44, 42 | 3 and 4 |

Each row agrees with the table "Expected sections" and with the length column of 8.2. No demo
has a sound-only seat. Each demo is orchestral, and each sequence name is ''. The patterns of
demo 1 (pattern 1) and demo 3 (pattern 6) agree with the examples of 5.4.

### 3.3 Step 2 targets of design 9.7

The reviewer ran `node tools/measure-targets.ts` one time. The load average was 3.49 (1 min),
4.84 (5 min), and 5.69 (15 min) at the start, and 3.64, 4.63, and 5.55 at the end. The Mac has
10 cores. Another agent ran headless Chromium processes at the same time.

| Target | Value | Measured | Verdict |
|---|---|---|---|
| Score build | at most 100 ms for the largest demo | Boulanger 15.8 ms (median of 5) | Pass |
| Memory | at most 100 MB of decoded samples | at most 9.0 MB (Boulanger) | Pass |
| Audio render | at most 1.3 ms for each block | p99 at most 0.322 ms, p99.9 at most 0.441 ms. 0 to 29 blocks above 1.3 ms in each demo, max 12.4 ms | Fail by the letter |
| Late seek (review of step 1, F14) | one block, 2.667 ms | median 1.18 ms, max 3.48 ms, 1 of 40 above one block | Above the block once |

The script exits with 1. These values agree with the report of the step. The report says that
the result depends on the load of the machine. This run shows the same thing: `mozart-k488.mid`
had 29 slow blocks here, and 1 to 4 in the three runs of the report. Section 6 gives the
judgment of the reviewer.

### 3.4 Tests that fail without their rule

The reviewer broke 87 rules or values in a temporary worktree, one at a time. After each change,
the reviewer ran the tests of `src/midi/`, `src/score/`, `block-scheduler.test.ts`, and
`patch-demos.test.ts`. 73 changes made at least one test fail. 14 changes passed all tests. One
of the 14 cannot change a result (section 4, B1). Section 5 gives the table of the rules of 3.3
to 3.8.

### 3.5 Edge cases

The reviewer built small files with `writeSmf()` and ran `buildScore()` on them.

| Case | Result | Verdict |
|---|---|---|
| Empty tracks in a format 1 file | The empty tracks add nothing | Correct |
| A note on at the tick of the end of its track | A note of length 0. The synth gets the note on, then the note off | Correct (3.3) |
| Two note ons on one key before a note off | First in, first out | Correct, tested |
| A file with only drums (GM1 kit) | A timpani seat for the tom and a percussion seat. `orchestral` is false | Correct (3.8) |
| A bank select with no program change | The preset stays bank 0, program 0 | Correct (3.5) |
| More than 16 channels on several ports | Each port has its own 16 channels | Correct, tested |
| A tempo change inside a note | The note ends at 1.5 s, as the tempo map gives | Correct |
| A note off at a far tick (4-byte delta) | Out of memory in `buildBeats()` | Bug (B2) |

### 3.6 Code review

The reviewer read all code of the step. These parts are correct:

- **Parser.** `parseMidi()` reads running status, refuses SMPTE time division and format 2, and
  removes SysEx. A cross-check test compares the note ons of each demo with the parser of
  spessasynth_core.
- **Pairing.** `NotePairing` pairs on each `synthChannel * 128 + pitch`, first in, first out, as
  the synth does. The end of a track ends the oldest open note on each key, and `endAll()` ends
  the rest at the end of the last track.
- **Same-tick order.** The tempo map and the time signatures use a stable sort of the events in
  track order. Thus the later track wins at the same tick.
- **Seats.** The seat key is (port, channel, section). The merge for articulation channels uses
  a union of seat keys, so merges of two tracks that share a channel join. The rhythm flag in
  the group key keeps a rhythm channel apart from a mallet channel.
- **Data model.** `Seat`, `PlayerNote`, `Beat`, `SynthEvent`, and `Score` agree with 3.2,
  with the new field `Seat.kits`. The kits stay apart from the melodic programs.
- **Decisions of section 10.** The four rows of the manager (2026-10-05) and the two rows of the
  agent of step 2 agree with the code, and tests pin each of them.
- **Generic names.** `titleSequenceName()` agrees with 8.2, and tests pin each generic name.
- **Patch script.** `tools/patch-demos.ts` checks each SHA-256, refuses an unknown file, and
  changes only program bytes. A test compares the result with `parseMidi()`.
- **Pure core.** `midi/` and `score/` read no clock, use no random value, and touch no DOM. The
  move of `sustainsAfterSeek()` into `score/` does not change the processor bundle.
- **Exported surface.** The app needs only `buildScore()` and the types of `score/types.ts`.
  The other exports serve the sibling modules of `score/` and their tests.
- **TSDoc and prose.** Each exported symbol has TSDoc, and each `{@link}` target exists. The
  prose checks of AGENTS.md find no em dash, no semicolon splice, and no antithesis tic.

## 4. Findings

The findings are in the order of their severity. Each finding gives the place, the failure, and
the requested change.

### B1. Five rules of section 3 have no test that fails without the rule (high, blocking)

The reviewer broke each rule below, and all tests still passed.

| Rule | Place | Change that passed all tests |
|---|---|---|
| 3.3: of two time signatures at the same tick, the later track applies | `src/score/timeline.ts:320-337` | `file.tracks.toReversed()` before the stable sort |
| 3.5: `score/` does not use the bank LSB (CC 32) | `src/score/timeline.ts:202` | CC 32 also sets the bank |
| 3.8: the caps of viola 4, cello 4, contrabass 3, oboe 3, clarinet 3, bassoon 3, trumpet 3, trombone 3, and choir 8 | `src/score/players.ts:22-36` | Each cap plus 1 (9 changes) |
| 3.8: a note that starts while an earlier note sounds gets the players of its rank (divisi) | `src/score/players.ts:335-341` | Rank and division only among the notes of the chord |
| 3.8: "the largest other seat" excludes the strings and the choir | `src/score/players.ts:223` | Step 2 of the removal also takes string seats |

The test "caps the players of each seat" pins only violin 6, flute 3, horn 4, and tuba 1.

One more change passed all tests: a removal down to 0 players (`src/score/players.ts:224`).
This change cannot change a result. At most 60 seats have players (3.7), so a total above 60
always has a seat with 2 or more players. Thus this rule needs no test.

Requested change: add one test for each of the five rules. Make each test fail with the change
of the table above, then restore the code (AGENTS.md, "Tests").

### B2. A file of 37 bytes makes `buildScore()` run out of memory (high, blocking)

Place: `src/score/beats.ts:35-49`, called from `src/score/score.ts:36`.

`buildBeats()` makes one `Beat` for each beat up to `durationSec`, and nothing limits
`durationSec`. One note off with a delta of `0x0FFFFFFF` ticks gives a song of 4,660 hours.

```text
4d546864 00000006 0000 0001 0008      MThd: format 0, 1 track, 8 ticks for each quarter note
4d54726b 0000000f                     MTrk, 15 bytes
00 90 3c 64                           note on, key 60, at tick 0
ff ff ff 7f 80 3c 40                  note off at tick 268,435,455
00 ff 2f 00                           end of track
```

- `durationSec` is 16,777,215.9 s. At 120 BPM, this is about 33.5 million beats.
- Node with a heap of 2 GB stops with "JavaScript heap out of memory" in `buildScore()`.
- The first 1,000 hours alone give 7,200,000 beats in 229 ms.
- With 96 ticks for each quarter note, the same file gives 2,796,203 beats in 110 ms.

The parser accepts this file, and 3.3 has no rule against it. In the app, a dropped file of this
kind stops the tab. File drop comes in step 6, but the rule belongs to the file rules of 3.3.

Requested change: add a file rule to 3.3 and a test. Two possible rules:

1. Refuse a file whose last note-off is later than a limit, for example 3 hours. This needs a
   `FileError` and a message text in 2.8.
2. Use the error `not-midi` for such a file, with the current message text.

Record the choice as a row of section 10.

### N1. The audio render target fails by the letter (medium, non-blocking)

Place: design 9.7, `tools/measure-targets.ts`.

Section 6 gives the judgment. The reviewer did not change the target, because the user owns
it. The TODO task of step 2 asks the user.

### N2. Cold code also slows the first note of each later preset (medium, non-blocking)

Place: the warm-up task of step 2. The task waits for the Safari result.

The report names the cold code at the first notes of the first demo of a process. The same
effect occurs when a preset plays for the first time in the middle of a song. In the Handel
demo, the trumpet (56) and the timpani (47) start at 27.75 s.

| Render of `handel-hallelujah.mid` in one process | Worst block from 27.6 to 28.0 s | Blocks above 1.3 ms near 27.8 s |
|---|---|---|
| First render (cold) | 1.549 ms | 6 |
| Second render (warm) | 0.357 ms | 0 |
| Third render (warm) | 0.395 ms | 0 |

Requested change: the warm-up must render a note of each preset of the score, as the TODO task
says. Its check must also time the Handel blocks at 27.75 s, in a fresh process.

### N3. The polyphony counts an earlier note against the full chord (low, non-blocking)

Place: `src/score/players.ts:279`.

`chords()` keeps an earlier note as "sounding" if it ends more than 50 ms after the start of the
first note of the chord. A later note of the same chord can start after that point. Design 3.8
measures the overlap from the start of the later note.

Input (125 BPM, so 1 tick is 1 ms), a flute part:

| Note | Start | End |
|---|---|---|
| A, key 72 | 0 ms | 130 ms |
| C, key 74 | 60 ms | 1,000 ms |
| B, key 76 | 100 ms | 1,000 ms |

B joins the chord of C. A ends 70 ms after the start of C, but only 30 ms after the start of B.
By 3.8, A and B are not simultaneous, so 2 players are enough. `buildScore()` gives 3 flute
players. The case needs a rolled chord and a note that ends inside the window, so it is rare.

Requested change: filter the sounding notes for each note of the chord at its own start, or
state the current reading in 3.8.

### N4. `parsePatches()` throws a `TypeError` for an entry with no file name (low, non-blocking)

Place: `tools/patch-demos.ts:194-200`.

The input `[{"setProgram":[]}]` gives "Cannot read properties of undefined (reading
'endsWith')". The TSDoc promises the error "has an entry that is not valid".

Requested change: check that `patch` is an object and that `patch.file` is a string. This is an
I/O boundary, so AGENTS.md permits the `typeof` check.

### N5. Two documents give different "Done when" lists for step 2 (low, non-blocking)

Place: design 9.5 (step 2), `TODO.md` (step 2), design 9.7.

Design 9.5 says "The score target of 9.7 passes". `TODO.md` says "the step 2 targets pass". The
table of 9.7 gives step 2 to the score build, the audio render, and the memory.

Requested change: make 9.5 and `TODO.md` agree when the user decides the render target.

### N6. The prose of 6.5 and the list of `sustainsAfterSeek()` differ (low, non-blocking)

Place: design 6.5, `src/score/program-map.ts:134-141`.

Design 6.5 says that bowed strings and woodwinds start held notes again. The list leaves out
four groups. They are the fiddle (110, violin), the bagpipe (109, oboe), the shanai (111, oboe),
and the synth pads (88 to 95, divided across the strings). The test pins the list, so the code
agrees with the list of 6.5.

Requested change: the user confirms the list, or the list gets these programs. Then make the
prose and the list agree.

### N7. The parser decodes windows-1252 and calls it Latin-1 (nit, non-blocking)

Place: `src/midi/parse.ts:224-238`, design 3.3.

`new TextDecoder('windows-1252')` maps the bytes 0x80 to 0x9F to printable characters. True
ISO-8859-1 maps them to control characters. The WHATWG Encoding standard maps the label
"latin1" to windows-1252, so the behavior is the web standard.

Requested change: name the decoder in the comment and in 3.3, for example "Latin-1
(windows-1252, as in the WHATWG Encoding standard)".

### N8. Small duplications and one commit subject (nit, non-blocking)

- `MEMORY_LIMIT_BYTES` is in `src/audio/pcm-memory.test.ts:9` and in
  `tools/measure-targets.ts:24`. Keep one constant.
- `tools/patch-demos.ts:51-104` walks the SMF events again, with the rules of
  `src/midi/parse.ts:82-157`. The patch test compares the result with `parseMidi()`, so a drift
  fails a test. Keep the copy, or let one walk serve both.
- The subject of `bcd5b85` is "build: exclude the agent worktrees from the tests". AGENTS.md
  asks for a scope, for example `build(tools)`. Do not rewrite the history.

## 5. The rules of 3.3 to 3.8 and their tests

"Broken" marks a rule that the reviewer broke in the worktree. A test then failed. "No test"
marks the gaps of B1. The other rows name the test that pins the rule.

| Rule | Test (file: title) | Check |
|---|---|---|
| 3.3 A file that is not a valid SMF is refused | `parse.test.ts`: "refuses a file that is not a valid Standard MIDI File" | Broken |
| 3.3 A file of format 2 is refused | `parse.test.ts`: "refuses a file of format 2" | Broken |
| 3.3 A file of more than 4,000,000 bytes is refused | `parse.test.ts`: "refuses a file of more than 4 MB" | Broken |
| 3.3 SMPTE time division is not valid | `parse.test.ts`: "refuses a file that is not a valid Standard MIDI File" | Broken |
| 3.3 Name text: UTF-8, else Latin-1, no NUL, no outer space | `parse.test.ts`: "reads a track name that is not UTF-8 as Latin-1, ..." | Broken (2 changes) |
| 3.3 A file with no notes is refused | `timeline.test.ts`: "refuses a file with no notes" | Broken |
| 3.3 SysEx is removed | `parse.test.ts`: "removes SysEx events and reads the events after them" | Broken |
| 3.3 A tempo event in any track applies to all tracks | `tempo-map.test.ts`: "applies a tempo event of any track to all tracks" | Broken |
| 3.3 Two tempo events at one tick: the later track applies | `tempo-map.test.ts`: "uses the event of the later track for two tempo events at the same tick" | Broken |
| 3.3 A time signature in any track applies to all tracks | `timeline.test.ts`: "collects the time signatures of all tracks, with their times" | Pinned |
| 3.3 Two time signatures at one tick: the later track applies | none | No test (B1) |
| 3.3 A note with no note off ends at the end of its track | `timeline.test.ts`: "ends a note with no note off at the end of its track" | Broken |
| 3.3 Two note ons on one key: first in, first out | `timeline.test.ts`: "pairs two note ons on one key first in, first out" | Broken |
| 3.3 Pairs from all tracks of a port, end of track ends the oldest note | `timeline.test.ts`: "ends a note with a note off of another track on its channel, as the synth does" | Broken (2 changes) |
| 3.3 A note left open ends at the end of the last track | `timeline.test.ts`: "ends a note that stays open after the end of its track at the end of the last track" | Broken |
| 3.3 A note off with no open note is dropped | `timeline.test.ts`: "drops a note off with no open note" | Broken |
| 3.3 A note on with velocity 0 is a note off | `timeline.test.ts`: "reads a note on with velocity 0 as a note off" | Broken |
| 3.3 A channel with no program change uses program 0 | `timeline.test.ts`: "uses program 0 on a channel with no program change" | Broken |
| 3.3 No tempo or time signature: 120 BPM in 4/4 | `tempo-map.test.ts`: "uses 120 BPM ...", `timeline.test.ts`: "uses 4/4 ..." | Broken (2 changes) |
| 3.4 Each port is 16 channels, and ports do not merge | `timeline.test.ts`: "keeps the channels of two ports apart" | Broken |
| 3.4 A port event sets the port of its track, the first one wins, default 0 | `parse.test.ts`: "reads the first port event (FF 21) of each track, with port 0 as the default" | Broken |
| 3.4 Ports ordered by number, synth channel `portIndex * 16 + channel` | `timeline.test.ts`: "orders the ports by number, ..." | Broken |
| 3.4 Only tracks with channel events give ports | `timeline.test.ts`: "gives no port index to a port of a track with no channel events" | Broken |
| 3.4 A seat source names the port index | `seats.test.ts`: "maps the keys of the other kits with the GM1 map on the rhythm channel of each port" | Pinned |
| 3.4 Channel 10 of each port is a rhythm channel | `timeline.test.ts`: "gives the drum kit of a rhythm channel of each port, ..." | Broken |
| 3.5 The program table | `program-map.test.ts`: "maps the programs %j to the section %s", "covers each of the 128 programs ..." | Broken (2 changes) |
| 3.5 String bands: contrabass to 35, cello 36, viola 48, violin 55 | `program-map.test.ts`: "uses the string bands: ..." | Broken |
| 3.5 Brass bands: tuba to 39, trombone 40, horn 53, trumpet 65 | `program-map.test.ts`: "uses the brass bands: ..." | Broken |
| 3.5 44 and 45: the earlier section of the channel | `seats.test.ts`: "gives 44 and 45 the last earlier section of their channel" | Broken |
| 3.5 44 and 45: else the next later section | `seats.test.ts`: "gives 44 and 45 the next later section if the channel has no earlier one" | Broken |
| 3.5 44 and 45: else divided by pitch, also after a divided note | `seats.test.ts`: "divides 44 and 45 by the string bands ...", "divides 44 and 45 by pitch after an ensemble program ..." | Broken |
| 3.5 One sound-only seat with no players | `seats.test.ts`: "puts all notes of the programs with no animal in one sound-only seat" | Broken |
| 3.5 Techniques: 44 tremolo, 45 and 32 to 39 pizzicato | `program-map.test.ts`: "gives tremolo to 44 and pizzicato to 45 and the basses 32 to 39" | Broken |
| 3.5 A melodic preset has the bank of its channel | `synth.test.ts`: "lists the presets of the notes in the order of first use" | Broken |
| 3.5 A bank select takes effect at the next program change | `timeline.test.ts`: "applies a bank select at the next program change, as the synth does" | Broken |
| 3.5 `score/` does not use the bank LSB | none | No test (B1) |
| 3.6 A program change on a rhythm channel selects the kit | `seats.test.ts`: "maps the keys of the Orchestra kit to the timpani and the percussion seats" | Broken |
| 3.6 The map of kit 48 | `drum-map.test.ts`: "uses the map of the Orchestra kit 48" | Broken |
| 3.6 The GM1 map for all other kits | `drum-map.test.ts`: "uses the GM1 map for kit %i" | Broken (2 changes) |
| 3.6 Melodic program 47 goes to the timpanist | `program-map.test.ts`: "maps the programs [47] to the section timpani" | Broken |
| 3.6 Channel 11 plays as a melodic channel | `players.test.ts`: the tests "above 60 players" use channel 11 | Broken |
| 3.7 A program change inside a section keeps the seat | `seats.test.ts`: "keeps the seat at a program change inside a section" | Broken |
| 3.7 A program change to another section makes a new seat | `seats.test.ts`: "starts a new seat at a program change to another section" | Broken |
| 3.7 One channel can feed several seats | `seats.test.ts`: "gives one seat for each string section of an ensemble program" | Broken |
| 3.7 Merge rule for articulation channels, format 1 only | `seats.test.ts`: "merges the channels of one section in one track of a format 1 file" | Broken |
| 3.7 The merge does not join a rhythm and a melodic channel | `seats.test.ts`: "keeps a rhythm channel and a mallet channel of one track in two percussion seats" | Broken |
| 3.7 One seat for all piano, harp, and timpani channels | `seats.test.ts`: "gives one seat to all channels of the piano, the harp, and the timpani" | Broken |
| 3.7 Seat order: `SectionId`, then the first (port, channel) | `seats.test.ts`: "orders the seats by section, then by the first (port, channel)" | Broken |
| 3.7 Above 60 seats: the fewest notes move, a tie moves the later seat | `players.test.ts`: "moves the notes of the seats with the fewest notes to the sound-only seat above 60 seats" | Broken (2 changes) |
| 3.7 Above 60 seats: the synth events stay the same | `score.test.ts`: "keeps the synth events when the seats above 60 move to the sound-only seat" | Pinned |
| 3.2 `Seat.programs` holds only melodic programs, `Seat.kits` the kits | `seats.test.ts`: "keeps the drum kits of the rhythm sources apart from the programs" | Broken |
| 3.8 Woodwinds and brass: one player for each simultaneous note | `players.test.ts`: "gives a woodwind one player for each simultaneous note, highest note first" | Broken |
| 3.8 Piano, harp, timpani, mallets: one player | `players.test.ts`: "gives one player to the piano, the harp, the timpani, and the mallets" | Broken |
| 3.8 Percussion: one player for each key group, in order | `players.test.ts`: "gives a rhythm channel one player for each key group, ..." | Broken |
| 3.8 Strings and choir of an orchestral file: base sizes | `players.test.ts`: "gives the base sizes to the strings and the choir of an orchestral file" | Broken (2 changes) |
| 3.8 Strings and choir of another file: one for each simultaneous note | `players.test.ts`: "follows the section size setting" | Broken |
| 3.8 Orchestral: woodwind, brass, timpani with 47 or kit 48, no GM1 toms | `players.test.ts`: "makes a file with %s orchestral: %s", "makes a file with toms of kit %s ..." | Broken |
| 3.8 Orchestral: programs 43, 44, 45, 48 to 51, and no bass guitar | `players.test.ts`: "makes a file with %s orchestral: %s" | Broken |
| 3.8 Only a melodic channel uses a program, the setting does not change `orchestral` | `players.test.ts`: "does not count the Orchestra kit 48 ...", "follows the section size setting" | Broken (2 changes) |
| 3.8 The setting "Section size" | `players.test.ts`: "follows the section size setting" | Broken |
| 3.8 Caps of violin, flute, horn, and tuba | `players.test.ts`: "caps the players of each seat" | Broken |
| 3.8 Caps of the other 9 sections | none | No test (B1) |
| 3.8 Removal above 60: strings and choir first, down to one per part | `players.test.ts`: "stops at the size of one player for each part, then removes other players" | Broken |
| 3.8 Removal: "the largest other seat" excludes strings and choir | none | No test (B1) |
| 3.8 Removal: a tie removes from the later seat | `players.test.ts`: "removes string players first, from the largest and then the later seat" | Broken |
| 3.8 A smaller percussion seat gives the rest to its last player | `players.test.ts`: "gives the key groups of a smaller percussion seat to its last player" | Broken (2 changes) |
| 3.8 More notes than players: a double stop | `players.test.ts`: "gives a player two notes when a string seat has more notes than players" | Broken |
| 3.8 In a chord, the highest note goes to player 0 | `players.test.ts`: "gives a woodwind one player for each simultaneous note, highest note first" | Pinned |
| 3.8 Simultaneous only with an overlap of more than 50 ms | `players.test.ts`: "counts an overlap of at most 50 ms as one note, ..." | Broken |
| 3.8 Chord: one start, or 50 ms with long notes | `players.test.ts`: "joins notes that start at most 50 ms apart ...", "keeps a grace note ...", "keeps short notes with the same start ..." | Broken (2 changes) |
| 3.8 A new note takes the player of its rank, or the nearest free player | `players.test.ts`: "gives a note the nearest free player while an earlier note still sounds" | Broken |
| 3.8 Divisi: a higher note gets the extra player | `players.test.ts`: "divides the players of a section across the notes of a chord, highest first" | Broken |
| 3.8 Divisi: a note over a held note gets the players of its rank | none | No test (B1) |

## 6. Judgment of the audio render target

**Most slow blocks are a measurement artifact. Two causes are real: cold code and the first
seek.**

The reviewer timed each block with the wall clock and with `process.cpuUsage()`. The process
CPU time includes the helper threads of V8, so it is an upper limit of the render thread. A block
with a wall time above 1.3 ms and a process CPU time below 1.3 ms waited for a CPU. Its own work
was less than the target.

| Run | Load average (1 min) | Blocks above 1.3 ms | Of these, process CPU below 1.3 ms |
|---|---|---|---|
| Beethoven and K. 488, two renders each | 3.7 at the start, 19.1 at the end | 288 | 283 |
| All six demos, one render each | 4.95 at the start, 3.39 at the end | 24 | 10 |

The blocks with a process CPU time of 1.3 ms or more are all cold code, in both runs:

- the first notes of a render: Beethoven from 0.00 to 0.32 s, Handel at 0.00 and 0.12 s, K. 315
  at 0.00 s, Boulanger at 2.76 s,
- the first trumpet and timpani notes of Handel at 27.75 to 27.89 s (N2),
- one block of K. 488 at 164.12 s in the run with a load of 19.

The reviewer's reasons:

1. **Waits for a CPU are a property of the test machine.** The Node main thread has no
   real-time priority, and another agent loaded the Mac. In the worst block, the wall time was
   57.4 ms and the process CPU time 0.13 ms. The slow blocks move between runs.
2. **The warm work is far below the target.** The p99.9 is at most 0.441 ms in this run, and at
   most 0.53 ms in the runs of the report. In warm renders, no block took 1.3 ms of process CPU
   time. One Boulanger block (52.12 s) is near 1.3 ms in some runs of the report. That is about
   50 % of one block.
3. **The cold code is real.** It repeats in each fresh process, and it takes up to 3.5 ms, which
   is more than one block of 2.667 ms. A worklet starts with cold code too. The warm-up task
   addresses it (N2).
4. **The first seek is real.** It takes 3.5 ms in each run (report, section 6). A TODO task
   addresses it.
5. **The browser absorbed single slow blocks.** In step 1, a full Chrome play of demo 1 had 1 slow
   block of 4 ms and 0 underrun events. Ten Chrome runs of the first note had 1 slow block of 3
   to 7 ms and 0 underrun events (review of step 1, sections 2.2 and 2.4). A burst of slow blocks
   is a larger risk than a single block.

Thus the steady-state render has no measured risk of an audible dropout. The risk is in the
cold code and in the first seek, and both have tasks.

**Recommendation.** The reviewer recommends this wording to the user. The reviewer did not
change design 9.7.

> Audio render: for each demo, in a fresh Node process after the warm-up, the p99.9 of the block
> render time is at most 1.3 ms. No block uses more than one block length (2.667 ms) of CPU
> time. A seek, also the first seek of a session, takes at most one block. Node:
> `node tools/measure-targets.ts`, with the wall time and `process.cpuUsage()` of each block.

This wording keeps the two real risks in the target, and it does not depend on the load of the
machine. The browser check stays the final check: the underrun count of Chrome
(`AudioContext.playbackStats`, TODO, step 7).

## Status

Date: 2026-10-05. The work agent fixed the findings below in the commits from `5141c9a` to
`ca46fe8`. Each new test failed with the change of the review, or without the fix, before the
commit. A review agent must approve these fixes (condition 1).

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| B1 | fixed | `5141c9a`, `4de8808`, `782347e`, `8ef2d78`, `3ba5f2d` | Nothing. One test for each of the five rules. The 13 changes of the table each make a test fail. |
| B2 | fixed | `dccc31a` | Nothing. The rule is in 3.3 and section 10. |
| N1 | open | none | The user decides the wording of the render target (TODO, step 2). |
| N2 | open | none | The warm-up task waits for the Safari result. |
| N3 | fixed | `7bd561d` | Nothing. The flute part of the review gets 2 players. |
| N4 | fixed | `567f33b` | Nothing. |
| N5 | fixed | `c88705f` | Nothing. |
| N6 | fixed | `19431ce` | Nothing. The user can still change the list (section 10). |
| N7 | fixed | `a86905c` | Nothing. |
| N8 | fixed | `7711f36`, `982f7fd`, `5f7e746` | Nothing. The subject of `bcd5b85` stays, as the review asks. |
| Condition 7 (F5) | fixed | `7618c79`, `ca46fe8` | Nothing. |

Notes on the verdicts:

- **B1.** The removal down to 0 players (`src/score/players.ts:224`) has no test. It cannot
  change a result: at most 60 seats have players (3.7), so a total above 60 always has a seat
  with 2 or more players, and the third step of the removal never reaches a seat with 1 player.
- **B2.** The rule refuses a file with more than 100,000 conducted beats, with the error
  `not-midi` and the current message of 2.8. Thus `FileError` and 2.8 do not change. The rule
  counts beats, because a limit on the song length alone does not hold: a tempo of 1
  microsecond for each quarter note gives 1,000,000 beats in 1 s. `buildBeats()` stops at beat
  100,001, so its cost does not grow with the song length. The test with the 37-byte file of
  the review stopped Node with "JavaScript heap out of memory" after 58 s without the rule. The
  seats, the players, the synth events, and the preset list have a cost that grows with the
  event count only.
- **N3.** Each note of a rolled chord now tests the earlier notes at its own start. The player
  counts of the six demos do not change. 3.8 states the rule with the case of the review.
- **N5.** The text of 9.5 was the stale one: commit `9b644a7` moved the render and the memory
  targets to step 2 in the table of 9.7 after 9.5 had its text. 9.5 and `TODO.md` now name the
  three targets of the table.
- **N6.** The code list was wrong for the GM program families. The list now also holds the
  bagpipe (109), the fiddle (110), the shanai (111), the synth leads (80 to 87), and the synth
  pads (88 to 95). The synth effects (96 to 103) stay out, because most of them decay. This
  changes the processor bundle by a few bytes, but no processor code.
- **N7.** Node 24 does not follow the standard here: its `windows-1252` decoder gives Latin-1
  control characters for the bytes 0x80 to 0x9F. A browser gives the characters of
  windows-1252. 3.3 and the comment now say both. The test keeps a byte above 0x9F.
- **N8.** A channel event of the parser now has `dataOffset`, and the patch script reads the
  program bytes from `parseMidi()`.
- **Condition 7.** The Worker keeps no cache. The synth keeps each bank for the session, and the
  `Player` asks the Worker only for the presets that the synth does not have. Each preset is
  thus one time in memory: at most 9.0 MB of PCM for one demo (Boulanger), and 12.2 MB for the
  20 presets of all six demos in one session (`src/audio/pcm-memory.test.ts`). Before, the
  Worker cache held the same bytes a second time.

Conditions 2 to 6 of section 2 stay open. They wait for the Safari result or for the user.

## Re-review (2026-10-05)

Reviewer: an independent review agent of design 9.8. The reviewer did not do the fixes. Scope:
the commits from `5141c9a` to `0cce8e1` (`git log 9d64eca..0cce8e1`), with the changed parts of
design 3.3, 3.8, 6.3, 6.5, 9.5, 9.7, and section 10. The reviewer ran the mutations and the
scripts in a temporary worktree at `0cce8e1`, and then removed the worktree.

### Verdict

**FIXES NEED CHANGES.**

The fixes of B1 and B2 are correct and complete. The fixes of N4 to N8 and of condition 7 are
correct. The fix of N3 (`7bd561d`) adds two new problems, R1 and R2. N3 does not block, but a
fix must not add a bug. Fix R1 and R2. Another possible change: revert `7bd561d` and state the
old reading in 3.8, as N3 permits.

### Commands

All commands ran at `0cce8e1`, from a clean worktree.

| Command | Result |
|---|---|
| `pnpm lint` | Pass, no diagnostics |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass: 39 files, 410 tests |
| `pnpm format:check` | Pass: 101 files |
| `pnpm build` | Pass: 274 preset files (35,923,610 B), 6 demo files, `processor-*.js` 345,926 B |
| `pnpm size` | Pass: 160,593 B of 1,000,000 B |

The fixes do not change the first download: a build at `9d64eca` also gives 160,593 B. The
increase from the 14,699 B of section 3.1 comes from the 24 commits between `7f1551c` and
`9d64eca` (three.js for step 3). The processor bundle increases by 16 B (N6).

### One line for each finding

| Finding | Result of the re-review |
|---|---|
| B1 | Confirmed. The 13 changes of the B1 table each make exactly one test fail (see below). |
| B2 | Confirmed. Without the check at `src/score/beats.ts:54`, the beats test fails in 216 ms, and the 37-byte test stops Node with "JavaScript heap out of memory" after 57 s. With the check, `buildScore()` refuses the 37-byte file in 10.5 ms. |
| N3 | Problems R1 and R2. Each half of the fix has a test: without the change at `src/score/players.ts:255` or at `:355`, the new test fails. |
| N4 | Confirmed. The four new cases give the error "has an entry that is not valid". |
| N5 | Confirmed. 9.5, 9.7, and `TODO.md` name the same three targets. |
| N6 | Confirmed, and the change is acceptable (see below). |
| N7 | Confirmed. Node 24.10 decodes the bytes 0x80 and 0x93 as U+0080 and U+0093. |
| N8 | Confirmed. `dataOffset` is the offset in the file. The running status test reads the program byte at each offset. |
| Condition 7 | Confirmed. The rule is correct in the four cases below. R3 and R4 are low notes. |

### B1: the 13 changes

| Change | Test that fails |
|---|---|
| `file.tracks.toReversed()` before the sort of the time signatures | `timeline.test.ts`: "uses the time signature of the later track for two at the same tick" |
| CC 32 also sets the bank | `timeline.test.ts`: "does not use the bank LSB (CC 32)" |
| The cap of viola, cello, contrabass, oboe, clarinet, bassoon, trumpet, trombone, or choir plus 1 (9 changes) | `players.test.ts`: "caps the players of a <section> seat", one test for each change |
| Divisi ranks a note only among the notes of the chord | `players.test.ts`: "gives a note over a held note the players of its rank (divisi)" |
| Step 2 of the removal also takes string seats | `players.test.ts`: "excludes the strings and the choir from the largest other seat" |

### B2: the limit of 100,000 beats

The limit is sound for real files. The reviewer built files with `writeSmf()` and ran
`buildScore()`:

| File | Result |
|---|---|
| The six demos | 0.77 to 2.22 beats per second. The limit is 12.5 to 36.1 hours of such music. |
| 4/4 at 120 BPM, 3 hours | Accepted, 21,600 beats, 0.5 ms |
| 4/4 at 300 BPM, 3 hours | Accepted, 54,000 beats, 1.2 ms |
| 7/8 at 240 BPM, 3 hours | Accepted, 86,400 beats, 1.6 ms |
| 12/16 at 200 BPM, 2 hours | Accepted, 96,000 beats, 4.9 ms |
| 4/32 at 120 BPM, 2 hours | Refused (`not-midi`), 6.0 ms |
| 4/4 at 120 BPM, 14 hours | Refused (`not-midi`), 2.0 ms |
| 1/1 at the slowest tempo (16.8 s for each quarter note), 99,999 bars | Accepted, 1,864 hours, 14.3 ms |

Each bar of `buildBeats()` adds at least one beat before the limit check. The parser refuses a
numerator of 0 and a tempo of 0. Thus the loop always ends, and its cost has a limit. A real
file gets to the limit only with a short beat unit (1/16 or shorter) and a length of about 2
hours or more. Such a file gets the message of a file that is not valid. That is acceptable.

No other path grows with the song length or the tempo:

- `TempoMap.toSeconds()` and `tempoAt()` use a binary search. The tempo map has one segment
  for each tempo event, so it grows with the file size only.
- The only loop that steps through time is the bar loop of `buildBeats()`. A search of `src/`
  for loops that step by a value finds only this loop and one loop of `models/stage.ts`.
- The block scheduler, the clock, and the engine use `durationSec` only as a value. A song of
  1,864 hours costs no more than a short song.
- `tools/patch-demos.ts` and the spike page read only the six known demos.

### N6: the change of `sustainsAfterSeek()`

The change is acceptable. Condition 3 of the step 1 review protects work that a Safari fix can
replace: the processor design of 6.4 to 6.6. `sustainsAfterSeek()` is a pure rule of `score/`.
Both audio designs of `webkit-audio.md` section 7 need the same rule, so a Safari fix loses no
work. The change touches no processor code, and the bundle increases by 16 B. The new programs
have a long sound (synth leads and pads, bagpipe, fiddle, shanai). Section 10 records the list,
so the user can change it.

### Condition 7: the cases of the Worker cache rule

- **Engine failure.** `#fail()` clears `#loadedBanks` and sets `#pcmBytes` to 0. The new engine
  has a new synth, so the next load asks for all presets. A test pins this case.
- **A load that a later load replaces after its `banks` message.** The player marks the banks
  before it waits for `ready`, and the processor adds them in port order. The later load does
  not ask for them again. Correct.
- **A load that a later load replaces during its decode.** The result is correct, but the
  presets decode two times (R3).
- **Two demos that share presets.** The second load sends only the new banks.
  `addSoundBank()` of spessasynth_core keeps the earlier banks, and the processor answers an
  empty `banks` message with `ready`. The test of `pcm-memory.test.ts` gives 20 presets in
  12.2 MB of PCM for the six demos.

### R1. The N3 fix makes a large chord slow (medium)

Place: `src/score/players.ts:355-358`. For each note of a chord, `playersOf()` sorts the held
notes and the full chord again, finds the rank with `indexOf()`, and copies the set of taken
players. A chord of k notes thus costs k sorts of k notes.

The reviewer built a format 1 file with a flute chord of k notes at tick 0 on channel 0, and a
flute note on channel 1, and ran `buildScore(bytes, 'auto')`:

| Chord | File size | Before `7bd561d` | At `0cce8e1` |
|---|---|---|---|
| 1,000 notes | 6,056 B | 9 ms | 89 ms |
| 4,000 notes | 24,056 B | 17 ms | 1,538 ms |
| 16,000 notes | 96,056 B | 60 ms | 26,947 ms |

A valid file of 96 KB thus stops the tab for 27 s. This is the failure class of B2. Some real
files ("black MIDI") have chords of thousands of notes. The demos do not change: Boulanger
builds in 19.0 ms (median of 7).

Requested change: sort the chord one time. Calculate the rank of a note from the count of held
notes at or above its pitch, plus its index in the sorted chord. Keep one busy set for the
chord, as before the fix. Add a test with a chord of 16,000 notes. It fails with the Vitest
timeout of 5 s at `0cce8e1`.

### R2. Divisi gives a double stop in a rolled chord over a short held note (low)

Place: `src/score/players.ts:356` and `:361`. Each note of a chord now divides the players over
its own list: the held notes at its start, plus the full chord. Two notes of one chord can thus
use two different divisions, and their players can overlap.

Input: 125 BPM, so 1 tick is 1 ms. A viola or cello part of an orchestral file (base size 3):

| Note | Start | End | Players at `0cce8e1` | Players before `7bd561d` |
|---|---|---|---|---|
| A, key 60 | 0 ms | 130 ms | 0, 1, 2 | 0, 1, 2 |
| C, key 64 | 60 ms | 1,000 ms | 1 | 1 |
| B, key 67 | 100 ms | 1,000 ms | 0, 1 | 0 |

B divides 3 players over B and C, and gets players 0 and 1. C divides 3 players over B, C, and
A, and gets player 1. Thus player 1 plays B and C together from 100 ms to 1,000 ms, and player
2 plays nothing after 130 ms. Design 3.8 gives a double stop only to a chord with more notes
than players. A violin (4 players) gives no overlap with this input.

Requested change: use one division for all notes of a chord, so that the players of two notes
of the chord do not overlap. Add the input above as a test.

### R3. A replaced load decodes the shared presets again (low)

Place: `src/audio/player.ts:181`. A load marks its banks only after its decode. If a later load
replaces it during the decode, the later load asks the Worker for the same presets again. The
Worker decodes them a second time, and the player drops the first result. Before, the Worker
cache gave the second request the same promise. Example: demo 1 loads after the first frame,
and the user selects demo 2 during that load. The result is correct, and only the load time
increases. Design 6.3 says that a switch between demos that share presets does not decode them
again, and this case does not agree.

Requested change: state the case in 6.3, or let the next load use the pending decode of the
replaced load.

### R4. Design 6.3 gives no upper limit of the session memory (low)

The synth keeps all banks of a session. After the dropped files of step 6, a session can hold
any preset. All 274 preset files give 147.4 MB of PCM (the melodic presets of bank 0: 52.6
MB). The old design held the same banks two times, so the fix is an improvement. The memory
target of 9.7 is for each demo, so it does not fail.

Requested change: give this limit in 6.3. The user can also decide to remove old banks above a
limit.

A note on a rule that did not change: the bank choice of spessasynth_core can depend on the
banks of earlier pieces. An example is a score with a missing bank MSB and a CC 32 value that
names a bank of the same program from an earlier piece. Then `selectPatch()` takes that bank.
The Player had the same behavior before the fix. The case is rare, and it needs no change now.

### Conditions for the final approval of step 2

1. R1 and R2 are fixed, or `7bd561d` is reverted and 3.8 states the old reading. A review agent
   approves the change.
2. R3 and R4 are fixed or stated in 6.3. They do not block.
3. Conditions 2 to 6 of section 2 stay open. Condition 7 is approved.
