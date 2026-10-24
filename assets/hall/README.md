# Hall impulse response

`st-pauls-hall-c8m.wav` is the impulse response of the hall reverb of the `Player` (design 6.8).
`st-pauls-hall-c8m.flac` holds the same samples in a lossless file of about a quarter of the size.
The `Player` fetches the FLAC file, and the WAV file only when `decodeAudioData()` refuses it.
It comes from the measurement at position C8m in St Paul's Hall, the concert hall of the
University of Huddersfield. The Applied Psychoacoustics Lab measured it for the 360° BRIR and FOA
database.

| Item | Value |
|---|---|
| File | `st-pauls-hall-c8m.wav`, 480,044 bytes, 249 KB after gzip |
| SHA-256 | `aada37ea596e18073a2c0be8db4c2e2e5aef7c4076e4b35b277f813b748e43ac` |
| FLAC file | `st-pauls-hall-c8m.flac`, 127,980 bytes, the 16-bit samples of the WAV file |
| FLAC SHA-256 | `4694f4f067375d369ee90a08c4d3ff05ea522b5bd9b21813cff1f6a91622a1c9` |
| Format | WAV, 16-bit PCM, 2 channels, 48 kHz, 2.5 s (120,000 frames) |
| Source | Bacila, B. I., and Lee, H. (2019). 360° Binaural Room Impulse Response (BRIR) Database for 6DOF Spatial Perception Research. AES Convention 146, e-Brief 513 |
| Source record | <https://doi.org/10.5281/zenodo.2641166> (version 1, 2019-03-03) |
| Source archive | `360-BRIR-FOAIR-database.zip`, 6.6 GB, MD5 `3062197450b799b8d660c1bb1d2d6134` (from the Zenodo record) |
| Source file | `360-BRIR-FOAIR-database/FOA/B Format (AmbiX)/C8m.wav`, 3,840,736 bytes, first-order Ambisonics (AmbiX: W, Y, Z, X), 32-bit float, 48 kHz, 5 s |
| Source file SHA-256 | `824d2ddf643bd544c263185c159968151c028e7c7305edade60f226835c133a9` |
| License | CC BY 4.0, <https://creativecommons.org/licenses/by/4.0/>. The `License.txt` of the database holds the full text |
| License source | <https://github.com/APL-Huddersfield/360-BRIR-FOAIR-database/blob/3f0a8d77c211277d659bdaca4c473f9a91c5fd91/License.txt> |

The Zenodo record and the README of the database give the license "Creative Commons Attribution
4.0 International". The name of the hall is on the page of the lab:
<https://apl-hud.com/perception-of-room-acoustics-in-virtual-augmented-reality-in-the-context-of-6-degrees-of-freedom/>.

## Credit

CC BY 4.0 asks for a credit, a link to the license, and a note of the changes (section 3(a)). The
credits panel and the third-party license file show this line (design 2.8, 7.3):

> Hall reverb: impulse response of St Paul's Hall, University of Huddersfield, from the 360° BRIR
> and FOA database by Bogdan Ioan Bacila and Hyunkook Lee (Applied Psychoacoustics Lab,
> University of Huddersfield), CC BY 4.0. Changed: decoded to stereo, direct sound removed,
> shortened.

`HALL_CREDIT` in `src/audio/hall-credit.ts` holds the same text and the links.

## Changes

These steps make the file from the source file. The research report
[`docs/research/sound-quality.md`](../../docs/research/sound-quality.md) (section 5) used steps 1
and 2 for its A/B test.

1. Decode to stereo with two virtual supercardioid microphones at ±70°:
   `L = 0.37·W + 0.63·(cos 70°·X + sin 70°·Y)`, and `R` is the same with `-sin 70°·Y`.
2. Remove the 49.67 ms of silence before the direct sound. The direct sound starts at the first
   sample whose level in L or R is above 10 % of the peak.
3. Set the first 4 ms to 0, and fade in over the next 1 ms (raised cosine). These 4 ms hold the
   direct sound and a reflection 2 ms after it, which is 70 % of the energy. The `Player` sends
   the full mix to the reverb, and the dry path already holds the direct sound.
4. Keep the first 2.5 s, and fade out over the last 0.5 s (raised cosine). After about 2 s, the
   decay reaches the noise floor of the measurement, about 45 dB below the start.
5. Scale the peak to -1 dBFS, and write 16-bit PCM.
6. Write the FLAC file from the WAV file with libsndfile 1.2.2 (through soundfile 0.14.0), at the
   compression level 1.0. The script reads the file back and stops if one sample differs:

   ```bash
   uv run --no-project --with soundfile==0.14.0 --with numpy==2.5.4 python -I tools/hall-flac.py
   ```

The L/R correlation of the result is 0.14. The report measured a T30 of 2.06 s broadband,
2.47 s at 500 Hz, 2.27 s at 1 kHz, and 1.89 s at 2 kHz for the source position.

The FLAC file is a change of the format only. Section 2(a)(4) of CC BY 4.0 permits
the Licensed Material "in all media and formats" with the "technical modifications necessary to
do so", and such a change "never produces Adapted Material". Thus the credit line stays.

To check the files:

```bash
shasum -a 256 assets/hall/st-pauls-hall-c8m.wav assets/hall/st-pauls-hall-c8m.flac
```
