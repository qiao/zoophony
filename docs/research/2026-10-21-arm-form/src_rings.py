"""Cross-section aspect (narrow / wide axis) of the upper arm of a source mesh, from a faces dump.

    python3 scratch/src_rings.py <config.json> <faces.json>
"""
import json, sys
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
cfg = json.load(open(argv[0]))
faces = [f for f in json.load(open(argv[1])) if isinstance(f, dict)]
S = np.array([f['s'] for f in faces])  # n x 3 x 3
j = cfg['joints']
for side, sign in (('L', 1), ('R', -1)):
    sh = np.array(j['upper_arm_L']['head']) * [sign, 1, 1]
    el = np.array(j['forearm_L']['head']) * [sign, 1, 1]
    axis = (el - sh) / np.linalg.norm(el - sh)
    out = []
    for t in (0.15, 0.5, 0.85):
        c = sh + t * (el - sh)
        d = (S - c) @ axis  # n x 3
        pts = []
        for tri, dd in zip(S, d):
            for a in range(3):
                b = (a + 1) % 3
                if dd[a] * dd[b] < 0:
                    u = dd[a] / (dd[a] - dd[b])
                    pts.append(tri[a] + u * (tri[b] - tri[a]))
        pts = np.array(pts)
        r = pts - c
        r -= np.outer(r @ axis, axis)
        dist = np.linalg.norm(r, axis=1)
        # The arm loop: the points near the axis, within 2 times the 30% quantile distance.
        keep = dist <= 2.0 * np.quantile(dist, 0.3)
        q = r[keep]
        q = q - q.mean(axis=0)
        cov = q.T @ q / len(q)
        ev = np.sort(np.linalg.eigvalsh(cov))[::-1]
        out.append(f'{np.sqrt(max(ev[1], 0) / ev[0]):.2f} (n {keep.sum()}, wide {2*np.sqrt(ev[0]):.3f} u)')
    print(side, ' / '.join(out))
