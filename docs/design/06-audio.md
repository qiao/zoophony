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
| WebAudioFont | GPL-3.0, which conflicts with an MIT app. |
| gleitz sound sets | No loop points (each note is 3.1 s long), and the licenses conflict. |
| Tone.js Sampler | No loop point for each sample. |
| js-synthesizer | LGPL, 904 KB for SF3 support, and no mute API. |
| spessasynth_lib with our scheduler on the main thread | Queued events cannot be cancelled, so seek, pause, and mute act late, and a seek can play old notes. Safari aligns hidden-tab timers to 1 s. |
| spessasynth_lib with its sequencer | Seek does not restart held notes, and pause restarts all of them. A pause loses the pedal state. The main-thread clock can be wrong by up to 50 ms. |

### Room and mix

On 2026-10-05, the user said that the sound was "fake" and "dry or thin", and asked for a "very
hifi and professional" sound. The user chose recommendation 1 of
[`research/sound-quality.md`](../research/sound-quality.md): the room and the mix. Before it, no
file sent a reverb send, so the reverb gave 0.2 % of the energy, and the Beethoven demo played
all channels in the center. [`research/room-and-mix.md`](../research/room-and-mix.md) measures the
result.

- **Pan.** `stageMix()` of `score/stage-mix.ts` gives each synth channel the pan of the mean
  place of its players in the default camera view (4.5, camera), so a player on the left of the
  screen sounds on the left. For each player, `s = x·cos a - z·sin a`, from the stage
  center, where `a` is the azimuth of the default view: 0° since 2026-10-06, so `s = x`. The
  pan is `CC 10 = round(64 + 63 × p)`, with `p = 0.8 × mean(s) / (S / 2)`, limited to -1 to 1.
- **Reverb send.** The send follows the mean distance `d` of the players from the podium
  center: `CC 91 = round(40 + 40 × t)`, with `t = (d - 2.4 m) / 4.8 m`, limited to 0 to 1. The
  front rows get 40 to 53, the winds 68 to 78, and the back row 80.
- A channel that several seats share gets the mean of all their players (3.7). A channel with
  no player (the sound-only seat) gets the pan 64 and the send 60.
- `mixSynthEvents()` drops each CC 10 and CC 91 of the file, and puts the values of the mix at
  song time 0, before the events of the file. Thus the file cannot change them, and the chase of
  a seek restores them with the other controllers (6.5). The rule is in `score/`, because it is
  a MIDI rule (7.1). The `Player` applies it to the events that it sends (6.8).
- **Effects of the synth.** The synth has no chorus: a chorus processor that adds nothing
  replaces the chorus of spessasynth_core. The reverb of the synth has the values of the GS
  macro "Room 1" (character 0, pre-lowpass 3, time 80, level 64, no pre-delay), and the system
  parameter `reverbLock`, so that each reset keeps the room. The reverb sends go to this short
  room, so the back rows sound farther away.
- **Hall.** The output chain of the `Player` adds the hall reverb of St Paul's Hall, the gain of
  each demo, and a limiter (6.8).
- The B2 render of the research had a second worklet output for a mono reverb send, and no
  room in the synth. Condition 3 of the step 1 review keeps `processor.ts` until the Safari
  check, so the worklet keeps one stereo output. The hall therefore gets the full mix, and the
  reverb sends go to the room. The reverb share of the first 30 s is 25.8 % in both demos (B2:
  25 %).

## 6.2 SoundFont

On 2026-10-05 the user decided: "Use a high-quality sound font. I'm OK with extra download size.
About 10 MB is fine." The 10 MB are for the preset files of one piece, after the first frame. The
first download stays below 1 MB (7.2). The sources and their licenses are in
[`research/sound-quality.md`](../research/sound-quality.md), section 4.

- The SoundFont is `assets/soundfont/Zoophony.sf3` (22.0 MB), an SF3 file that
  `tools/build-soundfont.ts` makes. The repository holds one copy, with no Git LFS.
  `assets/soundfont/README.md` gives its SHA-256, the sources, their licenses and versions, the
  preset of each source, and the build command.
