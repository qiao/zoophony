# WebKit audio: the cause of the slow blocks in Playwright WebKit

Date of the measurements: 2026-10-05.

The audio spike ([`audio-spike.md`](audio-spike.md), section 3.2) found about 200 slow blocks and
0.82 s of lost song time in one play of demo 1 in Playwright WebKit. This report finds the cause.
The scripts and the raw results are in [`scripts/webkit-audio/`](scripts/webkit-audio/). "Not
verified" marks a fact that no measurement confirms.

## 1. Result

The cause is outside our code. In WebKit, the AudioWorklet thread has no real-time priority.
The real-time render thread of WebKit waits for it in each block. On an idle Mac, the AudioWorklet
thread often starts or finishes late, and the render thread loses blocks.

- An `OscillatorNode` with no worklet lost 0 to 1 ms per 316 s. An empty worklet processor lost
  318 to 325 ms per 316 s.
- One busy process on another core removed the problem. The unchanged spike page then had 1 slow
  block and 1 ms of lost time, against 207 slow blocks and 799 ms with no load.
- The render cost of our code is small. JavaScriptCore renders a block of demo 1 in 0.049 ms
  (mean), which is 1.8 % of the block length.

No change to our code removes the lost time, so this report adds no fix. Section 6 gives the
reasons. Real Safari uses the same WebKit thread code, so it can have the same problem on an
idle Mac (not verified). Section 8 gives the check that the user must do.

## 2. Machine and versions

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, 64 GB, macOS 26.5 (25F71) |
| Audio output | MacBook Pro Speakers, 48 kHz |
| Playwright WebKit | 26.6, Playwright 1.63.0, build webkit-2359 |
| Chrome | 154.0.8037.95, through Playwright (`channel: 'chrome'`) |
| JavaScriptCore | The `jsc` shell of macOS (the framework of Safari 26.5), and the `jsc` shell of webkit-2359 |
| Node | 24.10.0 (V8) |
| Code | Commit `210517e`: the spike code, with no change |

Other programs ran on the Mac during the runs. The load average was 3 to 8 before each series.
Each series therefore puts the variants in turn, so that a change of the load affects all of
them.

## 3. Method

```text
prepare.ts ──> page/data/: demo 1 events and PCM SF2 banks
     │
     ├──> bench.ts in Node (node-main.ts) and in jsc (jsc-main.ts): offline render,
     │    performance.now() or preciseTime() around each block
     │
     └──> page/synth.html + synth-probe.js ──┐
          page/probe.html + probe-processor.js┤ run.mjs (Playwright, 60 s each,
                                              │ BUSY=n busy Node processes)
spike-full.mjs ──> the unchanged spike.html ──┘ results/*.jsonl, *.json
```

- **Probes.** `probe.html` runs an `OscillatorNode` with no worklet (`osc=1`), or a worklet that
  does a fixed loop of `iters` square roots in each block. `synth.html` runs `SynthEngine` in a
  worklet, with the effects on or off, or with linear interpolation. With `idle=9000`, the same
  worklet does a loop of about the cost of the synth in place of the synth.
- **Slow blocks.** The number of blocks with a work time above 2.67 ms, timed with `Date.now()` in
  the worklet, as in the spike. The mean of these times is also recorded. It has no bias, because
  the block starts fall at random points of each millisecond.
- **Gaps.** The time between two `process()` calls. At 48 kHz, a call is due every 2.67 ms.
- **Lost time.** The page reads `performance.now()` and `currentTime` each 200 ms. The slope of
  `currentTime` against the wall time gives the lost time, scaled to the 316 s of demo 1. A
  block that the render thread does not get from the worklet does not advance `currentTime`.
- **Quiet tone.** Each probe writes a tone at -80 dB. Chrome moves a silent context to a timer
  clock, and its `currentTime` then drifts with no underrun. A first series with silent probes
  (not in `results/`) showed up to 3.1 s of false lost time per 316 s in Chrome, with 0 underrun
  events.
- **Load.** `BUSY=1` starts one Node process with an endless loop for the time of the run.
- **Spike checks.** `spike-full.mjs` runs the full play and the first sound runs of
  [`scripts/spike/checks.mjs`](scripts/spike/checks.mjs) on the built spike page, with no change.

## 4. Hypotheses and measurements

Each row gives the prediction of the hypothesis and the measurement that tests it. "Slow" is
slow blocks in 60 s of play. "Lost" is ms per 316 s. Two values are two runs.

