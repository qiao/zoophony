# Load performance

Date 2026-10-21. Round `perf-load`. Decisions:
[`2026-10-21-load-performance.md`](../decisions/2026-10-21-load-performance.md). The probes and
their outputs are in [`2026-10-21-load-performance/`](2026-10-21-load-performance/). Each command
runs from the root of the tree.

## 1. The question

The user said: "optimize the web performance of this repo". This round owns the load: a visitor
must see the stage sooner and hear the first note sooner, on a first visit and on a repeat visit.
The pixels of the stage and the sound stay the same. The measures that decide are the time to the
first frame of the orchestra, the time until the default demo is ready to play, and the bytes.

## 2. The method

`load-probe.ts` serves `dist/` as GitHub Pages does: HTTP/2, gzip for the text types, ETag, and
`Cache-Control: max-age=600`. It opens the page in headless Chrome with the GPU of the
development Mac (Apple M1 Max) and records these times from the start of the navigation:

- FCP and LCP from the paint entries. LCP is a text, because a canvas is no LCP candidate.
- The empty stage: the first draw call on the canvas. The stage has no players yet.
- The first frame: the first draw call after `scene.show()` of the default demo, plus one frame.
- Ready: the load ring hides, so a click starts the music at once.
- TBT: the sum of each long task above 50 ms, from FCP to ready.
- The bytes that the server sent for each path.

The phone run shapes the network in the server, so that the fetches of the decode Workers also
get the shape: Fast 4G of DevTools (165 ms for each request, 8.1 Mbit/s for all requests). It sets
a 4x CPU throttle on the main thread of the page. The throttle does not slow the Workers or the
audio thread. Chrome trusts the key of the certificate, so that it keeps an HTTP cache for the
repeat visit. Each time is the median of 3 runs in a new browser context. A repeat visit loads the
page a second time in the same context, inside the 600 s of `max-age`.

```bash
node docs/research/2026-10-21-load-performance/load-probe.ts --runs 3 [--phone] [--repeat] \
  [--root <dist folder>] --out <file.json>
node docs/research/2026-10-21-load-performance/load-probe.ts --runs 1 --root <plain build> \
  --profile --out <file.json>
node docs/research/2026-10-21-load-performance/profile-top.ts <file-profile.json> 60
```

`--profile` records a CPU profile of the main thread. The profile reads a build with no minify
(`pnpm exec vite build --minify false --outDir <dir>`), so that it names each function. The
chrome-devtools tools gave a trace of the load on the desktop and the phone, and the network
list. Their Lighthouse tool has no performance category, so the probe gives FCP, LCP, and TBT.

## 3. The measures

The first download comes from `pnpm build && pnpm size`.

| Run | Measure | `0bd2e24a` | `perf-load` | Change |
|---|---|---|---|---|
| all | first download after gzip (`pnpm size`) | 820,019 B | 714,011 B | -106,008 B |
| all | bytes of the load of the default demo | 10,936,982 B | 10,831,406 B | -105,576 B |
| desktop, first visit | FCP / LCP | 300 / 400 ms | 160 / 160 ms | |
| desktop, first visit | empty stage | 321 ms | 87 ms | |
| desktop, first visit | first frame of the orchestra | 1,437 ms | 1,178 ms | -259 ms |
| desktop, first visit | ready to play | 2,516 ms | 1,547 ms | -969 ms |
| desktop, first visit | blocking time to ready / longest task | 975 / 750 ms | 958 / 739 ms | |
| desktop, repeat visit | first frame / ready | 1,201 / 2,108 ms | 1,170 / 1,527 ms | -31 / -581 ms |
| phone, first visit | FCP / LCP | 664 / 1,532 ms | 640 / 1,496 ms | |
| phone, first visit | first frame of the orchestra | 5,575 ms | 5,218 ms | -357 ms |
| phone, first visit | ready to play | 16,412 ms | 15,621 ms | -791 ms |
| phone, first visit | blocking time to ready / longest task | 3,885 / 2,900 ms | 3,760 / 2,824 ms | |
| phone, repeat visit | first frame / ready | 4,158 / 5,290 ms | 4,041 / 4,552 ms | -117 / -738 ms |

The blocking time sums each long task above 50 ms from the navigation to ready. With the
preload, the desktop score build can start before FCP, so a sum from FCP hides it. Two of three
first visits of `0bd2e24a` on the desktop had a slow start of the browser (FCP 300 and 516 ms), so
the repeat visit gives the better change of the desktop first frame. Each file `before-*.json` and
`after-*.json` holds each run, its long tasks, the bytes of each path, and the time of each
response.

The largest requests of a first visit: the 17 presets of the default demo (9,358,224 B, no gzip),
the chunk `renderer-*.js` (714,916 B before, 608,596 B after), the hall impulse response
(480,044 B, no gzip), the worklet chunk (118,427 B), the default demo (102,980 B, no gzip in the
probe), and the decode Worker (81,324 B).

### The long tasks before the first frame

The main thread does three long tasks before the first frame of the orchestra: the run of the
scripts (about 75 ms on the desktop), the build of the piece (about 740 ms), and the first render
(about 300 ms). Then `#startAudio()` takes about 130 ms, nearly all in `new AudioContext()`. This
CPU profile of one desktop run gives the inclusive time of each part, in ms
(`before-plain-profile.log` and `after-plain-profile.log`):

