# Scheduling research: own scheduler (Design A) or spessasynth Sequencer (Design C)

Date of research: 2026-10-04.

This report gives facts for the audio design. It does not give app code. Each fact has a source:
a file and line range, a docs page, or a local test. "Not verified" means that no source or test
confirms the fact. "Inference" marks a conclusion that comes from the cited code but that no test
proves.

This report does not repeat section 1 of `research-audio.md` (versions, sizes, block grid, events
for visuals, SF3 split). Read that section first.

## 0. Method and sources

- Source code at fixed commits (the same clones as the earlier report):
  - **core** = spessasynth_core, commit `3709ae6`, version 4.3.22. Paths below start at
    `spessasynth_core/`.
  - **lib** = spessasynth_lib, commit `40f9be2`, version 4.3.14. Paths below start at
    `spessasynth_lib/`.
- The published `spessasynth_core@4.3.22` `dist/index.js` has the same event queue code as the
  source (local `grep` of `eventQueue` in `ss/node_modules/spessasynth_core/dist/index.js`, lines
  19665, 19802-19807, 19924-19927).
- CAUTION: the lib lock file pins core **4.3.20** (`spessasynth_lib/package-lock.json` L2917-2920).
  The prebuilt worklet file `spessasynth_processor.min.js` bundles core inside it, so it probably
  contains core 4.3.20, not 4.3.22. Inference, not verified. The event queue code in the worklet
  file is the same (local `grep` of `eventQueue` in `dist/spessasynth_processor.min.js`).
- Local tests: Node v24.10.0, Apple M1 Max, spessasynth_core 4.3.22 from npm, sound bank
  `GeneralUserGS.sf3`. Scripts are in `scratchpad/ss/`:

| Script | Question |
|---|---|
| `q_common.mjs` | Shared helper. It renders 128-frame blocks at 48 kHz and calls `processTick()` before each block, as the lib worklet does (`spessasynth_lib/src/synthesizer/worklet/worklet_synthesizer_core.ts` L61-98). |
| `q1_cancel.mjs` | 1. Cancel queued events |
| `q2_queue_cost.mjs` | 2. Queue cost |
| `q3_channels.mjs` | 3. More than 16 channels |
| `q4_memory_midi.mjs`, `q4b_loadcost.mjs` | 4. MIDI in memory |
| `q5_seek.mjs`, `q5b_seekcost.mjs`, `q5c_pause_sustain.mjs` | 5. Seek |
| `q6_midi_rules.mjs`, `scan.mjs`, `look.mjs` | 6. Tempo, missing note off, double note on |
| `q7_decode.mjs` | 7. SF3 decode |
| `q8_rate.mjs` | 8. Playback rate |
| `q_mute.mjs` | Mute options (used in 1 and in the table) |

- Limits of the tests: the tests call `SpessaSynthProcessor` (core) directly. They do not use a
  browser, an AudioWorklet, or a MessagePort. Times are Node V8 times. Browser times can be
  different (not verified).

How the lib sends a scheduled event, and where each test looks:

```text
 Main thread (lib)                    AudioWorklet thread (core inside the worklet file)
 +----------------------------+       +------------------------------------------------------+
 | synth.noteOn(ch, k, v,     |  one  | port.onmessage -> handleMessage("midiMessage")       |
 |   { time })                |  post | -> SynthesizerCore.processMessage(bytes, off, {time}) |
 |  -> _sendInternal()        |------>|    time <= now : run at once                         |
 |  -> port.postMessage(...)  | Msg   |    time >  now : eventQueue.push(); eventQueue.sort() |
 +----------------------------+       |                                                      |
                                      | process() each render quantum (128 frames):          |
                                      |  1. sequencer.processTick()                          |
                                      |  2. processSplit(): while (queue[0].time <= now)     |
                                      |       queue.shift() -> processMessageInternal()      |
                                      |  3. render voices                                    |
                                      +------------------------------------------------------+
```

Sources for the diagram: `spessasynth_lib/src/synthesizer/basic/basic_synthesizer.ts` L450-465,
L798-816; `spessasynth_lib/src/synthesizer/worklet/worklet_synthesizer.ts` L56-62;
`spessasynth_lib/src/synthesizer/worklet/worklet_synthesizer_core.ts` L46-51, L61-98;
`spessasynth_lib/src/synthesizer/basic/basic_synthesizer_core.ts` L168-175;
`spessasynth_core/src/synthesizer/audio_engine/synthesizer_core.ts` L494-516, L687-703.

---

## 1. Design A: cancel or clear events that wait in the queue

### 1.1 There is no API that clears the queue

- The queue is a private field of `SynthesizerCore`:
  `spessasynth_core/src/synthesizer/audio_engine/synthesizer_core.ts` L268-275.
- Only two places use it: `processMessage` adds and sorts (L494-516), and `processSplit` removes
  due events (L693-703). A `grep` for `eventQueue` in core `src` finds no other line (local
  `grep`, lines 270, 506, 511, 695-698).
- The lib main-thread API has no method that reaches the queue. The worklet message handler has no
  "clear queue" case (`spessasynth_lib/src/synthesizer/basic/basic_synthesizer_core.ts` L154-430,
  local read).

```typescript
/** Shape of one queued event (core synthesizer_core.ts L270-274). */
interface QueuedEvent {
  /** Raw MIDI bytes, status byte first */
  message: Uint8Array | number[];
  /** Added to the channel nibble of the status byte */
  channelOffset: number;
  /** AudioContext time in seconds. Only events with time > currentTime go into the queue. */
  time: number;
}
```

### 1.2 What each "stop" action does, and what it does to the queue

