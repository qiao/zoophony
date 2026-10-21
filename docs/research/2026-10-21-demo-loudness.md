# Demo loudness of 2026-10-21

Date 2026-10-21. Round `demo-loudness`, from `52d14bd9`. Decisions:
[`2026-10-21-demo-loudness.md`](../decisions/2026-10-21-demo-loudness.md). The probes and their
outputs are in [`2026-10-21-demo-loudness/`](2026-10-21-demo-loudness/). Each command runs from
the root of the tree.

## 1. The question

The user said: "the volume is very low for some demos like beethoven-8". The question is the
cause, and the target of design 6.8. The measure is the integrated loudness of each full demo
after the limiter (ITU-R BS.1770-4), with the loudness range (EBU Tech 3342), the true peak, and
the gain reduction of the limiter.

## 2. Method

`pnpm loudness` renders each demo with the synth, the SoundFont, the stage mix, and the room in
Node, then runs the code of `src/audio/output-chain.ts` in an `OfflineAudioContext` of the
headless Chromium of Playwright 1.63.0 (MacBook Pro, Apple M1 Max). It uses the method of
[`demo-loudness.md`](demo-loudness.md) of 2026-10-06 in a saved tool.

- The meter `tools/loudness-meter.ts` reads -22.99 LUFS for a stereo sine of 1 kHz at -23 dBFS
  (`meter-check.txt` of `meter-check.ts`).
- The page also gets the input of the limiter. The gain reduction compares the peak of each block
  of 50 ms of the input with the output. The tool finds the delay of the compressor: 288 samples
  (6 ms) for each demo.
- "Start" is the median short-term loudness from 3 s to 30 s. "Quiet" is the share of the song
  with a short-term loudness below -30 LUFS.
- The renders are deterministic. The JSON run and the table run of `52d14bd9` gave the same
  numbers.

## 3. The measures

| Demo | Table value | Measured before | After | LRA | True peak after | Start after | Quiet |
|---|---|---|---|---|---|---|---|
| Boulanger | -18.4 | -18.05 | -16.05 | 15.5 LU | -1.47 dBTP | -26.3 | 3 % |
| Beethoven 9 | -11.5 | -18.04 | -16.04 | 3.1 LU | -2.90 dBTP | -16.7 | 0 % |
| K. 525 | -29.1 | -18.00 | -16.04 | 6.4 LU | -1.92 dBTP | -14.9 | 0 % |
| BWV 1048 | -19.3 | -17.96 | -15.98 | 8.0 LU | -2.10 dBTP | -16.6 | 0 % |
| Beethoven 8 | -21.1 | -18.03 | -16.04 | 24.5 LU | -2.00 dBTP | -37.4 | 58 % |
| K. 315 | -22.3 | -18.05 | -15.96 | 7.3 LU | -1.89 dBTP | -18.8 | 0 % |
| Beethoven 1 | -21.0 | -13.11 | -16.03 | 21.4 LU | -2.40 dBTP | -49.7 | 36 % |
| Brahms 2 | -17.5 | -16.95 | -15.96 | 23.3 LU | -2.44 dBTP | -39.5 | 42 % |
| Beethoven 8/4 | -19.5 | -15.61 | -16.03 | 22.5 LU | -2.02 dBTP | -48.8 | 39 % |
| BWV 1047 | -19.0 | -12.78 | -16.05 | 7.3 LU | -2.52 dBTP | -19.3 | 0 % |
| BWV 1050 | -21.5 | -18.12 | -16.03 | 4.4 LU | -2.15 dBTP | -17.4 | 0 % |
| Mendelssohn | -22.0 | -17.05 | -15.95 | 10.5 LU | -2.59 dBTP | -15.3 | 0 % |
| K. 417 | -24.0 | -11.78 | -15.95 | 9.8 LU | -2.05 dBTP | -16.4 | 0 % |
| K. 191 | -24.5 | -10.18 | -16.03 | 5.0 LU | -1.76 dBTP | -14.7 | 0 % |

The loudness values are in LUFS. "Table value" is `DEMO_LOUDNESS` of `52d14bd9`. The outputs:
`before-targets.txt` and `before.jsonl` (`52d14bd9`, `--target -18 --target -16 --target -14`
and `--json`), and `after.txt` and `after.jsonl` (`3a8d23ea`, plain and `--fit --json`).

Gain reduction of the limiter, as the share of the blocks of 50 ms above 1 dB:

| Variant | Boulanger | Beethoven 9 | K. 315 | K. 191 | Highest true peak |
|---|---|---|---|---|---|
| `52d14bd9` (-18 LUFS, -2 dBFS) | 0.1 % | 0.1 % | 0.1 % | 13.4 % | +0.24 dBTP (K. 191) |
| -16 LUFS, -2 dBFS | 0.6 % | 0.1 % | 0.6 % | 0.5 % | -0.71 dBTP (Boulanger) |
| -16 LUFS, -2.5 dBFS | 1.1 % | | 1.0 % | 0.6 % | -1.09 dBTP (Boulanger) |
| -16 LUFS, -3 dBFS (after) | 1.9 % | 0.1 % | 1.6 % | 1.0 % | -1.47 dBTP (Boulanger) |
| -14 LUFS, -2 dBFS | 5.4 % | 0.1 % | 3.0 % | 1.6 % | -0.16 dBTP (Boulanger) |

