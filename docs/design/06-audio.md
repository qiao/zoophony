# 6. Audio

## 6.1 Engine

The app uses its own AudioWorklet processor. The processor bundles `spessasynth_core` and
`stb-vorbis` (both Apache-2.0). The app does not use `spessasynth_lib`.

- pnpm overrides pin `spessasynth_core` and `stb-vorbis` to exact versions.
- spessasynth_core contains the full synth, with reverb, chorus, and delay. The lib is only a thin
  wrapper around it.

The research rejected these options ([`research/audio-engines.md`](../research/audio-engines.md),
[`research/audio-scheduling.md`](../research/audio-scheduling.md)):

| Option | Reason for rejection |
|---|---|
| WebAudioFont | GPL-3.0, which conflicts with an Apache-2.0 app. |
| gleitz sound sets | No loop points (each note is 3.1 s long), and the licenses conflict. |
| Tone.js Sampler | No loop point for each sample. |
| js-synthesizer | LGPL, 904 KB for SF3 support, and no mute API. |
| spessasynth_lib with our scheduler on the main thread | Queued events cannot be cancelled, so seek, pause, and mute act late, and a seek can play old notes. Safari aligns hidden-tab timers to 1 s. |
| spessasynth_lib with its sequencer | Seek does not restart held notes, and pause restarts all of them. A pause loses the pedal state. The main-thread clock can be wrong by up to 50 ms. |

### Room and mix

The user asked on 2026-10-05 for a "very hifi and professional" sound in place of a "dry or thin"
one, and chose the room and the mix of [`research/sound-quality.md`](../research/sound-quality.md).
[`research/room-and-mix.md`](../research/room-and-mix.md) measures the result.

- **Pan.** `stageMix()` of `score/stage-mix.ts` gives each synth channel the pan of the mean place
  of its players in the default camera view (4.5, camera), so a player on the left of the screen
  sounds on the left.
- **Reverb send.** The send grows with the mean distance of the players from the podium, so the
  back rows sound farther away (`NEAR_REVERB_SEND`, `FAR_REVERB_SEND`).
- A channel that several seats share gets the mean of all their players (3.7). A channel with no
  player (the sound-only seat) gets the center pan and a middle send.
- **Choir gain.** A channel that feeds a choir seat gets `CHOIR_GAIN_DB` (+6 dB), because one
  channel sings for a full choir. With no gain, the choir was about 9 dB below the orchestra in a
  tutti, and with it about 3 dB below. The seat of the vocal soloists gets no gain. The `Player`
  sends the gains with the score (`channelGainsDb()`), and the engine sets the gain of each synth
  channel again after each reset of the synth. The gain is a channel gain of spessasynth_core,
  because CC 7 gives only about +4 dB above its value 100.
- `mixSynthEvents()` drops each pan (CC 10) and reverb send (CC 91) of the file, and puts the
  values of the mix at song time 0. Thus the file cannot change them, and the chase of a seek
  restores them (6.5). The rule is in `score/`, because it is a MIDI rule (7.1).
- **Effects of the synth.** The synth has no chorus. Its reverb is the short room of the GS macro
  "Room 1" with the system parameter `reverbLock`, so that each reset keeps the room.
- **Hall.** The output chain of the `Player` adds the hall reverb of St Paul's Hall, the gain of
  each demo, and a limiter (6.8). The worklet keeps one stereo output, so the hall gets the full
  mix, and the reverb sends go to the room.

## 6.2 SoundFont

On 2026-10-05 the user decided: "Use a high-quality sound font. I'm OK with extra download size.
About 10 MB is fine." The 10 MB are for the preset files of one piece, after the first frame. The
first download stays below 1 MB (7.2). The sources and their licenses are in
[`research/sound-quality.md`](../research/sound-quality.md), section 4.

- The SoundFont is `assets/soundfont/Zoophony.sf3`, an SF3 file that
  `tools/build-soundfont.ts` makes. The repository holds one copy, with no Git LFS.
  `assets/soundfont/README.md` gives its SHA-256, the sources, their licenses and versions, the
  preset of each source, and the build command.
- The base is GeneralUser GS 2.0.3. Its license permits use in software and our own copy. It asks
  us not to link to the download files of the author, so the site serves its own copy.
