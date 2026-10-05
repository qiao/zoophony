# Audio spike: checks and targets of step 1

Date of the measurements: 2026-10-04 and 2026-10-05.

This report gives the result of each check of design 9.5, step 1, and of each step 1 target of
design 9.7. The scripts and the raw results are in [`scripts/spike/`](scripts/spike/). "Not
verified" marks a fact that no measurement confirms.

## 1. Machine and browsers

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, 64 GB, macOS 26.5 (25F71) |
| Audio output | MacBook Pro Speakers (built-in), 48 kHz, the system default device |
| Chrome | Google Chrome 154.0.8037.95, the installed app, headed |
| Firefox | Mozilla Firefox 150.0, the installed app, headed, through geckodriver 0.37.1 |
| Safari | Safari 26.5 (21624.2.5.11.4). Not measured: see section 7 |
| Extra data point | Playwright WebKit 26.6 (Playwright 1.63.0, build webkit-2359). This is **not Safari** |
| Engine | The build of commit `4323e43` for all Chrome runs and the Firefox load runs. The code of `590f20e` for the Firefox full play and Playwright WebKit. The only change between them is the clock fix of section 5, which does not change the load and first sound values |

## 2. Method

The scripts open `spike.html` from `dist/`, wait for the state "ready", click Play as a user
gesture, and read the values of `window.spike` (`src/spike/main.ts`). They do not change app code.

```text
+------------------+   DevTools protocol   +---------------------------------+
| chrome.mjs       |---------------------->| Google Chrome 154 (temp profile)|
+------------------+                       +---------------------------------+
+------------------+   W3C WebDriver       +---------------------------------+
| webdriver.mjs    |---------------------->| geckodriver -> Firefox 150      |
+------------------+                       +---------------------------------+
+------------------+   Playwright          +---------------------------------+
| webkit.mjs       |---------------------->| Playwright WebKit 26.6 (extra)  |
+------------------+                       +---------------------------------+
         │ checks.mjs: the same steps for each browser                │ HTTP
         v                                                            v
   results/*.json                         serve.mjs: dist/, no cache, optional
                                          50 Mbit/s limit and 20 ms latency
```

- **Load runs.** Five runs for each browser. Each run starts a fresh profile, loads the page,
  records `loadMs`, clicks Play, and records the first sound time and the render statistics of
  the first 2 s. `loadMs` is the time of `Player.load()`: the worklet and Worker scripts, the
  preset index, the 10 preset files of demo 1 (1,391,312 bytes), the decode, and the bank add.
- **Network limit.** Chrome: the DevTools command `Network.emulateNetworkConditions` (50 Mbit/s,
  20 ms latency) on the page and on the decode Worker target, with the cache off. All browsers:
  `serve.mjs --mbps 50 --latency-ms 20`, one token bucket for all responses, `no-store`. A test
  run at 1 Mbit/s took 13.2 s, which shows that the limit reaches the fetches of the Worker.
- **Full play.** One play of demo 1 to the end (316.56 s) in each browser. The script reads the
  values each second. From 60 s to about 81 s after the click, the page is hidden.
- **Hidden page.** Chrome: a new tab in front of the page in the same window. Firefox: a
  minimized window, because a WebDriver switch back to the page makes its tab active, and the
  script must read the page while it is hidden. Playwright WebKit: a second page in front, but
  Playwright keeps the page "visible", so this check has no WebKit result. The script records
  `document.visibilityState`.
- **Dropout signals.** The processor counts the blocks with a render time above the block length
  (2.67 ms), and keeps the longest render time. Chrome also gives `AudioContext.playbackStats`
  (shipped in Chrome 146), which counts the underrun events of the output device. The script
  also fits the song time against `performance.now()`. A dropout that stops the context clock
  makes the slope less than 1.
- **Clock.** Each sample holds the two heard context times of design 6.7, taken in the same
  task: `heardTime()` (`getOutputTimestamp()`) and `latencyHeardTime()`
  (`currentTime - outputLatency`). `clockDiffMs` is the first minus the second.
- **Node part.** `block-times.ts` renders demo 1 offline with `SynthEngine` and times each block
  with `performance.now()`. `src/audio/clock-render.test.ts` is the Node part of the clock target.

The first note of demo 1 is at song time 0.156 s. Thus each first sound time includes a rest of
156 ms at the start of the file.

## 3. Checks of design 9.5, step 1

