# Decisions of the SoundFont

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the user asked for a high-quality SoundFont with about 10 MB of samples for each
piece (6.2). The agent of the SoundFont decided the details below. The user can reverse each one.
Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The source of each program of the SoundFont, with GeneralUser GS for each other program and for each key outside the range of the new samples. The basses (43) are a solo player, because no source has a section | 6.2 |
| Mono samples at the rate of the source, up to two velocity layers 4 dB apart, the first round robin, and Ogg Vorbis quality 5 | 6.2 |
| The loops of 1.2 s (strings) and 1 s (winds and brass), the start levels of -9 dB and -12 dB, the pitch correction of the loops, and the lengths of the decaying samples | 6.2 |
| The level match with GeneralUser GS at velocity 100, and the headroom of 6.5 dB for all presets | 6.2 |
| The line of each source in the SoundFont credit: "Sounds: {name} by {author} ({license})." | 2.8 |
