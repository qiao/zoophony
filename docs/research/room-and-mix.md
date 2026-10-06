# Room and mix: the stage pan, the hall reverb, the limiter, and the loudness of each demo

Date of the measurements: 2026-10-05.

On 2026-10-05, the user said that the sound is "fake" and "dry or thin", and asked for a "very
hifi and professional" sound. The user chose recommendation 1 of
[`sound-quality.md`](sound-quality.md): the room and the mix (the B2 render). This report
measures the change as the app now has it, against the B2 numbers of that report. It also
gives the loudness of each demo, the check of the limiter, and a check of the app in headless
Chromium. "Not verified" marks a fact that no measurement confirms.

## 1. Result

| Item | B2 of `sound-quality.md` | Now | Verdict |
|---|---|---|---|
| Pan | stage x over half the stage side, 80 % width | the same, in the default camera view (30° azimuth) | Done |
| Reverb send | CC 91 from 40 (front) to 80 (back) | the same, from the distance to the podium center | Done |
| Reverb path | a mono send of each channel to a ConvolverNode, through a second worklet output | the full stereo mix to a ConvolverNode, and the short room of the synth for the sends | Changed (section 3) |
| Reverb share, first 30 s | 25 % (set) | 25.8 % in both demos | Near |
| Limiter | Python look-ahead limiter at -1 dBFS | `DynamicsCompressorNode` at -2 dBFS, ratio 20, and a trim of -1.14 dB | Done |
| Loudness | matched to the current sound | -18 LUFS for each demo at the limiter input | Done |
| Clipping in headless Chromium, Boulanger demo | not measured | peak -1.24 dBFS, no read at full scale | Pass |

## 2. Machine and code

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, macOS 26.5 |
| Node | 24.10.0 |
| Analysis | Python 3 with numpy 2.5.3 and scipy 1.18.1 |
| Browser of the app check and of the makeup gain | Chromium 153.0.8010.12 (the headless shell of Playwright 1.63.0) |
| Browser of the convolver cost | Google Chrome 154.0.8037.98, headless |
| Code | The worktree branch of this change, from commit `5191be2` |

The scripts are in [`scripts/room-and-mix/`](scripts/room-and-mix/). The Python scripts import
`analyze.py` of the sound quality research from a scratch folder. Change the `sys.path` line to
the folder of the copy to run them again.

## 3. The chain

The processor (`src/audio/processor.ts`) stays as it was, because condition 3 of the step 1
review keeps it until the Safari check. Thus the worklet has one stereo output, and the B2 chain
with a second output for the mono send is not possible now. The hall reverb therefore gets the
full stereo mix. The reverb send of each channel goes to the short room of the synth, which
makes the back rows sound farther away.

```text
AudioWorkletNode (1 stereo output, processor.ts unchanged)
+------------------------------------------------------------+
| spessasynth_core                                           |
|  voices --> pan from the stage (CC 10) ----------------+---+--+
|        \--> send from the depth (CC 91) --> room ------+   |  |
|             (GS "Room 1", locked)       no chorus          |  |
+------------------------------------------------------------+  |
                                                                v
                                   GainNode (piece gain, gainDb of the demo)
                                         |                      |
                                         v                      v
                                GainNode (dry, 1)    ConvolverNode (hall IR, stereo,
                                         |                      normalize off)
                                         |                      |
                                         |           GainNode (wet, 0.0625)
                                         v                      v
                               DynamicsCompressorNode (limiter: -2 dBFS, knee 0, ratio 20,
                                                       attack 2 ms, release 150 ms)
                                                     |
                                           GainNode (trim, -1.14 dB)
                                                     |
                                            context.destination
```

- The ConvolverNode gets a stereo input and a stereo impulse response, so it convolves the left
  input with the left channel of the response and the right input with the right channel. The
  scripts do the same.
- The impulse response is `assets/hall/st-pauls-hall-c8m.wav`: the decode of `sound-quality.md`
  section 5, with the direct sound removed and 2.5 s long. `assets/hall/README.md` gives the
  steps. The direct sound held 70 % of the energy of the first decode. The dry path already holds
  the direct sound, so a copy of it in the wet path only colors the dry sound.
- The room of the synth runs in each block also with no send, as the plate did before. The
  chorus of the synth is a processor that adds nothing.

## 4. A/B against B2: the first 30 s

`render.ts` renders the first 30 s of each demo with the `SynthEngine` of this change and the
stage mix of `stageMix()`. A second render with `reverbGain` 0 gives the dry reference. `final.py`
then applies the chain of section 3, with a model of the limiter (section 6). The B2 columns are
from `sound-quality.md` section 7.2, where the loudness matches the current sound (A).