| Part | `0bd2e24a` | `perf-load` |
|---|---|---|
| `select()`: the score, the layout, the pose plan, and `scene.show()` | 793 | 752 |
| `buildScore()` | 33 | 32 |
| `layoutScene()`, with the models that the footprints need | 265 | 251 |
| `preparePoses()` | 149 | 148 |
| `scene.show()`: the geometry of the players | 304 | 279 |
| smooth normals of the studio bodies | 136 | 122 |
| `unpackStudioMesh()` (`byteReader()`) | 34 (27) | 20 (3) |
| first render: `setProgram()`, the compile and link of the shaders | 335 | 257 |
| first render: `SkinnedMesh.computeBoundingSphere()`, for the depth sort | 138 | 136 |
| first render: the shadow maps | 138 | 96 |
| `new AudioContext()` in `WorkletPlayer` | 135 | 131 |

`shadeMesh()` takes 21 ms. Each column is one run, so a change below about 20 ms is noise.

### The candidates

| Candidate | Measure | Result |
|---|---|---|
| a. Dense pack of the meshes (`pack-variants.log`, `pack-probe.log`) | The packed meshes after gzip: 469,253 B. One stream for each kind of number: 423,957 B. With no last weight: 407,270 B. With the eight recent corners: 364,975 B. The same in LEB128 numbers only: 373,001 B | done: 364,991 B (-104,262 B). 633 values of the 18 bodies are byte-identical |
| a. Binary files in place of base64 | gzip of the raw bytes of the old pack: 406,321 B, but GitHub Pages can send a binary type with no gzip: 596,740 B | rejected |
| b. Bodies outside the first chunk, or one body for each cast species | The default demo casts 17 of the 18 bodies. The bodies come before the first frame and share one link with the scripts | rejected: it saves at most one body |
| c. Smooth normals one time for each rig | `normals-probe.ts`: 108 checks, 0 differ. -14 ms | done |
| c. `byteReader()` with a plain loop | 27 ms to 3 ms | done |
| c. The layout, the pose plan, and the geometry in a Worker or in the build | about 680 ms of the 740 ms task | open: a large change of the load flow |
| d. `compileAsync()` of the shaders | 257 to 335 ms of `setProgram()` | open: the shaders belong to the round `perf-frame` |
| e. The hall impulse response as FLAC | `flac-estimate.log`: about 177,449 B, against 480,044 B, or 249 KB after gzip (`assets/hall/README.md`) | open: it saves 72 to 303 KB, about 0.3 s of the phone ready time |
| f. Preload of the default demo | phone first frame -357 ms. The demo arrives at 749 ms in place of 1,343 ms | done |
| f. Decode Workers that start with the worklet and the hall | the first preset request comes 673 ms after the audio chunk on the phone, against 1,462 ms | done |
| f. Up to four decode Workers | one Worker decodes the 17 presets in about 820 ms in Node (`decode-probe.log`). Desktop ready minus first frame: 369 ms, against 1,079 ms, with the start above | done |
| f. Presets before the first frame | the link is idle on the phone from 749 ms to 5,561 ms. A prototype fetch after the score build began only after the 2.8 s task (`option-prefetch-phone.json`) | open: AGENTS.md loads the SoundFont files after the first frame |
| g. A service worker | see below | not implemented |

## 4. The result

The round keeps the dense pack, the cache of the normals, the faster `byteReader()`, the preload of
the default demo, the early start of the decode, and the pool of decode Workers. On the desktop,
the demo is ready 969 ms sooner on a first visit and 581 ms sooner on a repeat visit, because the
decode no longer runs on one Worker after the hall. On the Fast 4G phone run, the first frame
comes 357 ms sooner and the demo is ready 791 ms sooner. The ready time of the phone run now
follows the link: about 10.2 MB of audio files at 8.1 Mbit/s from 5.6 s.

The desktop first frame changes little, because the main thread does nearly the same work. The
largest parts that are left are the layout (251 ms), `scene.show()` (279 ms), the compile of the
shaders (257 to 335 ms), and the CPU skin of `computeBoundingSphere()` (136 ms). Three.js calls
it one time for each player, for the depth sort. A cheaper sphere can change the draw order and
the pixels, so the owner of the render loop decides.

### A service worker for the repeat visits

GitHub Pages sends `max-age=600`, so a repeat visit in 10 minutes makes no request, and the
probe measured it above. After 10 minutes, each of the about 40 files revalidates with a 304
answer, in chains of about 5 round trips: about 0.8 s on Fast 4G. The HTTP cache can also drop
the 9.4 MB of presets of a demo. A service worker with a cache first for the hashed assets and
the SF3 files removes both costs, and lets the app start with no network. The risks:
`index.html` and the demo files have no hash, so they need a network first rule and a version for
each deploy. The SF3 files also have no hash, so a change of the SoundFont needs a new cache name.
An old service worker serves the old files until the next load of the page. The cache of all
demos holds about 60 MB, and Safari can drop it after 7 days with no visit. The first visit gets
no gain.