| # | Hypothesis | Prediction | Measurement | Verdict |
|---|---|---|---|---|
| 1 | Playwright WebKit is a slow or debug-like build, or its JIT is off | Its `jsc` is slower than the `jsc` of Safari, and the worklet runs at interpreter speed | Both `jsc` shells: mean 0.049 ms for each block. With no JIT: 1.70 ms. With no DFG: 0.72 ms. With no FTL: 0.078 ms. The worklet mean is 0.14 ms at idle and 0.064 ms with one busy process | Rejected. The JIT is on, and the build has the speed of Safari's engine |
| 2 | JavaScriptCore is slower than V8 for this code | The render in `jsc` is slower than in Node | `jsc` 0.049 ms, Node 0.077 ms (mean). Each run has 0 to 2 blocks above 2.67 ms, most at the first note | Rejected. JavaScriptCore is 1.6 times faster here |
| 3 | Reverb and chorus cost too much in WebKit | Effects off removes the slow blocks and the lost time | Effects off: slow 26/25 against 31/42. Lost 469/450 against 398/422 | Rejected as the cause. The effects cost 34 % of the render (0.049 to 0.032 ms in `jsc`), and the lost time stays |
| 4 | Hermite interpolation costs too much | Linear interpolation removes the slow blocks | Linear: slow 32/47, lost 524/535. `jsc`: 0.049 to 0.045 ms | Rejected |
| 5 | Too many voices, or the voice cap steals voices | Slow blocks at the peaks of the voice count | Demo 1 has at most 90 voices (mean 23.6). The cap is 350. A voice adds about 1 µs to a block | Rejected |
| 6 | GC pauses from allocation in the render path | Pauses of several ms during the render | `jsc --logGC`: three collections in the load, the render, and the exit together. The longest pause is 1.05 ms | Rejected. One pause of about 1 ms in 316 s cannot give 200 slow blocks |
| 7 | The event walk, the 1 s anchor posts, or the page updates | The synth probe, which posts no anchor and has no page updates, has fewer slow blocks than the spike page | Synth probe: 31 to 42 slow blocks in 60 s. Spike page: 207 in 316 s (39 in 60 s) | Rejected |
| 8 | A larger output buffer (`latencyHint`) absorbs the late blocks | `'playback'` gives a larger `baseLatency` and no lost time | `baseLatency` is 2.67 ms for `'interactive'`, `'balanced'`, `'playback'`, and `0.05`. Lost 519, 425, and 560 with the last three | Rejected. WebKit ignores the hint |
| 9 | The render quantum or the sample rate | A resampler or a quantum other than 128 frames | The context runs at 48 kHz, the rate of the device. `baseLatency` is one quantum of 128 frames | Rejected. The same values give no loss with an `OscillatorNode` |
| 10 | WebKit loses blocks between its real-time render thread and the AudioWorklet thread | A worklet with no work loses time, and native nodes do not. More CPU speed or a faster wake-up removes the loss | `osc=1`: lost 1/1. Empty worklet: lost 325/318, gaps up to 12 ms. One busy process: lost 0 and gaps of at most 4 ms for all probes | Confirmed |

### 4.1 The threads of WebKit

The WebContent process of Playwright WebKit has two audio threads (`results/threads.txt`, from
`ps -M` and `sample` during play):

```text
GPU process (audio device)
   │ IPC semaphore, each 128 frames
   v
+-------------------------------------------+       +----------------------------------+
| RemoteAudioDestinationProxy render thread |       | WebCore: AudioWorklet            |
| real-time, priority 97                    | task  | timeshare, priority 46           |
| SharedAudioDestination::sharedRender() ───┼──────>| AudioWorkletProcessor.process()  |
| waits on a BinarySemaphore                |<──────┼── our SynthProcessor             |
+-------------------------------------------+ signal+----------------------------------+
```

