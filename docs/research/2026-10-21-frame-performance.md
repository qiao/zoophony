# Frame performance of the stage

Date 2026-10-21. Round `perf-frame` (user: "optimize the web performance of this repo").
Decisions:
[`2026-10-21-frame-performance.md`](../decisions/2026-10-21-frame-performance.md). The probes and
their logs are in [`2026-10-21-frame-performance/`](2026-10-21-frame-performance/). Each command
runs from the root of the tree.

## 1. The question

The target of design 9.7: on the high tier with `perf-60.mid`, the GPU time and the main-thread
time are each at most 4 ms for 95% of the frames. The round cuts each frame with the same pixels,
and measures the options that change the look for the user.

## 2. The Metal trace

On 2026-10-18, `xctrace` failed with "Error connecting to DTServiceHub". Now a record of 1 s took
11 s with no error, and each run of `pnpm frame` gave the GPU row. The Mac restarted on 2026-10-19
at 23:46 (`uptime`), the fix that the report of 2026-10-18 named. The GPU guards passed in each
run.

## 3. The baseline

`pnpm frame` on `0bd2e24a`, three runs (`logs/frame-base*.txt`). Times in milliseconds.

| Run | Main thread p50 / p95 | GPU p50 / p95 | Frame rate with no cap |
|---|---|---|---|
| `base1` | 7.21 / 8.29 | 6.16 / 6.80 | 118.7 fps |
| `base2` | 7.55 / 9.22 | 6.16 / 6.58 | 115.8 fps |
| `base3` | 7.16 / 8.83 | 6.21 / 7.00 | 116.6 fps |
| Median | 7.21 / 8.83 | 6.16 / 6.80 | 116.6 fps |

The main thread is 2.6 ms above the p50 of 2026-10-18 (4.64 ms).

### 3.1 The main thread by function

`cpu-profile.ts` samples 10 s of the section shot at 32 s (`logs/cpu-base.txt`). Total time for
each frame:

| Function | Time | Cause |
|---|---|---|
| `Skeleton.update()` | 1.65 | three.js computed the 4,514 bone matrices three times in each frame: in the depth pass of the beam, in its shadow pass, and in the depth pass of the depth of field |
| `applyStudioPose()` | 1.48 | the pose of the 74 bones of each studio body, and their copy into the bones |
| `WebGLRenderer.getProgram()` | 1.08 | one material for several program variants: the shared material and the override materials of the depth passes looked up a program at about each player |
| `projectObject()` | 1.52 | with the visits of the 4,514 bones in each render, and the skeleton updates |
| `WebGLShadowMap.render()` | 1.80 | three maps of all players, with the visits of the bones |
| `poseAt()` | 0.37 | the pure pose |

### 3.2 The WebGL calls of one frame

`gl-calls.ts` at 6 s of play, the wide shot (`logs/gl-base.txt`): 327 draws, 139 program
changes, and 61 bone texture uploads (122 with the depth of field). Each shadow map had 16 program
changes for 61 draws, the depth pass of the beam 41, and the scene pass 46.

### 3.3 The GPU passes

`encoders.ts` on the Metal trace of `base1` (`logs/encoders-base1.txt`): the scene pass with MSAA
takes 2.67 ms of fragment time and 0.96 ms of vertex time. Each of the three shadow maps and the
depth pass of the beam takes 0.35 ms to 0.49 ms of vertex time: the skinned bodies with morph
targets. An ablation turns one part off with a patch that stays out of the code
(`ablations/*.patch`). With the Metal trace on the tree `87cdec75` of section 4
(`logs/frame-tabl-*.txt`):

| Part turned off | GPU p50 / p95 | Change of p50 |
|---|---|---|
| None (`logs/frame-opt-none.txt`) | 5.66 / 5.87 | |
| The depth of field: its depth pass and its two blur passes | 5.04 / 5.84 | -0.62 |
| The bloom: 11 passes | 5.46 / 5.83 | -0.20 |
| The room haze of the final pass | 5.70 / 6.02 | +0.04 |
| The two back-row lights | 5.25 / 5.48 | -0.41 |

