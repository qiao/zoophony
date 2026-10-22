# Writes the hall impulse response as FLAC, `assets/hall/st-pauls-hall-c8m.flac`, from the WAV
# file beside it (design 6.8, assets/hall/README.md). FLAC is lossless: the script reads the FLAC
# file back and stops with an error if one sample differs from the WAV file.
#
# Usage: uv run --no-project --with soundfile==0.14.0 --with numpy==2.5.4 python -I tools/hall-flac.py
import sys

import numpy as np
import soundfile as sf

WAV = 'assets/hall/st-pauls-hall-c8m.wav'
FLAC = 'assets/hall/st-pauls-hall-c8m.flac'

samples, rate = sf.read(WAV, dtype='int16', always_2d=True)
sf.write(FLAC, samples, rate, format='FLAC', subtype='PCM_16', compression_level=1.0)
back, back_rate = sf.read(FLAC, dtype='int16', always_2d=True)
if back_rate != rate or back.shape != samples.shape:
    sys.exit(f'The FLAC file has {back.shape} at {back_rate} Hz, and the WAV file {samples.shape} at {rate} Hz.')
largest = int(np.max(np.abs(back.astype(np.int32) - samples.astype(np.int32))))
if largest != 0:
    sys.exit(f'The FLAC file differs from the WAV file by up to {largest} steps.')
print(f'{FLAC}: {samples.shape[0]} frames, {samples.shape[1]} channels, {rate} Hz, largest difference 0')
