# The Boulanger demo as the default demo: first download, load, memory, and count-in

Date of the measurements: 2026-10-05.

On 2026-10-05, the user asked for a more positive and cheerful default music. The Boulanger
demo, "D'un matin de printemps", replaced the Beethoven demo as the default demo (design 2.2,
8.2). This report gives the targets of design 9.7 that depend on the default demo, with the
Boulanger demo. The older reports keep the values of the Beethoven demo as their record. The raw
output of the load runs is in `scripts/spike/results/chrome-cdp-runs-boulanger-matin.json` and
`scripts/spike/results/chrome-cdp-runs-beethoven-5.json`.

## 1. Result

| Target (9.7) | Limit | Boulanger demo | Beethoven demo | Verdict |
|---|---|---|---|---|
| First download (7.2) | less than 1,000,000 B after gzip | 223,143 B | 206,915 B | Pass |
| Load | at most 2 s at 50 Mbit/s | median 659 ms, max 681 ms (5 runs) | median 533 ms, max 552 ms (5 runs) | Pass |
| Memory | at most 100 MB of decoded samples | 9,039,086 B | 5,922,832 B | Pass |
| Count-in `T` (5.4) | none | 1.017 s | 1.225 s | Not a target |

## 2. Machine and code

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, 64 GB, macOS 26.5 (25F71) |
| Browser | Google Chrome 154.0.8037.95, headed, real audio output |
| Code | Commit `9268e8e`, with the spike query `?demo=<id>` |
| Load | Other agents worked on the same Mac. The load average was 27 to 41 after the runs |

## 3. First download

`pnpm size` after `pnpm build` counts `dist/demos/boulanger-matin.mid`.

| File | Size | After gzip |
|---|---|---|
| `boulanger-matin.mid` (after `demos/patches.json`) | 102,980 B | 30,097 B |
| `beethoven-5.mid` (after `demos/patches.json`) | 74,649 B | 13,869 B |

The total is 223,143 B with the Boulanger demo. The other files of the first download give
193,046 B. With the Beethoven demo, the same build gives 206,915 B. The change adds 16,228 B, and
the total stays at 22% of the limit.

## 4. Load

The presets of the Boulanger demo resolve to 17 preset files in `sf/index.json`, with a total
of 2,331,290 B. At 50 Mbit/s, the transfer of these bytes takes 0.373 s. The Beethoven demo
needs 11 files with 1,513,876 B, or 0.242 s.

| Preset file | Size (B) |
|---|---|
| `sf/0/68.sf3` (oboe) | 63,652 |
| `sf/0/71.sf3` (clarinet) | 33,908 |
| `sf/0/8.sf3` (celesta) | 33,396 |
| `sf/128/48.sf3` (orchestra kit) | 575,604 |
| `sf/0/40.sf3` (violin) | 241,888 |
| `sf/0/41.sf3` (viola) | 184,300 |
| `sf/0/45.sf3` (pizzicato strings) | 37,418 |
| `sf/0/73.sf3` (flute) | 172,536 |
| `sf/0/46.sf3` (harp) | 53,898 |
| `sf/0/42.sf3` (cello) | 260,356 |
| `sf/0/60.sf3` (horn) | 146,888 |
| `sf/0/70.sf3` (bassoon) | 152,130 |
| `sf/0/43.sf3` (contrabass) | 152,204 |
| `sf/0/32.sf3` (acoustic bass) | 27,450 |
| `sf/0/56.sf3` (trumpet) | 56,796 |
| `sf/0/57.sf3` (trombone) | 59,150 |
| `sf/0/58.sf3` (tuba) | 79,716 |

Method: the spike method of [`audio-spike.md`](audio-spike.md), section 2. `node
scripts/spike/serve.mjs --port 4191` served `dist/`. `DEMO=boulanger-matin node
scripts/spike/chrome.mjs cdp-runs http://localhost:4191` made 5 runs with the DevTools network
throttle (50 Mbit/s, 20 ms latency, no cache) on the page and on the decode Worker. Each run
starts a fresh profile. `loadMs` is the time of `Player.load()`: the worklet and Worker scripts,
the preset index, the preset files, the decode, the bank add, and the warm-up.

| Run | Boulanger `loadMs` | Beethoven `loadMs` |
|---|---|---|
| 1 | 641 ms | 539 ms |
| 2 | 672 ms | 495 ms |
| 3 | 681 ms | 529 ms |
| 4 | 659 ms | 552 ms |
| 5 | 635 ms | 533 ms |

The Boulanger demo loads in at most 681 ms, 34% of the limit of 2 s. The Beethoven runs of the
same day took 533 ms (median), against 481 ms on 2026-10-04 with 10 preset files. The busy Mac
can explain a part of this increase. This is not verified.

In each run, the context stayed `suspended` until the click, and the first 2 s of play had no
slow block and no error. The spike page plays with no count-in. Its first sound came 108 ms
(median) after the click for the Boulanger demo, whose first note is at song time 0.

## 5. Memory

`src/audio/pcm-memory.test.ts` passes. The spike page in Chrome reports `pcmBytes` 9,039,086 B
for the 17 presets of the Boulanger demo. The Node value of
[`step-2-targets.md`](step-2-targets.md), section 5, is 9.0 MB. The Boulanger demo was already
the largest demo for memory.

## 6. Count-in

`countInAt()` of `pose/count-in.ts` gives these values from the song start:

| Demo | First bar | Preparatory beat | `T` |
|---|---|---|---|
| Boulanger | 3 conducted beats, pattern 3 | 0.417 s | 1.017 s |
| Beethoven | 2/4 at 192, pattern 1 | 0.625 s | 1.225 s |

Each `T` is the ready pause of 0.6 s plus the preparatory beat. Thus the first note of the
default demo sounds 0.208 s earlier after the click than before. `pnpm smoke` read a song time of
-0.930 s in the count-in, 0.1 s after the click.