The outputs: `before-targets.txt`, `limiter-3dbfs-target-16.txt`, and the -2.5 dBFS run of
`loudness-variant.ts` with `CHAIN=docs/research/2026-10-21-demo-loudness/chain-limiter-2.5.ts`.
After the change, the highest gain reduction of a block is 6.2 dB on Beethoven 9, in 0.03 % of
its blocks above 3 dB. The limiter catches single peaks and does not pump.

`makeup.ts` measured the makeup gain of the compressor of Chromium for a sine at -30 dBFS: 1.14 dB
at -2 dBFS and 1.71 dB at -3 dBFS. Both agree with `LIMITER_TRIM_DB`.

## 4. The cause for Beethoven 8

- **The table values of the newer demos.** The eight demos of 2026-10-14 had values that no render
  measured. Seven played 1.0 to 7.8 LU above -18 LUFS. K. 191 played at -10.2 LUFS, with a true
  peak of +0.24 dBTP and more than 1 dB of gain reduction in 13 % of its blocks. After such a
  demo, Beethoven 8 at -18 LUFS sounds about 8 LU lower.
- **The table value of Beethoven 8 was correct.** It played at -18.03 LUFS.
- **The range of the movement.** Beethoven 8 has a loudness range of 24.5 LU. Its pp passages sit
  at about -40 LUFS short-term, and short ff passages at about -16 LUFS. 63 % of the song is below
  -30 LUFS short-term, and the start is at -39.6 LUFS. The relative gate of BS.1770 drops the pp
  blocks, so the integrated value follows the ff passages. Brahms 2, Beethoven 1, and Beethoven 8/4
  have the same form with ranges of 21 to 23 LU.
- **The source of the range.** Half of the notes of Beethoven 8 have a velocity of 40 or less, and
  at least 10 % have the lowest velocity, 28 (`velocities.txt` of `velocities.ts`). The default
  velocity curve of SoundFont 2 attenuates a note by about `40 log10(v / 127)` dB, and the soft
  sample layers add more. A velocity of 28 thus plays about 21 dB below a velocity of 96 (not
  verified in the code of spessasynth_core).
- **No other cause.** The limiter acted on 0.0 % of the blocks of Beethoven 8 by more than 1 dB.
  No patch or section mix stands out: the true peak is -1.66 dBTP and the range is in the notes.

## 5. The target

| Source | Integrated loudness | True peak |
|---|---|---|
| AES TD1008 (2021), music | -16 LUFS distribution loudness, track normalized | |
| Spotify, Normal (Loud, Quiet) | -14 LUFS (-11, -19 LUFS) | at most -1 dBTP |
| EBU R 128, broadcast | -23 LUFS | at most -1 dBTP |

Sources: [Spotify for Artists, "Loudness normalization"](https://support.spotify.com/au/artists/article/loudness-normalization/),
[Radio World on AES TD1008](https://www.radioworld.com/?p=115138), and
[Production Advice on TD1008](https://productionadvice.co.uk/td1008/). The PDF of TD1008 on
aes.org gave HTTP 403, so the TD1008 values come from these two reports (not verified in the
PDF).

The target is now -16 LUFS. At -14 LUFS, Boulanger gets more than 1 dB of gain reduction in
5.4 % of its blocks, and its true peak goes above -1 dBTP. At -16 LUFS with the limiter at -3 dBFS, the 14 demos are within
-16.05 to -15.95 LUFS, and each true peak is at or below -1.47 dBTP.

## 6. A range rule for the soft demos

A velocity map `127 (v / 127)^e` before the synth narrows the range. `range-rule.txt` gives the
four demos with a range above 20 LU, each fitted to -16 LUFS with the limiter at -3 dBFS
(`loudness-variant.ts` with `VEL_EXP`). Each cell gives the LRA in LU, the start in LUFS, and the
quiet share:

| Demo | e = 1 (after) | e = 0.75 | e = 0.6 |
|---|---|---|---|
| Beethoven 8 | 24.5, -37.4, 58 % | 20.2, -30.7, 33 % | 16.6, -26.4, 5 % |
| Brahms 2 | 23.3, -39.5, 42 % | 22.0, -35.9, 33 % | 18.1, -27.6, 13 % |
| Beethoven 8/4 | 22.5, -48.8, 39 % | 23.3, -43.5, 38 % | 21.9, -39.9, 28 % |
| Beethoven 1 | 21.4, -49.7, 36 % | 18.7, -45.1, 33 % | 17.8, -36.0, 19 % |

- The map helps Beethoven 8 most, because its pp notes have the lowest velocities. At e = 0.6,
  more than 1 dB of gain reduction comes in 3.5 % of its blocks.
- The soft starts of Beethoven 8/4 and Beethoven 1 stay far below the target: the pp opening of
  the finale, and the Adagio of the introduction. A velocity map does not change them much.

The proposal is the smallest form: a velocity curve of `30 log10(v / 127)` (e = 0.75) in the
attenuation of the synth, for the demos only. It keeps the sample layer of each note and the
motion of the animals, and it keeps the order of the dynamics. This round does not apply it,
because it changes the balance of the music, and the user decides it after a listen.