| Measure | B2 Beethoven | Now Beethoven | B2 Boulanger | Now Boulanger |
|---|---|---|---|---|
| Piece gain | not applicable | -3.0 dB | not applicable | 0.0 dB |
| Peak | -4.00 dBFS | -5.20 dBFS | -6.65 dBFS | -4.02 dBFS |
| Peak, loudness matched to A | -4.00 dBFS | -3.28 dBFS | -6.65 dBFS | -5.20 dBFS |
| Integrated loudness | -18.0 LUFS (matched) | -19.9 LUFS | -24.5 LUFS (matched) | -23.3 LUFS |
| Loudness range | 7.2 LU | 7.3 LU | 15.4 LU | 15.6 LU |
| Reverb share (room and hall) | 25 % (set) | 25.8 % | 25 % (set) | 25.8 % |
| Hall share | 25 % | 19.7 % | 25 % | 20.4 % |
| Side to mid energy | -9.2 dB | -8.4 dB | -8.3 dB | -9.0 dB |
| L/R correlation | 0.794 | 0.749 | 0.748 | 0.780 |
| L/R balance | +1.27 dB | +0.20 dB | +1.16 dB | -0.76 dB |
| Spectral centroid | 805 Hz | 802 Hz | 822 Hz | 857 Hz |
| Render of each block in Node, median | 0.028 ms (tap, no plate) | 0.070 ms | not measured | 0.089 ms |

- The reverb share is the energy of the output minus the dry reference, over the energy of the
  output. The hall share is the energy of the wet path over the energy of the output.
- The image is a little wider than B2 in the Beethoven demo and a little narrower in the
  Boulanger demo. The balance is nearer to 0 dB than in B2, because the 30° view moves the back
  rows to the right and the violins less to the left.
- The render is 0.070 ms, against 0.028 ms in B2 and 0.072 ms before the change (A). B2 had a
  tap in place of the plate. The room keeps most of the cost of the plate. The block has 2.67 ms.
- The limiter did not act in the first 30 s of either demo.

The files are 32-bit float stereo WAV files at 48 kHz in the scratch folder of the session. The
repository does not hold them:

```text
/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound2/
  b2-app-beethoven-30s.wav                the app chain, at the level of the app
  b2-app-boulanger-30s.wav
  b2-app-beethoven-30s-matched-to-a.wav   the same, at the loudness of the A files
  b2-app-boulanger-30s-matched-to-a.wav
  b2-app-beethoven-full.wav               the full demos, at the level of the app
  b2-app-boulanger-full.wav
```

The A files of the current sound are in the `sound/` folder next to it, as `sound-quality.md`
section 7.3 gives.

## 5. The wet gain and the loudness of each demo

`chain.py` found the wet gain for a hall share of 20 % of the first 30 s: 0.06252 for the
Beethoven demo and 0.06286 for the Boulanger demo. The app uses 0.0625. With the room of the
synth, the reverb share is then about 26 %, near the 25 % of B2.

`render.ts` then rendered each full demo, and `final.py` applied the chain with the gain of the
piece. The loudness at 0 dB gives the gain of each demo to -18 LUFS (`DEMO_LOUDNESS` in
`src/audio/demo-loudness.ts`):

| Demo | Loudness at 0 dB | Gain | Peak before the limiter | Peak after the trim | Limiter active | Loudness after | L/R correlation | Side to mid |
|---|---|---|---|---|---|---|---|---|
| Boulanger | -18.0 LUFS | 0.0 dB | +1.22 dBFS | -1.67 dBFS | 846 ms | -18.0 LUFS | 0.718 | -7.8 dB |
| Beethoven 5 | -15.0 LUFS | -3.0 dB | -2.76 dBFS | -2.76 dBFS | 0 ms | -18.0 LUFS | 0.742 | -8.3 dB |
| Grieg | -17.7 LUFS | -0.3 dB | -2.96 dBFS | -2.96 dBFS | 0 ms | -18.0 LUFS | 0.725 | -7.9 dB |
| Mozart K. 488 | -22.1 LUFS | +4.1 dB | -3.43 dBFS | -3.43 dBFS | 0 ms | -18.0 LUFS | 0.533 | -5.1 dB |
| Mozart K. 315 | -20.6 LUFS | +2.6 dB | -1.01 dBFS | -1.89 dBFS | 1,010 ms | -18.0 LUFS | 0.730 | -7.9 dB |
| Handel | -20.4 LUFS | +2.4 dB | -3.70 dBFS | -3.70 dBFS | 0 ms | -18.0 LUFS | 0.740 | -8.1 dB |

