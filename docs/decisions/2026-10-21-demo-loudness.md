# Decisions of the demo loudness

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "the volume is very low for some demos like beethoven-8". The agent
of the branch `demo-loudness` decided these rows, with the measures of
[`research/2026-10-21-demo-loudness.md`](../research/2026-10-21-demo-loudness.md). The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| `pnpm loudness --fit` gives each value of `DEMO_LOUDNESS`, in steps of 0.1 dB, to within 0.05 LU of the target. The eight demos of 2026-10-14 had values that no render measured, and seven of them played 1.0 to 7.8 LU above the target (`tools/loudness.ts`). | 6.8 |
| The limiter: -3 dBFS, knee 0, ratio 20, attack 2 ms, release 150 ms, with the trim -1.71 dB that removes the makeup gain. At -2 dBFS, Boulanger at -16 LUFS reached -0.71 dBTP, and at -2.5 dBFS -1.09 dBTP (`LIMITER`). | 6.8 |
| The target is -16 LUFS after the limiter, the music loudness of AES TD1008. At -14 LUFS (Spotify), Boulanger reached -0.16 dBTP with the limiter of -2 dBFS, and K. 315 had more than 1 dB of gain reduction in 3 % of the blocks (`TARGET_LOUDNESS`). | 6.8 |
| A file of the user keeps the gain 0 dB, and a demo keeps its range. The fit moves the gain in steps of 0.1 dB until the demo is within 0.05 LU of the target (`fit()` of `tools/loudness.ts`). | 6.8 |