- The base is GeneralUser GS 2.0.3 as SF3 (8.4 MB). The build downloads it at a fixed commit and
  checks its SHA-256. Its license permits use in software and permits our own copy. It asks us
  not to link to the download files of the author, so the site serves its own copy.
- 31 presets and one copy (program 1 plays the zones of program 0) come from two CC0 sample
  libraries of Versilian Studios: VSCO 2 CE (strings, winds, brass, orchestra kit) and VCSL
  (piano, harpsichord, harp, timpani, mallets, recorder, ocarina). `tools/soundfont-recipes.ts`
  holds the choice for each program. Each other preset is GeneralUser GS, and so is each key
  outside the range of the new samples.
- No source with a usable license has a choir, a celesta, electric pianos, or synth sounds.
  These presets stay GeneralUser GS. No source has a section of basses, so the basses (43) are
  one solo player of VSCO 2 CE. Section 4 of the research report lists the sources that their
  licenses exclude.
- The build downloads the SFZ files and the WAV samples at fixed commits, and checks each file
  with the SHA-256 of `tools/soundfont-lock.json`. Two builds write the same bytes.
- Each new sample is mono, at the rate of its source (44.1 or 48 kHz). A part keeps the first
  round robin and up to two velocity layers. Each softer layer is 4 dB below the layer above it.
- A sustained note (strings, winds, brass) keeps its attack and one loop of 1.2 s (strings) or
  1 s (winds and brass), with a crossfade. The sample starts where the level is 9 dB (strings) or
  12 dB (winds and brass) below the steady level, so that a slow swell does not delay the note.
  The pitch of the loop tunes the sample, when it is clear and within 60 cents.
- A decaying note ends at 50 dB below its peak, or at a longest length for each instrument. The
  piano loops a flat tail of 0.5 s after 4.5 s (low keys) to 1.8 s (high keys), and its volume
  envelope continues the measured decay.
- The Ogg Vorbis quality is 5 (libvorbis, in the dev dependency `wasm-media-encoders`).
- Each new preset matches the level of the GeneralUser GS preset that it replaces, at velocity
  100. The sample peaks cannot go above full scale, so some new presets need more level than
  GeneralUser GS. Thus every preset gets 6.5 dB of headroom: the SoundFont plays 6.5 dB below
  GeneralUser GS. `SOUNDFONT_HEADROOM_DB` of `audio/soundfont-info.ts` holds this value, and the
  `Player` adds it to the input gain of the output chain (6.8).
- A build script splits the SF3 into one file for each preset, at `sf/<bank>/<program>.sf3`. Drum
  kits use bank 128. The split keeps the Ogg data and the loop points.
- The preset files of the demos are 3.0 MB to 9.4 MB for each demo (9.7).
- The credits panel names GeneralUser GS, VSCO 2 CE, and VCSL, and links to their licenses
  (2.8, 7.3).
- The hall reverb of the `Player` (6.8) uses an impulse response of St Paul's Hall, University
  of Huddersfield, from the 360° BRIR and FOA database (CC BY 4.0).
  `assets/hall/st-pauls-hall-c8m.wav` holds it: a stereo decode of position C8m, with the direct
  sound removed, 2.5 s, 16-bit, 48 kHz, 480,044 bytes. `assets/hall/README.md` gives the source,
  the checksums, and the steps. `audio/output-chain.ts` imports its URL, so the build copies it
  into `dist/assets/`.

- The split script also writes `sf/index.json`: one entry for each preset, with its bank, its
  program, its drum kit flag, its file, and its size. The app reads this index to find a preset,
  or its fallback in bank 0, before it fetches a file. The fallback of a drum kit is kit 0
  (bank 128, program 0). The `file` field is a path from the site root, such as `sf/0/40.sf3`.
- `tools/split-soundfont.ts` writes the files into `public/sf/`, which Git ignores. `pnpm dev`
  and `pnpm build` run it first (1.0 s). Thus the dev server serves the files, and the build
  copies them into `dist/sf/`.
