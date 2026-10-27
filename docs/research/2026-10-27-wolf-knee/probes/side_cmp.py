"""Draws the side cuts (planes x = const near the knee) of the left leg: the stretched source, and
the final bind of each given step dir, in the studio axes: forward z to the right, up y up, from the
knee joint (green cross). The cuts lie at the knee x - 0.03 (blue), at it (black), and + 0.03 (red).

    side_cmp.py <out.png> <label>=<dir>:<step>...
"""
import os, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(__file__))
from knee_cut import loops  # noqa: E402
out = sys.argv[1]
items = [a.split('=', 1) for a in sys.argv[2:]]
fig, axes = plt.subplots(1, len(items) + 1, figsize=(4.6 * (len(items) + 1), 4.8))
cols = ['tab:blue', 'k', 'tab:red']
first = items[0][1].split(':')[0]
raw = np.load(os.path.join(first, '00-raw.npz'))
for off, col in zip((-0.03, 0.0, 0.03), cols):
    c = np.array([0.115 + off, 0.211, -0.015])
    for L in loops(raw['points'], raw['tris'], c, np.array([1.0, 0, 0])):
        if np.linalg.norm(L.mean(axis=0)[1:] - c[1:]) < 0.25:
            axes[0].plot(np.append(L[:, 2], L[0, 2]) - c[2], np.append(L[:, 1], L[0, 1]) - c[1], '-', color=col, lw=1)
axes[0].set_title('source (legs x 1.6), standing')
for ax, (label, spec) in zip(axes[1:], items):
    d, step = spec.split(':')
    data = np.load(os.path.join(d, f'{step}.npz'))
    K = np.load(os.path.join(d, 'heads-2.npz'))['shin_L']
    for off, col in zip((-0.03, 0.0, 0.03), cols):
        c = K + np.array([off, 0, 0])
        for L in loops(data['points'], data['tris'], c, np.array([1.0, 0, 0])):
            if np.linalg.norm(L.mean(axis=0)[1:] - c[1:]) < 0.3:
                ax.plot(np.append(L[:, 2], L[0, 2]) - c[2], np.append(L[:, 1], L[0, 1]) - c[1], '-', color=col, lw=1)
    ax.set_title(f'{label}: seated bind')
for ax in axes:
    ax.plot([0], [0], 'g+', ms=14)
    ax.set_aspect('equal'); ax.set_xlim(-0.2, 0.13); ax.set_ylim(-0.22, 0.13); ax.grid(alpha=0.3)
    ax.set_xlabel('forward (units)'); ax.set_ylabel('up (units)')
fig.tight_layout()
fig.savefig(out, dpi=90)
print('wrote', out)
