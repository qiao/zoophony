# The frame time of the high tier (2026-10-13)

On 2026-10-12, `node tools/measure-frame.ts` found the GPU time of the frame target of design 9.7
at 15 to 19 ms (p95) on `main`, with 0% of the frames within 4 ms. The main-thread p95 was 5.7 ms.
The user approved a fix round on 2026-10-12 and on 2026-10-13. A first agent made the profile and
stopped before a commit. The agent of the round `frame-perf` finished its work on 2026-10-13.

This report gives the facts about the instruments, the power state of the GPU, the profile of the
encoders, the spike of the main thread, the GPU work of other processes, and each measure with
its load. The decisions are in
[`2026-10-13-frame-time.md`](../decisions/2026-10-13-frame-time.md).

All measures use `perf-60.mid` (60 players) in Cinematic mode, in Google Chrome 155 at
1440 × 900 and the device scale 2, on the development Mac (Apple M1 Max).

## 1. Summary

- `pnpm frame` now runs the measure end to end in about 3 to 4 minutes, with a load gate and a
  Markdown table. Its GPU row is the time of the WebGL frames in a Metal System Trace with no
  frame cap.
- The read of the title backdrop waited 1.6 to 1.8 ms on the main thread every 9 to 10 frames.
  It now waits about 0.8 ms in a trace. The main-thread p95 went from 5.91 to 5.93 ms to 4.67 to
  4.69 ms. The target of 4 ms still fails: the frame itself takes 3.3 to 3.6 ms (p50) in a trace.
- With a quiet GPU, the GPU time of a WebGL frame is p50 3.70 ms and p95 4.44 ms on the tip. The
  target of 4 ms still fails. When the Chrome of the user rendered a page, it used up to 50% of
  the GPU time of a trace, and the p95 rose to 5.3 to 7.1 ms.

## 2. The instruments and the power state of the GPU

The first agent found these facts on 2026-10-12 (its logs are not in the repository):

- A timer query of `EXT_disjoint_timer_query_webgl2` around each pass does not work on ANGLE on
  Metal: each query gets the time of the whole command buffer, also after a flush or a finish at
  each change of the framebuffer.
- At 60 fps, the GPU of the M1 Max stays in its "Minimum" performance state for about 77% of the
  time. In an ablation series at 60 fps, the frames with no shadow map or with no depth pass of
  the beam gave a higher timer value. Thus the timer query at 60 fps measures the clock more than
  the work.
- With no frame cap (`--disable-gpu-vsync --disable-frame-rate-limit`), the GPU stays in its
  "Maximum" state for 89% to 99% of the time.

This round found these facts:

- With no frame cap, the timer query also gets the wait of the command buffer in the queue of
  the GPU, because the queue is always full. In the run `after1` (table of section 7), Chrome made
  162 frames each second, a frame interval of 6.2 ms. The timer query gave p50 8.03 ms, more than
  the frame interval. The Metal trace of the same phase gave p50 4.26 ms of GPU work for each
  frame. Thus the timer query with no frame cap is for information only.
- The Metal System Trace (`xcrun xctrace record --template 'Metal System Trace'`) gives the start
  and the duration of each encoder on each channel of the GPU, with its process and its command
  buffer. `tools/gpu-trace.ts` splits the WebGL work of the GPU process of Chrome into frames at
  each write of the canvas surface. It drops the command buffers of the compositor of Chrome.
- A trace that attached to the GPU process (`--attach <pid>`) did not save in 100 s and in
  110 s. A trace of all processes (`--all-processes`) of 3 s saved in about 110 s. Thus
  `pnpm frame` records all processes for 3 s, and stops the frames of the page while Xcode saves
  the trace.
- The table `gpu-performance-state-intervals` has a row only when the state changes. In the runs
  with a quiet GPU, it held "Maximum" for nearly all of the trace.

## 3. The profile of the encoders

`encoders.ts` (section 8) on the Metal trace of the run `after2`: 648 WebGL frames with no frame
cap, other GPU work 2%. Each row is an encoder of a WebGL frame with its time in milliseconds.
The labels of ANGLE give no pass name. The table leaves out the encoders below 0.05 ms: the ten
small passes of the bloom and the depth of field.

