# The retrospective of the frame-time rounds (2026-10-13)

On 2026-10-13, three rounds worked on the frame target of design 9.7: the round `frame-perf`, a
first fix round, and a second fix round, each with a review except the last. They merged at
`a6cdc400`. The user rule of 2026-10-12 asks for a retrospective after a merge, and the manager
decides and applies the items that are worth the cost. The round `frame-tools` applied them.

The logs and the traces of the rounds are in the scratchpad of the session `zoophony-10`, outside
the repository: `fp-runs/`, `fix-runs/`, and `fix2-runs/` hold one `<run>.log` and one folder of
`pnpm frame --keep` for each run, and `review-frame-perf/frame/` holds the trace of the first
review. The logs of the round `frame-tools` are in
[`2026-10-13-frame-retro/`](2026-10-13-frame-retro/).

## 1. The times

| Step | Minutes | Source |
|---|---:|---|
| Round 1: implementation | 84 | agent time |
| Round 1: review | 14 | agent time |
| Fix round 1, with the options a to e | 82 | agent time |
| Review of fix round 1 | 10 | agent time |
| Fix round 2 | 22 | agent time |
| Merge | 3 | agent time |

Two faults of the GPU row reached a review. The filter dropped the first command buffer of each
frame, about 0.7 ms, and it merged two frames when a clear had no label. The kept logs hold 24
runs of `pnpm frame`. In 16 of them, a phase waited at the load gate. The waits took 321 polls of
10 s, about 54 minutes (the lines "waits" of the logs). Five runs refused after 300 s (`after3`,
`cut2`, `ab1`, `ab2`, and `ab3`), and the longest run that passed took 837 s (`final1`). In the
runs that passed, other
processes used the GPU in 0% to 8% of the Metal trace, and 27% in `after1` and 50.5% in
`before1` (section 7 of [`2026-10-13-frame-time.md`](2026-10-13-frame-time.md)).

## 2. Decisions

| Proposal | Saves for each similar round | Cost | Decision |
|---|---:|---:|---|
| Self-check of the GPU row: dropped time and frame count | 30 to 45 min | 20 to 30 min | applied (`64cc9d9d`, `e247206f`, `b1525e2a`, `1d8a77ec`, `9f1f6e70`) |
| A fixture from a real trace, and the known faults of the trace in TSDoc | 20 min | 25 min | applied (`756dd859`) |
| A GPU-phase guard on the GPU states and other GPU work, a CPU gate over 5 s, `--gpu-only` | 15 to 20 min | 40 min | applied (`5150b144`, `80aff191`, `d6c6cb17`, `f0870724`) |
| A seek to fixed song times before each trace | 15 min | 20 min | applied (`97793107`, `bdeb1ad7`) |
| `run.json` beside each kept trace | 8 min | 15 min | applied (`cace29b1`, `58219c02`) |
| Console warnings in `pnpm frame` | 10 min | 10 min | applied (`f1fa89b2`) |
| Rules: no `vi.mock` seam, a filter checks its count, each number names its log | 6 to 40 min | 10 min | applied (`794a84dc`) |
| A lock of the machine during a measure round | 20 min | 5 min | rejected: the manager already runs a measure round alone, and the other load came from other sessions of the user, which a lock does not stop |
| A brief rule that the user closes each page that renders | 10 min | 1 min | rejected: the GPU-phase guard finds that work and records again |
| Brief facts about `xctrace` (`--all-processes`, no timer query of each pass) | 12 min | 1 min | applied: research sections 2 and 3 of [`2026-10-13-frame-time.md`](2026-10-13-frame-time.md) hold them, and a frame brief starts from that report |
| `pnpm frame-options <patch>...`: measure, frozen frames, pixel differences, and the image of each option | 20 min | 45 min | deferred: it helps only when the user chooses an option of `TODO.md` step 8 |
| `pnpm frame --base <ref>` from a temporary copy | 4 min | 25 min | deferred: small gain |
| A WebGL call probe in `pnpm frame` with a warning for a second bone upload | 15 min | 40 min | deferred: the probe `gl-calls.ts` of the research folder exists |
| A saved timeline probe of the buffers | 10 min | 20 min | deferred: the self-check prints the dropped buffer types |
| `gpu-rows.ts --base <ref>` | part of 8 min | 10 min | deferred: `run.json` gives the size, the main part of the gain |
| The manager saves the reply of an agent as its report | 2 min | 1 min | applied: the briefs say that the reply is the report |

## 3. Measured gains

### 3.1 The check on the old filters

`node docs/research/2026-10-13-frame-time/filter-check.ts <ref> <dir>...` runs the self-check
with the filter of a commit on the 18 kept Metal traces
([`filter-check.txt`](2026-10-13-frame-retro/filter-check.txt)). The kept traces have no frame
rate of the page during the trace. The expected count comes from the command buffers that write
the canvas (`canvasWriteFrames()`), as in `pnpm frame` since `9f1f6e70`.

| Filter | Traces that pass | Traces that fail | Faults |
|---|---:|---:|---|
| `a6cdc400` (`main` at the start of the round, the same filter as the tip) | 18 | 0 | none: no dropped canvas buffer, at most 0.8% from the expected count, and no merged frame |
| `e584e16f` (the dropped first buffer) | 0 | 18 | 0.73 to 3.44 ms of dropped canvas buffers in each frame in the 10 traces before the cut, and 2.9 to 3.0 times the expected count in the 8 traces after it |
| `332d09ba` (the merged frames) | 2 | 16 | 1 to 13 merged frames. The traces `cut1` and `a` have no clear with no label, so the filter gives the frames of `main` there |

