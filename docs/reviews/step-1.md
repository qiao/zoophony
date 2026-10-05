# Review of step 1: audio spike

Date: 2026-10-05. Reviewer: the independent review agent of design 9.8. The reviewer did not do
the work of this step.

Scope: the commits `a92e33c` to `2960e70` (`git log 157d0e1..HEAD`), the spike report
[`../research/audio-spike.md`](../research/audio-spike.md), the WebKit report
[`../research/webkit-audio.md`](../research/webkit-audio.md), and their raw results.

## 1. Verdict

**APPROVED WITH CONDITIONS.**

Step 2 can start now. No finding blocks step 2. Step 1 is not done by the letter of design 9.5,
because the Safari part of its "Done when" is open. Section 6 gives the conditions.

## 2. Check results

### 2.1 Commands

All commands ran on the development Mac at commit `2960e70`, from a clean working tree.

| Command | Result |
|---|---|
| `pnpm install` | Pass |
| `pnpm lint` | Pass, 0 warnings |
| `pnpm typecheck` | Pass |
| `pnpm test` | Pass: 11 files, 79 tests |
| `pnpm format:check` | Pass: 36 files |
| `pnpm build` | Pass: 274 preset files (35,923,610 B), the license file, `processor-*.js` 345,910 B, `decode-worker-*.js` 207,208 B |
| `pnpm size` | Pass: 14,699 B of 1,000,000 B |

The reviewer also ran `tsc`, `oxlint`, `vitest`, and the oxfmt check on each of the 35 commits
of the step. Section 2.6 gives the result.

### 2.2 Step 1 checks of design 9.5

| Check | Chrome 154 | Firefox 150 | Safari 26.5 | Reviewer verdict |
|---|---|---|---|---|
| Vite bundles the worklet and the Worker | Pass | Pass | Blocked | Pass. The reviewer saw both files in `dist/assets/` and loaded them in headless Chromium |
| No dropout at the first note after the Worker decode | Pass with a limit | Pass with a limit | Blocked | Accepted. 1 slow block of 3 to 7 ms, 0 underrun events in 10 Chrome runs |
| Plays demo 1 to the end with no dropout | Pass with a limit | Pass with a limit | Blocked | Accepted for Chrome and Firefox. Open for Safari |
| Clock (6.7) | Pass | Pass after `590f20e` | Blocked | Pass. The raw data agrees with the report |
| A suspended context delivers messages to the worklet | Yes, 11 of 11 | Yes, 6 of 6 | Blocked | Pass |
| Hidden page | Pass | Pass | Blocked | Pass |

### 2.3 Step 1 targets of design 9.7

| Target | Value | Measured | Verdict |
|---|---|---|---|
| Clock, Node part | each note on within one block | `clock-render.test.ts` passes. The reviewer broke the rule, and the tests failed (section 2.5) | Pass |
| Clock, browser part | `now()` within 20 ms | Chrome: mean 1.76 ms, worst sample 8.83 ms. Firefox: 0.00 ms after the fix | Pass |
| Load | at most 2 s at 50 Mbit/s | Chrome median 481 ms (DevTools), 583 ms (server limit). Firefox median 572 ms | Pass |
| First sound | at most 300 ms | Chrome max 287 ms, median 273.8 ms (finding F9). Firefox max 227 ms | Pass, with a Chrome margin of 13 ms |

### 2.4 Report claims against the raw results

The reviewer read each file of `docs/research/scripts/spike/results/` and
`docs/research/scripts/webkit-audio/results/`, and compared the values with the tables of the two
reports. These values agree:

- Chrome full play: 118,500 blocks, 1 slow block, longest 4 ms, slope 1.0000045, `clockDiffMs`
  mean 1.755 ms (SD 1.64, -8.83 to +4.38), hidden 21.088 s against 21.100 s, 0 underrun events.
- Firefox full play: 4 slow blocks, slope 1.0000037, `clockDiffMs` 22.708 ms, `now()` minus the
  latency method 0 ms, hidden 22.302 s against 22.283 s.
