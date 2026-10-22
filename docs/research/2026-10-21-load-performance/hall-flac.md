# Addendum: the FLAC hall

Date 2026-10-21. Round `perf-hall`, after the report
[`2026-10-21-load-performance.md`](../2026-10-21-load-performance.md), which stays as it was.
Decisions: [`2026-10-21-hall-flac.md`](../../decisions/2026-10-21-hall-flac.md). Each command runs
from the root of the tree.

## The file

`tools/hall-flac.py` writes `assets/hall/st-pauls-hall-c8m.flac` from the WAV file with libsndfile
1.2.2, and reads it back: the 120,000 frames of 16-bit samples are the same. The FLAC file has
127,980 B, against 480,044 B for the WAV file, or 249,063 B after gzip. CC BY 4.0, section
2(a)(4), permits a change of the format, and such a change gives no Adapted Material
(`assets/hall/LICENSE.txt`, lines 155 to 165).

## The decode in three browsers

`node docs/research/2026-10-21-load-performance/hall-decode-probe.ts` decodes both files with
`decodeAudioData()` in an `OfflineAudioContext` at 48 and 44.1 kHz (`hall-decode-probe.log`):

| Browser (Playwright) | Largest difference, 48 kHz | 44.1 kHz | Scale of a positive WAV sample | Of a FLAC sample |
|---|---|---|---|---|
| Chromium 153 | 0 | 0 | 1 / 32767 | 1 / 32767 |
| Firefox 155 | 1.8e-5 | 2.1e-5 | 1 / 32767 | 1 / 32768 |
| WebKit 26.6 | 0 | 0 | 1 / 32768 | 1 / 32768 |

Chromium and WebKit give the same floats for both files. Firefox converts the 16-bit samples of
the two formats with different scales, so the positive samples of its hall change by a factor of
32768 / 32767 (+0.0003 dB), at most 1.8e-5 of full scale, which is less than one 16-bit step. The
FLAC decode of Firefox gives the exact value of each sample / 32768.

## The fallback

`node docs/research/2026-10-21-load-performance/hall-fallback-probe.ts` answers the request of the
FLAC file with bytes that are no FLAC file. The app fetches the WAV file and gets ready with no
failure message and no console error. With the real file, it fetches no WAV file
(`hall-fallback-probe.log`).

## The load

The phone run of `load-probe.ts` (Fast 4G, 4x CPU, median of 3, `hall-after-phone.json`) against
the merge of the round `perf-load` (`after-phone.json`):

| Measure | `perf-load` | `perf-hall` |
|---|---|---|
| bytes on the path to the first sound | 10,831,406 B | 10,479,454 B |
| the hall impulse response | 480,044 B (WAV) | 127,980 B (FLAC) |
| first frame of the orchestra | 5,218 ms | 5,282 ms |
| ready to play | 15,621 ms | 15,364 ms |

The probe sends a WAV file with no gzip, as GitHub Pages can. The ready time drops by 257 ms,
because the phone run is bound by the link after the first frame. The first frame does not
change: the hall loads after it.
