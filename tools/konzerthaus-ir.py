# Writes the large hall impulse response, `assets/hall/detmold-konzerthaus-r2.wav`, from the
# source file of the Detmold database (design 6.8, assets/hall/README.md). The source is an open
# array of six omni microphones: front, back, right, left, top, and bottom. The script makes a
# first-order B-format signal from the array, and decodes it to stereo as the file of St Paul's
# Hall. Each step is in the section "Changes" of the README. The run gives the same bytes each
# time.
#
# Usage: uv run --no-project --with soundfile==0.14.0 --with numpy==2.5.4 python -I
#        tools/konzerthaus-ir.py <C1S1R2_RevC5.wav>
import sys

import numpy as np
import soundfile as sf

OUT = 'assets/hall/detmold-konzerthaus-r2.wav'

# The angle of the two virtual supercardioid microphones, and the share of the omni signal.
ANGLE = np.deg2rad(70)
OMNI_SHARE = 0.37

# The window of the diffuse tail for the gain of the figure-8 signals, in seconds after the direct sound.
TAIL = (0.15, 1.5)

# The cut of the direct sound and the fade-in after it, in seconds.
CUT = 0.004
FADE_IN = 0.001

# The kept length and the fade-out at its end, in seconds.
LENGTH = 3.2
FADE_OUT = 0.6

# The peak level in dBFS.
PEAK_DB = -1


def third_octave_edges(rate):
    """Gives the band edges in Hz: 1/3 octaves from 20 Hz to the Nyquist frequency."""
    edges = [20.0]
    while edges[-1] * 2 ** (1 / 3) < rate / 2:
        edges.append(edges[-1] * 2 ** (1 / 3))
    edges.append(rate / 2)
    return np.array(edges)


def figure_eight(difference, omni, rate, start):
    """Makes a figure-8 signal from the difference of two opposite omni capsules.

    For a small spacing, the difference is j k d times the figure-8 signal. The script turns the
    phase by -90 degrees, and sets the energy of each 1/3 octave in the diffuse tail to 1/3 of the
    energy of the omni signal, which is the share of an ideal figure-8 in a diffuse field. Thus
    the gain is about 1 / (k d) below the aliasing frequency of the array, with no need for the
    exact spacing.
    """
    n = len(difference)
    spectrum = np.fft.rfft(difference)
    freqs = np.fft.rfftfreq(n, 1 / rate)
    a, b = start + int(TAIL[0] * rate), start + int(TAIL[1] * rate)
    tail_d = np.fft.rfft(difference[a:b])
    tail_w = np.fft.rfft(omni[a:b])
    tail_f = np.fft.rfftfreq(b - a, 1 / rate)
    edges = third_octave_edges(rate)
    centers, gains = [], []
    for lo, hi in zip(edges[:-1], edges[1:]):
        band = (tail_f >= lo) & (tail_f < hi)
        if not band.any():
            continue
        e_d = np.sum(np.abs(tail_d[band]) ** 2)
        e_w = np.sum(np.abs(tail_w[band]) ** 2)
        centers.append(np.sqrt(lo * hi))
        gains.append(np.sqrt(e_w / (3 * e_d)))
    gain = np.interp(np.log(np.maximum(freqs, 1)), np.log(centers), gains)
    return np.fft.irfft(spectrum * gain * -1j, n), np.array(centers), np.array(gains)


def main():
    source, rate = sf.read(sys.argv[1], dtype='float64', always_2d=True)
    if rate != 48000 or source.shape[1] != 6:
        sys.exit(f'The source has {source.shape[1]} channels at {rate} Hz: 6 at 48000 Hz expected.')
    front, back, right, left = source[:, 0], source[:, 1], source[:, 2], source[:, 3]
    omni = source.mean(axis=1)

    level = np.abs(omni)
    start = int(np.argmax(level > 0.1 * level.max()))
    x, _, _ = figure_eight(front - back, omni, rate, start)
    y, centers, gains = figure_eight(left - right, omni, rate, start)

    side = np.sin(ANGLE) * y
    mid = OMNI_SHARE * omni + (1 - OMNI_SHARE) * np.cos(ANGLE) * x
    stereo = np.stack([mid + (1 - OMNI_SHARE) * side, mid - (1 - OMNI_SHARE) * side], axis=1)

    lr = np.max(np.abs(stereo), axis=1)
    direct = int(np.argmax(lr > 0.1 * lr.max()))
    stereo = stereo[direct:direct + int(LENGTH * rate)].copy()
    cut, fade_in = int(CUT * rate), int(FADE_IN * rate)
    removed = np.sum(stereo[:cut] ** 2) / np.sum(stereo ** 2)
    stereo[:cut] = 0
    stereo[cut:cut + fade_in] *= (0.5 - 0.5 * np.cos(np.pi * np.arange(fade_in) / fade_in))[:, None]
    fade_out = int(FADE_OUT * rate)
    stereo[-fade_out:] *= (0.5 + 0.5 * np.cos(np.pi * np.arange(fade_out) / fade_out))[:, None]
    stereo *= 10 ** (PEAK_DB / 20) / np.max(np.abs(stereo))

    samples = np.round(stereo * 32767).astype(np.int16)
    sf.write(OUT, samples, rate, subtype='PCM_16')
    l, r = samples[:, 0].astype(np.float64), samples[:, 1].astype(np.float64)
    correlation = np.sum(l * r) / np.sqrt(np.sum(l * l) * np.sum(r * r))
    print(f'{OUT}: {len(samples)} frames, direct sound at {direct / rate * 1000:.2f} ms')
    print(f'cut share of the energy {removed:.2f}, L/R correlation {correlation:.2f}')
    print('figure-8 gain:', ' '.join(f'{c:.0f}:{g:.2f}' for c, g in zip(centers, gains) if c < 4000))


main()
