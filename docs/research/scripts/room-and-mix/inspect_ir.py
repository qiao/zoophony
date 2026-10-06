import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

sr, x = wavfile.read('C8m-ambix.wav')
print(sr, x.dtype, x.shape)
x = x.astype(np.float64)
W, Y, Z, X = x.T
a = np.deg2rad(70)
L = 0.37 * W + 0.63 * (np.cos(a) * X + np.sin(a) * Y)
R = 0.37 * W + 0.63 * (np.cos(a) * X - np.sin(a) * Y)
s = np.stack([L, R], 1)
env = np.max(np.abs(s), 1)
pk = np.argmax(env)
on = np.argmax(env > 0.1 * env[pk])
print('peak at ms', pk / sr * 1000, 'onset ms', on / sr * 1000)
for ms in range(0, 30, 1):
    i = on + int(ms * sr / 1000)
    print(ms, 'ms', round(20 * np.log10(np.max(env[i:i + 48]) / env[pk] + 1e-12), 1))
e = np.sum(s[on:] ** 2, 1)
tot = e.sum()
for ms in (1, 2, 3, 5, 10, 20, 50, 80):
    print('energy share first', ms, 'ms', round(e[: int(ms * sr / 1000)].sum() / tot, 3))
# Schroeder decay of each band, time to -60 dB from onset.
for c in (None, 250, 500, 1000, 2000, 4000, 8000):
    y = s[on:, 0]
    if c:
        sos = butter(4, [c / np.sqrt(2), min(c * np.sqrt(2), sr / 2 - 1)], 'bandpass', fs=sr, output='sos')
        y = sosfilt(sos, y)
    sch = np.cumsum((y ** 2)[::-1])[::-1]
    sch = 10 * np.log10(sch / sch[0] + 1e-30)
    out = [f'{c or "broad"}']
    for db in (-30, -40, -50, -60, -70):
        idx = np.argmax(sch <= db)
        out.append(f'{db}dB {idx / sr:.2f}s' if idx else f'{db}dB none')
    print(' '.join(out))
print('length s', len(s) / sr)
