# Demo loudness and mute speed

Date of the measurements: 2026-10-06.

The UX audit of 2026-10-05 ([`../audits/2026-10-05-ux-design.md`](../audits/2026-10-05-ux-design.md))
has two sound findings:

- **SD1.** The demos differ by about 4 dB in level, and the Ode to Joy is the quietest. The
  audit measured the RMS of five windows of 6 s, which is not a loudness measure (U3).
- **SD2.** After a click on Mute, the level falls by 22 dB in about 0.8 s, because the hall
  reverb comes after the master gain of the synth.

This report measures the integrated loudness of each full demo through the real output chain,
and the time to silence after a mute. "Not verified" marks a fact that no measurement confirms.

## 1. Result

| Item | Before | After |
|---|---|---|
| Loudness of the six demos after the limiter | -18.04 to -17.55 LUFS (0.49 LU) | -18.05 to -17.97 LUFS (0.08 LU) |
| Highest true peak | -1.01 dBTP (Boulanger) | -1.03 dBTP (Boulanger) |
| The audit RMS method, repeated offline | the audit table within 0.1 dB | not applicable (not a loudness measure) |
| Bar mute of the Boulanger demo: time to -20, -40, and -60 dB | 0.57 s, 1.37 s, 2.07 s | 0.08 s, 0.14 s, 0.21 s |
| Seat mute | the release of the voices, then the room and the hall | no change |

## 2. Machine and method

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, macOS 26.5 |
| Node | 24.10.0 |
| Browser of the chain | Chromium 153.0.8010.12 (the headless shell of Playwright 1.63.0) |
| Code | `main` at `ffddde4`, and the change of SD2 for the rows "after" of section 5 |

The scripts are in [`scripts/demo-loudness/`](scripts/demo-loudness/). They need no Python.

```text
demos/src/<id>.mid
     │ patchedDemos(), buildScore(bytes, 'auto'), stageMix(score, layoutScene(score))
     v
synth.ts: SynthEngine in Node, SoundFont of design 6.2, room of the synth, 48 kHz
     │ float stereo, the full song and 3 s of tail
     v
chain.ts: OfflineAudioContext of headless Chromium
          the code of src/audio/output-chain.ts with the types removed:
          input gain (6.5 dB + piece gain) -> dry + hall convolver -> limiter -> trim
     │
     v
meter.ts: ITU-R BS.1770-4 integrated loudness, loudness range, true peak
```

- The chain is the code of the app and the nodes of the browser, so it needs no model of the
  limiter. `room-and-mix.md` used a Python model of the limiter.
- `meter.ts` uses the K-weighting filters of BS.1770-4 at 48 kHz, blocks of 400 ms with a step
  of 100 ms, the absolute gate -70 LUFS, and the relative gate -10 LU. A stereo sine of 1 kHz at
  -23 dBFS reads -22.99 LUFS. pyloudnorm 0.2.0 (run with `uv`) read two of the A/B files at
  -16.90 and -14.49 LUFS, and `meter.ts` at -16.86 and -14.44 LUFS.
- The true peak oversamples 4 times with a Kaiser-windowed sinc of 192 taps. A sine at 12 kHz
  reads 0.17 dB below its true peak, so the true peaks of this report can be up to about 0.2 dB
  low. An orchestra has little energy at 12 kHz (not verified for each demo).

## 3. Loudness of each demo

`loudness.ts` measured each full demo with the gain of `pieceGainDb()` (before). For a demo more
than 0.05 LU from -18 LUFS, it changed the gain by the difference, rounded to 0.1 dB, and
measured again (after).

| Demo | Gain before | Loudness before | Gain after | Loudness after | Loudness range | Sample peak after | True peak after |
|---|---|---|---|---|---|---|---|
| Boulanger | +0.5 dB | -17.94 LUFS | +0.4 dB | -18.04 LUFS | 15.8 LU | -1.04 dBFS | -1.03 dBTP |
| Beethoven 9 | -3.9 dB | -17.55 LUFS | -4.4 dB | -18.05 LUFS | 21.7 LU | -1.87 dBFS | -1.87 dBTP |
| Eine kleine Nachtmusik | +11.1 dB | -18.01 LUFS | +11.1 dB | -18.01 LUFS | 6.5 LU | -1.55 dBFS | -1.53 dBTP |
| Bach | +1.3 dB | -18.00 LUFS | +1.3 dB | -18.00 LUFS | 8.0 LU | -1.78 dBFS | -1.78 dBTP |
| Beethoven 8 | +3.1 dB | -17.97 LUFS | +3.1 dB | -17.97 LUFS | 24.6 LU | -1.70 dBFS | -1.69 dBTP |
| Mozart K. 315 | +4.3 dB | -18.04 LUFS | +4.3 dB | -18.04 LUFS | 7.4 LU | -1.54 dBFS | -1.53 dBTP |

- Before the change, the Ode to Joy was the loudest demo, 0.45 LU above the target. The limiter
  acts on it at the gain 0 dB, so the loudness at 0 dB of `cheerful-demos.md` (-14.1 LUFS) gave
  a gain that was 0.5 dB too high.
- `DEMO_LOUDNESS` now holds -18 LUFS minus the gain after: Boulanger -18.4, Beethoven 9 -13.6,
  and the four other values as before.
- All true peaks are below -1 dBTP. The Boulanger demo has the smallest margin: 0.03 dB.

## 4. Why the audit found 4 dB

