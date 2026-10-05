# Step 2 targets: score build, audio render, and memory

Date of the measurements: 2026-10-05.

This report gives the result of each step 2 target of design 9.7, and the time of a late seek
(review of step 1, finding F14). The raw output of the three runs is in
[`step-2-targets/`](step-2-targets/). "Not verified" marks a fact that no measurement confirms.

## 1. Machine and code

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, 64 GB, macOS 26.5 (25F71) |
| Node | 24.10.0 (V8 13.6) |
| Code | Commit `dadbf93`, with the six demo files after `demos/patches.json` (design 8.3) |
| Load | Another agent worked on the same Mac during the runs. The load average was 4.8 to 7.3 (in the first line of each raw file) |

## 2. Method

`node tools/measure-targets.ts` does these steps for each demo:

1. Build the `Score` with `buildScore(bytes, 'auto')`. Time five builds, and keep the median.
2. Convert each preset of the score to a PCM SF2 file with `testBanks()`. This is the conversion
   of the decode Worker (design 6.3). Sum the sizes.
3. Make a new `SynthEngine` at 48 kHz, load the score and the banks, and play from 0 to the end.
4. Time each call of `render()` with `performance.now()`. Clear the output buffers before each
   block, outside the timed part, because spessasynth_core adds into them
   ([`webkit-audio.md`](webkit-audio.md)).

The script then times a late seek in the demo with the most events (section 6). It marks a slow
block with "GC" when a garbage collection of V8 overlaps it (`PerformanceObserver`, entry type
`gc`).

All demos render in one Node process, in the order of their file names. Thus `beethoven-5.mid`
renders with cold code, and the later demos render with the JIT already warm.

`src/audio/pcm-memory.test.ts` checks the memory target in each `pnpm test` run (0.8 s). The
render script takes about 55 s, so it is not a Vitest test. It exits with 1 when a target fails.

## 3. Score build

Target: at most 100 ms for the largest demo.

| Demo | Synth events | Build, median of 5 (ms), runs 1 to 3 |
|---|---|---|
| `beethoven-5.mid` | 16,614 | 15.0, 15.6, 13.1 |
| `boulanger-matin.mid` | 24,514 | 17.8, 15.7, 15.9 |
| `grieg-ase.mid` | 1,748 | 1.2, 1.5, 1.6 |
| `handel-hallelujah.mid` | 9,894 | 7.6, 7.7, 7.9 |
| `mozart-k315.mid` | 4,664 | 3.1, 3.3, 3.0 |
| `mozart-k488.mid` | 5,033 | 2.9, 5.4, 3.3 |

Verdict: **pass**. The largest demo (Boulanger) builds in at most 17.8 ms, 18 % of the target.
The timed Vitest test in `src/score/demos.test.ts` checks the same target.

## 4. Audio render

Target: at most 1.3 ms for each 128-frame block (half of the block length of 2.667 ms).

| Demo | Blocks | Median (ms) | p99 (ms) | p99.9 (ms) | Max (ms), runs 1 to 3 | Blocks above 1.3 ms | Blocks above 2.667 ms |
|---|---|---|---|---|---|---|---|
| `beethoven-5.mid` | 118,711 | 0.080 | 0.166 to 0.169 | 0.255 to 0.271 | 3.302, 3.112, 3.170 | 5, 6, 3 | 2, 1, 1 |
| `boulanger-matin.mid` | 105,251 | 0.102 to 0.103 | 0.303 to 0.310 | 0.411 to 0.529 | 5.021, 1.753, 4.661 | 5, 4, 4 | 2, 0, 1 |
| `grieg-ase.mid` | 81,000 | 0.053 to 0.054 | 0.080 to 0.082 | 0.244 to 0.260 | 1.489, 1.344, 1.218 | 1, 1, 0 | 0, 0, 0 |
| `handel-hallelujah.mid` | 70,500 | 0.115 to 0.116 | 0.202 to 0.206 | 0.301 to 0.381 | 1.765, 3.164, 8.205 | 2, 4, 4 | 0, 1, 3 |
| `mozart-k315.mid` | 95,625 | 0.057 to 0.058 | 0.102 to 0.104 | 0.215 to 0.239 | 3.148, 1.302, 2.066 | 1, 1, 4 | 1, 0, 0 |
| `mozart-k488.mid` | 157,902 | 0.058 to 0.059 | 0.090 to 0.092 | 0.209 to 0.230 | 2.362, 1.613, 2.328 | 4, 1, 3 | 0, 0, 0 |

