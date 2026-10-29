"""Gives the part ratios of the polar bear: the source mesh, the standing app body, the seated bind
of the rig, and the rest and the play of the app, in the units of the studio (1 unit from the soles
to the skull top of the source) and in meters.

    uv run --no-project --with numpy python -I ratio_table.py <config.json> <src.npz> \
        <standing.obj> <rig.npz> <pose.json> <scale m/u> [<label>]

The lengths come from the joints. Each girth is a cut of the skin square to its part axis: the
loop around the axis point, with its width along the side axis of the body, its depth, and its
mean diameter (the perimeter over pi). The trunk cuts are square to the line from the hip joints
to the neck joint, at the heights of the chest joint and of the belly (y 0.39 of the source).
"""
import json
import sys

import numpy as np

sys.path.insert(0, __import__("os").path.dirname(__file__))
from cuts import section, weld  # noqa: E402

cfg_path, src_path, obj_path, rig_path, pose_path, scale = sys.argv[1:7]
scale = float(scale)
label = sys.argv[7] if len(sys.argv) > 7 else 'app'
cfg = json.load(open(cfg_path))
LEG = float(__import__('os').environ.get('LEG', cfg.get('legFactor', 1)))
SHIN = float(__import__('os').environ.get('LEG', cfg.get('shinFactor', LEG)))


def cfg_joints():
    J = {}
    for k, v in cfg['joints'].items():
        h = np.array(v['head'], float)
        J[k] = h
        if k.endswith('_L'):
            J[k[:-2] + '_R'] = h * np.array([-1, 1, 1])
    return J


def load_obj(path):
    P, T = [], []
    for line in open(path):
        if line.startswith('v '):
            P.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('f '):
            idx = [int(x.split('/')[0]) - 1 for x in line.split()[1:]]
            for k in range(1, len(idx) - 1):
                T.append([idx[0], idx[k], idx[k + 1]])
    return np.array(P), np.array(T)


class Body:
    """A skin with joints in the studio names, in units, with y up and +x the left side."""

    def __init__(self, name, P, T, J, side, fwd, standing):
        self.name, self.P, self.T, self.J, self.side, self.fwd = name, P, T, J, side, fwd
        self.standing = standing

    def measures(self):
        J, P, T = self.J, self.P, self.T
        m = {}
        dist = lambda a, b: float(np.linalg.norm(J[a] - J[b]))
        if self.standing:
            m['standing height'] = float(P[:, 1].max() - P[:, 1].min())
        hipmid = (J['thigh_L'] + J['thigh_R']) / 2
        shmid = (J['upper_arm_L'] + J['upper_arm_R']) / 2
        m['trunk: hip joints to shoulder joints'] = float(np.linalg.norm(shmid - hipmid))
        m['shoulder joints apart'] = dist('upper_arm_L', 'upper_arm_R')
        axis = J['neck'] - J['hips']
        L = np.linalg.norm(axis)
        for nm, y in (('chest', 0.58), ('belly', 0.39)):
            frac = (y - 0.29) / (0.68 - 0.29)
            o = J['hips'] + frac * axis
            sec = section(P, T, o, axis, self.side)
            m[f'{nm} width'] = sec['width']
            m[f'{nm} depth'] = sec['depth']
        for part, a, b, at in (('upper arm', 'upper_arm', 'forearm', 0.5),
                               ('forearm', 'forearm', 'hand', 0.5),
                               ('thigh', 'thigh', 'shin', 0.7),
                               ('thigh at 0.85', 'thigh', 'shin', 0.85),
                               ('shin', 'shin', 'foot', 0.5),
                               ('shin at 0.75', 'shin', 'foot', 0.75)):
            vals = []
            for sd in ('L', 'R'):
                A, B = J[f'{a}_{sd}'], J[f'{b}_{sd}']
                o = A + at * (B - A)
                sec = section(P, T, o, B - A, self.side if 'arm' not in part else self.fwd)
                vals.append((float(np.linalg.norm(B - A)), sec['diam'], sec['width'], sec['depth']))
            v = np.mean(np.array(vals), axis=0)
            if ' at ' not in part:
                m[f'{part} length'] = v[0]
            m[f'{part} girth (diameter)'] = v[1]
            if part.startswith('thigh') or part.startswith('shin'):
                m[f'{part} side width'] = v[2]
        # The head: the skull top over the head joint and the chin, along the head axis of the
        # head joint to the middle of the ear joints (rigid in the rig above y 0.81).
        up = (J['ear_L'] + J['ear_R']) / 2 - J['head']
        up /= np.linalg.norm(up)
        hp = P[(P - J['head']) @ up > -0.06]
        rel = (hp - J['head']) @ up
        m['head: head joint to skull top'] = float(rel.max())
        return m


