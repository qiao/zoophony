"""Measures a float stereo WAV: peak, clipping, RMS, integrated loudness (BS.1770-4),
stereo width, and the octave band balance. Optional second file: the dry render, to
calculate the effect share (the energy of wet minus dry)."""
import sys, json
import numpy as np
from scipy.io import wavfile
from scipy.signal import lfilter

def load(p):
    sr, x = wavfile.read(p)
    return sr, x.astype(np.float64)

def k_weight(x, sr):
    # BS.1770 pre-filter and RLB filter, coefficients for 48 kHz.
    assert sr == 48000
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)

def lufs(x, sr):
    y = k_weight(x, sr)
    block, hop = int(0.4 * sr), int(0.1 * sr)
    ms = []
    for s in range(0, len(y) - block + 1, hop):
        seg = y[s:s + block]
        ms.append(np.sum(np.mean(seg ** 2, axis=0)))
    ms = np.array(ms)
    lk = -0.691 + 10 * np.log10(ms + 1e-20)
    g = ms[lk > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g2 = ms[(lk > -70) & (lk > rel)]
    integ = -0.691 + 10 * np.log10(np.mean(g2))
    # Short-term loudness (3 s) for the loudness range.
    st = []
    b3 = 3 * sr
    for s in range(0, len(y) - b3 + 1, sr):
        st.append(-0.691 + 10 * np.log10(np.sum(np.mean(y[s:s + b3] ** 2, axis=0)) + 1e-20))
    st = np.array(st)
    st = st[st > -70]
    if len(st):
        st = st[st > integ - 20]
        lra = np.percentile(st, 95) - np.percentile(st, 10)
    else:
        lra = float('nan')
    return integ, lra, float(np.max(lk))

def db(v):
    return 20 * np.log10(v + 1e-20)

def analyze(p, dry=None):
    sr, x = load(p)
    L, R = x[:, 0], x[:, 1]
    peak = np.max(np.abs(x))
    clip = int(np.sum(np.abs(x) >= 1.0))
    over = int(np.sum(np.abs(x) >= 0.891))  # -1 dBFS
    rms = np.sqrt(np.mean(x ** 2))
    integ, lra, maxm = lufs(x, sr)
    M, S = (L + R) / 2, (L - R) / 2
    side_mid = 10 * np.log10(np.sum(S ** 2) / (np.sum(M ** 2) + 1e-20) + 1e-20)
    corr = float(np.sum(L * R) / np.sqrt(np.sum(L ** 2) * np.sum(R ** 2) + 1e-20))
    bal = 10 * np.log10(np.sum(L ** 2) / (np.sum(R ** 2) + 1e-20))
    # Octave bands from the power spectrum of the mid signal (Welch, 8192 points).
    from scipy.signal import welch
    f, P = welch(M, sr, nperseg=8192)
    bands = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    tot = np.sum(P)
    band = {}
    for c in bands:
        lo, hi = c / np.sqrt(2), c * np.sqrt(2)
        band[str(c)] = round(10 * np.log10(np.sum(P[(f >= lo) & (f < hi)]) / tot + 1e-20), 1)
    cent = float(np.sum(f * P) / tot)
    out = dict(file=p.split('/')[-1], sr=sr, seconds=round(len(x) / sr, 1), peak_dbfs=round(db(peak), 2),
               clipped_samples=clip, samples_above_minus1dbfs=over, rms_dbfs=round(db(rms), 1),
               crest_db=round(db(peak) - db(rms), 1), lufs_i=round(integ, 1), lra_lu=round(lra, 1),
               max_momentary_lufs=round(maxm, 1), side_to_mid_db=round(side_mid, 1),
               lr_correlation=round(corr, 3), lr_balance_db=round(bal, 2),
               spectral_centroid_hz=round(cent), octave_band_share_db=band)
    if dry:
        _, d = load(dry)
        n = min(len(d), len(x))
        wet = x[:n] - d[:n]
        out['effect_share_db'] = round(10 * np.log10(np.sum(wet ** 2) / np.sum(x[:n] ** 2)), 1)
        out['effect_share_pct'] = round(100 * np.sum(wet ** 2) / np.sum(x[:n] ** 2), 1)
    return out

if __name__ == '__main__':
    print(json.dumps(analyze(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None), indent=1))
