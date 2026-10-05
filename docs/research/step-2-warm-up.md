# Step 2 warm-up: the first notes of each preset

Date of the measurements: 2026-10-05.

This report gives the block render times before and after the warm-up of the voice code
(TODO, step 2, spike report section 8 item 2, review of step 2 finding N2). The raw output is in
[`step-2-warm-up/`](step-2-warm-up/). "Not verified" marks a fact that no measurement confirms.

## 1. Machine and code

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, macOS 26.5 |
| Node | 24.10.0 |
| Code before | Commit `6378864`: `measure-targets.ts` with the columns "Load" and "Max of the first 1 s", and no warm-up |
| Code after | Commit `4ff6a53`: the warm-up in `SynthEngine.addBanks()` (design 6.4) |
| Load | Other agents worked on the same Mac. The load average was 9 to 20 (in the first and the last line of each raw file) |

The load of the Mac makes single blocks slow at random times. Thus the maximum of a full render
changes much between runs. The first second of a render and the window of Handel at 27.75 s are
the values that the warm-up must change.

## 2. Method

- `node tools/measure-targets.ts` renders all six demos in one Node process
  (`before/all.txt`, `after/all.txt`). The first demo of the process renders with cold code.
- `node tools/measure-targets.ts <demo>` renders one demo in a fresh process
  (`before/fresh-<demo>.txt`, `after/fresh-<demo>.txt`). Thus each demo renders with cold code,
  as the first demo of a page does in a worklet.
- "Load" is the time of `loadScore()` and `addBanks()`. After the change, it includes the warm-up.
- "First 1 s" is the longest block of the first second of the render.

## 3. Each demo in a fresh process

| Demo | First 1 s before (ms) | First 1 s after (ms) | Load before (ms) | Load after (ms) | p99 before / after (ms) | Max before / after (ms) |
|---|---|---|---|---|---|---|
| `beethoven-5.mid` | 4.028 | 2.081 (GC) | 12.0 | 30.7 | 0.206 / 0.192 | 18.714 / 12.649 |
| `boulanger-matin.mid` | 6.546 | 1.170 | 114.9 | 40.9 | 0.333 / 0.331 | 39.866 / 3.052 |
| `grieg-ase.mid` | 4.375 | 0.505 | 8.1 | 27.0 | 0.095 / 0.103 | 4.375 / 2.594 |
| `handel-hallelujah.mid` | 4.861 | 1.587 (GC) | 10.0 | 30.6 | 0.215 / 0.215 | 4.861 / 2.575 |
| `mozart-k315.mid` | 6.502 | 1.110 | 11.2 | 32.8 | 0.111 / 0.109 | 10.942 / 1.631 |
| `mozart-k488.mid` | 7.274 | 1.187 | 11.2 | 30.5 | 0.104 / 0.138 | 7.274 / 8.177 |

- Before the change, the block at 0.00 s was the longest block of the first second in five
  demos (4.4 to 7.3 ms). Beethoven had 4.0 ms at 0.15 s.
- After the change, two first seconds have a block above 1.3 ms: Beethoven (2.081 ms at
  0.29 s) and Handel (1.587 ms at 0.29 s). A garbage collection of V8 overlaps both blocks.
- The warm-up adds about 20 ms to the load (19 to 22 ms in five demos). The Boulanger load of
  114.9 ms before the change is an outlier of the busy Mac.
- The maxima after 1 s come in bursts at different song times in each run, for example
  Beethoven at 217.98 s and K. 488 at 332.35 s. They agree with the load of the Mac (review of
  step 2, section 6). Not verified: the cause of each burst.

### Handel at 27.75 s (N2)

The trumpet (56) and the timpani enter at 27.75 s.

| Run | Blocks above 1.3 ms from 27.6 to 28.0 s |
|---|---|
| Before, fresh process | 6: 1.777 ms at 27.75 s, then 1.360 to 1.621 ms from 27.87 to 27.89 s |
| After, fresh process | 0 |

## 4. All demos in one process

This is the step 2 audio render measurement of design 9.7.

| Demo | p99 before (ms) | p99 after (ms) | Max before (ms) | Max after (ms) | First 1 s before (ms) | First 1 s after (ms) |
|---|---|---|---|---|---|---|
| `beethoven-5.mid` | 0.499 | 0.203 | 26.756 | 18.208 | 3.787 | 2.013 (GC) |
| `boulanger-matin.mid` | 0.332 | 0.343 | 6.718 | 3.709 | 0.886 | 0.488 |
| `grieg-ase.mid` | 0.094 | 0.092 | 1.694 | 2.304 | 0.317 | 1.050 |
| `handel-hallelujah.mid` | 0.221 | 0.223 | 14.330 | 4.757 | 0.352 | 0.249 |
| `mozart-k315.mid` | 0.112 | 0.114 | 1.483 | 2.123 | 0.701 | 0.286 |
| `mozart-k488.mid` | 0.107 | 0.105 | 2.691 | 5.114 | 0.347 | 0.095 |

The p99 is at most 0.343 ms after the change. The maxima depend on the load of the Mac, so the
target "each block at most 1.3 ms" still fails by its letter. The user decides about a percentile
target (TODO, step 2).

## 5. Variants of the warm-up

Before the change, the script
[`scripts/step-2-warm-up/warm-up-variants.ts`](scripts/step-2-warm-up/warm-up-variants.ts)
compared variants on the Handel demo, in fresh processes, three runs each. The raw output is not
in the files. The load average was 8 to 13.

| Variant | Warm-up (ms) | Longest block from 27.6 to 28.0 s (ms) |
|---|---|---|
| None | 0 | 1.58 to 3.12 |
| First note of each preset, 8 blocks | 10 | 1.04 to 1.10 |
| First note of each preset, 30 blocks, release, 15 blocks | 17 | 0.24 to 0.26 |
| First note of each preset and key, 8 blocks | 30 to 33 | 0.19 to 0.22 |
| First note of each preset and key, 30 blocks, release, 15 blocks | 51 | 0.19 to 0.21 |

- A short render (2 or 8 blocks of one note for each preset) left the cold block. A render through
  the later stages of the envelopes and the release removed it. Not verified: which code of
  spessasynth_core was cold.
- The voice cache of spessasynth_core alone (variant "cache") did not remove the block
  (1.01 to 1.19 ms).
- The design uses the third variant, because it costs about half of the variants for each key.
  On the Boulanger demo, the variant for each key had 581 notes and took 57 to 73 ms.
- The first block of play still held 44 events in Handel and 84 in Boulanger, which took 1.3 to
  1.6 ms with the third variant alone. Thus the warm-up also plays the first 8 blocks of the song
  with the block scheduler. Section 3 gives the result with both parts.

## 6. Summary

| Value | Before | After |
|---|---|---|
| Longest block of the first second, fresh process | 4.0 to 7.3 ms | 0.5 to 1.2 ms, and 1.6 to 2.1 ms in two blocks with a garbage collection |
| Handel from 27.6 to 28.0 s, fresh process | 6 blocks above 1.3 ms, longest 1.777 ms | 0 blocks above 1.3 ms |
| Load of a score (`loadScore()` and `addBanks()`) | 8 to 12 ms | 27 to 41 ms |
| p99 of the block render, all demos in one process | at most 0.499 ms | at most 0.343 ms |
