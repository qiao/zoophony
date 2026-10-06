# Demo loudness

Date of the measurements: 2026-10-06.

The UX audit of 2026-10-05 ([`../audits/2026-10-05-ux-design.md`](../audits/2026-10-05-ux-design.md))
has two sound findings:

- **SD1.** The demos differ by about 4 dB in level, and the Ode to Joy is the quietest. The
  audit measured the RMS of five windows of 6 s, which is not a loudness measure (U3).
- **SD2.** After a click on Mute, the level falls by 22 dB in about 0.8 s, because the hall
  reverb comes after the master gain of the synth.

This report measures the integrated loudness of each full demo through the real output chain. "Not verified" marks a fact that no measurement confirms.

## 1. Result

| Item | Before | After |
|---|---|---|
| Loudness of the six demos after the limiter | -18.04 to -17.55 LUFS (0.49 LU) | -18.05 to -17.97 LUFS (0.08 LU) |
| Highest true peak | -1.01 dBTP (Boulanger) | -1.03 dBTP (Boulanger) |
| The audit RMS method, repeated offline | the audit table within 0.1 dB | not applicable (not a loudness measure) |

## 2. Machine and method

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, macOS 26.5 |
| Node | 24.10.0 |
| Browser of the chain | Chromium 153.0.8010.12 (the headless shell of Playwright 1.63.0) |
| Code | `main` at `ffddde4` |

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

## 5. Files

The A/B files are 32-bit float stereo WAV files at 48 kHz in the scratch folder of the session.
The repository does not hold them:

```text
/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound3/
  ode-to-joy-choir-before.wav   20 s of the full choir from 160 s, gain -3.9 dB
  ode-to-joy-choir-after.wav    the same, gain -4.4 dB
```