def mirror_side(J):
    return J


J0 = cfg_joints()
Psrc = np.load(src_path)
src = Body('source', Psrc['points'], Psrc['tris'], J0, np.array([1., 0, 0]),
           np.array([0., 0, 1]), True)

# The standing app body: the long-armed source, with the leg joints of the leg factor.
Pst, Tst = load_obj(obj_path)
Jst = {k: v.copy() for k, v in J0.items()}
for sd in ('L', 'R'):
    hip, knee, ankle = J0[f'thigh_{sd}'], J0[f'shin_{sd}'], J0[f'foot_{sd}']
    rise = (LEG - 1) * (hip[1] - knee[1]) + (SHIN - 1) * (knee[1] - ankle[1])
for k in Jst:
    if not any(k.startswith(p) for p in ('shin_', 'foot_', 'toes_')):
        Jst[k] = Jst[k] + np.array([0, rise, 0])
for sd in ('L', 'R'):
    hip = Jst[f'thigh_{sd}']
    Jst[f'shin_{sd}'] = hip + LEG * (J0[f'shin_{sd}'] - J0[f'thigh_{sd}'])
    Jst[f'foot_{sd}'] = Jst[f'shin_{sd}'] + SHIN * (J0[f'foot_{sd}'] - J0[f'shin_{sd}'])
standing = Body('app standing', Pst, Tst, Jst, np.array([1., 0, 0]), np.array([0., 0, 1]), True)

R = np.load(rig_path)
Jr = {str(n): np.array(h) for n, h in zip(R['head_names'], R['heads'])}
Pw, Tw = weld(R['points'][R['tris']])
seated = Body('seated bind', Pw, Tw, Jr, np.array([1., 0, 0]),
              np.array([0., 0, 1]), False)

pose = json.load(open(pose_path))
APP = {'hips': 'hips', 'neck': 'neck', 'head': 'head', 'ear_L': 'earR', 'ear_R': 'earL',
       'upper_arm_L': 'upperArmR', 'upper_arm_R': 'upperArmL', 'forearm_L': 'forearmR',
       'forearm_R': 'forearmL', 'hand_L': 'handR', 'hand_R': 'handL', 'thigh_L': 'thighR',
       'thigh_R': 'thighL', 'shin_L': 'shinR', 'shin_R': 'shinL', 'foot_L': 'footR',
       'foot_R': 'footL'}


def pose_body(name, st):
    skin = [i for i, b in enumerate(st['bones']) if b not in ('instrument', 'eyeL', 'eyeR')]
    tri = np.array(st['tris'])[skin].reshape(-1, 3, 3) / scale
    tri = tri * np.array([-1, 1, -1])  # the player axes: -z forward; the studio: +z forward
    P, T = weld(tri)
    J = {k: np.array(st['joints'][v]) / scale * np.array([-1, 1, -1]) for k, v in APP.items()}
    return Body(name, P, T, J, np.array([1., 0, 0]), np.array([0., 0, 1]), False)


rest = pose_body('rest', pose['rest'])
play = pose_body('play', pose['play'])

bodies = [src, standing, seated, rest, play]
ms = [b.measures() for b in bodies]
keys = list(ms[0].keys())
print(f'# {label}: leg factor {LEG}, scale {scale} m/u, pose {pose["demo"]} at {pose["song"]:.2f} s')
print('| Measure | ' + ' | '.join(b.name for b in bodies) + ' | standing / source | seated / source | play / source |')
print('|---|' + '---|' * (len(bodies) + 3))
for k in keys:
    cells = []
    for m in ms:
        v = m.get(k)
        cells.append('' if v is None else f'{v:.3f} u ({v * scale * 100:.1f} cm)')
    r = lambda m: f'{m[k] / ms[0][k]:.2f}' if k in m else ''
    print(f'| {k} | ' + ' | '.join(cells) + f' | {r(ms[1])} | {r(ms[2])} | {r(ms[4])} |')
# Ratios to the standing height of each standing body.
h0, h1 = ms[0]['standing height'], ms[1]['standing height']
print()
print('| Measure / standing height | source | app | app / source |')
print('|---|---|---|---|')
for k in keys:
    if k == 'standing height':
        continue
    a, b = ms[0][k] / h0, ms[1][k] / h1
    print(f'| {k} | {a:.3f} | {b:.3f} | {b / a:.2f} |')
