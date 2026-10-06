# Decisions of the step 5 app wiring

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-05, the agent of the step 5 app wiring decided the details below. The user can
reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The app poses each demo with the seed 1, so that a demo has the same seeded offsets and idle motion on each visit | 5.1, 5.3 |
| After a failed load, a failed start of the audio module, or an audio failure during play, the app pauses the transport and the play buttons show "Play". A click loads the audio again and plays when it is ready (review of step 5, F9) | 2.2, 6.8 |
| When `Player.now()` reaches the song length during play, the app sets the transport to paused at that wall time, because the processor pauses there (6.5). After a play, this check waits until `now()` reads less than the song length, so that a play at the end keeps playing (review of step 5, F1) | 5.2, 6.5 |
| The smoke test runs on the Vite dev server, which alone gives `window.zoophony`, and it also checks the turn of the bow arm of the first violin after the downbeat | 9.3 |
| The gallery plays the test notes with the velocity 100 and a seat for each player, the bear conducts them in 4/4 at 120 BPM, and the players look straight ahead | 7.1 |
| `perf-60.mid` starts one chord on each seat each second, for 0.5 s at 120 BPM. Only the dev server serves it, from `perf/` | 9.5 |
| The frame target measures the GPU time with a timer query, because the `GPUTask` slices of a Chrome trace are the CPU time of the GPU process. It measures at the device scale 2 of the development Mac | 9.7 |