- Before this change, the demos differed by 2.9 LU (Beethoven -16.2 LUFS, Boulanger -19.1 LUFS,
  `sound-quality.md` section 3.1). With the room and the hall and no piece gain, they differ by
  7.1 LU. The gain brings all six to -18.0 LUFS.
- "Limiter active" counts the time with more than 0.1 dB of gain reduction in the model. With
  the threshold -2 dBFS, `over.py` found 9 windows of 10 ms above the threshold in the Boulanger
  demo and 10 in the Mozart K. 315 demo.
- Mozart K. 488 has the lowest correlation, because the piano channels pan far left (CC 10 = 15).

## 6. The limiter

An OfflineAudioContext of Chromium 153 (`makeup-check.ts`) sent a sine of 440 Hz through a
`DynamicsCompressorNode` with the settings of the limiter:

| Input | Output |
|---|---|
| -30 dBFS | -28.86 dBFS |
| -10 dBFS | -8.86 dBFS |
| -3 dBFS | -1.86 dBFS |
| -1 dBFS | -0.75 dBFS |
| 0 dBFS | -0.67 dBFS |
| +3 dBFS | -0.45 dBFS |

The node adds a makeup gain of +1.14 dB below the threshold. This agrees with the makeup gain of
the Web Audio specification: `(1 / g)^0.6`, where `g` is the gain of the curve at 0 dBFS,
here -1.9 dB. A trim gain of -1.14 dB after the node removes it. The chain then does not change
the level below the threshold, and a peak of +3 dBFS comes out at about -1.6 dBFS.

`final.py` models the node: the detector reads the peak of the next 6 ms of both channels, a
one-pole filter with the attack and the release time constants smooths the gain reduction, and
the audio goes 6 ms late. The model is not the code of Chromium, so its numbers are estimates.
A first model with no look-ahead let the Boulanger demo reach +1.89 dBFS.

## 7. The app in headless Chromium

`audio-check.ts` starts the Vite dev server and opens the app at 1440 × 900 in headless Chromium
with `--autoplay-policy=no-user-gesture-required`. An init script records each `connect()` of
the page, and taps the input of the destination with a channel splitter and two AnalyserNodes
(FFT size 32,768, read each 200 ms, so the reads overlap and cover each sample). The script
clicks play on the default demo (Boulanger), plays 20 s, then sends a seek to 234 s to the port
of the worklet node, and plays 52 s more: the loudest part of the piece.

| Measure | App as committed | App with the mix and the gain wired for the check |
|---|---|---|
| Node links | worklet -> piece gain -> dry and convolver, convolver -> wet, dry and wet -> limiter -> trim -> destination | the same |
| Impulse response in the convolver | 2 channels, 2.5 s, 48 kHz, normalize off | the same |
| Peak, first 20 s | -12.68 dBFS | -13.01 dBFS |
| Peak, 234 s to 286 s | -1.19 dBFS | -1.24 dBFS |
| Reads at full scale | 0 | 0 |
| L/R correlation of all reads | 0.757 | 0.662 |
| L/R balance of all reads | +1.33 dB | -0.46 dB |
| Console errors and warnings | none | none |

- The committed app does not pass the mix and the gain to the `Player` yet (`src/app/` belongs
  to the UI work). The right column wired them for the check with a temporary change of
  `#loadAudio()` in `src/app/app.ts`, which is not committed. The left column thus plays the pan
  of the file. Its balance of +1.33 dB matches the left tilt of `sound-quality.md`.
- The peak of 234 s to 286 s is -1.24 dBFS. Before the trim gain, the same check gave -0.05 dBFS.
- The browser fetched the impulse response once, after the first frame.

## 8. Cost

| Item | Value |
|---|---|
| ConvolverNode with the 2.5 s stereo response, OfflineAudioContext, Google Chrome 154 | 73.8 µs for each block of 128 frames (2.8 % of 2.67 ms) |
| DynamicsCompressorNode | 5.6 µs for each block |
| Download of the impulse response | 480,044 B, after the first frame. 249 KB with gzip, if the server compresses WAV files (not verified for GitHub Pages) |
| Memory of the impulse response | 2.5 s × 48,000 × 2 channels × 4 bytes = 0.96 MB of float data, plus the FFT buffers of the node (not verified) |
| First download (7.2) | 232,492 B, no change. The WAV file is an asset of the audio chunk |
