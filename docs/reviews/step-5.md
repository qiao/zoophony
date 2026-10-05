# Review of step 5: motion

Date: 2026-10-05. Reviewer: an independent review agent (design 9.8). The reviewer did not do
the work of step 5.

## Scope

- Step 5 work: `src/pose/`, `src/scene/`, `src/main.ts`, `src/app/`, `src/gallery/`,
  `tools/smoke.ts`, `tools/measure-frame.ts`, `tools/write-perf-60.ts`,
  `docs/research/step-5-frame.md`, and `docs/reviews/step-5/`.
- The checks ran on `7736b8d` in the shared checkout, with no change to the working tree.
- My captures and scratch scripts are in the scratch directory of the review session, outside
  the repository. The scripts start their own Vite server and Chromium, and stop both.

## Verdict

**CHANGES REQUESTED.**

The "Done when" of 9.5 holds: the 210 tests of `pose/` pass, and the pose and frame targets of
9.7 pass. My run of the frame target agrees with the report. The pose is stateless, and the code
is clean. Three defects stop the step:

1. A play at the song end restarts the audio, but the app sets the transport back to paused in
   the next frame. The animals keep the rest pose while the music plays (F1).
2. In the playing pose, the neck of the contrabass goes through the head of the hippo. This
   shows in each demo with contrabasses (F2).
3. The eyes never blink. `poseAt()` calculates `blink`, but the scene does not apply it (F3).

## Conditions

1. Fix F1, with a test that fails without the fix.
2. Fix F2, with a test of the clearance between the head and the neck of a floor instrument.
   Update design 4.6 or 5.3 with the new values.
3. Fix F3, with a test in `scene/player.test.ts`.
4. Record the GIF of demo 1 again, or give a close capture of the contrabass section and of the
   eyes. Then send the step to the review agent again.

The other findings do not block step 5. F4 blocks the demo list of step 6.

## Check results

| Check | Result |
|---|---|
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 94 files, 932 tests, 6.9 s |
| `pnpm vitest run src/pose` | pass: 24 files, 210 tests, 2.7 s |
| `pnpm format:check` | pass |
| `pnpm build` | pass. The largest chunk (`renderer-*.js`) is 647.01 kB, 171.60 kB after gzip. The warning limit is 700 kB. |
| `pnpm size` | pass: 205,378 B of 1,000,000 B. Step 4 had 185,576 B. `pose/` and the math of three.js in the entry add 19.8 kB. This change is expected. |
| `pnpm smoke` | pass. Song time 0.000 s before play and 2.989 s after 3 s. Turn of the bow arm after the lift: 0.385 rad. |
| Audio chunk | lazy. `player-*.js` is not in the first download. `src/main.ts:189` imports it after the first frame. |
| Dev hook in the build | no. `window.zoophony` is not in `dist/`. |
| `poseAt()` with `perf-60.mid`, Node 24, 5 runs of 3,000 frames | 0.086 to 0.097 ms for each frame (load average 3.15) |
| Prose checks of AGENTS.md | 0 em dashes in AGENTS.md, design.md, TODO.md, the frame report, and the step 5 code. Each exported symbol of `pose/`, `scene/`, `app/`, and `gallery/` has TSDoc. |

## Done criterion (9.5, step 5)

| Item | Result |
|---|---|
| The Vitest tests of `pose/` pass | Yes: 24 files, 210 tests. |
| Pose timing: each note event within 5 ms (9.7) | Yes. `pose-timing.test.ts` has 14 tests: each family in a test file and in the first 10 s to 120 s of a demo. |
| Seeded offset: at most ±20 ms (9.7) | Yes. `pose-at.test.ts:218` checks each player of a scene, and the timing tests sample each note at its time plus the offset. |
| Frame time: GPU and main thread at most 4 ms for 95% of the frames (9.7) | Yes. See the table below. |

### Frame target again