| Action (lib) | What it calls in core | Effect on sounding notes | Effect on queued events | Source |
|---|---|---|---|---|
| CC 123 all notes off (also CC 124, 125) | `MIDIChannel.stopAllNotes()` | Release (normal release envelope) of all voices on the channel | None | `src/synthesizer/audio_engine/channel/controller_change.ts` L58-63 |
| CC 120 all sound off | `stopAllNotes(true)` | Voices stop at once | None | same file L65-68 |
| CC 121 reset all controllers | `resetRP15()` | Resets pitch wheel, pressure, CC 1, 11, 64, 65, 66, 67, RPN | None | same file L181-184; `channel/reset.ts` L147-171 |
| `synth.stopAll(force)` | `stopAllChannels(force)` | All channels, release or stop | None | lib `basic_synthesizer.ts` L493-499; lib `basic_synthesizer_core.ts` L182-188; core `synthesizer_core.ts` L481-486 |
| `synth.reset()` | `SynthesizerCore.reset()` | Resets all channels and global parameters, program 0 | None | lib `basic_synthesizer.ts` L533-539; lib `basic_synthesizer_core.ts` L177-180; core `synthesizer_core.ts` L595-625 |
| MIDI system reset `0xFF` | `stopAllChannels(false)` + `reset()` | Release, then reset | None | core `synthesizer_core.ts` L1404-1409 |

- `stopAll()` and `reset()` in the lib take no `eventOptions`. They apply when the worklet gets the
  message (lib `basic_synthesizer.ts` L493-499, L533-539).
- A CC 120 or CC 123 that you send with a future `time` goes into the same queue. It runs at its
  time, like a note.

**Local test** (`q1_cancel.mjs`). Note on (channel 0, key 60, strings) queued for 0.5 s, note off
for 1.0 s. At 0.1 s the test applies one action. Then it renders to 0.8 s.

| Action at 0.1 s | Queue length before / after | Sound after 0.5 s |
|---|---|---|
| none | 2 / 2 | yes, 2 voices |
| CC 123 | 2 / 2 | yes, 2 voices |
| CC 120 | 2 / 2 | yes, 2 voices |
| CC 121 | 2 / 2 | yes, 2 voices |
| `stopAllChannels(false)` (lib `stopAll()`) | 2 / 2 | yes, 2 voices |
| `stopAllChannels(true)` (lib `stopAll(true)`) | 2 / 2 | yes, 2 voices |
| `reset()` (lib `reset()`) | 2 / 2 | yes, but 1 voice: the program went back to 0 (piano) |
| MIDI reset `0xFF` | 2 / 2 | yes, 1 voice (piano) |
| channel system parameter `isMuted = true` | 2 / 2 | **no sound** |

Result: no stop action removes queued events. A reset is worse than nothing, because the queued
note then plays with the reset program.

### 1.3 Order of events with the same time

- Each push sorts with `Array.prototype.sort` (core `synthesizer_core.ts` L511). This sort is
  stable in ECMAScript 2019 and later, so events with the same time keep the send order.
- **Local test** (`q1_cancel.mjs`): note on and CC 123 at the same time. Order "note on, then
  CC 123": 0 held voices after. Order "CC 123, then note on": the note sounds.

### 1.4 Partial work-arounds (inference, partly tested)

- `isMuted` on a channel drops each note on that arrives while the channel is muted
  (`channel/note_on.ts` L34-44). The test above shows that a queued note on is dropped.
  Limits:
  - `isMuted = true` also stops the sounding notes of the channel at once
    (`channel/parameters/system.ts` L110-113).
  - The mute is not timed. The lib sends it as a plain message
    (`spessasynth_lib/src/synthesizer/basic/lib_midi_channel.ts` L127-150).
  - Queued program changes and controllers still apply while muted.
  - To "cancel" a look-ahead window, the app must keep the channels muted until the last queued
    time passes, then unmute. Not tested in a browser.
- Keep the look-ahead short, so that few events wait in the queue when the user seeks or pauses.
- Make a new synthesizer. This clears everything but reloads the sound banks. Not tested.

### 1.5 Danger: a queued event for a channel that does not exist stops the synthesizer

- Core sends a note to `this.midiChannels[channel + offset].noteOn(...)` without a check
  (`synthesizer_core.ts` L364-387). A missing channel gives `undefined`.
- **Local test** (`q1_cancel.mjs`): a note on queued for channel 16 (only 16 channels exist) makes
  `process()` throw `TypeError: Cannot read properties of undefined (reading 'noteOn')`. The same
  event without a time throws inside `processMessage`.
- In the worklet, the queue runs inside `process()` (lib `worklet_synthesizer_core.ts` L93-97).
  The Web Audio spec, section 2.6 "Rendering an Audio Graph", says: if `process()` gives an abrupt
  completion, set `[[callable process]]` to false, make a silent output, and fire
  `processorerror`. So one bad queued event silences the synthesizer for good.
  Source: https://webaudio.github.io/web-audio-api/ (section 2.6, also the local copy
  `scratchpad/webaudio.html`).
- Inference: in Design A, send `addNewChannel()` before any event for that channel. Messages on one
  MessagePort keep their order, so the channel exists when the event arrives.

---

## 2. Design A: cost and limits of many queued events

### 2.1 How the queue is stored and sorted

- A plain JavaScript array of objects (core `synthesizer_core.ts` L270-274).
- Each event with `time > currentTime` is pushed, then the **whole array is sorted**
  (L505-511). Cost per push grows with the queue length.
- At the start of each render call, a `while` loop removes due events with `shift()` and runs them
  (L693-703). Due events run at the block start, as the earlier report showed.
- No length limit exists in the code (L494-516 has no check). No docs page states a limit (lib
  docs `docs/synthesizer/basic-synthesizer.md` L113-120 describe only `time`).
- The lib sends **one `postMessage` per event** (lib `basic_synthesizer.ts` L798-816). The worklet
  runs one message handler per event on the audio thread (lib `worklet_synthesizer_core.ts`
  L46-51).

### 2.2 Measured cost (local test `q2_queue_cost.mjs`, Node, M1 Max)

