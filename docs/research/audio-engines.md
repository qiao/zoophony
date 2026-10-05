# Browser audio engine research for a GM orchestral MIDI player

Date of research: 2026-10-04.

This report gives facts only. It does not give app code. Each fact has a source URL.
"Not verified" means that I could not confirm the fact from a primary source or a test.

## 0. Method

- I read npm registry data with `npm view`.
- I read source code and docs from GitHub at fixed commits:
  - spessasynth_lib at commit `40f9be2` (2026-08-18).
  - spessasynth_core at commit `3709ae6` (2026-09-07).
- I measured gzip sizes on my machine with `gzip -9`. GitHub Pages can use a different gzip level,
  so real transfer sizes can be a little different.
- I built bundles with Vite 8.3.2 and esbuild.
- I ran two Node tests (Node v24.10.0) with spessasynth_core 4.3.22. The test scripts are in the
  scratchpad: `ss/split.mjs` and `ss/timing.mjs`.

---

## 1. spessasynth_lib and spessasynth_core (by spessasus)

### 1.1 Version and license

| Package | Latest version | Release date | License | Source |
|---|---|---|---|---|
| spessasynth_lib | 4.3.14 | 2026-08-18 | Apache-2.0 | https://www.npmjs.com/package/spessasynth_lib |
| spessasynth_core | 4.3.22 | 2026-08-24 | Apache-2.0 | https://www.npmjs.com/package/spessasynth_core |
| stb-vorbis (dependency of core) | 0.0.6 | not recorded | Apache-2.0 | https://www.npmjs.com/package/stb-vorbis |

- The license files are Apache-2.0: https://github.com/spessasus/spessasynth_lib/blob/master/LICENSE and
  https://github.com/spessasus/spessasynth_core/blob/master/LICENSE
- CAUTION: spessasynth_lib 4.3.14 declares its dependency as `"spessasynth_core": "latest"`, not a
  fixed version (`npm view spessasynth_lib dependencies`). The docs also tell you to copy
  `spessasynth_processor.min.js` again each time you update the npm package:
  https://spessasus.github.io/spessasynth_lib/sequencer/
- spessasynth_core depends on `"stb-vorbis": "latest"` (`npm view spessasynth_core dependencies`).

### 1.2 Code size that a browser must load

The WorkletSynthesizer needs two parts. The main thread bundle comes from npm. The AudioWorklet
processor is a prebuilt file that you copy to the site.
Source: https://spessasus.github.io/spessasynth_lib/extra/working-with-browsers/

| Part | Raw bytes | gzip -9 bytes | How measured |
|---|---|---|---|
| Main thread bundle, `import { WorkletSynthesizer, Sequencer }`, Vite 8.3.2 build | 269,536 | 100,049 | local Vite build |
| Same entry, esbuild `--bundle --minify` | 270,595 | 101,463 | local esbuild |
| `dist/spessasynth_processor.min.js` (AudioWorklet) | 402,596 | 135,312 | file in npm package |
| **Total, main thread plus worklet** | **672,132** | **about 235,000** | sum |

Details of the main thread bundle (esbuild metafile):

- spessasynth_core code: 139,688 bytes.
- stb-vorbis (WASM as base64 inside JS): 112,908 bytes.
- spessasynth_lib code: 17,725 bytes.

The main thread bundle includes stb-vorbis because the lib imports spessasynth_core, and core imports
stb-vorbis at the top level (`import { StbVorbis } from "stb-vorbis"` in `dist/index.js`).
The core `package.json` has no `sideEffects` field (local check).

All of this code can load after the first frame. The 1 MB first-download limit does not include it
if the app loads it with a dynamic `import()` (app design choice, not a library fact).

### 1.3 Several sound banks at once, and add a bank on demand

Yes. The synthesizer keeps a list of sound banks.

- `synth.soundBankManager.addSoundBank(arrayBuffer, id, bankOffset)` adds a bank or replaces the bank
  with the same id. `deleteSoundBank(id)` removes one. `priorityOrder` sets which bank wins when two
  banks have the same MIDI patch.
  Source: https://spessasus.github.io/spessasynth_lib/synthesizer/sound-bank-manager/
- The ArrayBuffer is transferred to the worklet. You cannot use it after the call (same source).
- **Local test:** I loaded two one-preset SF3 files (strings and trumpet) into one
  `SpessaSynthProcessor` in Node. Both banks stayed in `soundBankList`, and `presetList` had 2 entries.
  Script: `ss/timing.mjs`.

CAUTION: Each add or delete rebuilds the preset list and **resets the synthesizer**.

- `addSoundBank` calls `generatePresetList()`:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/synthesizer/audio_engine/sound_bank_manager.ts#L101-L116
- The callback `updatePresetList()` calls `clearCache()`, sends a program change on each channel,
  then calls `this.reset()`:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/synthesizer/audio_engine/synthesizer_core.ts#L1452-L1467
- `reset()` resets the global MIDI parameters, the effects, and every channel (`ch.reset(false)`):
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/synthesizer/audio_engine/synthesizer_core.ts#L595-L625
- Inference (not tested in a browser): if you add a bank during playback, controller and program state
  from the MIDI file can be lost. Load all banks that the song needs before playback starts.

### 1.4 Timing: own scheduler or the built-in sequencer

The diagram shows where events go and when the engine applies them.

```text
 Main thread                              AudioWorklet thread
 +-----------------------------+          +-----------------------------------------+
 | your scheduler              |          | each render quantum (128 frames):       |
 |  synth.noteOn(ch, key, vel, |  post    |  1. sequencer.processTick()             |
 |    { time: ctxSeconds })    |--------->|     (all MIDI events with time <= now)  |
 |                             | Message  |  2. processSplit():                     |
 | Sequencer (lib proxy)       |  Port    |     apply queued events with            |
 |  play/pause/currentTime/    |--------->|     time <= now, then render 128 frames |
 |  playbackRate               |          |  3. post events (noteOn, noteOff, ...)  |
 |                             |<---------|     and a time sync about every 1 s     |
 +-----------------------------+          +-----------------------------------------+
```

