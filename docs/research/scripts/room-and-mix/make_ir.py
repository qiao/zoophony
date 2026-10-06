"""Makes the hall IR asset from the AmbiX file C8m.wav of the Huddersfield database.
Usage: make_ir.py in.wav out.wav"""
import hashlib
import sys
import numpy as np
from scipy.io import wavfile

SR = 48000
DIRECT_MS = 4.0  # the direct sound and the first stage reflection: zeroed
FADE_IN_MS = 1.0
LENGTH_S = 2.5
FADE_OUT_S = 0.5
PEAK_DBFS = -1.0

sr, x = wavfile.read(sys.argv[1])
assert sr == SR, sr
x = x.astype(np.float64)
W, Y, Z, X = x.T  # AmbiX order: W, Y, Z, X
a = np.deg2rad(70)
L = 0.37 * W + 0.63 * (np.cos(a) * X + np.sin(a) * Y)
R = 0.37 * W + 0.63 * (np.cos(a) * X - np.sin(a) * Y)
s = np.stack([L, R], 1)
env = np.max(np.abs(s), 1)
onset = int(np.argmax(env > 0.1 * np.max(env)))
s = s[onset:onset + int(LENGTH_S * SR)].copy()
n = len(s)
gain = np.ones(n)
d = int(DIRECT_MS * SR / 1000)
f = int(FADE_IN_MS * SR / 1000)
gain[:d] = 0
gain[d:d + f] = 0.5 - 0.5 * np.cos(np.pi * np.arange(f) / f)
fo = int(FADE_OUT_S * SR)
gain[n - fo:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(fo) / fo)
s *= gain[:, None]
s *= 10 ** (PEAK_DBFS / 20) / np.max(np.abs(s))
pcm = np.round(s * 32767).astype(np.int16)
wavfile.write(sys.argv[2], SR, pcm)
data = open(sys.argv[2], 'rb').read()
corr = np.sum(s[:, 0] * s[:, 1]) / np.sqrt(np.sum(s[:, 0] ** 2) * np.sum(s[:, 1] ** 2))
print(dict(onset_ms=round(onset / SR * 1000, 2), frames=n, bytes=len(data),
           sha256=hashlib.sha256(data).hexdigest(), lr_correlation=round(float(corr), 3)))
