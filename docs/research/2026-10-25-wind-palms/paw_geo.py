"""Measures the source left paw of each species in its paw frame: the axis a from the wrist to the
tip, the palm hint h (square to a), and the side s = a x h. It prints the slices along a (the
middle and the extent on h and s), and the separate digits beyond each cut, so that the thumb and
the side of the finger pads are numbers.

Usage: paw_geo.py <dir with <species>-paw.json> <species>...
"""

import json
import sys

import numpy as np

d, names = sys.argv[1], sys.argv[2:]
for sp in names:
    j = json.load(open(f'{d}/{sp}-paw.json'))
    wrist, tip, h = (np.array(j[k]) for k in ('wrist', 'tip', 'hint'))
    a = (tip - wrist) / np.linalg.norm(tip - wrist)
    length = np.linalg.norm(tip - wrist)
    s = np.cross(a, h)
    ids = [int(k) for k in j['vertices']]
    pts = np.array([j['vertices'][str(i)] for i in ids])
    rel = pts - wrist
    T, H, S = rel @ a / length, rel @ h / length, rel @ s / length
    print(f'== {sp}: {len(ids)} vertices, paw length {length:.4f} u (coordinates in paw lengths)')
    print('slice t | n | mid h | mid s | h min..max | s min..max')
    for lo in np.arange(-0.2, 1.6, 0.2):
        m = (T >= lo) & (T < lo + 0.2)
        if m.sum() == 0:
            continue
        print(
            f'{lo:+.1f} | {m.sum():3d} | {H[m].mean():+.2f} | {S[m].mean():+.2f} | '
            f'{H[m].min():+.2f}..{H[m].max():+.2f} | {S[m].min():+.2f}..{S[m].max():+.2f}'
        )
    index = {v: k for k, v in enumerate(ids)}
    adj = {k: set() for k in range(len(ids))}
    for f in j['faces']:
        ks = [index[v] for v in f]
        for x in ks:
            for y in ks:
                if x != y:
                    adj[x].add(y)
    for cut in (0.3, 0.45, 0.6, 0.75):
        keep = set(np.nonzero(T > cut)[0].tolist())
        comps, seen = [], set()
        for k in keep:
            if k in seen:
                continue
            comp, stack = [], [k]
            seen.add(k)
            while stack:
                x = stack.pop()
                comp.append(x)
                for y in adj[x]:
                    if y in keep and y not in seen:
                        seen.add(y)
                        stack.append(y)
            comps.append(comp)
        comps.sort(key=len, reverse=True)
        text = ', '.join(
            f'[n {len(c)} t {T[c].mean():+.2f} h {H[c].mean():+.2f} s {S[c].mean():+.2f} tmax {T[c].max():+.2f}]'
            for c in comps
        )
        print(f'cut t>{cut}: {len(comps)} parts {text}')