| Check | Chrome 154 | Firefox 150 | Safari 26.5 | Playwright WebKit (extra) |
|---|---|---|---|---|
| Vite bundles the worklet and the Worker | Pass | Pass | Blocked | Pass |
| No dropout at the first note of a sample after the Worker decode | Pass with a limit: 1 slow block (3 to 7 ms) in each run, 0 underruns | Pass with a limit: 0 or 1 slow block (at most 3 ms), no glitch API | Blocked | 2 or 3 slow blocks (4 to 8 ms) in each run |
| Plays demo 1 to the end with no dropout | Pass with a limit: 1 slow block, 0 underruns | Pass with a limit: 4 slow blocks (at most 4 ms) | Blocked | Probable dropouts: 200 slow blocks, 0.82 s lost |
| Clock (6.7) | Timestamp includes the latency. Keep `getOutputTimestamp()` | Timestamp has no latency. Use `currentTime - outputLatency` (fixed) | Blocked | Timestamp has no latency. The new rule uses the latency method |
| A suspended AudioContext delivers messages to the worklet | Yes: 11 of 11 loads end in "ready" with the context suspended | Yes: 6 of 6 | Blocked | Not tested: the context starts running |
| Hidden page | Pass: 21.1 s hidden, song time error +12 ms, 0 slow blocks | Pass: 22.3 s hidden (minimized), error -19 ms, 0 slow blocks | Blocked | Not tested: the page stays "visible" |

### 3.1 Bundle

`pnpm build` writes `dist/assets/processor-*.js` (345,910 bytes) and
`dist/assets/decode-worker-*.js` (207,208 bytes). All runs loaded both files and reported 0
errors (`window.spike.errors`). The only console error is a 404 for `/favicon.ico`, which the
spike page does not have.

### 3.2 Dropouts

| Value | Chrome 154 | Firefox 150 | Playwright WebKit (extra) |
|---|---|---|---|
| Blocks of the full play | 118,500 | 118,500 | 118,500 |
| Slow blocks, full play | 1 (at song time 0 to 2 s) | 4 (0 to 2 s and 11 to 12 s) | 200 (all through the song) |
| Longest block, full play | 4 ms | 4 ms | 8 ms |
| Underrun events (`playbackStats`) | 0 | no API | no API |
| Slope of song time against wall time | 1.0000045 | 1.0000037 | 0.9974 |
| Slow blocks in the first 2 s of each load run | 1, 1, 1, 1, 1 and 1, 1, 1, 1, 1 | 1, 1, 0, 0, 1 | 2, 3, 3, 2, 2 |
| Underrun events in the first 2 s of each load run | 0 in all 10 runs | no API | no API |

- An earlier Chrome full play with Playwright, with the page visible all through the song, gave
  the same result: 1 slow block, longest block 5 ms, and 0 underruns over 318.7 s of output.
- In the Chrome full play of the table, `playbackStats.totalDuration` is 298.7 s for about
  319 s of play. The difference is about the 21 s of the hidden tab. Thus Chrome probably does
  not update the playback statistics of a hidden page (not verified).
- The slow block at the first notes comes from the first run of the voice code. In Node, the
  first engine has a block of 3.24 ms at the first note (0.15 s) and one of 5.58 ms at 67.78 s.
  A second engine in the same process, with new banks, has no block above 2.67 ms (longest
  2.28 ms, median 0.074 ms). Thus the cost is the warm-up of the JavaScript code. The PCM banks
  need no Ogg decode, and the new samples of the second engine add no slow block.
- Chrome probably renders two blocks for each 256-frame callback of the device (`baseLatency`
  5.33 ms, inference). One block of 3 to 7 ms can thus finish in time, and `playbackStats` shows
  no underrun.
- In Playwright WebKit, the song time lost 0.82 s over 316 s against the wall time, with 200
  slow blocks. A context clock that stops at each underrun gives this result. Thus Playwright
  WebKit probably has audible dropouts. Real Safari can be different.

### 3.3 Clock (design 6.7)

| Value (full play, n = samples) | Chrome 154 (n = 314) | Firefox 150 (n = 309) | Playwright WebKit (n = 314) |
|---|---|---|---|
| `outputLatency` | 32.0 ms (24 ms in one sample) | 22.71 ms | 15.83 ms |
| `baseLatency` | 5.33 ms | 0 | 2.67 ms |
| `clockDiffMs` mean | +1.76 ms | +22.71 ms | +17.05 ms |
| `clockDiffMs` standard deviation | 1.64 ms | 0.00 ms | 0.92 ms |
| `clockDiffMs` min to max | -8.83 to +4.38 ms | +22.71 to +22.71 ms | +15.83 to +22.83 ms |
| `now()` minus the latency method, after the fix | not changed: +1.75 ms | 0.00 ms | -0.03 ms |
| Decision of 6.7 | Keep `getOutputTimestamp()` | Use `currentTime - outputLatency` | Not a decision: not Safari |

- In Chrome, the two methods agree within 2 ms (mean). Thus `getOutputTimestamp()` includes the
  output latency, as the spec says.