- The orchestral presets come from two CC0 sample libraries of Versilian Studios: VSCO 2 CE
  (strings, winds, brass, orchestra kit) and VCSL (piano, harpsichord, harp, timpani, mallets,
  recorder, ocarina). `tools/soundfont-recipes.ts` holds the choice for each program and the cut of
  the loops, and `tools/build-soundfont.ts` the layers and the encoding. Each other preset is
  GeneralUser GS, and so is each key outside the range of the new samples. No source with a usable
  license has a choir, a celesta, or a section of basses.
- The build downloads each source at a fixed commit and checks it with the SHA-256 of
  `tools/soundfont-lock.json`. Two builds write the same bytes.
- Each new preset matches the level of the GeneralUser GS preset that it replaces. The sample
  peaks cannot go above full scale, so every preset gets a headroom (`SOUNDFONT_HEADROOM_DB` of
  `audio/soundfont-info.ts`), and the `Player` adds it back in the output chain (6.8).
- `tools/split-soundfont.ts` splits the SF3 into one file for each preset, at
  `sf/<bank>/<program>.sf3`, with the Ogg data and the loop points. Drum kits use bank 128. It also
  writes `sf/index.json` with the bank, the program, the kit flag, the file, and the size of each
  preset. The app reads the index to find a preset, or its fallback in bank 0 (kit 0 for a drum
  kit), before it fetches a file. `pnpm dev` and `pnpm build` run the split into `public/sf/`,
  which Git ignores.
- The build gzips each preset file of `dist/sf/` in place, with the same name, and writes the
  gzip sizes into `dist/sf/index.json` (`tools/gzip-site.ts`). GitHub Pages sends an SF3 file
  with no gzip, and each Ogg stream of a file repeats its setup header, so gzip makes the files
  smaller. `public/sf/` and the dev server keep the plain files.
- The split skips the XG and GM2 drum kits at bank MSB 120, because the score asks for each drum
  kit in bank 128.
- The credits dialog names GeneralUser GS, VSCO 2 CE, and VCSL, and links to their licenses
  (2.8, 7.3).
- The hall reverb (6.8) uses an impulse response of St Paul's Hall, University of Huddersfield,
  from the 360° BRIR and FOA database (CC BY 4.0), in `assets/hall/st-pauls-hall-c8m.wav`.
  `assets/hall/st-pauls-hall-c8m.flac` holds the same samples in about a quarter of the bytes.
  `assets/hall/README.md` gives the source, the checksums, and the steps.

## 6.3 Load flow

The sample decode happens at the first note of each sample, on the audio thread. One decode can
take longer than one audio block, so the app decodes all samples before play.

```text
the file loads (the default demo: right after the first frame)
   │
   v
main thread: parse the file -> Score -> list of presets
   │ fetch each preset file that the synth does not have: sf/<bank>/<program>.sf3
   v
Web Workers (1 to 4): spessasynth_core converts each SF3 file to a PCM SF2 (no cache)
   │ transfer the PCM buffers (transferable objects, no copy)
   v
AudioWorklet: add the new banks (each add resets the synth) ── kept for the session
   │
   v
play is enabled
```

- The Workers work while the `AudioContext` is still suspended, so the default demo is ready
  before the first click.
- The synth keeps each bank for the session, and the Workers keep no copy. The `Player` asks the
  Workers only for the presets that the synth does not have, so each preset is in memory one time.
  After a failure, the new engine loads all presets of the next score again (6.8).
- A load that a later load replaces sends no banks to the synth. The shared presets then decode
  two times. The result is correct, and only the load time increases.
- The synth removes no bank during a session. The memory target of 9.7 is for each demo.
- Each bank add resets the synth, so all banks load before play starts (2.4).
- The first load starts the decode Workers, the fetch of `sf/index.json`, the worklet module, and
  the hall impulse response at the same time. The Workers get the preset files when the index
  arrives, so the decode does not wait for the worklet and the hall. The banks go to the synth
  when the worklet and the hall are ready (`#makeEngine()` of `audio/player.ts`). The hall decodes
  on the main thread (6.8).