Four runs of one tree gave p50 from 5.64 ms to 5.68 ms, so the haze costs nothing measurable. On
the base, the main thread with no depth of field had p50 5.90 ms against 7.21 ms
(`--no-metal`, `logs/frame-abl-*.txt`).

## 4. The cuts with the same pixels

`frozen.ts` holds the song time and the wall time, and writes four shots: the default play view,
the conductor shot, and the wide shot and the section shot (with the depth of field) of
`perf-60.mid`. `pixel-diff.py` compares each commit with the base (`logs/pixels-*.txt`). Two runs
of the base gave the same pixels. The hashes are the measured commits before the rebase onto
`main`. The commits keep their subjects.

| Commit | Cut | Changed pixels |
|---|---|---|
| `5a820e3b` | One computation of the bone matrices in each frame (`FrameSkeleton`) | 0 |
| `5c5152c1` | A copy of the shared material for each program variant, with its shadow depth material | 1 or 2 in three shots, at most 14 of 255 |
| `c4a9c532` | A depth material for each variant in the depth passes | as above |
| `3c0879cd` | One material for each side of the haze cone | as above |
| `f357d3e8` | The culling of the players with a sphere of the pose of each frame | as above |
| `15e0a7f2` | The opaque draws in the order of the shared material | 0 |
| `94052860` | The bones in a hidden group | 0 (with the next commit) |
| `6718be4d` | The copy of the bone matrices by index | 0 |

The copies of `5c5152c1` changed the order of the draws of the players, so two draws at one
depth of a sample came in the other order. `15e0a7f2` gives the old order back.

The culling needs a sphere that holds each posed vertex. Each bone matrix of a player is a turn, a
move, and a scale of at most 1, and the weights of a vertex sum to 1, so a posed vertex lies in
the hull of the moved bone spheres. `sphere-check.ts` skinned 9,431,328 vertices on the CPU at 16
song times: each one lay inside its sphere (`logs/sphere-check.txt`).

Three examples of the brief gave no cut. The idle motion moves the players in each frame, so the
shadow maps render in each frame. A hidden tab gets no animation frame. The static objects took
0.04 ms of matrix work.

## 5. Before and after

`pnpm frame` on the tip `6718be4d`, three runs (`logs/frame-tip2.txt` to `frame-tip4.txt`).

| Measure | Before (`0bd2e24a`) | After (`6718be4d`) |
|---|---|---|
| Main thread p50 / p95, median of 3 runs | 7.21 / 8.83 ms | 3.75 / 4.74 ms |
| Main thread p95 of each run | 8.29, 9.22, 8.83 ms | 5.47, 4.63, 4.74 ms |
| Main-thread frames within 4 ms, median | 0.0% | 71.8% |
| GPU p50 / p95, median of 3 runs | 6.16 / 6.80 ms | 5.70 / 5.89 ms |
| Frame rate with no cap, median | 116.6 fps | 129.9 fps |
| Main thread of a frame in the CPU profile | 7.80 ms | 3.62 ms |
| `Skeleton.update()` / `getProgram()` in the CPU profile | 1.65 / 1.08 ms | 0.20 / 0.00 ms |
| Draws / program changes / bone uploads at 6 s (wide shot) | 327 / 139 / 61 | 321 / 105 / 61 |
| Phone proxy (section 7), two runs | 51.7, 54.2 fps | 60.0, 60.0 fps |
| Load to 2 s after play: `computeBoundingSphere()` / `setProgram()` | 193 / 547 ms | 3 / 381 ms |

The runs between the cuts give their shares (`logs/frame-c1.txt`, `frame-tip1.txt`,
`frame-fin*.txt`): the first four cuts took the main thread to 4.77 / 5.71 ms, the culling took
the GPU from 6.30 / 6.49 ms to about 5.67 / 5.86 ms, and the bone group with the copy took the main
thread to 3.75 / 4.74 ms. Both targets still fail at p95.

The fitted sphere also ends a cost of the load that `perf-load` found: three.js skinned each player
on the CPU at its first render (`computeBoundingSphere()`, `load-profile.ts`).

## 6. The options that change the look

Each option is a patch on the tip (`options/*.patch`) with one `pnpm frame` run
(`logs/frame-opt-*.txt`). `options/<name>.webp` puts the tip beside the option: the section shot
at a third of its size, and two crops at full size.