- The WebKit source agrees. `AudioWorkletThread::createThread()` makes the thread with
  `Thread::QOS::UserInteractive` for a real-time context
  ([AudioWorkletThread.cpp L70-78](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/webaudio/AudioWorkletThread.cpp#L70-L78)).
  `SharedAudioDestination::sharedRender()` sends each block to that thread and waits for a
  semaphore
  ([SharedAudioDestination.cpp L314-332](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/SharedAudioDestination.cpp#L314-L332)).
  The render thread is real-time
  ([RemoteAudioDestinationProxy.cpp L107-109](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/GPU/media/RemoteAudioDestinationProxy.cpp#L107-L109)).
- In the sample of webkit-2359, the render thread waits with `BinarySemaphore::waitUntil()`, a
  wait with a time limit. The main branch has `wait()` with no limit. The version in Safari 26.5
  is not verified.
- A `UserInteractive` thread has no time constraint. macOS can run it late or on a slow core.

### 4.2 The effect of one busy process

| Probe (Playwright WebKit, 60 s) | No load: slow | No load: lost | No load: max gap | One busy process: slow | One busy process: lost | One busy process: max gap |
|---|---|---|---|---|---|---|
| `OscillatorNode`, no worklet | no worklet | 1, 1 | no worklet | no worklet | 1 | no worklet |
| Empty worklet | 6, 4 | 325, 318 | 12, 10 ms | 0 | 0 | 3 ms |
| Busy loop of 0.10 ms | 16, 17 | 456, 355 | 12, 10 ms | 0 | -2 | 3 ms |
| Synth | 31, 42 | 398, 422 | 13, 13 ms | 1 | 0 | 4 ms |
| Synth, effects off | 26, 25 | 469, 450 | 11, 11 ms | 1 | 0 | 3 ms |
| Synth, linear interpolation | 32, 47 | 524, 535 | 11, 10 ms | 1 | -2 | 3 ms |

- The mean work time of the synth in the worklet is 0.14 ms with no load and 0.064 ms with one
  busy process. The same code takes 0.049 ms in a `jsc` loop that runs all the time.
- Chrome, the same probes: the synth had 2 slow blocks with no load and 1 with one busy process,
  0 lost time, and 0 underrun events (`playbackStats`). The mean work time of the synth was
  0.148 ms with no load and 0.054 ms with one busy process. Thus Chrome also runs the worklet
  slower on an idle Mac, but its worklet thread meets the deadline.
- Inference (not verified): on an idle Mac, the scheduler of macOS keeps the cores at a low clock
  or lets them sleep between the short tasks of the AudioWorklet thread. The thread then wakes
  late and runs slowly. A busy process keeps a cluster of cores awake and fast. A real-time
  thread gets its time with no such delay.

## 5. The spike checks before and after

"Before" is the spike report. "Now" is the same code on 2026-10-05. Chrome and Firefox have no new
full play, because this report changes no code (section 6).

| Value | Playwright WebKit, spike | Playwright WebKit, now, no load | Playwright WebKit, now, one busy process | Chrome 154, spike | Firefox 150, spike |
|---|---|---|---|---|---|
| Slow blocks, full play | 200 | 207 | 1 (at the first note) | 1 | 4 |
| Longest block | 8 ms | 13 ms | 4 ms | 4 ms | 4 ms |
| Lost time, full play | 0.82 s (slope 0.9974) | 0.80 s (slope 0.99748) | 0.001 s (slope 0.999997) | 0 (slope 1.0000045) | 0 (slope 1.0000037) |
| Slow blocks in the first 2 s, 5 runs | 2, 3, 3, 2, 2 | 5, 1, 3, 5, 1 | 1, 1, 1, 1, 1 | 1 in each run | 0 or 1 |
| First sound, median (max) | 172 ms (173), latency method | 171 ms (172) | 173 ms (173) | 271 ms (287) | 225 ms (227) |
| Load, median | 486 ms | 484 ms | 483 ms | 583 ms (server limit) | 572 ms |

Correction (2026-10-05): the 10 Chrome first sound values of the spike
(`scripts/spike/results/chrome-cdp-runs.json` and `chrome-server-runs.json`) have a median of
273.8 ms. This table and section 6 give the wrong median of 271 ms. The max of 287 ms is correct.

The first sound of Playwright WebKit uses the latency method of design 6.7, as in the spike. The
context of Playwright WebKit starts in the "running" state, so this value has no context start.

## 6. Fixes

This report makes no change to the app code, for these reasons:

- **Render cost.** The block work is already 0.049 ms in JavaScriptCore. An empty worklet loses
  318 to 325 ms per 316 s, so no cut of the work can remove the loss.
- **Effects.** Effects off cuts the work by 34 % and the slow blocks by about 30 %. The lost time
  stays at 450 to 469 ms. The listener would lose the reverb and the chorus. In demo 1, which has
  no CC 91 or CC 93, the effects make a part of the sound 28.6 dB below the full sound
  (`results/effects-diff.txt`). A file that sets CC 91 gets much more reverb. The design keeps
  the effects (6.1).
- **`latencyHint`.** WebKit ignores it (hypothesis 8). A change would only add latency in Chrome
  and push its first sound (median 271 ms) nearer to the 300 ms target. The `Player` keeps
  `'interactive'`.
- **GC.** The render path makes about one collection in 316 s, with a pause of about 1 ms. A test
  that pins no allocation would add code with no measured effect.
- **Thread priority.** A page cannot change the priority of a WebKit thread.

No design value changes. Design 6.4 now states the WebKit fact, with a link to this report.

## 7. What is left

- Playwright WebKit on an idle Mac loses about 0.8 s over demo 1. Each lost block is probably
  an audible dropout. With any other load on the Mac, it plays with no loss.
- An app-side way around it exists, but it changes the design of 6.4. A Worker can render the
  synth ahead into `AudioBuffer` chunks, and `AudioBufferSourceNode`s can play them. Native nodes
  run on the real-time render thread (the `OscillatorNode` probe lost no time). The cost: a seek,
  a mute, or a pause then takes effect after the chunks that are already queued, which is the
  problem that design 6.1 rejects for spessasynth_lib. This is a decision for the user, and only
  if real Safari has the problem.

## 8. Deferred to the user

Real Safari needs a check by a person. Run section 7 of the spike report two times:

1. On an idle Mac: close other apps and wait until Activity Monitor shows a CPU load of less than
   10 %. Then play demo 1 to the end.
2. With a load: run `yes > /dev/null` in a terminal, play demo 1 to the end, then stop `yes` with
   Ctrl+C.

If run 1 shows many slow blocks or a song time that falls behind, and run 2 does not, Safari has
the problem of this report. Then decide about section 7. If both runs are clean, the problem is
only in Playwright WebKit. Listen in run 1 as well: a dropout is a short click or gap in the
sound.

Note of 2026-10-06: Safari 26 moved the setting for remote automation. Do these steps one time
before a WebDriver check of Safari:

1. In Safari > Settings > Advanced, select "Show features for web developers".
2. In Safari > Settings > Developer, select "Allow remote automation".
3. In a terminal, run `sudo safaridriver --enable`.

## 9. Limits of the method

- Playwright WebKit is a WebKit build of Playwright. Real Safari can differ in its process
  priorities and in the version of `SharedAudioDestination` (section 4.1).
- Nobody listened to the output. The lost time comes from `currentTime`. The link between a lost
  block and an audible dropout is an inference.
- `Date.now()` in the worklet has steps of 1 ms. The slow block counts are thus counts of blocks of
  3 ms or more, as in the spike.
- Other programs ran on the Mac. The variants of each series ran in turn to share the changes of
  the load, but two runs of the same variant can differ by 100 ms of lost time.
- The busy process proves that a load removes the loss. It does not show which part of the
  scheduler of macOS causes the delay (section 4.2, inference).

## 10. Scripts and results

| File | Purpose |
|---|---|
| `scripts/webkit-audio/prepare.ts` | Writes the events and the banks of demo 1 into `page/data/` |
| `scripts/webkit-audio/bench.ts`, `node-main.ts`, `jsc-main.ts`, `jsc-polyfill.ts` | Offline render times in Node and in `jsc` |
| `scripts/webkit-audio/vite.jsc.config.mjs` | Bundles `jsc-main.ts` into `out/jsc-bench.js` |
| `scripts/webkit-audio/voices.ts` | Block times by voice count, effects on and off |
| `scripts/webkit-audio/effects-diff.ts` | The part of the sound of demo 1 that the effects make |
| `scripts/webkit-audio/page/` | The probe pages and the probe processor |
| `scripts/webkit-audio/synth-probe.ts`, `vite.probe.config.mjs` | The synth probe processor and its bundle |
| `scripts/webkit-audio/serve.mjs`, `run.mjs` | The server of `page/` (port 4192) and the probe runner |
| `scripts/webkit-audio/spike-full.mjs` | The spike checks in Playwright WebKit, with `BUSY=n` |
| `scripts/webkit-audio/results/` | `probes.jsonl`, `bench.txt`, `gc.txt`, `voices.txt`, `effects-diff.txt`, `threads.txt`, `spike-*.json` |

Commands, from the repository root:

```bash
node docs/research/scripts/webkit-audio/prepare.ts
pnpm exec vite build -c docs/research/scripts/webkit-audio/vite.probe.config.mjs
pnpm exec vite build -c docs/research/scripts/webkit-audio/vite.jsc.config.mjs
cd docs/research/scripts/webkit-audio
/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc \
  out/jsc-bench.js -- page/data '{"label":"jsc"}' 2
node node-main.ts '{"label":"node"}' 2
node voices.ts
node serve.mjs &
OUT=results/probes.jsonl BUSY=0 node run.mjs webkit 60 osc=1 iters=0 synth: synth:effects=0
OUT=results/probes.jsonl BUSY=1 node run.mjs webkit 60 osc=1 iters=0 synth: synth:effects=0
cd ../../../.. && pnpm build
node docs/research/scripts/spike/serve.mjs --port 4181 --mbps 50 --latency-ms 20 &
BUSY=0 node docs/research/scripts/webkit-audio/spike-full.mjs full
BUSY=1 node docs/research/scripts/webkit-audio/spike-full.mjs full
```
