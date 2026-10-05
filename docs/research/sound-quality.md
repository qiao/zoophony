# Sound quality: diagnosis, sources, and processing

Date of the measurements: 2026-10-05.

The user reported on 2026-10-05: "The sound quality is bad. How can we make the sound very hifi
and professional?" A follow-up question gave two more facts. The instruments "sound fake", and
the mix is "dry or thin". The user did not report distortion or dropouts.

This report measures the current sound, surveys sample sources and impulse responses (IRs) with
licenses that permit our use, measures the cost of each processing step, and compares the current
sound with three changes in an A/B test. "Not verified" marks a fact that no measurement or
primary source confirms.

## 1. Machine, code, and method

| Item | Value |
|---|---|
| Machine | MacBook Pro, Apple M1 Max, macOS 26.5 |
| Node | 24.10.0 |
| Browser for the cost test | Google Chrome 154.0.8037.95, headless, with Playwright 1.63.0 |
| Code | Commit `64c132d`, with the demo files after `demos/patches.json` (design 8.3) |
| Synth | spessasynth_core 4.3.22, `SynthEngine` of `src/audio/engine.ts`, 48 kHz |
| Analysis | Python 3 with numpy 2.5.3 and scipy 1.18.1 |

The scripts were in the scratch folder of the research session. The repository does not hold
them or the audio files. Each step below gives enough detail to make the script again.

1. **Render.** Build the `Score` with `buildScore(bytes, 'auto')`. Make the banks with
   `testBanks()`, as the decode Worker does. Play from 0 with the `OfflineHarness` of
   `src/audio/test-banks.ts`, and write each 128-frame block to a 32-bit float stereo WAV file.
2. **Variants.** Before the first block, send controllers to the synth with `processMessage()`.
   A play from 0 does not reset the synth (`applyCommand()` in `audio/block-scheduler.ts`), so
   the controllers stay. With `lockController()`, a file cannot change them later.
3. **Send tap.** spessasynth_core accepts a custom `reverbProcessor` in `SynthProcessorOptions`.
   A tap processor adds the mono reverb send of each block into a buffer and adds nothing to the
   output. Python then convolves this send with a hall IR, as a `ConvolverNode` would do.
4. **Measures.** Peak, samples at or above full scale, RMS, integrated loudness and loudness range
   (ITU-R BS.1770-4 K-weighting with the absolute and relative gates), the side to mid energy
   ratio, the L/R correlation, the L/R energy balance, and the share of each octave band in the
   mid signal (Welch, 8192 points).
5. **Effect share.** Render the same score again with `reverbGain` 0 and `chorusGain` 0. The
   energy of the difference, divided by the energy of the normal render, is the effect share.
6. **Reverb time.** T30 of each IR with Schroeder backward integration, broadband and in the
   octaves at 500 Hz, 1 kHz, and 2 kHz.

## 2. The current chain

The current chain has one node. The synth adds its own plate reverb and chorus only when a
channel has a send.

```text
AudioWorkletNode (processor.ts, 1 stereo output)
+-------------------------------------------------------------+
| SynthEngine -> spessasynth_core                             |
|                                                             |
|  voices (hermite) --> channel gain, pan (CC10) --+--------->+---> context.destination
|                         |                        ^          |     (no limiter)
|                         +-- CC91 send --> plate -+          |
|                         +-- CC93 send --> chorus +          |
+-------------------------------------------------------------+
```

| Setting | Value | Source |
|---|---|---|
| Sample rate | The default of the `AudioContext` (48 kHz on the development Mac). The tests use 48 kHz | `player.ts`, `TEST_SAMPLE_RATE` |
| Interpolation | Hermite, the best of the three types (linear, nearest, hermite) | `DEFAULT_GLOBAL_SYSTEM_PARAMETERS`, `dist/index.js` line 13050 |
| Voice cap | 350 | same, line 13034 |
| Master gain | `0.6 × gain`. `SPESSASYNTH_GAIN_FACTOR` is 0.6, and `setVolume()` sets `gain` | `dist/index.js` lines 1387 and 12878 |
| Effects | On. `reverbGain` 1, `chorusGain` 1 | `engine.ts` constructor, defaults |
| Reverb | Dattorro plate with the GS reverb characters (`SpessaSynthReverb`) | `dist/index.js` lines 19017 and 19149 |
| Reset value of CC91 (reverb send) and CC93 (chorus send) | 0 | `DEFAULT_MIDI_CONTROLLERS`, `dist/index.js` lines 5153 to 5172 |
| Reset value of CC10 (pan) | 64, the center | same |
| Output chain | `node.connect(context.destination)`. There is no limiter and no compressor | `player.ts`, `#makeEngine()` |

