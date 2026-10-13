# Decisions of the frame tools

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

After the merge of the frame-time rounds on 2026-10-13, the manager of the session `zoophony-10`
decided the items of the retrospective
([`2026-10-13-frame-retro.md`](../research/2026-10-13-frame-retro.md)). The first row is a
decision of the manager. The agent of the round `frame-tools` decided the other rows. The user can
reverse each decision. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Manager decision on 2026-10-13: the main-thread phase of `pnpm frame` starts when the CPU use of all cores over 5 s is at most 40% (`--max-cpu`). The tool starts no process before that phase, so the use is the use of the other processes. The tool waits up to 300 s, then refuses with the exit code 2. The 1-minute load average stays in the output for information: it falls slowly after the save of a Metal trace, and runs waited up to 837 s at the old gate. The GPU phase has no CPU gate. Its result is valid when the GPU is in its "Maximum" state for at least 90% of the state time of the trace, and other processes use the GPU in at most 10% of the trace. Else the tool records the GPU phase one more time, and then exits with 2. `--gpu-only` skips the phase at 60 fps | 9.7 |
| The limit of the CPU gate is 40%. At the 1-minute load averages 4.1 to 5.8, below the old limit of 8, the CPU use over 5 s was 15% to 38%. After a run, at a load average of 12.2, it was 40% at the first read (section 3 of the report) | 9.7 |
| The share of "Maximum" is the part of the time of the rows of `gpu-performance-state-intervals`. The table has a row for each state interval that ends in the trace, and a row of "Minimum" of 0.3 ms comes before each rise to "Maximum". The open state at the start and at the end of the trace has no row, so the rows covered 74% to 96% of the span of 17 kept traces. A share of the span would refuse 9 of the 18 kept traces, and the share of the rows refuses 1 (`before1`, one row of 0.3 ms) | 9.7 |
| The GPU row fails with a note when its self-check fails: the canvas buffers that the filter dropped take more than 0.1 ms in each frame, the frame count is more than 2% from the expected count, or a frame holds more than two writes of the canvas. The check uses only the sizes of the surfaces. The expected count is the frame rate of the page in the middle half of the record of `xctrace`, times the span of the WebGL frames. The frame rate of the probe before the trace was 14% to 30% higher, because the trace slows the frames. Over the whole record window, the rate was 1.1% and 2.0% higher in two runs, because the data of the trace starts after the message of the start and ends before the message of the end. The merged frames are a fault of their own: with the filter of `332d09ba`, the kept traces had 0% to 2.6% fewer frames, mostly below the limit of the count | 9.7 |
| `pnpm frame` seeks to 32 s before the Chrome trace and to 16 s before the Metal trace, and waits 1 s. Each trace then lies in one section shot of `perf-60.mid` with the depth of field (32 s to 44 s and 16 s to 26 s). The kept traces ran from 13 s to 17 s, over the end of the solo shot and the start of a section shot. On the same code of the scene, the GPU p50 was 3.99 ms there (`frame1`) and 4.44 ms from 20.2 s to 24.6 s (run 1 of the report) | 9.7 |
| `pnpm frame --keep` writes `run.json` beside the traces: the commit, a flag for a tree with changes, the drawing buffer size, the song times, the loads, the CPU use, the GPU states, the share of other GPU work, and the count of GPU records. `gpu-rows.ts` reads the size from it | 9.7 |
| `pnpm frame` prints the console warnings, the console errors, and the page errors of its pages, with a count of each text | 9.7 |