- Each melodic preset keeps its bank MSB, so the GS variation banks also get files. The
  GeneralUser GS bank also holds the 13 drum kits at bank MSB 120 (XG and GM2). The split skips
  them, because the score asks for each drum kit in bank 128. The output has 274 files, 53.8 MB.

## 6.3 Load flow

The research measured the sample decode: it happens at the first note of each sample, on the
audio thread. One decode takes 0.64 ms (median) to 3.78 ms (max), but one audio block has only
2.67 ms. Thus the app decodes all samples before play.

```text
the file loads (the default demo: right after the first frame)
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

- The Worker works while the AudioContext is still suspended. Thus the default demo is ready
  before the first click.
- The synth keeps each bank for the session, and the Worker keeps no copy. The `Player` asks the
  Worker only for the presets that the synth does not have. Thus a switch between demos that
  share presets does not fetch or decode them again, and each preset is in memory one time.
  After a failure, the new engine loads all presets of the next score again (6.8).
- A load that a later load replaces during its decode sends no banks to the synth. Thus the
  later load asks the Worker for the shared presets again, and they decode two times. The result
  is correct, and only the load time increases.
- The synth removes no bank during a session. Thus the PCM of a session has an upper limit of
  299.7 MB, when the session uses all 274 preset files. The melodic presets of bank 0 give
  199.5 MB of it. The memory target of 9.7 is for each demo.
- Each bank add resets the synth. Thus all banks load before play starts, and play waits for the
  load (2.4).
- The first load also fetches the hall impulse response (480 KB) and decodes it with
  `decodeAudioData()` on the main thread, at the same time as `sf/index.json` and the worklet
  module (6.8). The `Player` keeps it for the session.
- Cost: core loads two times (in the Worker and in the worklet). This adds about 100 KB after the
  first frame.
- Cost: the PCM data uses 6 to 7 times more memory than the SF3 data: 13.8 MB (Eine kleine
  Nachtmusik) to 62.2 MB (Boulanger) for each demo.
- Cost: the banks of all pieces of a session stay in the synth. After the six demos and the
  choir test file (`models/test-choir.ts`, programs 52 to 54), the synth holds 22 presets in
  76.2 MB of PCM (`audio/pcm-memory.test.ts`). With the five demos before the user decision of
  2026-10-05 (8.2), it held 22 presets in 93.8 MB.

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

- The event selection for a block is a pure function. Vitest tests it.
- spessasynth_core also runs in Node, so tests can render audio offline.
- The processor makes all synth channels (`portCount * 16`) before the first event, and then
  resets the synth so that channel 10 of each port is a drum channel. An event for a channel that
  does not exist would stop the processor for good.
- Hidden tabs have no effect on the sound, because the processor uses no timers.
- In WebKit, the AudioWorklet thread has no real-time priority, and the real-time render thread
  waits for it in each block. On an idle Mac, Playwright WebKit lost about 0.8 s over the Beethoven demo,
  and an empty processor also lost time. One busy process on the Mac removed the loss
  ([`research/webkit-audio.md`](../research/webkit-audio.md)). The cause is outside the app code.
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
- The volume is a gain node at the end of the output chain (6.8), so the `Player` sends no
  volume to the processor. The processor keeps its `volume` command, which sets the master gain
  of spessasynth_core (the system parameter `gain`), until the Safari check frees `processor.ts`
  (review of step 1, condition 3). The warm-up uses the master gain.
- The synth has no chorus, and its reverb is the short room of 6.1 with the reverb lock. The pan
  and the reverb send of each channel come as events at song time 0 in the event list (6.1), so
  the processor needs no new command. `processor.ts` did not change for the room and the mix.
- A render error makes the processor silent for good. `process()` catches the error, posts an
  `error` message to the `Player`, and outputs silence in each later block. A throw from
  `process()` would stop the processor for good.
- `SynthEngine` (`audio/engine.ts`) holds spessasynth_core and the block scheduler with no Web
  Audio code, so the Node tests render it offline. The processor is a thin layer around it.
- The first notes of each preset ran cold code on the audio thread: a block of 3 to 5 ms at the
  first notes of a process, and up to 1.5 ms at the first notes of a preset in the middle of a
  song. Thus `addBanks()` warms up the voice code after each bank add, also when the list of
  banks is empty. It runs while the context is still suspended for the default demo. With the master gain
  0, it sends the events of the score with the first note on of each preset, and renders 30
  blocks while these notes hold and 15 blocks after their release. Then it plays the first 8
  blocks of the song with the block scheduler. At the end, it stops all voices, resets the
  synth, and restores the gain. It posts no anchor.

## 6.5 Seek, pause, resume, and unmute

- At a seek, the processor restores the program, the bank, the controllers, and the pitch bend at
  the seek point.
- A held note is a note that starts before the seek point and continues after it.
  - The processor starts held notes again for instruments with a long sound: bowed strings
    (also the fiddle), woodwinds (also the bagpipe and the shanai), brass, choir, organ, and the
    synth leads and pads.
  - It does not start held notes again for instruments with a sound that decays: piano, harp,
    guitars, pizzicato, mallets, percussion, and the synth effects.
- The same rule applies when play continues after a pause, at the start point after the
  count-in, and when a seat is unmuted.
- A speed change takes effect at the next block.
- When the song plays to its end, the transport pauses at the song length. A play at the song
  length starts the song again from 0, with the chase of a seek.
- **Count-in.** The user decided on 2026-10-05 that the music does not start at the click. The
  conductor first gives a count-in (5.4). The `play` command carries the count-in in song
  seconds. The song time starts one count-in before the start point, and the first sound comes
  at the start point. The start point is the pause point, or 0 at the song end and before the
  first play. Thus the first note sounds at its song time after the count-in, with no timer.
  `startPlay()` of `app/transport.ts` gives the start point and the count-in (5.4) of a play,
  so that the `Player` and the pose use one count-in.
- In the count-in, the cursor stays at the start point, so no event before the start point
  sounds again. The block that reaches the start point starts the held notes again, before its
  own events (`planBlock()` in `audio/block-scheduler.ts`).
- A pause in the count-in goes back to the start point. A seek during play ends the count-in, and
  the sound starts at the seek point at once. A seat change in the count-in only sets the flag,
  as while paused (6.6).
- A seek during play also makes the seek point the start point of the transport
  (`seekPlayState()` in `app/transport.ts`). Thus a pause after a seek back, before the old
  start point, keeps the hold of 3 s (5.2). A seek while paused keeps the transport, and the
  next play starts from the seek point.
- A seek to the song start during play (the Home key, 2.4) has no count-in, so the conductor
  shows no ready gesture (5.4). Its start point is the smallest number above 0, because the pose
  gives the ready gesture to a count-in from the start point 0.
- The page pauses its transport when `Player.now()` reaches the song length. After a play, this
  check waits until `now()` reads less than the song length. After a play at the end, `now()`
  keeps the old anchor until the listener hears the new one (6.8), so the first frames read the
  end time. `followSongTime()` in `app/transport.ts` holds this rule.
- A seek releases all notes, resets the synth, and sends the chase: the program changes, bank
  select, data entry, RPN, NRPN, and CC 121 in their order, then the last value of each other
  controller, the pitch bend, and the channel pressure of each channel.
- The programs with a long sound are GM 16 to 23, 40 to 44, 48 to 54, 56 to 95, and 109 to
  111. A rhythm channel never starts held notes again. `sustainsAfterSeek()` in
  `score/program-map.ts` holds this program list, next to the program map. The block scheduler
  imports it, because both modules are pure.
- A held note that does not start again keeps its note off in the event list. The synth pairs
  note offs first in, first out, so the processor skips that note off. Else it would end a later
  note on the same key. The processor pairs each note off with its note on in the same way
  (`notePairs()` in `audio/block-scheduler.ts`). It keeps a flag for each note on that sounds,
  and it sends a note off only when the flag of its note on is set.

## 6.6 Mute and solo

- Mute and solo work for each seat, also when seats share a channel.
- The user can solo several seats at the same time.
- A seat sounds if it is not muted and one of these is true: no seat is soloed, or this seat is
  soloed.
- When a seat becomes silent, the processor sends note offs for its held notes at once.
- Each note event has the seat of its note (3.2). The processor skips the note on of a silent
  seat, and thus also its note off (6.5).
- When a seat becomes audible during play, its held notes start again by the rule of 6.5. A
  seat change while paused only sets the flag. The next play starts the held notes of the
  audible seats.
- When all seats with notes on a channel are silent, the processor also stops all notes of that
  channel. Thus a sustain pedal that is down does not keep the notes of a muted seat.
- When a seat becomes silent on a channel that has audible seats too, and the sustain pedal of
  the channel is down, the processor sends a pedal up after the note offs, then the old pedal
  value again. spessasynth_core only marks a voice as held at a note off while the pedal is
  down, and a pedal up releases each held voice of the channel. Thus the notes of the silent seat
  end. The notes of the audible seats that only the pedal holds also end at this time (review of
  step 5, P2).
- The synth ends the notes of a key oldest first. When an audible seat and a silent seat hold the
  same key of one channel, and the silent note is the newer one, the processor ends both notes
  and starts the audible note again. Such a case is rare, because a string ensemble divides by
  pitch (3.5).
- Mute and solo stay the same after a seek. They reset when a new file loads.
- The app sends a seat change to the `Player` only when the samples of the piece are ready.
  After the load of the samples, it sends each silent seat again, because a load resets the seat
  flags of the `Player` (6.8). The poses follow each change at once.
- `Player.setSeatAudible()` sends a `seat` command. The processor sets the flag in step 1 of the
  next block (6.4), in order with the transport commands. After all commands of the block, it
  makes one plan for the notes of all changed seats. Thus a solo takes about the time of one
  seat change. The plan reads the seats of each channel from a list that the engine makes for
  each score. At 60 % of the Boulanger demo, the block of a solo of one seat takes 0.52 ms and
  the block of its end 0.65 ms. With one plan for each seat command, they took 6.87 ms and
  7.01 ms (review of step 5, P1).
  `audio/seat-speed.test.ts` checks the ratio to one seat change. A flag that the `Player` sends
  before it posts the new score has no effect on the new score. A flag after the post applies to
  the new score, also before `load()` resolves (6.8).

### Speed of a mute

A user expects silence at once from the mute button of the bar (UX audit SD2). A seat mute
removes one voice of the orchestra, and the hall rings on, as in a real hall.
[`research/demo-loudness.md`](../research/demo-loudness.md) measures both.

```text
bar mute:   synth ── room ── hall ── limiter ── volume gain: 1 -> 0, time constant 30 ms
                                                   └─ dry sound and all tails stop together
