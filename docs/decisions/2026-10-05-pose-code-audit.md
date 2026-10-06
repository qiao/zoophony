# Decision of the pose code audit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent that applied the audit of the pose code decided the detail below. The
user can reverse it. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Each player note carries the synth channel of its note on. Two channels of a merged seat can play the same key at the same time, and each note then reads the controllers of its own channel for the gesture size | 3.2, 5.3 |