**Own scheduler.** The synthesizer methods accept `eventOptions.time`, in AudioContext seconds.
If the time is in the past, the event runs at once.
Source: https://spessasus.github.io/spessasynth_lib/synthesizer/basic-synthesizer/ (section "Event options")

```typescript
/** Shape from the spessasynth_lib docs, section "Event options". */
interface SynthMethodOptions {
  /** AudioContext time in seconds. A past time runs the event at once. */
  time: number;
}
// noteOn(channel, midiNote, velocity, eventOptions)
// noteOff(channel, midiNote, eventOptions)
// sendMessage(message, channelOffset, eventOptions)
```

**The timing is block-quantized, not sample-accurate.**

- `processMessage` puts a future event in a sorted queue:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/synthesizer/audio_engine/synthesizer_core.ts#L494-L515
- `processSplit` applies queued events only at the start of each render call, before it renders the
  block:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/synthesizer/audio_engine/synthesizer_core.ts#L693-L703
- In the worklet, one render call is one Web Audio render quantum. The default quantum is 128 frames:
  https://webaudio.github.io/web-audio-api/ (enum `AudioContextRenderSizeCategory`, "default")
- 128 frames is 2.67 ms at 48 kHz and 2.90 ms at 44.1 kHz (calculation).
- **Local test** (`ss/timing.mjs`, 48 kHz, 128-frame blocks): I scheduled a note on at sample 484.8.
  The first non-zero output sample was 514. An event at time 0 started at sample 2. So the event
  moved to the next block start (512).
- `noteOn` on `SpessaSynthProcessor` (core) has no time argument. Use `processMessage(bytes, 0, { time })`
  in core. In spessasynth_lib, `noteOn(..., eventOptions)` sends the time through `sendMessage`:
  https://github.com/spessasus/spessasynth_lib/blob/40f9be2014a0312bc2fec14f215cb90510876a4e/src/synthesizer/basic/basic_synthesizer.ts#L450-L465

**Built-in sequencer.** The worklet calls `processTick()` once per render quantum:
https://github.com/spessasus/spessasynth_lib/blob/40f9be2014a0312bc2fec14f215cb90510876a4e/src/synthesizer/worklet/worklet_synthesizer_core.ts#L61-L71
`processTick` plays all MIDI events up to the current time:
https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/sequencer/process_tick.ts#L7-L48
So the built-in sequencer has the same block grid as the own-scheduler path. It is not more exact.

### 1.5 Data that the visuals can read

| Need | API | Source |
|---|---|---|
| Song time | `sequencer.currentTime` (seconds). It is `(synth.currentTime - absoluteStartTime) * playbackRate`. | https://github.com/spessasus/spessasynth_lib/blob/40f9be2014a0312bc2fec14f215cb90510876a4e/src/sequencer/sequencer.ts#L255-L268 |
| Smooth song time for animation | `sequencer.currentHighResolutionTime`. It mixes `performance.now()` with the audio time (smoothing factor `0.01 * playbackRate`). | same file, L281-L305; docs: https://spessasus.github.io/spessasynth_lib/sequencer/ |
| Note on and note off when they play | `synth.eventHandler.addEvent("noteOn" or "noteOff", id, callback)`. Payload: `midiNote`, `channel`, `velocity` (note on only). | https://spessasus.github.io/spessasynth_core/spessa-synth-processor/event-types/ |
| Delay the events | `synth.eventHandler.timeDelay = seconds`. The code uses `setTimeout`. | https://spessasus.github.io/spessasynth_lib/synthesizer/synth-event-handler/ and https://github.com/spessasus/spessasynth_lib/blob/40f9be2014a0312bc2fec14f215cb90510876a4e/src/synthesizer/basic/synth_event_handler.ts#L109-L113 |
| Sequencer events | `songChange`, `timeChange`, `songEnded`, `metaEvent`, `loopCountChange`, `midiMessage` (external MIDI only), plus `midiError` in the lib. No note events. | https://spessasus.github.io/spessasynth_core/spessa-synth-sequencer/event-types/ and https://spessasus.github.io/spessasynth_lib/sequencer/ |
| All notes ahead of time (for animation before the sound) | `BasicMIDI.getNoteTimes(minDrumLength)` returns 16 arrays of notes with `start` and `length` in seconds. `sequencer.getMIDI()` gives the full `BasicMIDI`. | https://spessasus.github.io/spessasynth_core/midi/ (section "getNoteTimes") and https://spessasus.github.io/spessasynth_lib/sequencer/ |

```typescript
/** Shape from the spessasynth_core docs, BasicMIDI.getNoteTimes(). */
interface NoteTime {
  /** MIDI key number 0-127 */
  midiNote: number;
  velocity: number;
  /** Note start in song seconds (not AudioContext seconds) */
  start: number;
  /** Note length in seconds */
  length: number;
}
type NoteTimes = NoteTime[][]; // 16 arrays, one per MIDI channel
```

Note events come from the audio thread through a MessagePort. The worklet sends them when it
processes the event, not when the speaker plays it (inference from the code path above; not measured).

**Output latency.** spessasynth does not expose output latency. A search for "latency" in the lib and
core source found only the WorkerSynthesizer queue (local `grep`). Use the Web Audio values:

| API | Safari support (MDN browser-compat-data) | Source |
|---|---|---|
| `AudioContext.outputLatency` | Safari 18.4 and later | https://github.com/mdn/browser-compat-data/blob/main/api/AudioContext.json |
| `AudioContext.baseLatency` | Safari 14.1 and later | same |
| `AudioContext.getOutputTimestamp()` | Safari 14.1 and later | same |

