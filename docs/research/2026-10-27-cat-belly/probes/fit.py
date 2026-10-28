"""Fits the arc of an ellipse through the two ends of the belly front and of the left side of
a trunk profile of `belly.ts --profile`, and prints the move of each cut.

    uv run --no-project --with numpy python -I fit.py <profile> <front from> <front to>
        <side from> <side to>

The shares are of the line from the hips joint to the neck joint. "no arc" means that no
ellipse fits through the ends: the outline is concave there.
"""
import re, sys
import numpy as np
rows = []
for line in open(sys.argv[1]):
    m = re.search(r't (-?[\d.]+) cm \(f (-?[\d.]+)\): L ([\d.]+) R ([\d.]+) F ([\d.]+) B ([\d.]+)', line)
    if m: rows.append([float(v) for v in m.groups()])
a = np.array(rows)
t, f, L, R, F = a[:, 0], a[:, 1], a[:, 2], a[:, 3], a[:, 4]

def pinned_arc(ts, ws, ta, tb):
    """Fits w = w0 + sqrt(A + B t + C t^2) through (ta, w(ta)) and (tb, w(tb)), C < 0."""
    wa, wb = np.interp(ta, ts, ws), np.interp(tb, ts, ws)
    sel = (ts >= ta) & (ts <= tb)
    best = None
    mean = np.mean(ws[sel])
    for w0 in np.linspace(-3 * mean, 0.95 * min(wa, wb), 400):
        # constraints: A + B ta + C ta^2 = (wa-w0)^2, same at tb. Unknowns A, B, C.
        K = np.array([[1, ta, ta ** 2], [1, tb, tb ** 2]])
        k = np.array([(wa - w0) ** 2, (wb - w0) ** 2])
        p = np.linalg.lstsq(K, k, rcond=None)[0]
        n = np.linalg.svd(K)[2][-1]
        M = np.stack([np.ones_like(ts[sel]), ts[sel], ts[sel] ** 2], 1)
        y = (ws[sel] - w0) ** 2 - M @ p
        lam = (M @ n) @ y / max(1e-12, (M @ n) @ (M @ n))
        coef = p + lam * n
        if coef[2] >= 0:
            continue
        val = w0 + np.sqrt(np.maximum(0, M @ coef))
        err = np.sum((val - ws[sel]) ** 2)
        if best is None or err < best[0]:
            best = (err, w0, coef)
    return best

for name, ws, lo, hi in (('F', F, float(sys.argv[2]), float(sys.argv[3])), ('L', L, float(sys.argv[4]), float(sys.argv[5]))):
    ta, tb = np.interp(lo, f, t), np.interp(hi, f, t)
    best = pinned_arc(t, ws, ta, tb)
    if best is None:
        print(name, 'no arc'); continue
    err, w0, coef = best
    M = np.stack([np.ones_like(t), t, t ** 2], 1)
    val = w0 + np.sqrt(np.maximum(0, M @ coef))
    sel = (t >= ta) & (t <= tb)
    print(name, 'w0', round(w0, 2), 'rms', round(np.sqrt(err / sel.sum()), 3), 'peak f', round(float(f[sel][np.argmax(val[sel])]), 3))
    for i in np.nonzero(sel)[0][::2]:
        print(f'  f {f[i]:.3f} {name} {ws[i]:.2f} fit {val[i]:.2f} move {val[i]-ws[i]:+.2f}')
