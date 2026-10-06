import sys
import numpy as np
from scipy.io import wavfile
for spec in sys.argv[1:]:
    path, gdb = spec.split(':')
    sr, x = wavfile.read(path)
    x = np.max(np.abs(x.astype(np.float64)), 1) * 10 ** (float(gdb) / 20)
    out = [path.split('/')[-1], f'peak {20*np.log10(x.max()):.2f}']
    for t in (-1, -2, -3, -4, -6):
        above = x > 10 ** (t / 20)
        # count 10 ms windows with a sample above the threshold
        w = int(0.01 * sr)
        n = len(x) // w
        win = above[: n * w].reshape(n, w).any(1).sum()
        out.append(f'>{t}dB: {win} windows of 10 ms')
    print(' | '.join(out))