Verdict: **fail by the letter of the target**. The p99 is at most 0.31 ms, and the p99.9 is at
most 0.53 ms. But each run has 0 to 6 blocks above 1.3 ms in each demo, out of 70,500 to
157,902 blocks. The slow blocks have three causes:

1. **Cold code at the first notes.** In all three runs, the block at 0.15 s of the first demo of
   the process takes 3.1 to 3.3 ms. In one extra run with `mozart-k488.mid` first (not in the
   raw files), `beethoven-5.mid` had no slow block near 0 s. In run 1, `boulanger-matin.mid` also had blocks of 5.0 ms and 4.0 ms
   at 0.00 s and 0.12 s. This agrees with the slow first block of the spike (spike report,
   section 8, item 2). The warm-up task of step 2 addresses it.
2. **Noise.** All other slow blocks move between runs. Few of them overlap a garbage collection.
   The Mac was busy with another agent (load average 4.8 to 7.3), and the Node main thread has
   no real-time priority. Not verified: the cause of each block.
3. **One heavy block.** The block at 52.12 s of `boulanger-matin.mid` takes 1.305 and 1.308 ms
   in runs 2 and 3, and 1.326 and 1.329 ms in two earlier runs. In run 1, it took at most
   1.3 ms. This block is just above the target in most runs.

The target counts each block. Thus the result depends on the load of the machine. A
percentile target, such as the p99.9 at most 1.3 ms, passes in all runs by a factor of 2.4 or
more. The user decides if the target changes (TODO, step 2).

## 5. Memory

Target: at most 100 MB of decoded samples for each demo.

| Demo | Presets | PCM SF2 size (MB) |
|---|---|---|
| `beethoven-5.mid` | 11 | 5.9 |
| `boulanger-matin.mid` | 17 | 9.0 |
| `grieg-ase.mid` | 4 | 3.3 |
| `handel-hallelujah.mid` | 8 | 4.7 |
| `mozart-k315.mid` | 6 | 4.4 |
| `mozart-k488.mid` | 9 | 6.9 |

Verdict: **pass**. The largest demo needs 9.0 MB, 9 % of the target. The value of demo 1
(5,922,832 B) is the same as the `pcmBytes` of the spike page in headless Chromium after the
change of step 2.

The Worker cache keeps a second copy of each decoded preset (review of step 1, F5). With that
copy, the largest demo holds 18.1 MB, which also passes.

## 6. Late seek

Review F14: a seek walks all events before the cursor, on the audio thread. The script plays
`boulanger-matin.mid` (24,514 events, the most of the six demos) near its end. It then sends 40
seeks to 10 to 19 s before the end, while the song plays, with 0.2 s of play between them. It
times the block that applies each seek. It also times 40 plays after a pause near the end, and
`chaseEvents()` with `restartPlan()` alone at the last event.

| Measurement | Median (ms) | Max (ms) | Above 2.667 ms |
|---|---|---|---|
| Block of a seek while playing | 1.19 to 1.24 | 3.56 to 4.03 | 1 of 40 in each run |
| Block of a play after a pause | 0.82 to 0.83 | 0.99 to 1.09 | 0 of 40 |
| `chaseEvents()` and `restartPlan()` alone | 0.70 to 0.75 | 0.77 to 0.84 | 0 of 40 |

Two extra runs printed the time of each seek (not in the raw files). In both, the slow block
was the first seek of the process (3.51 and 3.52 ms), and the later seeks took 0.99 to
1.92 ms. The walk over the events is 0.70 ms of
the median, which is about 29 ns for each event.

Verdict: **above the block length once**. The first seek of a session takes 3.5 to 4.0 ms, more
than the 2.667 ms of one block, so it can drop one block. The later seeks fit in the block, but
they are above the render target of 1.3 ms. The walk grows with the event count: a file with
four times the events of the Boulanger demo gives a walk of about 2.8 ms. A TODO task of step 2
holds this result. The fix changes the processor, so it waits for the Safari result (review of
step 1, condition 3).

## 7. Summary

| Target | Value | Result | Verdict |
|---|---|---|---|
| Score build | at most 100 ms, largest demo | 15.7 to 17.8 ms | Pass |
| Audio render | at most 1.3 ms for each block | p99 0.31 ms, p99.9 0.53 ms, max 1.2 to 8.2 ms | Fail by the letter. See section 4 |
| Memory | at most 100 MB for each demo | at most 9.0 MB (18.1 MB with the Worker cache) | Pass |
| Late seek (F14) | one block, 2.667 ms | median 1.2 ms, first seek 3.5 to 4.0 ms | Above the block once |
