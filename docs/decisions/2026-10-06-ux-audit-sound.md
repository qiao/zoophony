# Decisions of the sound findings of the UX audit

The Section column names a section of [`design.md`](../design.md).

On 2026-10-06, the agent of the sound findings of the UX audit decided the details below. The
user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The volume slider and the mute button set a gain node after the limiter, with the time constant 30 ms: a mute falls by 60 dB in 0.21 s, and the tail of the hall stops with it (UX audit SD2) | 6.6, 6.8 |
| A seat mute keeps the release of the voices, and the room and the hall ring on (UX audit SD2) | 6.6 |
| The target of the demo loudness is -18 LUFS after the limiter. The gain moves in steps of 0.1 dB until the demo is within 0.05 LU (UX audit SD1) | 6.8 |