| Encoder | Frames | Mean | p95 |
|---|---|---|---|
| Blit 0, compute (texture uploads, such as the bones) | 94% | 0.07 | 0.20 |
| Render 1, vertex | 98% | 0.22 | 0.29 |
| Render 1, fragment | 99% | 0.07 | 0.09 |
| Render 2, vertex | 98% | 0.38 | 0.60 |
| Render 2, fragment (the scene with MSAA) | 99% | 2.00 | 2.49 |
| Render 3, vertex | 98% | 0.21 | 0.29 |
| Render 3, fragment | 98% | 0.79 | 1.13 |
| Render 4, fragment (the final pass into the canvas) | 96% | 0.37 | 0.42 |
| Blit 16, compute | 94% | 0.06 | 0.20 |

The first agent measured the same encoders at 60 fps, at the low clock: render 2 had 3.84 ms of
fragment time, render 3 0.90 ms, the bloom 0.54 ms, and the final pass 0.87 ms. Its ablations of
frozen shots at the highest clock ran at a load average of 35 to 64, so this report does not use
their numbers.

## 4. The main thread: the read of the title backdrop

The Chrome trace of the run `before1` had 600 frames at 60 fps. Every 9 to 10 frames, the frame
held a `CommandBufferHelper::Finish` of 1.6 to 1.8 ms (62 times in 10 s). A CPU profile of the
first agent gave `getBufferSubData()` 0.150 ms of self time for each frame. The probe of the
title backdrop (`app/backdrop-probe.ts`, design 2.8) starts a read every 0.15 s. It copied the
pixel buffer of a finished read to the CPU directly after the render. In Chrome, the copy then
waited for the GPU process to run all commands of the frame.

The fix has two parts:

1. `BackdropProbe.collect()` takes a finished read at the start of a frame, before the commands
   of the render. `request()` starts a read after the render, as before. In the trace of the run
   `after1`, the wait of a read fell to 0.77 ms. `getBufferSubData()` had 0.044 ms of self time
   for each frame in a CPU profile.
2. Each read gets a new pixel buffer. With one buffer for all reads, Chrome printed this warning
   60 times in 8 s: "performance warning: READ-usage buffer was written, then fenced, but written
   again before being read back. This discarded the shadow copy that was created to accelerate
   readback." With a new buffer, it printed none (`console-warnings.ts`). `getBufferSubData()`
   had 0.035 ms of self time for each frame. In a trace with the GPU categories, each read still
   waits about 0.77 ms (run `v2a`).

The frames with no read take 3.3 to 3.6 ms (p50) in a trace, and the callback of each frame
2.8 to 2.9 ms (p50, `performance.now()`). Thus the main-thread target still fails with no spike.
A CPU profile shows the cost: the three renders of the scene (the depth of the beam, the shadow
map with the scene, and the depth of field), the update of the world matrices and of the
skeletons, `poseAt()`, and the upload of the bone textures.

## 5. The GPU: other work and the depth resolve

The Metal trace of all processes shows the GPU work of the other processes. In the run
`before1`, the Chrome of the user (a page of the user that rendered) kept the GPU busy for 50.5%
of the trace, and in the run `after1` for 27%. The GPU p95 of the WebGL frames was 7.09 ms and
5.27 ms. With 2% of other work, it was 4.32 ms before the change below (an experiment with the
timer query on) and 4.44 ms after it (run `after2`). `pnpm frame` now prints the share of the
other processes, and a warning above 10%.

The MSAA target of the scene resolved its depth with its color. No pass reads that depth, so the
target now resolves only the color (`resolveDepthBuffer = false` in `scene/post.ts`). The frozen
frames of section 6 keep the same PNG bytes. The fragment time of render 3 went from 0.93 ms to
0.79 ms (mean, quiet GPU). The change of the whole frame is inside the noise of two runs.

The depth pass of the depth of field came after the bloom passes. Each pass of the bloom calls
`renderer.render()`, which counts a new frame. three.js updates the skeletons, the bone textures,
and the geometries one time for each frame number, so the depth pass updated the 60 skeletons of
`perf-60.mid` again and uploaded their bone textures again. In a CPU profile,
`multiplyMatrices()` (the skeletons) had 0.23 ms and `texSubImage2D()` (the bone textures)
0.13 ms of self time for each frame. The pass now comes directly after the scene pass and takes
its frame number (`scene/post.ts`), as the depth pass of the beam does. The frozen frames of
section 6 keep the same PNG bytes, also the conductor shot with the depth of field.