- Playwright WebKit full play: 200 slow blocks, longest 8 ms, slope 0.99740. The lost time is
  (1 - 0.99740) × 316.56 s = 0.82 s.
- Load runs: Chrome medians 480.9 ms and 583 ms, Firefox 572 ms, WebKit 486 ms. All context
  states at "ready" are "suspended" in Chrome and Firefox.
- WebKit probes (`probes.jsonl`): the oscillator loses 1 ms, the empty worklet loses 325 and
  318 ms, and each probe with one busy process loses -2 to 0 ms. The `jsc` means are 0.049 ms.
- The second WebKit series: 207 slow blocks and slope 0.99748 with no load, 1 slow block and
  slope 0.999997 with one busy process.

One value does not agree (F9). One claim has no raw result (F12).

### 2.5 Tests that fail without their rule

The reviewer broke each rule below in a temporary worktree and ran the tests.

| Change to the code | Tests that failed |
|---|---|
| `planBlock` sends an event one block late | 3 `planBlock` tests, and `clock-render` at rate 1.5 only (F8) |
| `takeEvent` skips no note off | 2 |
| `restartPlan` has no rhythm channel rule | 1 |
| `chooseHeardTime` always uses the timestamp | 1 |
| `loadScore` does not reset the synth | 1 |
| `chaseEvents` keeps the values before CC 121 | 1 |
| Play after a pause does not start held notes | 1 |

### 2.6 Each commit of the step

All 35 commits from `a92e33c` to `2960e70` pass `tsc`, `oxlint --type-aware .`, `vitest run`,
and the oxfmt check. Each commit is green, as AGENTS.md asks.

### 2.7 Headless Chromium

The reviewer ran `spike.html` from `pnpm vite preview` in headless Chromium (Playwright 1.63.0).
The page loaded 10 preset files (5,564,966 B of PCM) in 217 ms. Play, a seek to 60 s, a pause, a
seek to 316 s, the end of the song, and a play at the end all worked. The page reported 0
errors. `now()` stayed at 61.003 s during the pause.

### 2.8 Code review

The reviewer read all code of the step. These parts are correct, and their tests pin them:

- **Event selection.** `planBlock()` sends each event in the block that holds its song time.
  Thus an event is up to one block early and never late.
- **Seek chase.** The order of the program changes, bank select, RPN, NRPN, data entry, and
  CC 121 stays the same. The other controllers send their last value. CC 121 removes the values
  that it resets.
- **Held notes and skipped note offs.** spessasynth_core 4.3.22 pairs note offs with note ons
  first in, first out (`noteOffID` in `noteOff()`), and `stopAllNotes()` sets the counters to 0.
  The restart plan agrees with both rules. Each change to playing (play, and seek while playing)
  makes a new skip table, so an old skip count cannot reach a later position.
- **Clock.** `chooseHeardTime()` has a wide margin on the measured data: Chrome +1.8 ms against
  a limit of 16 ms, Firefox +22.7 ms against 11.4 ms, WebKit at least +15.8 ms against 7.9 ms.
- **Pure core.** `block-scheduler.ts` and `clock.ts` import only types, read no clock, and touch
  no DOM. `takeEvent()` changes its `skip` argument, and its TSDoc says so.
- **Size budget.** `index.html` loads no audio code. The spike page loads the `Player` and the
  temporary parser with a dynamic import after the first frame.
- **Seek cost.** On demo 1 (16,614 events), the chase and the restart plan take at most 0.71 ms
  in Node, at 60 s and at 300 s.
- **TSDoc and prose.** Each exported symbol has TSDoc. The prose checks of AGENTS.md find no em
  dash, no semicolon splice, and no antithesis tic in the files of the step.

## 3. Findings

Each finding has a severity, the place, the failure, and the requested change. No finding is
blocking.

### F1. Two loads at the same time leave a promise that never settles (medium, non-blocking)

Place: `src/audio/player.ts:126-128`, `src/audio/player.ts:290-292`.

The `Player` keeps one `#ready` slot. A second `load()` replaces the slot before the processor
replies to the first one.