I ran `node tools/measure-frame.ts` (device scale 2) one time. The load average was 6.34 before
the run and 8.25 after it. A minute before, it was 3.15, and my last scratch script raised it.

| Value | Report (run 3) p50 / p95 / max | Review p50 / p95 / max | Within 4 ms |
|---|---|---|---|
| Main thread: the tasks of each frame (trace) | 2.62 / 2.95 / 4.11 ms | 2.55 / 3.00 / 4.89 ms | 99.7% |
| Main thread: the frame callback (probe) | 2.40 / 2.80 / 3.70 ms | 2.30 / 2.70 / 3.70 ms | 100% |
| GPU: timer query | 1.86 / 2.27 / 2.76 ms | 1.86 / 2.27 / 3.01 ms | 100% |
| GPU process: `GPUTask` (trace) | 1.37 / 1.61 / 1.84 ms | 1.34 / 1.62 / 2.14 ms | 100% |

The values agree with the report within 0.07 ms at p50 and p95. The frame rate was 60.1 fps in
the probe and 60.0 fps in the trace, and the timer query had no disjoint result.

## Recordings and screenshots

- `docs/reviews/step-5/`: two GIFs of 200 frames at 50 ms (10 s, 720 × 450), two WebMs at
  1440 × 900, and three WebP screenshots after 6 s of play. This agrees with 9.8.
- At 720 × 450, an animal is about 15 px tall. The GIFs show the lift, the bows, and the baton,
  but they are too small to examine the hands or clipping. For the next review, add a close
  capture: for example, zoom the camera to its smallest distance before the recording.
- My captures: the gallery species page at 1440 × 900 with the device scale 2, at the slider
  times 0.00, 0.25, 0.30, 0.45, 1.50, 2.75, and 3.20 s. Demo 1, Handel, and Boulanger zoomed in
  with the wheel, at 60, 150, and 300 ms after the click on play, six frames 90 ms apart after
  4 s of play, and 0.1, 3.1, and 3.9 s after a pause.

## Visual review

| Item | Result |
|---|---|
| Bows move with the notes | Yes. Between frames, the bows of the violins change their place on the strings, and they stay across the strings. In the gallery, the bow angle changes between 0.30 s and 1.50 s. |
| Winds lift the instruments | Yes. The flute, the oboe, the clarinet, the bassoon, the horn, the trumpet, the trombone, and the tuba are at the mouth during play. |
| Hands on the instruments | Yes for the violins, the violas, the cellos, the flute, the trumpet, the horn, the piano, the snare drum, the xylophone, the timpani, and the triangle. The left hand of the contrabass is at the upper bout for C5, which is above the fingerboard. This agrees with the clamp of 5.3. |
| Conductor beats | Yes. The baton moves between frames, and the left arm hangs between cues. |
| Percussion strikes | Yes. In the gallery, the cymbals touch at 0.00 s and open at 0.45 s before the next note. The sticks and the mallets reach the heads and the bars. |
| Choir opens the beaks | Yes, but it is very hard to see (F6). |
| Clipping | The contrabass neck goes through the head of the hippo (F2). Unverified: the harp column and the face of the deer (U1). I saw no hand through a body and no instrument through another player. |
| Start of play | No pop. The violins come up from the lap: part of the way at 60 ms, up at 150 ms and at 300 ms (5.2). |
| Pause | No pop. The instruments stay up for 3 s, and they are down at 3.9 s (5.2). |
| Song end | The first end is correct: the transport pauses at the song time 1.900 s of a 1.9 s test file. A play after the end fails (F1). |
| Look against the references | The composition stays as in step 4. The bodies and the playing poses agree with `animals.webp`. The bear raises the baton above the stand, as in `orchestra.webp`. The bows of the reference lie flatter than ours, which are steep at 20° of slant. I do not request a change for this. |

## Open dependencies

