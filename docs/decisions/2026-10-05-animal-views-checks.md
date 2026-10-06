# Decision of the checks of the animal views

The Section column names a section of [`design.md`](../design.md).

On 2026-10-05, the agent that made each commit of the animal views pass the checks decided the
detail below. The user can reverse it. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| `pose/pose-speed.test.ts` compares the pose time with a reference work in the same run, and takes the least time of 60 short rounds. The absolute limit of 1 ms failed when the development Mac was under load | 9.7 |