```text
App               WorkletPlayer                         Processor
 |                      |                                    |
 |--- 1. load(A) ------>|--- 2. score A, banks A ----------->|
 |                      |    #ready = A                      |
 |--- 3. load(B) ------>|--- 4. score B, banks B ----------->|
 |                      |    #ready = B (A is lost)          |
 |                      |<-- 5. ready (banks A) -------------|  resolves B too early
 |                      |<-- 6. ready (banks B) -------------|  #ready is undefined
 |  load(A) never settles                                    |
```

Failure: a user selects demo 2 while demo 1 loads, or drops a file during a load (design 2.2).
The first `load()` never settles. The second one resolves before its banks are in the synth.

Requested change: give each load an id, and let the `ready` reply carry it. Or reject the older
load. Add a TODO task under step 5 or step 6, where the app first loads twice.

### F2. A failed engine start stays failed, and a Worker error hangs the load (medium, non-blocking)

Place: `src/audio/player.ts:214-216`, `src/audio/player.ts:244-247`,
`src/audio/player.ts:201-208`, `src/audio/player.ts:300-304`.

- `#startEngine()` keeps the first promise of `#makeEngine()`, also when it rejects. A failed
  fetch of `sf/index.json` or a failed `addModule()` thus makes each later `load()` fail with
  the old error. The "Try again" button of design 2.8 can never succeed.
- The Player does not listen to the `error` and `messageerror` events of the Worker. If the
  Worker script does not load (for example a 404 after a new deploy, while an old page is
  open), the decode promise never settles, and `load()` hangs with no message.
- `#command()` calls `this.#engine.then()` on a rejected promise. Each later play, pause, or
  seek then makes an unhandled rejection.
- `#fail()` rejects only `#ready`. It does not reject the pending decodes. After a
  `processorerror` in play, the app gets no signal, and `now()` continues from the last anchor.

Requested change: clear `#engine` when it rejects. Listen to the Worker `error` event, and
reject all pending decodes there. Give the app an error signal for a processor failure. Add a
TODO task for step 6 (load failure message, design 2.8).

### F3. `now()` can run on with an anchor of the old score after a new load (medium, non-blocking)

Place: `src/audio/player.ts:117`, `src/audio/engine.ts:91-103`, `src/audio/engine.ts:161`.

`load()` clears `#anchors`, then posts the score. `loadScore()` stops the old song, but it posts
no anchor. While the old song plays, the processor posts an anchor each second. If that anchor
is in the port when the Player clears the list, it arrives after the clear. Then `now()`
extrapolates the old anchor at rate 1, while the new score stays at 0 with no sound. Nothing
corrects it until the next play.

Failure: in step 5 or 6, a demo switch during play can show moving animals with no sound.

Requested change: make `loadScore()` post an anchor `{ songTime: 0, rate: 0 }` in the next
block. Let the Player ignore the anchors that come before the reply of the new load.

### F4. The anchor list can drop the anchor in effect (low, non-blocking)

Place: `src/audio/clock.ts:19-20`, `src/audio/clock.ts:90`, `src/audio/clock.ts:99-107`.

The TSDoc of `addAnchor()` says that it removes "the anchors that can no longer be in effect".
The code keeps the last four by count. When more than four anchors arrive within the output
latency, the anchor in effect goes out of the list. `songTimeAt()` then falls back to
`anchors[0]`, which is later than the heard time, and extrapolates it backwards.

Failure: a drag of the seek bar sends a seek each frame (16.7 ms). With Bluetooth output
(100 ms or more, design 6.7), about six or more anchors wait to be heard. `now()` then gives a
song time that the listener does not hear yet, and the poses jump during the drag.

Requested change: remove an anchor only when a later anchor has a context time at or before the
heard time. Add a test for more than four anchors in the latency window.

### F5. The Worker cache doubles the PCM memory, and the design says "no copy" (low, non-blocking)

Place: `src/audio/decode-worker.ts:5`, `src/audio/decode-worker.ts:37-38`,
`src/audio/player.ts:123-125`, `docs/design.md:1137`, `docs/design.md:1153-1154`.