| Dependency | Blocks step 5 | Blocks later |
|---|---|---|
| Clock target of step 3, and the steps of `currentTime` in Firefox | No. The "Done when" of step 5 has no clock target. `pnpm smoke` shows the sync in Chromium. | The end of step 3, and the release (step 7). It needs the Safari check by the user. |
| Safari checks of step 1 | No. | Steps 1 and 3, and every processor change of step 2. |
| `setSeatAudible()` in the processor (step 2) | No. `poseAt()` already takes the audibility and lowers silent seats (5.5). | The seat list of step 6. Mute and solo cannot sound right without it. |
| Stale song time after a demo switch (step 1, F3) | No, because the demo keys are temporary. | The demo list of step 6 (F4). Fix it before step 6 uses demo switches. |

## Findings

### F1. A play at the song end pauses the transport again (high, blocking)

`src/main.ts:252-256` pauses the transport when `Player.now()` reaches `durationSec` during play.
After the song end, the last anchor holds the song time `durationSec` with the rate 0. A play at
the end restarts the song from 0 (6.5), and the processor posts a new anchor. `now()` keeps the
old anchor until the listener hears the block of the new anchor (6.8). Thus the first frames
after the click read the end time, and the check pauses the transport at once.

```text
 page frame              WorkletPlayer             processor
     │ click on Play          │                          │
     │──── play() ───────────>│──── 'play' ─────────────>│ song at end: restart at 0
     │ transport: playing     │<─── anchor (t0, 0 s, 1) ─│
     │                        │                          │
     │ next frame: heard time < t0 (output latency)      │
     │ now() = durationSec from the old anchor           │
     │ songTime >= durationSec: transport: paused        │
     v                                                   v
   the audio plays from 0 s, the animals rest, and the button shows "Play"
```

Evidence: my scratch script served a test file of 1.9 s in place of demo 1 through a Playwright
route. The first click played to the end, and the transport paused at the song time 1.900 s.
The second click came at 3.051 s. The frames at 3.067 to 3.116 s read 1.900 s, then the song
time went from 0.015 s to 1.466 s. The transport stayed paused, and the button showed "Play".
Thus the instruments lift less than 10% and stay down while the music plays. The user must click
again to see the motion.

Requested change: apply the end check only after `now()` reads less than `durationSec` after a
play. For example, keep a flag that a play sets and a song time below the end clears. Put the
rule in a pure function in `src/app/transport.ts`, with a Vitest test that fails without it.
Add the case to design 5.2 or 6.5.

### F2. The contrabass neck goes through the head of the player (high, blocking)

`src/pose/bowed.ts:97-102` leans the contrabass player forward 20° (design 5.3). The bass stays
on the floor, so the head moves into the neck of the instrument. In the gallery at 1.50 s, the
scroll comes out of the top of the head of the hippo, and the fingerboard shows on its face. In
demo 1 and in Boulanger, each hippo shows the neck in the back of its head and the scroll above
it. The step 4 bind pose had the neck in front of the face, so the lean of step 5 causes it. The
rest pose has no lean, so the clipping shows only during play.

Requested change: keep the head clear of the neck. For example, reduce the lean and turn the
right shoulder more, turn the neck and the head to the right of the neck of the bass, or move
the end pin farther to the left. Add a test for the cello and the contrabass: in the playing
pose, at the lowest and the highest string, and at the largest look at the conductor, the
distance from the head center to the axis of the neck is more than the head radius plus a
margin. Give the new values in 4.6 or 5.3.

### F3. The eyes never blink (medium, blocking)

`src/scene/player.ts:96-109` copies the rotations, `rootOffset`, and `slideOffset` of a pose.
It does not read `blink`. No other file outside `pose/` reads it, so no animal blinks on the
stage or in the gallery. Design 4.7 and 5.1 require the blink, and the TODO task of the idle
layer is closed. The eye bones are at the eye centers (`src/models/biped.ts:333-340, 447-448`),
so a scale on y closes each eye.