- The spec defines `outputLatency` as the time between a buffer request to the host and the moment
  the first sample plays: https://webaudio.github.io/web-audio-api/
- `WorkerSynthesizer` adds a queue of `maxQueueSize` blocks of 128 samples (default 20):
  https://spessasus.github.io/spessasynth_lib/synthesizer/worker-synthesizer/
  20 x 128 = 2,560 frames, which is 53 ms at 48 kHz (calculation).

### 1.6 Play, pause, seek, speed, mute, solo

| Feature | Supported | API | Source |
|---|---|---|---|
| Play, pause | Yes | `sequencer.play()`, `sequencer.pause()` | https://spessasus.github.io/spessasynth_lib/sequencer/ |
| Seek | Yes | set `sequencer.currentTime` (seconds) | same |
| Playback speed | Yes | `sequencer.playbackRate` (1 = normal, 0.5 = half), option `initialPlaybackRate` | same |
| Per-channel mute | Yes | channel system parameter `isMuted` with `setSystemParameter` | https://spessasus.github.io/spessasynth_core/spessa-synth-processor/midi-channel/channel-parameters/ and https://spessasus.github.io/spessasynth_lib/synthesizer/midi-channel/ |
| Solo | No built-in solo (no match for "solo" in source or docs, local `grep`) | mute the other channels | inference |
| Per-channel audio output | Yes, 16 dry stereo outputs plus an effects output | `connectIndividualOutputs(audioNodes)`. The docs say these outputs are "only meant for visualization". | https://spessasus.github.io/spessasynth_lib/synthesizer/basic-synthesizer/ |

- When `isMuted` becomes true, the channel stops all its notes at once (`stopAllNotes(true)`):
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/synthesizer/audio_engine/channel/parameters/system.ts#L110-L113
- A muted channel ignores new note on messages (docs, channel parameters page above). Notes that
  were muted do not come back when you unmute (inference from the code above).
- On seek, the sequencer saves controller changes and sends them after the jump (source comment in
  `set_time_to.ts`):
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/sequencer/set_time_to.ts
  Whether held notes restart after a seek: not verified.

### 1.7 Build-time trim or split in Node

Yes. spessasynth_core runs in Node and writes SF2 and SF3.

- `soundBank.writeSF2(options)` writes SF2 or SF3:
  https://spessasus.github.io/spessasynth_core/sound-bank/