- In Firefox, the timestamp method is later by exactly `outputLatency`. The Gecko source
  ([AudioContext.cpp L581-601](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/webaudio/AudioContext.cpp#L581-L601))
  sets `contextTime` to `currentTime - outputLatency` and `performanceTime` to
  `performance.now() - outputLatency`. The extrapolation to now therefore gives `currentTime`,
  and the latency is lost. `now()` was 22.7 ms late in Firefox, which fails the clock target of
  20 ms.
- Fix: commit `590f20e`. `chooseHeardTime()` in `src/audio/clock.ts` uses the latency method
  when the timestamp method is later than it by more than half of the output latency. Design
  6.7, 6.8, and 10 record the rule. After the fix, `now()` equals the latency method in Firefox
  (0.00 ms) and equals the timestamp method in Chrome (mean -0.01 ms).
- Playwright WebKit shows the same pattern as Firefox, and the rule applies there. The WebKit
  source ([AudioContext.cpp L220-234](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/webaudio/AudioContext.cpp#L220-L234))
  reads the position from the output device, so real Safari can be different (not verified).

### 3.4 Suspended context

The scripts read the context state when the page shows "ready". In Chrome and Firefox, the state
was "suspended" in each load run and in each full play. "Ready" comes from the `ready` reply of
the processor after it adds the banks. Thus the port of a suspended `AudioWorkletNode` delivers
the score and the banks, and the processor replies. The banks do not need to wait for the first
click.

Chrome starts an AudioContext with no gesture when it runs with `--enable-automation`, and a
Playwright `page.evaluate()` counts as a user gesture. `chrome.mjs` therefore uses the DevTools
protocol with no library and with no gesture in its evaluations. Playwright WebKit started each
context in the "running" state, so it cannot show this check.

### 3.5 Hidden page

| Value | Chrome 154 (background tab) | Firefox 150 (minimized window) |
|---|---|---|
| `visibilityState` while hidden | hidden | hidden |
| Hidden time (wall) | 21.088 s | 22.302 s |
| Song time advance | 21.100 s | 22.283 s |
| Error | +12 ms | -19 ms |
| Slow blocks while hidden | 0 | 0 |

The page updates `window.spike` each 50 ms, so an error of up to 50 ms is the resolution of the
method. The song time also followed the wall time over the full play (residual standard deviation
14 ms in Chrome and 17 ms in Firefox).

## 4. Targets of design 9.7, step 1

| Target | Value | Chrome 154 | Firefox 150 | Playwright WebKit (extra) |
|---|---|---|---|---|
| Clock, Node part | each note on within one block (2.7 ms) | Pass: `clock-render.test.ts`, 0 to 127 frames early at rates 0.5, 1, and 1.5, and after a seek | same | same |
| Clock, browser part | `now()` within 20 ms of the heard time | Pass: methods agree, mean 1.76 ms, max 8.83 ms | Fail before `590f20e` (22.7 ms). Pass after it (0.00 ms) | 0.03 ms after the fix |
| Load (DevTools throttle) | at most 2 s at 50 Mbit/s | Pass: median 481 ms, max 516 ms (5 runs) | no DevTools throttle | no DevTools throttle |
| Load (server limit) | at most 2 s at 50 Mbit/s | Pass: median 583 ms, max 613 ms (5 runs) | Pass: median 572 ms, max 578 ms (5 runs) | median 486 ms, max 490 ms |
| First sound | at most 300 ms from the click | Pass: median 271 ms, max 287 ms (10 runs) | Pass: median 225 ms, max 227 ms (5 runs) | median 172 ms, max 173 ms (context already running) |

- First sound uses the clock method that is correct for each browser (section 3.3): the timestamp
  method in Chrome, and the latency method in Firefox and Playwright WebKit. The timestamp method
  gives 203 ms (median) in Firefox, which is 23 ms too early.
- Each first sound time includes the rest of 156 ms at the start of demo 1 and the output latency
  (32 ms in Chrome, 23 ms in Firefox). In Chrome, the rest of the time (about 83 to 99 ms) is the
  start of the audio output after `resume()` and the play command. Each Chrome run started a new
  browser process. In an earlier run with Playwright, one browser process served all runs, and
  the first sound was 214 ms (median) and 229 ms (max).
- The Chrome margin is 13 ms. A demo with a longer rest before its first note can fail this
  target as it is defined now.

## 5. Bug that the spike found

| Bug | Commit | Test |
|---|---|---|
| `now()` was 22.7 ms late in Firefox, because the Gecko timestamp has no output latency | `590f20e` `fix(audio): use the latency clock when the timestamp has no latency` | `chooseHeardTime` in `src/audio/clock.test.ts` (fails with the rule removed) |

## 6. Limits of the method

- Nobody listened to the output. The dropout result comes from three indirect signals: the render
  time of each block, the Chrome underrun count, and the slope of the song time.
- The worklet has no `performance` in Chrome, Firefox, or Playwright WebKit. The processor thus
  times each block with `Date.now()`, which has steps of 1 ms. A block of 2.7 to 3 ms can count as
  fast, and a fast block can count as 1 ms longer.
- A slow block is not always a dropout. The device callback holds two or more blocks, so one slow
  block can finish in time.
- `playbackStats` exists only in Chrome. Its values update once each second, and it probably stops
  while the page is hidden. Firefox has no glitch API, so the Firefox result rests only on the
  render times and the slope.
- The clock check compares two values that the browser reports. It does not measure the acoustic
  time. If a browser reports a wrong `outputLatency`, both methods are wrong. A loopback recording
  (output to input) can measure the true latency (not done).
- `window.spike` updates each 50 ms. A comparison of song time with wall time thus has a
  resolution of about 50 ms.
- The network limit runs on localhost: no TLS, no HTTP/2, no gzip, and no packet loss. `loadMs`
  also includes the worklet and Worker scripts (553 KB), so it is larger than the preset load
  alone.
- The hidden check in Firefox minimizes the window. A background tab can behave differently.
- Each check ran on the built-in speakers only. Bluetooth output was not tested.

## 7. Deferred to the user

Safari could not run. `safaridriver` refuses a session until a person runs
`sudo safaridriver --enable` and turns on Develop > Allow Remote Automation. No Safari result in
this report is a guess: each Safari cell says "Blocked".

To check Safari by hand, run from the repository root:

```bash
pnpm build && node docs/research/scripts/spike/serve.mjs --mbps 50 --latency-ms 20
```

Then follow this instruction: open `http://localhost:4180/spike.html?report=1` in Safari, wait for
the state "ready", click Play, after about 60 s show another tab for 20 s, come back, and wait
until the song time is 316.6 s (about 5.5 min). Then run
`node docs/research/scripts/spike/summarize-report.mjs`. It writes
`scripts/spike/results/report-summary.json` with the same values as the tables above.

To repeat the first sound and load values, reload the page and click Play four more times. Each
page load is one session in the summary.

When Safari automation is on, this runs the same checks with no person:

```bash
node docs/research/scripts/spike/serve.mjs --port 4181 --mbps 50 --latency-ms 20 &
node docs/research/scripts/spike/webdriver.mjs safari runs
node docs/research/scripts/spike/webdriver.mjs safari full
```

## 8. Follow-ups for later steps

1. **Safari** (step 1): run section 7. If Safari shows the dropouts of Playwright WebKit,
   measure the render cost in Safari and try a larger output buffer
   (`latencyHint: 'playback'`) before step 2.
2. **Warm-up** (step 2 or later): render a few silent notes of each preset while the context is
   suspended. The first notes then do not run cold code. This removes the slow block at the first
   notes in Chrome and Firefox.
3. **Smooth `now()` in Firefox** (step 3): the latency method follows `currentTime`, which moves
   in steps. The step size in Firefox is not verified. The bow sync of step 3 can need a smoothed
   value.
4. **First sound definition** (design 9.7): the target counts the rest before the first note of
   the file. Consider a target from the click to the heard song time 0.
5. **Glitch signal in the app**: `AudioContext.playbackStats` gives underruns in Chrome. A later
   step can use it in the manual release test (9.4).

## 9. Scripts and results

| File | Purpose |
|---|---|
| `scripts/spike/serve.mjs` | Serves `dist/` with no cache, an optional speed limit, and the report mode for Safari |
| `scripts/spike/checks.mjs` | The steps of each check, and the summaries |
| `scripts/spike/chrome.mjs` | Chrome over the DevTools protocol |
| `scripts/spike/webdriver.mjs` | Firefox and Safari over W3C WebDriver |
| `scripts/spike/webkit.mjs` | Playwright WebKit (extra data point) |
| `scripts/spike/summarize-report.mjs` | Summary of the report mode (Safari by hand) |
| `scripts/spike/block-times.ts` | Node: the time of each block of demo 1 |
| `scripts/spike/results/*.json` | The raw results of the runs in this report |

Commands for Chrome and Firefox (after `pnpm build`):

```bash
node docs/research/scripts/spike/serve.mjs --port 4180 &
node docs/research/scripts/spike/serve.mjs --port 4181 --mbps 50 --latency-ms 20 &
node docs/research/scripts/spike/chrome.mjs cdp-runs
node docs/research/scripts/spike/chrome.mjs server-runs http://localhost:4181
node docs/research/scripts/spike/chrome.mjs full
GECKODRIVER=/path/to/geckodriver node docs/research/scripts/spike/webdriver.mjs firefox runs
GECKODRIVER=/path/to/geckodriver node docs/research/scripts/spike/webdriver.mjs firefox full
node docs/research/scripts/spike/webkit.mjs runs
node docs/research/scripts/spike/webkit.mjs full
node docs/research/scripts/spike/block-times.ts
```
