"""Renders the posed panda mesh (module coordinates) with flat face colors, face by face, with ids.
python render.py <pose: bind|rest|play<k>> <view azimuth deg> <out.png> [ids: all|dark|none] [shade]"""
import json, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection

p = json.load(open('scratch/marks/posed.json'))
corners = np.array(p['corners']).reshape(-1, 3)
lin = np.array(p['colors']).reshape(-1, 3)
pose = sys.argv[1]
if pose == 'bind':
    P = np.array(p['bind']).reshape(-1, 3)
elif pose == 'rest':
    P = np.array(p['rest'][0]).reshape(-1, 3)
else:
    P = np.array(p['play'][int(pose[4:])]).reshape(-1, 3)
az = np.radians(float(sys.argv[2]))
out = sys.argv[3]
ids = sys.argv[4] if len(sys.argv) > 4 else 'dark'
shade = len(sys.argv) > 5 and sys.argv[5] == 'shade'
# The animal faces -z. Azimuth 0 = camera in front (at -z), 90 = camera at the right side (+x).
cam = np.array([np.sin(az), 0.0, -np.cos(az)])
right = np.cross(-cam, np.array([0.0, 1.0, 0.0]))
up = np.array([0.0, 1.0, 0.0])
tri = P[corners]
center = tri.mean(axis=1)
n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
facing = n @ cam
depth = center @ cam
order = np.argsort(-depth)  # far first: the camera is at +cam, so larger depth is nearer
order = np.argsort(depth)
xy = np.stack([tri @ right, tri @ up], axis=2)
srgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.clip(lin, 0, 1) ** (1 / 2.4) - 0.055)
if shade:
    light = 0.7 * cam + np.array([0.0, 0.5, -0.5]); light /= np.linalg.norm(light)
    k = np.clip(n @ light, 0, 1) * 0.75 + 0.25
    colors = np.clip(srgb * k[:, None], 0, 1)
else:
    colors = srgb
vis = facing > 0
fig = plt.figure(figsize=(12, 12), dpi=110)
ax = fig.add_axes([0, 0, 1, 1])
sel = order[vis[order]]
ax.add_collection(PolyCollection(xy[sel], facecolors=colors[sel], edgecolors=(0.5, 0.5, 0.9, 0.35), linewidths=0.3))
L = 0.2126 * lin[:, 0] + 0.7152 * lin[:, 1] + 0.0722 * lin[:, 2]
ymin = float(sys.argv[6]) if len(sys.argv) > 6 else 0.45
ymax = float(sys.argv[7]) if len(sys.argv) > 7 else 1.15
if ids != 'none':
    for f in sel:
        c = center[f]
        if not (ymin < c[1] < ymax):
            continue
        if ids == 'dark' and L[f] > 0.2:
            continue
        ax.text(c @ right, c @ up, str(f), fontsize=4.5, ha='center', va='center',
                color='yellow' if L[f] < 0.2 else 'red')
x0 = float(sys.argv[8]) if len(sys.argv) > 8 else -0.45
x1 = float(sys.argv[9]) if len(sys.argv) > 9 else 0.45
ax.set_xlim(x0, x1)
ax.set_ylim(ymin, ymax)
ax.set_aspect('equal')
ax.set_facecolor((0.3, 0.3, 0.3))
fig.savefig(out)
