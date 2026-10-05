# Step 5 frame target: perf-60.mid in Chrome

Date of the measurements: 2026-10-05.

This report gives the result of the frame target of design 9.7 for step 5. The raw output of the
three runs is in [`step-5-frame/`](step-5-frame/). "Not verified" marks a fact that no
measurement confirms.

## 1. Result

The frame target passes. Each value of the main thread and of the GPU is at most 4 ms for at
least 99.8% of the frames, and the target asks for 95%.

| Value (run 3, device scale 2) | p50 | p95 | max | Within 4 ms |
|---|---|---|---|---|
| Main thread: the tasks of each frame (trace) | 2.62 ms | 2.95 ms | 4.11 ms | 99.8% |
| Main thread: the frame callback (`performance.now()`) | 2.40 ms | 2.80 ms | 3.70 ms | 100% |
| GPU: the commands of each frame (timer query) | 1.86 ms | 2.27 ms | 2.76 ms | 100% |
| GPU process: the `GPUTask` slices of each frame (trace) | 1.37 ms | 1.61 ms | 1.84 ms | 100% |

The frame rate is 60.0 fps in the trace and 60.1 fps in the probe. Headless Chrome draws at
60 Hz, so the frame rate shows no lost frames and no margin.

## 2. Machine and code

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, 64 GB, macOS 26.5 (25F71) |
| Browser | Google Chrome 154.0.8037.95, headless (Playwright `channel: 'chrome'`) |
| WebGL | `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max, Unspecified Version)`, WebGL2, MSAA 4 samples |
| Flags | `--use-angle=metal --enable-gpu --ignore-gpu-blocklist --autoplay-policy=no-user-gesture-required` |
| Page | The Vite dev server, `/?demo=perf-60` (design 9.5): 60 players, "One per part", stage 14.67 m |
| Size | 1440 × 900 CSS pixels, device scale 2 (the Retina display of the Mac). The high tier gives the pixel ratio 2, so the canvas is 2880 × 1800 |
| Tier | High: shadow map 2048, `PCFShadowMap` with radius 3, MSAA (design 2.6) |
| Code | Commit `516f02c` |
| Load | The load average for 1 minute was 3.58 before run 3 and 7.11 after it. The measurement itself adds the load of Chrome and Vite. Runs 1 and 2 started at 8.42 and about 7, after the work of another agent |

## 3. Method

`node tools/measure-frame.ts [--scale=<n>] [--trace=<file>]` does these steps. First run
`pnpm dev` one time, or its first three scripts, so that `public/sf/`, `public/demos/`, and
`perf/perf-60.mid` exist.

1. Start the Vite dev server. Open `/?demo=perf-60` in Google Chrome at 1440 × 900.
2. Wait until the `Player` has loaded the samples. Click play, and wait 3 s. Thus the lift of the
   instruments (design 5.2) and the first compile of the code are outside the measurement.
3. Probe for 10 s. A script that runs before the page code wraps each callback of
   `requestAnimationFrame`. It times the callback with `performance.now()`. It also puts the
   WebGL commands of the callback into a query of `EXT_disjoint_timer_query_webgl2`, and reads
   the result some frames later.
4. Trace for the next 10 s with the categories `devtools.timeline`,
   `disabled-by-default-devtools.timeline`, `disabled-by-default-devtools.timeline.frame`,
   `gpu`, and `toplevel`. DevTools records a performance trace with these categories.
5. Divide the trace into frames at each `FireAnimationFrame` of the main thread of the page. For
   each frame, add the durations of the top-level tasks (`ThreadControllerImpl::RunTask`) of
   that thread, and of the `GPUTask` slices of the GPU process (`CrGpuMain`). A slice belongs to
   the frame of its start.

The frame callback of the app calls `poseAt()`, copies the poses to the bones, and renders the
scene with the shadow pass (`src/main.ts`). The main-thread tasks also hold the other work of
the frame, such as the messages of the audio clock and the garbage collection.

### Limits of the method

- **GPU time.** The GPU track of DevTools shows the `GPUTask` slices. A `GPUTask` is the CPU
  time of the GPU process: it decodes the commands and gives them to Metal. It is not the time of
  the GPU. Its value is the same at the device scale 1 and 2 (p50 1.35 ms and 1.37 ms). The timer
  query measures the GPU, and its value grows with the pixels: p50 1.28 ms at the device scale 1
  and 1.86 to 2.26 ms at the device scale 2. Thus this report takes the timer query as the GPU
  time. The query has no disjoint result in the three runs.
