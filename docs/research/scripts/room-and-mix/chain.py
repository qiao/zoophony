"""Applies the output chain of the Player offline, as Web Audio would:
out = piece * (dry * synth + wet * conv(synth, IR)), then reports the measures of analyze.py.
ConvolverNode with a stereo input and a stereo IR: L = conv(inL, irL), R = conv(inR, irR).
Usage: chain.py synth.wav ir.wav --wet W [--dry-ref dry.wav] [--piece-db G] [--out out.wav]
       [--share S: find W for a hall energy share S]"""
import argparse
import json
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve

sys.path.insert(0, '/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound')
from analyze import analyze, lufs  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('synth'); ap.add_argument('ir')
ap.add_argument('--wet', type=float, default=None)
ap.add_argument('--share', type=float, default=None)
ap.add_argument('--dry', type=float, default=1.0)
ap.add_argument('--dry-ref', default=None)
ap.add_argument('--piece-db', type=float, default=0.0)
ap.add_argument('--out', default=None)
a = ap.parse_args()

sr, x = wavfile.read(a.synth); x = x.astype(np.float64)
_, ir = wavfile.read(a.ir)
ir = ir.astype(np.float64) / 32768.0
wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
if a.share is not None:
    W = float(np.sqrt(a.share / (1 - a.share) * np.sum((a.dry * x) ** 2) / np.sum(wet ** 2)))
else:
    W = a.wet
g = 10 ** (a.piece_db / 20)
out = g * (a.dry * x + W * wet)
res = dict(wet_gain=round(W, 5), hall_share_pct=round(100 * np.sum((g * W * wet) ** 2) / np.sum(out ** 2), 1))
path = a.out or '/tmp/chain-out.wav'
wavfile.write(path, sr, out.astype(np.float32))
m = analyze(path, None)
if a.dry_ref:
    _, d = wavfile.read(a.dry_ref); d = d.astype(np.float64) * g * a.dry
    n = min(len(d), len(out))
    res['effect_share_pct'] = round(100 * np.sum((out[:n] - d[:n]) ** 2) / np.sum(out[:n] ** 2), 1)
    res['room_share_pct'] = round(100 * np.sum((g * a.dry * x[:n] - d[:n]) ** 2) / np.sum(out[:n] ** 2), 1)
for k in ('peak_dbfs', 'clipped_samples', 'lufs_i', 'lra_lu', 'side_to_mid_db', 'lr_correlation', 'lr_balance_db', 'spectral_centroid_hz'):
    res[k] = m[k]
print(json.dumps(res))