Requested change: in `applyPose()`, set the y scale of `eyeL` and `eyeR` to `1 - blink`, with a
small floor such as 0.05 so that the matrix stays valid. Add a test in `scene/player.test.ts`.

### F4. A stale anchor can give the old song time after a demo switch (medium, non-blocking, blocks step 6)

`WorkletPlayer.load()` clears the anchors (`src/audio/player.ts:176`) before it sends the new
score. A demo switch during play first sends a pause (`src/main.ts:212-214`), and the engine
posts an anchor for it (`src/audio/engine.ts:161`). When the synth already has all presets of
the new demo, no decode waits, and the load can clear the anchors before the anchor of the
pause arrives. Then `now()` gives the old paused song time until the listener hears the anchor
of the next play. With F1, an old time at or after the end of the new song pauses its transport
at once. This is the open step 2 task "Make `loadScore()` post an anchor". I did not reproduce
it (U2).

Requested change: do the step 2 task before step 6 adds the demo list. Until then, the app can
also ignore the end check of F1 until the first anchor of the new score.

### F5. The speed test limits are 8 times too loose (low, non-blocking)

`src/pose/pose-speed.test.ts:12-17` says that the ratios are 0.14 and 0.177, and that a pose
3 times slower fails. These are the values before the math refactor. `poseAt()` now takes
0.086 ms for `perf-60.mid` in place of 0.37 ms, so the ratio is about 0.033. A pose about 8 times
slower still passes the limit 0.28. Design 9.7 (`docs/design.md:2552-2560`) also gives 0.37 ms
and 0.47 ms.

Requested change: measure the ratios again, set each limit to 2 times the new ratio, and update
the numbers in the test comment and in 9.7.

### F6. The beak of a singer opens too little to see (low, non-blocking, design)

The jaw opens 18° (5.3) on a beak that is 0.2 H long. In the gallery at the device scale 2, the
open beak (0.25 s) and the closed beak (2.75 s) differ by a few pixels. At the default view of
Handel, the singers are about 20 px tall, and no jaw motion shows. The chest turn of 3° is also
small.

Requested change: a decision for the manager. For example, open the jaw 30°, and lift the head
a little with each sung note. Then the choir shows that it sings.

### F7. The scratch test covers one time and one transport (low, non-blocking)

The module scratch objects of `pose/` (23 in `bowed.ts`, 10 in `ik.ts`, and 2 to 9 in each other
family file) hold no state if each call writes a scratch object before it reads it. Design 7.1
states this rule, and `pose-at.test.ts:84-96` checks it: each player of `perf-60.mid` alone and
in the scene, in the reverse order, at the song time 1.3 s with the playing transport. The test
is good, but a branch that reads a scratch object before it writes it can hide outside this
state: the rest pose, pizzicato, tremolo, a cue of the conductor, or a silent seat.

Requested change: run the same comparison at three or four more states: `NOT_STARTED`, a time in
the lowering after a pause, a pizzicato or tremolo note, and a time with a cue.

### F8. A fast play, pause, and play jumps the instruments (low, non-blocking)

`src/pose/rest.ts:45-67` supposes that the weight was steady before the previous change. A play
at 0 s, a pause at 0.1 s, and a play at 0.2 s give the weight 0.33 at the pause and 1 at the
second play, so the instruments jump. Design 5.2 states this supposition. The keyboard of
step 6 makes fast toggles easy.

Requested change: accept it and name the case in 5.2, or clamp the weight at a play to the
weight that the last pause reached.

### F9. The temporary app has no recovery from an error (low, non-blocking, step 6)

`src/main.ts:175-181` logs a failed load, and the button stays at "Loading". A failed import of
the audio chunk (`src/main.ts:188-198`, `:263`) also leaves "Loading", and `audioStarted` stops a
retry. When the engine fails during play, `onError` logs it, but the transport stays playing
while the clock stops. Thus the animals hold a playing pose with no sound. This is acceptable for
a temporary button.