## 6. Frozen frames

`frozen.ts` holds the time of the page at 1,000,000 ms after a seek, so that the effects that
read the wall time draw the same frame in each run. It wrote three shots before and after the
depth resolve change, and after the change of the depth pass of the depth of field: the default play view (Boulanger demo, 30 s, Free mode), the conductor shot
with the depth of field (Boulanger demo, 73 s), and the wide shot of `perf-60.mid` (5 s). `cmp`
found the same bytes in each pair of PNG files of the three runs.

## 7. Each measure with its load

The load is the 1-minute load average before each phase of `pnpm frame`, and at the end. "Other
GPU" is the share of the Metal trace in which other processes used the GPU. Each time is in
milliseconds.

| Run | Code | Load | Main p50 / p95 / within 4 ms | Metal p50 / p95 / within 4 ms | Other GPU | Timer, no cap, p50 / p95 | Timer, 60 fps, p50 / p95 |
|---|---|---|---|---|---|---|---|
| first | `183e6106` | 5.2 | 3.50 / 5.91 / 84.1% | (the trace did not save) | | | |
| `before1` | `183e6106` | 6.9, 6.2, 12.3 | 3.75 / 5.93 / 68.0% | 4.48 / 7.09 / 18.9% | 50.5% | 9.22 / 17.83 | 7.73 / 13.67 |
| experiment | `183e6106` | about 8 | | 3.82 / 4.32 / 83.9% | 1.7% | 7.73 / 11.36 | |
| `after1` | read at the frame start | 6.4, 6.0, 8.4 | 3.43 / 4.69 / 85.1% | 4.26 / 5.27 / 14.8% | 27% | 8.03 / 17.58 | 9.30 / 19.16 |
| `v2a` | a new buffer for each read | 6.5, 7.6, 6.8 | 3.59 / 4.75 / 80.5% | (`--no-metal`) | | 7.59 / 16.36 | 9.39 / 19.15 |
| `after2` | `74a293f2` | 7.5, 6.7, 7.8 | 3.32 / 4.67 / 87.3% | 3.70 / 4.44 / 55.9% | 2% | 4.69 / 14.01 | 9.29 / 20.19 |

The experiment ran the old frame probe with no frame cap and the timer query on, and a Metal
trace of 3 s of all processes at 188 fps. Its timer values come from 60 s of play.

A run on `74a293f2` after `after2` waited 300 s while other work kept the load average at 14.8
to 47.2. Then `pnpm frame` refused with the exit code 2 and measured nothing.

## 8. Probes

The probes are in [`2026-10-13-frame-time/`](2026-10-13-frame-time/). Run each one from the
repository root.

- `pnpm frame --keep=<dir>` gives each row of section 7, and keeps `main-trace.json`,
  `metal-gpu-intervals.xml`, and `gpu-performance-state-intervals.xml` in `<dir>`.
- `node docs/research/2026-10-13-frame-time/encoders.ts <dir>/metal-gpu-intervals.xml` gives the
  table of section 3.
- `node docs/research/2026-10-13-frame-time/main-spikes.ts <dir>/main-trace.json` gives the
  frames above 4 ms and the gaps between them (section 4).
- `node docs/research/2026-10-13-frame-time/cpu-profile.ts [<out.cpuprofile>]` gives the self
  time of the top functions for each frame (section 4).
- `node docs/research/2026-10-13-frame-time/console-warnings.ts` counts the console messages of
  8 s of play (section 4).
- `node docs/research/2026-10-13-frame-time/frozen.ts <dir>` writes the frozen frames of
  section 6.

## 9. Open problems

- The main-thread p95 is 4.67 to 4.75 ms. A cut of the JavaScript of each frame by about 0.7 ms
  is necessary, for example one scene traversal for the depth of the beam and of the depth of
  field, or fewer program changes of the override materials of the depth passes.
- The GPU p95 is 4.44 ms with a quiet GPU. The candidates change pixels, so the manager or the
  user must approve them first: the depth of field from the depth of the beam (one geometry pass
  less in each frame with the depth of field), fewer MSAA samples, or cheaper side lights. The
  ablations of the first agent at a high load suggested about 0.85 ms for the MSAA, 0.6 ms for
  the depth of field, and 0.4 ms for the side lights.
- A page that renders in another browser makes the GPU values too high. Close it before a
  measure.