- **Timer query scope.** The query holds the commands of the callback: the shadow pass and the
  main pass. It does not hold the compositor of Chrome, which draws the canvas into the page.
- **Clock resolution.** Chrome rounds `performance.now()` to 0.1 ms on a page that is not
  cross-origin isolated. The trace has a resolution of 1 µs.
- **Headless.** Headless Chrome draws at 60 Hz, and the display of the Mac draws at up to
  120 Hz. The frame target is a time for each frame, so the frame rate does not change it. A
  headed window was not measured. Not verified: a headed window gives the same times.
- **Dev server.** The dev server gives modules with no minification. The JIT compiles the same
  code, so the main-thread time is about the same as in the build. Not verified with the build,
  because only the dev server serves `perf-60.mid`.
- **Trace load.** The probe and the trace run one after the other. The callback times are nearly
  the same in both (p50 2.40 ms and 2.47 ms), so the trace adds little time.

## 4. Runs

| Run | Device scale | Main tasks p50 / p95 / max | Callback p50 / p95 / max | GPU query p50 / p95 / max | Load before |
|---|---|---|---|---|---|
| 1 | 2 | 2.57 / 2.97 / 4.05 ms | 2.40 / 2.80 / 4.00 ms | 2.26 / 2.29 / 3.99 ms | 8.42 |
| 2 | 1 | 2.58 / 2.93 / 3.96 ms | 2.30 / 2.70 / 3.80 ms | 1.28 / 1.37 / 2.10 ms | about 7 |
| 3 | 2 | 2.62 / 2.95 / 4.11 ms | 2.40 / 2.80 / 3.70 ms | 1.86 / 2.27 / 2.76 ms | 3.58 |

The largest frame of each run is near 4 ms. Each run has at most one frame above 4 ms.

## 5. Where the main-thread time goes

The main thread has the smaller margin: p95 2.95 ms against 4 ms. A sampling profile of 5 s
(Chrome DevTools protocol `Profiler`, sample every 0.1 ms, device scale 2) gives this split of
the frame callback, which takes 2.04 ms for each frame on average:

| Part | Time for each frame |
|---|---|
| `poseAt()` | 0.20 ms |
| `applyScenePose()`: copy the poses to the bones | 0.50 ms |
| `WebGLRenderer.render()`: matrices, the shadow pass, and the main pass | 1.26 ms |

In `applyScenePose()`, each `bone.quaternion.fromArray()` calls the change callback of
three.js. The callback sets the Euler angles of `bone.rotation` from the quaternion
(`Euler.setFromRotationMatrix()`). This takes 0.46 ms for each frame, about 22% of the callback.
No code reads `bone.rotation`. The target passes, so this report changes no code. If a later
step needs main-thread time, `applyPose()` in `src/scene/player.ts` can write the quaternion
with no Euler update.

## 6. Recordings

The recordings of the review of step 5 (design 9.8) are in `docs/reviews/step-5/`. The scripts
are in `scripts/step-5/`:

1. `node docs/research/scripts/step-5/record.mjs <folder>` serves the build with
   `vite preview`. It plays demo 1 and the Boulanger demo in headless Chromium at 1440 × 900, and
   keeps each frame of the DevTools screencast (JPEG, about 60 fps) for 10.5 s. The click on
   play comes 0.5 s after the start.
2. `python3 docs/research/scripts/step-5/encode.py <folder>/<demo> <demo> <ffmpeg>` writes a GIF
   of 10 s at 720 × 450 and 20 fps with Pillow, and a WebM (VP8) of 10 s at 1440 × 900 and
   30 fps with the ffmpeg of the Playwright cache (`ffmpeg-1011`).

A GIF keeps the time of a frame in steps of 10 ms, so the GIF uses 20 fps (50 ms). At 15 fps,
each frame took 60 ms, and the GIF played 10 s in 9 s.

| File | Size |
|---|---|
| `beethoven-5-play-720x450.gif` | 1,657,453 B |
| `boulanger-matin-play-720x450.gif` | 1,544,748 B |
| `beethoven-5-play-1440x900.webm` | 1,659,325 B |
| `boulanger-matin-play-1440x900.webm` | 1,644,357 B |
