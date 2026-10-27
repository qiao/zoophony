"""Draws the side cuts (planes x = const) of the whole left leg of rig steps: the outline of the
seated leg from the haunch to the foot, in the studio axes (forward z to the right, up y up)."""
import os, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
sys.path.insert(0, os.path.dirname(__file__))
from knee_cut import loops  # noqa: E402
out = sys.argv[1]
items = [a.split('=', 1) for a in sys.argv[2:]]
fig, axes = plt.subplots(1, len(items), figsize=(5.2 * len(items), 5.6), squeeze=False)
for ax, (label, spec) in zip(axes[0], items):
    d, step = spec.split(':')
    data = np.load(os.path.join(d, f'{step}.npz'))
    heads = np.load(os.path.join(d, 'heads-2.npz'))
    for x, col in ((0.12, 'tab:blue'), (0.16, 'k'), (0.2, 'tab:red')):
        for L in loops(data['points'], data['tris'], np.array([x, 0, 0]), np.array([1.0, 0, 0])):
            if len(L) > 5:
                ax.plot(np.append(L[:, 2], L[0, 2]), np.append(L[:, 1], L[0, 1]), '-', color=col, lw=0.9)
    for k in ('thigh_L', 'shin_L', 'foot_L'):
        h = heads[k]
        ax.plot([h[2]], [h[1]], 'g+', ms=12)
    ax.set_aspect('equal'); ax.set_xlim(-0.35, 0.35); ax.set_ylim(0.0, 0.7); ax.grid(alpha=0.3)
    ax.set_title(f'{label} (x 0.12 blue, 0.16 black, 0.20 red)')
fig.tight_layout(); fig.savefig(out, dpi=90); print('wrote', out)
