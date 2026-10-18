"""Plots the left shoulder of dump-shoulder.ts in the bind pose and in the play sample, with the
folded faces in red: python -I shoulder_plot.py <shoulder.json> <out.png> (uv run with matplotlib)."""
import json, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
data = json.load(open(sys.argv[1]))
out = sys.argv[2]
s = [d for d in data if d['set'] == 'play'][0]
idx = {v['v']: i for i, v in enumerate(s['verts'])}
bind = np.array([v['bind'] for v in s['verts']])
posed = np.array([v['posed'] for v in s['verts']])
ua = np.array([v['w'].get('upper_arm_L', 0) for v in s['verts']])
cl = np.array([v['w'].get('clavicle_L', 0) for v in s['verts']])
faces = s['faces']
folded = set(s['folded'])
fig, axes = plt.subplots(2, 3, figsize=(21, 14))
views = [(0, 1, 'front x-y'), (0, 2, 'top x-z'), (2, 1, 'side z-y')]
for row, (pts, name) in enumerate([(bind, 'bind'), (posed, 'posed play')]):
    for col, (a, b, vn) in enumerate(views):
        ax = axes[row, col]
        polys, colors = [], []
        for f, *cs in faces:
            polys.append([[pts[idx[c], a], pts[idx[c], b]] for c in cs])
            colors.append('red' if f in folded else 'none')
        ax.add_collection(PolyCollection(polys, facecolors=colors, edgecolors='gray', linewidths=0.4, alpha=0.6))
        sc = ax.scatter(pts[:, a], pts[:, b], c=ua, cmap='viridis', s=12, vmin=0, vmax=1)
        for f, *cs in faces:
            if f in folded:
                m = pts[[idx[c] for c in cs]].mean(axis=0)
                ax.text(m[a], m[b], str(f), color='red', fontsize=9)
                for c in cs:
                    ax.text(pts[idx[c], a], pts[idx[c], b], str(c), fontsize=7)
        ax.set_aspect('equal'); ax.set_title(f'{name} {vn} (color: upper_arm_L weight)')
        ax.autoscale()
plt.colorbar(sc, ax=axes)
plt.savefig(out, dpi=70)
