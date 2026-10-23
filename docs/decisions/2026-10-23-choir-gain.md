# Decisions of the choir gain

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user found the choir of the Beethoven 9 demo too soft. One synth channel sang
for the full choir at the level of the two oboes, about 9 dB below the orchestra in the tutti.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "make the change". Each choir channel, other than the vocal soloists, gets +6 dB (`CHOIR_GAIN_DB`), so the choir is about 3 dB below the orchestra in the tutti. | 6.1 |
| The gain is a channel gain of spessasynth_core, not CC 7: CC 7 gives only about +4 dB above 100. The engine sets it again after each reset. | 6.1 |
| The fit of the Beethoven 9 demo changes from -11.5 to -10.8 LUFS (`pnpm loudness --fit`). The other demos have no choir. | 6.8 |