| Option | Patch | GPU p50 / p95 | Main thread p50 / p95 | Changed pixels: largest, part above 16 |
|---|---|---|---|---|
| The tip, with no option (`87cdec75`) | | 5.66 / 5.87 | 4.63 / 5.61 | 0 |
| a. MSAA with 2 samples in place of 4 | `msaa2` | 5.20 / 5.37 | 4.91 / 5.83 | 161 to 197, 0.26% to 0.73% |
| b. No MSAA on the float target | `msaa0` | 4.79 / 5.09 | 4.83 / 5.84 | 204 to 226, 0.56% to 1.57% |
| c. The high tier at the device scale 1.5 | `ratio15` | 3.92 / 4.06 | 4.68 / 5.58 | 155 to 165, 0.56% to 1.71% |
| d. 16 samples of the depth of field in place of 32 | `blur16` | 5.43 / 5.63 | 4.72 / 5.73 | 5, 0% (shots with the depth of field only) |
| e. The shadow maps of the side lights at 512 | `side512` | 5.62 / 5.80 | 4.64 / 5.64 | 49 to 145, 0.12% to 0.61% |
| f. 12 shadow samples of the baked stage in place of 20 | `bake12` | 5.38 / 5.53 | 3.44 / 4.35 | 27 to 34, 0.01% to 0.06% |
| g. The depth of field reads the depth of the beam | `dof-beam-depth` | 5.60 / 5.81 | 4.44 / 5.47 | 111, 0.03% (shots with the depth of field only) |
| h. 30 fps while the song pauses | `pause30` | not measured | not measured | 0 in each frame |

Option f ran on `6718be4d`, so its rows compare with section 5. The first run of option b ended
while a probe of another agent used the machine (manager, 21:37), so the table gives a second run.
The first gave 4.77 / 4.95 ms.

- **c** alone passes the GPU target. The whole image is softer.
- **a** and **b** show more steps on the thin lines (bows, strings, legs of the stands), and **b**
  on each edge.
- **d** and **f** change almost nothing that the eye sees, and save 0.24 ms and 0.36 ms of p95.
- **e** saves 0.07 ms: the cost of a shadow map is the vertex work of the skinned players.
- **g** gives a rim of one to two pixels on the back-row heads in the shots with the depth of
  field, and saves little after the culling.
- **h** halves the work while the song pauses. The idle motion then moves at 30 fps.

## 7. The low tier as a phone

`phone-frame.ts` plays the default demo at 390 × 844 at the device scale 3 with touch, so the app
starts at the low tier, with a CPU throttle of 4. The GPU stays the GPU of the Mac, so this is a
proxy. Design 9.4 keeps the test on a real phone.

| Tree | Frame rate, two runs | Frame interval p50 / p95 |
|---|---|---|
| Base `0bd2e24a` | 51.7, 54.2 fps | 16.7 / 33.4 ms |
| Tip `6718be4d` | 60.0, 60.0 fps | 16.7 / 16.7 ms |

The task S2 of step 7 is fixed: a window at 50 Hz permits the share of missed frames of 60 Hz.
With 1% missed frames, the tier dropped in 8.8% of the minutes before and in 0.0% after, and 60 Hz
did not change (`tier-drop.ts`, `logs/tier-drop-*.txt`).

## 8. Open problems

- The target still fails (GPU p95 5.89 ms, main thread 4.74 ms). Only option c passes the GPU
  target alone. The user chooses.
- Each pass skins the players again in its vertex shader: 0.2 ms to 0.5 ms of GPU time for each
  shadow map and depth pass (`logs/encoders-*.txt`). One skin in each frame can cut it.
- `poseStudioBones()` takes about 0.5 ms of each frame (`logs/cpu-tip.txt`).
- The compile of the shaders in the first frame (found by `perf-load`): `setProgram()` took 547 ms
  on the base and 381 ms on the tip, from the load to 2 s after play (`logs/load-*.txt`). A
  warm-up with `compileAsync()` can cut it, with the same first frame.
- 6 of the 13 tests of the paused file `scene/player.test.ts` fail on `main` too.