### 3.2 The gate of the main-thread phase

`node docs/research/2026-10-13-frame-time/gate-wait.ts` ran right after the end of run 1 of
section 3.3, on the same load ([`gate-wait.txt`](2026-10-13-frame-retro/gate-wait.txt)). The
load average was 12.2 at the first read. The CPU gate of 40% passed after 10 s, and the old gate
of a load average of 8 passed after 60 s. The agent ran the lint and the tests in the first 20 s
of the probe, so both times are high.

Before the choice of the limit, the same read of the CPU use gave 15% to 38% at load averages of
4.1 to 5.8 ([`cpu-samples.txt`](2026-10-13-frame-retro/cpu-samples.txt)). The agent ran short
checks during some of these reads.

### 3.3 The run time of `pnpm frame`

The round ran `pnpm frame --keep=<dir>` six times. The files `run<k>.txt` of
[`2026-10-13-frame-retro/`](2026-10-13-frame-retro/) give the output and `run.json` of each run.

The load averages are at the start of the main-thread phase, at the start of the GPU phase, and at
the end. The times are p50 / p95 in milliseconds. Chrome updated itself from 155.0.8059.40 to
155.0.8059.41 before run 6.

| Run | Code | CPU use | Load averages | Run time | Main p50 / p95 | GPU p50 / p95 | Self-check |
|---|---|---:|---|---:|---|---|---|
| 1 | `f1fa89b2` | 34% | 12.9, 13.0, 13.9 | 173 s | 3.19 / 4.24 | 4.44 / 4.63 | pass, page count 1.1% above the trace |
| 2 | `794a84dc` | 34% | 8.2, 8.6, 19.7 | 174 s | 3.23 / 4.12 | 4.43 / 4.66 | fail, page count 2.0% above the trace |
| 3 | `17cfe2c9` | 16% | 9.8, 9.9, 18.7 | 172 s | 3.27 / 4.25 | 4.43 / 4.63 | fail, page count of the middle 2.7% above the trace |
| 4 | `df4a693d` | 13% | 4.8, 6.1, 8.1 | 179 s | 3.23 / 4.18 | 4.45 / 4.63 | pass, 640 frames against 640 from the canvas writes |
| 5 | `df4a693d` | not printed | not printed | 421 s | stopped | stopped | stopped: `xctrace` did not save in 360 s |
| 6 | `df4a693d` | 25% | 4.9, 4.7, 19.0 | 179 s | 3.47 / 4.35 | 4.51 / 4.80 | pass, 590 frames against 590 from the canvas writes |

No run waited at the CPU gate. The old gate of a load average of 8 would have waited before runs
1, 2, and 3. In the kept logs of the frame-time rounds, a run with no wait took 170 to 221 s
(8 runs), and a run with waits took up to 837 s.

Run 5 stopped with the exit code 2 after 421 s: `xctrace` did not save its trace within the limit
of 360 s of the tool. The tool closed its browsers, `xctrace`, and the server. No other run of the
rounds hit this limit.

The self-check of run 2 failed: the page drew 2.0% more frames than the trace held, against a
limit of 2%. The trace held no merged frame and no dropped canvas buffer. Runs 1 to 3 and a run
with `--gpu-only` gave 1.1% to 2.7% more frames on the page, also with the marks from
`performance.now()`. Since `9f1f6e70`, the count of the self-check comes from the canvas writes
of the trace, and the four traces give the same count as the filter
([`filter-check.txt`](2026-10-13-frame-retro/filter-check.txt)). The count of the page stays in
the output for information.

## 4. Facts of this round

- The Metal trace slows the frames of the page. In the 18 kept traces, the WebGL frames of the
  trace ran 14% to 30% below the frame rate of the probe just before the trace: the frames and
  the span of `filter-check.ts`, against the line "Frame rate" of each log.
- The page draws more frames than the trace holds while `xctrace` records: 1.1% to 2.7% in four
  runs (section 3.3). The cause is open.
- The rows of `gpu-performance-state-intervals` covered 74% to 96% of the span of 17 kept traces
  (`state-rows.ts`, [`state-rows.txt`](2026-10-13-frame-retro/state-rows.txt)),
  and the trace of `before1` had one row of 0.3 ms. A row of "Minimum" of 0.3 ms comes before each
  rise to "Maximum", and the open state at the start and at the end of a trace has no row. The
  share of "Maximum" in the time of the rows was at least 99.9% in each trace but `before1`. A
  share of the span of the trace would refuse 9 of the 18 kept traces.
- Chrome turns through five canvas surfaces in the trace of the run `e`. The filter counts a
  canvas surface only when a clear with a label writes it, so the fixture of a real trace holds
  frame 571 for the surface of the clear with no label of frame 579.
- `shot-focus.ts` gives the shots of `perf-60.mid`: wide to 8 s, solo to 16 s, section to 26 s,
  side to 32 s, section to 44 s, conductor to 50 s, and wide to the end. The depth of field is on
  from 8 s to 50 s. The kept traces ran from 13 s to 17 s, over the cut from the solo shot to the
  section shot.
