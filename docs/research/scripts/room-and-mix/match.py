"""Scales a WAV to the integrated loudness of a reference WAV. Usage: match.py in ref out"""
import sys
import numpy as np
from scipy.io import wavfile
sys.path.insert(0, '/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/efc958e3-10bb-44bb-9904-333a6adbb4d7/scratchpad/sound')
from analyze import lufs  # noqa: E402

sr, x = wavfile.read(sys.argv[1]); x = x.astype(np.float64)
_, r = wavfile.read(sys.argv[2]); r = r.astype(np.float64)
gx, _, _ = lufs(x, sr)
gr, _, _ = lufs(r, sr)
y = x * 10 ** ((gr - gx) / 20)
wavfile.write(sys.argv[3], sr, y.astype(np.float32))
print(sys.argv[3], f'{gx:.1f} -> {gr:.1f} LUFS, peak {20 * np.log10(np.max(np.abs(y))):.2f} dBFS')