CC events spread over the next 2 s, all sent at once:

| Events sent at once | Order | Time to queue all | Per event |
|---|---|---|---|
| 1,000 | ascending | 8.3 ms | 8.3 us |
| 5,000 | ascending | 160 ms | 32 us |
| 10,000 | ascending | 610 ms | 61 us |
| 10,000 | random | 666 ms | 67 us |
| 20,000 | ascending | 2,536 ms | 127 us |

One more push when the queue already holds N events:

| N | Cost of one push |
|---|---|
| about 100 | 15 us |
| about 1,000 | 26 us |
| about 10,000 | 151 us |

Render side:

- With 10,000 queued CC events, the slowest 128-frame block took 0.008 ms.
- With 20,000 queued events, the slowest block took 0.6 to 0.9 ms. The mean was 0.2 to 0.4 ms.
- 2,000 CC events due in one block: that block took 0.14 ms. The budget is 2.67 ms at 48 kHz.
- `structuredClone` of 10,000 lib message objects: 24 ms. This is only a proxy for the
  `postMessage` cost. Not measured in a browser.

Inference:

- In a browser, the sort cost runs on the audio thread, because the worklet message handler runs
  there. 10,000 events sent at once can use about 0.6 s of audio-thread time, so audio drop-outs are
  likely. Not verified in a browser.
- A scheduler that keeps the queue at about 100 to 1,000 events costs about 15 to 26 us per event.

---

## 3. Design C: more than 16 channels

### 3.1 Yes. The synthesizer can have more than 16 channels

The diagram shows the three ways to address channel 16 and higher.

```text
 (1) lib synth.addNewChannel()  --post "addNewChannel"-->  core createMIDIChannel(true)
                                                          (adds 1 channel, no upper limit)

 (2) lib noteOn(20, ...)  -->  status 0x90 | (20 % 16) = 0x94,  channelOffset = 16
                          -->  core: channel = (status & 0x0F) + channelOffset = 20

 (3) MIDI file, track with FF 21 01 pp (port pp)
     Sequencer: first port seen   -> channels  0..15
                second port seen  -> channels 16..31 (adds 16 channels)
                third port seen   -> channels 32..47 (adds 16 channels)  ...
```

| Way | Source | Test |
|---|---|---|
| `synth.addNewChannel()` | lib `basic_synthesizer.ts` L373-375, L858-869; core `processor.ts` L466-468; core `synthesizer_core.ts` L576-587; docs `docs/synthesizer/basic-synthesizer.md` L192-194 | 16 calls: 16 to 32 channels |
| Channel number > 15 in lib methods | lib `basic_synthesizer.ts` L456-457, L481-482, L520-521 split the channel into a status nibble and `channelOffset` | status `0x94`, offset 16: voices on channel 20 |
| `sendMessage(bytes, channelOffset)` | lib `basic_synthesizer.ts` L435-441; docs `basic-synthesizer.md` L279-284; core `synthesizer_core.ts` L1348 | same as above |
| MIDI port meta event `FF 21` in a file | core `src/sequencer/load_new_sequence.ts` L11-36; `src/sequencer/sequencer.ts` L408-413; `src/sequencer/process_event.ts` L39-41, L160-163; docs `docs/extra/about-multi-port.md` | see 3.2 |
| SysEx "port select" `F5 pp` (Falcosoft) | core `system_exclusive/system_exclusive.ts` L66-82 | not tested |

### 3.2 The Sequencer maps MIDI ports to channels 16 and higher

**Local test** (`q3_channels.mjs`). One track per port, note on channel 0 in each track:

| Ports in the file | Synth channels after load | Note on channels seen |
|---|---|---|
| 0, 1, 2 | 48 | 0, 16, 32 |
| 0 to 7 | 128 | 0, 16, ..., 112 |
| 0 to 19 | 320 | 0, 16, ..., 304 |
| 5 (track 1), 0 (track 2) | 32 | 0 (port 5), 16 (port 0) |

- The offset follows the order in which ports first appear, not the port number
  (`load_new_sequence.ts` L21-35, test row 4).
- A track with no note events gets no port (`load_new_sequence.ts` L16-19).
- `MIDIBuilder.addTrack(name, port)` writes the `FF 21` event (`src/midi/midi_tools/midi_builder.ts`
  L97-116). `MIDIBuilder.noteOn` takes `channel % 16` (L166), so a built file needs ports for more
  than 16 channels.

### 3.3 Maximum

- No limit in `createMIDIChannel` (core `synthesizer_core.ts` L576-587). Local test: 256 channels
  with direct calls (a note on channel 255 played), and 320 channels from 20 ports.
- Inference: the `FF 21` data is one byte, so a file can name at most 256 ports.
- The worklet has 16 dry stereo outputs plus 1 effects output (lib `worklet_synthesizer.ts`
  L24-31). Channel n renders into output `n % 16` (core `synthesizer_core.ts` L737; test: a note on
  channel 20 came out on output 4). This matters only for per-channel outputs, which the docs call
  "only meant for visualization" (lib `basic_synthesizer.ts` L378-386).

### 3.4 Problems with extra channels

- **A channel that `createMIDIChannel()` adds starts as a drum channel**
  (`synthesizer_core.ts` L583-586: `channel.setDrums(true)`). After `reset()`, only channels with
  `channel % 16 == 9` are drums (`channel/reset.ts` L143). Local test: drums were channels 9 and
  16-31 after 16 adds, and 9 and 25 after `reset()`. The Sequencer calls `reset()` on each load
  and seek (section 5), so files are fine. In Design A, call `setDrums(false)` or `reset()` after
  `addNewChannel()`.
- **Channel 25, 41, 57, ... are drum channels after each reset** (`reset.ts` L99-102, L143).
  Inference for Design C: do not put a melodic seat on a channel where `channel % 16 == 9`.