seat mute:  note offs of the seat -> release of the voices -> room and hall ring on
```

- The mute button of the bar sets the volume gain of the output chain to 0 (6.8). The gain falls
  with the time constant 30 ms: by 20 dB in 69 ms and by 60 dB in 0.21 s. An unmute rises with
  the same curve, so it gives no click. Before this rule, the mute set the master gain of the
  synth, and the room and the hall rang on: the output of the Boulanger demo fell by 20 dB in
  0.57 s and by 40 dB in 1.37 s.
- A seat mute keeps the release of the voices of the seat, and the room and the hall ring on.
  For a seat that plays alone in the Boulanger demo, the voices fall by 20 dB in 0.16 s (flute,
  horn) to 0.37 s (cello). With the room and the hall, the output falls by 20 dB in 0.6 s to
  1.0 s. With the other seats audible, they cover this tail.
- The hall gets the full mix (6.1), so it cannot stop the tail of one seat alone. A shorter
  release of the voices of a muted seat needs the voice list of spessasynth_core, which is not
  in its public types, and it shortens only the first 0.2 s to 0.4 s of the tail.

## 6.7 Clock

`Player.now()` gives the song time of the sound that the listener hears now.

- The processor posts a `ClockAnchor` when a transport change takes effect, and one time each
  second.
- After a new score, the first block posts an anchor `{ songTime: 0, rate: 0 }` with the new
  load number. An anchor of the old score can arrive after the `Player` cleared its anchors,
  because the processor posts anchors until it gets the new score. The `Player` counts the
  scores that it sends to the engine, and it ignores each anchor with an older load number
  (`addScoreAnchor()` in `audio/clock.ts`). Thus `now()` gives 0 after a load until the new
  anchors arrive (review of step 1, F3).
- `now()` uses the anchor and `AudioContext.getOutputTimestamp()`. By the spec,
  `getOutputTimestamp().contextTime` is the frame that the output device plays now, so it already
  includes the output latency. Do not subtract the latency from this value again.
- The spike (9.5) compares this value with `currentTime - outputLatency` (or `baseLatency` if
  `outputLatency` is 0) in Chrome, Firefox, and Safari. If `getOutputTimestamp()` does not include
  the latency in a browser, the app uses the second value in that browser.
- The spike measured the two methods on 2026-10-04
  ([`research/audio-spike.md`](../research/audio-spike.md)). In Chrome 154, they agree within 2 ms.
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
- In the count-in of a play, the anchors carry song times below 0 or below the pause point, so
  `now()` runs from the start point minus the count-in (6.5). The pose reads these times
  (5.2, 5.4). Before the first anchor in the list, `now()` gives the song time of that anchor.
  It does not go back in time from it.
- The `WorkletPlayer` keeps the last rate, and sends it after each score. The volume is the gain
  "volume" of the output chain, so it stays the same over loads and failures, and a saved volume
  that the app sets before the first load takes effect.
- After the decode of a load, the `Player` posts the score, the rate, and the banks
  in one task. A play, a pause, a seek, or a seat flag before this task acts on the old score,
  and the new score resets the transport and the seat flags. At the first load, it has no
  effect. Such a command after this task acts on the new score, also before `load()` resolves.
  The app plays only after the load resolves (review of step 5, P3).
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
- The progress of a load (`LoadProgress` in `audio/player.ts`) counts the preset files that are
  ready (`done` of `total`) and the bytes that arrived (`bytes` of `totalBytes`). `total` and
  `totalBytes` hold only the presets that the synth does not have, and `totalBytes` is the sum
  of their sizes in `sf/index.json`. The first call comes with 0 when the list of the files is
  known. The decode Worker reads each file in chunks (`readWithProgress()` in
  `audio/read-progress.ts`) and reports the bytes at most every 100 ms, and at the end of each
  file (audit 2026-10-05-ux-design, LD2).
- The processor answers each `banks` message with one `ready` message, in order. The `Player`
  keeps a queue of the pending `ready` replies. Thus a load resolves only after its own banks are
  in the synth.

### Output chain

The `WorkletPlayer` sends the output of the synth through this chain (6.1, user decision of
2026-10-05). `createOutputChain()` of `audio/output-chain.ts` makes it in the constructor of
the `Player`, one time for the session.

```text
AudioWorkletNode (stereo)
       │
       v
