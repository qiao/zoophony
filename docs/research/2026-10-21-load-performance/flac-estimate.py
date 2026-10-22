# Estimates the size of the hall impulse response as FLAC: fixed predictors of order 0 to 4,
# 16 Rice partitions, and blocks of 4096 samples, with no stereo decorrelation.
# Usage: uv run --no-project --with numpy python -I docs/research/2026-10-21-load-performance/flac-estimate.py dist/assets/st-pauls-hall-c8m-*.wav
import sys, numpy as np, wave
w = wave.open(sys.argv[1]); n = w.getnframes(); ch = w.getnchannels()
x = np.frombuffer(w.readframes(n), dtype='<i2').reshape(-1, ch).astype(np.int64)
total_bits = 0
B = 4096
for c in range(ch):
    s = x[:, c]
    for i in range(0, n, B):
        blk = s[i:i+B]
        best = None
        for order in range(0, 5):
            if len(blk) <= order: continue
            r = blk.copy()
            for _ in range(order): r = np.diff(r)
            u = np.where(r >= 0, 2*r, -2*r-1)
            # rice partitions: 16 partitions
            P = 16; bits = 0; parts = np.array_split(u, P)
            for p in parts:
                if len(p) == 0: continue
                bestk = min(range(0, 20), key=lambda k: (p >> k).sum() + len(p)*(k+1))
                bits += (p >> bestk).sum() + len(p)*(bestk+1) + 5
            bits += order*16 + 8
            if best is None or bits < best: best = bits
        total_bits += best + 64
print('estimated FLAC bytes', total_bits // 8, 'wav bytes', n*ch*2)