- `BasicMIDI.getNoteTimes()` returns 16 arrays and ignores ports (`src/midi/midi_tools/get_note_times.ts`
  L36, L69-70). Local test: with 3 ports, array 0 held the notes of all 3 ports.
- On pause, the Sequencer sets the sustain pedal to 0 only on channels 0-15
  (`sequencer.ts` L428-432). Local test (`q5c_pause_sustain.mjs`): after pause and play while the
  file holds the pedal down, CC 64 was 0 on channel 1 and 127 on channel 17. The pedal state on
  channels 0-15 is lost until the next CC 64 event in the file.

---

## 4. Design C: play a MIDI built or edited in memory

### 4.1 The Sequencer takes a `BasicMIDI` object, not only file bytes

```typescript
/** lib src/sequencer/types.ts L70-81 */
type SuppliedMIDIData =
  | BasicMIDI
  | {
      /** The binary data of the file */
      binary: ArrayBuffer;
      /** Name to use when the file has none */
      fileName?: string;
    };
// sequencer.loadNewSongList(midiBuffers: SuppliedMIDIData[]): void
```

- The worklet checks `"duration" in s`. A cloned `BasicMIDI` goes through `BasicMIDI.copyFrom`.
  Other objects go through `BasicMIDI.fromArrayBuffer`
  (lib `basic_synthesizer_core.ts` L251-264).
- Docs: "Either BasicMIDI or objects ... with two properties", and the tip "it is recommended
  passing the binary data rather than the parsed MIDI instance"
  (lib `docs/sequencer/index.md` L158-166).
- **Local test** (`q4b_loadcost.mjs`), main cost on the audio thread:

| File | Events | `fromArrayBuffer` (bytes path) | `structuredClone` of `BasicMIDI` (both sides) | `copyFrom` |
|---|---|---|---|---|
| Symphony5_1.mid | 16,668 | 5.2 ms | 19.0 ms | 1.1 ms |
| Concerto_No3.mid | 24,791 | 8.0 ms | 28.0 ms | 1.6 ms |

  The bytes path is cheaper. This agrees with the docs tip.

### 4.2 Build and write MIDI

| API | What it does | Source |
|---|---|---|
| `new MIDIBuilder(options)` | New sequence. Adds a conductor track with tempo. | core `src/midi/midi_tools/midi_builder.ts` L51-72 |
| `addTrack`, `addEvent`, `noteOn`, `noteOff`, `programChange`, `controllerChange`, `pitchWheel`, `systemExclusive`, `setTempo` | Add events by absolute tick | same file L79-291 |
| `BasicMIDI.flush()` | Sorts each track by tick, then rebuilds the timeline, tempo list, duration, ports | core `src/midi/basic_midi.ts` L395-403, L671-1129 |
| `BasicMIDI.writeMIDI()` | Returns a Standard MIDI File as `ArrayBuffer` | `basic_midi.ts` L420-422 |
| `BasicMIDI.copyFrom(mid)` | Deep copy. Does not call `flush()`. | `basic_midi.ts` L242-260 |
| `BasicMIDI.modify(options)` | Changes programs and controllers, can clear a channel | `basic_midi.ts` L448-450; `midi_tools/modify_midi.ts` L123-180 |

- You must call `flush()` after edits. **Local test** (`q4_memory_midi.mjs`): a `MIDIBuilder`
  before `flush()` had timeline length 0 and duration 0. After `flush()`: 6 and 1 s.
- **Local test**: a `MIDIBuilder` song, copied with `BasicMIDI.copyFrom`, then `structuredClone`,
  then `copyFrom` again (the path of the lib worklet), played all 8 notes in the Sequencer.
- CAUTION: `MIDIBuilder` has a `TextEncoder` field (`midi_builder.ts` L45). In Node,
  `structuredClone(builder)` worked. In a browser, `TextEncoder` is a platform object that is not
  serializable, so `postMessage(builder)` can throw `DataCloneError`. Not verified in a browser.
  Pass `BasicMIDI.copyFrom(builder)` or `builder.writeMIDI()` bytes instead.

### 4.3 Remove SysEx and change channels before load

- Each track has `events: MIDIMessage[]` with `ticks`, `statusByte`, `data`
  (`src/midi/midi_track.ts` L20-23; `src/midi/midi_message.ts` L12-40). `MIDITrack` has
  `addEvents`, `deleteEvent`, `pushEvent` (`midi_track.ts` L60-78).
- SysEx events have `statusByte === 0xF0` (`MIDIMessageTypes.systemExclusive`). The channel of a
  voice event is the low nibble of `statusByte` (`process_event.ts` L32-35).
- **Local test** (`q4_memory_midi.mjs`) on `Symphony5_1.mid`: delete SysEx events, rewrite the
  channel nibble of each voice event, `flush()`, `writeMIDI()`, parse again. The event count stayed
  16,668. The duration stayed 316.563 s. The Sequencer played the edited object and the note on
  events used the new channels.
- None of the 60 sample files in `scratchpad/midi/` has SysEx (`scan.mjs`). So the SysEx removal
  ran on 0 events. The code path is tested, the effect on real SysEx is not.

---

## 5. Sequencer seek (`currentTime = t`)

### 5.1 What seek does

Core `src/sequencer/sequencer.ts` L257-280 and `src/sequencer/set_time_to.ts` L59-357.

```text
 seek(t)
   |
   v
 clear playingNotes (the list of held notes)                sequencer.ts L275
   |
   v
 sendMIDIReset(): release all voices, then synth.reset()    set_time_to.ts L70; sequencer.ts L428-465
   |
   v
 replay events from tick 0 to t, without sound:             set_time_to.ts L111-307
   note on / note off ........ skipped (last key kept for portamento)  L148-157
   program change, SysEx ..... run in order                            L165-205, L292-294
   bank select, RPN, NRPN,
   data entry, CC 121 ........ run in order (nonSkippableCCs)         L18-32, L223-224
   other CCs, pitch wheel .... saved, sent once at the end            L216-225, L309-341
   tempo ..................... kept                                   L277-284
   |
   v
 set start time so that song time = t                      sequencer.ts L278, L507-510
```