- The engine has one decode Worker for each logical processor after the first, at most four
  (`decodeWorkerCount()`). `splitDecodes()` gives each preset file, the largest first, to the
  Worker with the fewest bytes, and the synth gets the banks in the order of the files. A single
  Worker made the decode of the default demo set its ready time on a fast link
  ([`2026-10-21-load-performance.md`](../research/2026-10-21-load-performance.md)).
- A Worker removes the gzip layer of a preset file only when its first two bytes are `1f 8b`,
  with the native `DecompressionStream` (`plainBytes()` of `audio/plain-bytes.ts`). An SF3 file
  starts with `RIFF`, so the plain files of the dev server pass as they are. A browser with no
  `DecompressionStream` cannot load the presets of the build.
- Cost: core loads in each decode Worker and in the worklet, after the first frame. The PCM
  data uses 6 to 7 times more memory than the SF3 data.

## 6.4 Block scheduler

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

1. Apply the transport commands: play, pause, seek, rate, volume, and seat audible flags. Then
   make one plan for the notes of all seats that changed (6.6).
2. Send the events that are due in this block to spessasynth_core. Skip the note ons of silent
   seats.
3. Render the block with spessasynth_core.
4. After a transport change, post a clock anchor (6.7). Also post one each second.

- The event selection for a block is a pure function with Vitest tests. `SynthEngine`
  (`audio/engine.ts`) holds spessasynth_core and the block scheduler with no Web Audio code, so
  the Node tests render it offline. The processor is a thin layer around it.
- The main thread packs the synth events into a `SynthEventTable` (one typed array for each field
  of `SynthEvent`) and transfers the buffers to the processor with no copy.
- The processor makes all synth channels before the first event, from the highest channel of the
  synth events, and then resets the synth so that channel 10 of each port is a drum channel. An
  event for a channel that does not exist would stop the processor for good.
- An event is due in the block that holds its song time, and it sounds from the start of that
  block. Thus a note sounds up to one block early, and never late (`audio/clock-render.test.ts`).
- Hidden tabs have no effect on the sound, because the processor uses no timers. In WebKit, the
  AudioWorklet thread has no real-time priority, and an idle Mac can lose time. The cause is
  outside the app code ([`research/webkit-audio.md`](../research/webkit-audio.md)).
- The `AudioContext` uses `latencyHint: 'interactive'`, because a larger buffer adds latency in
  Chrome.
- The volume is a gain node at the end of the output chain (6.8). The processor keeps its `volume`
  command (the master gain of the synth) for the warm-up, until the Safari check frees
  `processor.ts` (review of step 1, condition 3).
- `process()` catches a render error, posts an `error` message to the `Player`, and outputs
  silence in each later block, because a throw from `process()` would stop the processor for
  good.
- The first notes of each preset run cold code on the audio thread. Thus `addBanks()` warms up the
  voice code after each bank add, with the master gain 0, while the context is still suspended. It
  plays the first note of each preset and the first blocks of the song, then stops all voices,
  resets the synth, and restores the gain. It posts no anchor.

## 6.5 Seek, pause, resume, and unmute

- At a seek, the processor restores the program, the bank, the controllers, and the pitch bend at
  the seek point. A seek releases all notes, resets the synth, and sends the chase: the program
  changes, bank select, data entry, RPN, NRPN, and CC 121 in their order, then the last value of
  each other controller, the pitch bend, and the channel pressure of each channel.
- A held note is a note that starts before the seek point and continues after it.
  - The processor starts held notes again for instruments with a long sound: bowed strings (also
    the fiddle), woodwinds (also the bagpipe and the shanai), brass, choir, organ, and the synth
    leads and pads.
  - It does not start held notes again for instruments with a sound that decays: piano, harp,
    guitars, pizzicato, mallets, percussion, and the synth effects.
  - `sustainsAfterSeek()` in `score/program-map.ts` holds this program list. A rhythm channel
    never starts held notes again.
- The same rule applies when play continues after a pause, at the start point after the count-in,
  and when a seat is unmuted.
- A held note that does not start again keeps its note off in the event list. The synth pairs note
  offs first in, first out, so that note off would end a later note on the same key. Thus the
  processor pairs each note off with its note on (`notePairs()` in `audio/block-scheduler.ts`),
  and sends a note off only when its note on sounds.
