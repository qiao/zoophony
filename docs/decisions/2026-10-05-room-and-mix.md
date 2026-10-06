# Decisions of the room and the mix

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the user chose the room and the mix of `research/sound-quality.md` (6.1). The agent
of the room and the mix decided the details below. The user can reverse each one. Then update
the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The hall gets the full stereo mix, and the reverb sends go to a short room of the synth (GS "Room 1", locked), because `processor.ts` keeps one output until the Safari check | 6.1, 6.4 |
| The pan follows the mean place of the players in the default camera view (30° azimuth), at 80 % width, with no correction of the balance | 6.1 |
| The reverb send rises from 40 at 2.4 m to 80 at 7.2 m from the podium center. A channel with no player gets the pan 64 and the send 60 | 6.1 |
| The synth has no chorus, and the file keeps its CC 93, which does nothing | 6.1 |
| The impulse response: position C8m, the direct sound and the reflection 2 ms after it removed (the first 4 ms), 2.5 s, 16-bit stereo WAV at 48 kHz (480 KB), decoded by `decodeAudioData()` | 6.2, 6.8 |
| The wet gain 0.0625 (a hall share of about 20 %), and the dry gain 1 | 6.8 |
| The limiter: -2 dBFS, knee 0, ratio 20, attack 2 ms, release 150 ms, with a trim of -1.14 dB that removes the makeup gain | 6.8 |
| Each demo gets a gain to -18 LUFS after the limiter, from an offline render through the code of the chain in headless Chromium (UX audit SD1). A file of the user gets 0 dB | 6.8 |
| `PlayerScore` has the required fields `mix` and `gainDb`, so each caller sends the stage mix. A change of the section size keeps the mix that the `Player` holds | 6.8 |
| A failed fetch of the impulse response is a failed start of the engine | 6.8 |