The Worker keeps each PCM SF2 buffer for the session, and it transfers a copy (`pcm.slice(0)`).
The synth in the worklet also keeps each bank for the session (`#loadedBanks`), and the Player
drops the banks that the synth already has. Thus the Worker cache saves no decode, and each
preset is in memory two times. Each load also copies and sends the banks that the synth already
has. Design 6.3 says "transfer the PCM buffers (transferable objects, no copy)" and gives about
7 MB for a usual piece.

Requested change: ask the Worker only for the files that the synth does not have, and transfer
the buffer with no copy and no Worker cache. Or keep the cache, and change design 6.3 and the
memory target of 9.7 (step 2) to count both copies.

### F6. Commands before the first load are lost, also the volume (low, non-blocking)

Place: `src/audio/player.ts:201-204`, `src/audio/engine.ts:100`.

`#command()` drops each command while `#engine` is undefined. A `setVolume()` from a saved
setting before the first load is thus lost. A play during the first load goes to the empty
table, ends at once, and `loadScore()` then resets the transport.

Requested change: keep the last volume in the Player and send it with the score. State in the
TSDoc of `Player` that play, pause, and seek before `load()` resolves do nothing.

### F7. The TSDoc of `planBlock()` gives the wrong direction (low, non-blocking)

Place: `src/audio/block-scheduler.ts:164-166`.

The comment says "each event starts at the block start that follows its time". The code sends
an event at the start of the block that holds its time, which comes before the event time.
Design 6.4 says the correct rule.

Requested change: write "each event starts at the start of the block that holds its time, up to
one block early".

### F8. The render test permits a late note (low, non-blocking)

Place: `src/audio/clock-render.test.ts:73`.

The test checks `Math.abs(error) <= BLOCK_FRAMES`. A note one block late passes. The reviewer
changed `planBlock()` to send each event one block late: the cases at rate 1, rate 0.5, and
after a seek still passed. Only rate 1.5 failed. Design 6.4 says "never late".

Requested change: check `error <= 0` and `error > -BLOCK_FRAMES`.

### F9. The Chrome first sound median in the reports is wrong (low, non-blocking)

Place: `docs/research/audio-spike.md`, section 4 table, row "First sound".
`docs/research/webkit-audio.md`, section 5 table, row "First sound".

The reports give "median 271 ms" for the 10 Chrome runs. The 10 values of
`chrome-cdp-runs.json` and `chrome-server-runs.json` have a median of 273.8 ms (mean 274.0 ms).
The max (287 ms) and the margin (13 ms) are correct.

Requested change: correct the value in both reports, with a dated note. The reports are from
the same date, so a correction keeps them a true record.

### F10. Decisions with no row in design section 10 (low, non-blocking)

Place: `docs/design.md` section 10, and the code below.

- A play at the song end starts the song again from 0 (`src/audio/block-scheduler.ts:123-130`).
  The design does not state this rule.
- The `Player` keeps four anchors (`ANCHOR_HISTORY`, `src/audio/clock.ts:20`). The design does
  not state it (see F4).
- An event sounds up to one block early (design 6.4). The design states it with no row.
- The volume sets the master gain of the synth (design 6.4). The design states it with no row.
- A render error makes the processor silent for good, and it reports the error
  (`src/audio/processor.ts:55-60`). The design does not state it.

Requested change: add these rules to design 5.2, 6.4, 6.7, or 6.8, and add a row for each to
section 10.

### F11. The follow-ups of the spike report are not TODO tasks (low, non-blocking)

Place: `docs/research/audio-spike.md` section 8, items 2 to 5. `TODO.md`.

TODO rule 7 asks for a task for each new piece of work. These items have no task: the warm-up
of the voice code (step 2 or later), a smooth `now()` in Firefox (step 3), the definition of the
first sound target (a user decision), and `playbackStats` in the manual release test (9.4).

Requested change: add one TODO task for each, under its step.

### F12. A claim of the spike report has no raw result (low, non-blocking)

Place: `docs/research/audio-spike.md` section 3.2, bullet 3.