- A speed change takes effect at the next block.
- When the song plays to its end, the transport pauses at the song length. A play at the song
  length starts the song again from 0, with the chase of a seek. The page pauses its transport
  when `Player.now()` reaches the song length, after `now()` has read less than it
  (`followSongTime()` in `app/transport.ts`).
- **Count-in.** The user decided on 2026-10-05 that the conductor gives a count-in before the
  music (5.4). The `play` command carries the count-in in song seconds. The song time starts one
  count-in before the start point, and the first sound comes at the start point, with no timer.
  The start point is the pause point, or 0 at the song end and before the first play.
  `startPlay()` of `app/transport.ts` gives the start point and the count-in of a play, so that
  the `Player` and the pose use one count-in.
- In the count-in, the cursor stays at the start point, so no event before it sounds again. The
  block that reaches the start point starts the held notes again, before its own events
  (`planBlock()` in `audio/block-scheduler.ts`).
- A pause in the count-in goes back to the start point. A seek during play ends the count-in, the
  sound starts at the seek point at once, and the seek point becomes the start point
  (`seekPlayState()`). A seek while paused keeps the transport. A seat change in the count-in only
  sets the flag (6.6).
- A seek to the song start during play (the Home key, 2.4) has no count-in, so the conductor shows
  no ready gesture (5.4). Its start point is the smallest number above 0, because the pose gives
  the ready gesture to a count-in from the start point 0.

## 6.6 Mute and solo

- Mute and solo work for each seat, also when seats share a channel. The user can solo several
  seats at the same time.
- A seat sounds if it is not muted and one of these is true: no seat is soloed, or this seat is
  soloed.
- When a seat becomes silent, the processor sends note offs for its held notes at once. Each note
  event has the seat of its note (3.2), so the processor skips the note on of a silent seat, and
  thus also its note off (6.5).
- When a seat becomes audible during play, its held notes start again by the rule of 6.5. A seat
  change while paused only sets the flag.
- When all seats with notes on a channel are silent, the processor stops all notes of that
  channel, so a sustain pedal that is down does not keep them. When a seat becomes silent on a
  channel with audible seats and the pedal down, the processor sends a pedal up after the note
  offs, then the old pedal value again. spessasynth_core releases each held voice of the channel
  at a pedal up, so the notes of the silent seat end, and the audible notes that only the pedal
  holds end too.
- When an audible seat and a silent seat hold the same key of one channel, and the silent note is
  the newer one, the processor ends both notes and starts the audible note again, because the
  synth ends the notes of a key oldest first. Such a case is rare, because a string ensemble
  divides by pitch (3.5).
- Mute and solo stay the same after a seek. They reset when a new file loads.
- The app sends a seat change to the `Player` only when the samples of the piece are ready, and
  after the load it sends each silent seat again, because a load resets the seat flags of the
  `Player` (6.8). The poses follow each change at once.
- `Player.setSeatAudible()` sends a `seat` command. The processor sets the flag in step 1 of the
  next block (6.4), and makes one plan for all changed seats, from a list of the seats of each
  channel. Thus a solo takes about the time of one seat change (`audio/seat-speed.test.ts`).

### Speed of a mute

A user expects silence at once from the mute button of the bar (UX audit SD2). A seat mute removes
one voice of the orchestra, and the hall rings on, as in a real hall.
[`research/demo-loudness.md`](../research/demo-loudness.md) measures both.

```text
bar mute:   synth ── room ── hall ── limiter ── volume gain: 1 -> 0, time constant 30 ms
                                                   └─ dry sound and all tails stop together
seat mute:  note offs of the seat -> release of the voices -> room and hall ring on
```

- The mute button of the bar sets the volume gain of the output chain to 0 (6.8) with a short time
  constant, so the dry sound and all tails stop together, and an unmute gives no click.
- A seat mute keeps the release of the voices of the seat, and the room and the hall ring on. The
  hall gets the full mix (6.1), so it cannot stop the tail of one seat alone. With the other seats
  audible, they cover this tail.

## 6.7 Clock

`Player.now()` gives the song time of the sound that the listener hears now.

- The processor posts a `ClockAnchor` when a transport change takes effect, and one time each
  second.
