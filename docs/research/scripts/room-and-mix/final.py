"""Applies the full output chain of the Player offline, with a model of the Web Audio
DynamicsCompressorNode (hard knee, ratio, attack, release, 6 ms look-ahead, makeup gain), and
writes the result. Usage: final.py synth.wav ir.wav out.wav --piece-db G [--dry-ref dry.wav]"""
import argparse
import json
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve

sys.path.insert(0, '/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound')
from analyze import analyze  # noqa: E402

WET = 0.0625
T, RATIO, ATT, REL = -2.0, 20.0, 0.002, 0.15

ap = argparse.ArgumentParser()
ap.add_argument('synth'); ap.add_argument('ir'); ap.add_argument('out')
ap.add_argument('--piece-db', type=float, default=0.0)
ap.add_argument('--dry-ref', default=None)
ap.add_argument('--trim', type=float, default=0.0)
a = ap.parse_args()

sr, x = wavfile.read(a.synth); x = x.astype(np.float64)
_, ir = wavfile.read(a.ir); ir = ir.astype(np.float64) / 32768.0
wet = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
g = 10 ** (a.piece_db / 20)
pre = g * (x + WET * wet)

# Compressor model: detector on the max of both channels, in dB.
# The detector sees the peak of the next 6 ms (the look-ahead of the node).
from scipy.ndimage import maximum_filter1d
la = int(0.006 * sr)
peak = maximum_filter1d(np.max(np.abs(pre), 1), size=la, origin=-(la // 2))
level = 20 * np.log10(np.maximum(peak, 1e-9))
over = np.maximum(level - T, 0)
target = -over * (1 - 1 / RATIO)  # gain reduction in dB, <= 0
ca, cr = np.exp(-1 / (ATT * sr)), np.exp(-1 / (REL * sr))
gr = np.empty_like(target)
cur = 0.0
for i, t in enumerate(target):
    cur = ca * cur + (1 - ca) * t if t < cur else cr * cur + (1 - cr) * t
    gr[i] = cur
makeup_db = (-T + T / RATIO) * 0.6  # (1 / full range gain) ^ 0.6
TRIM = float(sys.argv[sys.argv.index('--trim') + 1]) if '--trim' in sys.argv else 0.0
delayed = np.vstack([np.zeros((la, 2)), pre[:-la]])
out = delayed * (10 ** ((gr + makeup_db + TRIM) / 20))[:, None]
wavfile.write(a.out, sr, out.astype(np.float32))
m = analyze(a.out, None)
res = dict(piece_db=a.piece_db, pre_limiter_peak_dbfs=round(20 * np.log10(np.max(np.abs(pre))), 2),
           limiter_max_reduction_db=round(float(-gr.min()), 2),
           limiter_active_ms=round(1000 * float(np.sum(gr < -0.1)) / sr), makeup_db=round(makeup_db, 2))
if a.dry_ref:
    _, d = wavfile.read(a.dry_ref); d = d.astype(np.float64) * g
    n = min(len(d), len(pre))
    res['reverb_share_pct'] = round(100 * np.sum((pre[:n] - d[:n]) ** 2) / np.sum(pre[:n] ** 2), 1)
    res['hall_share_pct'] = round(100 * np.sum((g * WET * wet[:n]) ** 2) / np.sum(pre[:n] ** 2), 1)
for k in ('peak_dbfs', 'clipped_samples', 'lufs_i', 'lra_lu', 'side_to_mid_db', 'lr_correlation', 'lr_balance_db', 'spectral_centroid_hz', 'octave_band_share_db'):
    res[k] = m[k]
print(json.dumps(res))
