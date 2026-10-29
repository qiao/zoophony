# Writes each hall impulse response as FLAC, `assets/hall/<name>.flac`, from the WAV file beside
# it (design 6.8, assets/hall/README.md). FLAC is lossless: the script reads each FLAC file back
# and stops with an error if one sample differs from the WAV file.
#
# Usage: uv run --no-project --with soundfile==0.14.0 --with numpy==2.5.4 python -I tools/hall-flac.py
import sys

import numpy as np
import soundfile as sf

NAMES = ('st-pauls-hall-c8m', 'detmold-konzerthaus-r2')

for name in NAMES:
    wav = f'assets/hall/{name}.wav'
    flac = f'assets/hall/{name}.flac'
    samples, rate = sf.read(wav, dtype='int16', always_2d=True)
    sf.write(flac, samples, rate, format='FLAC', subtype='PCM_16', compression_level=1.0)
    back, back_rate = sf.read(flac, dtype='int16', always_2d=True)
    if back_rate != rate or back.shape != samples.shape:
        sys.exit(f'{flac} has {back.shape} at {back_rate} Hz, and the WAV file {samples.shape} at {rate} Hz.')
    largest = int(np.max(np.abs(back.astype(np.int32) - samples.astype(np.int32))))
    if largest != 0:
        sys.exit(f'{flac} differs from the WAV file by up to {largest} steps.')
    print(f'{flac}: {samples.shape[0]} frames, {samples.shape[1]} channels, {rate} Hz, largest difference 0')