- After a new score, the first block posts an anchor `{ songTime: 0, rate: 0 }` with the new load
  number. The `Player` ignores each anchor with an older load number (`addScoreAnchor()` in
  `audio/clock.ts`), so `now()` gives 0 after a load until the new anchors arrive.
- First method: `now()` uses the anchor and `AudioContext.getOutputTimestamp()`. By the spec,
  `getOutputTimestamp().contextTime` is the frame that the output device plays now, so it already
  includes the output latency. Do not subtract the latency from this value again.
- Second method: `currentTime - outputLatency` (or `baseLatency` if `outputLatency` is 0). The
  spike (9.5) compared the two methods
  ([`research/audio-spike.md`](../research/audio-spike.md)). They agree in Chrome. In Firefox, the
  timestamp method is later by the output latency, because Gecko already moves it back.
- `now()` therefore uses the second value when the timestamp method is later than it by more than
  half of the output latency (`chooseHeardTime()` in `audio/clock.ts`). This rule finds the
  browser from the values, with no check of the browser name.
- With Bluetooth headphones, the latency is often more than 100 ms. Thus the correct clock is
  necessary for the sync of the animation.
- The `Player` keeps each anchor that can still be in effect (`addAnchor()` in `audio/clock.ts`).
  The heard time is never more than 1 s before the newest anchor, because 1 s is more than the
  largest output latency. Thus a drag of the seek bar can put many anchors in the latency window,
  and the anchor in effect stays in the list.

## 6.8 Interfaces

```typescript
interface Player {
  /** Loads the engine on the first call, then the presets of the score. */
  load(score: Score, onProgress: (progress: LoadProgress) => void): Promise<void>;
  /** Plays from the start point after a count-in of `countInSec` song seconds (6.5). */
  play(countInSec: number): void;
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
  /** The number of the score in the engine: 1 for the first `loadScore()`, then 2, and so on. */
  load: number;
}
```

- `load()` takes a `PlayerScore` (below). The app passes its `Score`.
- `WorkletPlayer` implements the interface. It also gives the values that the spike page shows:
  `context`, `anchors`, `renderStats`, and `pcmBytes`.
- `now()` uses the first method of 6.7 while `contextTime` is above 0 and the timestamp has an
  output latency, else the second method. It uses the last anchor at or before the heard context
  time, so after a seek, the old anchor stays in effect until the listener hears the block of the
  seek. In the count-in, the anchors carry song times below the start point (6.5), and the pose
  reads these times (5.2, 5.4). Before the first anchor, `now()` gives the song time of that
  anchor.
- The `WorkletPlayer` keeps the last rate and sends it after each score. The volume is the gain
  "volume" of the output chain, so it stays over loads and failures.
- After the decode of a load, the `Player` posts the score, the rate, and the banks in one task. A
  command before this task acts on the old score, and a command after it acts on the new score,
  also before `load()` resolves. The app plays only after the load resolves.
- These failures end the engine: a failed start (the fetch of `sf/index.json` or `addModule()`),
  an `error` or `messageerror` event of a Worker, a `processorerror` event, and an `error`
  message of the processor (6.4). The `Player` disconnects the node, ends the Workers, and stops
  the clock at its song time. Commands do nothing until the next load. A Worker that fails before
  the engine is live fails the start.
- The next `load()` after a failure starts a new engine, so the "Try again" button of 2.8 can
  succeed. A pending load rejects with the error. If no load is pending, the `WorkletPlayer`
  gives the error to the `onError` function of its constructor:
  `new WorkletPlayer(baseUrl, onError)`.
- `play()` resumes the context. Safari and iOS can refuse the resume outside a user gesture, and
  the `WorkletPlayer` gives a refused resume to `onError`. Thus a click that waits for the samples,
  and a selection of a demo, resume the suspended context at once, in the user gesture.
- A later `load()` replaces a pending `load()`, because a new selection stops the current piece
  (2.2). The earlier promise rejects at once with a `LoadReplacedError`, which the app ignores,
  and the earlier load sends nothing more.
- The progress of a load (`LoadProgress` in `audio/player.ts`) counts the preset files that are
  ready and the bytes that arrived, for the presets that the synth does not have, on all decode
  Workers. Each Worker reads each file in chunks (`readWithProgress()` in
  `audio/read-progress.ts`). The total is the sum of the sizes of `sf/index.json`. In the build,
  the bytes and the sizes are both of the gzip files (6.2).