- Seek to `t > duration` or `t < 0` jumps to the first note. Seek to a time before the first note
  also jumps to the first note when `skipToFirstNoteOn` is true (default) (`sequencer.ts`
  L264-273).

### 5.2 Local test results (`q5_seek.mjs`)

The test song: channel 0 has bank 0, program 40, CC 7 = 50, CC 10 = 20, one long note (key 60,
0 s to 10 s), CC 11 = 90 and pitch wheel 10000 at 1 s, program 42 at 2 s. Channel 1 has the
sustain pedal down from 3 s.

| Case | Program ch 0 | CC 7 / 10 / 11 | Pitch wheel | CC 64 ch 1 | Key 60 sounds after? |
|---|---|---|---|---|---|
| A. Play 0 to 5.5 s, no seek (reference) | 42 | 50 / 20 / 90 | 10000 | 127 | yes |
| B. Seek 0.2 s to 5.0 s | 42 | 50 / 20 / 90 | 10000 | 127 | **no** |
| E. Seek back 6 s to 1.5 s | 40 | 50 / 20 / 90 | 10000 | n/a | **no** |
| D. Pause at 5 s, then `play()` | 42 | 50 / 20 / 90 | 10000 | n/a | **yes**, a new note on |

- Seek restores program, bank, controllers, and pitch wheel. All values matched the reference.
- **Seek does not start held notes again.** After seek, the old voice was in release and no note on
  came in the next 50 ms. The note off of key 60 came later at its normal time.
- **Pause and play start held notes again.** `retriggerPausedNotes` is `true` by default
  (`sequencer.ts` L45, L312-323). The lib has no option for it (local `grep` of `retrigger` in lib
  `src`: 0 matches).
- `isMuted` stays after seek (test case C). The channel reset does not change system parameters
  (`channel/reset.ts` L56-145).
- Seek cost (`q5b_seekcost.mjs`): 0.6 to 2.0 ms for Symphony5_1.mid (16,668 events) and
  Concerto_No3.mid (24,791 events). It runs on the audio thread in the worklet (lib
  `basic_synthesizer_core.ts` L290-293).

---

## 6. Tempo in other tracks, note on without note off, two note ons on one key

### 6.1 Tempo events in tracks other than track 0

- **Playback is correct.** The Sequencer walks one merged timeline of all tracks
  (`basic_midi.ts` L1107-1114, `process_tick.ts` L12-46). Each tempo event changes the tick length
  when it plays, from any track (`process_event.ts` L128-138). `getNoteTimes` uses the same
  timeline (`get_note_times.ts` L64-108).
- **`BasicMIDI` time conversion can be wrong.** `parseInternal` adds tempo events track by track
  (`basic_midi.ts` L705-818), then only reverses the list (L936). It does not sort it.
  `midiTicksToSeconds` expects the list in descending tick order (L283-298). `duration` comes from
  `midiTicksToSeconds` (L1105).
- The list is wrong when a later track has a tempo event at a lower tick than a tempo event in an
  earlier track.

**Local test** (`q6_midi_rules.mjs`). 480 ticks per beat. 120 BPM at tick 0, 60 BPM at tick 1920,
240 BPM at tick 960. Notes at ticks 0, 960, 1920, 2880, 3840. Correct starts: 0, 1, 1.5, 3.5, 5.5 s.

| Value | 240 BPM event in track 1 | All tempo events in track 0 |
|---|---|---|
| `tempoChanges` as stored | `[960,240],[1920,60],[0,120],[0,120]` (wrong order) | `[1920,60],[960,240],[0,120],[0,120]` |
| `midiTicksToSeconds` of the 5 notes | 0, 0, 0.5, 1, 1.5 (**wrong**) | 0, 1, 1.5, 3.5, 5.5 |
| `getNoteTimes` starts | 0, 1, 1.5, 3.5, 5.5 | 0, 1, 1.5, 3.5, 5.5 |
| `duration` | 1.552 s (**wrong**, correct is 5.708 s) | 5.708 s |
| Sequencer note on times | 0.003, 1, 1.501, 3.501, 5.501 | 0.003, 1, 1.501, 3.501, 5.501 |
| Seek to 2.0 s | **restarted at the first note**, because 2.0 > the wrong duration (`sequencer.ts` L264-270) | next notes after 1.502 s and 3.502 s (correct) |
| `writeMIDI()` then parse | same wrong duration | correct |

- Real file: `Symphony7_2.mid` has tempo events in tracks 1 to 12, but all at tick 0, so its values
  are correct (`look.mjs`). The other sample files have tempo only in track 0 (`scan.mjs`).
- Inference: Design C cleaning that moves all tempo events into track 0 removes this problem. The
  lib main thread shows `duration` from the worklet copy, so a wrong duration can also show in the
  UI. Not tested.

### 6.2 Note on with no note off

- The Sequencer keeps the note on until the song ends. The song ends at the last voice event
  (`process_tick.ts` L32-41; `basic_midi.ts` L715-717). At the end, the Sequencer pauses and
  releases all notes (`sequencer.ts` L374-403).
- `getNoteTimes` sets the length to "end of song minus start" (`get_note_times.ts` L110-121).
- **Local test** (`q6_midi_rules.mjs`): a string note with no note off was held at 3.9 s and
  released after the song end at 4.04 s. `getNoteTimes` gave length 4.0417 s, the song duration.

### 6.3 Two note ons on one key and channel before a note off

- The synthesizer pairs note offs with note ons in **first in, first out** order. Each note on gets
  `noteID = noteOnID[key]++` (`channel/note_on.ts` L188). Each note off releases the voices with
  `noteID == noteOffID[key]`, then increments `noteOffID` (`channel/note_off.ts` L36-55).