`rms-windows.ts` repeats the method of the audit on the offline output: the RMS of five windows
of 6 s at 10 %, 30 %, 50 %, 70 %, and 85 % of each demo, with the gains before.

| Demo | Mean RMS, audit | Mean RMS, offline | Loudness of the five windows |
|---|---|---|---|
| Bach | -21.6 dB | -21.6 dB | -18.2, -17.0, -16.8, -20.8, -21.4 LUFS |
| K. 315 | -22.1 dB | -22.1 dB | -21.0, -19.6, -15.9, -20.9, -20.9 LUFS |
| Boulanger | -22.3 dB | -22.4 dB | -28.9, -20.9, -27.6, -25.5, -13.1 LUFS |
| Eine kleine Nachtmusik | -22.7 dB | -22.7 dB | -20.3, -18.4, -17.8, -20.3, -20.1 LUFS |
| Beethoven 8 | -25.2 dB | -25.3 dB | -12.6, -17.2, -40.5, -18.6, -32.0 LUFS |
| Ode to Joy | -25.8 dB | -25.9 dB | -33.9, -33.4, -19.6, -33.5, -17.1 LUFS |

- The offline chain gives the audit numbers within 0.1 dB. Thus the browser plays what the
  offline chain gives, and the difference of 4 dB comes from the method.
- Beethoven 8 and the Ode to Joy have a loudness range of 24.6 LU and 21.7 LU. Three of the five
  windows of the Ode to Joy fall in quiet passages: the recitative, and the solo voices before
  the choir. The integrated loudness gates these passages, as a listener does over a full piece.
- A switch at a quiet moment of one demo to a loud moment of another still changes the level.
  The audit heard -23 dB to -13 dB from Boulanger to Eine kleine Nachtmusik. This is the range
  of the music, and the loudness of the full pieces is equal.

## 5. Mute speed

`mute-tail.ts` renders 7 s of the Boulanger demo from 232 s (a loud passage), mutes at 3 s, and
reads the level of the output in windows of 10 ms. The times are from the mute to the last
window above the level of the second before the mute minus 20, 40, or 60 dB.

| Mute | Where | -20 dB | -40 dB | -60 dB |
|---|---|---|---|---|
| Bar mute, before (master gain of the synth 0) | output of the chain | 570 ms | 1,370 ms | 2,070 ms |
| Bar mute, before | output of the synth (room, no hall) | 270 ms | 730 ms | 1,200 ms |
| Bar mute, after (`setOutputVolume()` 0) | output of the chain | 80 ms | 140 ms | 210 ms |
| Seat 7 (flute) alone, then muted | output of the chain | 600 ms | 1,410 ms | 2,060 ms |
| Seat 11 (horn) alone, then muted | output of the chain | 730 ms | 1,540 ms | 2,190 ms |
| Seat 3 (cello) alone, then muted | output of the chain | 960 ms | 1,600 ms | 2,270 ms |
| Seat 7 (flute), voices only (no room, no hall) | output of the synth | 170 ms | 290 ms | 460 ms |
| Seat 11 (horn), voices only | output of the synth | 160 ms | 310 ms | 440 ms |
| Seat 3 (cello), voices only | output of the synth | 370 ms | 770 ms | 970 ms |

- Before the change, the bar mute set the master gain of the synth to 0. The voices stopped at
  once, and the room of the synth and the hall rang on. The audit read -22 dB after about 0.8 s,
  which agrees with this table.
- After the change, the bar mute sets the gain node "volume" after the limiter. With the time
  constant of 30 ms, the gain falls by 8.7 dB each 30 ms, so the curve gives 69 ms, 138 ms, and
  207 ms. The windows of 10 ms round these times up.
- An unmute rises with the same curve. In the A/B files, the level 20 ms after the unmute is
  -21.3 dB after the change, and -16.8 dB before, against -16.1 dB of the steady level. Before
  the change, the unmute was one step of the gain.
- `app-mute.ts` checks the bar mute in the built app (`vite preview` and headless Chromium):
  the Boulanger demo plays from 232 s, and a script clicks Mute. An AnalyserNode before the
  destination read -18.6 dBFS in the second before the click, -39 dBFS 81 ms after it, and
  -86 dBFS 237 ms after it. The reads came only each 80 ms to 160 ms, because the frames of
  the page hold the main thread, so the times are upper limits. After the second click, the
  level was within 6 dB of the old level at the first read, 156 ms after the click. The audit
  read -22 dB after about 0.8 s before the change.
- A seat mute ends the notes of the seat with the release of each voice. The flute and the horn
  fall by 20 dB in 0.17 s, and the cello (with pizzicato notes that ring) in 0.37 s. The rest of
  the tail is the room and the hall. The hall gets the full mix (design 6.1), so the tail of one
  seat cannot stop alone. A seat mute therefore keeps this behavior (design 6.6).

## 6. Files

The A/B files are 32-bit float stereo WAV files at 48 kHz in the scratch folder of the session.
The repository does not hold them:

```text
/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound3/
  ode-to-joy-choir-before.wav   20 s of the full choir from 160 s, gain -3.9 dB
  ode-to-joy-choir-after.wav    the same, gain -4.4 dB
  boulanger-mute-before.wav     20 s from 232 s, bar mute at 8 s, unmute at 13 s, synth gain
  boulanger-mute-after.wav      the same, with the volume gain of the chain
```

The 20 s choir window measures -16.86 LUFS before and -17.36 LUFS after. It is louder than the
full demo, because the full demo has quiet passages.