GainNode "input": the headroom of the SoundFont (6.5 dB) plus the gain of the piece
       ├──────────────────────┐
       v                      v
GainNode "dry" (1)    ConvolverNode (hall impulse response, stereo, normalize off)
       │                      │
       │              GainNode "wet" (0.0625)
       v                      v
DynamicsCompressorNode "limiter" (-2 dBFS, knee 0, ratio 20, attack 2 ms, release 150 ms)
       │
GainNode "trim" (-1.14 dB)
       │
GainNode "volume": the volume slider and the mute button, time constant 30 ms
       │
context.destination
```

```typescript
interface PlayerScore extends Pick<Score, 'durationSec' | 'synthEvents' | 'presets'> {
  /** The pan and the reverb send of each synth channel, from `stageMix()` (6.1). */
  readonly mix: readonly ChannelMix[];
  /** The gain of the piece in dB, from `pieceGainDb()`. */
  readonly gainDb: number;
}
```

- **Mix.** The `Player` sends the events of `mixSynthEvents()` (6.1). The app keeps the mix of
  the layout with each piece, also for a file of the user, and passes it with the score. A
  change of the section size keeps the score and the mix that the `Player` holds (2.8). The
  piece gets the mix of the new layout, and the next load of its samples sends it. The spike
  page sends an empty mix (center pans, no reverb send) and the gain of its demo, because a
  layout would add the model code to a chunk of the first download (7.2).
- **Gain of the piece.** The `Player` sets the input gain with the score of each load, because
  the new score stops the old piece. The input gain is `SOUNDFONT_HEADROOM_DB` (6.5 dB, 6.2)
  plus the gain of the piece, so that a piece with the gain 0 dB has the loudness of GeneralUser
  GS. `pieceGainDb()` gives the gain that brings a demo to -18 LUFS (integrated, ITU-R
  BS.1770-4) at the output of the chain, after the limiter and its trim. `DEMO_LOUDNESS` of
  `audio/demo-loudness.ts` holds -18 LUFS minus this gain. For a demo that the limiter does not
  touch, this value is its loudness at 0 dB.
  [`research/demo-loudness.md`](../research/demo-loudness.md) measured each full demo with the code
  of `audio/output-chain.ts` in an `OfflineAudioContext` of headless Chromium. The gains are Boulanger +0.4 dB, Beethoven 9 -4.4 dB, Eine kleine
  Nachtmusik +11.1 dB, Bach +1.3 dB, Beethoven 8 +3.1 dB, and Mozart K. 315 +4.3 dB. With them,
  the six demos measure -18.05 to -17.97 LUFS. A file of the user and `perf-60.mid` get 0 dB,
  and the limiter catches the peaks. Eine kleine Nachtmusik is quiet (-29.1 LUFS at 0 dB),
  because four single players play it.
  The removed demos had Beethoven 5 -1.4 dB, Grieg +0.3 dB, and Mozart K. 488 +7.3 dB.
- **Hall.** The impulse response is `assets/hall/st-pauls-hall-c8m.wav` (6.2). The convolver
  does not normalize it, so the wet gain 0.0625 sets the level: the hall gives about 20 % of the
  output energy, and the room of the synth about 5 %.
- **Limiter.** A `DynamicsCompressorNode` adds a fixed makeup gain of `(1 / g)^0.6`, where `g`
  is the gain of its curve at 0 dBFS. Chromium gives +1.14 dB with these settings. The trim gain
  removes it, so the chain does not change the level below the threshold. In headless Chromium,
  the loudest part of the Boulanger demo reached -1.24 dBFS, with no sample at full scale. With
  the gains of each demo, the offline chain of `research/demo-loudness.md` gives these true peaks
  (4 times oversampling): Boulanger -1.03 dBTP, Beethoven 9 -1.87 dBTP, Eine kleine Nachtmusik
  -1.53 dBTP, Bach -1.78 dBTP, Beethoven 8 -1.69 dBTP, and Mozart K. 315 -1.53 dBTP.
- **Volume.** `setVolume()` moves the gain "volume" at the end of the chain with
  `setOutputVolume()`: `setTargetAtTime()` from the current context time, with the time
  constant `VOLUME_TIME_CONSTANT` (30 ms). The app gives it the square of the slider position,
  and 0 for the mute button (2.8). The volume comes after the limiter, so the limiter acts the
  same at each volume, and a mute also stops the tail of the hall (6.6).
- The start of the engine fetches and decodes the impulse response with `sf/index.json` and the
  worklet module (6.3). A failure is a failed start, so the next load tries again. After a
  failure of the engine, the new worklet node connects to the same chain, and the convolver
  keeps its impulse response.
- The chain comes after the processor host. A render ahead in a Worker
  (`research/webkit-audio.md` section 7) gives a stereo output too, and can connect to the same
  input.
- Cost: the convolver takes 73.8 µs of each block of 2.67 ms in an `OfflineAudioContext` of
  Google Chrome 154, and the limiter 5.6 µs.
