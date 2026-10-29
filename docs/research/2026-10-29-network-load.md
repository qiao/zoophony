# Network load of the production build

Date 2026-10-29. Round `perf-gzip-audio`. Decisions:
[`2026-10-29-gzip-audio.md`](../decisions/2026-10-29-gzip-audio.md). The probes and their outputs
are in [`2026-10-29-network-load/`](2026-10-29-network-load/). Each command runs from the root of
the tree.

## 1. The question

The manager measured the network traffic of the production build and found two small wins: the
preset files and the demo files go over the wire with no gzip. This round gzips them in the build.
The measures that decide are the bytes and the ready time of a phone first visit. The stop rule
of the round was a drop of at least 2,000,000 B and 1,500 ms.

## 2. The method

- The production build: `pnpm build`, with the base path `/`, so that `pnpm load-probe` serves
  it at the root. The manager also read a build with `ZOOPHONY_BASE=/zoophony/` in the
  chrome-devtools network list and trace.
- The headers of GitHub Pages: gzip only for `.html`, `.js`, `.css`, `.json`, `.svg`, and `.txt`,
  and `Cache-Control: max-age=600`. `GZIP_TYPES` of `tools/load-probe.ts` models them. Pages
  sends an `.sf3` file as `application/octet-stream` with no gzip.
- `pnpm load-probe` serves `dist/` with these headers over HTTP/2 and gives the median of 3 runs
  in headless Chrome. The phone run shapes the link to Fast 4G and slows the main thread 4x.
  `--base 9ecc8a9bd` builds the start commit of the round in a temporary folder and measures it
  first.
- `timeline.ts` reads the request list of each run from the JSON of the probe.

## 3. Why the files compress

Each sample of an SF3 file is its own Ogg Vorbis stream, and each stream repeats a setup header of
about 3.7 KB. In `sf/0/60.sf3` the setup headers are 34% of the file: 38 streams, 140,244 B of
408,348 B (`ogg-headers.py`, `ogg-headers.log`). The Vorbis audio packets compress little. A MIDI
file is a list of small events with many repeats. The hall impulse response (FLAC) compresses
only to 97% (`flac-demo-gzip.log`), so it stays as it is.

## 4. The measures

The load probes ran on the build of this branch and on the start commit `9ecc8a9bd`, in turns in
one session. Another session loaded the machine (load average 6 to 9), so a single run can be
slow. The tables give the medians.

```bash
pnpm build
pnpm load-probe --phone --base 9ecc8a9bd --runs 3 --out docs/research/2026-10-29-network-load/phone.json
pnpm load-probe --base 9ecc8a9bd --runs 3 --out docs/research/2026-10-29-network-load/desktop.json
node docs/research/2026-10-29-network-load/timeline.ts docs/research/2026-10-29-network-load/phone.json
pnpm size --base 9ecc8a9bd
```

| Run | Measure | `9ecc8a9bd` | `perf-gzip-audio` | Change |
|---|---|---|---|---|
| phone, first visit | FCP | 668 ms | 640 ms | -28 ms |
| phone, first visit | first frame of the orchestra | 5,829 ms | 5,895 ms | +66 ms |
| phone, first visit | ready to play | 15,942 ms | 13,595 ms | -2,347 ms |
| phone, first visit | bytes | 10,608,433 B | 8,099,632 B | -2,508,801 B |
| desktop, first visit | FCP | 64 ms | 68 ms | +4 ms |
| desktop, first visit | first frame of the orchestra | 1,212 ms | 1,220 ms | +8 ms |
| desktop, first visit | ready to play | 1,617 ms | 1,630 ms | +13 ms |
| desktop, first visit | bytes | 10,608,433 B | 8,099,632 B | -2,508,801 B |
| both | 17 preset files of the default demo | 9,358,224 B | 6,922,111 B | -2,436,113 B |
| both | the default demo file | 102,980 B | 30,058 B | -72,922 B |
| both | the other files | 1,147,229 B | 1,147,463 B | +234 B |

The logs are `phone.log` and `desktop.log`. The rows of the files come from the bytes of each path
in `phone.json`. On the phone, the presets arrive from about 6.3 s to 13.2 s in place of about
6.3 s to 15.6 s (`phone-timeline.log`). The ready time waits for the last preset, so it drops by
about the same time. On the desktop, the link is fast and the decode sets the ready time, so the
times stay the same within the noise. The gunzip in the Workers adds no time that the probe can
see.

| First download | `9ecc8a9bd` | `perf-gzip-audio` | Change |
|---|---|---|---|
| total of `pnpm size` | 842,979 B | 843,086 B | +107 B |
| bytes that the host sends for these files | 915,862 B | 843,086 B | -72,776 B |

`size.log` holds the totals. On `9ecc8a9bd`, `pnpm size` counted the demo file as a gzip of the
raw file, 30,097 B, but the host sent the raw 102,980 B. The check now counts the gzip file as the
host sends it, 30,058 B, so the two rows are equal. The new helper adds 190 B to the demo chunk.

The checks of the change:

- `gzip-equal.ts` finds 0 failures in 288 files (274 presets and 14 demos,
  `gzip-equal.log`). The gunzip of each file of `dist/` equals its source, and a new gzip at
  level 9 gives the same bytes.
- Each run of `phone.json` has one request of the default demo (`phone-timeline.log`), so the
  fetch of the app takes the preload of `index.html`. The chrome-devtools network list of
  `vite preview` of the build also shows one request, and the console has no warning of an unused
  preload.
- `pnpm test:e2e --project=chromium` passes the smoke test, which plays the default demo for
  4 s. The same 11 tests of the UI fail on this branch and on `9ecc8a9bd` (`e2e.log`).

## 5. The result

The gzip of the preset and demo files passes the stop rule of the round: the phone first visit
sends 2,508,801 B less and is ready 2,347 ms sooner. The first frame does not change, because the
renderer chunk and the score build set it.

## 6. Open candidates

| Candidate | Measure | Source |
|---|---|---|
| a. Fetch the presets while the link is idle | idle link of the phone run: about 1,000 to 5,770 ms, about 4.7 s (base: 1,137 to 5,740 ms) | `phone-timeline.log` |
| b. Packed meshes as a binary file with gzip | 456,374 B (gzip of the base64 text) to 405,886 B: -50,488 B | `text-estimate.log` |
| c1. A service worker for repeat visits | about 745 KB revalidates after the 600 s of `max-age` | manager, Cache insight of the chrome-devtools trace on `26ab85984` |
| c2. A host with brotli (quality 11) | 787,889 B (gzip) to 660,193 B for the entry JS, the CSS, and the renderer chunk: -127,696 B | `text-estimate.log` |

- **a.** On the phone, the first download ends at about 1.0 s, and the audio chunks start at
  about 5.8 s. The main thread builds the piece in between, and the link carries nothing.
  AGENTS.md loads the SoundFont files after the first frame, so this change needs a decision of
  the user. The 2026-10-21 report found that a fetch issued inside the long task starts only after
  the task. Thus the fetches must start, and the code must yield once, before `select()` of
  `app/app.ts`.
- **b.** The packed meshes are about 456 KB of the 731 KB (gzip) of the renderer chunk. A binary
  file read with `DecompressionStream` drops the base64 layer. `text-estimate.ts` gzips the
  strings out of their chunk, so the real saving can differ by a few KB.
- **c.** GitHub Pages sends `max-age=600`. After 10 min, a repeat visit revalidates each file. The
  service worker of [`2026-10-21-load-performance.md`](2026-10-21-load-performance.md) is the
  fix. GitHub Pages sends no brotli, so c2 needs another host, which is a decision of the user.