## 3. Diagnosis

### 3.1 Measurements of the full demos

| Measure | Demo 1 (Beethoven, 319.6 s) | Boulanger (283.7 s) |
|---|---|---|
| Peak | -1.84 dBFS | +0.66 dBFS |
| Samples at or above full scale | 0 | 12 |
| Integrated loudness | -16.2 LUFS | -19.1 LUFS |
| Loudness range | 7.0 LU | 14.4 LU |
| Effect share (reverb and chorus) | 0.2 % (-27.6 dB) | 0.2 % (-26.9 dB) |
| Side to mid energy | -23.8 dB | -11.2 dB |
| L/R correlation | 0.992 | 0.875 |
| L/R balance | -0.07 dB | +1.72 dB (left louder) |
| Spectral centroid | 927 Hz | 1052 Hz |
| Octave band at 63 Hz | -29.3 dB | -16.9 dB |
| Octave band at 8 kHz | -31.8 dB | -21.5 dB |
| Render time for each block, p99, effects as now | 0.243 ms | not measured |
| PCM of the banks | 5.9 MB | 9.0 MB |

An octave band value is the energy of the band divided by the energy of the mid signal.

### 3.2 Defects

**D1. The mix is dry.** The reverb and the chorus give 0.2 % of the energy in both demos. Demo 1
sends no CC91, and spessasynth_core resets CC91 to 0. The Boulanger file (a MuseScore export)
sends CC91 0 and CC93 0 on all 16 channels. Thus no channel sends to the reverb, and the
orchestra plays in a room with no reflections.

**D2. The image is mono or wrong.** Demo 1 sends no CC10, so all 12 channels play in the
center. The L/R correlation is 0.992, and the side signal is 23.8 dB below the mid signal. The
Boulanger file pans 9 of its 16 channels, but all string channels stay in the center. Three of
its pans contradict the stage that the user sees:

| Boulanger section | Pan of the file (CC10) | Mean stage x of its players | Side on the stage |
|---|---|---|---|
| Trumpet | 35 (left) | +1.47 m | right |
| Trombone | 51 (left) | +3.72 m | right |
| Percussion | 84 (right) | -4.14 m | left |

The camera looks from +z, so a negative x is on the left of the audience (`defaultView()` in
`scene/view.ts`).

**D3. The samples sound synthetic.** These are the facts of the GeneralUser GS presets of demo 1
and of the related presets:

| GM program | Preset | Samples | Sample rates (Hz) | Velocity layers at keys 48 and 67 | Median loop | Median sample length | SF3 file |
|---|---|---|---|---|---|---|---|
| 40 | Violin | 19 | 27,174 and 44,100 | 2 | 0.477 s | 1.30 s | 236 KB |
| 41 | Viola | 13 | 29,997 to 34,797 | 1 | 0.177 s | 0.98 s | 180 KB |
| 42 | Cello | 23 | 15,000 to 30,002 | 2 | 0.201 s | 0.99 s | 254 KB |
| 43 | Double Bass | 13 | 15,000 to 33,000 | 1 | 0.196 s | 0.68 s | 149 KB |
| 47 | Timpani | 4 | 8,000 to 44,100 | 1 (12 velocity zones play the same sample) | 1.150 s | 2.33 s | 48 KB |
| 56 | Trumpet | 7 | 31,137 to 44,100 | 1 | 0.002 s | 0.35 s | 55 KB |
| 60 | French Horns | 19 | 11,025 to 44,100 | 3 | 0.005 s | 0.20 s | 143 KB |
| 68 | Oboe | 6 | 24,641 to 25,173 | 1 | 0.209 s | 1.16 s | 62 KB |
| 70 | Bassoon | 20 | 24,641 to 33,000 | 1 | 0.012 s | 0.21 s | 149 KB |
| 71 | Clarinet | 6 | 16,796 to 16,803 | 1 | 0.100 s | 0.25 s | 33 KB |
| 73 | Flute | 12 | 32,000 | 1 | 0.347 s | 1.02 s | 168 KB |

- All samples are mono.
- 8 of the 11 presets have one velocity layer: a soft note is a loud note at a lower level.
- The brass and the bassoon loop 1 to 12 ms, which is one or a few wave cycles. A held note then
  has a static spectrum with no bow or breath noise.
- A sample rate of 16.8 kHz (clarinet) has no content above 8.4 kHz. A rate of 25 kHz (oboe) has
  none above 12.5 kHz.