Requested change: add to the step 6 task of the messages that `onError` also pauses the
transport.

### F10. Stale step text about the winds of the views page (low, non-blocking)

`src/gallery/view-poses.ts:122-124` and design 7.1 (`docs/design.md:2163-2165`) say that the wind
players hold a grip pose "until the winds of step 5 give their pose". The winds of step 5 exist.

Requested change: pose the winds of the views page with `preparePlayer()` and `poseAt()`, as the
gallery does, or change the text to a fixed decision. This is item 17 of the pose audit.

### F11. The `perf-60` branch is in the build (info)

`src/main.ts:106-110` keeps the path `perf/perf-60.mid` and its section size in
`dist/assets/index-*.js`. `showPerf60` is false in the build, so the branch never runs. The cost
is about 100 B. A check of `import.meta.env.DEV` in `loadPiece()` removes it.

### F12. Large files and a repeated sequence in `poseAnimal()` (info)

Five files of `pose/` have more than 400 lines: `bowed.ts` 623, `percussion.ts` 611, `plan.ts`
486, `strokes.ts` 422, and `pose-at.ts` 403. Item 15 of the pose audit is still open. Each case of
`poseAnimal()` (`src/pose/pose-at.ts:242-345`) calls `writeBody()` and `chainFrames()` in the
same order, and five cases call `swayOf()` with the same arguments. The `NoteLayer` union, the
exhaustive switch, and the `never` check are correct and easy to read. The audit fixed the
duplicate arm rig (item 2) and the note groups (item 6), and I found no other copy of logic
between the families.

### F13. The Euler update of three.js costs 0.46 ms each frame (info)

Section 5 of the frame report finds that `bone.quaternion.fromArray()` in `applyPose()` updates
`bone.rotation` each time. The target passes, so no change is necessary now. Keep the item for
step 6 or for the low tier.

## Unverified

### U1. The harp column and the face of the deer

In the gallery front view at 1.50 s, the column of the harp passes in front of the snout of the
deer, and the lean of 8° (5.3) moves the head forward. I could not see from the front if the
column cuts the face.

Steps: open `gallery.html?page=species`, set the time to 1.5 s, and turn the camera to the left
side of the deer. Or calculate the distance from the head center to the column line in the
playing pose, as in the test of F2.

### U2. The stale anchor of F4

Steps: serve two short test files with the same program through Playwright routes, as in F1,
so that the second load needs no decode. Play the first file for 1.5 s. Press `]` during play,
and log `window.zoophony.songTime` and `playing` in each frame after the load. A stale anchor
shows as a song time of the first file in the first frames.

## What I checked and found correct

- `poseAt()` reads only its arguments. No file of `pose/` reads a clock or `Math.random()`, and
  each search is a binary search with no cursor (`lastAtOrBefore()` in `blend.ts`). The plan is
  readonly. The rig caches of `plan.ts` exist only while `preparePoses()` runs.
- Seek, pause, rate, and mute are correct in principle. A seek or a rate change only changes the
  song time that `now()` gives. A pause and a mute only change `Transport` and
  `SeatAudibility`, which hold their change times.
- The transport (`src/app/transport.ts`) keeps the time of the change before, so a play within
  3 s of a pause starts from the current height (5.2). My captures confirm it.
- The app wiring: one `ModelCache` for the layout, the plan, and the scene. A later demo request
  wins with the ticket check. A load that a later load replaced is ignored (6.8). The old scene
  frees its GPU resources in `StageScene.show()`.
- The temporary code of `src/main.ts` is small and marked. The button is at lines 44-48 and
  127-153, and the demo keys are at lines 230-242. Both comments name step 6. The `perf-60`
  path and the dev hook stay as dev tools, as 9.5 asks.
- The frame report (`docs/research/step-5-frame.md`) gives its method, its limits, and three
  runs. My run agrees with it.