The report says: "A second engine in the same process ... has no block above 2.67 ms."
`block-times.ts` wrote no file in `results/`. The later `webkit-audio/results/bench.txt` shows
a second Node run with a block of 9.22 ms at 236.49 s. Thus the warm-up explains the first slow
block, but a warm engine in Node can also have a slow block.

Requested change: commit the output of `block-times.ts`, or mark the claim "not verified".

### F13. One commit subject has no scope (low, non-blocking)

Place: commit `5969c22` `build: add @playwright/test 1.63.0`.

AGENTS.md asks for `type(scope): subject`. History stays as it is. Use a scope, such as
`build(tools)`, in later commits.

### F14. The seek work is linear in the event count, on the audio thread (info, non-blocking)

Place: `src/audio/block-scheduler.ts:211-239`, `src/audio/block-scheduler.ts:261-277`,
`src/audio/block-scheduler.ts:305-329`.

A seek, and each play after a pause, walks all events before the cursor three times.
`chaseEvents()` also makes one string key for each controller event. Demo 1 takes at most
0.71 ms. A file with 10 times more events can take most of a block.

Requested change: in the audio render target of step 2, also time the block of a seek near the
end of the largest demo.

### F15. `resume()` can reject with no handler (info, non-blocking)

Place: `src/audio/player.ts:142`.

`void this.#context.resume()` drops a rejection. Safari and iOS can reject `resume()` outside a
gesture. Handle it together with F2.

## 4. Documents against the code

- Design 6.4, 6.5, 6.7, and 6.8 agree with the code, except F5, F7, and F10.
- Design 7.1 and 7.2 agree with `vite.config.ts`, `spike.html`, and `tools/size.ts`.
- Design 7.3 agrees with `tools/licenses.ts`. The build prints "three is not installed", which
  is correct before step 3.
- The section 10 rows of `PlayerScore`, `chooseHeardTime()`, and `latencyHint` exist.
- AGENTS.md "Commands" agrees with `package.json`. The new rule for casts agrees with
  `src/audio/player.ts:226`.
- `TODO.md` marks the two Safari tasks as open, with a `Blocked:` line each.

## 5. Process question: approve step 1 with the Safari check deferred?

**Yes, with the conditions of section 6.**

Reasons:

1. **Step 2 does not depend on the result.** Step 2 builds `midi/` and `score/`. These modules
   are pure, and they make the `Score`, the synth events, and the preset list. Both possible
   audio designs use them: the worklet of design 6.4, and a render ahead in a Worker
   (`webkit-audio.md` section 7). Thus no work of step 2 is lost if Safari fails.
2. **The risk is in one module.** A Safari fix changes only `audio/`, behind the `Player`
   interface of design 7.1.
3. **The evidence puts the cause outside our code.** In Playwright WebKit, an empty worklet
   loses 318 to 325 ms and an `OscillatorNode` loses 1 ms. One busy process removes the loss.
   JavaScriptCore renders a block in 0.049 ms, 1.8 % of the block. The raw data agrees with
   these claims.
4. **The check needs a person.** Safari automation needs `sudo safaridriver --enable` and a
   menu setting. The user is asleep. A wait gives no new data.
5. **Chrome and Firefox pass.** Chrome is the browser of the development Mac (9.7).

The deferral does not make step 1 done. The "Done when" of design 9.5 names Safari, and
AGENTS.md says that a step is done only when its criterion is true.

## 6. Conditions

1. Keep the two Safari tasks of step 1 open, with their `Blocked:` lines. Write the review line
   as "2026-10-05 agent review, approved with conditions (Safari open, docs/reviews/step-1.md)".
2. Ask the user for the Safari checks of `audio-spike.md` section 7 and `webkit-audio.md`
   section 8 at the next contact (TODO rule 6).
3. Do the step 2 task "Add the `setSeatAudible()` rules to the processor" as the last task of
   step 2. Make no other change to the processor before the Safari result. A Safari fix can
   replace the processor design of 6.4 to 6.6.
4. The review of step 2 cannot approve step 2 until the Safari tasks are closed. If Safari loses
   time, the user decides about `webkit-audio.md` section 7 before step 3 starts.