- `getNoteTimes` also uses FIFO. The code comment says "FIFO, match behavior of the synth"
  (`get_note_times.ts` L47-63).
- **Local test** (`q6_midi_rules.mjs`):
  - Synth: note on (velocity 100) at 0 s, note on (velocity 40) at 0.5 s, note off at 1.0 s, note
    off at 1.5 s. The first note off released the velocity 100 note. The second released the
    velocity 40 note.
  - `getNoteTimes` for the same song: `{vel 100, start 0, length 1}`, `{vel 40, start 0.5, length 1}`.
  - Two note ons and only one note off: the second note stays on to the end of the song, in the
    Sequencer and in `getNoteTimes` (length 1.59 s = song end minus 0.5 s).
- Exceptions in code (not tested): `stopAllNotes` and `killNote` reset the IDs
  (`midi_channel.ts` L515-519, L734-737). Monophonic retrigger mode or MIDI `assignMode` 0 kills
  the old voice of the same key on each note on (`note_on.ts` L69-75).

---

## 7. SF3 (Ogg Vorbis) decode

### 7.1 When the decode happens

- **Not at bank load.** The SF2 reader keeps the Ogg data (`src/soundbank/soundfont/read/samples.ts`
  L100-107). Local test (`q7_decode.mjs`): 0 of 920 samples decoded after `SoundBankLoader` and
  after `addSoundBank`.
- **At the first use of a sample.** `getAudioData()` decodes once and keeps the result on the
  sample object (`src/soundbank/basic_soundbank/basic_sample.ts` L289-300, L349-357). A voice
  calls it when the voice cache has no entry for (preset, key, velocity)
  (`synthesizer_core.ts` L820-854; `voice/voice_cache.ts` L98). In the worklet this is the audio
  thread, inside the note on.
- Local test: the first note on of a violin key took 7.4 ms (2 samples decoded). The same note
  again took 0.06 ms.
- `clearCache()` clears only the voice cache, not the decoded data (`synthesizer_core.ts`
  L856-858). Inference: decoded samples stay decoded after a bank is added or removed.

### 7.2 Decode before playback

| Way | Thread | Source | Local test |
|---|---|---|---|
| `sequencer.loadNewSongList()` preloads all samples that the song uses (on by default) | audio thread (worklet message handler) | core `sequencer.ts` L68, L350-359; `basic_midi.ts` L371-389 | Symphony5_1.mid: 75 ms, 93 samples. Egmont.mid: 80 ms, 89 samples. |
| `BasicPreset.preload(keyMin, keyMax)` | where the bank lives | core `basic_preset.ts` L157-168 | not tested |
| `soundBank.setSampleFormat({ format: "pcm" })` then `writeSF2()`, then send the PCM SF2 to the worklet | any thread, for example a Web Worker | core `basic_soundbank.ts` L228-240 | see below |

- The lib has no main-thread API to preload a preset in the worklet (local `grep` of `preload` and
  `getVoicesForPreset` in lib `src`: 0 matches). The lib also has no switch for the core
  Sequencer `preload` flag (same `grep`).
- Inference for Design A: load a `BasicMIDI` that holds the needed notes into a lib `Sequencer` to
  trigger the preload. CAUTION: a load calls `synth.reset()` (section 5.1), so do it before the
  scheduler sends program changes.
- `isMuted` cannot help a preload, because a muted channel returns before it builds voices
  (`note_on.ts` L34-44).
- SF3 to PCM SF2 (`q7_decode.mjs`, part E):

| One-preset file | SF3 bytes | PCM SF2 bytes | Time |
|---|---|---|---|
| prog048 (Fast Strings) | 469,026 | 2,457,342 | 32 ms |
| prog040 (Violin) | 241,888 | 939,980 | 16 ms |
| drum048 (Orchestral kit) | 575,604 | 2,387,750 | 39 ms |

### 7.3 Time of one decode (local test, `q7_decode.mjs`, part C)

275 samples of 19 orchestral presets and 2 drum kits from GeneralUserGS, each decoded once:

| Statistic | Decode time | Sample length |
|---|---|---|
| median (p50) | 0.64 ms | 1.17 s |
| p90 | 1.41 ms | 2.14 s |
| p99 | 2.73 ms | 2.28 s |
| max | 3.78 ms | 2.37 s |
| total | 220 ms for 236 s of audio | about 0.93 ms per audio second |

- The budget of one 128-frame block is 2.67 ms at 48 kHz (calculation).
- Inference: a chord that needs several new samples in one block can take more than the budget, so
  a glitch is likely without a preload. Browser times are not verified. Safari uses a different
  JavaScript and WebAssembly engine (not measured).

---

## 8. `sequencer.playbackRate` during playback

- Core setter: it reads the song time, sets the rate, and moves the start time so that the song
  time stays the same (`sequencer.ts` L230-234, L507-510). It does not stop or restart voices.
- Lib setter: it sends `setPlaybackRate` and updates the main-thread estimate the same way (lib
  `src/sequencer/sequencer.ts` L213-219; lib `basic_synthesizer_core.ts` L300-303).
- The rate changes only when events play. The synthesizer renders at the AudioContext rate, so the
  pitch does not change (inference from the code above).

**Local test** (`q8_rate.mjs`): held string chord plus a note each 0.5 s. Rate change at 1.6 s.

| Check | Rate 1 to 2 | Rate 1 to 0.5 |
|---|---|---|
| Song time just before and just after the set | 1.6027 / 1.6027 (no jump) | 1.6027 / 1.6027 |
| Voices in the block before / after | 9 / 9 | 9 / 9 |
| Blocks after the change that are sample-identical to the no-change run | 20 (until the first event that moved) | 40 |
| Next note spacing | 0.25 s | 1.0 s |
| Largest sample step within 10 blocks of the change / whole run | 0.0098 / 0.0149 | 0.0098 / 0.0147 |