- `soundBank.trim(presetData)` keeps only presets and keys that a MIDI file uses. Get `presetData`
  from `midi.getUsedProgramsAndKeys(soundBank)` (same page, and https://spessasus.github.io/spessasynth_core/midi/).
  I did not test `trim`.
- `deletePreset`, `removeUnusedElements`, `clonePreset`, `addCompletePresets`, `mergeSoundBanks` exist
  (same page).
- Compressed samples stay compressed when you write. `getRawData(true)` returns the stored Ogg data:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/soundbank/basic_soundbank/basic_sample.ts#L133-L138
  and the SF2 writer calls it: https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/soundbank/soundfont/write/sdta.ts#L31
- To make new Vorbis data (SF2 to SF3), you must give a `compressionFunction`. The library does not
  include an encoder (the docs say the encoder is 1.1 MB). The example uses ffmpeg:
  https://github.com/spessasus/spessasynth_core/blob/master/examples/compress_to_sf3.ts

**Local test** (`ss/split.mjs`). Input: `GeneralUserGS.sf3` from the SpessaSynth repo (8,423,728 bytes,
INFO name "GeneralUser GS 2.0.3"):
https://github.com/spessasus/SpessaSynth/blob/master/soundfonts/GeneralUserGS.sf3

- The bank has 287 presets, 324 instruments, 920 samples. All 920 samples are compressed.
  916 samples have `loopEnd > loopStart`.
- For each chosen preset, I made a new `BasicSoundBank`, called `clonePreset(preset)`, `flush()`, and
  `writeSF2()`. Each output file kept the Ogg data (no re-encode) and kept the loop points.
- A read-back of one file parsed correctly.

| GM program | Preset name | SF3 bytes | Samples | Samples with loop |
|---|---|---|---|---|
| 0 | Grand Piano | 349,948 | 17 | 17 |
| 40 | Violin | 241,888 | 19 | 19 |
| 41 | Viola | 184,300 | 13 | 13 |
| 42 | Cello | 260,356 | 23 | 23 |
| 43 | Double Bass | 152,204 | 13 | 13 |
| 45 | Pizzicato Strings | 37,418 | 4 | 4 |
| 46 | Orchestral Harp | 53,898 | 5 | 5 |
| 47 | Timpani | 49,218 | 4 | 4 |
| 48 | Fast Strings | 469,026 | 21 | 21 |
| 49 | Slow Strings | 469,026 | 21 | 21 |
| 52 | Concert Choir | 169,892 | 12 | 12 |
| 56 | Trumpet | 56,796 | 7 | 7 |
| 57 | Trombone | 59,150 | 8 | 8 |
| 58 | Tuba | 79,716 | 11 | 11 |
| 60 | French Horns | 146,888 | 19 | 19 |
| 68 | Oboe | 63,652 | 6 | 6 |
| 70 | Bassoon | 152,130 | 20 | 20 |
| 71 | Clarinet | 33,908 | 6 | 6 |
| 72 | Piccolo | 47,996 | 5 | 5 |
| 73 | Flute | 172,536 | 12 | 12 |
| drum kit 0 | Standard 1 | 673,084 | 65 | 62 |
| drum kit 48 | Orchestral | 575,604 | 56 | 56 |

Notes on the test:

- Fast Strings and Slow Strings use the same 21 samples. A one-file-per-preset split copies shared
  samples into each file.
- These files are not gzip-compressed further. Ogg data does not compress much with gzip
  (not measured).

### 1.8 SF3 (Ogg Vorbis) decoding

spessasynth decodes SF3 itself. It does not use the browser decoder.

- `BasicSample` decodes compressed data with `StbVorbis.decode(...)`:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/soundbank/basic_soundbank/basic_sample.ts#L357
- `BasicSoundBank.isSF3DecoderReady` is `StbVorbis.ready`:
  https://github.com/spessasus/spessasynth_core/blob/3709ae6216669c950730ebb4f237a024c38475a9/src/soundbank/basic_soundbank/basic_soundbank.ts#L41
- stb-vorbis is a synchronous decoder with WebAssembly. The WASM is base64 data inside one JS file. It
  does not use `fetch`, so it works in an AudioWorklet:
  https://github.com/spessasus/stb-vorbis
- The worklet file includes `WebAssembly.instantiate` and the Vorbis decoder (local `grep` of
  `spessasynth_processor.min.js`).
- The docs say SpessaSynth can read only Ogg Vorbis compression in SF3:
  https://spessasus.github.io/spessasynth_core/sound-bank/ (section "compressionFunction")

### 1.9 Safari notes for spessasynth

- The SpessaSynth app README lists Chromium and Gecko browsers as supported. It does not list Safari:
  https://github.com/spessasus/SpessaSynth/blob/master/README.md
- In issue #198 (2026-02), users ran SpessaSynth on iOS and macOS Safari. The author said a bug
  affected only the web app, not the libraries. The author also said: "I can't really test it as
  there's no safari for android/windows/linux":
  https://github.com/spessasus/SpessaSynth/issues/198
- Full Safari support for spessasynth_lib: not verified.
- `AudioWorkletNode` is in Safari 14.1 and later (MDN browser-compat-data):
  https://github.com/mdn/browser-compat-data/blob/main/api/AudioWorkletNode.json

---

## 2. js-synthesizer (FluidSynth compiled to WASM)

### 2.1 Version and license

| Item | Value | Source |
|---|---|---|
| Latest version | 1.13.0 (2026-04-20) | https://www.npmjs.com/package/js-synthesizer |
| js-synthesizer license | BSD-3-Clause | https://github.com/jet2jet/js-synthesizer/blob/master/LICENSE |
| libfluidsynth JS (WASM) license | LGPL-2.1 | https://github.com/jet2jet/js-synthesizer/tree/master/externals and https://github.com/jet2jet/fluidsynth-emscripten |
| FluidSynth version in the package | 2.4.6 (also 2.3.0) | file names in `externals/` |

The README says: "libfluidsynth JS file is not `import`-able (but `require`-able from 2.4.6) and its
license (LGPL v2.1) is different from js-synthesizer's (BSD-3-Clause)":
https://github.com/jet2jet/js-synthesizer#readme

### 2.2 What LGPL-2.1 means for a static site

These are statements from the LGPL-2.1 text: https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html

- Section 4: you can distribute the library in object form if you give the complete source code.
  If you offer the object code "from a designated place", then equivalent access to the source code
  "from the same place" satisfies this requirement.
- Section 6: you can distribute a "work that uses the Library" under terms of your choice, if the terms
  permit "modification of the work for the customer's own use and reverse engineering for debugging".
  You must give "prominent notice" that the library is used and that the LGPL covers it.
- Section 6(b): one way to comply is "a suitable shared library mechanism" that uses a copy of the
  library at run time and works with a modified, interface-compatible version.

Facts about the files that relate to this:

- libfluidsynth ships as a separate JS file. You load it with its own `<script>` tag or
  `audioWorklet.addModule()`, not inside your bundle (README above).
- The LGPL text file is in the package: `externals/LICENSE.fluidsynth.txt`.
- Whether a separate JS file loaded at run time meets Section 6(b) for the web: not verified (legal
  question).

### 2.3 Size

| File | Raw bytes | gzip -9 bytes |
|---|---|---|
| `externals/libfluidsynth-2.4.6.js` (WASM inside as base64, no SF3) | 571,798 | 217,425 |
| `externals/libfluidsynth-2.4.6-with-libsndfile.js` (needed for SF3) | 2,371,527 | 895,638 |
| `dist/js-synthesizer.worklet.min.js` | 30,300 | 8,137 |
| `dist/js-synthesizer.min.js` | 33,056 | 8,691 |

The README says: for SF3 files, use the `-with-libsndfile` file:
https://github.com/jet2jet/js-synthesizer#readme

So an SF3 setup loads about 896 KB + 8 KB (gzip) of engine code. An SF2-only setup loads about
217 KB + 8 KB (gzip). (Sum of the table values.)

### 2.4 Timing and transport API

- `midiNoteOn(chan, key, vel)` has no time argument:
  https://github.com/jet2jet/js-synthesizer/blob/master/src/main/ISynthesizer.ts
- The FluidSynth sequencer schedules events in ticks. `setTimeScale(scale)`: "default is 1000 for 1
  tick per millisecond, max is 1000" (`dist/lib/ISequencer.d.ts` in the npm package). So the finest
  step is 1 ms.
- `sendEventAt(event, tick, isAbsolute)` schedules an event (same file).
- FluidSynth docs: the callback time "may be a few ticks too late":
  https://www.fluidsynth.org/api/group__sequencer.html
- FluidSynth renders in internal blocks of 64 samples (`FLUID_BUFSIZE 64`):
  https://github.com/FluidSynth/fluidsynth/blob/master/src/utils/fluidsynth_priv.h
- Player API: `seekPlayer(ticks)`, `setPlayerTempo(tempoType, tempo)`, `retrievePlayerCurrentTick()`,
  `retrievePlayerTotalTicks()`, `retrievePlayerBpm()` (`dist/lib/ISynthesizer.d.ts`). Version 1.13.0
  added `getPlayerCurrentTick`, `getPlayerTotalTicks`, `getPlayerBpm`:
  https://github.com/jet2jet/js-synthesizer/blob/master/CHANGELOG.md
- `FLUID_PLAYER_TEMPO_INTERNAL` uses the tempo value as "a multiplier factor that must be in the range
  (0.001 to 1000)". This gives a playback speed control:
  https://www.fluidsynth.org/api/group__midi__player.html
- Per-channel mute: no API found in `ISynthesizer.d.ts` or in the FluidSynth player docs (search for
  "mute"). A player hook `hookPlayerMIDIEvents` can drop or change events (README).
- Note events for visuals: the player hook sees each MIDI event in the audio thread. For the worklet
  build, the hook function must live in the worklet scope (README, section "Using hook").
- Several SoundFonts: `loadSFont(bin)` returns an id. `midiProgramSelect(chan, sfontId, bank, preset)`
  picks a preset from one SoundFont (`dist/lib/ISynthesizer.d.ts`).
- FluidSynth plays SF2 loop points (it is an SF2 synth). SF3 needs the libsndfile build.

---

## 3. WebAudioFont (surikov)

| Item | Value | Source |
|---|---|---|
| npm version | 3.0.4 (2022-06-28) | https://www.npmjs.com/package/webaudiofont |
| Player license | GPL-3.0 | https://github.com/surikov/webaudiofont/blob/master/LICENSE.md |
| License note | "Contact me if you need different license." | https://github.com/surikov/webaudiofont#license |
| Data repo license | MIT (GitHub license field) | https://github.com/surikov/webaudiofontdata |
| Sample sources named in README | GeneralUserGS.sf2 and FluidR3.sf2 | https://github.com/surikov/webaudiofont#parts-of-webaudiofont |
| Player code size | `npm/dist/WebAudioFontPlayer.js` 125,733 raw; 96,656 minified; 40,398 gzip -9 | local esbuild |

The catalog has more source banks than the two in the README (for example JCLive, Aspirin).
The license of each source bank: not verified.

### 3.1 Per-instrument file format

Each instrument is one JS file that defines a global variable with a `zones` array. Example:
https://surikov.github.io/webaudiofontdata/sound/0480_FluidR3_GM_sf2_file.js

```typescript
/** Zone fields seen in 0480_FluidR3_GM_sf2_file.js and in npm/src/otypes.ts. */
interface WebAudioFontZone {
  midi: number;
  originalPitch: number;
  keyRangeLow: number;
  keyRangeHigh: number;
  /** Loop start in sample frames at zone.sampleRate */
  loopStart: number;
  /** Loop end in sample frames at zone.sampleRate */
  loopEnd: number;
  coarseTune: number;
  fineTune: number;
  sampleRate: number;
  ahdsr: boolean | object;
  /** Base64 audio file. In the files I checked it starts with "SUQz" (ID3, so MP3). */
  file?: string;
  /** Base64 raw PCM, an alternative to file */
  sample?: string;
}
```

### 3.2 Loop points

Yes, zones keep SoundFont loop points.

- In `0480_FluidR3_GM_sf2_file.js`, 34 of 34 zones have `1 <= loopStart < loopEnd`.
- In `0480_GeneralUserGS_sf2_file.js`, 23 of 23 zones have loops.
  (Local parse of the two files.)
- The player sets `AudioBufferSourceNode.loop`, `loopStart`, and `loopEnd` from the zone. If
  `loopStart < 1` or `loopStart >= loopEnd`, it does not loop:
  https://github.com/surikov/webaudiofont/blob/master/npm/src/player.ts (function `queueWaveTable`)
- The player decodes `file` with `audioContext.decodeAudioData` (same file, near line 291).
- MP3 adds encoder delay. Whether the loops are click-free after MP3 encoding: not verified.

### 3.3 Timing

- `queueWaveTable(audioContext, target, preset, when, pitch, duration, volume, slides)` starts an
  `AudioBufferSourceNode` at `when` and stops it at `when + duration` (same file). You must know the
  duration at note start, or call `envelope.cancel()` later.
- Web Audio start times and loop points "can be expressed with sub-sample precision":
  https://webaudio.github.io/web-audio-api/ (AudioBufferSourceNode section)

### 3.4 File sizes (uncompressed `Content-Length` from GitHub Pages)

| File | Bytes | gzip transfer |
|---|---|---|
| 0480_FluidR3_GM_sf2_file.js (strings) | 1,654,498 | 1,227,502 |
| 0480_GeneralUserGS_sf2_file.js (strings) | 801,607 | 590,731 |
| 0400_FluidR3_GM_sf2_file.js (violin) | 461,445 | not measured |
| 0400_GeneralUserGS_sf2_file.js (violin) | 257,988 | not measured |
| 0560_FluidR3_GM_sf2_file.js (trumpet) | 71,558 | not measured |
| 0560_GeneralUserGS_sf2_file.js (trumpet) | 56,926 | not measured |
| 0730_FluidR3_GM_sf2_file.js (flute) | 172,752 | not measured |
| 0730_GeneralUserGS_sf2_file.js (flute) | 259,544 | not measured |
| 0000_FluidR3_GM_sf2_file.js (piano) | 1,238,332 | not measured |
| 0000_GeneralUserGS_sf2_file.js (piano) | 956,580 | not measured |

Base URL: https://surikov.github.io/webaudiofontdata/sound/

---

## 4. gleitz/midi-js-soundfonts

Repo: https://github.com/gleitz/midi-js-soundfonts (GitHub license field: MIT; last push 2022-03-09).

### 4.1 License of each set

| Set | License stated in the README | Upstream fact |
|---|---|---|
| FluidR3_GM | Creative Commons Attribution 3.0 | The original FluidR3 is MIT (Debian copyright file: https://metadata.ftp-master.debian.org/changelogs/main/f/fluid-soundfont/unstable_copyright). The two statements do not agree. |
| MusyngKite | Creative Commons Attribution Share-Alike 3.0 | Musical Artifacts lists "Musyng Kite" with license "wtfpl" and author "Unknown" (https://musical-artifacts.com/artifacts/1883). Upstream license: not verified. |
| FatBoy | Creative Commons Attribution Share-Alike 3.0 | Musical Artifacts lists "FatBoy-v0.786" with license "gray" (https://musical-artifacts.com/artifacts/3540). fatboy.site did not load for me. Upstream license: not verified. |

README source: https://github.com/gleitz/midi-js-soundfonts/blob/gh-pages/README.md

### 4.2 Loop points and length

- No loop points. Each instrument is a JS object that maps note names to `data:audio/...;base64` URIs.
  There are 88 notes (A0 to C8). (Local parse of `FluidR3_GM/string_ensemble_1-ogg.js` and
  `MusyngKite/string_ensemble_1-mp3.js`.)
- Each note is a fixed-length render:
  - Ogg notes: 137,984 frames at 44.1 kHz, stereo, so 3.13 s (local Ogg page parse; A0, C4, C8).
  - MP3 notes: 3.16 s, 128 kbps, 44.1 kHz stereo (macOS `afinfo`, `file`). Each MP3 note is 25,585 bytes.
- The generator script renders each note with `DURATION = Integer(3000)`:
  https://github.com/gleitz/MIDI.js/blob/master/generator/ruby/soundfont_builder.rb
- So a held note longer than about 3.1 s ends early unless the player loops or stretches it.

### 4.3 Size per instrument (GitHub Pages `Content-Length`)

| File | mp3.js bytes | ogg.js bytes |
|---|---|---|
| FluidR3_GM/string_ensemble_1 | 2,803,855 | 3,487,991 |
| FluidR3_GM/violin | 2,870,964 | 3,653,304 |
| FluidR3_GM/trumpet | 2,937,749 | 2,854,457 |
| FluidR3_GM/acoustic_grand_piano | 2,631,954 | 2,657,542 |
| MusyngKite/string_ensemble_1 | 3,005,071 | 3,410,419 |
| MusyngKite/violin | 2,828,288 | 2,869,160 |
| MusyngKite/trumpet | 2,890,569 | 2,924,217 |
| MusyngKite/acoustic_grand_piano | 2,306,794 | 2,340,030 |
| FatBoy/string_ensemble_1 | 3,005,215 | 3,867,055 |
| FatBoy/violin | 2,987,556 | 3,594,104 |
| FatBoy/trumpet | 2,976,325 | 3,237,937 |
| FatBoy/acoustic_grand_piano | 2,510,370 | 2,484,530 |

gzip transfer sizes: FluidR3 string_ensemble_1 mp3.js 1,897,578; ogg.js 2,352,516; MusyngKite
string_ensemble_1 mp3.js 2,142,818 (local `curl` with `Accept-Encoding: gzip`).

Single-note MP3 files also exist in folders such as `FluidR3_GM/string_ensemble_1-mp3/C4.mp3`.
The `-ogg/` folders returned HTTP 404 for me.

---

## 5. Tone.js Sampler

| Item | Value | Source |
|---|---|---|
| Latest stable | 15.1.22 (npm tag `latest`) | https://www.npmjs.com/package/tone |
| Pre-release | 15.5.57 (npm tag `next`, 2026-10-04) | same |
| License | MIT | https://github.com/Tonejs/Tone.js |

### 5.1 Loop points

- In 15.1.22, `SamplerOptions` has no loop fields (`attack`, `release`, `onload`, `onerror`, `baseUrl`,
  `curve`, `urls`). Each note plays for `buffer.duration / playbackRate` at most
  (`source.start(time, 0, buffer.duration / playbackRate, velocity)`), from
  `build/esm/instrument/Sampler.js` in the npm package.
- The `dev` branch and the `next` build (15.5.57) add `loop`, `loopStart`, `loopEnd`, and
  `setLoopPoints()`. Commit 62c8a00f (2025-06-29), "Adding loop functionality to Sampler (#1310) (#1350)":
  https://github.com/Tonejs/Tone.js/blob/dev/Tone/instrument/Sampler.ts
- These loop values belong to the whole Sampler. There is no loop point for each sample.
- Tone.js decodes files with `decodeAudioData` (browser decoder): `build/esm/core/context/ToneAudioBuffer.js`.

### 5.2 Bundle size

| Build | Raw bytes | gzip -9 bytes |
|---|---|---|
| `build/Tone.js` (UMD, full) | 345,500 | 79,291 |
| `import { Sampler, getContext }`, Vite 8.3.2 | 256,976 | 65,870 |
| same, esbuild | 261,711 | 68,822 |

Tone.js has no SoundFont parser. You must give one URL per sample.

---

## 6. SoundFonts and sample libraries for a public static site

### 6.1 GeneralUser GS

| Item | Value | Source |
|---|---|---|
| Latest version | 2.0.3 (2026-02-22) | https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/CHANGELOG.md |
| SF2 size | 32,319,396 bytes | https://github.com/mrbumpy409/GeneralUser-GS (GitHub API size of `GeneralUser-GS.sf2`) |
| SF3 size (SpessaSynth copy) | 8,423,728 bytes, INFO name "GeneralUser GS 2.0.3" | https://github.com/spessasus/SpessaSynth/blob/master/soundfonts/GeneralUserGS.sf3 |
| Contents | 261 instrument presets and 13 drum kits | https://github.com/mrbumpy409/GeneralUser-GS/blob/main/README.md |
| Orchestral kit | Bank 128 preset 48 "Orchestral Kit" | https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/README.md |

License text (License v2.0), quoted from
https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/LICENSE.txt :

> You may use GeneralUser GS without restriction for your own music creation,
> private or commercial. This SoundFont bank is provided to the community free of
> charge. Please feel free to use it in your software projects, and to modify the
> SoundFont bank or its packaging to suit your needs.

> If you plan to feature GeneralUser GS on your own website, please do not link
> directly to my download files. Either link to my website, or provide your own
> local copy instead.

The license also says that the author cannot be "100% sure where all of the samples originated".

The docs recommend this SF3 conversion for web use, which gives "less than a third of its former
size": `sf3convert -z -q 0.8 -a -1 GeneralUser-GS.sf2 GeneralUser-GS.sf3`
(https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/README.md, section 6).
The docs rate SpessaSynth compatibility as "Excellent" (same file).

### 6.2 FluidR3_GM

| Item | Value | Source |
|---|---|---|
| License | MIT (Frank Wen, 2000-2002, 2008) | https://metadata.ftp-master.debian.org/changelogs/main/f/fluid-soundfont/unstable_copyright |
| SF2 size | Debian `fluid-soundfont-gm`: installed size 145,170 kB, download 116,809.6 kB | https://packages.debian.org/sid/fluid-soundfont-gm |
| FluidR3Mono_GM.sf3 (MuseScore 3.x and main) | 23,712,790 bytes | https://github.com/musescore/MuseScore/tree/main/share/sound |
| FluidR3Mono_GM.sf3 (MuseScore 2.3.2) | 14,563,174 bytes | https://github.com/musescore/MuseScore/tree/2.3.2/share/sound |

### 6.3 MuseScore_General

| Item | Value | Source |
|---|---|---|
| Version | 0.2.0 (license file: "0.2 13th May 2020") | https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/VERSION |
| License | MIT. "The acknowledgements and copyright notices above must be included in any derivative work." | https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General_License.md |
| SF2 size | 215,614,036 bytes | https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf2 |
| SF3 size | 39,900,972 bytes | https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3 |
| MuseScore 4 copy | `MS Basic.sf3`, 51,278,610 bytes. Its license file is the MuseScore_General MIT text. | https://github.com/musescore/MuseScore/tree/main/share/sound |

The sample source list says "All instruments without attribution are still using samples from
FluidR3Mono". In that list, the GM orchestral presets 40-43, 47-49, 57, 58, 60, 68, 70, 71, 73 have no
separate credit. Program 56 (Trumpet) has "License: Public Domain".
Source: https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General_Sample_Sources.csv

### 6.4 Other GM banks found

| Bank | License claim | Status | Source |
|---|---|---|---|
| SGM-V2.01 | marmooo list says CC-BY-4.0 | archive.org metadata has no license URL. Not verified. SF2 is 247,406,594 bytes. | https://archive.org/details/SGM-V2.01 |
| ColomboGMGS2 V16.0 | CC-BY-SA-4.0 (marmooo list) | not verified | https://github.com/marmooo/free-soundfonts |
| Airfont 340 and 380 | Public Domain (marmooo list) | not verified | same |
| TimGM6mb | Public Domain (marmooo list) | not verified | same |

marmooo/free-soundfonts hosts these banks already split into one SF3 per program
(`[name]/000/048.sf3`). Each instrument file is at most 10 MB. Files are on Cloudflare Pages:
https://github.com/marmooo/free-soundfonts and https://soundfonts.pages.dev/list.json
Example sizes (GeneralUser GS 2.0.3): `000/048.sf3` 426,666 bytes, `000/040.sf3` 220,620 bytes,
`000/056.sf3` 51,180 bytes (local download).

### 6.5 CC0 or permissive orchestral sample libraries

| Library | License | Formats | GM SF2 or SF3 version | Source |
|---|---|---|---|---|
| VSCO 2 Community Edition | CC0 ("Creative Commons 0 (i.e. public domain)") | SFZ and WAV, about 3 GB. The page says SFZ and SF2 "are NOT related nor directly compatible". | No official SF2. "VSCO GM Remix" on Musical Artifacts: license field `by-3` (CC BY 3.0), authors "Versilian STudios and Mike77154", hosted on Google Drive and Dropbox. Size and GM coverage: not verified. | https://versilian-studios.com/vsco-community/ , https://github.com/sgossner/VSCO-2-CE , https://musical-artifacts.com/artifacts/2509.json |
| Sonatina Symphonic Orchestra | README in the MuseScore zip: "Creative Commons Sampling Plus 1.0" by Mattias Westlund | SF2 conversion by Quinn Mason: zip 417,656,133 bytes, SF2 494,723,490 bytes | The SF2 INFO chunk says `ICOP` "2013, All rights reserved" and `ICMT` "For MUSECORE use only". This conflicts with the CC license. GM mapping: not verified. | https://ftp.osuosl.org/pub/musescore/soundfont/Sonatina_Symphonic_Orchestra_SF2.zip (README and INFO read with HTTP range requests) |

Creative Commons Sampling Plus 1.0 is retired. It permits sampling and transforming for commercial or
noncommercial use, and noncommercial distribution of the whole work. It forbids use "to advertise for
or promote anything but the work you create from it":
https://creativecommons.org/licenses/sampling+/1.0/

---

## 7. Safari support for Ogg Vorbis and Opus

| Fact | Source |
|---|---|
| Safari 17.4: "The Vorbis audio codec is also now supported in WebKit on iOS 17.4, iPadOS 17.4 and in visionOS 1.1." | https://webkit.org/blog/15063/webkit-features-in-safari-17-4/ |
| Safari 18.4: "adding Ogg container support for both Opus and Vorbis audio on macOS Sequoia 15.4, iOS 18.4, iPadOS 18.4, and visionOS 2.4." | https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ |
| caniuse: Ogg Vorbis "y" from Safari 18.4 (macOS and iOS). Opus: "partial" on macOS ("requires macOS 15.4 Sequoia or later"), "y" on iOS 18.4+. caniuse says: "Support refers to this format's use in the `audio` element, not other conditions." | https://github.com/Fyrd/caniuse/blob/main/features-json/ogg-vorbis.json and https://github.com/Fyrd/caniuse/blob/main/features-json/opus.json |
| WebKit added "webm/opus container support" to Web Audio on 2021-07-28 (changeset 280416). | https://trac.webkit.org/changeset/280416/webkit |
| WebKit commit 2cfd74c (2026-03-12, bug 307632): before it, `decodeAudioData` used AudioToolbox `AudioFile` for non-WebM data, and "It doesn't support opus". The commit moves to `AVAssetReader`. | https://github.com/WebKit/WebKit/commit/2cfd74cacf |
| Current WebKit main maps the file type `'Oggf'` to `audio/ogg` in the `decodeAudioData` reader. | https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/cocoa/AudioFileReaderCocoa.mm |
| Safari Technology Preview 240 and Safari 27 beta: "Fixed an issue where MP4 files containing Opus audio tracks could not be decoded with `decodeAudioData`." | https://webkit.org/blog/17896/release-notes-for-safari-technology-preview-240/ and https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/ |

Summary of what is known and not known:

- Ogg Vorbis and Ogg Opus in the `<audio>` element: Safari 18.4+ on macOS 15.4+ and iOS 18.4+.
- Ogg Opus in `decodeAudioData` on Safari 26.x and older: the WebKit commit message says the old
  AudioFile path does not support Opus. So it is likely not supported. Not tested.
- Ogg Vorbis in `decodeAudioData` on Safari 18.4 to 26.x: not verified.
- Ogg in `decodeAudioData` on Safari 27: the source has an Ogg path. Shipping status: not verified.
- One GitHub issue (no test data) says Ogg Vorbis decoding needs macOS 15.4+ or iOS 18.4+, and that
  Safari 18.4 on older macOS cannot decode it: https://github.com/dvoyni/cog/issues/488 (secondary).
- This does not affect spessasynth (own WASM decoder) or js-synthesizer with libsndfile (own decoder).
  It affects WebAudioFont, gleitz `.ogg` sets, and Tone.js, which use `decodeAudioData`.

---

## 8. Tools that split a SoundFont into one file per preset

| Tool | Splits per preset? | License | Notes | Source |
|---|---|---|---|---|
| spessasynth_core (Node) | Yes, with a short script | Apache-2.0 | Tested here (section 1.7). Keeps Ogg data and loops. Also has `trim()` for one MIDI file. | https://spessasus.github.io/spessasynth_core/sound-bank/ |
| @marmooo/soundfont-split 0.0.4 | Yes, CLI and API (`splitSoundFont`, `extractPreset`) | MIT | Output `out_dir/000/000.sf3`. Copies SF3 samples as they are unless `--recompress`. Vorbis quality option `-q` (default 4). Not tested. | https://github.com/marmooo/soundfont-split and https://www.npmjs.com/package/@marmooo/soundfont-split |
| Polyphone CLI | No per-preset SF2 or SF3 option found. SFZ export (`-3`) has an option to prefix "each preset" with its number and to make "a directory per bank". | GPL-3.0 (GitHub license field, https://github.com/davy7125/polyphone) | Modes: `-1` SF2, `-2` SF3 (`-c` 0, 1, 2 for compression), `-3` SFZ, `-4` CSV. | https://www.polyphone.io/en/documentation/manual/annexes/command-line |
| MuseScore sftools `sf3convert` | No | LGPL-2 (COPYING.LIB, Library GPL v2) | `-z` compress, `-q` Ogg quality, `-a` dB. The `-p` preset flag is used only for C source output (`writeCode`). Last push 2020-11-09. | https://github.com/musescore/sftools/blob/master/sfconvert.cpp |
| sf2utils 1.0.0 (Python) | No, it is a parser | PyPI says GPLv3+; the usage text says "LGPL v3+" | "Sound font 2 parsing library and utilities". No writer documented. | https://pypi.org/project/sf2utils/ |
| sf2-loader 1.29 (Python) | No | LGPLv2.1 | "soundfonts loader, player and audio renderer". | https://pypi.org/project/sf2-loader/ |
| soundfont2 0.5.0 (npm) | No, it is a parser | MIT | "A SoundFont2 parser for Node.js and web browsers". | https://www.npmjs.com/package/soundfont2 |

---

## 9. Comparison against the app constraints

| Constraint | spessasynth_lib | js-synthesizer | WebAudioFont | gleitz sets + own player | Tone.js Sampler |
|---|---|---|---|---|---|
| License | Apache-2.0 | BSD-3 + LGPL-2.1 WASM | GPL-3.0 player | MIT repo, CC sets (conflicts) | MIT |
| Engine code, gzip | about 235 KB (100 + 135) | 225 KB SF2 only; 904 KB with SF3 | about 40 KB | own code | about 66 KB |
| Load only used programs | Yes, one bank per program (bank add resets synth) | Yes, `loadSFont` per file | Yes, one JS per program | Yes, one JS per program | Yes, one URL per note |
| Loop points | Yes (SF2/SF3) | Yes (SF2/SF3) | Yes (zone loops) | No, about 3.1 s notes | 15.1.22: no; `next`: one loop for whole sampler |
| Ogg decode on Safari | Own WASM decoder | Own decoder (libsndfile build) | MP3 data, browser decoder | MP3 works; Ogg depends on Safari | Browser decoder |
| Timing grid | 128-frame quantum (tested) | 1 ms ticks, 64-sample blocks | Web Audio `start(when)` | Web Audio `start(when)` | Web Audio `start(when)` |
| Note events for visuals | `noteOn`/`noteOff` events, `getNoteTimes()` | player hook in audio thread | own scheduler | own scheduler | own scheduler |
| Seek, speed | Built in | Built in (`seekPlayer`, tempo multiplier) | own code | own code | own code (Transport) |
| Mute | `isMuted` per channel | no API found | own GainNode | own GainNode | own GainNode |
| Solo | mute others | not found | own code | own code | own code |
