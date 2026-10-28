import json, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
out = sys.argv[1]
files = sys.argv[2:]
fig, axes = plt.subplots(1, len(files), figsize=(5 * len(files), 5))
for ax, fpath in zip(axes, files):
    d = json.load(open(fpath))
    for (a, b) in d['segs']:
        ax.plot([a[0], b[0]], [a[1], b[1]], 'k-', lw=1)
    ax.plot([0], [0], 'r+', ms=12)
    ax.plot([d['tip'][0]], [d['tip'][1]], 'b+', ms=12)
    ax.set_aspect('equal'); ax.set_title(fpath.split('/')[-1]); ax.grid(True, alpha=0.3)
    ax.set_xlim(-0.2, 0.1); ax.set_ylim(-0.1, 0.1)
fig.savefig(out, dpi=90, bbox_inches='tight')