Result: the change applies at once, with no restart and no click from the change itself.

- Main-thread time: the lib computes `currentTime` on the main thread and corrects it only when a
  "sync" message (about each 1 s) differs by more than 0.05 s (lib `sequencer.ts` L391-395; lib
  `worklet_synthesizer_core.ts` L99-116). Inference: after play, seek, or a rate change, the
  main-thread song time can be off by the MessagePort delay, up to 50 ms, until the next sync.

---

## 9. Web platform: timers in a hidden tab

Sources are browser source code on the `main` branch as of 2026-10-04, plus vendor articles. Line
numbers can move. Copies of the source files are in `scratchpad/q9/`. I checked these lines in the
copies myself: Chrome `ComputeThrottlingType` and `kDedicatedWorkerThrottling`, Firefox
`TimeoutManager::IsActive` and `IsPlayingAudio`, WebKit `updateTimerThrottlingState`,
`hiddenPageAlignmentInterval`, the nesting levels, and the two WebKit preference defaults. The
other rows come from the research sub-task and I did not open them again.

### 9.1 Chrome

- Hidden and silent: timers go to a pool with 1 s wake-ups at once. After 10 s hidden, a CPU budget
  also applies. Sources:
  [frame_scheduler_impl.cc L1087-1130](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/main_thread/frame_scheduler_impl.cc#L1087-L1130),
  [page_scheduler_impl.cc L43-50, L671-694](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/main_thread/page_scheduler_impl.cc#L43-L50).
- Intensive throttling aligns chained timers (nesting level above 5) to 1 minute:
  [dom_timer.cc L345-365](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/core/scheduler/dom_timer.cc#L345-L365).
  The source starts it 60 s after a loaded page is hidden
  ([features.cc L66-84](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.cc#L66-L84)).
  The article https://developer.chrome.com/blog/timer-throttling-in-chrome-88 says 5 minutes.
- **Audible pages are exempt from both levels.** Both throttle types need
  `!IsAudioPlaying()` (frame_scheduler_impl.cc L1090-1110, checked). The page stays "audible" for
  30 s after the sound stops
  ([page_scheduler_impl.h L153-159](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/main_thread/page_scheduler_impl.h#L153-L159)).
- "Audible" comes from the level of the output stream, not from the node type. The audio service
  measures the level 15 times per second and counts -72.25 dBFS or more as audible
  ([output_stream.cc L30-47, L116-141](https://github.com/chromium/chromium/blob/main/services/audio/output_stream.cc#L30-L47)).
  Inference: AudioWorklet output counts. Digital silence does not count, so a long rest of more than
  30 s in the music can make the page "silent".
- Dedicated Worker timers: not throttled by default. `kDedicatedWorkerThrottling` is
  `FEATURE_DISABLED_BY_DEFAULT`
  ([features.h L16-18](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/scheduler/common/features.h#L16-L18), checked).
- `requestAnimationFrame` does not run in a background page:
  https://developer.chrome.com/blog/background_tabs
- Freezing: Energy Saver freezes only tabs that are "hidden and silent for more than five minutes"
  (https://developer.chrome.com/blog/freezing-on-energy-saver).

### 9.2 Firefox

- Hidden and not "active": minimum delay 1000 ms, and a budget after 30 s from page load
  ([TimeoutManager.cpp L208-278](https://github.com/mozilla-firefox/firefox/blob/main/dom/base/TimeoutManager.cpp#L208-L278),
  [StaticPrefList.yaml L3996-3999, L5617-5652](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml#L3996-L3999)).
- **A window with a running AudioContext is "active" and gets no throttling.** `IsActive()` returns
  true when `IsPlayingAudio()` is true
  ([TimeoutManager.cpp L97-121](https://github.com/mozilla-firefox/firefox/blob/main/dom/base/TimeoutManager.cpp#L97-L121), checked).
  `IsPlayingAudio()` is true for any AudioContext in the "running" state
  ([nsGlobalWindowInner.cpp L3080-3085](https://github.com/mozilla-firefox/firefox/blob/main/dom/base/nsGlobalWindowInner.cpp#L3080-L3085), checked).
  MDN says the same: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
- Dedicated Worker timers: not throttled in release builds. The pref `dom.workers.throttling.enabled`
  is on only in Nightly
  ([StaticPrefList.yaml L5341-5344](https://github.com/mozilla-firefox/firefox/blob/main/modules/libpref/init/StaticPrefList.yaml#L5341-L5344)).
- `requestAnimationFrame` in a hidden page: slowed to 1 frame per second or less, then stopped
  (reading of
  [nsRefreshDriver.cpp L1100-1112, L1380-1386](https://github.com/mozilla-firefox/firefox/blob/main/layout/base/nsRefreshDriver.cpp#L1100-L1112)).
  Not verified by a test.

### 9.3 Safari (WebKit)

- A hidden page is "visually idle", so timer throttling is on
  ([Page.cpp L3270-3288](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp#L3270-L3288), checked).
  The preference `HiddenPageDOMTimerThrottlingEnabled` defaults to true on Cocoa platforms
  ([UnifiedWebPreferences.yaml L2744-2761](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml#L2744-L2761), checked).
- **Audible audio does not remove the basic throttling.** An audible page goes to state `Enabled`
  instead of `EnabledIncreasing` (Page.cpp L3270-3288, checked). `Enabled` sets the alignment to
  `hiddenPageAlignmentInterval()`, which is **1 s**
  ([Page.cpp L3318-3330](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp#L3318-L3330);
  `DOMTimer.h` L56 in `scratchpad/q9/wk_DOMTimer.h`, checked).
- The alignment applies only to nested timers: a `setTimeout` chain at nesting level 10 or more,
  and a `setInterval` after 5 runs
  ([DOMTimer.cpp L59-61](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/DOMTimer.cpp#L59-L61),
  [Document.cpp L4668-4687](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/Document.cpp#L4668-L4687), checked).
  A scheduler loop is such a timer. Inference: in a hidden Safari tab, a main-thread scheduler
  wakes about once per second, even while it plays audio.
- The growing alignment (`HiddenPageDOMTimerThrottlingAutoIncreases`) defaults to false
  (UnifiedWebPreferences.yaml, checked). Whether Safari turns it on: not verified.
- Dedicated Worker timers: no alignment. Only `Document` changes the alignment, and the base value
  is 0
  ([ScriptExecutionContext.cpp L694-697](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/ScriptExecutionContext.cpp#L694-L697)).
- App Nap does not apply while the page is audible
  ([WebPage.cpp L1773-1779](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/WebPage/WebPage.cpp#L1773-L1779)).
  On iOS, WebKit keeps a foreground assertion while the page is audible, and releases it 10 s after
  the sound stops
  ([WebPageProxy.cpp L3901-3915](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/WebPageProxy.cpp#L3901-L3915)).
- `requestAnimationFrame` stops when the page becomes hidden
  ([Page.cpp L3741-3806](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp#L3741-L3806)).

### 9.4 Summary

| Browser | Main-thread timers, hidden and audible | Main-thread timers, hidden and silent | Dedicated Worker timers, hidden | rAF, hidden |
|---|---|---|---|---|
| Chrome | Not throttled (until 30 s after the sound stops) | 1 s wake-ups; budget after 10 s; 1 min alignment later | Not throttled | Stopped |
| Firefox (release) | Not throttled (any running AudioContext) | 1000 ms minimum; budget after 30 s | Not throttled | Slowed, then stopped |
| Safari | **1 s alignment** for repeating or deeply nested timers | 1 s alignment (more if the growing mode is on) | No alignment | Stopped |

Inference for the two designs:

- The AudioWorklet render thread does not use these timers. Design C runs the Sequencer in that
  thread (lib `worklet_synthesizer_core.ts` L69-71), so hidden-tab timer rules do not change its
  sound. Not tested in a browser.
- A Design A scheduler on the main thread must keep at least about 1 s of events in the queue to
  play through a hidden Safari tab. A scheduler timer in a dedicated Worker avoids the Safari
  alignment. The lib synthesizer API is on the main thread, so the Worker must send its ticks to
  the main thread. Whether such messages are delayed in a hidden tab: not verified.

---

## 10. Per-channel mute options (for Design C, and for Design A when a seat has its own channel)

**Local test** (`q_mute.mjs`): a held string note, mute at 0.5 s, unmute at 1.0 s.

| Option | Sound while muted | After unmute | Largest sample step at mute / unmute (typical 0.0096) | Source |
|---|---|---|---|---|
| `isMuted = true` | none, voices stopped | silent: the held note does not come back | 0.0181 / 0 | `system.ts` L110-113; `note_on.ts` L34-44 |
| `gain = 0` | none, voices keep running | the held note comes back | 0.0181 / 0.0201 | `midi_channel.ts` L688-697; `render_voice.ts` L327 |

- Both options change the level in one step at a block boundary. The code has no ramp for the
  channel gain: `gainSmoothingFactor` is set but no code reads it (local `grep`:
  `synthesizer_core.ts` L167, L302 only). Inference: a small click is possible.
- `gain = 0` still uses CPU for the voices (inference from `render_voice.ts`).

---

## 11. Comparison against the needs

Each cell gives the main fact and the section that proves it. "Inference" marks cells that no test
proves.

| Need | Design A: own scheduler, events with `{ time }` | Design C: cleaned file in the Sequencer |
|---|---|---|
| Per-seat mute | Exact per seat, also when seats share a channel. But events already in the queue still play, so the mute acts only after the look-ahead (1.2). To stop sounding notes at once, send note offs for the held notes of the seat. | Per channel, at once. Needs one channel per seat, and ports above 16 channels (3). `isMuted` loses held notes; `gain = 0` keeps them (10). Both cut in one step (10). |
| Seek with held notes | The app can start held notes again itself. Risk: queued events from before the seek still play, because no API clears the queue (1.1, 1.2). | Program, bank, controllers, and pitch wheel come back. Held notes do **not** start again (5.2). Pause and play do start them again (5.2). |
| Speed change | New events use the new speed. Events already queued keep the old speed, so the change comes one look-ahead late (inference from 1.1). | Applies at once, no time jump, no click (8). |
| Sync with visuals | The app knows the AudioContext time of each event, so visuals can use the same times (inference). | Main-thread song time is an estimate that corrects only when the error is more than 50 ms (8). |
| Hidden tab | Chrome and Firefox: main-thread timers keep running while audible. Safari: 1 s alignment even while audible (9.3). A longer look-ahead fixes this but makes the queue larger (2) and cancel harder (1). | The Sequencer runs in the audio thread, so timer throttling does not touch the sound (inference, 9.4). |
| Same rules for sound and visuals | One event list drives both (inference). The app must pair note offs FIFO like the synth (6.3). | Sequencer and `getNoteTimes` use one timeline and FIFO pairing (6.1, 6.3). But `duration` and tick-to-second conversion break when tempo events are in several tracks out of order (6.1), and `getNoteTimes` ignores ports (3.4). |

Facts that matter for both designs:

- SF3 decode happens at the first note of each sample, on the audio thread (7.1). One decode takes
  0.64 ms (median) to 3.78 ms (max) on an M1 Max, and one block has 2.67 ms (7.3). Design C gets a
  preload from `loadNewSongList` (75 to 80 ms on the audio thread at load). Design A needs its own
  preload (7.2).
- A channel that `addNewChannel()` adds is a drum channel until the next `reset()` (3.4).
- A queued event for a channel that does not exist stops the synthesizer for good (1.5).
- The lib worklet file probably bundles core 4.3.20, not 4.3.22 (section 0). Not verified.