5. Add TODO tasks for F1, F2, F3, and F11 before step 2 starts, so that the app wiring of step 5
   and the UI of step 6 include them. Fix the other findings when convenient.

## Status

Date: 2026-10-05. The fixes are the commits `306c309` to `1485491` on `main`. Each commit passes
`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check`. The last one also passes
`pnpm build` and `pnpm size` (14,699 B). Each new test fails without its fix.

| Finding | Verdict | Commits | What is left |
|---|---|---|---|
| F1 | fixed | `1485491` | A later load rejects the pending load with `LoadReplacedError` (design 6.8). The app must ignore this error (TODO, step 5) |
| F2 | fixed | `0288198` | A failure ends the engine, and the next load starts a new one. The `onError` function of the constructor gets a failure that no load reports. Design 2.8 has no text for a failure during play (TODO, step 6) |
| F3 | deferred to a TODO task | `3a33cfe` | Step 2 task. It changes the processor, so it waits for the Safari result |
| F4 | fixed | `30b42dd` | The anchor list keeps a window of 1 s (design 6.7) |
| F5 | deferred to a TODO task | `3a33cfe` | Step 2 task: remove the Worker cache, or count both copies in design 6.3 and 9.7 |
| F6 | fixed | `1542295` | The Player keeps the last rate and volume, and sends them after each score (design 6.8) |
| F7 | fixed | `aa9a985` | None |
| F8 | fixed | `3b8c19a` | None. The test compares the start of the block with the first sound, because the first sample of a voice can be 0 |
| F9 | fixed | `508c7fd` | None. A dated note under each table gives 273.8 ms |
| F10 | fixed | `7df7068`, `30b42dd` | None |
| F11 | deferred to TODO tasks | `3a33cfe` | Item 2 in step 2, item 3 in step 3, item 4 in step 1 (a question to the user), item 5 in step 7 |
| F12 | fixed | `d677bfe` | None. A dated note marks the claim "not verified" and gives the 9.22 ms block of `bench.txt` |
| F13 | fixed | none | The history stays. Each later commit has a scope |
| F14 | deferred to a TODO task | `3a33cfe` | Step 2 task: time a seek near the end of the largest demo |
| F15 | fixed | `9166cc5` | A rejected `resume()` goes to `onError` (design 6.8) |

Conditions:

1. Done in `306c309`. The two Safari tasks stay open with their `Blocked:` lines.
2. Open. The user was asleep. Ask at the next contact.
3. Done in `306c309`. The `setSeatAudible()` task of step 2 has a note.
4. Done in `306c309`. Step 2 has a note before step 3.
5. Done. F3 and F11 have tasks. F1 and F2 are fixed, and steps 5 and 6 have notes for the app.

A headless Chromium run of `spike.html` (Playwright 1.63.0, `pnpm vite preview`) after the fixes
loaded 10 preset files in 220 ms. Play for 3 s, a seek to 200 s, a pause, and a play all worked.
`now()` stayed at 201.061 s during the pause. The page reported 0 errors and 0 console errors.
With a 404 for the Worker script, the load rejected with "The decode Worker failed.".

### Change of condition 3 (2026-10-05)

On 2026-10-05, the manager changed condition 3 on the advice of an advisor agent. A later review
agent must confirm this change.

- Old text: make no change to the processor before the Safari result.
- New text: make no change to the processor host before the Safari result. The processor host is
  `src/audio/processor.ts` and the Web Audio wiring of the `Player`.

Reason: `SynthEngine` (`src/audio/engine.ts`) holds spessasynth_core and the block scheduler,
with no Web Audio code. The Worker-render fallback of `docs/research/webkit-audio.md` section 7
would put the same engine in a Worker. Thus the rules of 6.5 and 6.6 in the engine and in the
block scheduler stay after a Safari fix. Only the host can change.

The three step 2 tasks of the processor (the `setSeatAudible()` rules, the anchor of
`loadScore()`, and the warm-up) can therefore start now. The seek chase task still waits for the
Safari result. The two Safari tasks of step 1 stay open.
