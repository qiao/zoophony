# Decisions of the frame performance

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "optimize the web performance of this repo". The manager of the
session `zoophony-30` gave the time of each frame to the round `perf-frame`, and the load to the
round `perf-load`. The agent of `perf-frame` decided the other rows. The report
[`2026-10-21-frame-performance.md`](../research/2026-10-21-frame-performance.md) gives the
measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user on 2026-10-14: "we can do a sweep of performance improvements later". The manager: this round is that sweep, so the rule "Frame time" of `AGENTS.md` is back. It replaces the last row of `2026-10-14-test-pause.md`. CI has no GPU, so the check stays local (`pnpm frame`). | 9.2, 9.7 |
