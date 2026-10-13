# Decisions of the frame time

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-12, `node tools/measure-frame.ts` found the GPU time of the frame target of design 9.7
at 15 to 19 ms (p95) on `main`. The user approved a fix round on 2026-10-12 and on 2026-10-13.
The manager of the session `zoophony-10` decided the first row, and told the user. The agent of
the round `frame-perf` decided the other rows. The report
[`2026-10-13-frame-time.md`](../research/2026-10-13-frame-time.md) gives the facts and the
measures. The user can reverse each decision. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| Manager decision on 2026-10-13, the user was told: the GPU time of the frame target is measured with no frame cap, so that the GPU runs at its highest clock. At 60 fps, the GPU of the development Mac stays in its lowest performance state for about 77% of the time, so the timer query measures the clock more than the work. The GPU target row is the time of the WebGL frames in a Metal System Trace with no frame cap. A WebGL frame starts at the command buffer with the clear of the drawing buffer. When the clear has no label, a frame also starts at a write of the canvas after the final pass. A command buffer with the clear or a write of the canvas counts. Each other command buffer that reads or writes a surface of another size than the drawing buffer is work of the compositor, and does not count (fix rounds of the reviews, 2026-10-13). The tool also prints the timer query with no frame cap and at 60 fps (the old method), for information. On ANGLE on Metal, the timer query with no frame cap gets the whole command buffer with its wait in the full queue of the GPU: its p50 was above the frame interval. The main-thread time keeps its method | 9.7 |
| `pnpm frame` runs the measure. It exits with 1 when a target row fails. The gate before each phase went to [`2026-10-13-frame-tools.md`](2026-10-13-frame-tools.md) | 9.7 |
| Each change of `src/scene/`, of a shader, or of the post effects runs `pnpm frame` before its report. CI has no GPU, so the check stays local | 9.7 |
| The probe of the title backdrop takes the pixels of a finished read at the start of a frame, before the render. After the render, the copy waited 1.6 to 1.8 ms for the GPU process to run the commands of the frame, one time in each 9 to 10 frames. At the start of a frame, it waits about 0.8 ms | 2.8, 9.7 |
| Each read of the title backdrop gets a new pixel buffer. With one buffer for all reads, Chrome discarded its CPU copy of each fenced read, and printed a performance warning at each read | 2.8 |
| The MSAA target of the scene resolves only its color (`resolveDepthBuffer = false`). No pass reads its depth. Frozen frames of the default play view, the conductor shot, and the wide shot of `perf-60.mid` keep the same PNG bytes | 4.5, 9.7 |
| The temporary switches that turned off parts of the scene (`?off=`) do not go into the code. They read the URL in the scene modules, and the Metal trace gives the time of each encoder with no switch | 9.7 |
| The depth pass of the beam renders the shadow map of the frame, and the scene pass keeps it. It replaces the rule of 2026-10-06 that the depth pass does not count as a frame of the renderer. With that rule, the shadow pass in the scene pass updated each skeleton a second time, after the depth pass drew with it. Each bone texture then uploaded two times in each frame, and on ANGLE on Metal the second upload split the shadow pass into 10 small passes with a copy before each one. Frozen frames keep the same PNG bytes | 4.5, 9.7 |
