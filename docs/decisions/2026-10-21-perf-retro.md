# Decisions of the performance retro

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The user asks for a retro after each merge. The manager decided the items of the retro of the
rounds `perf-load`, `perf-hall`, and `perf-frame` on 2026-10-21, and applied them with no
question to the user. The user can reverse each decision. Then update its section, and remove its
row.

| Decision | Section |
|---|---|
| Each timed measure runs through a fair lock: a queue of tickets, an owner check by PID, and a CPU gate before the lock (`tools/measure-lock.sh`, `docs/agents/workflow.md`). | 9.7 |
| A load round measures with `pnpm load-probe`, because the Lighthouse tool of the chrome-devtools server has no performance category (`tools/load-probe.ts`). | 9.7 |
| `pnpm frozen` compares the frozen shots of two commits, pixel by pixel (part F of the retro). | 9.7 |
| `pnpm cpu-profile` and its callers script give the time of each function (part F of the retro). | 9.7 |
| `pnpm frame-compare` runs `pnpm frame` for several commits through the lock, as the last step of part F. | 9.7 |
| The docs give the Lighthouse gap, the Metal trace of an ablation of a GPU cost, and the draw order after a change of the material IDs (`docs/agents/workflow.md`). | 9.7 |
| The manager rejected fixed time slots for each agent: the queue of the lock gives the same order with no idle slot. | 9.7 |
| A frame round starts when no other session runs a sweep, or its brief names the load. This is a practice of the manager. | 9.7 |
