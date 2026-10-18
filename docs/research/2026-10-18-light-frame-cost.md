# Frame cost of the cinematic light

Date 2026-10-18. Round "do it" (user, 2026-10-18): measure the frame cost of the steps P1 to P4 of
[`2026-10-17-cinematic-lighting.md`](2026-10-17-cinematic-lighting.md). Decisions:
[`2026-10-18-cinematic-light.md`](../decisions/2026-10-18-cinematic-light.md). The probes and their
logs are in [`2026-10-18-light-frame-cost/`](2026-10-18-light-frame-cost/). Each command runs from
the root of the tree.

## 1. The question

The frame test is paused since 2026-10-14, and the steps of the cinematic light added GPU work in
each frame. The measure decides: the time of a frame of `perf-60.mid` on the high tier, at each
step of the round. The frame target of design 9.7 is 4 ms for 95% of the frames.

## 2. The measures

`pnpm frame` failed on each commit at the Metal System Trace: `xctrace` reported "Error connecting
to DTServiceHub", or did not end in 360 s (`logs/metal-failed-*.txt`). A record of 1 s alone also
hung. So the GPU row with the target could not run. `node tools/measure-frame.ts --no-metal` gives
the main-thread row (with the target) and the GPU timer query (for information). On ANGLE on
Metal, the timer query holds the wait in the queue, so this report compares the frame rate with
no frame cap, as the time of a frame of the GPU.

Each probe makes a worktree of each commit, waits until the load average of 1 minute is below 12,
and runs the measure: Chrome 155, headless, ANGLE on Metal, Apple M1 Max, 2880 × 1800 pixels,
the Cinematic mode in the section shot of 32 s to 44 s, with the depth of field.

### 2.1 The start against the end, in turns

`frame_abab.sh` measures the start (A) and the end (B) in turns, A B A B (`logs/abab-runs.log`).

| Run | Main thread p50 / p95 | Frame rate with no cap | GPU timer query p50 |
|---|---|---|---|
| A, round 1 | 4.55 / 5.57 ms | 210.1 fps | 6.75 ms |
| B, round 1 | 4.69 / 5.69 ms | 170.3 fps | 10.37 ms |
| A, round 2 | 4.60 / 5.62 ms | 212.0 fps | 6.81 ms |
| B, round 2 | 4.64 / 5.66 ms | 170.9 fps | 10.38 ms |

### 2.2 Each step

`frame_steps.sh` and `frame_p4.sh` measure the end of each step, and the commits inside P4
(`logs/steps-runs.log`, `logs/p4-runs.log`). The time of a frame is 1000 ms divided by the frame
rate with no cap.

| Commit | Frame rate | Time of a frame | Change | Main thread p95 |
|---|---|---|---|---|
| Start `b6d09883` | 210.7 fps | 4.75 ms | | 5.54 ms |
| P1 floor and grade `87d26600` | 203.8 fps | 4.91 ms | +0.16 ms | 5.61 ms |
| P2 bake `d1bb9738` | 187.9 fps | 5.32 ms | +0.42 ms | 5.73 ms |
| P3 capture `cfe9f623` | 189.6 fps | 5.27 ms | −0.05 ms | 5.67 ms |
| P4 lens `7f5d9533` | 187.6 fps | 5.33 ms | +0.06 ms | 5.60 ms |
| P4 haze `4cfd6e1d` | 184.8 fps | 5.41 ms | +0.08 ms | 5.67 ms |
| P4 shot light `81826385` | 170.6 fps | 5.86 ms | +0.45 ms | 5.62 ms |

A second run of `81826385` gave 169.7 fps (`logs/steps-runs.log`), and the start gave 210.1 to
212.0 fps in three runs, so the drift between the runs is below 0.05 ms.

## 3. The result

- The round costs about 1.1 ms of GPU time in each frame of `perf-60.mid` on the high tier
  (4.75 ms to 5.86 ms, +23%). The main thread does not change (p95 5.5 ms to 5.7 ms in each run).
- The two lamps of the shot light cost the most: 0.45 ms. Each lamp is a spotlight in each lit
  pixel of the players, the props, and the stage, and the stage computes two lobes for each light.
  The perf shot is a close shot, so the lamps have light, but a wide shot pays the same cost.
- The bake step costs 0.42 ms: the stage reads 4 texels of the bake and takes 20 shadow samples
  in place of 12 for each pixel. It also took the props out of the shadow map, which saves time.
- The floor and the grade cost 0.16 ms, the lens 0.06 ms, and the haze 0.08 ms. The capture
  costs nothing in each frame.
- The frame target of 9.7 failed before the round, with a GPU p95 of 4.76 ms in the Metal trace
  of 2026-10-13. The round makes the gap larger.

## Unverified

- The Metal trace may give other times than the frame rate with no cap. To check: restart the
  service of Instruments (or the Mac), then run `pnpm frame` on `b6d09883` and on `81826385`.