- Demo 1 plays each violin seat of 4 players with the solo violin preset (GM 40). One solo sample
  for a section of players gives the "thin" sound. The MIDI file asks for GM 40 to 43, and
  design 3.5 maps these programs to the string sections.

**D4. No limiter, and the level changes between demos.** The Boulanger render has 12 samples
above full scale. The output clips them. The two demos differ by 2.9 LU. The user
did not report distortion, so this defect is small.

These settings are correct and need no change: the hermite interpolation, the sample rate of the
device, the voice cap of 350, and the render time (p99 0.243 ms, 9 % of the 2.67 ms block).

## 4. Sample sources

### 4.1 Survey

The license rules are those of design 7.3 and 8.1: the site serves each file itself, so the
license must permit redistribution in a public repository and on a public website, next to MIT
code. spessasynth_core reads SF2, SF3, and DLS. It has no SFZ input
(<https://github.com/spessasus/spessasynth_core>).

| Name | License | Redistribution | Coverage of our sections | Quality | Size for demo 1 | Effort |
|---|---|---|---|---|---|---|
| GeneralUser GS 2.0.3 (now) | GeneralUser GS License v2.0 | yes | full GM | mono, mostly 1 layer, 8 to 44 kHz, short loops (3.2) | 1.51 MB | none |
| MS Basic (MuseScore 4, the former MuseScore_General_HQ 0.2) | MIT, with parts in the public domain and CC0 | yes, keep the notices | full GM. Strings 44, 45, 48, 49 are VSCO-2 CE section samples. The other instruments are FluidR3 | VSCO strings: 44.1 kHz, 2 velocity layers, attack zones, looped. FluidR3 solo presets: 1 layer | 1.57 MB as is. With section strings for 40 to 43: 15.2 MB (2 layers) or 9.0 MB (loud layer and attack) | none as is. A build step for section strings (4.3) |
| MuseScore_General 0.2.0 | MIT, parts PD and CC0 | yes | full GM. Strings are one FluidR3 "Strings" instrument | 32 to 44.1 kHz, 1 layer | about 2.6 MB of sample data (Vorbis at about 140 kbit/s) | none |
| FluidR3_GM 3.1 | MIT | yes | full GM | the same orchestral samples as above | not measured | none |
| VSCO-2 Community Edition 1.1.0 | CC0 1.0 | yes, no conditions | strings (sections and solo, sustain, pizzicato, spiccato, tremolo), all winds and brass, harp, timpani, mallets. No choir | 44.1 kHz stereo, 2 or 3 layers, some round robins. No loop points | not measured | high: SFZ to SF2, new loops, cut the size |
| VCSL | CC0 1.0 | yes | harp, grand and upright pianos, timpani, cymbals, gongs, drums, mallets | 44.1 or 48 kHz, 2 or 3 layers | not measured | medium |
| Upright Piano KW (2022-02-21) | CC0 1.0 | yes | piano only | stereo, 2 layers | not for demo 1 (27 MiB SF2) | none |
| Salamander Grand Piano V3 | CC BY 3.0 | yes, with a credit to Alexander Holm | piano only | 48 kHz, 24 bit, 16 layers | not for demo 1 (296 MiB SF2) | low, but a large cut |
| University of Iowa MIS | "may be downloaded and used for any projects, without restrictions" (no formal license) | yes | solo strings with arco and pizzicato, winds, brass, piano, mallets. No harp, timpani, or choir | 44.1 kHz mono scales at pp, mf, ff, anechoic, no loops | not measured | very high |
| Sonatina Symphonic Orchestra | Creative Commons Sampling Plus 1.0 (retired) | unclear: verbatim copies only for noncommercial use. It also holds Philharmonia samples | full orchestra and choir | stereo, 44.1 kHz | not measured | do not use |
| Virtual Playing Orchestra 3.3 | mixed: Sampling Plus, CC BY-SA, CC0, Iowa, Philharmonia | no: parts are "kept for personal use only or is given away for free" | full orchestra | looped sustains | not measured | do not use |
| Philharmonia Orchestra samples | own terms | no: they "must not be sold or made available 'as is' (i.e. as samples or as a sampler instrument)" | full orchestra | MP3 | not measured | do not use |
| Sonivox EAS | Apache-2.0 | yes | GM | 22 kHz, very small | not measured | not worth it |
| SGM, Arachno, Timbres of Heaven, Aegean, Nice Strings | all rights reserved, noncommercial, or no permission | no | | | | do not use |
| Musyng Kite | CC BY-SA 3.0 claimed, mixed sources | unclear | full GM | | 1.07 GB | do not use |

Sources: the MuseScore license file
(<https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General_License.md>)
says "MuseScore_General.sf2 is shared under the MIT license" and "The acknowledgements and
copyright notices above must be included in any derivative work". The MS Basic file is in
<https://github.com/musescore/MuseScore/tree/main/share/sound>, and commit `cdf6f27473` renamed
MuseScore_General to MS Basic. The Debian copyright file lists "Ensemble strings from ... VSCO
2.1.1 Community Edition (CC0)"
(<https://metadata.ftp-master.debian.org/changelogs/main/m/musescore-general-soundfont/unstable_copyright>).
VSCO-2 CE: <https://github.com/sgossner/VSCO-2-CE>. VCSL: <https://github.com/sgossner/VCSL>.
Sampling Plus: <https://creativecommons.org/licenses/sampling+/1.0/legalcode>. Virtual Playing
Orchestra: <http://virtualplaying.com/virtual-playing-orchestra/>. Philharmonia: the licensing
paragraph of <https://philharmonia.co.uk/resources/sound-samples/> (read from an archived copy,
because the live page loops on redirects). Iowa: <https://theremin.music.uiowa.edu/MIS.html>.
Salamander: <https://github.com/sfzinstruments/SalamanderGrandPiano>. Upright Piano KW:
<https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html>. Sonivox:
<https://github.com/EmbeddedSynth/sonivox>.

The files that the measurements used:

| File | URL | Bytes | SHA-256 |
|---|---|---|---|
| `MS Basic.sf3` | <https://raw.githubusercontent.com/musescore/MuseScore/main/share/sound/MS%20Basic.sf3> | 51,278,610 | `5ea2375e8bd7d8e71def1036978c1621e85b66934169b6a2744b27b9b3c2d99c` |
| `MuseScore_General.sf3` 0.2.0 | <https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3> | 39,900,972 | `5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3` |

### 4.2 Size of each demo

The sizes are the split SF3 files of the presets of each demo, as `tools/split-soundfont.ts`
writes them.

| Demo | GeneralUser GS | MS Basic as is | The large presets of MS Basic |
|---|---|---|---|
| Beethoven 5 (demo 1) | 1.51 MB | 1.57 MB | none |
| Boulanger | 2.33 MB | 7.75 MB | 45 pizzicato: 5.35 MB |
| Grieg | 0.84 MB | 0.90 MB | none |
| Handel | 1.18 MB | 1.60 MB | 52 choir: 0.65 MB |
| Mozart K. 315 | 1.07 MB | 0.99 MB | none |
| Mozart K. 488 | 1.58 MB | 15.64 MB | 0 piano: 9.18 MB, 45 pizzicato: 5.35 MB |

MS Basic as is changes almost nothing for demo 1, because demo 1 uses the solo presets 40 to 43,
and in MS Basic these are FluidR3 solo samples. The VSCO section strings are only in the
ensemble presets 44, 45, 48, and 49.

### 4.3 Section strings for demo 1

A build step can make new presets 40 to 43 from the instruments of MS Basic preset 48
("Strings Fast"). The preset has one instrument for each section: "Violins Fast", "Violas Fast",
"Celli Fast", and "Basses Fast", each with a soft layer (`_v1`), a loud layer (`_v2`), and an
attack layer (`_Att`). The test kept the zones of one section for each program, and set the
program number of the copy.

| Cut | SF3 for 40 to 43 | Demo 1 download | PCM of demo 1 | Decode of 40 to 43 in Node |
|---|---|---|---|---|
| GeneralUser GS (now) | 0.82 MB | 1.51 MB | 5.9 MB | not measured |
| Section strings, 2 layers | 14.51 MB | about 15.2 MB | 150.7 MB | 1,381 ms |
| Section strings, loud layer and attack only | 8.28 MB | about 9.0 MB | 85.4 MB | 822 ms |

- The samples of preset 48 hold 1,678 s of audio at 44.1 kHz. Each of the 414 samples is looped,
  and only 87 s come after the loop ends. The loops are long (median 2.5 s), so the sample cut
  must make the loops shorter.
- The load target (design 9.7) is 2 s at 50 Mbit/s for demo 1. At 50 Mbit/s, 9.0 MB takes 1.44 s
  and 15.2 MB takes 2.43 s, before the decode. The spike measured a load of 481 ms (median) for
  the 1.39 MB of demo 1 ([`audio-spike.md`](audio-spike.md)).
- The memory target is 100 MB of PCM for each demo. The 2-layer cut fails it (150.7 MB).
- A cut to one layer, 32 kHz, and loops of about 1.5 s gives an estimate of 2.5 to 3 MB of SF3
  and 20 to 25 MB of PCM for the four presets. This estimate is not verified. It needs new loop
  points and a listening check.
- The section strings add voices, because an attack zone sounds with each sustain zone. The
  30 s render of demo 1 had a median of 0.068 ms for each block against 0.028 ms with the
  GeneralUser GS strings (both with the send tap). The p99 was 0.18 to 0.25 ms in three runs.

## 5. Impulse responses

The survey looked for a concert hall IR with a reverb time near 2 s and a license that permits
redistribution and changes (a downmix, a trim, a new encode). The main OpenAIR website showed
"Account Suspended" on 2026-10-05. Its WAV files are still on the file server of the University
of York (<https://webfiles.york.ac.uk/OPENAIR/IRs/>).

| Source | License | Redistribution and changes | Reverb time | Format | Use |
|---|---|---|---|---|---|
| Huddersfield 360 BRIR and FOA database, St Paul's Hall | CC BY 4.0, with its own `License.txt` | yes, with a credit and a note of the changes | T30 2.06 s broadband, 2.47 s at 500 Hz, 2.27 s at 1 kHz, 1.89 s at 2 kHz (position C8m, our measurement) | first-order Ambisonics (AmbiX), 48 kHz float, 5 s | **first choice** |
| Detmold SRIR, Konzerthaus (about 600 seats) | CC BY 4.0 | yes, with a credit | T30 1.59 s (RevC1, no electronic reverb) and 2.27 s (RevC3) | 6-channel open array, 48 kHz float. The dummy-head files stop at 1.5 s | second choice. Stereo needs SDM processing |
| OpenAIR, Usina del Arte Symphony Hall | CC BY 4.0 on the current site. No page on the old site | yes, but only the current footer gives the license | T30 2.08 s at 500 Hz | binaural stereo (2.2 s), B-format with channels that start at different times | third choice |
| OpenAIR, Jack Lyons Concert Hall and Spokane Woman's Club | old site: public domain and CC BY 3.0. New site: CC BY 4.0 | yes | 1.9 s and 2.5 s | B-format at 96 kHz, stereo XY at 44.1 kHz | possible |
| OpenAIR, St Albans Lady Chapel, York Minster, Hamilton Mausoleum, and other halls | old site: CC BY-SA 3.0 or BY-NC-ND 3.0. New site: CC BY 4.0 | do not depend on the new footer alone | | | avoid |
| EchoThief | own license: no "embedding of EchoThief in software, applications" | no | | | do not use |
| Voxengo | copies must be "complete and unaltered" | no change permitted | | | do not use |
| Samplicity Bricasti M7 | "offered free of charge and as-is", no redistribution grant. The IRs come from a hardware reverb unit | no | | | do not use |
| Pori concert hall (Aalto) | "free for noncommercial purposes" | no | | | do not use |
| Aachen AIR (RWTH) | MIT | yes | 4.9 to 6.4 s (a former church) | binaural, one ear for each file | poor fit |
| GoogleChromeLabs web-audio-samples, Tone.js audio | Apache-2.0 | yes | no concert hall | | poor fit |

Sources: <https://zenodo.org/records/2641166>,
<https://github.com/APL-Huddersfield/360-BRIR-FOAIR-database>,
<https://zenodo.org/records/4116247>, the OpenAIR pages in the Internet Archive (for example
<https://web.archive.org/web/2018/http://www.openairlib.net/auralizationdb/content/york-minster>),
<https://www.voxengo.com/impulses/>, <https://samplicity.com/downloads/>,
<https://research.spa.aalto.fi/projects/poririrs/>, and
<https://www.iks.rwth-aachen.de/en/research/tools-downloads/databases/aachen-impulse-response-database/>.
CC BY 4.0 permits adapted material (section 2(a)(1)(B)) and asks for a note of the changes
(section 3(a)(1)(B)): <https://creativecommons.org/licenses/by/4.0/legalcode>.

The A/B uses a stereo decode of the St Paul's Hall file `FOA/B Format (AmbiX)/C8m.wav`:

| Item | Value |
|---|---|
| Decode | two virtual supercardioids at ±70°: `L = 0.37·W + 0.63·(cos 70°·X + sin 70°·Y)`, and R is the mirror. AmbiX channel order W, Y, Z, X |
| Changes | 49 ms of silence before the direct sound removed, a 50 ms cosine fade at the end, peak at -1 dBFS |
| File | 48 kHz, 2 channels, float, 4.95 s, 1,901,308 bytes |
| SHA-256 | `822cc1d1358992c97ac87e1489942ae3f87d1f16f5c0bbd9725ae1755a66e05f` |
| L/R correlation of the tail | 0.32 |
| Credit | Bacila, B. I., and Lee, H. (2019). 360° BRIR Database for 6DOF Spatial Perception Research. AES e-Brief 513. CC BY 4.0. Changed: decoded to stereo, trimmed |

Size of the IR asset:

| Encoding | Size |
|---|---|
| float WAV | 1.90 MB |
| 16-bit WAV | 955 KB |
| 16-bit WAV after gzip | 300 KB |
| Opus at 96 kbit/s | 54 KB |
| AAC at 128 kbit/s | 59 KB |

- The decode Worker already holds stb-vorbis, so an Ogg Vorbis IR can decode there, with no
  dependency on the codecs of `decodeAudioData()` in Safari. The size of a Vorbis IR is not
  measured. It is near the Opus size.
- The `ConvolverNode` holds the IR as float data: 4.95 s × 48,000 × 2 channels × 4 bytes =
  1.9 MB, plus its FFT buffers. The size of the FFT buffers is not verified.

## 6. Processing

### 6.1 Proposed chain

The proposed chain moves the reverb out of the worklet. A tap processor in spessasynth_core
gives the mono reverb send on a second output. The browser convolves it with the hall IR on its
own audio thread.

```text
AudioWorkletNode (2 outputs)
+--------------------------------------------------+
| spessasynth_core                                 |
|  voices --> pan from the stage x (CC10, locked) -+-- out 0: dry stereo -----------+
|         \-> send from the row depth (CC91, locked)                                |
|               --> tap ReverbProcessor -----------+-- out 1: mono send --+         |
+--------------------------------------------------+                      |         |
                                                                          v         |
                                                  ConvolverNode (hall IR, stereo)   |
                                                                          |         |
                                                                GainNode (wet)      |
                                                                          v         v
                                                              GainNode (master volume)
                                                                          |
                                                       DynamicsCompressorNode (limiter)
                                                                          |
                                                                context.destination
```

The app can calculate the mix of each synth channel from the scene layout:

```typescript
/** The mix of one synth channel, from the stage places of the players of its seats. */
interface ChannelMix {
  /** `port * 16 + channel` (design 3.4). */
  readonly channel: number;
  /** -1 (left of the audience) to 1. The mean stage x of the players, over half the stage side. */
  readonly pan: number;
  /** 0 to 127. The reverb send: more for a seat at the back. */
  readonly reverbSend: number;
}
```

### 6.2 Options and costs

| Option | Fixes | Cost in the worklet | Other cost | Effort |
|---|---|---|---|---|
| Pan of each channel from the mean stage x of its players, CC10 locked | D2 | 0 | none | low |
| Reverb send of each channel from the row depth (CC91 40 at the front to 80 at the back), CC91 locked, with the built-in plate | D1 | p99 0.243 ms with sends against 0.203 ms with `reverbGain` 0 (full demo 1) | none | low |
| Convolution reverb with a hall IR on the send tap | D1 | less than now: median 0.028 ms against 0.072 ms, because the plate and the chorus stop | Chrome: 131 µs for each block (4.9 % of the 2.67 ms block) for the 4.95 s stereo IR of section 5 in an `OfflineAudioContext`, on the browser audio thread. Download and memory of the IR (section 5) | medium: a second worklet output, a tap processor, one asset |
| Chorus off (CC93 0, locked) | an orchestra has no chorus | saves part of the 0.044 ms of the effects | none | low |
| Limiter: `DynamicsCompressorNode` (threshold -6 dB, ratio 20, knee 0, attack 2 ms, release 150 ms) | D4 | 0 | Chrome: 5.5 µs for each block in an `OfflineAudioContext` | low |
| A fixed gain for each demo to one loudness | D4 | 0 | none | low |
| Interpolation, sample rate | nothing to fix | | | |

- The cost of the plate and the chorus is in each block, also with no send. The median render
  time of the same 30 s of demo 1 was 0.072 ms with the built-in effects and 0.028 ms with the
  tap processor and `chorusGain` 0 (three runs each).
- Chrome renders a `ConvolverNode` in an `OfflineAudioContext` on one thread. In a real-time
  context it can put the long tail on a background thread, so the cost on the audio thread can
  be lower. This is not verified.
- One channel can feed several seats (design 3.7, for example a string ensemble program divided
  by pitch). A channel has one pan, so these seats share the mean place. To place each of these
  seats, `score/` would give each seat its own synth channel, with a copy of the controller
  events of the source channel. Demo 1 and Boulanger have one channel for each seat, so the
  A/B needs no such change.
- The stage layout puts the violins, the flutes, the oboes, the harp, the piano, and the timpani
  on the left. With the stage pans at 80 % width, the left channel was 1.2 to 1.7 dB louder in the A/B files.
  The pan can subtract the note-weighted mean pan to bring the balance near 0 dB.
- The files can send CC10, CC91, and CC93 (the Boulanger file does). The rule "One score" puts
  each MIDI rule in `score/`. Thus `score/` would drop these controllers from `synthEvents`, or
  the engine would lock them after it sets them.

## 7. A/B test

### 7.1 Variants

All variants render the first 30 s of the demo. The A/B files match the loudness of A, so that a
louder file does not sound better only because it is louder.

| File | Variant | Settings |
|---|---|---|
| `a-current-beethoven-30s.wav` | A: now | no change |
| `b1-synth-room-beethoven-30s.wav` | B1: settings only | stage pans at 80 % width, sends 40 to 80 from the row depth, built-in plate |
| `b2-hall-beethoven-30s.wav` | B2: hall | as B1, but the send goes through the St Paul's Hall IR (section 5) at a 25 % wet energy share, chorus off, limiter at -1 dBFS, loudness matched to A |
| `b3-hall-sectionstrings-beethoven-30s.wav` | B3: hall and section strings | as B2, with the MS Basic section strings (loud layer and attack) for 40 to 43 |
| `a-current-boulanger-30s.wav` | A: now | no change |
| `b2-hall-boulanger-30s.wav` | B2: hall | as B2 above, with CC10, CC91, and CC93 locked against the file |

### 7.2 Results

| Measure | A | B1 | B2 | B3 | Boulanger A | Boulanger B2 |
|---|---|---|---|---|---|---|
| Peak | -4.50 dBFS | -3.02 dBFS | -4.00 dBFS | -3.06 dBFS | -5.63 dBFS | -6.65 dBFS |
| Integrated loudness | -18.0 LUFS | -17.7 LUFS | -18.0 LUFS | -18.0 LUFS | -24.5 LUFS | -24.5 LUFS |
| Loudness range | 6.7 LU | 6.7 LU | 7.2 LU | 10.3 LU | 15.1 LU | 15.4 LU |
| Reverb energy share | 0.2 % | 7.1 % | 25 % (set) | 25 % (set) | 0.2 % (full piece) | 25 % (set) |
| Side to mid energy | -23.8 dB | -8.8 dB | -9.2 dB | -8.1 dB | -14.8 dB | -8.3 dB |
| L/R correlation | 0.992 | 0.781 | 0.794 | 0.746 | 0.938 | 0.748 |
| L/R balance | -0.06 dB | +1.74 dB | +1.27 dB | +1.70 dB | +0.60 dB | +1.16 dB |
| Spectral centroid | 854 Hz | 848 Hz | 805 Hz | 831 Hz | 893 Hz | 822 Hz |
| Octave band at 63 Hz | -23.8 dB | -24.8 dB | -24.7 dB | -30.7 dB | -22.0 dB | -22.0 dB |
| Octave band at 4 kHz | -15.8 dB | -15.8 dB | -16.6 dB | -19.7 dB | -14.0 dB | -14.9 dB |
| Render for each block, median (3 runs) | 0.072 ms | 0.071 ms | 0.028 ms | 0.068 ms | not measured | not measured |
| PCM of the banks | 5.9 MB | 5.9 MB | 5.9 MB | 85.4 MB | 9.0 MB | 9.0 MB |

- B1 and B2 make the image wide and put the sections where the user sees them. The side signal
  goes up by 14.6 to 15.0 dB in demo 1, and the correlation goes down from 0.992 to 0.78 or 0.79.
- B2 adds the hall, with a reverb time of about 2.1 s. The limiter did not act in any file,
  because the loudness match left at least 3 dB of headroom.
- B3 has a larger loudness range (10.3 LU against 7.2 LU), because the section samples keep their
  natural attacks and dynamics. B3 also has less energy at 63 Hz (-30.7 dB against -24.7 dB) and
  at 4 kHz (-19.7 dB against -16.6 dB) than B2. The basses of MS Basic are lighter than the
  double bass of GeneralUser GS, so a cut for the app needs a level check of the basses.
- The numbers show the room and the image. They cannot show whether the instruments sound real.
  The user must listen to B3 against B2 for that.
- A first mix used a stereo decode of the Usina del Arte B-format files. Its four channels start
  at different times (823 to 857 ms), so the decode was wrong. This report does not use it.

### 7.3 Paths of the files

The files are 32-bit float stereo WAV files at 48 kHz in the scratch folder of the research
session. They are not in the repository:

```text
/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound/
  a-current-beethoven-30s.wav
  b1-synth-room-beethoven-30s.wav
  b2-hall-beethoven-30s.wav
  b3-hall-sectionstrings-beethoven-30s.wav
  a-current-boulanger-30s.wav
  b2-hall-boulanger-30s.wav
```

## 8. Recommendation

The ranking puts (c) first: do (a) now, then the strings of (b). Option (a) fixes "dry or thin"
at a low cost. Only (b) can fix "fake", and its cost is in the load and the memory targets.

| Rank | Option | Fixes | Load of demo 1 (target 2 s at 50 Mbit/s) | PCM of demo 1 (target 100 MB) | Licenses |
|---|---|---|---|---|---|
| 1 | (c) = (a), then the section strings of (b) | D1, D2, D4, then D3 for the strings | 1.51 MB now. About 3.7 MB with the strings (estimate) | 5.9 MB now. About 25 to 30 MB (estimate) | MIT (MS Basic), CC0 (VSCO-2 CE), CC BY 4.0 (IR) |
| 2 | (a) room and mix in our code | D1, D2, D4 | plus 54 to 300 KB for the IR, after the first frame | plus about 2 MB for the IR | CC BY 4.0 (IR) |
| 3 | (b) better sound source alone | D3 | as rank 1 | as rank 1 | MIT, CC0 |

### 8.1 (a) Room and mix

1. Calculate a `ChannelMix` (6.1) for each synth channel from the `SceneLayout`: the pan from
   the mean stage x of its players, and the reverb send from the row depth. Send CC10 and CC91
   to the synth after the score loads, and lock them. Lock CC93 at 0.
2. Replace the built-in plate with a tap `ReverbProcessor`, and give the worklet a second output
   for the mono send.
3. Connect the send to a `ConvolverNode` with the St Paul's Hall IR, then a wet `GainNode` (25 %
   wet energy in the A/B), the master gain, and a `DynamicsCompressorNode` as a limiter.
4. Give each demo a fixed gain to one loudness, for example -18 LUFS. A dropped file keeps the
   gain 1, and the limiter catches its peaks.

Costs: the worklet render goes down (median 0.072 ms to 0.028 ms for each block). The
`ConvolverNode` takes about 131 µs of each 2.67 ms block on the browser audio thread. The IR adds
54 KB (Opus) to 300 KB (gzip WAV) after the first frame, and about 2 MB of memory. The first
download (design 7.2) does not change.

Design sections that change: 6.1 (no plate and no chorus, a convolution reverb), 6.3 (the IR
loads with the presets), 6.4 (two outputs, the tap processor, the locked controllers), 6.8 (the
output chain of the `WorkletPlayer`), 7.1 (the module of the `ChannelMix` function), 7.3 and
the credits of 2.8 (the CC BY 4.0 credit of the IR), and 9.7 (the render target values).

### 8.2 (b) Better sound source

1. Keep GeneralUser GS as the base bank. Each preset is its own file (design 6.2), so the split
   script can take single presets from a second bank.
2. Make presets 40 to 43 from the section instruments of MS Basic preset 48 (VSCO-2 CE samples,
   CC0, in an MIT bank). Keep one velocity layer and the attack zones, resample to 32 kHz, and
   cut the loops to about 1.5 s. Check the level of the basses by ear.
3. Do not take the MS Basic presets 0 (piano, 9.18 MB) and 45 (pizzicato, 5.35 MB) as they are.
   With them, Mozart K. 488 needs 15.6 MB, which is more than the 12.5 MB that 2 s at 50 Mbit/s
   permits before the decode.
4. Later, convert the CC0 samples of VSCO-2 CE and VCSL for the winds, the brass, the harp, and
   the timpani. These need new loop points and a size cut for each preset. This step has the
   highest effort. The winds and the brass of MS Basic are FluidR3 samples, so MS Basic alone does
   not fix them.

Costs: the measured cut with the loud layer and the attacks, at 44.1 kHz and with the long loops,
gives 9.0 MB for demo 1 (1.44 s at 50 Mbit/s, plus a decode of 822 ms in Node) and 85.4 MB of
PCM. The load target then fails, and the memory target has a margin of 15 %. The smaller cut of
step 2 is necessary. Its estimate (about 3.7 MB and 25 to 30 MB of PCM) is not verified.

Design sections that change: 6.2 (a second source bank and the preset choice), 7.3 (the MIT
notices of MS Basic and the CC0 note of VSCO-2 CE), `assets/soundfont/README.md`, 9.7 (the load
and memory results), and 10 (the choice of presets as a decision to confirm).

### 8.3 Settings that stay

The hermite interpolation, the sample rate of the device (48 kHz on the development Mac), and the
voice cap of 350 need no change.
