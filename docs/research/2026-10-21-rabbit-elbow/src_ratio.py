"""Gives the section ratios (narrow / wide axis) of the source faces of the arm at places along the
source bones. The arm faces come from `elbow-look.ts --bind <obj>` (`<obj>.arms.json`).

    uv run --no-project --with numpy python -I src_ratio.py <config> <corners> <arms.json> <side>
"""
import json, sys
import numpy as np
cfg = json.load(open(sys.argv[1])); c = json.load(open(sys.argv[2]))
arms = json.load(open(sys.argv[3])); side = sys.argv[4]
mod = [x for x in c if x != 'eye']
T = np.array([mod[f]['s'] for f in arms[side] if isinstance(mod[f], dict)])
sign = 1 if side == 'L' else -1
j = cfg['joints']
def head(name):
    return np.array(j[f'{name}_L']['head']) * [sign, 1, 1]
s, e, w = head('upper_arm'), head('forearm'), head('hand')
def ratio(T, point, n):
    d = (T - point) @ n
    pts = []; wts = []
    for tri, dd in zip(T, d):
        seg = []
        for a in range(3):
            b = (a + 1) % 3
            if dd[a] * dd[b] < 0:
                t = dd[a] / (dd[a] - dd[b]); seg.append(tri[a] + t * (tri[b] - tri[a]))
        if len(seg) == 2:
            pts.append((seg[0] + seg[1]) / 2); wts.append(np.linalg.norm(seg[1] - seg[0]))
    P = np.array(pts) - point; W = np.array(wts)
    P -= np.outer(P @ n, n)
    m = (W[:, None] * P).sum(0) / W.sum(); Q = P - m
    cov = (W[:, None, None] * np.einsum('ij,ik->ijk', Q, Q)).sum(0) / W.sum()
    ev = np.sort(np.linalg.eigvalsh(cov))[::-1]
    return np.sqrt(max(ev[1], 0) / ev[0])
ua = (e - s) / np.linalg.norm(e - s); fa = (w - e) / np.linalg.norm(w - e)
bis = (ua + fa) / np.linalg.norm(ua + fa); L = np.linalg.norm(e - s)
out = [f'upper {t}: {ratio(T, s + t * (e - s), ua):.2f}' for t in (0.5, 0.7, 0.85, 0.95)]
out += [f'bisector: {ratio(T, e, bis):.2f}', f'fore 0.15: {ratio(T, e + 0.15 * np.linalg.norm(w - e) * fa, fa):.2f}']
print(side, ', '.join(out))
