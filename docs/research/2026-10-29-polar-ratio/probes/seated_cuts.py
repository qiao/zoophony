"""Gives the seated bind measures of rig GLB dumps (dump_rig.py): the seat top, the hip joint over
the seat, the knee, the leg girths, and the head top over the seat, in units and in cm.

    uv run --no-project --with numpy python -I seated_cuts.py <scale m/u> <label>=<rig.npz>...
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from cuts import section, weld  # noqa: E402

scale = float(sys.argv[1])
KEY = os.environ.get('CUT', 'diam')
print('| Rig | Seat top over the sole | Hip joint over the seat | Knee joint over the sole | Thigh slope | Thigh girth 0.5 / 0.7 / 0.85 | Shin girth 0.5 / 0.75 | Skull top over the seat |')
print('|---|---|---|---|---|---|---|---|')
for arg in sys.argv[2:]:
    label, path = arg.split('=', 1)
    R = np.load(path)
    P, T = weld(R['points'][R['tris']])
    J = {str(n): np.array(h) for n, h in zip(R['head_names'], R['heads'])}
    sole = P[:, 1].min()
    # The seat top: the lowest point of the midline haunch behind the hip joints.
    m = (np.abs(P[:, 0]) < 0.05) & (P[:, 2] < J['hips'][2] - 0.02) & (P[:, 2] > -0.2) & (P[:, 1] < J['hips'][1])
    seat = P[m, 1].min()
    hip = (J['thigh_L'][1] + J['thigh_R'][1]) / 2
    knee = (J['shin_L'][1] + J['shin_R'][1]) / 2
    th = J['shin_L'] - J['thigh_L']
    slope = np.degrees(np.arctan2(-th[1], np.hypot(th[0], th[2])))
    g = {}
    for part, a, b, ats in (('thigh', 'thigh', 'shin', (0.5, 0.7, 0.85)), ('shin', 'shin', 'foot', (0.5, 0.75))):
        vals = []
        for at in ats:
            d = []
            for sd in 'LR':
                A, B = J[f'{a}_{sd}'], J[f'{b}_{sd}']
                sec = section(P, T, A + at * (B - A), B - A, np.array([1., 0, 0]))
                d.append(sec[KEY])
            vals.append(np.mean(d))
        g[part] = ' / '.join(f'{v:.3f}' for v in vals)
    cm = lambda u: f'{u:.3f} u ({u * scale * 100:.1f} cm)'
    print(f'| {label} | {cm(seat - sole)} | {cm(hip - seat)} | {cm(knee - sole)} | {slope:.0f}° | {g["thigh"]} | {g["shin"]} | {cm(P[:, 1].max() - seat)} |')
