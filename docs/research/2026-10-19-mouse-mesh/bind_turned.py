"""Prints the faces of the seated bind of a mesh rig that turn over after the relax, with their
middles in the units of the source, their corner angles, and the weights of their corners, and
the arm vertices whose hand or finger weight is large far from the paw.

    blender -b --factory-startup --python bind_turned.py -- <root> <config.json>
"""
import json
import os
import sys

import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
ROOT = argv[0]
RIG = os.path.join(ROOT, 'tools', 'blender', 'rig_mesh.py')
with open(RIG) as f:
    code = f.read().rsplit('\nmain()', 1)[0]
rig = {'__name__': 'rig_mesh', '__file__': RIG}
exec(compile(code, RIG, 'exec'), rig)
os.chdir(ROOT)
config = json.load(open(argv[1]))
rules = config['weights']
if rig['TAIL_TIP'] in config['joints']:
    rig['BONES'] = rig['BONES'] + (rig['TAIL_TIP'],)
BONES = rig['BONES']
verts, tris, uvs, texture = rig['load_mesh'](config)
heads, ends, rolls, children = rig['joints_of'](config)
w0 = rig['bone_heat'](verts, tris, heads, ends, rolls)
weights = rig['apply_rules'](verts, tris, w0, rules, heads, ends)
weights = rig['straight_slivers'](verts, tris, rig['rigid_slivers'](verts, tris, weights, rules), rules)
weights = rig['limit'](rig['rigid_faces'](verts, tris, weights, rules))
factors = {'arm': config['armFactor'], 'leg': config.get('legFactor', 1), 'head': 1, 'neck': 1,
           'trunk': 1, 'girth': [1, 1], 'armGirth': [1, 1]}
long_verts, long_heads, long_ends, rise, drop, lower = rig['stretch'](verts, weights, heads, ends, children, factors, rules)
turns = rig['bind_turns'](config, long_heads, long_ends, rolls)
up_heads = rig['posed_heads'](long_heads, turns)
mats = [rig['move'](turns[n], long_heads[n], up_heads[n]) for n in BONES]
long_verts, tris2, uvs2, weights, flips, largest, cuts = rig['refine'](long_verts, tris, uvs, weights, long_heads, long_ends, mats, config['refine'])
bind = rig['skin'](weights, mats, long_verts)
bind, rounds = rig['relax'](long_verts, bind, tris2, weights, mats)
dots = rig['turn_dots'](long_verts, bind, tris2, weights, mats)
ang = rig['min_angles'](long_verts, tris2)
print('turned after relax:', int((dots < 0).sum()))
for f in np.nonzero(dots < 0.1)[0]:
    t = tris2[f]
    mid = long_verts[t].mean(0) if f >= len(tris) else verts[t].mean(0)
    big = [rig['corner_angle'](long_verts[t[k]], long_verts[t[(k+1)%3]], long_verts[t[(k+2)%3]]) for k in range(3)]
    print(f'face {f}: dot {dots[f]:+.3f}, source middle {mid.round(4)}, corner angles {np.round(big,1)}')
    for v in t:
        top = np.argsort(-weights[v])[:4]
        print(f'   v {v} {verts[v].round(4) if v < len(verts) else long_verts[v].round(4)}: ' + ', '.join(f'{BONES[k]} {weights[v,k]:.2f}' for k in top if weights[v,k] > 0.005))
print('arm vertices above y 0.44 with a hand or finger weight above 0.1:')
for side in 'LR':
    hand = weights[:, BONES.index(f'hand_{side}')] + weights[:, BONES.index(f'fingers_{side}')]
    sel = np.nonzero((hand > 0.1) & (verts[:, 1] > 0.44))[0] if True else []
    for v in sel[:20]:
        top = np.argsort(-weights[v])[:4]
        print(f'  {side} v {v} {verts[v].round(4)}: ' + ', '.join(f'{BONES[k]} {weights[v,k]:.2f}' for k in top if weights[v,k] > 0.005))
    hb = rig['limit'](w0)

# Match the faces of the fold probe by the corner angles in the bind mesh.
targets = {37: (11.8, 11.1, 157.1), 114: (153.6, 14.7, 11.7), 461: (12.7, 7.4, 159.9), 110: (21.3, 8.9, 149.8),
           98: (148.6, 16.2, 15.3), 101: (9.1, 16.6, 154.4), 32: (21.6, 39.9, 118.5), 38: (155.9, 7.0, 17.0),
           39: (11.4, 163.3, 5.3)}
for name, want in targets.items():
    best = None
    for f, t in enumerate(tris2):
        a = sorted(rig['corner_angle'](bind[t[k]], bind[t[(k+1)%3]], bind[t[(k+2)%3]]) for k in range(3))
        d = sum(abs(x - y) for x, y in zip(a, sorted(want)))
        if best is None or d < best[0]:
            best = (d, f)
    d, f = best
    t = tris2[f]
    mid = long_verts[t].mean(0)
    print(f'probe face {name}: rig face {f} (angle error {d:.2f}), source middle {mid.round(4)}, bind dot {dots[f]:+.3f}')
    for v in t:
        top = np.argsort(-weights[v])[:4]
        print(f'   v {v} {long_verts[v].round(4)}: ' + ', '.join(f'{BONES[k]} {weights[v,k]:.2f}' for k in top if weights[v,k] > 0.005))