- The processor answers each `banks` message with one `ready` message, in order. Thus a load
  resolves only after its own banks are in the synth.

### Output chain

The `WorkletPlayer` sends the output of the synth through this chain (6.1, user decision of
2026-10-05). `createOutputChain()` of `audio/output-chain.ts` makes it one time for the session.
The constants of the module hold the gains, the limiter, and the time constant.

```text
AudioWorkletNode (stereo)
       │
       v
GainNode "input": the headroom of the SoundFont plus the gain of the piece
       ├──────────────────────┐
       v                      v
GainNode "dry" (1)    ConvolverNode (hall impulse response, stereo, normalize off)
       │                      │
       │              GainNode "wet" (WET_GAIN)
       v                      v
DynamicsCompressorNode "limiter" (just below full scale, hard knee, fast attack)
       │
GainNode "trim" (removes the makeup gain of the limiter)
       │
GainNode "volume": the volume slider and the mute button, VOLUME_TIME_CONSTANT
       │
context.destination
```

```typescript
interface PlayerScore extends Pick<Score, 'durationSec' | 'synthEvents' | 'presets'> {
  /** The pan, the reverb send, and the gain of each synth channel, from `stageMix()` (6.1). */
  readonly mix: readonly ChannelMix[];
  /** The gain of the piece in dB, from `pieceGainDb()`. */
  readonly gainDb: number;
}
```

- **Mix.** The `Player` sends the events of `mixSynthEvents()` (6.1). The app keeps the mix of the
  layout with each piece, also for a file of the user. A change of the section size gives the
  piece the mix of the new layout for its next load. The spike page sends an empty mix, because a
  layout would add the model code to a chunk of the first download (7.2).
- **Gain of the piece.** The input gain is `SOUNDFONT_HEADROOM_DB` (6.2) plus the gain of the
  piece. `pieceGainDb()` brings each demo to `TARGET_LOUDNESS` (integrated, ITU-R BS.1770-4) at
  the output of the chain, from `DEMO_LOUDNESS` of `audio/demo-loudness.ts`. The target is the
  loudness of music of AES TD1008 for streams. A louder target needs more gain reduction from the
  limiter on the dynamic demos. `pnpm loudness --fit` measures
  each value with the code of the chain in an `OfflineAudioContext`. Run it again after a change
  of a demo file, the SoundFont, the mix, the hall, or the limiter. A file of the user and
  `perf-60.mid` get 0 dB, and the limiter catches the peaks. Each demo keeps its loudness range:
  the gain moves the whole piece, and only the limiter acts on the peaks.
- **Hall.** The convolver does not normalize the impulse response, so the wet gain sets the level
  of the hall against the room of the synth.
- **Limiter.** A `DynamicsCompressorNode` adds a fixed makeup gain. The trim gain removes it, so
  the chain does not change the level below the threshold. The compressor lets short peaks pass
  above its threshold, so the threshold sits low enough that each demo keeps its true peak at or
  below -1 dBTP, the limit of EBU R 128 and of Spotify.
- **Volume.** `setVolume()` moves the gain "volume" with `setTargetAtTime()` (`setOutputVolume()`).
  The app gives it the square of the slider position, and 0 for the mute button (2.8). The volume
  comes after the limiter, so the limiter acts the same at each volume, and a mute also stops the
  tail of the hall (6.6).
- The `Player` fetches the impulse response as FLAC (`HALL_IMPULSE_URL`). When
  `decodeAudioData()` refuses it, the `Player` fetches the WAV file with the same samples
  (`HALL_WAV_URL`, `#loadHall()` of `audio/player.ts`). Chromium and WebKit decode the two files
  to the same floats. Firefox scales a positive sample of the WAV file by 1 / 32767 and of the
  FLAC file by 1 / 32768, so its hall changes by at most 1.8e-5 of full scale
  ([`hall-flac.md`](../research/2026-10-21-load-performance/hall-flac.md)).
- A failed fetch or decode of the impulse response is a failed start, so the next load tries
  again. After a failure of the engine, the new worklet node connects to the same chain.
- A render ahead in a Worker (`research/webkit-audio.md` section 7) gives a stereo output too, and
  can connect to the same input.
